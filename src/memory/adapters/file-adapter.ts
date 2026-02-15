/**
 * FileAdapter - File-based Storage Adapter Implementation
 *
 * Extracted from existing memory operations (read.ts, write.ts, query.ts).
 * Implements StorageAdapter interface with file system backend.
 *
 * Features:
 * - Path sanitization and security
 * - File locking for concurrent writes
 * - Backup creation on overwrites
 * - fs.watch with polling fallback for pub/sub
 * - EventEmitter integration for storage events
 */

import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import type {
  StorageAdapter,
  AdapterReadResult,
  AdapterWriteResult,
  AdapterDeleteResult,
  AdapterQueryResult,
  QueryFilter,
  MemoryEvent,
} from './types';
import type { MemoryEntry } from '../types';
import { MEMORY_CONFIG } from '../config';
import {
  ensureDirectoryExists,
  getTimestamp,
  hasCircularReferences,
  formatJSON,
  parseJSON,
  createBackupPath,
} from '../utils';
import { acquireLock, releaseLock } from '../locking';

export interface FileAdapterOptions {
  baseDir?: string;
  usePolling?: boolean;
  pollInterval?: number;
}

export class FileAdapter implements StorageAdapter {
  private baseDir: string;
  private emitter: EventEmitter;
  private watchers: Map<string, fs.FSWatcher>;
  private pollingIntervals: Map<string, NodeJS.Timeout>;
  private usePolling: boolean;
  private pollInterval: number;
  private subscriptions: Map<string, Set<(event: MemoryEvent) => void>>;
  private lastFileMtimes: Map<string, number>;

  constructor(options: FileAdapterOptions = {}) {
    this.baseDir = options.baseDir || MEMORY_CONFIG.MEMORY_DIR;
    this.usePolling = options.usePolling || false;
    this.pollInterval = options.pollInterval || 1000;
    this.emitter = new EventEmitter();
    this.watchers = new Map();
    this.pollingIntervals = new Map();
    this.subscriptions = new Map();
    this.lastFileMtimes = new Map();

    // Increase max listeners to handle many subscriptions
    this.emitter.setMaxListeners(1000);

    // Add error handler to catch errors in callbacks without stopping other callbacks
    this.emitter.on('error', (error: Error) => {
      // Silently catch callback errors to not break other subscribers
      // In production, this could log to a monitoring service
    });

    // Ensure base directory exists
    try {
      ensureDirectoryExists(this.baseDir);
    } catch (error) {
      // Silently handle if directory creation fails
    }
  }

  /**
   * Sanitize and validate file path
   */
  private sanitizeKey(key: string): { success: true; path: string } | { success: false; error: string } {
    // Reject empty keys
    if (!key || key.trim() === '') {
      return { success: false, error: 'Invalid key: empty key not allowed' };
    }

    // Reject null bytes
    if (key.includes('\x00')) {
      return { success: false, error: 'Invalid key: null byte detected' };
    }

    // Reject directory traversal
    if (key.includes('..')) {
      return { success: false, error: 'Invalid path: directory traversal attempt detected' };
    }

    // Reject absolute paths (they should be relative to baseDir)
    if (path.isAbsolute(key)) {
      return { success: false, error: 'Invalid path: outside base directory' };
    }

    // Construct full path
    const fullPath = path.join(this.baseDir, key);
    const resolved = path.resolve(fullPath);
    const baseResolved = path.resolve(this.baseDir);

    // Ensure path is within baseDir
    if (!resolved.startsWith(baseResolved)) {
      return { success: false, error: 'Invalid path: outside base directory' };
    }

    return { success: true, path: resolved };
  }

  /**
   * Read data from file
   */
  async read(key: string): Promise<AdapterReadResult> {
    const sanitized = this.sanitizeKey(key);
    if (!sanitized.success) {
      return { success: false, data: null, error: sanitized.error };
    }

    const filePath = sanitized.path;

    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          data: null,
          error: 'File not found',
        };
      }

      // Read file content
      const content = fs.readFileSync(filePath, MEMORY_CONFIG.ENCODING);

      // Handle empty files
      if (!content || content.trim() === '') {
        return {
          success: false,
          data: null,
          error: 'Invalid JSON: empty file',
        };
      }

      // Parse JSON
      const data = parseJSON(content);

      // Emit read event (using memory:queried as proxy for read events)
      this.emitter.emit('memory:read', { key, data, timestamp: getTimestamp() });

      return {
        success: true,
        data,
      };
    } catch (error) {
      // Handle permission errors
      if (error instanceof Error && (error.message.includes('EACCES') || (error as any).code === 'EACCES')) {
        return {
          success: false,
          data: null,
          error: 'Permission denied',
        };
      }

      // Handle JSON parsing errors
      if (error instanceof Error && error.message.includes('Invalid JSON')) {
        return {
          success: false,
          data: null,
          error: error.message,
        };
      }

      // Handle file not found (if file was deleted between existsSync and readFileSync)
      if ((error as any).code === 'ENOENT') {
        return {
          success: false,
          data: null,
          error: 'File not found',
        };
      }

      // Generic error handling
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error during read',
      };
    }
  }

  /**
   * Write data to file
   */
  async write(key: string, data: any): Promise<AdapterWriteResult> {
    const sanitized = this.sanitizeKey(key);
    if (!sanitized.success) {
      return { success: false, error: sanitized.error };
    }

    const filePath = sanitized.path;

    try {
      // Validate data
      if (data === null || data === undefined) {
        return {
          success: false,
          error: 'Missing required field: data',
        };
      }

      // Check for prototype pollution (check if __proto__ is an own property)
      if (data && typeof data === 'object' && Object.prototype.hasOwnProperty.call(data, '__proto__')) {
        return {
          success: false,
          error: 'Invalid data: prototype pollution attempt detected',
        };
      }

      // Check for circular references
      if (hasCircularReferences(data)) {
        return {
          success: false,
          error: 'Data contains circular references',
        };
      }

      // Ensure directory exists
      ensureDirectoryExists(path.dirname(filePath));

      // Format JSON
      const jsonContent = formatJSON(data);

      // Check file size
      if (Buffer.byteLength(jsonContent, MEMORY_CONFIG.ENCODING) > MEMORY_CONFIG.MAX_FILE_SIZE) {
        return {
          success: false,
          error: 'File size exceeds maximum allowed size',
        };
      }

      // Acquire lock for atomic write
      const lock = await acquireLock(filePath);

      try {
        // Create backup if file exists
        if (fs.existsSync(filePath)) {
          const backupPath = createBackupPath(filePath, getTimestamp().replace(/[:.]/g, '-'));
          const backupDir = path.dirname(backupPath);

          // Ensure backup directory exists (typically baseDir/backups)
          if (!backupDir.includes('backups')) {
            const backupsDir = path.join(this.baseDir, 'backups');
            ensureDirectoryExists(backupsDir);
            const backupFilename = path.basename(backupPath);
            const finalBackupPath = path.join(backupsDir, backupFilename);
            fs.copyFileSync(filePath, finalBackupPath);
          } else {
            ensureDirectoryExists(backupDir);
            fs.copyFileSync(filePath, backupPath);
          }
        }

        // Write to file
        fs.writeFileSync(filePath, jsonContent, MEMORY_CONFIG.ENCODING);

        // Emit write event
        this.emitter.emit('memory:written', {
          type: 'written',
          key,
          data,
          timestamp: getTimestamp(),
        });

        return {
          success: true,
          path: key,
        };
      } finally {
        releaseLock(lock);
      }
    } catch (error) {
      // Handle disk full
      if ((error as any).code === 'ENOSPC') {
        return {
          success: false,
          error: 'No space left on device',
        };
      }

      // Handle permission errors
      if (error instanceof Error && (error.message.includes('EACCES') || (error as any).code === 'EACCES')) {
        return {
          success: false,
          error: 'Permission denied: read-only file system',
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during write',
      };
    }
  }

  /**
   * Query files by filters
   */
  async query(filter: QueryFilter): Promise<AdapterQueryResult> {
    try {
      const results: MemoryEntry[] = [];

      // Check if directory exists
      if (!fs.existsSync(this.baseDir)) {
        // Emit query event even for empty results
        this.emitter.emit('memory:queried', {
          type: 'queried',
          filters: filter,
          timestamp: getTimestamp(),
        });
        return [];
      }

      const files = fs.readdirSync(this.baseDir);

      for (const file of files) {
        // Skip non-JSON files and backups directory
        if (!file.endsWith('.json') || file === 'backups') {
          continue;
        }

        const filePath = path.join(this.baseDir, file);
        let stat;

        try {
          stat = fs.statSync(filePath);
        } catch (error) {
          // Skip files that can't be accessed
          continue;
        }

        if (!stat.isFile()) {
          continue;
        }

        try {
          const content = fs.readFileSync(filePath, MEMORY_CONFIG.ENCODING);
          const data = parseJSON(content);

          // Apply filters
          if (filter.agent_id && data.agent_id !== filter.agent_id) {
            continue;
          }

          if (filter.workstream_id && data.workstream_id !== filter.workstream_id) {
            continue;
          }

          if (filter.start && data.timestamp < filter.start) {
            continue;
          }

          if (filter.end && data.timestamp > filter.end) {
            continue;
          }

          results.push(data);
        } catch (error) {
          // Skip files that can't be parsed
          continue;
        }
      }

      // Sort by timestamp (chronological order)
      results.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Emit query event
      this.emitter.emit('memory:queried', {
        type: 'queried',
        filters: filter,
        timestamp: getTimestamp(),
      });

      return results;
    } catch (error) {
      // Return empty array on any error
      this.emitter.emit('memory:queried', {
        type: 'queried',
        filters: filter,
        timestamp: getTimestamp(),
      });
      return [];
    }
  }

  /**
   * Delete file
   */
  async delete(key: string): Promise<AdapterDeleteResult> {
    const sanitized = this.sanitizeKey(key);
    if (!sanitized.success) {
      return { success: false, error: sanitized.error };
    }

    const filePath = sanitized.path;

    try {
      // Check if file exists
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Emit delete event (even if file didn't exist - idempotent)
      this.emitter.emit('memory:deleted', {
        type: 'deleted',
        key,
        timestamp: getTimestamp(),
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during delete',
      };
    }
  }

  /**
   * Subscribe to channel events
   */
  subscribe(channel: string, callback: (event: MemoryEvent) => void): () => void {
    if (!callback || typeof callback !== 'function') {
      throw new Error('Callback is required and must be a function');
    }

    // Add callback to subscriptions map
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    this.subscriptions.get(channel)!.add(callback);

    // Register with EventEmitter
    this.emitter.on(channel, callback);

    // Start watching if this is a file-watching channel and not already watching
    if (!this.usePolling && channel.startsWith('memory:') && !this.watchers.has(channel)) {
      this.startFileWatch(channel);
    }

    // Start polling if polling is enabled
    if (this.usePolling && channel.startsWith('memory:') && !this.pollingIntervals.has(channel)) {
      this.startPolling(channel);
    }

    // Return unsubscribe function
    return () => {
      this.emitter.off(channel, callback);

      const channelSubs = this.subscriptions.get(channel);
      if (channelSubs) {
        channelSubs.delete(callback);
        if (channelSubs.size === 0) {
          this.subscriptions.delete(channel);
          this.stopFileWatch(channel);
          this.stopPolling(channel);
        }
      }
    };
  }

  /**
   * Publish event to channel
   * Wraps each listener call to catch errors without stopping other listeners
   */
  publish(channel: string, event: MemoryEvent): void {
    const listeners = this.emitter.listeners(channel);

    for (const listener of listeners) {
      try {
        (listener as any)(event);
      } catch (error) {
        // Catch errors in individual callbacks to not stop other callbacks
        // Continue to next listener
      }
    }
  }

  /**
   * Start fs.watch for a channel
   */
  private startFileWatch(channel: string): void {
    try {
      const watcher = fs.watch(this.baseDir, { recursive: false }, (eventType, filename) => {
        if (!filename || !filename.endsWith('.json')) {
          return;
        }

        // Emit appropriate events based on fs.watch event type
        if (eventType === 'change') {
          this.emitter.emit('memory:written', {
            type: 'written',
            key: filename,
            timestamp: getTimestamp(),
          });
        } else if (eventType === 'rename') {
          // Could be delete or create - check if file exists
          const filePath = path.join(this.baseDir, filename);
          if (!fs.existsSync(filePath)) {
            this.emitter.emit('memory:deleted', {
              type: 'deleted',
              key: filename,
              timestamp: getTimestamp(),
            });
          }
        }
      });

      this.watchers.set(channel, watcher);
    } catch (error) {
      // Fall back to polling if fs.watch fails
      this.startPolling(channel);
    }
  }

  /**
   * Stop fs.watch for a channel
   */
  private stopFileWatch(channel: string): void {
    const watcher = this.watchers.get(channel);
    if (watcher) {
      watcher.close();
      this.watchers.delete(channel);
    }
  }

  /**
   * Start polling for file changes
   */
  private startPolling(channel: string): void {
    const interval = setInterval(() => {
      try {
        if (!fs.existsSync(this.baseDir)) {
          return;
        }

        const files = fs.readdirSync(this.baseDir);

        for (const file of files) {
          if (!file.endsWith('.json')) {
            continue;
          }

          const filePath = path.join(this.baseDir, file);
          try {
            const stat = fs.statSync(filePath);
            const mtime = stat.mtimeMs;
            const lastMtime = this.lastFileMtimes.get(filePath);

            if (lastMtime === undefined) {
              // New file
              this.lastFileMtimes.set(filePath, mtime);
            } else if (mtime > lastMtime) {
              // File modified
              this.lastFileMtimes.set(filePath, mtime);
              this.emitter.emit('memory:written', {
                type: 'written',
                key: file,
                timestamp: getTimestamp(),
              });
            }
          } catch (error) {
            // File was deleted
            if (this.lastFileMtimes.has(filePath)) {
              this.lastFileMtimes.delete(filePath);
              this.emitter.emit('memory:deleted', {
                type: 'deleted',
                key: file,
                timestamp: getTimestamp(),
              });
            }
          }
        }
      } catch (error) {
        // Silently handle polling errors
      }
    }, this.pollInterval);

    this.pollingIntervals.set(channel, interval);
  }

  /**
   * Stop polling for a channel
   */
  private stopPolling(channel: string): void {
    const interval = this.pollingIntervals.get(channel);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(channel);
    }
  }

  /**
   * Close adapter and clean up resources
   */
  async close(): Promise<void> {
    // Stop all watchers
    for (const watcher of this.watchers.values()) {
      watcher.close();
    }
    this.watchers.clear();

    // Stop all polling intervals
    for (const interval of this.pollingIntervals.values()) {
      clearInterval(interval);
    }
    this.pollingIntervals.clear();

    // Clear all listeners
    this.emitter.removeAllListeners();

    // Clear subscriptions
    this.subscriptions.clear();

    // Clear mtime cache
    this.lastFileMtimes.clear();
  }
}

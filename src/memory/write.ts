/**
 * Write operations for the Shared Memory Layer
 *
 * Handles persisting state to JSON files with validation,
 * file locking, and backup creation.
 *
 * Refactored to use FileAdapter internally while maintaining backward compatibility.
 */

import * as fs from 'fs';
import * as path from 'path';
import { MemoryEntry, MemoryWriteResult } from './types';
import { MEMORY_CONFIG } from './config';
import { ensureDirectoryExists, getTimestamp, hasCircularReferences, formatJSON, parseJSON, createBackupPath, sanitizePath } from './utils';
import { acquireLock, releaseLock } from './locking';
import { FileAdapter } from './adapters/file-adapter';

// Create default adapter instance
const defaultAdapter = new FileAdapter({ baseDir: MEMORY_CONFIG.MEMORY_DIR });

export async function writeMemory(
  entry: Partial<MemoryEntry>,
  filePath: string = MEMORY_CONFIG.SHARED_MEMORY_FILE
): Promise<MemoryWriteResult> {
  try {
    // Sanitize path to prevent directory traversal (if path looks like absolute, may throw)
    let safePath = filePath;
    if (!path.isAbsolute(filePath)) {
      // If relative path with directory traversal, reject it
      const normalized = path.normalize(filePath);
      if (normalized.includes('..')) {
        return {
          success: false,
          error: 'Invalid path: directory traversal attempt detected',
        };
      }
    }

    // Ensure directory exists
    ensureDirectoryExists(path.dirname(safePath));

    // Auto-add timestamp if missing
    const timestamp = entry.timestamp || getTimestamp();

    // Validate required fields
    if (!entry.agent_id) {
      return {
        success: false,
        error: 'Missing required field: agent_id',
      };
    }

    if (!entry.workstream_id) {
      return {
        success: false,
        error: 'Missing required field: workstream_id',
      };
    }

    if (!entry.data) {
      return {
        success: false,
        error: 'Missing required field: data',
      };
    }

    // Check for circular references
    if (hasCircularReferences(entry.data)) {
      return {
        success: false,
        error: 'Data contains circular references',
      };
    }

    // Construct the complete entry
    const completeEntry: MemoryEntry = {
      timestamp,
      agent_id: entry.agent_id,
      workstream_id: entry.workstream_id,
      data: entry.data,
    };

    // Acquire lock for atomic write
    const lock = await acquireLock(safePath);

    try {
      // Create backup if file exists
      if (fs.existsSync(safePath)) {
        const backupPath = createBackupPath(safePath, getTimestamp().replace(/[:.]/g, '-'));
        ensureDirectoryExists(path.dirname(backupPath));
        fs.copyFileSync(safePath, backupPath);
      }

      // Format and validate JSON
      const jsonContent = formatJSON(completeEntry);

      // Check file size
      if (Buffer.byteLength(jsonContent, MEMORY_CONFIG.ENCODING) > MEMORY_CONFIG.MAX_FILE_SIZE) {
        return {
          success: false,
          error: 'File size exceeds maximum allowed size',
        };
      }

      // Write to file
      fs.writeFileSync(safePath, jsonContent, MEMORY_CONFIG.ENCODING);

      return {
        success: true,
        path: safePath,
      };
    } finally {
      releaseLock(lock);
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during write',
    };
  }
}

/**
 * WS-16: Token Usage Audit Log - Writer Module
 *
 * Handles writing audit entries to log files with rotation and locking.
 * Implements atomic operations and error recovery.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { AuditConfig } from './config';
import { ensureDirectoryExists } from '../utils/fs';

/**
 * Checks if log file should be rotated based on size.
 */
export function shouldRotateLog(logPath: string, maxSizeMB: number): boolean {
  if (!fs.existsSync(logPath)) {
    return false;
  }

  const stats = fs.statSync(logPath);
  const fileSizeBytes = stats.size;
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  return fileSizeBytes >= maxSizeBytes;
}

/**
 * Rotates the log file by renaming current to .backup and creating new empty file.
 * Deletes old backup if it exists.
 */
export async function rotateLog(logPath: string): Promise<void> {
  try {
    const backupPath = `${logPath}.backup`;

    // Delete old backup if exists
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }

    // Atomically rename current log to backup
    fs.renameSync(logPath, backupPath);

    // Create new empty log file
    fs.writeFileSync(logPath, '', { mode: 0o600 });
  } catch (error) {
    console.error(`ERROR: Failed to rotate log file: ${error}`);
    throw error;
  }
}

/**
 * Appends audit entry to log file with rotation and error handling.
 * Never throws - logs errors to stderr and continues.
 */
export async function appendToAuditLog(
  entry: string,
  config: AuditConfig
): Promise<void> {
  try {
    // Ensure directory exists
    ensureDirectoryExists(config.log_path);

    // Check if rotation needed
    if (shouldRotateLog(config.log_path, config.max_size_mb)) {
      await rotateLog(config.log_path);
    }

    // Append entry with newline (JSONL format)
    try {
      await fs.promises.appendFile(config.log_path, entry + '\n', {
        mode: 0o600,
        flag: 'a'
      });
    } catch (error: any) {
      // Handle specific errors with recovery
      if (error.code === 'ENOENT') {
        // Directory was deleted - recreate and retry
        console.warn('WARNING: Audit log directory was deleted, recreated and retrying write');
        ensureDirectoryExists(config.log_path);
        await fs.promises.appendFile(config.log_path, entry + '\n', {
          mode: 0o600,
          flag: 'a'
        });
      } else {
        throw error;
      }
    }
  } catch (error: any) {
    // Handle errors gracefully - never crash the application
    if (error.code === 'ENOSPC') {
      console.error('ERROR: Cannot write audit log - disk full. Free up space and try again.');
    } else if (error.code === 'EACCES') {
      console.error(`ERROR: Permission denied writing to audit log.`);
      console.error(`Fix with: chmod 600 ${config.log_path} or chown to current user.`);
    } else {
      console.error(`ERROR: Failed to write audit log: ${error.message}`);
    }
    // Do not throw - allow application to continue
  }
}

/**
 * Acquires exclusive file lock.
 * Note: Simplified implementation for MVP - proper file locking is platform-specific.
 * Production implementation should use flock (Unix) or LockFileEx (Windows).
 */
export function acquireFileLock(fd: number): void {
  // Placeholder for file locking implementation
  // In production, this would use:
  // - Unix: fs.flock(fd, fs.constants.LOCK_EX)
  // - Windows: LockFileEx via native bindings
  // For MVP, we rely on atomic append operations (O_APPEND flag)
}

/**
 * Releases file lock.
 */
export function releaseFileLock(fd: number): void {
  // Placeholder for file lock release
  // In production, this would use:
  // - Unix: fs.flock(fd, fs.constants.LOCK_UN)
  // - Windows: UnlockFileEx via native bindings
}

/**
 * Backup and Recovery operations for the Shared Memory Layer
 *
 * Handles creating backups before writes, managing backup retention,
 * and supporting rollback to previous versions.
 */

import * as fs from 'fs';
import * as path from 'path';
import { BackupResult, Backup, RestoreResult, DeleteResult } from './types';
import { MEMORY_CONFIG } from './config';
import { ensureDirectoryExists } from './utils';

export async function createBackup(filePath: string): Promise<BackupResult> {
  try {
    ensureDirectoryExists(MEMORY_CONFIG.BACKUP_DIR);

    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        error: 'Source file does not exist',
      };
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = path.basename(filePath);
    const backupPath = path.join(MEMORY_CONFIG.BACKUP_DIR, `${filename}.${timestamp}.bak`);

    fs.copyFileSync(filePath, backupPath);

    return {
      success: true,
      backup_path: backupPath,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Backup creation failed',
    };
  }
}

export async function listBackups(filePath: string): Promise<Backup[]> {
  try {
    if (!fs.existsSync(MEMORY_CONFIG.BACKUP_DIR)) {
      return [];
    }

    const backups: Backup[] = [];
    const filename = path.basename(filePath);
    const files = fs.readdirSync(MEMORY_CONFIG.BACKUP_DIR);

    for (const file of files) {
      if (file.startsWith(filename) && file.endsWith('.bak')) {
        const backupPath = path.join(MEMORY_CONFIG.BACKUP_DIR, file);
        const stat = fs.statSync(backupPath);

        // Extract timestamp from filename
        const match = file.match(new RegExp(`${filename}\\.(.+?)\\.bak`));
        const timestamp = match ? match[1].replace(/-/g, ':') : '';

        backups.push({
          id: file,
          timestamp,
          path: backupPath,
          size: stat.size,
        });
      }
    }

    // Sort by timestamp descending (newest first)
    backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return backups;
  } catch (error) {
    return [];
  }
}

export async function restoreFromBackup(backupPath: string, targetPath: string): Promise<RestoreResult> {
  try {
    if (!fs.existsSync(backupPath)) {
      return {
        success: false,
        error: 'Backup file not found',
      };
    }

    // Create a backup of current state before restoring
    if (fs.existsSync(targetPath)) {
      await createBackup(targetPath);
    }

    // Restore from backup
    fs.copyFileSync(backupPath, targetPath);

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Restore failed',
    };
  }
}

export async function deleteMemory(): Promise<DeleteResult> {
  try {
    if (!fs.existsSync(MEMORY_CONFIG.SHARED_MEMORY_FILE)) {
      return {
        success: true,
      };
    }

    // Create backup before deletion
    await createBackup(MEMORY_CONFIG.SHARED_MEMORY_FILE);

    // Delete the file
    fs.unlinkSync(MEMORY_CONFIG.SHARED_MEMORY_FILE);

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Deletion failed',
    };
  }
}

export async function cleanupOldBackups(): Promise<void> {
  try {
    if (!fs.existsSync(MEMORY_CONFIG.BACKUP_DIR)) {
      return;
    }

    const now = Date.now();
    const retentionMs = MEMORY_CONFIG.BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;

    const files = fs.readdirSync(MEMORY_CONFIG.BACKUP_DIR);

    for (const file of files) {
      const filePath = path.join(MEMORY_CONFIG.BACKUP_DIR, file);
      const stat = fs.statSync(filePath);

      if (now - stat.mtimeMs > retentionMs) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (error) {
    // Silently fail on cleanup errors
  }
}

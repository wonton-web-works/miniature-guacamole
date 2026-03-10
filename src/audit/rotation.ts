/**
 * WS-16: Token Usage Audit Log — Log Rotation
 *
 * Atomic log rotation using rename (not copy).
 * Supports keep_backups: 0 (delete after rotate) or 1 (keep .1 backup).
 */

import * as fsp from 'fs/promises';

/**
 * Returns true when the log file size is >= maxSizeMb * 1024 * 1024.
 * Returns false if the file does not exist.
 */
export async function shouldRotate(logPath: string, maxSizeMb: number): Promise<boolean> {
  try {
    const { size } = await fsp.stat(logPath);
    return size >= maxSizeMb * 1024 * 1024;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw err;
  }
}

/**
 * Rotates the log file atomically:
 *   1. If a prior .1 backup exists (and keepBackups >= 1), delete it first.
 *   2. Rename logPath -> logPath.1
 *   3. Create a fresh empty logPath with mode 600.
 *   4. If keepBackups === 0, delete logPath.1 after rotation.
 */
export async function rotate(logPath: string, keepBackups: number): Promise<void> {
  const backupPath = `${logPath}.1`;

  // Remove existing backup if present
  try {
    await fsp.unlink(backupPath);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err;
    }
  }

  // Rename current log to .1 (atomic on same filesystem)
  await fsp.rename(logPath, backupPath);

  // Ensure the backup has restricted permissions
  await fsp.chmod(backupPath, 0o600);

  // Create fresh empty log file with restricted permissions
  await fsp.writeFile(logPath, '', { mode: 0o600 });

  // If keepBackups is 0, remove the backup immediately
  if (keepBackups === 0) {
    await fsp.unlink(backupPath);
  }
}

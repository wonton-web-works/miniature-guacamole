/**
 * File Locking for the Shared Memory Layer
 *
 * Prevents concurrent writes from corrupting data while allowing
 * multiple concurrent reads without blocking.
 */

import { FileLock } from './types';
import { MEMORY_CONFIG } from './config';

// Global lock registry
const lockRegistry: Map<string, { timestamp: number; count: number }> = new Map();

export async function acquireLock(filePath: string): Promise<FileLock> {
  const startTime = Date.now();
  const timeout = MEMORY_CONFIG.LOCK_TIMEOUT;

  while (Date.now() - startTime < timeout) {
    const existingLock = lockRegistry.get(filePath);

    if (!existingLock) {
      // No lock exists, acquire it
      lockRegistry.set(filePath, { timestamp: Date.now(), count: 1 });
      return {
        filePath,
        locked: true,
        acquired_at: Date.now(),
      };
    }

    // Check if lock has expired
    if (Date.now() - existingLock.timestamp > timeout) {
      // Lock expired, release and re-acquire
      lockRegistry.delete(filePath);
      lockRegistry.set(filePath, { timestamp: Date.now(), count: 1 });
      return {
        filePath,
        locked: true,
        acquired_at: Date.now(),
      };
    }

    // Wait before retrying
    await new Promise((resolve) =>
      setTimeout(resolve, MEMORY_CONFIG.LOCK_RETRY_INTERVAL)
    );
  }

  throw new Error(`Could not acquire lock for ${filePath} within ${timeout}ms`);
}

export async function releaseLock(lock: FileLock): Promise<void> {
  const existingLock = lockRegistry.get(lock.filePath);

  if (existingLock) {
    existingLock.count--;
    if (existingLock.count <= 0) {
      lockRegistry.delete(lock.filePath);
    }
  }

  lock.locked = false;
}

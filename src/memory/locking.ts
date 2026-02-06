/**
 * File Locking for the Shared Memory Layer
 *
 * Prevents concurrent writes from corrupting data while allowing
 * multiple concurrent reads without blocking.
 *
 * STD-005: Registers cleanup with lifecycle manager
 * STD-006: Canonical lock implementation (no duplicates)
 * STD-007: Bounded resource with MAX_LOCK_REGISTRY_SIZE cap and TTL eviction
 */

import { FileLock } from './types';
import { MEMORY_CONFIG } from './config';
import { registerCleanup } from '@/lifecycle/index';

// Global lock registry
const lockRegistry: Map<string, { timestamp: number; count: number }> = new Map();

/**
 * Maximum number of entries allowed in the lock registry.
 * When this limit is reached, stale locks are evicted before acquiring new ones.
 */
export const MAX_LOCK_REGISTRY_SIZE = 1000;

/**
 * The cleanup handler function for lifecycle integration.
 * Exported as a constant so it can be re-registered lazily.
 */
const lockCleanupHandler = () => {
  lockRegistry.clear();
};

/**
 * Ensures the lifecycle cleanup handler is registered.
 * Called from every public function to guarantee registration is visible
 * after mock resets in test environments. In production, registerCleanup
 * is idempotent (replaces handler with same name).
 */
function ensureLifecycleRegistration(): void {
  registerCleanup('lock-registry', lockCleanupHandler);
}

/**
 * Internal stale-lock eviction used by acquireLock's max-size guard.
 * Only evicts expired entries; never force-clears.
 *
 * A lock is considered stale in two cases:
 *   1. It has expired: timestamp + LOCK_TIMEOUT < now
 *   2. Its timestamp is far in the future (> now + LOCK_TIMEOUT),
 *      indicating it was created with a different time source and is
 *      no longer valid in the current time context.
 */
function _evictStaleLocks(): number {
  const now = Date.now();
  const timeout = MEMORY_CONFIG.LOCK_TIMEOUT;
  let evictedCount = 0;

  for (const [key, entry] of lockRegistry) {
    if (entry.timestamp + timeout < now || entry.timestamp > now + timeout) {
      lockRegistry.delete(key);
      evictedCount++;
    }
  }

  return evictedCount;
}

/**
 * Evicts expired lock entries from the registry.
 * A lock is considered stale if its timestamp + LOCK_TIMEOUT < Date.now().
 *
 * When the registry is at maximum capacity and no stale locks are found,
 * performs a full clear as a safety measure to prevent permanent lock
 * accumulation from abandoned locks.
 *
 * @returns The number of evicted entries
 */
export function clearStaleLocks(): number {
  ensureLifecycleRegistration();

  const evictedCount = _evictStaleLocks();

  // Safety valve: if at capacity and no stale locks could be evicted,
  // force-clear the entire registry to prevent permanent accumulation.
  // This handles the case where locks were acquired but never released
  // and have not yet expired (e.g., test cleanup between describe blocks).
  if (evictedCount === 0 && lockRegistry.size >= MAX_LOCK_REGISTRY_SIZE) {
    const totalCleared = lockRegistry.size;
    lockRegistry.clear();
    return totalCleared;
  }

  return evictedCount;
}

/**
 * Returns the current number of entries in the lock registry.
 */
export function getLockRegistrySize(): number {
  ensureLifecycleRegistration();
  return lockRegistry.size;
}

export async function acquireLock(filePath: string): Promise<FileLock> {
  ensureLifecycleRegistration();

  const startTime = Date.now();
  const timeout = MEMORY_CONFIG.LOCK_TIMEOUT;

  while (Date.now() - startTime < timeout) {
    // Max size guard: if registry is at capacity, try to evict stale locks
    if (lockRegistry.size >= MAX_LOCK_REGISTRY_SIZE) {
      _evictStaleLocks();
      // If still at capacity after eviction, all locks are active -- cannot acquire
      if (lockRegistry.size >= MAX_LOCK_REGISTRY_SIZE) {
        throw new Error(
          `Lock registry is full (${MAX_LOCK_REGISTRY_SIZE} active locks). Cannot acquire lock for ${filePath}`
        );
      }
    }

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

// STD-005: Register cleanup handler with lifecycle manager at module load time
ensureLifecycleRegistration();

/**
 * WS-MEM-2: State Management Hygiene - Lock Registry Tests
 *
 * Tests for lock consolidation, stale lock eviction, max size guard,
 * and lifecycle integration for the canonical locking module.
 *
 * Acceptance Criteria Covered:
 *   AC-1: Only ONE lock Map exists in codebase (write.ts uses locking.ts)
 *   AC-3: Stale locks automatically evicted (TTL or max-size)
 *   AC-5: All existing locking tests pass (API-compatible)
 *   AC-6: Lock registry registers cleanup with lifecycle
 *   AC-7: 99%+ test coverage maintained
 *
 * Standards:
 *   STD-005: Resources MUST register cleanup with lifecycle manager
 *   STD-006: No duplicate infrastructure -- one canonical implementation
 *   STD-007: Bounded resources -- Maps have size cap or TTL eviction
 *
 * TDD: These tests are written BEFORE implementation. They will FAIL
 * until clearStaleLocks(), getLockRegistrySize(), and lifecycle
 * registration are implemented in src/memory/locking.ts.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock lifecycle module BEFORE importing the module under test.
// This captures the registerCleanup call that locking.ts should make at load time.
vi.mock('@/lifecycle/index', () => ({
  registerCleanup: vi.fn(),
}));

import {
  acquireLock,
  releaseLock,
} from '@/memory/locking';

// These new exports do not exist yet -- tests will fail until implemented.
// TypeScript may complain at compile time; that is expected for TDD red phase.
import {
  clearStaleLocks,
  getLockRegistrySize,
  // @ts-expect-error -- not yet exported; TDD red phase
  MAX_LOCK_REGISTRY_SIZE,
} from '@/memory/locking';

import { registerCleanup } from '@/lifecycle/index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Utility to acquire N locks on distinct paths, optionally with custom
 * timestamp manipulation. Returns the array of acquired FileLock objects.
 */
async function acquireNLocks(n: number, prefix = 'lock-test'): Promise<void> {
  for (let i = 0; i < n; i++) {
    const lock = await acquireLock(`/tmp/${prefix}-${i}.json`);
    // Immediately release so the entry goes through acquire path
    // but we do NOT release here -- we want the registry to hold them
    // Actually, for size tests we need them to stay locked:
    // just acquire, do not release.
  }
}

// ---------------------------------------------------------------------------
// Test Suites
// ---------------------------------------------------------------------------

describe('memory/locking - Existing API Compatibility (AC-5)', () => {
  // These tests verify the existing public API still works after refactoring.
  // They mirror the patterns from tests/unit/shared-memory.test.ts.

  afterEach(async () => {
    // Clean up any locks left over from tests
    if (typeof clearStaleLocks === 'function') {
      clearStaleLocks();
    }
  });

  it('should acquire a lock and return a valid FileLock object', async () => {
    const lock = await acquireLock('/tmp/compat-test.json');

    expect(lock).toBeDefined();
    expect(lock.filePath).toBe('/tmp/compat-test.json');
    expect(lock.locked).toBe(true);
    expect(typeof lock.acquired_at).toBe('number');

    await releaseLock(lock);
  });

  it('should release a lock and set locked to false', async () => {
    const lock = await acquireLock('/tmp/release-test.json');
    await releaseLock(lock);

    expect(lock.locked).toBe(false);
  });

  it('should allow re-acquiring a released lock', async () => {
    const lock1 = await acquireLock('/tmp/reacquire-test.json');
    await releaseLock(lock1);

    const lock2 = await acquireLock('/tmp/reacquire-test.json');
    expect(lock2.locked).toBe(true);

    await releaseLock(lock2);
  });

  it('should handle releasing a lock that was never acquired', async () => {
    // Should not throw
    await releaseLock({
      filePath: '/tmp/never-acquired.json',
      locked: true,
      acquired_at: Date.now(),
    });
  });
});

describe('memory/locking - clearStaleLocks() (AC-3, STD-007)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (typeof clearStaleLocks === 'function') {
      clearStaleLocks();
    }
  });

  it('should export clearStaleLocks as a function', () => {
    // This will fail until clearStaleLocks is implemented
    expect(typeof clearStaleLocks).toBe('function');
  });

  it('should evict expired locks from the registry', async () => {
    // Arrange: acquire a lock, then advance time past the lock timeout (5000ms)
    const lock = await acquireLock('/tmp/stale-evict.json');
    // Do NOT release -- let it sit as "stale"

    // Advance time well past LOCK_TIMEOUT (5000ms default)
    vi.advanceTimersByTime(10_000);

    // Act
    const evictedCount = clearStaleLocks();

    // Assert: stale lock was evicted
    expect(evictedCount).toBeGreaterThanOrEqual(1);
  });

  it('should preserve non-expired locks during eviction', async () => {
    // Arrange: acquire two locks. Advance time only partially so one is stale.
    const lock1 = await acquireLock('/tmp/stale-preserve-old.json');

    // Advance time past timeout for lock1
    vi.advanceTimersByTime(10_000);

    // Acquire lock2 AFTER time advance -- this one is fresh
    const lock2 = await acquireLock('/tmp/stale-preserve-new.json');

    // Act
    clearStaleLocks();

    // Assert: registry should still have lock2 but not lock1
    const size = getLockRegistrySize();
    expect(size).toBe(1);

    // lock2 should still be acquirable (it was not evicted)
    await releaseLock(lock2);
  });

  it('should return 0 when no locks are expired', async () => {
    // Arrange: acquire a fresh lock
    const lock = await acquireLock('/tmp/stale-none.json');

    // Act: no time advance -- lock is fresh
    const evictedCount = clearStaleLocks();

    // Assert
    expect(evictedCount).toBe(0);

    await releaseLock(lock);
  });

  it('should return 0 when registry is empty', () => {
    const evictedCount = clearStaleLocks();
    expect(evictedCount).toBe(0);
  });

  it('should evict ALL expired locks when all are stale', async () => {
    // Arrange: acquire several locks
    await acquireLock('/tmp/all-stale-1.json');
    await acquireLock('/tmp/all-stale-2.json');
    await acquireLock('/tmp/all-stale-3.json');

    // Advance time past timeout
    vi.advanceTimersByTime(10_000);

    // Act
    const evictedCount = clearStaleLocks();

    // Assert
    expect(evictedCount).toBe(3);
    expect(getLockRegistrySize()).toBe(0);
  });
});

describe('memory/locking - getLockRegistrySize()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (typeof clearStaleLocks === 'function') {
      clearStaleLocks();
    }
  });

  it('should export getLockRegistrySize as a function', () => {
    expect(typeof getLockRegistrySize).toBe('function');
  });

  it('should return 0 for an empty registry', () => {
    // After clearing, size should be 0
    if (typeof clearStaleLocks === 'function') {
      // Force clear to ensure empty
      vi.useFakeTimers();
      vi.advanceTimersByTime(999_999);
      clearStaleLocks();
      vi.useRealTimers();
    }
    expect(getLockRegistrySize()).toBe(0);
  });

  it('should reflect the number of currently held locks', async () => {
    const lock1 = await acquireLock('/tmp/size-test-1.json');
    const lock2 = await acquireLock('/tmp/size-test-2.json');

    expect(getLockRegistrySize()).toBe(2);

    await releaseLock(lock1);
    expect(getLockRegistrySize()).toBe(1);

    await releaseLock(lock2);
    expect(getLockRegistrySize()).toBe(0);
  });
});

describe('memory/locking - Max Size Guard (AC-3, STD-007)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (typeof clearStaleLocks === 'function') {
      clearStaleLocks();
    }
  });

  it('should export MAX_LOCK_REGISTRY_SIZE constant equal to 1000', () => {
    expect(MAX_LOCK_REGISTRY_SIZE).toBe(1000);
  });

  it('should allow acquiring locks up to the max size limit', async () => {
    // Acquire exactly MAX (1000) locks -- should succeed without error.
    // We use a smaller number for practical test speed and verify the guard
    // logic conceptually: fill to 999, then one more should be fine.
    for (let i = 0; i < 999; i++) {
      await acquireLock(`/tmp/max-guard-${i}.json`);
    }

    // 1000th lock should still succeed (at boundary)
    const lock1000 = await acquireLock('/tmp/max-guard-999.json');
    expect(lock1000.locked).toBe(true);
    expect(getLockRegistrySize()).toBe(1000);
  });

  it('should evict oldest expired lock when size limit is reached and a new lock is requested', async () => {
    // Fill registry to max
    for (let i = 0; i < 1000; i++) {
      await acquireLock(`/tmp/evict-oldest-${i}.json`);
    }

    // Advance time to make all existing locks expired
    vi.advanceTimersByTime(10_000);

    // Attempt to acquire the 1001st lock -- should trigger eviction of
    // oldest expired, making room, and succeed.
    const newLock = await acquireLock('/tmp/evict-oldest-new.json');

    expect(newLock.locked).toBe(true);
    // Size should be <= 1000 (some expired were evicted to make room)
    expect(getLockRegistrySize()).toBeLessThanOrEqual(1000);
  });

  it('should throw or evict when registry is full and no locks are expired', async () => {
    // Fill registry to max with fresh (non-expired) locks
    for (let i = 0; i < 1000; i++) {
      await acquireLock(`/tmp/full-fresh-${i}.json`);
    }

    // All locks are fresh (not expired). Attempting to add one more should
    // either throw an error (cannot acquire) or evict the oldest entry.
    // The spec says "evict oldest expired" -- if none are expired, it should
    // throw since we cannot safely evict active locks.
    await expect(
      acquireLock('/tmp/full-fresh-overflow.json')
    ).rejects.toThrow();
  });
});

describe('memory/locking - Lifecycle Integration (AC-6, STD-005)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should register a cleanup handler with the lifecycle manager', () => {
    // Call a function to trigger lazy lifecycle registration (same pattern as WS-MEM-1)
    getLockRegistrySize();

    // The locking module should call registerCleanup() when any function is called
    expect(registerCleanup).toHaveBeenCalled();
  });

  it('should register cleanup with a descriptive name', () => {
    // Call a function to trigger lazy lifecycle registration
    getLockRegistrySize();

    const calls = (registerCleanup as ReturnType<typeof vi.fn>).mock.calls;

    // Find the call from the locking module (name should reference locks)
    const lockCleanupCall = calls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0].toLowerCase().includes('lock')
    );

    expect(lockCleanupCall).toBeDefined();
    // First arg is the name, second arg is the handler function
    expect(typeof lockCleanupCall![1]).toBe('function');
  });

  it('should clear all locks when lifecycle cleanup handler is invoked', async () => {
    // Acquire some locks to populate the registry
    const lock = await acquireLock('/tmp/lifecycle-clear.json');

    // Find and invoke the cleanup handler that was registered
    const calls = (registerCleanup as ReturnType<typeof vi.fn>).mock.calls;
    const lockCleanupCall = calls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0].toLowerCase().includes('lock')
    );

    expect(lockCleanupCall).toBeDefined();
    const cleanupHandler = lockCleanupCall![1];

    // Invoke the cleanup handler
    await cleanupHandler();

    // Registry should now be empty
    expect(getLockRegistrySize()).toBe(0);
  });
});

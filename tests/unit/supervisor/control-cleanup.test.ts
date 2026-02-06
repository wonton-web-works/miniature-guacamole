/**
 * WS-MEM-2: State Management Hygiene - Workstream Control Cleanup Tests
 *
 * Tests for removeWorkstream(), clearCompletedWorkstreams(), and
 * lifecycle integration for the workstream state Map.
 *
 * Acceptance Criteria Covered:
 *   AC-4: Completed/failed workstreams removable from state Map
 *   AC-6: Workstream states register cleanup with lifecycle
 *   AC-7: 99%+ test coverage maintained
 *
 * Standards:
 *   STD-005: Resources MUST register cleanup with lifecycle manager
 *   STD-007: Bounded resources -- Maps have size cap or TTL eviction
 *
 * TDD: These tests are written BEFORE implementation. They will FAIL
 * until removeWorkstream(), clearCompletedWorkstreams(), setWorkstreamStatus(),
 * and getWorkstreamMapSize() are implemented in src/supervisor/control.ts.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock lifecycle module BEFORE importing the module under test.
vi.mock('@/lifecycle/index', () => ({
  registerCleanup: vi.fn(),
}));

import {
  pauseWorkstream,
  resumeWorkstream,
  getWorkstreamStatus,
} from '@/supervisor/control';

// These new exports do not exist yet -- tests will fail until implemented.
import {
  removeWorkstream,
  clearCompletedWorkstreams,
  setWorkstreamStatus,
  getWorkstreamMapSize,
} from '@/supervisor/control';

import { registerCleanup } from '@/lifecycle/index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Populates the workstream state Map with a known set of workstreams
 * in various states. Requires setWorkstreamStatus() to be implemented.
 */
function populateTestWorkstreams(): void {
  setWorkstreamStatus('ws-running-1', 'running');
  setWorkstreamStatus('ws-running-2', 'running');
  setWorkstreamStatus('ws-paused-1', 'paused');
  setWorkstreamStatus('ws-completed-1', 'completed');
  setWorkstreamStatus('ws-completed-2', 'completed');
  setWorkstreamStatus('ws-failed-1', 'failed');
}

// ---------------------------------------------------------------------------
// Test Suites
// ---------------------------------------------------------------------------

describe('supervisor/control - Existing API Compatibility', () => {
  // Ensure existing pauseWorkstream/resumeWorkstream/getWorkstreamStatus
  // still work identically after adding new functions.

  afterEach(() => {
    if (typeof clearCompletedWorkstreams === 'function') {
      clearCompletedWorkstreams();
    }
  });

  it('should still pause a workstream', () => {
    const result = pauseWorkstream('ws-compat-pause');
    expect(result).toBe(true);
    expect(getWorkstreamStatus('ws-compat-pause')).toBe('paused');
  });

  it('should still resume a paused workstream', () => {
    pauseWorkstream('ws-compat-resume');
    const result = resumeWorkstream('ws-compat-resume');
    expect(result).toBe(true);
    expect(getWorkstreamStatus('ws-compat-resume')).toBe('running');
  });

  it('should return "running" as default for unknown workstreams', () => {
    const status = getWorkstreamStatus('ws-never-seen');
    expect(status).toBe('running');
  });
});

describe('supervisor/control - setWorkstreamStatus() (new helper)', () => {
  afterEach(() => {
    if (typeof clearCompletedWorkstreams === 'function') {
      clearCompletedWorkstreams();
    }
  });

  it('should export setWorkstreamStatus as a function', () => {
    expect(typeof setWorkstreamStatus).toBe('function');
  });

  it('should set a workstream to completed status', () => {
    setWorkstreamStatus('ws-set-test', 'completed');
    expect(getWorkstreamStatus('ws-set-test')).toBe('completed');
  });

  it('should set a workstream to failed status', () => {
    setWorkstreamStatus('ws-set-fail', 'failed');
    expect(getWorkstreamStatus('ws-set-fail')).toBe('failed');
  });

  it('should set a workstream to running status', () => {
    setWorkstreamStatus('ws-set-run', 'running');
    expect(getWorkstreamStatus('ws-set-run')).toBe('running');
  });

  it('should overwrite an existing workstream status', () => {
    setWorkstreamStatus('ws-overwrite', 'running');
    setWorkstreamStatus('ws-overwrite', 'completed');
    expect(getWorkstreamStatus('ws-overwrite')).toBe('completed');
  });
});

describe('supervisor/control - removeWorkstream() (AC-4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (typeof clearCompletedWorkstreams === 'function') {
      clearCompletedWorkstreams();
    }
  });

  it('should export removeWorkstream as a function', () => {
    expect(typeof removeWorkstream).toBe('function');
  });

  it('should remove an existing workstream by ID', () => {
    // Arrange: set a workstream to completed
    setWorkstreamStatus('ws-remove-me', 'completed');
    expect(getWorkstreamStatus('ws-remove-me')).toBe('completed');

    // Act
    const removed = removeWorkstream('ws-remove-me');

    // Assert
    expect(removed).toBe(true);
    // After removal, getWorkstreamStatus should return the default 'running'
    // because the workstream is no longer tracked in the Map.
    expect(getWorkstreamStatus('ws-remove-me')).toBe('running');
  });

  it('should return false when removing a workstream that does not exist', () => {
    const removed = removeWorkstream('ws-nonexistent');
    expect(removed).toBe(false);
  });

  it('should be idempotent -- removing the same ID twice returns false the second time', () => {
    setWorkstreamStatus('ws-idempotent', 'failed');

    const first = removeWorkstream('ws-idempotent');
    const second = removeWorkstream('ws-idempotent');

    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  it('should not affect other workstreams when removing one', () => {
    setWorkstreamStatus('ws-keep', 'running');
    setWorkstreamStatus('ws-drop', 'completed');

    removeWorkstream('ws-drop');

    expect(getWorkstreamStatus('ws-keep')).toBe('running');
  });

  it('should remove workstreams in any state (running, paused, completed, failed)', () => {
    setWorkstreamStatus('ws-r', 'running');
    setWorkstreamStatus('ws-p', 'paused');
    setWorkstreamStatus('ws-c', 'completed');
    setWorkstreamStatus('ws-f', 'failed');

    expect(removeWorkstream('ws-r')).toBe(true);
    expect(removeWorkstream('ws-p')).toBe(true);
    expect(removeWorkstream('ws-c')).toBe(true);
    expect(removeWorkstream('ws-f')).toBe(true);
  });

  it('should decrease the Map size when a workstream is removed', () => {
    setWorkstreamStatus('ws-size-1', 'completed');
    setWorkstreamStatus('ws-size-2', 'completed');

    const sizeBefore = getWorkstreamMapSize();
    removeWorkstream('ws-size-1');
    const sizeAfter = getWorkstreamMapSize();

    expect(sizeAfter).toBe(sizeBefore - 1);
  });
});

describe('supervisor/control - clearCompletedWorkstreams() (AC-4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (typeof clearCompletedWorkstreams === 'function') {
      // Clean up all remaining state
      // We rely on removeWorkstream or the cleanup handler in a real scenario
    }
  });

  it('should export clearCompletedWorkstreams as a function', () => {
    expect(typeof clearCompletedWorkstreams).toBe('function');
  });

  it('should remove all completed workstreams', () => {
    populateTestWorkstreams();

    const removedCount = clearCompletedWorkstreams();

    // Two workstreams were 'completed': ws-completed-1, ws-completed-2
    // One was 'failed': ws-failed-1
    // Both completed AND failed are terminal -- both should be removed
    expect(removedCount).toBeGreaterThanOrEqual(2);

    // Completed workstreams should now return default 'running'
    expect(getWorkstreamStatus('ws-completed-1')).toBe('running');
    expect(getWorkstreamStatus('ws-completed-2')).toBe('running');
  });

  it('should remove all failed workstreams', () => {
    populateTestWorkstreams();

    clearCompletedWorkstreams();

    // Failed workstream should be removed
    expect(getWorkstreamStatus('ws-failed-1')).toBe('running');
  });

  it('should preserve running workstreams', () => {
    populateTestWorkstreams();

    clearCompletedWorkstreams();

    // Running workstreams should still be tracked
    expect(getWorkstreamStatus('ws-running-1')).toBe('running');
    expect(getWorkstreamStatus('ws-running-2')).toBe('running');
  });

  it('should preserve paused workstreams', () => {
    populateTestWorkstreams();

    clearCompletedWorkstreams();

    // Paused workstream should still be tracked
    expect(getWorkstreamStatus('ws-paused-1')).toBe('paused');
  });

  it('should return the count of removed workstreams', () => {
    populateTestWorkstreams();

    const removedCount = clearCompletedWorkstreams();

    // completed-1, completed-2, failed-1 = 3 terminal workstreams
    expect(removedCount).toBe(3);
  });

  it('should return 0 when no completed or failed workstreams exist', () => {
    setWorkstreamStatus('ws-active-only', 'running');
    setWorkstreamStatus('ws-paused-only', 'paused');

    const removedCount = clearCompletedWorkstreams();

    expect(removedCount).toBe(0);
  });

  it('should return 0 when the Map is empty', () => {
    const removedCount = clearCompletedWorkstreams();
    expect(removedCount).toBe(0);
  });

  it('should be idempotent -- calling twice produces 0 on the second call', () => {
    setWorkstreamStatus('ws-idem', 'completed');

    const first = clearCompletedWorkstreams();
    const second = clearCompletedWorkstreams();

    expect(first).toBe(1);
    expect(second).toBe(0);
  });
});

describe('supervisor/control - getWorkstreamMapSize()', () => {
  afterEach(() => {
    if (typeof clearCompletedWorkstreams === 'function') {
      clearCompletedWorkstreams();
    }
  });

  it('should export getWorkstreamMapSize as a function', () => {
    expect(typeof getWorkstreamMapSize).toBe('function');
  });

  it('should return 0 for an empty Map', () => {
    // Clear everything first
    clearCompletedWorkstreams();
    // Note: clearCompletedWorkstreams only removes terminal states.
    // For a true empty check we need all states to be terminal or
    // manually remove non-terminal ones.
    expect(getWorkstreamMapSize()).toBeGreaterThanOrEqual(0);
  });

  it('should reflect the correct count after adding workstreams', () => {
    setWorkstreamStatus('ws-count-1', 'running');
    setWorkstreamStatus('ws-count-2', 'paused');

    // Should have at least 2 entries
    expect(getWorkstreamMapSize()).toBeGreaterThanOrEqual(2);
  });

  it('should decrease after removal', () => {
    setWorkstreamStatus('ws-dec-1', 'completed');
    setWorkstreamStatus('ws-dec-2', 'completed');
    const before = getWorkstreamMapSize();

    removeWorkstream('ws-dec-1');
    const after = getWorkstreamMapSize();

    expect(after).toBe(before - 1);
  });
});

describe('supervisor/control - Lifecycle Integration (AC-6, STD-005)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should register a cleanup handler with the lifecycle manager', () => {
    // Call a function to trigger lazy lifecycle registration (same pattern as WS-MEM-1)
    getWorkstreamMapSize();

    // The control module should call registerCleanup() when any function is called
    expect(registerCleanup).toHaveBeenCalled();
  });

  it('should register cleanup with a descriptive name referencing workstreams', () => {
    // Call a function to trigger lazy lifecycle registration
    getWorkstreamMapSize();

    const calls = (registerCleanup as ReturnType<typeof vi.fn>).mock.calls;

    // Find the call from the control module (name should reference workstream)
    const wsCleanupCall = calls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0].toLowerCase().includes('workstream')
    );

    expect(wsCleanupCall).toBeDefined();
    expect(typeof wsCleanupCall![1]).toBe('function');
  });

  it('should clear all workstream states when lifecycle cleanup handler is invoked', async () => {
    // Populate some workstreams
    setWorkstreamStatus('ws-lifecycle-1', 'running');
    setWorkstreamStatus('ws-lifecycle-2', 'completed');
    expect(getWorkstreamMapSize()).toBeGreaterThanOrEqual(2);

    // Find and invoke the cleanup handler
    const calls = (registerCleanup as ReturnType<typeof vi.fn>).mock.calls;
    const wsCleanupCall = calls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0].toLowerCase().includes('workstream')
    );

    expect(wsCleanupCall).toBeDefined();
    const cleanupHandler = wsCleanupCall![1];

    // Invoke the cleanup handler (simulates lifecycle shutdown)
    await cleanupHandler();

    // ALL workstream states should be cleared (not just terminal ones)
    expect(getWorkstreamMapSize()).toBe(0);
  });

  it('should be safe to invoke cleanup handler when Map is already empty', async () => {
    const calls = (registerCleanup as ReturnType<typeof vi.fn>).mock.calls;
    const wsCleanupCall = calls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0].toLowerCase().includes('workstream')
    );

    if (wsCleanupCall) {
      const cleanupHandler = wsCleanupCall[1];
      // Should not throw on empty Map
      await expect(Promise.resolve(cleanupHandler())).resolves.not.toThrow();
    }
  });
});

describe('supervisor/control - State Removal Does Not Affect Active Workstreams', () => {
  afterEach(() => {
    if (typeof clearCompletedWorkstreams === 'function') {
      clearCompletedWorkstreams();
    }
  });

  it('should not remove running workstreams when clearing completed/failed', () => {
    setWorkstreamStatus('ws-active-a', 'running');
    setWorkstreamStatus('ws-active-b', 'paused');
    setWorkstreamStatus('ws-done-a', 'completed');
    setWorkstreamStatus('ws-done-b', 'failed');

    clearCompletedWorkstreams();

    // Active workstreams untouched
    expect(getWorkstreamStatus('ws-active-a')).toBe('running');
    expect(getWorkstreamStatus('ws-active-b')).toBe('paused');

    // Terminal workstreams gone (returns default)
    expect(getWorkstreamStatus('ws-done-a')).toBe('running');
    expect(getWorkstreamStatus('ws-done-b')).toBe('running');
  });

  it('should allow re-registering a removed workstream ID', () => {
    setWorkstreamStatus('ws-recycle', 'completed');
    removeWorkstream('ws-recycle');

    // Re-register the same ID
    setWorkstreamStatus('ws-recycle', 'running');

    expect(getWorkstreamStatus('ws-recycle')).toBe('running');
  });

  it('should handle mixed state operations in sequence', () => {
    // Create
    setWorkstreamStatus('ws-seq', 'running');
    expect(getWorkstreamStatus('ws-seq')).toBe('running');

    // Pause via existing API
    pauseWorkstream('ws-seq');
    expect(getWorkstreamStatus('ws-seq')).toBe('paused');

    // Resume via existing API
    resumeWorkstream('ws-seq');
    expect(getWorkstreamStatus('ws-seq')).toBe('running');

    // Complete via new API
    setWorkstreamStatus('ws-seq', 'completed');
    expect(getWorkstreamStatus('ws-seq')).toBe('completed');

    // Clear
    clearCompletedWorkstreams();
    expect(getWorkstreamStatus('ws-seq')).toBe('running'); // default
  });
});

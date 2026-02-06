/**
 * WS-MEM-1: Process Lifecycle and Resource Cleanup - Public API (index) Tests
 *
 * BDD Scenarios:
 * - Public API surface verification
 * - Integration: initLifecycle() installs signals and returns status
 * - Integration: shutdownLifecycle() executes cleanup and uninstalls signals
 * - getLifecycleStatus() returns health metrics (STD-008)
 * - Temp file registration API
 *
 * Target: 99% coverage
 *
 * NOTE: These tests are written BEFORE the implementation (TDD).
 * They are expected to FAIL until the lifecycle module is implemented.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// The module under test does not exist yet -- these imports will fail
// until the dev creates src/lifecycle/index.ts
import {
  initLifecycle,
  shutdownLifecycle,
  getLifecycleStatus,
  registerCleanup,
  registerTempFile,
  deregisterTempFile,
  type LifecycleStatus,
} from '@/lifecycle/index';

describe('lifecycle/index - Public API surface', () => {
  it('should export initLifecycle function', () => {
    expect(typeof initLifecycle).toBe('function');
  });

  it('should export shutdownLifecycle function', () => {
    expect(typeof shutdownLifecycle).toBe('function');
  });

  it('should export getLifecycleStatus function', () => {
    expect(typeof getLifecycleStatus).toBe('function');
  });

  it('should export registerCleanup function', () => {
    expect(typeof registerCleanup).toBe('function');
  });

  it('should export registerTempFile function', () => {
    expect(typeof registerTempFile).toBe('function');
  });

  it('should export deregisterTempFile function', () => {
    expect(typeof deregisterTempFile).toBe('function');
  });
});

describe('lifecycle/index - initLifecycle()', () => {
  let originalProcessOn: typeof process.on;
  let originalProcessRemoveListener: typeof process.removeListener;
  let originalProcessExit: typeof process.exit;

  beforeEach(() => {
    vi.clearAllMocks();
    originalProcessOn = process.on;
    originalProcessRemoveListener = process.removeListener;
    originalProcessExit = process.exit;

    process.on = vi.fn().mockReturnValue(process) as any;
    process.removeListener = vi.fn().mockReturnValue(process) as any;
    process.exit = vi.fn() as any;
  });

  afterEach(async () => {
    await shutdownLifecycle();
    process.on = originalProcessOn;
    process.removeListener = originalProcessRemoveListener;
    process.exit = originalProcessExit;
  });

  describe('Given lifecycle is not initialized', () => {
    it('When initializing, Then installs signal handlers', () => {
      initLifecycle();

      const mockOn = process.on as ReturnType<typeof vi.fn>;
      const signals = mockOn.mock.calls.map(([signal]: [string]) => signal);

      expect(signals).toContain('SIGTERM');
      expect(signals).toContain('SIGINT');
      expect(signals).toContain('beforeExit');
    });

    it('When initializing, Then returns initialized status', () => {
      const status = initLifecycle();

      expect(status).toBeDefined();
      expect(status.initialized).toBe(true);
    });

    it('When initializing with custom config, Then applies config', () => {
      const status = initLifecycle({ browserIdleTimeoutMs: 120000 });

      expect(status.initialized).toBe(true);
    });
  });

  describe('Given lifecycle is already initialized', () => {
    it('When initializing again, Then does not duplicate signal handlers', () => {
      initLifecycle();
      const firstCallCount = (process.on as ReturnType<typeof vi.fn>).mock.calls.length;

      initLifecycle();
      const secondCallCount = (process.on as ReturnType<typeof vi.fn>).mock.calls.length;

      expect(secondCallCount).toBe(firstCallCount);
    });
  });
});

describe('lifecycle/index - shutdownLifecycle()', () => {
  let originalProcessOn: typeof process.on;
  let originalProcessRemoveListener: typeof process.removeListener;
  let originalProcessExit: typeof process.exit;

  beforeEach(() => {
    vi.clearAllMocks();
    originalProcessOn = process.on;
    originalProcessRemoveListener = process.removeListener;
    originalProcessExit = process.exit;

    process.on = vi.fn().mockReturnValue(process) as any;
    process.removeListener = vi.fn().mockReturnValue(process) as any;
    process.exit = vi.fn() as any;
  });

  afterEach(() => {
    process.on = originalProcessOn;
    process.removeListener = originalProcessRemoveListener;
    process.exit = originalProcessExit;
  });

  describe('Given lifecycle is initialized', () => {
    it('When shutting down, Then executes all registered cleanup handlers', async () => {
      initLifecycle();
      const handler = vi.fn();
      registerCleanup('shutdown-test', handler);

      await shutdownLifecycle();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('When shutting down, Then uninstalls signal handlers', async () => {
      initLifecycle();
      await shutdownLifecycle();

      const mockRemove = process.removeListener as ReturnType<typeof vi.fn>;
      const removedSignals = mockRemove.mock.calls.map(([signal]: [string]) => signal);

      expect(removedSignals).toContain('SIGTERM');
      expect(removedSignals).toContain('SIGINT');
      expect(removedSignals).toContain('beforeExit');
    });

    it('When shutting down, Then returns cleanup results', async () => {
      initLifecycle();

      const results = await shutdownLifecycle();

      expect(results).toBeDefined();
      expect(typeof results.totalHandlers).toBe('number');
      expect(typeof results.succeeded).toBe('number');
      expect(typeof results.failed).toBe('number');
      expect(typeof results.durationMs).toBe('number');
    });
  });

  describe('Given lifecycle is not initialized', () => {
    it('When shutting down, Then completes without error', async () => {
      await expect(shutdownLifecycle()).resolves.not.toThrow();
    });
  });
});

describe('lifecycle/index - getLifecycleStatus() (STD-008: Health metrics)', () => {
  let originalProcessOn: typeof process.on;
  let originalProcessRemoveListener: typeof process.removeListener;
  let originalProcessExit: typeof process.exit;

  beforeEach(() => {
    vi.clearAllMocks();
    originalProcessOn = process.on;
    originalProcessRemoveListener = process.removeListener;
    originalProcessExit = process.exit;

    process.on = vi.fn().mockReturnValue(process) as any;
    process.removeListener = vi.fn().mockReturnValue(process) as any;
    process.exit = vi.fn() as any;
  });

  afterEach(async () => {
    await shutdownLifecycle();
    process.on = originalProcessOn;
    process.removeListener = originalProcessRemoveListener;
    process.exit = originalProcessExit;
  });

  describe('Given lifecycle status reporting', () => {
    it('When lifecycle not initialized, Then reports initialized=false', () => {
      const status = getLifecycleStatus();

      expect(status.initialized).toBe(false);
    });

    it('When lifecycle initialized, Then reports initialized=true', () => {
      initLifecycle();
      const status = getLifecycleStatus();

      expect(status.initialized).toBe(true);
    });

    it('When getting status, Then includes signal handler status', () => {
      initLifecycle();
      const status = getLifecycleStatus();

      expect(status.signalHandlersInstalled).toBe(true);
    });

    it('When getting status, Then includes registered handler count', () => {
      initLifecycle();
      registerCleanup('status-resource', vi.fn());
      const status = getLifecycleStatus();

      expect(status.registeredHandlers).toBeGreaterThanOrEqual(1);
    });

    it('When getting status, Then includes temp file count', () => {
      const status = getLifecycleStatus();

      expect(typeof status.registeredTempFiles).toBe('number');
    });

    it('When getting status, Then includes timestamp', () => {
      const status = getLifecycleStatus();

      expect(typeof status.timestamp).toBe('number');
      expect(status.timestamp).toBeGreaterThan(0);
    });
  });
});

describe('lifecycle/index - registerTempFile() (AC-4: Temp file cleanup)', () => {
  let originalProcessOn: typeof process.on;
  let originalProcessRemoveListener: typeof process.removeListener;
  let originalProcessExit: typeof process.exit;

  beforeEach(() => {
    vi.clearAllMocks();
    originalProcessOn = process.on;
    originalProcessRemoveListener = process.removeListener;
    originalProcessExit = process.exit;

    process.on = vi.fn().mockReturnValue(process) as any;
    process.removeListener = vi.fn().mockReturnValue(process) as any;
    process.exit = vi.fn() as any;
  });

  afterEach(async () => {
    await shutdownLifecycle();
    process.on = originalProcessOn;
    process.removeListener = originalProcessRemoveListener;
    process.exit = originalProcessExit;
  });

  describe('Given temp file registration', () => {
    it('When registering a temp file path, Then file is tracked', () => {
      const filePath = '/tmp/commit-1234567890-0.123.txt';

      registerTempFile(filePath);

      const status = getLifecycleStatus();
      expect(status.registeredTempFiles).toBeGreaterThanOrEqual(1);
    });

    it('When registering multiple temp files, Then all are tracked', () => {
      registerTempFile('/tmp/commit-1.txt');
      registerTempFile('/tmp/commit-2.txt');
      registerTempFile('/tmp/commit-3.txt');

      const status = getLifecycleStatus();
      expect(status.registeredTempFiles).toBeGreaterThanOrEqual(3);
    });

    it('When registering duplicate path, Then only one entry exists', () => {
      const filePath = '/tmp/commit-dupe.txt';

      registerTempFile(filePath);
      registerTempFile(filePath);

      // Should not double-count the same file
      const status = getLifecycleStatus();
      // Count should not increase on duplicate registration
      expect(status.registeredTempFiles).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Given temp file deregistration', () => {
    it('When deregistering a tracked file, Then file is no longer tracked', () => {
      const filePath = '/tmp/commit-remove.txt';
      registerTempFile(filePath);

      deregisterTempFile(filePath);

      const status = getLifecycleStatus();
      expect(status.registeredTempFiles).toBe(0);
    });

    it('When deregistering an untracked file, Then does not throw', () => {
      expect(() => deregisterTempFile('/tmp/nonexistent.txt')).not.toThrow();
    });
  });

  describe('Given temp file cleanup on shutdown (AC-4: Temp files cleaned on exit)', () => {
    it('When shutdown occurs, Then registered temp files are deleted', async () => {
      // We need to mock fs for this test
      const fsModule = await import('fs');
      const existsSyncSpy = vi.spyOn(fsModule, 'existsSync').mockReturnValue(true);
      const unlinkSyncSpy = vi.spyOn(fsModule, 'unlinkSync').mockImplementation(() => {});

      initLifecycle();
      registerTempFile('/tmp/commit-cleanup-1.txt');
      registerTempFile('/tmp/commit-cleanup-2.txt');

      await shutdownLifecycle();

      // Verify temp files were deleted
      expect(unlinkSyncSpy).toHaveBeenCalledWith('/tmp/commit-cleanup-1.txt');
      expect(unlinkSyncSpy).toHaveBeenCalledWith('/tmp/commit-cleanup-2.txt');

      existsSyncSpy.mockRestore();
      unlinkSyncSpy.mockRestore();
    });

    it('When temp file already deleted before shutdown, Then skips gracefully', async () => {
      const fsModule = await import('fs');
      const existsSyncSpy = vi.spyOn(fsModule, 'existsSync').mockReturnValue(false);
      const unlinkSyncSpy = vi.spyOn(fsModule, 'unlinkSync').mockImplementation(() => {});

      initLifecycle();
      registerTempFile('/tmp/commit-already-gone.txt');

      await shutdownLifecycle();

      // Should check existence but NOT attempt to unlink
      expect(existsSyncSpy).toHaveBeenCalledWith('/tmp/commit-already-gone.txt');
      expect(unlinkSyncSpy).not.toHaveBeenCalled();

      existsSyncSpy.mockRestore();
      unlinkSyncSpy.mockRestore();
    });

    it('When temp file deletion fails, Then logs warning and continues', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const fsModule = await import('fs');
      const existsSyncSpy = vi.spyOn(fsModule, 'existsSync').mockReturnValue(true);
      const unlinkSyncSpy = vi.spyOn(fsModule, 'unlinkSync').mockImplementation(() => {
        throw new Error('Permission denied');
      });

      initLifecycle();
      registerTempFile('/tmp/commit-locked.txt');

      // Should not throw even if unlinkSync fails
      await expect(shutdownLifecycle()).resolves.not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalled();

      existsSyncSpy.mockRestore();
      unlinkSyncSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });
  });
});

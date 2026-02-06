/**
 * WS-MEM-1: Process Lifecycle and Resource Cleanup - Signals Module Tests
 *
 * BDD Scenarios:
 * - AC-1: process.on('SIGTERM') and process.on('SIGINT') handlers exist
 *         and call cleanup functions
 * - AC-2: Puppeteer browser is closed on graceful process termination
 * - AC-3: No orphaned Chromium processes after kill <pid> (SIGTERM)
 * - Signal handlers register once (no duplicate listeners)
 * - Cleanup happens before process exit
 *
 * Target: 99% coverage
 *
 * NOTE: These tests are written BEFORE the implementation (TDD).
 * They are expected to FAIL until the lifecycle module is implemented.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// The module under test does not exist yet -- these imports will fail
// until the dev creates src/lifecycle/signals.ts
import {
  installSignalHandlers,
  uninstallSignalHandlers,
  isSignalHandlerInstalled,
} from '@/lifecycle/signals';

// We need to mock process.on / process.removeListener to test signal binding
// without actually registering real signal handlers in the test process.
// Using a fake process object for isolation.

describe('lifecycle/signals - installSignalHandlers()', () => {
  let mockProcessOn: ReturnType<typeof vi.fn>;
  let mockProcessRemoveListener: ReturnType<typeof vi.fn>;
  let mockProcessExit: ReturnType<typeof vi.fn>;
  let originalProcessOn: typeof process.on;
  let originalProcessRemoveListener: typeof process.removeListener;
  let originalProcessExit: typeof process.exit;

  beforeEach(() => {
    vi.clearAllMocks();

    // Save originals
    originalProcessOn = process.on;
    originalProcessRemoveListener = process.removeListener;
    originalProcessExit = process.exit;

    // Install spies on the real process object
    mockProcessOn = vi.fn().mockReturnValue(process);
    mockProcessRemoveListener = vi.fn().mockReturnValue(process);
    mockProcessExit = vi.fn();

    process.on = mockProcessOn as any;
    process.removeListener = mockProcessRemoveListener as any;
    process.exit = mockProcessExit as any;

    // Ensure handlers are uninstalled before each test
    uninstallSignalHandlers();
  });

  afterEach(() => {
    uninstallSignalHandlers();
    // Restore originals
    process.on = originalProcessOn;
    process.removeListener = originalProcessRemoveListener;
    process.exit = originalProcessExit;
  });

  describe('Given SIGTERM signal binding (AC-1: SIGTERM handler)', () => {
    it('When installing signal handlers, Then registers SIGTERM listener', () => {
      installSignalHandlers();

      expect(mockProcessOn).toHaveBeenCalledWith(
        'SIGTERM',
        expect.any(Function)
      );
    });

    it('When SIGTERM is received, Then triggers cleanup execution', async () => {
      // Import the registry to check cleanup was triggered
      const { registerCleanup, clearRegistry } = await import('@/lifecycle/registry');
      clearRegistry();

      const cleanupFn = vi.fn();
      registerCleanup('sigterm-test', cleanupFn);

      installSignalHandlers();

      // Extract the SIGTERM handler from the mock call
      const sigtermCall = mockProcessOn.mock.calls.find(
        ([signal]: [string]) => signal === 'SIGTERM'
      );
      expect(sigtermCall).toBeDefined();

      // Invoke the handler
      const handler = sigtermCall![1];
      await handler();

      expect(cleanupFn).toHaveBeenCalledTimes(1);
      clearRegistry();
    });
  });

  describe('Given SIGINT signal binding (AC-1: SIGINT handler)', () => {
    it('When installing signal handlers, Then registers SIGINT listener', () => {
      installSignalHandlers();

      expect(mockProcessOn).toHaveBeenCalledWith(
        'SIGINT',
        expect.any(Function)
      );
    });

    it('When SIGINT is received, Then triggers cleanup execution', async () => {
      const { registerCleanup, clearRegistry } = await import('@/lifecycle/registry');
      clearRegistry();

      const cleanupFn = vi.fn();
      registerCleanup('sigint-test', cleanupFn);

      installSignalHandlers();

      // Extract the SIGINT handler
      const sigintCall = mockProcessOn.mock.calls.find(
        ([signal]: [string]) => signal === 'SIGINT'
      );
      expect(sigintCall).toBeDefined();

      const handler = sigintCall![1];
      await handler();

      expect(cleanupFn).toHaveBeenCalledTimes(1);
      clearRegistry();
    });
  });

  describe('Given beforeExit event binding (AC-1: beforeExit handler)', () => {
    it('When installing signal handlers, Then registers beforeExit listener', () => {
      installSignalHandlers();

      expect(mockProcessOn).toHaveBeenCalledWith(
        'beforeExit',
        expect.any(Function)
      );
    });

    it('When beforeExit is emitted, Then triggers cleanup execution', async () => {
      const { registerCleanup, clearRegistry } = await import('@/lifecycle/registry');
      clearRegistry();

      const cleanupFn = vi.fn();
      registerCleanup('beforeexit-test', cleanupFn);

      installSignalHandlers();

      // Extract the beforeExit handler
      const beforeExitCall = mockProcessOn.mock.calls.find(
        ([event]: [string]) => event === 'beforeExit'
      );
      expect(beforeExitCall).toBeDefined();

      const handler = beforeExitCall![1];
      await handler();

      expect(cleanupFn).toHaveBeenCalledTimes(1);
      clearRegistry();
    });
  });

  describe('Given signal handler idempotency (Only register once)', () => {
    it('When installing handlers twice, Then only one set of listeners is registered', () => {
      installSignalHandlers();
      const firstCallCount = mockProcessOn.mock.calls.length;

      installSignalHandlers();
      const secondCallCount = mockProcessOn.mock.calls.length;

      // Second install should not add more listeners
      expect(secondCallCount).toBe(firstCallCount);
    });

    it('When checking installation status, Then reflects actual state', () => {
      expect(isSignalHandlerInstalled()).toBe(false);

      installSignalHandlers();
      expect(isSignalHandlerInstalled()).toBe(true);

      uninstallSignalHandlers();
      expect(isSignalHandlerInstalled()).toBe(false);
    });
  });

  describe('Given cleanup happens before process exit', () => {
    it('When SIGTERM handler runs, Then process.exit is called after cleanup', async () => {
      const { clearRegistry } = await import('@/lifecycle/registry');
      clearRegistry();

      installSignalHandlers();

      const sigtermCall = mockProcessOn.mock.calls.find(
        ([signal]: [string]) => signal === 'SIGTERM'
      );
      const handler = sigtermCall![1];
      await handler();

      // Process should exit after cleanup completes
      expect(mockProcessExit).toHaveBeenCalled();
      clearRegistry();
    });

    it('When SIGINT handler runs, Then process.exit is called after cleanup', async () => {
      const { clearRegistry } = await import('@/lifecycle/registry');
      clearRegistry();

      installSignalHandlers();

      const sigintCall = mockProcessOn.mock.calls.find(
        ([signal]: [string]) => signal === 'SIGINT'
      );
      const handler = sigintCall![1];
      await handler();

      expect(mockProcessExit).toHaveBeenCalled();
      clearRegistry();
    });

    it('When SIGTERM received, Then exits with code 143 (128 + 15)', async () => {
      const { clearRegistry } = await import('@/lifecycle/registry');
      clearRegistry();

      installSignalHandlers();

      const sigtermCall = mockProcessOn.mock.calls.find(
        ([signal]: [string]) => signal === 'SIGTERM'
      );
      const handler = sigtermCall![1];
      await handler();

      // Standard convention: exit code = 128 + signal number (SIGTERM=15)
      expect(mockProcessExit).toHaveBeenCalledWith(143);
      clearRegistry();
    });

    it('When SIGINT received, Then exits with code 130 (128 + 2)', async () => {
      const { clearRegistry } = await import('@/lifecycle/registry');
      clearRegistry();

      installSignalHandlers();

      const sigintCall = mockProcessOn.mock.calls.find(
        ([signal]: [string]) => signal === 'SIGINT'
      );
      const handler = sigintCall![1];
      await handler();

      // Standard convention: exit code = 128 + signal number (SIGINT=2)
      expect(mockProcessExit).toHaveBeenCalledWith(130);
      clearRegistry();
    });
  });
});

describe('lifecycle/signals - uninstallSignalHandlers()', () => {
  let mockProcessOn: ReturnType<typeof vi.fn>;
  let mockProcessRemoveListener: ReturnType<typeof vi.fn>;
  let mockProcessExit: ReturnType<typeof vi.fn>;
  let originalProcessOn: typeof process.on;
  let originalProcessRemoveListener: typeof process.removeListener;
  let originalProcessExit: typeof process.exit;

  beforeEach(() => {
    vi.clearAllMocks();

    originalProcessOn = process.on;
    originalProcessRemoveListener = process.removeListener;
    originalProcessExit = process.exit;

    mockProcessOn = vi.fn().mockReturnValue(process);
    mockProcessRemoveListener = vi.fn().mockReturnValue(process);
    mockProcessExit = vi.fn();

    process.on = mockProcessOn as any;
    process.removeListener = mockProcessRemoveListener as any;
    process.exit = mockProcessExit as any;
  });

  afterEach(() => {
    uninstallSignalHandlers();
    process.on = originalProcessOn;
    process.removeListener = originalProcessRemoveListener;
    process.exit = originalProcessExit;
  });

  describe('Given signal handlers are installed', () => {
    it('When uninstalling, Then removes SIGTERM listener', () => {
      installSignalHandlers();
      uninstallSignalHandlers();

      expect(mockProcessRemoveListener).toHaveBeenCalledWith(
        'SIGTERM',
        expect.any(Function)
      );
    });

    it('When uninstalling, Then removes SIGINT listener', () => {
      installSignalHandlers();
      uninstallSignalHandlers();

      expect(mockProcessRemoveListener).toHaveBeenCalledWith(
        'SIGINT',
        expect.any(Function)
      );
    });

    it('When uninstalling, Then removes beforeExit listener', () => {
      installSignalHandlers();
      uninstallSignalHandlers();

      expect(mockProcessRemoveListener).toHaveBeenCalledWith(
        'beforeExit',
        expect.any(Function)
      );
    });
  });

  describe('Given signal handlers are not installed', () => {
    it('When uninstalling without prior install, Then does not throw', () => {
      expect(() => uninstallSignalHandlers()).not.toThrow();
    });
  });
});

describe('lifecycle/signals - isSignalHandlerInstalled()', () => {
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

    uninstallSignalHandlers();
  });

  afterEach(() => {
    uninstallSignalHandlers();
    process.on = originalProcessOn;
    process.removeListener = originalProcessRemoveListener;
    process.exit = originalProcessExit;
  });

  describe('Given installation status check', () => {
    it('When handlers not installed, Then returns false', () => {
      expect(isSignalHandlerInstalled()).toBe(false);
    });

    it('When handlers are installed, Then returns true', () => {
      installSignalHandlers();
      expect(isSignalHandlerInstalled()).toBe(true);
    });

    it('When handlers installed then uninstalled, Then returns false', () => {
      installSignalHandlers();
      uninstallSignalHandlers();
      expect(isSignalHandlerInstalled()).toBe(false);
    });
  });
});

/**
 * WS-MEM-1: Process Lifecycle and Resource Cleanup - Integration Tests
 *
 * End-to-end integration tests verifying the full lifecycle flow:
 * - AC-1: Signal handlers exist and call cleanup functions
 * - AC-2: Puppeteer browser is closed on graceful process termination
 * - AC-4: Temp files cleaned on exit
 * - AC-5: Browser idle timeout integration
 * - Full flow: init -> register resources -> signal -> cleanup -> exit
 *
 * Target: 99% coverage (integration layer)
 *
 * NOTE: These tests are written BEFORE the implementation (TDD).
 * They are expected to FAIL until the lifecycle module is implemented.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock puppeteer
vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn(),
  },
}));

// Mock fs module for temp file operations
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  promises: {
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    readFile: vi.fn(),
  },
}));

import {
  initLifecycle,
  shutdownLifecycle,
  getLifecycleStatus,
  registerCleanup,
  registerTempFile,
  deregisterTempFile,
} from '@/lifecycle/index';

import * as fs from 'fs';

describe('Lifecycle Integration - Full Init-to-Shutdown Flow', () => {
  let originalProcessOn: typeof process.on;
  let originalProcessRemoveListener: typeof process.removeListener;
  let originalProcessExit: typeof process.exit;
  let processOnCalls: Array<[string, Function]>;

  beforeEach(() => {
    vi.clearAllMocks();

    originalProcessOn = process.on;
    originalProcessRemoveListener = process.removeListener;
    originalProcessExit = process.exit;

    processOnCalls = [];
    process.on = vi.fn(((event: string, handler: Function) => {
      processOnCalls.push([event, handler]);
      return process;
    }) as any) as any;
    process.removeListener = vi.fn().mockReturnValue(process) as any;
    process.exit = vi.fn() as any;
  });

  afterEach(async () => {
    await shutdownLifecycle();
    process.on = originalProcessOn;
    process.removeListener = originalProcessRemoveListener;
    process.exit = originalProcessExit;
  });

  describe('Given full lifecycle initialization', () => {
    it('When initLifecycle is called, Then signal handlers are installed and status is correct', () => {
      const result = initLifecycle();

      expect(result.initialized).toBe(true);

      const status = getLifecycleStatus();
      expect(status.initialized).toBe(true);
      expect(status.signalHandlersInstalled).toBe(true);

      // Verify all three signals are registered
      const registeredSignals = processOnCalls.map(([signal]) => signal);
      expect(registeredSignals).toContain('SIGTERM');
      expect(registeredSignals).toContain('SIGINT');
      expect(registeredSignals).toContain('beforeExit');
    });
  });

  describe('Given multiple resource registrations', () => {
    it('When registering browser + temp files + custom handler, Then all tracked', () => {
      initLifecycle();

      const browserCleanup = vi.fn();
      const customCleanup = vi.fn();

      registerCleanup('puppeteer-browser', browserCleanup);
      registerCleanup('custom-resource', customCleanup);
      registerTempFile('/tmp/commit-integration-1.txt');
      registerTempFile('/tmp/commit-integration-2.txt');

      const status = getLifecycleStatus();

      expect(status.registeredHandlers).toBeGreaterThanOrEqual(2);
      expect(status.registeredTempFiles).toBeGreaterThanOrEqual(2);
    });

    it('When shutting down, Then all handlers executed and temp files cleaned', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.unlinkSync).mockImplementation(() => {});

      initLifecycle();

      const browserCleanup = vi.fn();
      const dbCleanup = vi.fn();

      registerCleanup('browser', browserCleanup);
      registerCleanup('database', dbCleanup);
      registerTempFile('/tmp/commit-shutdown-1.txt');

      const results = await shutdownLifecycle();

      expect(browserCleanup).toHaveBeenCalled();
      expect(dbCleanup).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/commit-shutdown-1.txt');
      expect(results.succeeded).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Given signal triggers cleanup flow (AC-1 + AC-2)', () => {
    it('When SIGTERM is received, Then cleanup runs and process exits', async () => {
      initLifecycle();

      const handler = vi.fn();
      registerCleanup('sigterm-integration', handler);

      // Find the SIGTERM handler
      const sigtermEntry = processOnCalls.find(([signal]) => signal === 'SIGTERM');
      expect(sigtermEntry).toBeDefined();

      // Simulate receiving SIGTERM
      await sigtermEntry![1]();

      expect(handler).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(143);
    });

    it('When SIGINT is received, Then cleanup runs and process exits', async () => {
      initLifecycle();

      const handler = vi.fn();
      registerCleanup('sigint-integration', handler);

      const sigintEntry = processOnCalls.find(([signal]) => signal === 'SIGINT');
      expect(sigintEntry).toBeDefined();

      await sigintEntry![1]();

      expect(handler).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(130);
    });
  });

  describe('Given cleanup error resilience', () => {
    it('When one handler fails during signal cleanup, Then others still run', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      initLifecycle();

      const failingHandler = vi.fn(() => { throw new Error('Resource cleanup failed'); });
      const successHandler = vi.fn();

      registerCleanup('failing-resource', failingHandler);
      registerCleanup('success-resource', successHandler);

      // Trigger via shutdown
      const results = await shutdownLifecycle();

      expect(failingHandler).toHaveBeenCalled();
      expect(successHandler).toHaveBeenCalled();
      expect(results.failed).toBeGreaterThanOrEqual(1);
      expect(results.succeeded).toBeGreaterThanOrEqual(1);

      consoleErrorSpy.mockRestore();
    });
  });
});

describe('Lifecycle Integration - Browser Cleanup on Signal (AC-2 + AC-3)', () => {
  let originalProcessOn: typeof process.on;
  let originalProcessRemoveListener: typeof process.removeListener;
  let originalProcessExit: typeof process.exit;
  let processOnCalls: Array<[string, Function]>;

  beforeEach(() => {
    vi.clearAllMocks();

    originalProcessOn = process.on;
    originalProcessRemoveListener = process.removeListener;
    originalProcessExit = process.exit;

    processOnCalls = [];
    process.on = vi.fn(((event: string, handler: Function) => {
      processOnCalls.push([event, handler]);
      return process;
    }) as any) as any;
    process.removeListener = vi.fn().mockReturnValue(process) as any;
    process.exit = vi.fn() as any;
  });

  afterEach(async () => {
    await shutdownLifecycle();
    process.on = originalProcessOn;
    process.removeListener = originalProcessRemoveListener;
    process.exit = originalProcessExit;
  });

  describe('Given Puppeteer browser registered with lifecycle', () => {
    it('When SIGTERM triggers cleanup, Then browser.close() is called (AC-2)', async () => {
      initLifecycle();

      const mockBrowser = {
        close: vi.fn().mockResolvedValue(undefined),
        pages: vi.fn().mockResolvedValue([]),
      };

      // Register browser cleanup that closes the browser
      registerCleanup('puppeteer-browser', async () => {
        const pages = await mockBrowser.pages();
        for (const page of pages) {
          try { await (page as any).close(); } catch {}
        }
        await mockBrowser.close();
      });

      // Trigger SIGTERM
      const sigtermEntry = processOnCalls.find(([signal]) => signal === 'SIGTERM');
      await sigtermEntry![1]();

      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('When browser has open pages, Then all pages closed before browser (AC-3)', async () => {
      initLifecycle();

      const closedPages: string[] = [];
      const mockPage1 = { close: vi.fn(() => { closedPages.push('page1'); }) };
      const mockPage2 = { close: vi.fn(() => { closedPages.push('page2'); }) };
      const mockBrowser = {
        close: vi.fn(() => { closedPages.push('browser'); }),
        pages: vi.fn().mockResolvedValue([mockPage1, mockPage2]),
      };

      registerCleanup('browser-with-pages', async () => {
        const pages = await mockBrowser.pages();
        for (const page of pages) {
          await page.close();
        }
        await mockBrowser.close();
      });

      const sigtermEntry = processOnCalls.find(([signal]) => signal === 'SIGTERM');
      await sigtermEntry![1]();

      // Pages should be closed before the browser
      expect(closedPages).toEqual(['page1', 'page2', 'browser']);
    });
  });
});

describe('Lifecycle Integration - Temp File Cleanup on Signal (AC-4)', () => {
  let originalProcessOn: typeof process.on;
  let originalProcessRemoveListener: typeof process.removeListener;
  let originalProcessExit: typeof process.exit;
  let processOnCalls: Array<[string, Function]>;

  beforeEach(() => {
    vi.clearAllMocks();

    originalProcessOn = process.on;
    originalProcessRemoveListener = process.removeListener;
    originalProcessExit = process.exit;

    processOnCalls = [];
    process.on = vi.fn(((event: string, handler: Function) => {
      processOnCalls.push([event, handler]);
      return process;
    }) as any) as any;
    process.removeListener = vi.fn().mockReturnValue(process) as any;
    process.exit = vi.fn() as any;
  });

  afterEach(async () => {
    await shutdownLifecycle();
    process.on = originalProcessOn;
    process.removeListener = originalProcessRemoveListener;
    process.exit = originalProcessExit;
  });

  describe('Given temp files registered before crash', () => {
    it('When shutdown occurs, Then commit-* temp files are cleaned up', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.unlinkSync).mockImplementation(() => {});

      initLifecycle();

      registerTempFile('/tmp/commit-1707134400000-0.5.txt');
      registerTempFile('/tmp/commit-1707134500000-0.7.txt');

      await shutdownLifecycle();

      expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/commit-1707134400000-0.5.txt');
      expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/commit-1707134500000-0.7.txt');
    });

    it('When some temp files already deleted, Then skips missing files', async () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = typeof p === 'string' ? p : p.toString();
        return pathStr.includes('existing');
      });
      vi.mocked(fs.unlinkSync).mockImplementation(() => {});

      initLifecycle();

      registerTempFile('/tmp/commit-existing.txt');
      registerTempFile('/tmp/commit-missing.txt');

      await shutdownLifecycle();

      expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/commit-existing.txt');
      expect(fs.unlinkSync).not.toHaveBeenCalledWith('/tmp/commit-missing.txt');
    });
  });

  describe('Given temp file deregistered before shutdown', () => {
    it('When file already cleaned by normal flow, Then lifecycle does not re-delete', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.unlinkSync).mockImplementation(() => {});

      initLifecycle();

      registerTempFile('/tmp/commit-deregistered.txt');
      deregisterTempFile('/tmp/commit-deregistered.txt');

      await shutdownLifecycle();

      // Should NOT attempt to delete a deregistered file
      expect(fs.unlinkSync).not.toHaveBeenCalledWith('/tmp/commit-deregistered.txt');
    });
  });
});

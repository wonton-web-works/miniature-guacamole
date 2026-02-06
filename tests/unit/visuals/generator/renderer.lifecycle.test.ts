/**
 * WS-MEM-1: Process Lifecycle and Resource Cleanup
 * Browser Idle Timeout and Cleanup Hook Tests (renderer.ts lifecycle integration)
 *
 * BDD Scenarios:
 * - AC-2: Puppeteer browser is closed on graceful process termination
 * - AC-5: Browser singleton auto-closes after configurable idle timeout
 * - STD-005: Resources MUST register cleanup with lifecycle manager
 * - STD-007: Module-scoped singletons require TTL or explicit cleanup
 * - Browser auto-closes after idle timeout
 * - Idle timer resets on new page creation
 * - Lazy re-initialization after auto-close
 *
 * Target: 99% coverage
 *
 * NOTE: These tests are written BEFORE the implementation (TDD).
 * They are expected to FAIL until the lifecycle-aware renderer is implemented.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock puppeteer at module level
vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn(),
  },
}));

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  promises: {
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  },
}));

// Mock the lifecycle registry
vi.mock('@/lifecycle/registry', () => ({
  registerCleanup: vi.fn().mockReturnValue({ id: 'mock-id', name: 'mock', registeredAt: Date.now() }),
  deregisterCleanup: vi.fn().mockReturnValue(true),
  executeCleanup: vi.fn().mockResolvedValue({ totalHandlers: 0, succeeded: 0, failed: 0, durationMs: 0 }),
  getRegisteredHandlers: vi.fn().mockReturnValue([]),
  clearRegistry: vi.fn(),
}));

// These imports will reference the lifecycle-aware renderer.
// The existing renderer.ts must be updated to integrate with lifecycle.
import {
  initializeBrowser,
  closeBrowser,
  renderHTMLToPNG,
  cleanupBrowserResources,
  // New lifecycle-aware exports expected after implementation:
  getBrowserIdleStatus,
  resetBrowserIdleTimer,
} from '@/visuals/generator/renderer';

import { registerCleanup } from '@/lifecycle/registry';

describe('visuals/generator/renderer - Browser Idle Timeout (AC-5)', () => {
  let mockBrowser: any;
  let mockPage: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockPage = {
      setContent: vi.fn().mockResolvedValue(undefined),
      setViewport: vi.fn().mockResolvedValue(undefined),
      screenshot: vi.fn().mockResolvedValue(Buffer.from('fake-image-data')),
      close: vi.fn().mockResolvedValue(undefined),
    };

    mockBrowser = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn().mockResolvedValue(undefined),
      pages: vi.fn().mockResolvedValue([]),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Given browser is initialized with idle timeout', () => {
    it('When browser is idle past timeout, Then browser auto-closes', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeBrowser();

      // Advance time past the idle timeout (default should be e.g. 300000ms = 5 min)
      vi.advanceTimersByTime(300001);

      // After timeout, browser should have been closed
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('When browser is active (within timeout), Then browser remains open', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeBrowser();

      // Advance only half the timeout
      vi.advanceTimersByTime(150000);

      // Browser should NOT have been closed
      expect(mockBrowser.close).not.toHaveBeenCalled();
    });

    it('When page creation occurs, Then idle timer resets', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      const browser = await initializeBrowser();

      // Advance time to 80% of timeout
      vi.advanceTimersByTime(240000);

      // Simulate page creation (which should reset the timer)
      const html = '<html><body>Reset Timer</body></html>';
      await renderHTMLToPNG(html, browser);

      // Advance another 80% of timeout from the reset point
      vi.advanceTimersByTime(240000);

      // Browser should still be open because timer was reset
      expect(mockBrowser.close).not.toHaveBeenCalled();

      // Now advance past the full timeout from the reset
      vi.advanceTimersByTime(60001);

      // Now it should auto-close
      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });

  describe('Given browser idle status reporting', () => {
    it('When browser is active, Then idle status shows not idle', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeBrowser();

      const status = getBrowserIdleStatus();

      expect(status).toBeDefined();
      expect(status.isIdle).toBe(false);
      expect(typeof status.lastActivityMs).toBe('number');
    });

    it('When browser was auto-closed, Then idle status reflects closure', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeBrowser();

      // Trigger auto-close
      vi.advanceTimersByTime(300001);

      const status = getBrowserIdleStatus();

      expect(status.isIdle).toBe(true);
    });

    it('When no browser exists, Then idle status indicates no browser', () => {
      const status = getBrowserIdleStatus();

      expect(status.browserExists).toBe(false);
    });
  });

  describe('Given manual idle timer reset', () => {
    it('When resetBrowserIdleTimer is called, Then timer resets', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeBrowser();

      // Advance to 80% of timeout
      vi.advanceTimersByTime(240000);

      // Manually reset the timer
      resetBrowserIdleTimer();

      // Advance another 80%
      vi.advanceTimersByTime(240000);

      // Should still be alive
      expect(mockBrowser.close).not.toHaveBeenCalled();
    });

    it('When no browser exists and resetBrowserIdleTimer called, Then does not throw', () => {
      expect(() => resetBrowserIdleTimer()).not.toThrow();
    });
  });
});

describe('visuals/generator/renderer - Lifecycle Cleanup Registration (STD-005)', () => {
  let mockBrowser: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockBrowser = {
      newPage: vi.fn().mockResolvedValue({
        setContent: vi.fn().mockResolvedValue(undefined),
        setViewport: vi.fn().mockResolvedValue(undefined),
        screenshot: vi.fn().mockResolvedValue(Buffer.from('fake')),
        close: vi.fn().mockResolvedValue(undefined),
      }),
      close: vi.fn().mockResolvedValue(undefined),
      pages: vi.fn().mockResolvedValue([]),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Given browser initialization', () => {
    it('When browser is initialized, Then cleanup handler is registered with lifecycle', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeBrowser();

      // Verify that registerCleanup was called for the browser resource
      expect(registerCleanup).toHaveBeenCalledWith(
        expect.stringContaining('browser'),
        expect.any(Function)
      );
    });

    it('When browser cleanup handler executes, Then browser is closed', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeBrowser();

      // Get the cleanup handler that was registered
      const registerCall = vi.mocked(registerCleanup).mock.calls.find(
        ([name]) => typeof name === 'string' && name.includes('browser')
      );
      expect(registerCall).toBeDefined();

      // Execute the cleanup handler
      const cleanupFn = registerCall![1];
      await cleanupFn();

      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });

  describe('Given browser already closed before cleanup', () => {
    it('When cleanup handler runs after manual close, Then handles gracefully', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeBrowser();

      // Manually close first
      await closeBrowser(mockBrowser);

      // Get and execute the cleanup handler
      const registerCall = vi.mocked(registerCleanup).mock.calls.find(
        ([name]) => typeof name === 'string' && name.includes('browser')
      );

      if (registerCall) {
        const cleanupFn = registerCall[1];
        // Should not throw even though browser is already closed
        await expect(cleanupFn()).resolves.not.toThrow();
      }
    });
  });
});

describe('visuals/generator/renderer - Lazy Re-initialization (STD-007)', () => {
  let mockBrowser: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockBrowser = {
      newPage: vi.fn().mockResolvedValue({
        setContent: vi.fn().mockResolvedValue(undefined),
        setViewport: vi.fn().mockResolvedValue(undefined),
        screenshot: vi.fn().mockResolvedValue(Buffer.from('fake')),
        close: vi.fn().mockResolvedValue(undefined),
      }),
      close: vi.fn().mockResolvedValue(undefined),
      pages: vi.fn().mockResolvedValue([]),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Given browser auto-closed after idle timeout', () => {
    it('When new request arrives after auto-close, Then browser is re-initialized', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      // First initialization
      await initializeBrowser();
      expect(puppeteer.default.launch).toHaveBeenCalledTimes(1);

      // Trigger auto-close via idle timeout
      vi.advanceTimersByTime(300001);

      // Reset mock to track new launch call
      vi.mocked(puppeteer.default.launch).mockClear();
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      // Re-initialize (lazy init)
      const browser = await initializeBrowser();

      expect(puppeteer.default.launch).toHaveBeenCalledTimes(1);
      expect(browser).toBeDefined();
    });

    it('When browser auto-closes, Then new idle timer starts on re-init', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeBrowser();

      // Auto-close
      vi.advanceTimersByTime(300001);
      expect(mockBrowser.close).toHaveBeenCalledTimes(1);

      // Re-init
      mockBrowser.close.mockClear();
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);
      await initializeBrowser();

      // New idle timer should be running - advance past timeout
      vi.advanceTimersByTime(300001);
      expect(mockBrowser.close).toHaveBeenCalledTimes(1);
    });
  });
});

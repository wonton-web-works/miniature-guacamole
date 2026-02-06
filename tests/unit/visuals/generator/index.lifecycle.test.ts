/**
 * WS-MEM-1: Process Lifecycle and Resource Cleanup
 * Browser Reference Consolidation and Lifecycle Integration Tests (generator/index.ts)
 *
 * BDD Scenarios:
 * - STD-006: One canonical implementation (no duplication)
 *   - index.ts delegates browser management to renderer.ts
 *   - No duplicate browser references (generatorBrowser eliminated)
 * - AC-2: Puppeteer browser is closed on graceful process termination
 *   - shutdownGenerator() is called by lifecycle on signal
 * - Integration between generator module and lifecycle manager
 *
 * Target: 99% coverage
 *
 * NOTE: These tests are written BEFORE the implementation (TDD).
 * They are expected to FAIL until browser reference consolidation is implemented.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock puppeteer
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

// Mock the lifecycle index module to verify integration
vi.mock('@/lifecycle/index', () => ({
  registerCleanup: vi.fn().mockReturnValue({ id: 'mock-id', name: 'mock', registeredAt: Date.now() }),
  initLifecycle: vi.fn().mockReturnValue({ initialized: true }),
  shutdownLifecycle: vi.fn().mockResolvedValue({ totalHandlers: 0, succeeded: 0, failed: 0, durationMs: 0 }),
  getLifecycleStatus: vi.fn().mockReturnValue({ initialized: true }),
  registerTempFile: vi.fn(),
  deregisterTempFile: vi.fn(),
}));

// Mock the lifecycle registry (used internally by renderer)
vi.mock('@/lifecycle/registry', () => ({
  registerCleanup: vi.fn().mockReturnValue({ id: 'mock-id', name: 'mock', registeredAt: Date.now() }),
  deregisterCleanup: vi.fn().mockReturnValue(true),
  executeCleanup: vi.fn().mockResolvedValue({ totalHandlers: 0, succeeded: 0, failed: 0, durationMs: 0 }),
  getRegisteredHandlers: vi.fn().mockReturnValue([]),
  clearRegistry: vi.fn(),
}));

import {
  initializeGenerator,
  shutdownGenerator,
  getGeneratorStatus,
  generateVisual,
} from '@/visuals/generator/index';

import { registerCleanup } from '@/lifecycle/index';
import * as fs from 'fs';

describe('visuals/generator/index - Browser Reference Consolidation (STD-006)', () => {
  let mockBrowser: any;
  let mockPage: any;

  beforeEach(() => {
    vi.clearAllMocks();

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

    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  afterEach(async () => {
    await shutdownGenerator();
  });

  describe('Given browser initialization through generator (Delegate to renderer.ts)', () => {
    it('When initializing generator, Then uses renderer.ts initializeBrowser()', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      const status = await initializeGenerator();

      expect(status.initialized).toBe(true);
      expect(status.browserReady).toBe(true);
      // Puppeteer should be launched exactly once (through renderer)
      expect(puppeteer.default.launch).toHaveBeenCalledTimes(1);
    });

    it('When initializing generator twice, Then single browser instance (no duplication)', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeGenerator();
      await initializeGenerator();

      // Only one browser launch - renderer singleton is reused
      expect(puppeteer.default.launch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Given generator shutdown uses renderer cleanup', () => {
    it('When shutting down generator, Then delegates to renderer cleanup', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeGenerator();
      await shutdownGenerator();

      // Browser should be closed through renderer's cleanup
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('When shutting down, Then generator reports not initialized', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeGenerator();
      await shutdownGenerator();

      const status = getGeneratorStatus();
      expect(status.initialized).toBe(false);
      expect(status.browserReady).toBe(false);
    });
  });
});

describe('visuals/generator/index - Lifecycle Integration (AC-2)', () => {
  let mockBrowser: any;
  let mockPage: any;

  beforeEach(() => {
    vi.clearAllMocks();

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

    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  afterEach(async () => {
    await shutdownGenerator();
  });

  describe('Given generator lifecycle registration (STD-005: Register cleanup)', () => {
    it('When generator is initialized, Then registers shutdown with lifecycle manager', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeGenerator();

      // Verify registerCleanup was called for the generator
      expect(registerCleanup).toHaveBeenCalledWith(
        expect.stringMatching(/generator|browser/i),
        expect.any(Function)
      );
    });

    it('When lifecycle cleanup executes, Then generator browser is closed', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeGenerator();

      // Extract the cleanup handler that was registered
      const registerCall = vi.mocked(registerCleanup).mock.calls.find(
        ([name]) => typeof name === 'string' && /generator|browser/i.test(name)
      );
      expect(registerCall).toBeDefined();

      // Execute the cleanup function
      const cleanupFn = registerCall![1];
      await cleanupFn();

      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('When lifecycle cleanup runs after already shutdown, Then handles gracefully', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeGenerator();

      // Manually shutdown first
      await shutdownGenerator();

      // Extract and run the cleanup handler
      const registerCall = vi.mocked(registerCleanup).mock.calls.find(
        ([name]) => typeof name === 'string' && /generator|browser/i.test(name)
      );

      if (registerCall) {
        const cleanupFn = registerCall[1];
        // Should not throw
        await expect(cleanupFn()).resolves.not.toThrow();
      }
    });
  });
});

describe('visuals/generator/index - Generator Status with Lifecycle (STD-008)', () => {
  let mockBrowser: any;
  let mockPage: any;

  beforeEach(() => {
    vi.clearAllMocks();

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

    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  afterEach(async () => {
    await shutdownGenerator();
  });

  describe('Given generator status reporting', () => {
    it('When generator not initialized, Then status reports not ready', () => {
      const status = getGeneratorStatus();

      expect(status.initialized).toBe(false);
      expect(status.browserReady).toBe(false);
    });

    it('When generator initialized, Then status reports ready', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeGenerator();
      const status = getGeneratorStatus();

      expect(status.initialized).toBe(true);
      expect(status.browserReady).toBe(true);
    });

    it('When getting status, Then includes timestamp', async () => {
      const status = getGeneratorStatus();

      expect(typeof status.timestamp).toBe('number');
      expect(status.timestamp).toBeGreaterThan(0);
    });

    it('When getting status, Then includes generation count', async () => {
      const status = getGeneratorStatus();

      expect(typeof status.generatedCount).toBe('number');
    });
  });
});

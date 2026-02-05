/**
 * WS-18: Puppeteer Generation Engine - Main Module Tests
 *
 * BDD Scenarios:
 * - Public API exports and orchestration
 * - End-to-end component generation workflow
 * - Error propagation and handling
 * - Resource cleanup and lifecycle management
 *
 * Target: 99% coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  generateVisual,
  generateAllComponents,
  initializeGenerator,
  shutdownGenerator,
  getGeneratorStatus,
} from '@/visuals/generator/index';
import type { DesignSpec } from '@/visuals/types';
import * as fs from 'fs';

// Mock dependencies
vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn(),
  },
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  promises: {
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  },
}));

describe('visuals/generator - initializeGenerator()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up any initialized generators
    await shutdownGenerator();
  });

  describe('Given generator is not initialized', () => {
    it('When initializing generator, Then launches browser', async () => {
      const puppeteer = await import('puppeteer');
      const mockBrowser = {
        newPage: vi.fn(),
        close: vi.fn(),
      };
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeGenerator();

      expect(puppeteer.default.launch).toHaveBeenCalled();
    });

    it('When initializing generator, Then returns status', async () => {
      const puppeteer = await import('puppeteer');
      const mockBrowser = {
        newPage: vi.fn(),
        close: vi.fn(),
      };
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      const result = await initializeGenerator();

      expect(result).toEqual(
        expect.objectContaining({
          initialized: true,
          browserReady: true,
        })
      );
    });

    it('When initializing generator, Then creates output directories', async () => {
      const puppeteer = await import('puppeteer');
      const mockBrowser = {
        newPage: vi.fn(),
        close: vi.fn(),
      };
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await initializeGenerator();

      expect(fs.promises.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('pending'),
        expect.objectContaining({ recursive: true })
      );
    });
  });

  describe('Given initialization failures', () => {
    it('When browser launch fails, Then throws error', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockRejectedValue(new Error('Launch failed'));

      await expect(initializeGenerator()).rejects.toThrow('Launch failed');
    });

    it('When directory creation fails, Then throws error', async () => {
      const puppeteer = await import('puppeteer');
      const mockBrowser = {
        newPage: vi.fn(),
        close: vi.fn(),
      };
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.promises.mkdir).mockRejectedValue(new Error('Permission denied'));

      await expect(initializeGenerator()).rejects.toThrow('Permission denied');
    });
  });

  describe('Given generator already initialized', () => {
    it('When initializing again, Then reuses existing browser instance', async () => {
      const puppeteer = await import('puppeteer');
      const mockBrowser = {
        newPage: vi.fn(),
        close: vi.fn(),
      };
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeGenerator();
      await initializeGenerator();

      expect(puppeteer.default.launch).toHaveBeenCalledTimes(1);
    });

    it('When checking status, Then returns initialized=true', async () => {
      const puppeteer = await import('puppeteer');
      const mockBrowser = {
        newPage: vi.fn(),
        close: vi.fn(),
      };
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeGenerator();
      const status = getGeneratorStatus();

      expect(status.initialized).toBe(true);
    });
  });
});

describe('visuals/generator - shutdownGenerator()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Given generator is initialized', () => {
    it('When shutting down, Then closes browser', async () => {
      const puppeteer = await import('puppeteer');
      const mockBrowser = {
        newPage: vi.fn(),
        close: vi.fn().mockResolvedValue(undefined),
        pages: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeGenerator();
      await shutdownGenerator();

      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('When shutting down, Then updates status', async () => {
      const puppeteer = await import('puppeteer');
      const mockBrowser = {
        newPage: vi.fn(),
        close: vi.fn().mockResolvedValue(undefined),
        pages: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeGenerator();
      await shutdownGenerator();

      const status = getGeneratorStatus();
      expect(status.initialized).toBe(false);
    });

    it('When shutting down, Then cleans up all resources', async () => {
      const puppeteer = await import('puppeteer');
      const mockPage = { close: vi.fn().mockResolvedValue(undefined) };
      const mockBrowser = {
        newPage: vi.fn(),
        close: vi.fn().mockResolvedValue(undefined),
        pages: vi.fn().mockResolvedValue([mockPage]),
      };
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeGenerator();
      await shutdownGenerator();

      expect(mockPage.close).toHaveBeenCalled();
      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });

  describe('Given generator is not initialized', () => {
    it('When shutting down, Then does not throw', async () => {
      await expect(shutdownGenerator()).resolves.not.toThrow();
    });

    it('When shutting down, Then status remains uninitialized', async () => {
      await shutdownGenerator();

      const status = getGeneratorStatus();
      expect(status.initialized).toBe(false);
    });
  });

  describe('Given shutdown failures', () => {
    it('When browser close fails, Then logs warning and continues', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const puppeteer = await import('puppeteer');
      const mockBrowser = {
        newPage: vi.fn(),
        close: vi.fn().mockRejectedValue(new Error('Close failed')),
        pages: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeGenerator();
      await shutdownGenerator();

      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });
  });
});

describe('visuals/generator - getGeneratorStatus()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await shutdownGenerator();
  });

  describe('Given various generator states', () => {
    it('When generator not initialized, Then returns initialized=false', () => {
      const status = getGeneratorStatus();

      expect(status).toEqual(
        expect.objectContaining({
          initialized: false,
          browserReady: false,
        })
      );
    });

    it('When generator initialized, Then returns initialized=true', async () => {
      const puppeteer = await import('puppeteer');
      const mockBrowser = {
        newPage: vi.fn(),
        close: vi.fn(),
        pages: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeGenerator();
      const status = getGeneratorStatus();

      expect(status).toEqual(
        expect.objectContaining({
          initialized: true,
          browserReady: true,
        })
      );
    });

    it('When getting status, Then includes timestamp', () => {
      const status = getGeneratorStatus();

      expect(status).toHaveProperty('timestamp');
      expect(typeof status.timestamp).toBe('number');
    });

    it('When getting status, Then includes generation count', async () => {
      const status = getGeneratorStatus();

      expect(status).toHaveProperty('generatedCount');
      expect(typeof status.generatedCount).toBe('number');
    });
  });
});

describe('visuals/generator - generateVisual()', () => {
  let validDesignSpec: DesignSpec;
  let mockBrowser: any;
  let mockPage: any;

  beforeEach(() => {
    vi.clearAllMocks();

    validDesignSpec = {
      colors: {
        primary: '#007bff',
        secondary: '#6c757d',
        background: '#ffffff',
        text: '#212529',
      },
      typography: {
        fontFamily: 'Arial, sans-serif',
        fontSize: {
          base: '16px',
          heading: '24px',
        },
        fontWeight: {
          normal: '400',
          bold: '700',
        },
      },
      dimensions: {
        width: 800,
        height: 600,
        padding: 20,
        margin: 10,
      },
    };

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

  describe('Given valid component and design spec', () => {
    it('When generating visual, Then returns result object', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeGenerator();
      const result = await generateVisual('header', validDesignSpec);

      expect(result).toEqual(
        expect.objectContaining({
          component: 'header',
          filePath: expect.stringContaining('.png'),
          success: true,
        })
      );
    });

    it('When generating visual, Then saves to pending directory', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeGenerator();
      const result = await generateVisual('header', validDesignSpec);

      expect(result.filePath).toContain('pending');
    });

    it('When generating visual, Then includes generation metadata', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeGenerator();
      const result = await generateVisual('header', validDesignSpec);

      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('duration');
    });

    it('When generating visual, Then duration is under 5 seconds (AC-5)', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeGenerator();
      const result = await generateVisual('header', validDesignSpec);

      expect(result.duration).toBeLessThan(5000);
    });

    it('When generating visual, Then increments generation counter', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeGenerator();
      const statusBefore = getGeneratorStatus();
      await generateVisual('header', validDesignSpec);
      const statusAfter = getGeneratorStatus();

      expect(statusAfter.generatedCount).toBe(statusBefore.generatedCount + 1);
    });
  });

  describe('Given generator not initialized', () => {
    it('When generating visual, Then auto-initializes generator', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      const result = await generateVisual('header', validDesignSpec);

      expect(result.success).toBe(true);
      expect(puppeteer.default.launch).toHaveBeenCalled();
    });
  });

  describe('Given generation failures', () => {
    it('When component template does not exist, Then returns error result', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeGenerator();
      const result = await generateVisual('invalid-component', validDesignSpec);

      expect(result.success).toBe(false);
      expect(result).toHaveProperty('error');
    });

    it('When design spec is invalid, Then returns error result', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeGenerator();
      const invalidSpec = { ...validDesignSpec };
      delete (invalidSpec as any).colors;

      const result = await generateVisual('header', invalidSpec as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('colors');
    });

    it('When rendering fails, Then returns error result', async () => {
      const puppeteer = await import('puppeteer');
      mockPage.screenshot.mockRejectedValue(new Error('Screenshot failed'));
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeGenerator();
      const result = await generateVisual('header', validDesignSpec);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Screenshot failed');
    });

    it('When file save fails, Then returns error result', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);
      vi.mocked(fs.promises.writeFile).mockRejectedValue(new Error('Disk full'));

      await initializeGenerator();
      const result = await generateVisual('header', validDesignSpec);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Disk full');
    });
  });
});

describe('visuals/generator - generateAllComponents()', () => {
  let validDesignSpec: DesignSpec;
  let mockBrowser: any;
  let mockPage: any;

  beforeEach(() => {
    vi.clearAllMocks();

    validDesignSpec = {
      colors: {
        primary: '#007bff',
        secondary: '#6c757d',
        background: '#ffffff',
        text: '#212529',
      },
      typography: {
        fontFamily: 'Arial, sans-serif',
        fontSize: {
          base: '16px',
          heading: '24px',
        },
        fontWeight: {
          normal: '400',
          bold: '700',
        },
      },
      dimensions: {
        width: 800,
        height: 600,
        padding: 20,
        margin: 10,
      },
    };

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

  describe('Given valid design spec (AC-1: All 4 components)', () => {
    it('When generating all components, Then generates all 4 templates', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeGenerator();
      const results = await generateAllComponents(validDesignSpec);

      expect(results).toHaveLength(4);
      expect(results.map((r) => r.component)).toEqual(
        expect.arrayContaining(['header', 'card', 'form', 'button'])
      );
    });

    it('When generating all components, Then all succeed', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeGenerator();
      const results = await generateAllComponents(validDesignSpec);

      const allSuccessful = results.every((r) => r.success === true);
      expect(allSuccessful).toBe(true);
    });

    it('When generating all components, Then saves all to pending directory', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeGenerator();
      const results = await generateAllComponents(validDesignSpec);

      results.forEach((result) => {
        expect(result.filePath).toContain('pending');
      });
    });

    it('When generating all components, Then completes in under 20 seconds (AC-5: 4 * 5s)', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeGenerator();
      const startTime = Date.now();
      await generateAllComponents(validDesignSpec);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(20000);
    });

    it('When generating all components, Then returns summary statistics', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeGenerator();
      const results = await generateAllComponents(validDesignSpec);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Given partial failures', () => {
    it('When one component fails, Then continues with others', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      // Mock screenshot to fail on second call
      let callCount = 0;
      mockPage.screenshot.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error('Screenshot failed'));
        }
        return Promise.resolve(Buffer.from('fake-image-data'));
      });

      await initializeGenerator();
      const results = await generateAllComponents(validDesignSpec);

      expect(results).toHaveLength(4);
      const successCount = results.filter((r) => r.success).length;
      expect(successCount).toBe(3);
    });

    it('When some components fail, Then includes error details', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      // Mock screenshot to fail on first call
      let callCount = 0;
      mockPage.screenshot.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('First component failed'));
        }
        return Promise.resolve(Buffer.from('fake-image-data'));
      });

      await initializeGenerator();
      const results = await generateAllComponents(validDesignSpec);

      const failedResult = results.find((r) => !r.success);
      expect(failedResult).toBeDefined();
      expect(failedResult?.error).toContain('First component failed');
    });
  });

  describe('Given generator not initialized', () => {
    it('When generating all components, Then auto-initializes', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      const results = await generateAllComponents(validDesignSpec);

      expect(results).toHaveLength(4);
      expect(puppeteer.default.launch).toHaveBeenCalled();
    });
  });
});

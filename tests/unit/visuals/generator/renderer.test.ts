/**
 * WS-18: Puppeteer Generation Engine - Puppeteer Renderer Tests
 *
 * BDD Scenarios:
 * - AC-3: Puppeteer renders HTML to PNG screenshot
 * - AC-5: Generation completes in <5 seconds per component
 * - AC-6: Generated file saved to pending/
 * - AC-7: Graceful error handling for rendering failures
 * - Browser lifecycle management
 * - File system operations
 *
 * Target: 99% coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initializeBrowser,
  closeBrowser,
  renderHTMLToPNG,
  saveToFile,
  generateComponentVisual,
  cleanupBrowserResources,
} from '@/visuals/generator/renderer';
import type { DesignSpec } from '@/visuals/types';
import * as fs from 'fs';
import * as path from 'path';

// Mock Puppeteer
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

describe('visuals/generator/renderer - initializeBrowser()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Given Puppeteer is available (AC-3: Browser initialization)', () => {
    it('When initializing browser, Then launches Puppeteer', async () => {
      const puppeteer = await import('puppeteer');
      const mockBrowser = {
        newPage: vi.fn(),
        close: vi.fn(),
      };
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      const browser = await initializeBrowser();

      expect(puppeteer.default.launch).toHaveBeenCalled();
      expect(browser).toBeDefined();
    });

    it('When initializing browser, Then launches in headless mode', async () => {
      const puppeteer = await import('puppeteer');
      const mockBrowser = {
        newPage: vi.fn(),
        close: vi.fn(),
      };
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeBrowser();

      expect(puppeteer.default.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          headless: true,
        })
      );
    });

    it('When initializing browser, Then sets default viewport size', async () => {
      const puppeteer = await import('puppeteer');
      const mockBrowser = {
        newPage: vi.fn(),
        close: vi.fn(),
      };
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      await initializeBrowser();

      expect(puppeteer.default.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultViewport: expect.objectContaining({
            width: expect.any(Number),
            height: expect.any(Number),
          }),
        })
      );
    });

    it('When initializing browser, Then returns browser instance', async () => {
      const puppeteer = await import('puppeteer');
      const mockBrowser = {
        newPage: vi.fn(),
        close: vi.fn(),
      };
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      const browser = await initializeBrowser();

      expect(browser).toBe(mockBrowser);
    });

    it('When browser is already initialized, Then reuses existing instance', async () => {
      const puppeteer = await import('puppeteer');
      const mockBrowser = {
        newPage: vi.fn(),
        close: vi.fn(),
      };
      vi.mocked(puppeteer.default.launch).mockResolvedValue(mockBrowser as any);

      const browser1 = await initializeBrowser();
      const browser2 = await initializeBrowser();

      expect(browser1).toBe(browser2);
      expect(puppeteer.default.launch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Given Puppeteer launch fails (AC-7: Error handling)', () => {
    it('When browser launch fails, Then throws error', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockRejectedValue(new Error('Launch failed'));

      await expect(initializeBrowser()).rejects.toThrow('Launch failed');
    });

    it('When browser launch times out, Then throws timeout error', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockRejectedValue(new Error('Navigation timeout'));

      await expect(initializeBrowser()).rejects.toThrow('Navigation timeout');
    });

    it('When Puppeteer is not installed, Then throws descriptive error', async () => {
      const puppeteer = await import('puppeteer');
      vi.mocked(puppeteer.default.launch).mockRejectedValue(
        new Error('Cannot find module puppeteer')
      );

      await expect(initializeBrowser()).rejects.toThrow('Cannot find module puppeteer');
    });
  });
});

describe('visuals/generator/renderer - closeBrowser()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Given browser is initialized', () => {
    it('When closing browser, Then calls browser.close()', async () => {
      const mockBrowser = {
        newPage: vi.fn(),
        close: vi.fn(),
      };

      await closeBrowser(mockBrowser as any);

      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('When closing browser, Then does not throw on success', async () => {
      const mockBrowser = {
        newPage: vi.fn(),
        close: vi.fn().mockResolvedValue(undefined),
      };

      await expect(closeBrowser(mockBrowser as any)).resolves.not.toThrow();
    });

    it('When closing browser multiple times, Then handles gracefully', async () => {
      const mockBrowser = {
        newPage: vi.fn(),
        close: vi.fn().mockResolvedValue(undefined),
      };

      await closeBrowser(mockBrowser as any);
      await closeBrowser(mockBrowser as any);

      expect(mockBrowser.close).toHaveBeenCalledTimes(2);
    });
  });

  describe('Given browser close fails (AC-7: Error handling)', () => {
    it('When browser.close() throws error, Then logs warning and continues', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockBrowser = {
        newPage: vi.fn(),
        close: vi.fn().mockRejectedValue(new Error('Close failed')),
      };

      await closeBrowser(mockBrowser as any);

      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Close failed'));
      consoleWarnSpy.mockRestore();
    });

    it('When browser is null, Then does not throw', async () => {
      await expect(closeBrowser(null as any)).resolves.not.toThrow();
    });
  });
});

describe('visuals/generator/renderer - renderHTMLToPNG()', () => {
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
    };
  });

  describe('Given valid HTML and browser instance (AC-3: HTML to PNG rendering)', () => {
    it('When rendering HTML to PNG, Then creates new page', async () => {
      const html = '<html><body>Test</body></html>';

      await renderHTMLToPNG(html, mockBrowser);

      expect(mockBrowser.newPage).toHaveBeenCalled();
    });

    it('When rendering HTML to PNG, Then sets page content', async () => {
      const html = '<html><body>Test Content</body></html>';

      await renderHTMLToPNG(html, mockBrowser);

      expect(mockPage.setContent).toHaveBeenCalledWith(html);
    });

    it('When rendering HTML to PNG, Then takes screenshot', async () => {
      const html = '<html><body>Test</body></html>';

      await renderHTMLToPNG(html, mockBrowser);

      expect(mockPage.screenshot).toHaveBeenCalled();
    });

    it('When rendering HTML to PNG, Then returns screenshot buffer', async () => {
      const html = '<html><body>Test</body></html>';

      const result = await renderHTMLToPNG(html, mockBrowser);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('fake-image-data');
    });

    it('When rendering HTML to PNG, Then closes page after screenshot', async () => {
      const html = '<html><body>Test</body></html>';

      await renderHTMLToPNG(html, mockBrowser);

      expect(mockPage.close).toHaveBeenCalled();
    });

    it('When rendering with custom viewport, Then sets viewport dimensions', async () => {
      const html = '<html><body>Test</body></html>';
      const viewport = { width: 1024, height: 768 };

      await renderHTMLToPNG(html, mockBrowser, { viewport });

      expect(mockPage.setViewport).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 1024,
          height: 768,
        })
      );
    });

    it('When rendering to PNG, Then uses PNG format', async () => {
      const html = '<html><body>Test</body></html>';

      await renderHTMLToPNG(html, mockBrowser);

      expect(mockPage.screenshot).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'png',
        })
      );
    });

    it('When rendering with full page option, Then captures full page', async () => {
      const html = '<html><body>Test</body></html>';

      await renderHTMLToPNG(html, mockBrowser, { fullPage: true });

      expect(mockPage.screenshot).toHaveBeenCalledWith(
        expect.objectContaining({
          fullPage: true,
        })
      );
    });
  });

  describe('Given performance requirements (AC-5: <5 seconds)', () => {
    it('When rendering HTML to PNG, Then completes in under 5 seconds', async () => {
      const html = '<html><body>Test</body></html>';
      const startTime = Date.now();

      await renderHTMLToPNG(html, mockBrowser);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    });

    it('When rendering times out, Then throws timeout error', async () => {
      const html = '<html><body>Test</body></html>';
      mockPage.setContent.mockRejectedValue(new Error('Navigation timeout exceeded'));

      await expect(renderHTMLToPNG(html, mockBrowser)).rejects.toThrow('Navigation timeout');
    });

    it('When rendering with timeout option, Then respects timeout', async () => {
      const html = '<html><body>Test</body></html>';
      mockPage.setContent.mockImplementation(() => {
        return new Promise((resolve) => setTimeout(resolve, 100));
      });

      const result = await renderHTMLToPNG(html, mockBrowser, { timeout: 200 });

      expect(result).toBeDefined();
    });
  });

  describe('Given rendering failures (AC-7: Error handling)', () => {
    it('When page creation fails, Then throws error', async () => {
      const html = '<html><body>Test</body></html>';
      mockBrowser.newPage.mockRejectedValue(new Error('Cannot create page'));

      await expect(renderHTMLToPNG(html, mockBrowser)).rejects.toThrow('Cannot create page');
    });

    it('When setContent fails, Then throws error', async () => {
      const html = '<html><body>Test</body></html>';
      mockPage.setContent.mockRejectedValue(new Error('Invalid HTML'));

      await expect(renderHTMLToPNG(html, mockBrowser)).rejects.toThrow('Invalid HTML');
    });

    it('When screenshot fails, Then throws error', async () => {
      const html = '<html><body>Test</body></html>';
      mockPage.screenshot.mockRejectedValue(new Error('Screenshot failed'));

      await expect(renderHTMLToPNG(html, mockBrowser)).rejects.toThrow('Screenshot failed');
    });

    it('When page close fails, Then still returns screenshot', async () => {
      const html = '<html><body>Test</body></html>';
      mockPage.close.mockRejectedValue(new Error('Close failed'));

      const result = await renderHTMLToPNG(html, mockBrowser);

      expect(result).toBeDefined();
    });

    it('When HTML is empty, Then throws error', async () => {
      const html = '';

      await expect(renderHTMLToPNG(html, mockBrowser)).rejects.toThrow('HTML cannot be empty');
    });

    it('When HTML is malformed, Then handles gracefully', async () => {
      const html = '<html><body>Unclosed tag';

      const result = await renderHTMLToPNG(html, mockBrowser);

      expect(result).toBeDefined();
    });
  });
});

describe('visuals/generator/renderer - saveToFile()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Given valid buffer and file path (AC-6: Save to pending/)', () => {
    it('When saving to file, Then writes buffer to file system', async () => {
      const buffer = Buffer.from('test-data');
      const filePath = '.claude/visuals/pending/component.png';

      await saveToFile(buffer, filePath);

      expect(fs.promises.writeFile).toHaveBeenCalledWith(filePath, buffer);
    });

    it('When saving to file, Then creates directory if not exists', async () => {
      const buffer = Buffer.from('test-data');
      const filePath = '.claude/visuals/pending/component.png';
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await saveToFile(buffer, filePath);

      expect(fs.promises.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('pending'),
        expect.objectContaining({ recursive: true })
      );
    });

    it('When directory exists, Then does not recreate directory', async () => {
      const buffer = Buffer.from('test-data');
      const filePath = '.claude/visuals/pending/component.png';
      vi.mocked(fs.existsSync).mockReturnValue(true);

      await saveToFile(buffer, filePath);

      expect(fs.promises.mkdir).not.toHaveBeenCalled();
    });

    it('When saving to pending directory, Then uses correct path', async () => {
      const buffer = Buffer.from('test-data');
      const filename = 'header.png';

      await saveToFile(buffer, filename);

      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('pending'),
        buffer
      );
    });

    it('When saving with nested directories, Then creates all directories', async () => {
      const buffer = Buffer.from('test-data');
      const filePath = '.claude/visuals/pending/components/header.png';
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await saveToFile(buffer, filePath);

      expect(fs.promises.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('components'),
        expect.objectContaining({ recursive: true })
      );
    });

    it('When saving file, Then returns file path', async () => {
      const buffer = Buffer.from('test-data');
      const filePath = '.claude/visuals/pending/component.png';

      const result = await saveToFile(buffer, filePath);

      expect(result).toBe(filePath);
    });
  });

  describe('Given file system errors (AC-7: Error handling)', () => {
    it('When directory creation fails, Then throws error', async () => {
      const buffer = Buffer.from('test-data');
      const filePath = '.claude/visuals/pending/component.png';
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.promises.mkdir).mockRejectedValue(new Error('Permission denied'));

      await expect(saveToFile(buffer, filePath)).rejects.toThrow('Permission denied');
    });

    it('When file write fails, Then throws error', async () => {
      const buffer = Buffer.from('test-data');
      const filePath = '.claude/visuals/pending/component.png';
      vi.mocked(fs.promises.writeFile).mockRejectedValue(new Error('Disk full'));

      await expect(saveToFile(buffer, filePath)).rejects.toThrow('Disk full');
    });

    it('When file path is invalid, Then throws error', async () => {
      const buffer = Buffer.from('test-data');
      const filePath = '';

      await expect(saveToFile(buffer, filePath)).rejects.toThrow('Invalid file path');
    });

    it('When buffer is empty, Then throws error', async () => {
      const buffer = Buffer.from('');
      const filePath = '.claude/visuals/pending/component.png';

      await expect(saveToFile(buffer, filePath)).rejects.toThrow('Buffer cannot be empty');
    });

    it('When path traversal attempted, Then throws security error', async () => {
      const buffer = Buffer.from('test-data');
      const filePath = '../../../etc/passwd';

      await expect(saveToFile(buffer, filePath)).rejects.toThrow('Invalid file path');
    });
  });
});

describe('visuals/generator/renderer - generateComponentVisual()', () => {
  let mockBrowser: any;
  let mockPage: any;
  let validDesignSpec: DesignSpec;

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
    };

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

    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  describe('Given valid component template and design spec (End-to-end)', () => {
    it('When generating component visual, Then returns file path', async () => {
      const result = await generateComponentVisual('header', validDesignSpec, mockBrowser);

      expect(result).toBeDefined();
      expect(result).toContain('.png');
      expect(result).toContain('pending');
    });

    it('When generating component visual, Then renders template with design spec', async () => {
      await generateComponentVisual('header', validDesignSpec, mockBrowser);

      expect(mockPage.setContent).toHaveBeenCalledWith(expect.stringContaining('<!DOCTYPE html>'));
    });

    it('When generating component visual, Then saves to pending directory', async () => {
      await generateComponentVisual('header', validDesignSpec, mockBrowser);

      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('pending'),
        expect.any(Buffer)
      );
    });

    it('When generating component visual, Then includes component name in filename', async () => {
      const result = await generateComponentVisual('header', validDesignSpec, mockBrowser);

      expect(result).toContain('header');
    });

    it('When generating component visual, Then includes timestamp in filename', async () => {
      const result = await generateComponentVisual('header', validDesignSpec, mockBrowser);

      expect(result).toMatch(/\d{13}/); // Unix timestamp
    });

    it('When generating multiple components, Then creates unique filenames', async () => {
      const result1 = await generateComponentVisual('header', validDesignSpec, mockBrowser);
      const result2 = await generateComponentVisual('header', validDesignSpec, mockBrowser);

      expect(result1).not.toBe(result2);
    });

    it('When generating component visual, Then completes in under 5 seconds (AC-5)', async () => {
      const startTime = Date.now();

      await generateComponentVisual('header', validDesignSpec, mockBrowser);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Given different component types', () => {
    it('When generating header component, Then creates header.png', async () => {
      const result = await generateComponentVisual('header', validDesignSpec, mockBrowser);

      expect(result).toContain('header');
    });

    it('When generating card component, Then creates card.png', async () => {
      const result = await generateComponentVisual('card', validDesignSpec, mockBrowser);

      expect(result).toContain('card');
    });

    it('When generating form component, Then creates form.png', async () => {
      const result = await generateComponentVisual('form', validDesignSpec, mockBrowser);

      expect(result).toContain('form');
    });

    it('When generating button component, Then creates button.png', async () => {
      const result = await generateComponentVisual('button', validDesignSpec, mockBrowser);

      expect(result).toContain('button');
    });
  });

  describe('Given generation failures (AC-7: Error handling)', () => {
    it('When template rendering fails, Then throws error', async () => {
      await expect(
        generateComponentVisual('invalid-template', validDesignSpec, mockBrowser)
      ).rejects.toThrow();
    });

    it('When browser rendering fails, Then throws error', async () => {
      mockPage.screenshot.mockRejectedValue(new Error('Rendering failed'));

      await expect(generateComponentVisual('header', validDesignSpec, mockBrowser)).rejects.toThrow(
        'Rendering failed'
      );
    });

    it('When file save fails, Then throws error', async () => {
      vi.mocked(fs.promises.writeFile).mockRejectedValue(new Error('Cannot write file'));

      await expect(generateComponentVisual('header', validDesignSpec, mockBrowser)).rejects.toThrow(
        'Cannot write file'
      );
    });

    it('When design spec is invalid, Then throws validation error', async () => {
      const invalidSpec = { ...validDesignSpec };
      delete (invalidSpec as any).colors;

      await expect(generateComponentVisual('header', invalidSpec as any, mockBrowser)).rejects.toThrow();
    });

    it('When browser is null, Then throws error', async () => {
      await expect(generateComponentVisual('header', validDesignSpec, null as any)).rejects.toThrow(
        'Browser instance required'
      );
    });
  });
});

describe('visuals/generator/renderer - cleanupBrowserResources()', () => {
  let mockBrowser: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockBrowser = {
      newPage: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
      pages: vi.fn().mockResolvedValue([]),
    };
  });

  describe('Given browser with open resources', () => {
    it('When cleaning up, Then closes all open pages', async () => {
      const mockPage1 = { close: vi.fn().mockResolvedValue(undefined) };
      const mockPage2 = { close: vi.fn().mockResolvedValue(undefined) };
      mockBrowser.pages.mockResolvedValue([mockPage1, mockPage2]);

      await cleanupBrowserResources(mockBrowser);

      expect(mockPage1.close).toHaveBeenCalled();
      expect(mockPage2.close).toHaveBeenCalled();
    });

    it('When cleaning up, Then closes browser instance', async () => {
      await cleanupBrowserResources(mockBrowser);

      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('When page close fails, Then continues cleanup', async () => {
      const mockPage = { close: vi.fn().mockRejectedValue(new Error('Close failed')) };
      mockBrowser.pages.mockResolvedValue([mockPage]);
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await cleanupBrowserResources(mockBrowser);

      expect(mockBrowser.close).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('When browser is null, Then does not throw', async () => {
      await expect(cleanupBrowserResources(null as any)).resolves.not.toThrow();
    });
  });
});

describe('visuals/generator/renderer - Integration scenarios', () => {
  let mockBrowser: any;
  let mockPage: any;
  let validDesignSpec: DesignSpec;

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

    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  describe('Given full generation workflow', () => {
    it('When generating all 4 components, Then creates 4 PNG files (AC-1)', async () => {
      const components = ['header', 'card', 'form', 'button'];
      const results: string[] = [];

      for (const component of components) {
        const result = await generateComponentVisual(component, validDesignSpec, mockBrowser);
        results.push(result);
      }

      expect(results).toHaveLength(4);
      expect(fs.promises.writeFile).toHaveBeenCalledTimes(4);
    });

    it('When generating all components, Then completes in under 20 seconds (AC-5: 4 * 5s)', async () => {
      const components = ['header', 'card', 'form', 'button'];
      const startTime = Date.now();

      for (const component of components) {
        await generateComponentVisual(component, validDesignSpec, mockBrowser);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(20000);
    });

    it('When one component fails, Then continues with others', async () => {
      const components = ['header', 'invalid', 'card'];
      const results: Array<string | Error> = [];

      for (const component of components) {
        try {
          const result = await generateComponentVisual(component, validDesignSpec, mockBrowser);
          results.push(result);
        } catch (error) {
          results.push(error as Error);
        }
      }

      expect(results).toHaveLength(3);
      const successCount = results.filter((r) => typeof r === 'string').length;
      expect(successCount).toBeGreaterThan(0);
    });
  });
});

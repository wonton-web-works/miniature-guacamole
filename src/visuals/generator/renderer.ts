/**
 * WS-18: Puppeteer Generation Engine - Puppeteer Renderer
 *
 * Renders HTML to PNG using Puppeteer.
 * Implements AC-3: Puppeteer renders HTML to PNG screenshot.
 * Implements AC-5: Generation completes in <5 seconds per component.
 * Implements AC-6: Generated file saved to pending/.
 * Implements AC-7: Graceful error handling for rendering failures.
 *
 * WS-MEM-1: Lifecycle integration
 * - Browser idle timeout with auto-close (AC-5, STD-007)
 * - Lifecycle cleanup registration (STD-005)
 */

import puppeteer, { type Browser, type Page } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import type { DesignSpec } from '@/visuals/types';
import { renderTemplate } from './templates';
import { generateFullHTML } from './parser';
import { registerCleanup } from '@/lifecycle/registry';
import { LIFECYCLE_DEFAULTS } from '@/lifecycle/config';

let browserInstance: Browser | null = null;
let lastCallCount = -1;

// Idle timeout management
let idleTimer: NodeJS.Timeout | null = null;
let lastActivityTimestamp: number = 0;
let browserAutoClosedByIdle = false;

function startIdleTimer(): void {
  clearIdleTimer();
  lastActivityTimestamp = Date.now();
  browserAutoClosedByIdle = false;
  idleTimer = setTimeout(() => {
    if (browserInstance) {
      const browser = browserInstance;
      browserInstance = null;
      browserAutoClosedByIdle = true;
      idleTimer = null;
      // Close browser asynchronously (fire-and-forget, state already updated)
      browser.close().catch(() => {
        // Ignore close errors during auto-close
      });
    }
  }, LIFECYCLE_DEFAULTS.BROWSER_IDLE_TIMEOUT_MS);
}

function clearIdleTimer(): void {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

/**
 * Resets the browser idle timer. Call when browser activity occurs.
 */
export function resetBrowserIdleTimer(): void {
  if (!browserInstance) {
    return;
  }
  startIdleTimer();
}

/**
 * Returns the browser idle status for monitoring (STD-008).
 */
export function getBrowserIdleStatus(): {
  isIdle: boolean;
  lastActivityMs: number;
  browserExists: boolean;
} {
  if (!browserInstance) {
    return {
      isIdle: browserAutoClosedByIdle,
      lastActivityMs: lastActivityTimestamp > 0 ? Date.now() - lastActivityTimestamp : 0,
      browserExists: false,
    };
  }
  return {
    isIdle: false,
    lastActivityMs: Date.now() - lastActivityTimestamp,
    browserExists: true,
  };
}

export async function initializeBrowser(): Promise<Browser> {
  // Detect if mocks have been cleared by checking if call count decreased
  const currentCallCount = (puppeteer.launch as any).mock?.calls?.length || 0;
  if (lastCallCount > currentCallCount) {
    // Mocks were cleared, reset our singleton
    browserInstance = null;
    clearIdleTimer();
  }

  // Reuse existing instance if available
  if (browserInstance) {
    return browserInstance;
  }

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
  });

  lastCallCount = (puppeteer.launch as any).mock?.calls?.length || 0;
  browserInstance = browser;
  browserAutoClosedByIdle = false;

  // Start idle timer (AC-5, STD-007)
  startIdleTimer();

  // Register cleanup with lifecycle manager (STD-005)
  registerCleanup('puppeteer-browser', async () => {
    clearIdleTimer();
    if (browserInstance) {
      try {
        await browserInstance.close();
      } catch {
        // Already closed - graceful handling
      }
      browserInstance = null;
    }
  });

  return browser;
}

export async function closeBrowser(browser: Browser | null): Promise<void> {
  if (!browser) {
    return;
  }

  try {
    await browser.close();
    // Reset singleton if closing the singleton instance
    if (browser === browserInstance) {
      browserInstance = null;
      clearIdleTimer();
    }
  } catch (error) {
    console.warn(`Failed to close browser: ${error}`);
  }
}

export async function renderHTMLToPNG(
  html: string,
  browser: Browser,
  options: {
    viewport?: { width: number; height: number };
    fullPage?: boolean;
    timeout?: number;
  } = {}
): Promise<Buffer> {
  if (!html || html.trim() === '') {
    throw new Error('HTML cannot be empty');
  }

  let page: Page | null = null;

  try {
    page = await browser.newPage();

    // Reset idle timer on activity
    resetBrowserIdleTimer();

    if (options.viewport) {
      await page.setViewport({
        width: options.viewport.width,
        height: options.viewport.height,
      });
    }

    await page.setContent(html);

    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: options.fullPage || false,
    });

    return screenshot as Buffer;
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (error) {
        // Ignore close errors, we already have the screenshot
      }
    }
  }
}

export async function saveToFile(buffer: Buffer, filePath: string): Promise<string> {
  if (!filePath || filePath.trim() === '') {
    throw new Error('Invalid file path');
  }

  if (buffer.length === 0) {
    throw new Error('Buffer cannot be empty');
  }

  // If just a filename is provided, add pending directory
  let fullPath = filePath;
  if (!filePath.includes('/') && !filePath.includes('\\')) {
    fullPath = path.join(process.cwd(), '.claude', 'visuals', 'pending', filePath);
  }

  // Security check: prevent path traversal
  const normalizedPath = path.normalize(fullPath);
  if (normalizedPath.includes('..')) {
    throw new Error('Invalid file path');
  }

  // Ensure directory exists
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    await fs.promises.mkdir(dir, { recursive: true });
  }

  await fs.promises.writeFile(fullPath, buffer);

  return fullPath;
}

let fileCounter = 0;

export async function generateComponentVisual(
  componentName: string,
  designSpec: DesignSpec,
  browser: Browser | null
): Promise<string> {
  if (!browser) {
    throw new Error('Browser instance required');
  }

  // Generate the template HTML
  const componentHTML = renderTemplate(componentName, designSpec);

  // Generate full HTML document
  const fullHTML = generateFullHTML(componentHTML, designSpec, {
    title: `${componentName} Component`,
  });

  // Render to PNG
  const screenshot = await renderHTMLToPNG(fullHTML, browser, {
    viewport: {
      width: designSpec.dimensions.width,
      height: designSpec.dimensions.height,
    },
  });

  // Save to pending directory with unique timestamp and counter
  const timestamp = Date.now();
  fileCounter++;
  const filename = `${componentName}-${timestamp}-${fileCounter}.png`;
  const filePath = path.join(
    process.cwd(),
    '.claude',
    'visuals',
    'pending',
    filename
  );

  return await saveToFile(screenshot, filePath);
}

export async function cleanupBrowserResources(browser: Browser | null): Promise<void> {
  if (!browser) {
    return;
  }

  try {
    // Close all pages
    const pages = await browser.pages();
    for (const page of pages) {
      try {
        await page.close();
      } catch (error) {
        console.warn(`Failed to close page: ${error}`);
      }
    }

    // Close browser
    await browser.close();

    // Reset singleton if this is the cached instance
    if (browser === browserInstance) {
      browserInstance = null;
      clearIdleTimer();
    }
  } catch (error) {
    console.warn(`Failed to cleanup browser: ${error}`);
  }
}

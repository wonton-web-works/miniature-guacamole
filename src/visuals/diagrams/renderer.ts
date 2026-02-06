/**
 * WS-DIAGRAMS: Mermaid Diagram Generation - Renderer
 *
 * Renders Mermaid diagrams to SVG and PNG using Puppeteer.
 */

import type { Browser } from 'puppeteer';
import type { DiagramSpec } from './types';
import { DiagramSyntaxError } from './types';
import { generateDiagramHTML } from './templates';
import { renderHTMLToPNG } from '../generator/renderer';

/**
 * Renders a Mermaid diagram to SVG.
 * Throws DiagramSyntaxError if diagram code is invalid.
 */
export async function renderMermaidToSVG(spec: DiagramSpec, browser: Browser): Promise<string> {
  if (!browser) {
    throw new Error('Browser instance required');
  }

  if (!spec.code || spec.code.trim() === '') {
    throw new DiagramSyntaxError('Diagram code cannot be empty');
  }

  let page = null;

  try {
    page = await browser.newPage();

    // Generate HTML with Mermaid diagram
    const html = generateDiagramHTML(spec);

    // Set HTML content
    await page.setContent(html);

    // Wait for SVG element to appear (5 second timeout)
    await page.waitForSelector('.mermaid svg', { timeout: 5000 });

    // Extract SVG outerHTML
    const svg = await page.evaluate(() => {
      const element = document.querySelector('.mermaid svg');
      return element?.outerHTML || null;
    });

    if (!svg) {
      throw new DiagramSyntaxError('Failed to generate SVG from diagram code');
    }

    return svg;
  } catch (error: any) {
    // Convert timeout errors to DiagramSyntaxError
    if (error.message?.includes('Timeout') || error.message?.includes('timeout')) {
      throw new DiagramSyntaxError(error.message);
    }
    // Re-throw syntax errors
    if (error instanceof DiagramSyntaxError) {
      throw error;
    }
    // Wrap other errors in DiagramSyntaxError
    const message = error.message || 'Unknown error';
    throw new DiagramSyntaxError(`Diagram syntax error: ${message}`);
  } finally {
    if (page) {
      try {
        await page.close();
      } catch {
        // Ignore close errors
      }
    }
  }
}

/**
 * Renders a Mermaid diagram to PNG.
 * Uses renderMermaidToSVG and then converts to PNG.
 */
export async function renderMermaidToPNG(
  spec: DiagramSpec,
  browser: Browser,
  options?: { scale?: number }
): Promise<Buffer> {
  // First, get the SVG
  const svg = await renderMermaidToSVG(spec, browser);

  // Wrap SVG in minimal HTML
  const html = `<html><body style="margin:0">${svg}</body></html>`;

  // Convert to PNG using existing renderer
  const scale = options?.scale ?? 2; // Default 2x for retina
  const pngBuffer = await renderHTMLToPNG(html, browser, { fullPage: true, scale });

  return pngBuffer;
}

export { DiagramSyntaxError };

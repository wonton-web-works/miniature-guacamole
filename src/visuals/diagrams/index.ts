/**
 * WS-DIAGRAMS: Mermaid Diagram Generation - Public API
 *
 * Main entry point for diagram generation.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { DiagramSpec } from './types';
import { isDiagramSpec } from './types';
import { renderMermaidToSVG, renderMermaidToPNG } from './renderer';
import { initializeBrowser, saveToFile } from '../generator/renderer';
import { createMetadataEntry } from '../metadata/store';
import { trackFileWithLfs } from '../git/lfs';

export interface GenerationResult {
  success: boolean;
  filePath?: string;
  format?: 'svg' | 'png';
  duration: number;
  metadata?: any;
  error?: string;
}

/**
 * Generates a diagram from a DiagramSpec.
 * Returns a structured result with success status.
 */
export async function generateDiagram(spec: DiagramSpec): Promise<GenerationResult> {
  const startTime = Date.now();

  try {
    // Validate spec
    if (!isDiagramSpec(spec)) {
      throw new Error('Invalid diagram specification');
    }

    // Initialize browser
    const browser = await initializeBrowser();

    // Determine format (default to svg)
    const format = spec.format || 'svg';

    // Render diagram
    let buffer: Buffer;
    if (format === 'png') {
      buffer = await renderMermaidToPNG(spec, browser, { scale: 2 });
    } else {
      const svg = await renderMermaidToSVG(spec, browser);
      buffer = Buffer.from(svg, 'utf8');
    }

    // Generate filename
    const filename = spec.filename || `${spec.type}-diagram-${Date.now()}.${format}`;

    // Save to file
    const filePath = await saveToFile(buffer, filename);

    // Check file size for LFS tracking
    const stats = await fs.promises.stat(filePath);
    if (stats.size > 1048576) {
      // File > 1MB, track with LFS
      try {
        await trackFileWithLfs(filePath);
      } catch {
        // LFS tracking is optional, continue on failure
      }
    }

    // Extract dimensions from SVG if available
    let width = 800;
    let height = 600;
    if (format === 'svg') {
      const svgContent = buffer.toString('utf8');
      const widthMatch = svgContent.match(/width="(\d+)"/);
      const heightMatch = svgContent.match(/height="(\d+)"/);
      if (widthMatch) width = parseInt(widthMatch[1], 10);
      if (heightMatch) height = parseInt(heightMatch[1], 10);
    }

    // Create metadata entry
    const metadata = await createMetadataEntry({
      workstream_id: 'WS-DIAGRAMS',
      component: `${spec.type}-diagram`,
      version: 1,
      spec_hash: Buffer.from(spec.code).toString('base64').substring(0, 32),
      file_path: filePath,
      file_size: stats.size,
      dimensions: { width, height },
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const duration = Date.now() - startTime;

    return {
      success: true,
      filePath,
      format,
      duration,
      metadata,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;

    return {
      success: false,
      duration,
      error: error.message || String(error),
    };
  }
}

// Re-export types
export type { DiagramSpec, DiagramTheme, DiagramOutput, MermaidConfig } from './types';
export { DiagramType, DiagramSyntaxError, isDiagramSpec } from './types';
export { generateDiagramHTML, getMermaidTheme, escapeHTML } from './templates';
export { renderMermaidToSVG, renderMermaidToPNG } from './renderer';

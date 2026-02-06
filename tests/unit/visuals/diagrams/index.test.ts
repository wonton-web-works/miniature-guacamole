/**
 * WS-DIAGRAMS: Mermaid Diagram Generation - Public API Tests
 *
 * BDD Scenarios:
 * - AC-5: Public API - generateDiagram() returns DiagramOutput
 * - Format auto-detection (spec.format or defaults to 'svg')
 * - Success/failure status with error messages
 * - Duration tracking
 * - File saving to .claude/visuals/pending/
 * - Unique filename generation
 * - AC-8: Integration with metadata store (WS-19)
 * - AC-8: Integration with Git LFS (WS-21)
 * - Error handling returns structured result
 *
 * Target: 99% coverage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateDiagram } from '@/visuals/diagrams';
import { DiagramType } from '@/visuals/diagrams/types';
import type { DiagramSpec } from '@/visuals/diagrams/types';
import * as fs from 'fs';

// Mock all dependencies (module-level as per project memory)
vi.mock('fs', () => ({
  promises: {
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    stat: vi.fn(),
  },
  existsSync: vi.fn(),
}));

vi.mock('@/visuals/diagrams/renderer', () => ({
  renderMermaidToSVG: vi.fn(),
  renderMermaidToPNG: vi.fn(),
  DiagramSyntaxError: class DiagramSyntaxError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'DiagramSyntaxError';
    }
  },
}));

vi.mock('@/visuals/generator/renderer', () => ({
  initializeBrowser: vi.fn(),
  closeBrowser: vi.fn(),
  saveToFile: vi.fn(),
  resetBrowserIdleTimer: vi.fn(),
}));

vi.mock('@/visuals/metadata/store', () => ({
  createMetadataEntry: vi.fn(),
  incrementVersion: vi.fn(),
}));

vi.mock('@/visuals/git/lfs', () => ({
  trackFileWithLfs: vi.fn(),
}));

// Import mocked modules at module level (after vi.mock() blocks)
import { initializeBrowser, closeBrowser, saveToFile } from '@/visuals/generator/renderer';
import { renderMermaidToSVG, renderMermaidToPNG, DiagramSyntaxError } from '@/visuals/diagrams/renderer';
import { createMetadataEntry } from '@/visuals/metadata/store';
import { trackFileWithLfs } from '@/visuals/git/lfs';

describe('visuals/diagrams/index - generateDiagram() (AC-5)', () => {
  let mockBrowser: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockBrowser = {
      newPage: vi.fn(),
      close: vi.fn(),
    };

    // Set up default mocks - tests can override these
    vi.mocked(initializeBrowser).mockResolvedValue(mockBrowser);
    vi.mocked(saveToFile).mockResolvedValue('.claude/visuals/pending/test-diagram.svg');
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.promises.stat).mockResolvedValue({ size: 1000 } as any);
    vi.mocked(createMetadataEntry).mockResolvedValue({
      id: 'test-id',
      workstream_id: 'WS-TEST',
      component: 'diagram',
      version: 1,
      spec_hash: 'hash',
      file_path: '/test/path.svg',
      file_size: 1000,
      dimensions: { width: 800, height: 600 },
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    vi.mocked(trackFileWithLfs).mockResolvedValue({
      tracked: true,
      file_path: '/test/path.svg',
    });
  });

  describe('Given valid DiagramSpec (AC-5: Public API)', () => {
    it('When generating diagram, Then returns DiagramOutput with success true', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.FLOWCHART,
        code: 'graph TD\n  A-->B',
      };

      vi.mocked(renderMermaidToSVG).mockResolvedValue('<svg>...</svg>');

      const result = await generateDiagram(spec);

      expect(result.success).toBe(true);
    });

    it('When generating diagram, Then returns DiagramOutput structure', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.SEQUENCE,
        code: 'sequenceDiagram\n  A->>B: Hello',
      };

      vi.mocked(renderMermaidToSVG).mockResolvedValue('<svg>...</svg>');

      const result = await generateDiagram(spec);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('format');
      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('duration');
    });

    it('When generating diagram, Then includes duration in milliseconds', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.CLASS,
        code: 'classDiagram\n  class Animal',
      };

      vi.mocked(renderMermaidToSVG).mockResolvedValue('<svg>...</svg>');

      const result = await generateDiagram(spec);

      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(typeof result.duration).toBe('number');
    });

    it('When generation succeeds, Then does not include error field', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.STATE,
        code: 'stateDiagram-v2\n  [*] --> Still',
      };

      vi.mocked(renderMermaidToSVG).mockResolvedValue('<svg>...</svg>');

      const result = await generateDiagram(spec);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('Given format auto-detection (AC-5: Format handling)', () => {
    it('When spec.format is svg, Then generates SVG', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.FLOWCHART,
        code: 'graph TD\n  A-->B',
        format: 'svg',
      };

      vi.mocked(renderMermaidToSVG).mockResolvedValue('<svg>...</svg>');

      const result = await generateDiagram(spec);

      expect(result.format).toBe('svg');
      expect(renderMermaidToSVG).toHaveBeenCalled();
    });

    it('When spec.format is png, Then generates PNG', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.SEQUENCE,
        code: 'sequenceDiagram\n  A->>B: Hi',
        format: 'png',
      };

      vi.mocked(renderMermaidToPNG).mockResolvedValue(Buffer.from('png-data'));

      const result = await generateDiagram(spec);

      expect(result.format).toBe('png');
      expect(renderMermaidToPNG).toHaveBeenCalled();
    });

    it('When spec.format is undefined, Then defaults to svg', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.CLASS,
        code: 'classDiagram\n  class Animal',
      };

      vi.mocked(renderMermaidToSVG).mockResolvedValue('<svg>...</svg>');

      const result = await generateDiagram(spec);

      expect(result.format).toBe('svg');
      expect(renderMermaidToSVG).toHaveBeenCalled();
    });

    it('When format is svg, Then calls renderMermaidToSVG', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.FLOWCHART,
        code: 'graph LR\n  A-->B',
        format: 'svg',
      };

      vi.mocked(renderMermaidToSVG).mockResolvedValue('<svg>...</svg>');

      await generateDiagram(spec);

      expect(renderMermaidToSVG).toHaveBeenCalledWith(spec, mockBrowser);
    });

    it('When format is png, Then calls renderMermaidToPNG', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.GANTT,
        code: 'gantt\n  title Project',
        format: 'png',
      };

      vi.mocked(renderMermaidToPNG).mockResolvedValue(Buffer.from('png-data'));

      await generateDiagram(spec);

      expect(renderMermaidToPNG).toHaveBeenCalledWith(spec, mockBrowser, expect.any(Object));
    });
  });

  describe('Given file saving (AC-5: Save to pending/)', () => {
    it('When generating diagram, Then saves to .claude/visuals/pending/', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.FLOWCHART,
        code: 'graph TD\n  A-->B',
      };

      vi.mocked(renderMermaidToSVG).mockResolvedValue('<svg>...</svg>');
      vi.mocked(saveToFile).mockResolvedValue('.claude/visuals/pending/flowchart-123.svg');

      const result = await generateDiagram(spec);

      expect(saveToFile).toHaveBeenCalled();
      expect(result.filePath).toContain('pending');
    });

    it('When generating diagram, Then creates unique filename with timestamp', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.SEQUENCE,
        code: 'sequenceDiagram\n  A->>B: Hi',
      };

      vi.mocked(renderMermaidToSVG).mockResolvedValue('<svg>...</svg>');
      vi.mocked(saveToFile).mockResolvedValue(
        '.claude/visuals/pending/sequence-diagram-1234567890.svg'
      );

      const result = await generateDiagram(spec);

      expect(result.filePath).toMatch(/sequence-diagram-\d+\.svg/);
    });

    it('When generating diagram, Then filename includes diagram type', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.CLASS,
        code: 'classDiagram\n  class Animal',
      };

      vi.mocked(renderMermaidToSVG).mockResolvedValue('<svg>...</svg>');
      vi.mocked(saveToFile).mockResolvedValue('.claude/visuals/pending/class-diagram-123.svg');

      const result = await generateDiagram(spec);

      expect(result.filePath).toContain('class-diagram');
    });

    it('When generating diagram, Then filename includes correct extension', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.STATE,
        code: 'stateDiagram-v2\n  [*] --> Still',
        format: 'png',
      };

      vi.mocked(renderMermaidToPNG).mockResolvedValue(Buffer.from('png-data'));
      vi.mocked(saveToFile).mockResolvedValue('.claude/visuals/pending/state-diagram-123.png');

      const result = await generateDiagram(spec);

      expect(result.filePath).toMatch(/\.png$/);
    });

    it('When spec has custom filename, Then uses custom filename', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.ER,
        code: 'erDiagram\n  CUSTOMER ||--o{ ORDER : places',
        filename: 'my-custom-diagram.svg',
      };

      vi.mocked(renderMermaidToSVG).mockResolvedValue('<svg>...</svg>');
      vi.mocked(saveToFile).mockResolvedValue(
        '.claude/visuals/pending/my-custom-diagram.svg'
      );

      const result = await generateDiagram(spec);

      expect(result.filePath).toContain('my-custom-diagram.svg');
    });

    it('When generating multiple diagrams, Then creates unique filenames', async () => {
      const spec1: DiagramSpec = {
        type: DiagramType.FLOWCHART,
        code: 'graph TD\n  A-->B',
      };
      const spec2: DiagramSpec = {
        type: DiagramType.FLOWCHART,
        code: 'graph TD\n  C-->D',
      };

      vi.mocked(renderMermaidToSVG).mockResolvedValue('<svg>...</svg>');

      vi.mocked(saveToFile)
        .mockResolvedValueOnce('.claude/visuals/pending/flowchart-diagram-1234567890.svg')
        .mockResolvedValueOnce('.claude/visuals/pending/flowchart-diagram-1234567891.svg');

      const result1 = await generateDiagram(spec1);
      const result2 = await generateDiagram(spec2);

      expect(result1.filePath).not.toBe(result2.filePath);
    });
  });

  describe('Given error scenarios (AC-5: Error handling)', () => {
    it('When diagram syntax is invalid, Then returns success false', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.FLOWCHART,
        code: 'invalid syntax',
      };

      vi.mocked(renderMermaidToSVG).mockRejectedValue(
        new DiagramSyntaxError('Invalid syntax')
      );

      const result = await generateDiagram(spec);

      expect(result.success).toBe(false);
    });

    it('When generation fails, Then returns error message', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.SEQUENCE,
        code: 'broken',
      };

      vi.mocked(renderMermaidToSVG).mockRejectedValue(
        new DiagramSyntaxError('Parse error at line 1')
      );

      const result = await generateDiagram(spec);

      expect(result.error).toBeDefined();
      expect(result.error).toContain('Parse error');
    });

    it('When generation fails, Then does not throw error to caller', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.CLASS,
        code: 'invalid',
      };

      vi.mocked(renderMermaidToSVG).mockRejectedValue(new DiagramSyntaxError('Syntax error'));

      await expect(generateDiagram(spec)).resolves.toBeDefined();
    });

    it('When timeout occurs, Then returns error with timeout message', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.STATE,
        code: 'stateDiagram-v2\n  [*] --> Active',
      };

      vi.mocked(renderMermaidToSVG).mockRejectedValue(new Error('Timeout waiting for SVG'));

      const result = await generateDiagram(spec);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Timeout');
    });

    it('When browser initialization fails, Then returns error', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.GANTT,
        code: 'gantt\n  title Project',
      };

      vi.mocked(initializeBrowser).mockRejectedValue(new Error('Cannot launch browser'));

      const result = await generateDiagram(spec);

      expect(result.success).toBe(false);
      expect(result.error).toContain('browser');
    });

    it('When file save fails, Then returns error', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.PIE,
        code: 'pie\n  "A" : 100',
      };

      vi.mocked(renderMermaidToSVG).mockResolvedValue('<svg>...</svg>');
      vi.mocked(saveToFile).mockRejectedValue(new Error('Disk full'));

      const result = await generateDiagram(spec);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Disk full');
    });
  });

  describe('Given metadata integration (AC-8: WS-19 pattern)', () => {
    it('When generating diagram, Then creates metadata entry', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.FLOWCHART,
        code: 'graph TD\n  A-->B',
      };

      vi.mocked(renderMermaidToSVG).mockResolvedValue('<svg>...</svg>');
      vi.mocked(createMetadataEntry).mockResolvedValue({
        id: 'test-id',
        workstream_id: 'WS-DIAGRAMS',
        component: 'flowchart-diagram',
        version: 1,
        spec_hash: 'abc123',
        file_path: '.claude/visuals/pending/flowchart-diagram-123.svg',
        file_size: 1024,
        dimensions: { width: 800, height: 600 },
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await generateDiagram(spec);

      expect(createMetadataEntry).toHaveBeenCalled();
    });

    it('When creating metadata, Then includes workstream_id', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.SEQUENCE,
        code: 'sequenceDiagram\n  A->>B: Hi',
      };

      vi.mocked(renderMermaidToSVG).mockResolvedValue('<svg>...</svg>');
      vi.mocked(createMetadataEntry).mockResolvedValue({} as any);

      await generateDiagram(spec);

      expect(createMetadataEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          workstream_id: 'WS-DIAGRAMS',
        })
      );
    });

    it('When creating metadata, Then includes diagram type as component', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.CLASS,
        code: 'classDiagram\n  class Animal',
      };

      vi.mocked(renderMermaidToSVG).mockResolvedValue('<svg>...</svg>');
      vi.mocked(createMetadataEntry).mockResolvedValue({} as any);

      await generateDiagram(spec);

      expect(createMetadataEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          component: expect.stringContaining('class'),
        })
      );
    });

    it('When creating metadata, Then includes file dimensions', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.STATE,
        code: 'stateDiagram-v2\n  [*] --> Still',
      };

      vi.mocked(renderMermaidToSVG).mockResolvedValue('<svg width="800" height="600">...</svg>');
      vi.mocked(createMetadataEntry).mockResolvedValue({} as any);

      await generateDiagram(spec);

      expect(createMetadataEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          dimensions: expect.objectContaining({
            width: expect.any(Number),
            height: expect.any(Number),
          }),
        })
      );
    });

    it('When creating metadata, Then status is pending', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.ER,
        code: 'erDiagram\n  CUSTOMER ||--o{ ORDER : places',
      };

      vi.mocked(renderMermaidToSVG).mockResolvedValue('<svg>...</svg>');
      vi.mocked(createMetadataEntry).mockResolvedValue({} as any);

      await generateDiagram(spec);

      expect(createMetadataEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
        })
      );
    });
  });

  describe('Given Git LFS integration (AC-8: WS-21 pattern)', () => {
    it('When file size exceeds 1MB, Then tracks with LFS', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.FLOWCHART,
        code: 'graph TD\n  A-->B',
        format: 'png',
      };

      const largePngBuffer = Buffer.alloc(2 * 1024 * 1024); // 2MB
      vi.mocked(renderMermaidToPNG).mockResolvedValue(largePngBuffer);
      vi.mocked(saveToFile).mockResolvedValue('.claude/visuals/pending/flowchart-diagram-123.png');
      vi.mocked(trackFileWithLfs).mockResolvedValue(undefined);

      vi.mocked(fs.promises.stat).mockResolvedValue({
        size: 2 * 1024 * 1024,
      } as any);

      await generateDiagram(spec);

      expect(trackFileWithLfs).toHaveBeenCalledWith(
        expect.stringContaining('flowchart-diagram')
      );
    });

    it('When file size is less than 1MB, Then does not track with LFS', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.SEQUENCE,
        code: 'sequenceDiagram\n  A->>B: Hi',
      };

      vi.mocked(renderMermaidToSVG).mockResolvedValue('<svg>...</svg>');

      vi.mocked(fs.promises.stat).mockResolvedValue({
        size: 500 * 1024, // 500KB
      } as any);

      await generateDiagram(spec);

      expect(trackFileWithLfs).not.toHaveBeenCalled();
    });

    it('When LFS tracking fails, Then still returns success', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.CLASS,
        code: 'classDiagram\n  class Animal',
        format: 'png',
      };

      const largePngBuffer = Buffer.alloc(2 * 1024 * 1024);
      vi.mocked(renderMermaidToPNG).mockResolvedValue(largePngBuffer);
      vi.mocked(trackFileWithLfs).mockRejectedValue(new Error('LFS not installed'));

      vi.mocked(fs.promises.stat).mockResolvedValue({
        size: 2 * 1024 * 1024,
      } as any);

      const result = await generateDiagram(spec);

      expect(result.success).toBe(true);
    });
  });

  describe('Given browser lifecycle (AC-5: Browser management)', () => {
    it('When generating diagram, Then initializes browser', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.FLOWCHART,
        code: 'graph TD\n  A-->B',
      };

      vi.mocked(renderMermaidToSVG).mockResolvedValue('<svg>...</svg>');

      await generateDiagram(spec);

      expect(initializeBrowser).toHaveBeenCalled();
    });

    it('When generating diagram, Then does not close browser (reuse)', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.SEQUENCE,
        code: 'sequenceDiagram\n  A->>B: Hi',
      };

      vi.mocked(renderMermaidToSVG).mockResolvedValue('<svg>...</svg>');

      await generateDiagram(spec);

      expect(closeBrowser).not.toHaveBeenCalled();
    });

    it('When generating multiple diagrams, Then reuses browser instance', async () => {
      const spec1: DiagramSpec = {
        type: DiagramType.CLASS,
        code: 'classDiagram\n  class Animal',
      };
      const spec2: DiagramSpec = {
        type: DiagramType.STATE,
        code: 'stateDiagram-v2\n  [*] --> Still',
      };

      vi.mocked(renderMermaidToSVG).mockResolvedValue('<svg>...</svg>');

      await generateDiagram(spec1);
      await generateDiagram(spec2);

      expect(initializeBrowser).toHaveBeenCalledTimes(2);
      // Both calls return the same browser instance (singleton)
    });
  });
});

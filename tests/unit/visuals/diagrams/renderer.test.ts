/**
 * WS-DIAGRAMS: Mermaid Diagram Generation - Renderer Tests
 *
 * BDD Scenarios:
 * - AC-3: SVG Rendering - renderMermaidToSVG() with Puppeteer
 * - AC-4: PNG Rendering - renderMermaidToPNG() using existing renderer
 * - 5 second timeout on SVG element appearance
 * - Browser reuse (shared Puppeteer singleton)
 * - Page cleanup in finally block
 * - Error handling (syntax errors, timeouts)
 *
 * Target: 99% coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  renderMermaidToSVG,
  renderMermaidToPNG,
  DiagramSyntaxError,
} from '@/visuals/diagrams/renderer';
import type { DiagramSpec } from '@/visuals/diagrams/types';
import { DiagramType } from '@/visuals/diagrams/types';

// Mock Puppeteer (module-level as per project memory)
vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn(),
  },
}));

// Mock existing renderer module
vi.mock('@/visuals/generator/renderer', () => ({
  initializeBrowser: vi.fn(),
  renderHTMLToPNG: vi.fn(),
  saveToFile: vi.fn(),
  resetBrowserIdleTimer: vi.fn(),
}));

// Mock templates module
vi.mock('@/visuals/diagrams/templates', () => ({
  generateDiagramHTML: vi.fn(),
}));

describe('visuals/diagrams/renderer - renderMermaidToSVG() (AC-3)', () => {
  let mockBrowser: any;
  let mockPage: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPage = {
      setContent: vi.fn().mockResolvedValue(undefined),
      waitForSelector: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue('<svg>...</svg>'),
      close: vi.fn().mockResolvedValue(undefined),
    };

    mockBrowser = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn().mockResolvedValue(undefined),
    };
  });

  describe('Given valid Mermaid diagram (AC-3: SVG extraction)', () => {
    it('When rendering to SVG, Then creates new page', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.FLOWCHART,
        code: 'graph TD\n  A-->B',
      };

      await renderMermaidToSVG(spec, mockBrowser);

      expect(mockBrowser.newPage).toHaveBeenCalled();
    });

    it('When rendering to SVG, Then sets HTML content', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.FLOWCHART,
        code: 'graph TD\n  A-->B',
      };

      const { generateDiagramHTML } = await import('@/visuals/diagrams/templates');
      vi.mocked(generateDiagramHTML).mockReturnValue('<html>...</html>');

      await renderMermaidToSVG(spec, mockBrowser);

      expect(mockPage.setContent).toHaveBeenCalledWith('<html>...</html>');
    });

    it('When rendering to SVG, Then waits for SVG element', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.SEQUENCE,
        code: 'sequenceDiagram\n  A->>B: Hello',
      };

      await renderMermaidToSVG(spec, mockBrowser);

      expect(mockPage.waitForSelector).toHaveBeenCalledWith('.mermaid svg', {
        timeout: 5000,
      });
    });

    it('When rendering to SVG, Then extracts SVG via page.evaluate()', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.CLASS,
        code: 'classDiagram\n  class Animal',
      };

      await renderMermaidToSVG(spec, mockBrowser);

      expect(mockPage.evaluate).toHaveBeenCalled();
    });

    it('When rendering to SVG, Then returns SVG string', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.STATE,
        code: 'stateDiagram-v2\n  [*] --> Still',
      };

      mockPage.evaluate.mockResolvedValue('<svg width="500" height="300">...</svg>');

      const result = await renderMermaidToSVG(spec, mockBrowser);

      expect(result).toBe('<svg width="500" height="300">...</svg>');
      expect(result).toContain('<svg');
      expect(result).toContain('</svg>');
    });

    it('When rendering to SVG, Then closes page in finally block', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.ER,
        code: 'erDiagram\n  CUSTOMER ||--o{ ORDER : places',
      };

      await renderMermaidToSVG(spec, mockBrowser);

      expect(mockPage.close).toHaveBeenCalled();
    });

    it('When SVG extraction succeeds, Then returns non-empty SVG', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.FLOWCHART,
        code: 'graph LR\n  Start-->End',
      };

      mockPage.evaluate.mockResolvedValue(
        '<svg xmlns="http://www.w3.org/2000/svg"><g>...</g></svg>'
      );

      const result = await renderMermaidToSVG(spec, mockBrowser);

      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Given browser reuse (AC-3: Shared Puppeteer singleton)', () => {
    it('When rendering multiple diagrams, Then reuses browser instance', async () => {
      const spec1: DiagramSpec = {
        type: DiagramType.FLOWCHART,
        code: 'graph TD\n  A-->B',
      };
      const spec2: DiagramSpec = {
        type: DiagramType.SEQUENCE,
        code: 'sequenceDiagram\n  A->>B: Hi',
      };

      await renderMermaidToSVG(spec1, mockBrowser);
      await renderMermaidToSVG(spec2, mockBrowser);

      expect(mockBrowser.newPage).toHaveBeenCalledTimes(2);
      // Same browser instance used
    });

    it('When rendering to SVG, Then does not create new browser instance', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.GANTT,
        code: 'gantt\n  title Project',
      };

      const puppeteer = await import('puppeteer');
      await renderMermaidToSVG(spec, mockBrowser);

      expect(puppeteer.default.launch).not.toHaveBeenCalled();
    });

    it('When rendering with provided browser, Then uses provided browser', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.PIE,
        code: 'pie\n  "A" : 100',
      };

      const customBrowser = {
        newPage: vi.fn().mockResolvedValue(mockPage),
        close: vi.fn(),
      };

      await renderMermaidToSVG(spec, customBrowser as any);

      expect(customBrowser.newPage).toHaveBeenCalled();
      expect(mockBrowser.newPage).not.toHaveBeenCalled();
    });
  });

  describe('Given invalid Mermaid syntax (AC-7: Error handling)', () => {
    it('When Mermaid code has syntax error, Then throws DiagramSyntaxError', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.FLOWCHART,
        code: 'invalid mermaid syntax',
      };

      mockPage.waitForSelector.mockRejectedValue(new Error('Syntax error in diagram'));

      await expect(renderMermaidToSVG(spec, mockBrowser)).rejects.toThrow(
        DiagramSyntaxError
      );
    });

    it('When Mermaid code is invalid, Then throws error with clear message', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.SEQUENCE,
        code: 'sequenceDiagram\n  broken-->syntax',
      };

      mockPage.waitForSelector.mockRejectedValue(new Error('Parse error'));

      await expect(renderMermaidToSVG(spec, mockBrowser)).rejects.toThrow('syntax');
    });

    it('When diagram code is empty, Then throws error', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.FLOWCHART,
        code: '',
      };

      await expect(renderMermaidToSVG(spec, mockBrowser)).rejects.toThrow();
    });
  });

  describe('Given timeout scenarios (AC-3: 5 second timeout)', () => {
    it('When SVG does not appear within 5 seconds, Then throws timeout error', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.FLOWCHART,
        code: 'graph TD\n  A-->B',
      };

      mockPage.waitForSelector.mockRejectedValue(new Error('Timeout waiting for selector'));

      await expect(renderMermaidToSVG(spec, mockBrowser)).rejects.toThrow('Timeout');
    });

    it('When waiting for selector, Then uses 5000ms timeout', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.CLASS,
        code: 'classDiagram\n  class Animal',
      };

      await renderMermaidToSVG(spec, mockBrowser);

      expect(mockPage.waitForSelector).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ timeout: 5000 })
      );
    });

    it('When timeout occurs, Then includes timeout duration in error message', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.STATE,
        code: 'stateDiagram-v2\n  [*] --> Active',
      };

      mockPage.waitForSelector.mockRejectedValue(
        new Error('Timeout of 5000ms exceeded')
      );

      await expect(renderMermaidToSVG(spec, mockBrowser)).rejects.toThrow('5000');
    });
  });

  describe('Given page cleanup (AC-7: Finally block cleanup)', () => {
    it('When rendering succeeds, Then closes page', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.FLOWCHART,
        code: 'graph TD\n  A-->B',
      };

      await renderMermaidToSVG(spec, mockBrowser);

      expect(mockPage.close).toHaveBeenCalled();
    });

    it('When rendering fails, Then still closes page', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.SEQUENCE,
        code: 'invalid',
      };

      mockPage.waitForSelector.mockRejectedValue(new Error('Syntax error'));

      try {
        await renderMermaidToSVG(spec, mockBrowser);
      } catch {
        // Expected error
      }

      expect(mockPage.close).toHaveBeenCalled();
    });

    it('When page.close() fails, Then does not throw', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.CLASS,
        code: 'classDiagram\n  class Animal',
      };

      mockPage.close.mockRejectedValue(new Error('Close failed'));

      await expect(renderMermaidToSVG(spec, mockBrowser)).resolves.toBeDefined();
    });

    it('When page is null, Then handles gracefully', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.FLOWCHART,
        code: 'graph TD\n  A-->B',
      };

      mockBrowser.newPage.mockResolvedValue(null);

      await expect(renderMermaidToSVG(spec, mockBrowser)).rejects.toThrow();
      // Should not throw additional errors during cleanup
    });
  });

  describe('Given browser initialization errors (AC-7: Missing browser)', () => {
    it('When browser is null, Then throws initialization error', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.FLOWCHART,
        code: 'graph TD\n  A-->B',
      };

      await expect(renderMermaidToSVG(spec, null as any)).rejects.toThrow();
    });

    it('When browser is undefined, Then throws initialization error', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.SEQUENCE,
        code: 'sequenceDiagram\n  A->>B: Hi',
      };

      await expect(renderMermaidToSVG(spec, undefined as any)).rejects.toThrow();
    });

    it('When browser.newPage fails, Then throws error', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.CLASS,
        code: 'classDiagram\n  class Animal',
      };

      mockBrowser.newPage.mockRejectedValue(new Error('Cannot create page'));

      await expect(renderMermaidToSVG(spec, mockBrowser)).rejects.toThrow(
        'Cannot create page'
      );
    });
  });

  describe('Given SVG extraction details', () => {
    it('When evaluating SVG, Then selects .mermaid svg element', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.FLOWCHART,
        code: 'graph TD\n  A-->B',
      };

      mockPage.evaluate.mockImplementation((fn: any) => {
        // Simulate the selector query
        const mockElement = { outerHTML: '<svg>...</svg>' };
        return Promise.resolve(mockElement.outerHTML);
      });

      await renderMermaidToSVG(spec, mockBrowser);

      expect(mockPage.evaluate).toHaveBeenCalled();
      const evaluateFn = mockPage.evaluate.mock.calls[0][0];
      expect(evaluateFn).toBeDefined();
    });

    it('When SVG element not found, Then throws error', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.FLOWCHART,
        code: 'graph TD\n  A-->B',
      };

      mockPage.evaluate.mockResolvedValue(null);

      await expect(renderMermaidToSVG(spec, mockBrowser)).rejects.toThrow();
    });

    it('When SVG extraction returns empty string, Then throws error', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.SEQUENCE,
        code: 'sequenceDiagram\n  A->>B: Hi',
      };

      mockPage.evaluate.mockResolvedValue('');

      await expect(renderMermaidToSVG(spec, mockBrowser)).rejects.toThrow();
    });
  });
});

describe('visuals/diagrams/renderer - renderMermaidToPNG() (AC-4)', () => {
  let mockBrowser: any;
  let mockPage: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPage = {
      setContent: vi.fn().mockResolvedValue(undefined),
      waitForSelector: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue('<svg width="800" height="600">...</svg>'),
      close: vi.fn().mockResolvedValue(undefined),
    };

    mockBrowser = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn().mockResolvedValue(undefined),
    };
  });

  describe('Given valid diagram spec (AC-4: PNG conversion)', () => {
    it('When rendering to PNG, Then calls renderMermaidToSVG first', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.FLOWCHART,
        code: 'graph TD\n  A-->B',
      };

      const { renderHTMLToPNG } = await import('@/visuals/generator/renderer');
      vi.mocked(renderHTMLToPNG).mockResolvedValue(Buffer.from('png-data'));

      await renderMermaidToPNG(spec, mockBrowser);

      expect(mockPage.evaluate).toHaveBeenCalled(); // SVG extraction
    });

    it('When rendering to PNG, Then wraps SVG in HTML', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.SEQUENCE,
        code: 'sequenceDiagram\n  A->>B: Hello',
      };

      const { renderHTMLToPNG } = await import('@/visuals/generator/renderer');
      vi.mocked(renderHTMLToPNG).mockResolvedValue(Buffer.from('png-data'));

      await renderMermaidToPNG(spec, mockBrowser);

      expect(renderHTMLToPNG).toHaveBeenCalledWith(
        expect.stringContaining('<svg'),
        mockBrowser,
        expect.any(Object)
      );
    });

    it('When rendering to PNG, Then calls renderHTMLToPNG from generator/renderer', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.CLASS,
        code: 'classDiagram\n  class Animal',
      };

      const { renderHTMLToPNG } = await import('@/visuals/generator/renderer');
      vi.mocked(renderHTMLToPNG).mockResolvedValue(Buffer.from('png-data'));

      await renderMermaidToPNG(spec, mockBrowser);

      expect(renderHTMLToPNG).toHaveBeenCalled();
    });

    it('When rendering to PNG, Then returns PNG buffer', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.STATE,
        code: 'stateDiagram-v2\n  [*] --> Still',
      };

      const expectedBuffer = Buffer.from('png-image-data');
      const { renderHTMLToPNG } = await import('@/visuals/generator/renderer');
      vi.mocked(renderHTMLToPNG).mockResolvedValue(expectedBuffer);

      const result = await renderMermaidToPNG(spec, mockBrowser);

      expect(result).toBeInstanceOf(Buffer);
      expect(result).toBe(expectedBuffer);
    });
  });

  describe('Given scale option (AC-4: Retina support)', () => {
    it('When scale not specified, Then uses 2x default for retina', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.FLOWCHART,
        code: 'graph TD\n  A-->B',
      };

      const { renderHTMLToPNG } = await import('@/visuals/generator/renderer');
      vi.mocked(renderHTMLToPNG).mockResolvedValue(Buffer.from('png-data'));

      await renderMermaidToPNG(spec, mockBrowser);

      expect(renderHTMLToPNG).toHaveBeenCalledWith(
        expect.any(String),
        mockBrowser,
        expect.objectContaining({ scale: 2 })
      );
    });

    it('When custom scale provided, Then uses custom scale', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.SEQUENCE,
        code: 'sequenceDiagram\n  A->>B: Hi',
      };

      const { renderHTMLToPNG } = await import('@/visuals/generator/renderer');
      vi.mocked(renderHTMLToPNG).mockResolvedValue(Buffer.from('png-data'));

      await renderMermaidToPNG(spec, mockBrowser, { scale: 3 });

      expect(renderHTMLToPNG).toHaveBeenCalledWith(
        expect.any(String),
        mockBrowser,
        expect.objectContaining({ scale: 3 })
      );
    });

    it('When scale is 1, Then uses 1x scale', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.CLASS,
        code: 'classDiagram\n  class Animal',
      };

      const { renderHTMLToPNG } = await import('@/visuals/generator/renderer');
      vi.mocked(renderHTMLToPNG).mockResolvedValue(Buffer.from('png-data'));

      await renderMermaidToPNG(spec, mockBrowser, { scale: 1 });

      expect(renderHTMLToPNG).toHaveBeenCalledWith(
        expect.any(String),
        mockBrowser,
        expect.objectContaining({ scale: 1 })
      );
    });
  });

  describe('Given error scenarios (AC-7: Error propagation)', () => {
    it('When SVG rendering fails, Then propagates error', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.FLOWCHART,
        code: 'invalid',
      };

      mockPage.waitForSelector.mockRejectedValue(new Error('Syntax error'));

      await expect(renderMermaidToPNG(spec, mockBrowser)).rejects.toThrow('Syntax error');
    });

    it('When PNG conversion fails, Then throws error', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.SEQUENCE,
        code: 'sequenceDiagram\n  A->>B: Hi',
      };

      const { renderHTMLToPNG } = await import('@/visuals/generator/renderer');
      vi.mocked(renderHTMLToPNG).mockRejectedValue(new Error('PNG conversion failed'));

      await expect(renderMermaidToPNG(spec, mockBrowser)).rejects.toThrow(
        'PNG conversion failed'
      );
    });

    it('When browser is null, Then throws error', async () => {
      const spec: DiagramSpec = {
        type: DiagramType.CLASS,
        code: 'classDiagram\n  class Animal',
      };

      await expect(renderMermaidToPNG(spec, null as any)).rejects.toThrow();
    });
  });
});

describe('visuals/diagrams/renderer - DiagramSyntaxError (AC-7)', () => {
  describe('Given DiagramSyntaxError class', () => {
    it('When creating DiagramSyntaxError, Then is instance of Error', () => {
      const error = new DiagramSyntaxError('Syntax error in diagram');

      expect(error).toBeInstanceOf(Error);
    });

    it('When creating DiagramSyntaxError, Then has correct message', () => {
      const error = new DiagramSyntaxError('Invalid flowchart syntax');

      expect(error.message).toBe('Invalid flowchart syntax');
    });

    it('When creating DiagramSyntaxError, Then has correct name', () => {
      const error = new DiagramSyntaxError('Parse error');

      expect(error.name).toBe('DiagramSyntaxError');
    });

    it('When thrown, Then can be caught specifically', () => {
      try {
        throw new DiagramSyntaxError('Test error');
      } catch (error) {
        expect(error).toBeInstanceOf(DiagramSyntaxError);
        if (error instanceof DiagramSyntaxError) {
          expect(error.message).toBe('Test error');
        }
      }
    });
  });
});

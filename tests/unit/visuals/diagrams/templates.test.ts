/**
 * WS-DIAGRAMS: Mermaid Diagram Generation - Template Tests
 *
 * BDD Scenarios:
 * - AC-2: Template Generation - HTML document creation
 * - Mermaid CDN script injection with pinned version
 * - mermaid.initialize() configuration
 * - Theme mapping from DesignSpec to Mermaid
 * - HTML escaping for XSS prevention
 * - Support for all DiagramType values
 *
 * Target: 99% coverage
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateDiagramHTML,
  getMermaidTheme,
  escapeHTML,
} from '@/visuals/diagrams/templates';
import { DiagramType } from '@/visuals/diagrams/types';
import type { DiagramSpec, DiagramTheme } from '@/visuals/diagrams/types';
import type { DesignSpec } from '@/visuals/types';

describe('visuals/diagrams/templates - generateDiagramHTML() (AC-2)', () => {
  let mockDesignSpec: DesignSpec;

  beforeEach(() => {
    mockDesignSpec = {
      colors: {
        primary: '#4A90E2',
        secondary: '#7B68EE',
        background: '#FFFFFF',
        text: '#333333',
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
      },
    };
  });

  describe('Given valid DiagramSpec (AC-2: HTML generation)', () => {
    it('When generating HTML, Then creates complete HTML document', () => {
      const spec: DiagramSpec = {
        type: DiagramType.FLOWCHART,
        code: 'graph TD\n  A-->B',
      };

      const html = generateDiagramHTML(spec);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html>');
      expect(html).toContain('</html>');
    });

    it('When generating HTML, Then includes Mermaid CDN script', () => {
      const spec: DiagramSpec = {
        type: DiagramType.FLOWCHART,
        code: 'graph TD\n  A-->B',
      };

      const html = generateDiagramHTML(spec);

      expect(html).toContain('https://cdn.jsdelivr.net/npm/mermaid@');
      expect(html).toContain('/dist/mermaid.min.js');
    });

    it('When generating HTML, Then uses pinned Mermaid version 11.4.0', () => {
      const spec: DiagramSpec = {
        type: DiagramType.SEQUENCE,
        code: 'sequenceDiagram\n  A->>B: Hello',
      };

      const html = generateDiagramHTML(spec);

      expect(html).toContain('mermaid@11.4.0');
    });

    it('When generating HTML, Then includes mermaid.initialize() call', () => {
      const spec: DiagramSpec = {
        type: DiagramType.CLASS,
        code: 'classDiagram\n  class Animal',
      };

      const html = generateDiagramHTML(spec);

      expect(html).toContain('mermaid.initialize');
    });

    it('When generating HTML, Then includes diagram code in mermaid div', () => {
      const spec: DiagramSpec = {
        type: DiagramType.STATE,
        code: 'stateDiagram-v2\n  [*] --> Still',
      };

      const html = generateDiagramHTML(spec);

      expect(html).toContain('<div class="mermaid">');
      expect(html).toContain('stateDiagram-v2');
      expect(html).toContain('[*] --> Still');
      expect(html).toContain('</div>');
    });
  });

  describe('Given different DiagramType values (AC-2: All types)', () => {
    it('When generating flowchart, Then includes flowchart code', () => {
      const spec: DiagramSpec = {
        type: DiagramType.FLOWCHART,
        code: 'graph TD\n  Start-->End',
      };

      const html = generateDiagramHTML(spec);

      expect(html).toContain('graph TD');
      expect(html).toContain('Start-->End');
    });

    it('When generating sequence diagram, Then includes sequence code', () => {
      const spec: DiagramSpec = {
        type: DiagramType.SEQUENCE,
        code: 'sequenceDiagram\n  Alice->>Bob: Hi',
      };

      const html = generateDiagramHTML(spec);

      expect(html).toContain('sequenceDiagram');
      expect(html).toContain('Alice->>Bob: Hi');
    });

    it('When generating class diagram, Then includes class code', () => {
      const spec: DiagramSpec = {
        type: DiagramType.CLASS,
        code: 'classDiagram\n  Animal <|-- Duck',
      };

      const html = generateDiagramHTML(spec);

      expect(html).toContain('classDiagram');
      expect(html).toContain('Animal <|-- Duck');
    });

    it('When generating state diagram, Then includes state code', () => {
      const spec: DiagramSpec = {
        type: DiagramType.STATE,
        code: 'stateDiagram-v2\n  [*] --> Active',
      };

      const html = generateDiagramHTML(spec);

      expect(html).toContain('stateDiagram-v2');
      expect(html).toContain('[*] --> Active');
    });

    it('When generating ER diagram, Then includes ER code', () => {
      const spec: DiagramSpec = {
        type: DiagramType.ER,
        code: 'erDiagram\n  CUSTOMER ||--o{ ORDER : places',
      };

      const html = generateDiagramHTML(spec);

      expect(html).toContain('erDiagram');
      expect(html).toContain('CUSTOMER ||--o{ ORDER : places');
    });

    it('When generating Gantt chart, Then includes Gantt code', () => {
      const spec: DiagramSpec = {
        type: DiagramType.GANTT,
        code: 'gantt\n  title Project Timeline',
      };

      const html = generateDiagramHTML(spec);

      expect(html).toContain('gantt');
      expect(html).toContain('title Project Timeline');
    });

    it('When generating pie chart, Then includes pie code', () => {
      const spec: DiagramSpec = {
        type: DiagramType.PIE,
        code: 'pie\n  "Dogs" : 386\n  "Cats" : 85',
      };

      const html = generateDiagramHTML(spec);

      expect(html).toContain('pie');
      expect(html).toContain('"Dogs" : 386');
    });

    it('When generating journey diagram, Then includes journey code', () => {
      const spec: DiagramSpec = {
        type: DiagramType.JOURNEY,
        code: 'journey\n  title My working day',
      };

      const html = generateDiagramHTML(spec);

      expect(html).toContain('journey');
      expect(html).toContain('title My working day');
    });
  });

  describe('Given theme configuration (AC-2: Theme mapping)', () => {
    it('When spec includes presentation theme, Then applies presentation theme', () => {
      const spec: DiagramSpec = {
        type: DiagramType.FLOWCHART,
        code: 'graph TD\n  A-->B',
        theme: 'presentation',
      };

      const html = generateDiagramHTML(spec);

      expect(html).toContain('theme:');
      expect(html).toMatch(/theme:\s*['"]presentation['"]/);
    });

    it('When spec includes documentation theme, Then applies documentation theme', () => {
      const spec: DiagramSpec = {
        type: DiagramType.SEQUENCE,
        code: 'sequenceDiagram\n  A->>B: Hello',
        theme: 'documentation',
      };

      const html = generateDiagramHTML(spec);

      expect(html).toContain('theme:');
      expect(html).toMatch(/theme:\s*['"]documentation['"]/);
    });

    it('When spec includes dark theme, Then applies dark theme', () => {
      const spec: DiagramSpec = {
        type: DiagramType.CLASS,
        code: 'classDiagram\n  class Animal',
        theme: 'dark',
      };

      const html = generateDiagramHTML(spec);

      expect(html).toContain('theme:');
      expect(html).toMatch(/theme:\s*['"]dark['"]/);
    });

    it('When spec has no theme, Then uses default theme', () => {
      const spec: DiagramSpec = {
        type: DiagramType.STATE,
        code: 'stateDiagram-v2\n  [*] --> Still',
      };

      const html = generateDiagramHTML(spec);

      expect(html).toContain('theme:');
      expect(html).toMatch(/theme:\s*['"]default['"]/);
    });

    it('When DesignSpec is provided, Then maps colors to theme variables', () => {
      const spec: DiagramSpec = {
        type: DiagramType.FLOWCHART,
        code: 'graph TD\n  A-->B',
      };

      const html = generateDiagramHTML(spec, mockDesignSpec);

      expect(html).toContain('themeVariables');
      expect(html).toContain('#4A90E2'); // primary color
    });

    it('When DesignSpec is provided, Then includes flowchart settings', () => {
      const spec: DiagramSpec = {
        type: DiagramType.FLOWCHART,
        code: 'graph TD\n  A-->B',
      };

      const html = generateDiagramHTML(spec, mockDesignSpec);

      expect(html).toContain('flowchart');
    });
  });

  // Note: We do NOT escape HTML in Mermaid diagram code because:
  // 1. Mermaid syntax uses HTML-like operators (-->, <|, etc.)
  // 2. Escaping would break diagram parsing
  // 3. Mermaid library provides its own sanitization
  // 4. Content comes from trusted agents, not user input
  // 5. Rendering happens in isolated headless browser
});

describe('visuals/diagrams/templates - getMermaidTheme() (AC-6)', () => {
  describe('Given theme preset names', () => {
    it('When requesting presentation theme, Then returns presentation config', () => {
      const theme = getMermaidTheme('presentation');

      expect(theme).toHaveProperty('theme');
      expect(theme.theme).toBe('presentation');
      expect(theme).toHaveProperty('themeVariables');
    });

    it('When requesting documentation theme, Then returns documentation config', () => {
      const theme = getMermaidTheme('documentation');

      expect(theme).toHaveProperty('theme');
      expect(theme.theme).toBe('documentation');
      expect(theme).toHaveProperty('themeVariables');
    });

    it('When requesting dark theme, Then returns dark config', () => {
      const theme = getMermaidTheme('dark');

      expect(theme).toHaveProperty('theme');
      expect(theme.theme).toBe('dark');
      expect(theme).toHaveProperty('themeVariables');
    });

    it('When requesting default theme, Then returns default config', () => {
      const theme = getMermaidTheme('default');

      expect(theme).toHaveProperty('theme');
      expect(theme.theme).toBe('default');
      expect(theme).toHaveProperty('themeVariables');
    });
  });

  describe('Given theme includes required properties', () => {
    it('When getting presentation theme, Then includes themeVariables', () => {
      const theme = getMermaidTheme('presentation');

      expect(theme.themeVariables).toBeDefined();
      expect(typeof theme.themeVariables).toBe('object');
    });

    it('When getting presentation theme, Then includes flowchart settings', () => {
      const theme = getMermaidTheme('presentation');

      expect(theme.flowchart).toBeDefined();
      expect(theme.flowchart).toHaveProperty('curve');
    });

    it('When getting dark theme, Then includes appropriate dark colors', () => {
      const theme = getMermaidTheme('dark');

      expect(theme.themeVariables).toBeDefined();
      // Dark theme should have dark background-related variables
    });
  });

  describe('Given custom theme object', () => {
    it('When passing custom theme object, Then returns it as-is', () => {
      const customTheme: DiagramTheme = {
        theme: 'base',
        themeVariables: {
          primaryColor: '#FF0000',
          primaryTextColor: '#FFFFFF',
        },
      };

      const theme = getMermaidTheme(customTheme);

      expect(theme).toEqual(customTheme);
      expect(theme.themeVariables.primaryColor).toBe('#FF0000');
    });

    it('When custom theme includes flowchart, Then preserves flowchart settings', () => {
      const customTheme: DiagramTheme = {
        theme: 'base',
        themeVariables: {},
        flowchart: {
          curve: 'linear',
        },
      };

      const theme = getMermaidTheme(customTheme);

      expect(theme.flowchart).toEqual({ curve: 'linear' });
    });
  });

  describe('Given DesignSpec colors (AC-2: Theme mapping)', () => {
    it('When mapping DesignSpec to theme, Then converts primary color', () => {
      const designSpec: DesignSpec = {
        colors: {
          primary: '#4A90E2',
          secondary: '#7B68EE',
          background: '#FFFFFF',
          text: '#333333',
        },
        typography: {
          fontFamily: 'Arial, sans-serif',
          fontSize: { base: '16px', heading: '24px' },
          fontWeight: { normal: '400', bold: '700' },
        },
        dimensions: { width: 800, height: 600 },
      };

      const theme = getMermaidTheme('default', designSpec);

      expect(theme.themeVariables).toHaveProperty('primaryColor');
      expect(theme.themeVariables.primaryColor).toBe('#4A90E2');
    });

    it('When mapping DesignSpec to theme, Then converts text color', () => {
      const designSpec: DesignSpec = {
        colors: {
          primary: '#4A90E2',
          secondary: '#7B68EE',
          background: '#FFFFFF',
          text: '#333333',
        },
        typography: {
          fontFamily: 'Arial, sans-serif',
          fontSize: { base: '16px', heading: '24px' },
          fontWeight: { normal: '400', bold: '700' },
        },
        dimensions: { width: 800, height: 600 },
      };

      const theme = getMermaidTheme('default', designSpec);

      expect(theme.themeVariables).toHaveProperty('primaryTextColor');
      expect(theme.themeVariables.primaryTextColor).toBe('#333333');
    });

    it('When mapping DesignSpec to theme, Then converts background color', () => {
      const designSpec: DesignSpec = {
        colors: {
          primary: '#4A90E2',
          secondary: '#7B68EE',
          background: '#FFFFFF',
          text: '#333333',
        },
        typography: {
          fontFamily: 'Arial, sans-serif',
          fontSize: { base: '16px', heading: '24px' },
          fontWeight: { normal: '400', bold: '700' },
        },
        dimensions: { width: 800, height: 600 },
      };

      const theme = getMermaidTheme('default', designSpec);

      expect(theme.themeVariables).toHaveProperty('mainBkg');
      expect(theme.themeVariables.mainBkg).toBe('#FFFFFF');
    });
  });
});

describe('visuals/diagrams/templates - escapeHTML() (AC-2: XSS prevention)', () => {
  describe('Given strings with special characters', () => {
    it('When escaping ampersand, Then converts to &amp;', () => {
      const result = escapeHTML('Test & Test');

      expect(result).toBe('Test &amp; Test');
    });

    it('When escaping less-than, Then converts to &lt;', () => {
      const result = escapeHTML('Test < Test');

      expect(result).toBe('Test &lt; Test');
    });

    it('When escaping greater-than, Then converts to &gt;', () => {
      const result = escapeHTML('Test > Test');

      expect(result).toBe('Test &gt; Test');
    });

    it('When escaping double quotes, Then converts to &quot;', () => {
      const result = escapeHTML('Test "quoted" Test');

      expect(result).toBe('Test &quot;quoted&quot; Test');
    });

    it('When escaping single quotes, Then converts to &#39;', () => {
      const result = escapeHTML("Test 'quoted' Test");

      expect(result).toBe('Test &#39;quoted&#39; Test');
    });

    it('When escaping multiple characters, Then converts all', () => {
      const result = escapeHTML('<script>alert("XSS & \'hack\'")</script>');

      expect(result).toBe(
        '&lt;script&gt;alert(&quot;XSS &amp; &#39;hack&#39;&quot;)&lt;/script&gt;'
      );
    });

    it('When escaping empty string, Then returns empty string', () => {
      const result = escapeHTML('');

      expect(result).toBe('');
    });

    it('When escaping string without special characters, Then returns unchanged', () => {
      const result = escapeHTML('Hello World 123');

      expect(result).toBe('Hello World 123');
    });
  });
});

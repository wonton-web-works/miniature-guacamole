/**
 * WS-DIAGRAMS: Mermaid Diagram Generation - Type Tests
 *
 * BDD Scenarios:
 * - AC-1: Type Safety - All interfaces, enums, and type guards
 * - DiagramSpec interface structure validation
 * - DiagramType enum with 8 diagram types
 * - DiagramTheme interface structure
 * - DiagramOutput interface structure
 * - Type guards for runtime validation
 *
 * Target: 99% coverage
 */

import { describe, it, expect } from 'vitest';
import {
  DiagramType,
  type DiagramSpec,
  type DiagramTheme,
  type DiagramOutput,
  isDiagramSpec,
} from '@/visuals/diagrams/types';

describe('visuals/diagrams/types - DiagramType enum (AC-1)', () => {
  describe('Given DiagramType enum', () => {
    it('When accessing DiagramType, Then includes flowchart type', () => {
      expect(DiagramType.FLOWCHART).toBe('flowchart');
    });

    it('When accessing DiagramType, Then includes sequence type', () => {
      expect(DiagramType.SEQUENCE).toBe('sequence');
    });

    it('When accessing DiagramType, Then includes class type', () => {
      expect(DiagramType.CLASS).toBe('class');
    });

    it('When accessing DiagramType, Then includes state type', () => {
      expect(DiagramType.STATE).toBe('state');
    });

    it('When accessing DiagramType, Then includes er type', () => {
      expect(DiagramType.ER).toBe('er');
    });

    it('When accessing DiagramType, Then includes gantt type', () => {
      expect(DiagramType.GANTT).toBe('gantt');
    });

    it('When accessing DiagramType, Then includes pie type', () => {
      expect(DiagramType.PIE).toBe('pie');
    });

    it('When accessing DiagramType, Then includes journey type', () => {
      expect(DiagramType.JOURNEY).toBe('journey');
    });

    it('When counting enum values, Then has exactly 8 types', () => {
      const types = Object.values(DiagramType);
      expect(types).toHaveLength(8);
    });
  });
});

describe('visuals/diagrams/types - DiagramSpec interface (AC-1)', () => {
  describe('Given valid DiagramSpec', () => {
    it('When creating DiagramSpec, Then accepts required fields only', () => {
      const spec: DiagramSpec = {
        type: DiagramType.FLOWCHART,
        code: 'graph TD\n  A-->B',
      };

      expect(spec.type).toBe('flowchart');
      expect(spec.code).toBe('graph TD\n  A-->B');
    });

    it('When creating DiagramSpec, Then accepts all fields', () => {
      const spec: DiagramSpec = {
        type: DiagramType.SEQUENCE,
        code: 'sequenceDiagram\n  A->>B: Hello',
        theme: 'presentation',
        format: 'png',
        filename: 'my-diagram.png',
      };

      expect(spec.type).toBe('sequence');
      expect(spec.code).toBeDefined();
      expect(spec.theme).toBe('presentation');
      expect(spec.format).toBe('png');
      expect(spec.filename).toBe('my-diagram.png');
    });

    it('When creating DiagramSpec, Then theme is optional', () => {
      const spec: DiagramSpec = {
        type: DiagramType.CLASS,
        code: 'classDiagram\n  class Animal',
      };

      expect(spec.theme).toBeUndefined();
    });

    it('When creating DiagramSpec, Then format is optional', () => {
      const spec: DiagramSpec = {
        type: DiagramType.STATE,
        code: 'stateDiagram-v2\n  [*] --> Still',
      };

      expect(spec.format).toBeUndefined();
    });

    it('When creating DiagramSpec, Then filename is optional', () => {
      const spec: DiagramSpec = {
        type: DiagramType.ER,
        code: 'erDiagram\n  CUSTOMER ||--o{ ORDER : places',
      };

      expect(spec.filename).toBeUndefined();
    });

    it('When format is specified, Then accepts svg', () => {
      const spec: DiagramSpec = {
        type: DiagramType.GANTT,
        code: 'gantt\n  title Project',
        format: 'svg',
      };

      expect(spec.format).toBe('svg');
    });

    it('When format is specified, Then accepts png', () => {
      const spec: DiagramSpec = {
        type: DiagramType.PIE,
        code: 'pie\n  "Dogs" : 386',
        format: 'png',
      };

      expect(spec.format).toBe('png');
    });
  });
});

describe('visuals/diagrams/types - DiagramTheme interface (AC-1)', () => {
  describe('Given DiagramTheme interface', () => {
    it('When creating DiagramTheme, Then includes theme name', () => {
      const theme: DiagramTheme = {
        theme: 'default',
        themeVariables: {},
      };

      expect(theme.theme).toBe('default');
    });

    it('When creating DiagramTheme, Then includes themeVariables object', () => {
      const theme: DiagramTheme = {
        theme: 'dark',
        themeVariables: {
          primaryColor: '#1a1a1a',
          primaryTextColor: '#fff',
        },
      };

      expect(theme.themeVariables).toHaveProperty('primaryColor');
      expect(theme.themeVariables).toHaveProperty('primaryTextColor');
    });

    it('When creating DiagramTheme, Then includes optional flowchart settings', () => {
      const theme: DiagramTheme = {
        theme: 'default',
        themeVariables: {},
        flowchart: {
          curve: 'basis',
        },
      };

      expect(theme.flowchart).toHaveProperty('curve');
    });

    it('When creating DiagramTheme, Then flowchart is optional', () => {
      const theme: DiagramTheme = {
        theme: 'presentation',
        themeVariables: {
          primaryColor: '#4A90E2',
        },
      };

      expect(theme.flowchart).toBeUndefined();
    });

    it('When creating DiagramTheme, Then accepts empty themeVariables', () => {
      const theme: DiagramTheme = {
        theme: 'default',
        themeVariables: {},
      };

      expect(theme.themeVariables).toEqual({});
    });
  });
});

describe('visuals/diagrams/types - DiagramOutput interface (AC-1)', () => {
  describe('Given DiagramOutput interface', () => {
    it('When creating DiagramOutput, Then includes buffer', () => {
      const output: DiagramOutput = {
        buffer: Buffer.from('svg-content'),
        format: 'svg',
        width: 800,
        height: 600,
        metadata: {
          type: DiagramType.FLOWCHART,
          generated_at: new Date().toISOString(),
        },
      };

      expect(output.buffer).toBeInstanceOf(Buffer);
    });

    it('When creating DiagramOutput, Then includes format', () => {
      const output: DiagramOutput = {
        buffer: Buffer.from('png-content'),
        format: 'png',
        width: 1024,
        height: 768,
        metadata: {
          type: DiagramType.SEQUENCE,
          generated_at: new Date().toISOString(),
        },
      };

      expect(output.format).toBe('png');
    });

    it('When creating DiagramOutput, Then includes dimensions', () => {
      const output: DiagramOutput = {
        buffer: Buffer.from('content'),
        format: 'svg',
        width: 1920,
        height: 1080,
        metadata: {
          type: DiagramType.CLASS,
          generated_at: new Date().toISOString(),
        },
      };

      expect(output.width).toBe(1920);
      expect(output.height).toBe(1080);
    });

    it('When creating DiagramOutput, Then includes metadata', () => {
      const timestamp = new Date().toISOString();
      const output: DiagramOutput = {
        buffer: Buffer.from('content'),
        format: 'svg',
        width: 800,
        height: 600,
        metadata: {
          type: DiagramType.STATE,
          generated_at: timestamp,
          theme: 'dark',
        },
      };

      expect(output.metadata.type).toBe('state');
      expect(output.metadata.generated_at).toBe(timestamp);
      expect(output.metadata.theme).toBe('dark');
    });

    it('When creating DiagramOutput, Then metadata includes type and timestamp', () => {
      const output: DiagramOutput = {
        buffer: Buffer.from('content'),
        format: 'png',
        width: 800,
        height: 600,
        metadata: {
          type: DiagramType.ER,
          generated_at: new Date().toISOString(),
        },
      };

      expect(output.metadata).toHaveProperty('type');
      expect(output.metadata).toHaveProperty('generated_at');
    });
  });
});

describe('visuals/diagrams/types - isDiagramSpec type guard (AC-1)', () => {
  describe('Given valid objects', () => {
    it('When checking valid DiagramSpec, Then returns true', () => {
      const spec = {
        type: 'flowchart',
        code: 'graph TD\n  A-->B',
      };

      expect(isDiagramSpec(spec)).toBe(true);
    });

    it('When checking DiagramSpec with optional fields, Then returns true', () => {
      const spec = {
        type: 'sequence',
        code: 'sequenceDiagram\n  A->>B: Hello',
        theme: 'presentation',
        format: 'png',
        filename: 'test.png',
      };

      expect(isDiagramSpec(spec)).toBe(true);
    });

    it('When checking DiagramSpec with valid type enum value, Then returns true', () => {
      const spec = {
        type: 'gantt',
        code: 'gantt\n  title Project Timeline',
      };

      expect(isDiagramSpec(spec)).toBe(true);
    });
  });

  describe('Given invalid objects', () => {
    it('When checking object missing type, Then returns false', () => {
      const spec = {
        code: 'graph TD\n  A-->B',
      };

      expect(isDiagramSpec(spec)).toBe(false);
    });

    it('When checking object missing code, Then returns false', () => {
      const spec = {
        type: 'flowchart',
      };

      expect(isDiagramSpec(spec)).toBe(false);
    });

    it('When checking object with invalid type, Then returns false', () => {
      const spec = {
        type: 'invalid-type',
        code: 'graph TD\n  A-->B',
      };

      expect(isDiagramSpec(spec)).toBe(false);
    });

    it('When checking object with non-string type, Then returns false', () => {
      const spec = {
        type: 123,
        code: 'graph TD\n  A-->B',
      };

      expect(isDiagramSpec(spec)).toBe(false);
    });

    it('When checking object with non-string code, Then returns false', () => {
      const spec = {
        type: 'flowchart',
        code: 123,
      };

      expect(isDiagramSpec(spec)).toBe(false);
    });

    it('When checking null, Then returns false', () => {
      expect(isDiagramSpec(null)).toBe(false);
    });

    it('When checking undefined, Then returns false', () => {
      expect(isDiagramSpec(undefined)).toBe(false);
    });

    it('When checking array, Then returns false', () => {
      expect(isDiagramSpec([])).toBe(false);
    });

    it('When checking string, Then returns false', () => {
      expect(isDiagramSpec('not an object')).toBe(false);
    });

    it('When checking number, Then returns false', () => {
      expect(isDiagramSpec(123)).toBe(false);
    });
  });

  describe('Given edge cases', () => {
    it('When checking empty object, Then returns false', () => {
      expect(isDiagramSpec({})).toBe(false);
    });

    it('When checking object with extra fields, Then returns true', () => {
      const spec = {
        type: 'flowchart',
        code: 'graph TD\n  A-->B',
        extraField: 'should not affect validation',
      };

      expect(isDiagramSpec(spec)).toBe(true);
    });

    it('When checking object with empty string type, Then returns false', () => {
      const spec = {
        type: '',
        code: 'graph TD\n  A-->B',
      };

      expect(isDiagramSpec(spec)).toBe(false);
    });

    it('When checking object with empty string code, Then returns false', () => {
      const spec = {
        type: 'flowchart',
        code: '',
      };

      expect(isDiagramSpec(spec)).toBe(false);
    });
  });
});

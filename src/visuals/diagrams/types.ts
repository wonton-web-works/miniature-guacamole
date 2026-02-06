/**
 * WS-DIAGRAMS: Mermaid Diagram Generation - Type Definitions
 *
 * Core types for Mermaid diagram generation.
 */

export enum DiagramType {
  FLOWCHART = 'flowchart',
  SEQUENCE = 'sequence',
  CLASS = 'class',
  STATE = 'state',
  ER = 'er',
  GANTT = 'gantt',
  PIE = 'pie',
  JOURNEY = 'journey',
}

export interface DiagramSpec {
  type: DiagramType | string;
  code: string;
  theme?: 'presentation' | 'documentation' | 'dark';
  format?: 'svg' | 'png';
  filename?: string;
}

export interface DiagramTheme {
  theme: string;
  themeVariables: Record<string, any>;
  flowchart?: {
    curve?: string;
    [key: string]: any;
  };
  sequence?: {
    [key: string]: any;
  };
}

export interface DiagramOutput {
  buffer: Buffer;
  format: 'svg' | 'png';
  width: number;
  height: number;
  metadata: {
    type: DiagramType | string;
    generated_at: string;
    theme?: string;
    [key: string]: any;
  };
}

export interface MermaidConfig extends DiagramTheme {}

export function isDiagramSpec(obj: any): obj is DiagramSpec {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  // Check required fields
  if (typeof obj.type !== 'string' || !obj.type) {
    return false;
  }

  if (typeof obj.code !== 'string' || !obj.code) {
    return false;
  }

  // Check type is valid
  const validTypes = Object.values(DiagramType);
  if (!validTypes.includes(obj.type as DiagramType)) {
    return false;
  }

  return true;
}

export class DiagramSyntaxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DiagramSyntaxError';
  }
}

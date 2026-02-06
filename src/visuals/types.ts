/**
 * WS-17: Visual Generation Infrastructure - Type Definitions
 *
 * Core interfaces for visual generation configuration and design specifications.
 */

export interface VisualConfig {
  enabled: boolean;
  output_dir: string;
  templates_dir: string;
}

export interface DesignSpec {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    [key: string]: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      base: string;
      heading: string;
      [key: string]: string;
    };
    fontWeight: {
      normal: string;
      bold: string;
      [key: string]: string;
    };
  };
  dimensions: {
    width: number;
    height: number;
    padding?: number;
    margin?: number;
    [key: string]: number | undefined;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// WS-DIAGRAMS: Diagram types
export type { DiagramSpec, DiagramTheme, DiagramOutput, MermaidConfig } from './diagrams/types';
export { DiagramType, DiagramSyntaxError, isDiagramSpec } from './diagrams/types';

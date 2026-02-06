/**
 * WS-DIAGRAMS: Mermaid Diagram Generation - Template Generation
 *
 * Generates HTML documents with Mermaid diagrams.
 */

import type { DiagramSpec, DiagramTheme, MermaidConfig } from './types';
import type { DesignSpec } from '../types';

/**
 * Escapes HTML special characters to prevent XSS.
 */
export function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Gets Mermaid theme configuration by name or custom theme object.
 */
export function getMermaidTheme(
  theme: 'presentation' | 'documentation' | 'dark' | 'default' | DiagramTheme,
  designSpec?: DesignSpec
): MermaidConfig {
  // If custom theme object is provided, return it as-is
  if (typeof theme === 'object') {
    return theme;
  }

  // Base theme configurations
  const baseThemes: Record<string, MermaidConfig> = {
    presentation: {
      theme: 'presentation',
      themeVariables: {
        primaryColor: '#0066cc',
        primaryTextColor: '#333333',
        fontSize: '16px',
        fontFamily: 'Inter, Arial, sans-serif',
      },
      flowchart: {
        curve: 'basis',
      },
    },
    documentation: {
      theme: 'documentation',
      themeVariables: {
        primaryColor: '#5a67d8',
        primaryTextColor: '#1a202c',
        fontSize: '14px',
        fontFamily: 'monospace',
      },
      flowchart: {
        curve: 'basis',
      },
    },
    dark: {
      theme: 'dark',
      themeVariables: {
        primaryColor: '#4299e1',
        primaryTextColor: '#e2e8f0',
        background: '#1a202c',
        mainBkg: '#2d3748',
      },
      flowchart: {
        curve: 'basis',
      },
    },
    default: {
      theme: 'default',
      themeVariables: {},
      flowchart: {
        curve: 'basis',
      },
    },
  };

  const config = baseThemes[theme] || baseThemes.default;

  // If DesignSpec is provided, merge colors
  if (designSpec) {
    config.themeVariables = {
      ...config.themeVariables,
      primaryColor: designSpec.colors.primary,
      primaryTextColor: designSpec.colors.text,
      mainBkg: designSpec.colors.background,
    };
  }

  return config;
}

/**
 * Generates complete HTML document with Mermaid diagram.
 */
export function generateDiagramHTML(spec: DiagramSpec, designSpec?: DesignSpec): string {
  // Get theme configuration
  const themeName = spec.theme || 'default';
  const themeConfig = getMermaidTheme(themeName, designSpec);

  // No escaping - content goes into div as text
  const escapedCode = spec.code;

  // Build Mermaid config as JavaScript object literal
  const themeVarsStr = JSON.stringify(themeConfig.themeVariables);
  const flowchartStr = themeConfig.flowchart ? JSON.stringify(themeConfig.flowchart) : 'undefined';
  const sequenceStr = themeConfig.sequence ? JSON.stringify(themeConfig.sequence) : 'undefined';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mermaid Diagram</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11.4.0/dist/mermaid.min.js"></script>
  <script>
    mermaid.initialize({
      theme: '${themeConfig.theme}',
      themeVariables: ${themeVarsStr},
      flowchart: ${flowchartStr},
      sequence: ${sequenceStr}
    });
  </script>
</head>
<body>
  <div class="mermaid">${escapedCode}</div>
</body>
</html>`;
}

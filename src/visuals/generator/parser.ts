/**
 * WS-18: Puppeteer Generation Engine - Design Spec Parser
 *
 * Converts design specifications to HTML/CSS.
 * Implements AC-2: Design spec parser converts specs to HTML/CSS.
 * Implements AC-4: Design tokens (colors, typography, spacing) injected into templates.
 */

import type { DesignSpec } from '../types';

function isValidColor(color: string): boolean {
  // Check for hex, rgb, rgba formats
  const hexRegex = /^#([0-9A-Fa-f]{3}){1,2}$/;
  const rgbRegex = /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/;
  const rgbaRegex = /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/;

  return hexRegex.test(color) || rgbRegex.test(color) || rgbaRegex.test(color);
}

export function parseColorsToCSS(colors: Record<string, string>): string {
  if (!colors) {
    throw new Error('Colors object is required');
  }

  // Validate color formats
  for (const [key, value] of Object.entries(colors)) {
    if (!isValidColor(value)) {
      throw new Error(`Invalid color format: ${key}`);
    }
  }

  return createCSSVariables(colors, 'color');
}

export function parseTypographyToCSS(typography: DesignSpec['typography']): string {
  if (!typography) {
    throw new Error('Typography object is required');
  }

  if (!typography.fontFamily) {
    throw new Error('Missing required field: fontFamily');
  }

  if (!typography.fontSize) {
    throw new Error('Missing required field: fontSize');
  }

  if (!typography.fontWeight) {
    throw new Error('Missing required field: fontWeight');
  }

  let css = '';

  // Font family
  css += `  --font-family: ${typography.fontFamily};\n`;

  // Font sizes
  css += createCSSVariables(typography.fontSize, 'font-size');

  // Font weights
  css += createCSSVariables(typography.fontWeight, 'font-weight');

  return css;
}

export function parseDimensionsToCSS(dimensions: DesignSpec['dimensions']): string {
  if (!dimensions) {
    throw new Error('Dimensions object is required');
  }

  if (dimensions.width === undefined) {
    throw new Error('Missing required dimension: width');
  }

  if (dimensions.height === undefined) {
    throw new Error('Missing required dimension: height');
  }

  // Validate positive values
  for (const [key, value] of Object.entries(dimensions)) {
    if (value !== undefined && value < 0) {
      throw new Error('Dimension values must be positive');
    }
  }

  return createCSSVariables(dimensions, '');
}

export function createCSSVariables(
  vars: Record<string, string | number | undefined>,
  prefix: string
): string {
  let css = '';

  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) continue;

    const varName = prefix ? `--${prefix}-${key}` : `--${key}`;
    const varValue = typeof value === 'number' ? `${value}px` : value;

    css += `  ${varName}: ${varValue};\n`;
  }

  return css;
}

export function parseDesignSpecToCSS(designSpec: DesignSpec): string {
  if (!designSpec) {
    throw new Error('Design spec is required');
  }

  let css = ':root {\n';

  css += parseColorsToCSS(designSpec.colors);
  css += parseTypographyToCSS(designSpec.typography);
  css += parseDimensionsToCSS(designSpec.dimensions);

  css += '}';

  return css;
}

export function injectDesignTokens(template: string, designSpec: DesignSpec): string {
  if (!template) {
    return template;
  }

  let result = template;

  // Find all placeholders like {{colors.primary}}
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  const matches = template.match(placeholderRegex);

  if (!matches) {
    return template;
  }

  for (const match of matches) {
    const path = match.replace(/\{\{|\}\}/g, '').trim();
    const parts = path.split('.');

    // Navigate the design spec object
    let value: any = designSpec;
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        throw new Error(`Token not found: ${path}`);
      }
    }

    // Replace the placeholder with the actual value
    result = result.replace(match, String(value));
  }

  return result;
}

export function generateFullHTML(
  componentHTML: string,
  designSpec: DesignSpec,
  options: { title?: string; additionalCSS?: string } = {}
): string {
  const title = options.title || 'Component';
  const css = parseDesignSpecToCSS(designSpec);
  const additionalCSS = options.additionalCSS || '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
${css}

body {
  margin: 0;
  padding: 0;
  width: ${designSpec.dimensions.width}px;
  height: ${designSpec.dimensions.height}px;
  background-color: ${designSpec.colors.background};
  font-family: ${designSpec.typography.fontFamily};
  color: ${designSpec.colors.text};
}
${additionalCSS}
  </style>
</head>
<body>
${componentHTML}
</body>
</html>`;
}

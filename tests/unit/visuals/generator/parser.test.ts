/**
 * WS-18: Puppeteer Generation Engine - Design Spec Parser Tests
 *
 * BDD Scenarios:
 * - AC-2: Design spec parser converts design specs to HTML/CSS
 * - AC-4: Design tokens (colors, typography, spacing) injected into templates
 * - CSS generation from design tokens
 * - HTML structure generation
 * - Token replacement and interpolation
 *
 * Target: 99% coverage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  parseDesignSpecToCSS,
  parseColorsToCSS,
  parseTypographyToCSS,
  parseDimensionsToCSS,
  injectDesignTokens,
  generateFullHTML,
  createCSSVariables,
} from '@/visuals/generator/parser';
import type { DesignSpec } from '@/visuals/types';

describe('visuals/generator/parser - parseColorsToCSS()', () => {
  describe('Given valid color design tokens (AC-4: Color tokens)', () => {
    it('When parsing colors, Then returns CSS string', () => {
      const colors = {
        primary: '#007bff',
        secondary: '#6c757d',
        background: '#ffffff',
        text: '#212529',
      };

      const css = parseColorsToCSS(colors);

      expect(css).toBeDefined();
      expect(typeof css).toBe('string');
      expect(css.length).toBeGreaterThan(0);
    });

    it('When parsing colors, Then includes all color properties', () => {
      const colors = {
        primary: '#007bff',
        secondary: '#6c757d',
        background: '#ffffff',
        text: '#212529',
      };

      const css = parseColorsToCSS(colors);

      expect(css).toContain('#007bff');
      expect(css).toContain('#6c757d');
      expect(css).toContain('#ffffff');
      expect(css).toContain('#212529');
    });

    it('When parsing colors, Then generates CSS custom properties', () => {
      const colors = {
        primary: '#007bff',
        secondary: '#6c757d',
        background: '#ffffff',
        text: '#212529',
      };

      const css = parseColorsToCSS(colors);

      expect(css).toContain('--color-primary');
      expect(css).toContain('--color-secondary');
      expect(css).toContain('--color-background');
      expect(css).toContain('--color-text');
    });

    it('When parsing colors with rgb format, Then includes in CSS', () => {
      const colors = {
        primary: 'rgb(0, 123, 255)',
        secondary: '#6c757d',
        background: '#ffffff',
        text: '#212529',
      };

      const css = parseColorsToCSS(colors);

      expect(css).toContain('rgb(0, 123, 255)');
    });

    it('When parsing colors with rgba format, Then includes in CSS', () => {
      const colors = {
        primary: 'rgba(0, 123, 255, 0.8)',
        secondary: '#6c757d',
        background: '#ffffff',
        text: '#212529',
      };

      const css = parseColorsToCSS(colors);

      expect(css).toContain('rgba(0, 123, 255, 0.8)');
    });

    it('When parsing colors with additional custom colors, Then includes all', () => {
      const colors = {
        primary: '#007bff',
        secondary: '#6c757d',
        background: '#ffffff',
        text: '#212529',
        accent: '#ff5722',
        danger: '#dc3545',
      };

      const css = parseColorsToCSS(colors);

      expect(css).toContain('--color-accent');
      expect(css).toContain('--color-danger');
      expect(css).toContain('#ff5722');
      expect(css).toContain('#dc3545');
    });
  });

  describe('Given invalid color tokens', () => {
    it('When colors is null, Then throws error', () => {
      expect(() => parseColorsToCSS(null as any)).toThrow();
    });

    it('When colors is empty object, Then returns empty CSS variables section', () => {
      const css = parseColorsToCSS({});

      expect(css).toBeDefined();
    });

    it('When color value is invalid, Then throws error', () => {
      const colors = {
        primary: 'invalid-color',
        secondary: '#6c757d',
        background: '#ffffff',
        text: '#212529',
      };

      expect(() => parseColorsToCSS(colors)).toThrow('Invalid color format');
    });
  });
});

describe('visuals/generator/parser - parseTypographyToCSS()', () => {
  describe('Given valid typography design tokens (AC-4: Typography tokens)', () => {
    it('When parsing typography, Then returns CSS string', () => {
      const typography = {
        fontFamily: 'Arial, sans-serif',
        fontSize: {
          base: '16px',
          heading: '24px',
        },
        fontWeight: {
          normal: '400',
          bold: '700',
        },
      };

      const css = parseTypographyToCSS(typography);

      expect(css).toBeDefined();
      expect(typeof css).toBe('string');
      expect(css.length).toBeGreaterThan(0);
    });

    it('When parsing typography, Then includes font-family', () => {
      const typography = {
        fontFamily: 'Helvetica, Arial, sans-serif',
        fontSize: { base: '16px', heading: '24px' },
        fontWeight: { normal: '400', bold: '700' },
      };

      const css = parseTypographyToCSS(typography);

      expect(css).toContain('Helvetica, Arial, sans-serif');
      expect(css).toContain('--font-family');
    });

    it('When parsing typography, Then includes font sizes', () => {
      const typography = {
        fontFamily: 'Arial, sans-serif',
        fontSize: {
          base: '16px',
          heading: '24px',
          small: '12px',
          large: '20px',
        },
        fontWeight: { normal: '400', bold: '700' },
      };

      const css = parseTypographyToCSS(typography);

      expect(css).toContain('--font-size-base');
      expect(css).toContain('--font-size-heading');
      expect(css).toContain('--font-size-small');
      expect(css).toContain('--font-size-large');
      expect(css).toContain('16px');
      expect(css).toContain('24px');
      expect(css).toContain('12px');
      expect(css).toContain('20px');
    });

    it('When parsing typography, Then includes font weights', () => {
      const typography = {
        fontFamily: 'Arial, sans-serif',
        fontSize: { base: '16px', heading: '24px' },
        fontWeight: {
          normal: '400',
          bold: '700',
          light: '300',
        },
      };

      const css = parseTypographyToCSS(typography);

      expect(css).toContain('--font-weight-normal');
      expect(css).toContain('--font-weight-bold');
      expect(css).toContain('--font-weight-light');
      expect(css).toContain('400');
      expect(css).toContain('700');
      expect(css).toContain('300');
    });

    it('When parsing typography with rem units, Then includes rem values', () => {
      const typography = {
        fontFamily: 'Arial, sans-serif',
        fontSize: {
          base: '1rem',
          heading: '1.5rem',
        },
        fontWeight: { normal: '400', bold: '700' },
      };

      const css = parseTypographyToCSS(typography);

      expect(css).toContain('1rem');
      expect(css).toContain('1.5rem');
    });
  });

  describe('Given invalid typography tokens', () => {
    it('When typography is null, Then throws error', () => {
      expect(() => parseTypographyToCSS(null as any)).toThrow();
    });

    it('When fontFamily is missing, Then throws error', () => {
      const typography = {
        fontSize: { base: '16px', heading: '24px' },
        fontWeight: { normal: '400', bold: '700' },
      };

      expect(() => parseTypographyToCSS(typography as any)).toThrow(
        'Missing required field: fontFamily'
      );
    });

    it('When fontSize is missing, Then throws error', () => {
      const typography = {
        fontFamily: 'Arial, sans-serif',
        fontWeight: { normal: '400', bold: '700' },
      };

      expect(() => parseTypographyToCSS(typography as any)).toThrow(
        'Missing required field: fontSize'
      );
    });

    it('When fontWeight is missing, Then throws error', () => {
      const typography = {
        fontFamily: 'Arial, sans-serif',
        fontSize: { base: '16px', heading: '24px' },
      };

      expect(() => parseTypographyToCSS(typography as any)).toThrow(
        'Missing required field: fontWeight'
      );
    });
  });
});

describe('visuals/generator/parser - parseDimensionsToCSS()', () => {
  describe('Given valid dimension design tokens (AC-4: Spacing tokens)', () => {
    it('When parsing dimensions, Then returns CSS string', () => {
      const dimensions = {
        width: 800,
        height: 600,
        padding: 20,
        margin: 10,
      };

      const css = parseDimensionsToCSS(dimensions);

      expect(css).toBeDefined();
      expect(typeof css).toBe('string');
      expect(css.length).toBeGreaterThan(0);
    });

    it('When parsing dimensions, Then includes width and height', () => {
      const dimensions = {
        width: 800,
        height: 600,
        padding: 20,
        margin: 10,
      };

      const css = parseDimensionsToCSS(dimensions);

      expect(css).toContain('--width');
      expect(css).toContain('--height');
      expect(css).toContain('800px');
      expect(css).toContain('600px');
    });

    it('When parsing dimensions, Then includes padding', () => {
      const dimensions = {
        width: 800,
        height: 600,
        padding: 20,
        margin: 10,
      };

      const css = parseDimensionsToCSS(dimensions);

      expect(css).toContain('--padding');
      expect(css).toContain('20px');
    });

    it('When parsing dimensions, Then includes margin', () => {
      const dimensions = {
        width: 800,
        height: 600,
        padding: 20,
        margin: 10,
      };

      const css = parseDimensionsToCSS(dimensions);

      expect(css).toContain('--margin');
      expect(css).toContain('10px');
    });

    it('When parsing dimensions with additional spacing, Then includes all', () => {
      const dimensions = {
        width: 800,
        height: 600,
        padding: 20,
        margin: 10,
        borderRadius: 8,
        gap: 16,
      };

      const css = parseDimensionsToCSS(dimensions);

      expect(css).toContain('--borderRadius');
      expect(css).toContain('--gap');
      expect(css).toContain('8px');
      expect(css).toContain('16px');
    });

    it('When dimensions are numeric, Then converts to px units', () => {
      const dimensions = {
        width: 1024,
        height: 768,
        padding: 24,
        margin: 16,
      };

      const css = parseDimensionsToCSS(dimensions);

      expect(css).toContain('1024px');
      expect(css).toContain('768px');
      expect(css).toContain('24px');
      expect(css).toContain('16px');
    });
  });

  describe('Given optional dimension fields', () => {
    it('When padding is missing, Then does not include padding variable', () => {
      const dimensions = {
        width: 800,
        height: 600,
      };

      const css = parseDimensionsToCSS(dimensions);

      expect(css).not.toContain('--padding');
    });

    it('When margin is missing, Then does not include margin variable', () => {
      const dimensions = {
        width: 800,
        height: 600,
        padding: 20,
      };

      const css = parseDimensionsToCSS(dimensions);

      expect(css).not.toContain('--margin');
    });
  });

  describe('Given invalid dimension tokens', () => {
    it('When dimensions is null, Then throws error', () => {
      expect(() => parseDimensionsToCSS(null as any)).toThrow();
    });

    it('When width is missing, Then throws error', () => {
      const dimensions = {
        height: 600,
        padding: 20,
        margin: 10,
      };

      expect(() => parseDimensionsToCSS(dimensions as any)).toThrow(
        'Missing required dimension: width'
      );
    });

    it('When height is missing, Then throws error', () => {
      const dimensions = {
        width: 800,
        padding: 20,
        margin: 10,
      };

      expect(() => parseDimensionsToCSS(dimensions as any)).toThrow(
        'Missing required dimension: height'
      );
    });

    it('When width is negative, Then throws error', () => {
      const dimensions = {
        width: -800,
        height: 600,
        padding: 20,
        margin: 10,
      };

      expect(() => parseDimensionsToCSS(dimensions)).toThrow('Dimension values must be positive');
    });
  });
});

describe('visuals/generator/parser - parseDesignSpecToCSS()', () => {
  let validDesignSpec: DesignSpec;

  beforeEach(() => {
    validDesignSpec = {
      colors: {
        primary: '#007bff',
        secondary: '#6c757d',
        background: '#ffffff',
        text: '#212529',
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
        padding: 20,
        margin: 10,
      },
    };
  });

  describe('Given complete design spec (AC-2: Design spec to CSS conversion)', () => {
    it('When parsing design spec, Then returns complete CSS string', () => {
      const css = parseDesignSpecToCSS(validDesignSpec);

      expect(css).toBeDefined();
      expect(typeof css).toBe('string');
      expect(css.length).toBeGreaterThan(0);
    });

    it('When parsing design spec, Then includes all color CSS', () => {
      const css = parseDesignSpecToCSS(validDesignSpec);

      expect(css).toContain('--color-primary');
      expect(css).toContain('#007bff');
    });

    it('When parsing design spec, Then includes all typography CSS', () => {
      const css = parseDesignSpecToCSS(validDesignSpec);

      expect(css).toContain('--font-family');
      expect(css).toContain('Arial, sans-serif');
    });

    it('When parsing design spec, Then includes all dimension CSS', () => {
      const css = parseDesignSpecToCSS(validDesignSpec);

      expect(css).toContain('--width');
      expect(css).toContain('800px');
    });

    it('When parsing design spec, Then wraps in :root selector', () => {
      const css = parseDesignSpecToCSS(validDesignSpec);

      expect(css).toContain(':root');
      expect(css).toContain('{');
      expect(css).toContain('}');
    });

    it('When parsing design spec, Then produces valid CSS syntax', () => {
      const css = parseDesignSpecToCSS(validDesignSpec);

      expect(css).toMatch(/:root\s*\{[\s\S]*\}/);
    });
  });

  describe('Given invalid design spec', () => {
    it('When design spec is null, Then throws error', () => {
      expect(() => parseDesignSpecToCSS(null as any)).toThrow();
    });

    it('When colors section is missing, Then throws error', () => {
      const spec = { ...validDesignSpec };
      delete (spec as any).colors;

      expect(() => parseDesignSpecToCSS(spec as any)).toThrow();
    });

    it('When typography section is missing, Then throws error', () => {
      const spec = { ...validDesignSpec };
      delete (spec as any).typography;

      expect(() => parseDesignSpecToCSS(spec as any)).toThrow();
    });

    it('When dimensions section is missing, Then throws error', () => {
      const spec = { ...validDesignSpec };
      delete (spec as any).dimensions;

      expect(() => parseDesignSpecToCSS(spec as any)).toThrow();
    });
  });
});

describe('visuals/generator/parser - createCSSVariables()', () => {
  it('When creating CSS variables from object, Then formats as CSS custom properties', () => {
    const vars = {
      primary: '#007bff',
      secondary: '#6c757d',
    };

    const css = createCSSVariables(vars, 'color');

    expect(css).toContain('--color-primary: #007bff;');
    expect(css).toContain('--color-secondary: #6c757d;');
  });

  it('When creating CSS variables, Then adds proper indentation', () => {
    const vars = {
      primary: '#007bff',
    };

    const css = createCSSVariables(vars, 'color');

    expect(css).toMatch(/^\s+--color-primary/m);
  });

  it('When creating CSS variables with nested object, Then flattens keys', () => {
    const vars = {
      base: '16px',
      heading: '24px',
    };

    const css = createCSSVariables(vars, 'font-size');

    expect(css).toContain('--font-size-base: 16px;');
    expect(css).toContain('--font-size-heading: 24px;');
  });

  it('When creating CSS variables with numeric values, Then converts to px', () => {
    const vars = {
      width: 800,
      height: 600,
    };

    const css = createCSSVariables(vars, 'dimension');

    expect(css).toContain('--dimension-width: 800px;');
    expect(css).toContain('--dimension-height: 600px;');
  });
});

describe('visuals/generator/parser - injectDesignTokens()', () => {
  let validDesignSpec: DesignSpec;

  beforeEach(() => {
    validDesignSpec = {
      colors: {
        primary: '#007bff',
        secondary: '#6c757d',
        background: '#ffffff',
        text: '#212529',
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
        padding: 20,
        margin: 10,
      },
    };
  });

  describe('Given HTML template with token placeholders (AC-4: Token injection)', () => {
    it('When injecting design tokens, Then replaces color placeholders', () => {
      const template = '<div style="background-color: {{colors.primary}}">Content</div>';

      const result = injectDesignTokens(template, validDesignSpec);

      expect(result).toContain('#007bff');
      expect(result).not.toContain('{{colors.primary}}');
    });

    it('When injecting design tokens, Then replaces typography placeholders', () => {
      const template = '<p style="font-family: {{typography.fontFamily}}">Text</p>';

      const result = injectDesignTokens(template, validDesignSpec);

      expect(result).toContain('Arial, sans-serif');
      expect(result).not.toContain('{{typography.fontFamily}}');
    });

    it('When injecting design tokens, Then replaces dimension placeholders', () => {
      const template = '<div style="width: {{dimensions.width}}px">Content</div>';

      const result = injectDesignTokens(template, validDesignSpec);

      expect(result).toContain('800px');
      expect(result).not.toContain('{{dimensions.width}}');
    });

    it('When injecting design tokens, Then replaces nested property placeholders', () => {
      const template = '<h1 style="font-size: {{typography.fontSize.heading}}">Title</h1>';

      const result = injectDesignTokens(template, validDesignSpec);

      expect(result).toContain('24px');
      expect(result).not.toContain('{{typography.fontSize.heading}}');
    });

    it('When injecting design tokens, Then replaces multiple placeholders', () => {
      const template =
        '<div style="color: {{colors.text}}; background: {{colors.background}}; padding: {{dimensions.padding}}px">Content</div>';

      const result = injectDesignTokens(template, validDesignSpec);

      expect(result).toContain('#212529');
      expect(result).toContain('#ffffff');
      expect(result).toContain('20px');
      expect(result).not.toContain('{{');
    });

    it('When template has no placeholders, Then returns template unchanged', () => {
      const template = '<div>Plain HTML</div>';

      const result = injectDesignTokens(template, validDesignSpec);

      expect(result).toBe(template);
    });

    it('When placeholder references non-existent property, Then throws error', () => {
      const template = '<div style="color: {{colors.nonexistent}}">Content</div>';

      expect(() => injectDesignTokens(template, validDesignSpec)).toThrow(
        'Token not found: colors.nonexistent'
      );
    });
  });
});

describe('visuals/generator/parser - generateFullHTML()', () => {
  let validDesignSpec: DesignSpec;

  beforeEach(() => {
    validDesignSpec = {
      colors: {
        primary: '#007bff',
        secondary: '#6c757d',
        background: '#ffffff',
        text: '#212529',
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
        padding: 20,
        margin: 10,
      },
    };
  });

  describe('Given component HTML and design spec (AC-2: Full HTML generation)', () => {
    it('When generating full HTML, Then returns complete HTML document', () => {
      const componentHTML = '<div>Component</div>';

      const html = generateFullHTML(componentHTML, validDesignSpec);

      expect(html).toBeDefined();
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
    });

    it('When generating full HTML, Then includes head section', () => {
      const componentHTML = '<div>Component</div>';

      const html = generateFullHTML(componentHTML, validDesignSpec);

      expect(html).toContain('<head>');
      expect(html).toContain('</head>');
    });

    it('When generating full HTML, Then includes body section', () => {
      const componentHTML = '<div>Component</div>';

      const html = generateFullHTML(componentHTML, validDesignSpec);

      expect(html).toContain('<body>');
      expect(html).toContain('</body>');
    });

    it('When generating full HTML, Then includes CSS in style tag', () => {
      const componentHTML = '<div>Component</div>';

      const html = generateFullHTML(componentHTML, validDesignSpec);

      expect(html).toContain('<style>');
      expect(html).toContain('</style>');
      expect(html).toContain(':root');
      expect(html).toContain('--color-primary');
    });

    it('When generating full HTML, Then includes component HTML in body', () => {
      const componentHTML = '<div class="my-component">Component Content</div>';

      const html = generateFullHTML(componentHTML, validDesignSpec);

      expect(html).toContain('<div class="my-component">Component Content</div>');
    });

    it('When generating full HTML, Then sets viewport meta tag', () => {
      const componentHTML = '<div>Component</div>';

      const html = generateFullHTML(componentHTML, validDesignSpec);

      expect(html).toContain('<meta name="viewport"');
      expect(html).toContain('width=device-width, initial-scale=1.0');
    });

    it('When generating full HTML, Then sets charset to UTF-8', () => {
      const componentHTML = '<div>Component</div>';

      const html = generateFullHTML(componentHTML, validDesignSpec);

      expect(html).toContain('<meta charset="UTF-8"');
    });

    it('When generating full HTML, Then applies dimensions to body', () => {
      const componentHTML = '<div>Component</div>';

      const html = generateFullHTML(componentHTML, validDesignSpec);

      expect(html).toContain('800px');
      expect(html).toContain('600px');
    });

    it('When generating full HTML, Then applies background color to body', () => {
      const componentHTML = '<div>Component</div>';

      const html = generateFullHTML(componentHTML, validDesignSpec);

      expect(html).toContain('#ffffff');
    });

    it('When generating full HTML, Then produces valid HTML5 document', () => {
      const componentHTML = '<div>Component</div>';

      const html = generateFullHTML(componentHTML, validDesignSpec);

      expect(html).toMatch(/<!DOCTYPE html>/i);
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
      expect(html).toContain('<head>');
      expect(html).toContain('</head>');
      expect(html).toContain('<body>');
      expect(html).toContain('</body>');
    });
  });

  describe('Given custom options', () => {
    it('When providing custom title, Then includes in title tag', () => {
      const componentHTML = '<div>Component</div>';

      const html = generateFullHTML(componentHTML, validDesignSpec, {
        title: 'My Custom Component',
      });

      expect(html).toContain('<title>My Custom Component</title>');
    });

    it('When not providing title, Then uses default title', () => {
      const componentHTML = '<div>Component</div>';

      const html = generateFullHTML(componentHTML, validDesignSpec);

      expect(html).toContain('<title>');
    });

    it('When providing additional CSS, Then includes in style tag', () => {
      const componentHTML = '<div>Component</div>';

      const html = generateFullHTML(componentHTML, validDesignSpec, {
        additionalCSS: 'body { margin: 0; }',
      });

      expect(html).toContain('body { margin: 0; }');
    });
  });
});

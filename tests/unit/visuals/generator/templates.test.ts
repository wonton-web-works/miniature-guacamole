/**
 * WS-18: Puppeteer Generation Engine - Template Library Tests
 *
 * BDD Scenarios:
 * - AC-1: Template library with 3-4 common components (header, card, form, button)
 * - Component rendering with design tokens
 * - Template structure validation
 * - HTML/CSS output correctness
 *
 * Target: 99% coverage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateHeaderTemplate,
  generateCardTemplate,
  generateFormTemplate,
  generateButtonTemplate,
  getAvailableTemplates,
  renderTemplate,
} from '@/visuals/generator/templates';
import type { DesignSpec } from '@/visuals/types';

describe('visuals/generator/templates - generateHeaderTemplate()', () => {
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

  describe('Given valid design spec (AC-1: Header component)', () => {
    it('When generating header template, Then returns HTML string', () => {
      const html = generateHeaderTemplate(validDesignSpec);

      expect(html).toBeDefined();
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
    });

    it('When generating header, Then includes header tag', () => {
      const html = generateHeaderTemplate(validDesignSpec);

      expect(html).toContain('<header');
      expect(html).toContain('</header>');
    });

    it('When generating header, Then applies primary color from design spec', () => {
      const html = generateHeaderTemplate(validDesignSpec);

      expect(html).toContain('#007bff');
    });

    it('When generating header, Then applies typography from design spec', () => {
      const html = generateHeaderTemplate(validDesignSpec);

      expect(html).toContain('Arial, sans-serif');
      expect(html).toContain('24px');
    });

    it('When generating header, Then applies dimensions from design spec', () => {
      const html = generateHeaderTemplate(validDesignSpec);

      expect(html).toContain('800px');
    });

    it('When generating header, Then includes inline CSS styles', () => {
      const html = generateHeaderTemplate(validDesignSpec);

      expect(html).toContain('style=');
      expect(html).toContain('background-color');
      expect(html).toContain('font-family');
    });

    it('When generating header with title, Then includes title text', () => {
      const html = generateHeaderTemplate(validDesignSpec, { title: 'My Header' });

      expect(html).toContain('My Header');
    });

    it('When generating header without title, Then uses default title', () => {
      const html = generateHeaderTemplate(validDesignSpec);

      expect(html).toContain('Header');
    });

    it('When generating header, Then includes proper HTML structure', () => {
      const html = generateHeaderTemplate(validDesignSpec);

      expect(html).toContain('<h1');
      expect(html).toContain('</h1>');
    });

    it('When generating header, Then escapes HTML in title', () => {
      const html = generateHeaderTemplate(validDesignSpec, {
        title: '<script>alert("xss")</script>',
      });

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });

  describe('Given design spec with custom colors', () => {
    it('When using custom primary color, Then applies to header background', () => {
      const spec = {
        ...validDesignSpec,
        colors: { ...validDesignSpec.colors, primary: '#ff0000' },
      };

      const html = generateHeaderTemplate(spec);

      expect(html).toContain('#ff0000');
      expect(html).not.toContain('#007bff');
    });

    it('When using rgb color format, Then applies correctly', () => {
      const spec = {
        ...validDesignSpec,
        colors: { ...validDesignSpec.colors, primary: 'rgb(255, 0, 0)' },
      };

      const html = generateHeaderTemplate(spec);

      expect(html).toContain('rgb(255, 0, 0)');
    });

    it('When using rgba color format, Then applies with transparency', () => {
      const spec = {
        ...validDesignSpec,
        colors: { ...validDesignSpec.colors, primary: 'rgba(0, 123, 255, 0.8)' },
      };

      const html = generateHeaderTemplate(spec);

      expect(html).toContain('rgba(0, 123, 255, 0.8)');
    });
  });

  describe('Given design spec with custom typography', () => {
    it('When using custom font family, Then applies to header text', () => {
      const spec = {
        ...validDesignSpec,
        typography: {
          ...validDesignSpec.typography,
          fontFamily: 'Helvetica, sans-serif',
        },
      };

      const html = generateHeaderTemplate(spec);

      expect(html).toContain('Helvetica, sans-serif');
    });

    it('When using custom heading size, Then applies to h1 tag', () => {
      const spec = {
        ...validDesignSpec,
        typography: {
          ...validDesignSpec.typography,
          fontSize: { ...validDesignSpec.typography.fontSize, heading: '32px' },
        },
      };

      const html = generateHeaderTemplate(spec);

      expect(html).toContain('32px');
    });

    it('When using custom font weight, Then applies to heading', () => {
      const spec = {
        ...validDesignSpec,
        typography: {
          ...validDesignSpec.typography,
          fontWeight: { ...validDesignSpec.typography.fontWeight, bold: '900' },
        },
      };

      const html = generateHeaderTemplate(spec);

      expect(html).toContain('900');
    });
  });

  describe('Given invalid design spec', () => {
    it('When design spec is null, Then throws error', () => {
      expect(() => generateHeaderTemplate(null as any)).toThrow();
    });

    it('When design spec missing colors, Then throws error', () => {
      const spec = { ...validDesignSpec };
      delete (spec as any).colors;

      expect(() => generateHeaderTemplate(spec as any)).toThrow('Missing required field: colors');
    });

    it('When design spec missing typography, Then throws error', () => {
      const spec = { ...validDesignSpec };
      delete (spec as any).typography;

      expect(() => generateHeaderTemplate(spec as any)).toThrow(
        'Missing required field: typography'
      );
    });

    it('When design spec missing dimensions, Then throws error', () => {
      const spec = { ...validDesignSpec };
      delete (spec as any).dimensions;

      expect(() => generateHeaderTemplate(spec as any)).toThrow(
        'Missing required field: dimensions'
      );
    });
  });
});

describe('visuals/generator/templates - generateCardTemplate()', () => {
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

  describe('Given valid design spec (AC-1: Card component)', () => {
    it('When generating card template, Then returns HTML string', () => {
      const html = generateCardTemplate(validDesignSpec);

      expect(html).toBeDefined();
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
    });

    it('When generating card, Then includes card container', () => {
      const html = generateCardTemplate(validDesignSpec);

      expect(html).toContain('class="card"');
    });

    it('When generating card, Then applies background color', () => {
      const html = generateCardTemplate(validDesignSpec);

      expect(html).toContain('#ffffff');
    });

    it('When generating card, Then applies border with secondary color', () => {
      const html = generateCardTemplate(validDesignSpec);

      expect(html).toContain('border');
      expect(html).toContain('#6c757d');
    });

    it('When generating card, Then applies padding from dimensions', () => {
      const html = generateCardTemplate(validDesignSpec);

      expect(html).toContain('20px');
    });

    it('When generating card, Then includes title element', () => {
      const html = generateCardTemplate(validDesignSpec, { title: 'Card Title' });

      expect(html).toContain('Card Title');
      expect(html).toContain('<h2');
    });

    it('When generating card, Then includes body content', () => {
      const html = generateCardTemplate(validDesignSpec, { body: 'Card content here' });

      expect(html).toContain('Card content here');
    });

    it('When generating card without title, Then uses default title', () => {
      const html = generateCardTemplate(validDesignSpec);

      expect(html).toContain('Card');
    });

    it('When generating card, Then applies text color', () => {
      const html = generateCardTemplate(validDesignSpec);

      expect(html).toContain('#212529');
    });

    it('When generating card, Then includes box shadow for depth', () => {
      const html = generateCardTemplate(validDesignSpec);

      expect(html).toContain('box-shadow');
    });
  });

  describe('Given card with custom options', () => {
    it('When providing image URL, Then includes image element', () => {
      const html = generateCardTemplate(validDesignSpec, {
        imageUrl: 'https://example.com/image.png',
      });

      expect(html).toContain('<img');
      expect(html).toContain('https://example.com/image.png');
    });

    it('When providing footer text, Then includes footer element', () => {
      const html = generateCardTemplate(validDesignSpec, { footer: 'Card footer' });

      expect(html).toContain('Card footer');
    });

    it('When providing all options, Then includes all elements', () => {
      const html = generateCardTemplate(validDesignSpec, {
        title: 'Title',
        body: 'Body',
        imageUrl: 'https://example.com/img.png',
        footer: 'Footer',
      });

      expect(html).toContain('Title');
      expect(html).toContain('Body');
      expect(html).toContain('https://example.com/img.png');
      expect(html).toContain('Footer');
    });

    it('When escaping special characters, Then prevents XSS', () => {
      const html = generateCardTemplate(validDesignSpec, {
        title: '<script>alert("xss")</script>',
        body: '<img src=x onerror=alert("xss")>',
      });

      expect(html).not.toContain('<script>');
      expect(html).not.toContain('onerror=');
    });
  });
});

describe('visuals/generator/templates - generateFormTemplate()', () => {
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

  describe('Given valid design spec (AC-1: Form component)', () => {
    it('When generating form template, Then returns HTML string', () => {
      const html = generateFormTemplate(validDesignSpec);

      expect(html).toBeDefined();
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
    });

    it('When generating form, Then includes form tag', () => {
      const html = generateFormTemplate(validDesignSpec);

      expect(html).toContain('<form');
      expect(html).toContain('</form>');
    });

    it('When generating form, Then includes input fields', () => {
      const html = generateFormTemplate(validDesignSpec);

      expect(html).toContain('<input');
      expect(html).toContain('type="text"');
    });

    it('When generating form, Then includes labels', () => {
      const html = generateFormTemplate(validDesignSpec);

      expect(html).toContain('<label');
      expect(html).toContain('</label>');
    });

    it('When generating form, Then applies primary color to submit button', () => {
      const html = generateFormTemplate(validDesignSpec);

      expect(html).toContain('#007bff');
    });

    it('When generating form, Then applies typography to labels', () => {
      const html = generateFormTemplate(validDesignSpec);

      expect(html).toContain('Arial, sans-serif');
      expect(html).toContain('16px');
    });

    it('When generating form, Then includes submit button', () => {
      const html = generateFormTemplate(validDesignSpec);

      expect(html).toContain('type="submit"');
      expect(html).toContain('Submit');
    });

    it('When generating form with fields, Then includes specified fields', () => {
      const html = generateFormTemplate(validDesignSpec, {
        fields: [
          { name: 'email', label: 'Email', type: 'email' },
          { name: 'password', label: 'Password', type: 'password' },
        ],
      });

      expect(html).toContain('Email');
      expect(html).toContain('Password');
      expect(html).toContain('type="email"');
      expect(html).toContain('type="password"');
    });

    it('When generating form, Then applies padding to inputs', () => {
      const html = generateFormTemplate(validDesignSpec);

      expect(html).toContain('padding');
    });

    it('When generating form, Then includes accessible labels', () => {
      const html = generateFormTemplate(validDesignSpec, {
        fields: [{ name: 'username', label: 'Username', type: 'text' }],
      });

      expect(html).toContain('for="username"');
      expect(html).toContain('id="username"');
    });
  });

  describe('Given form with textarea', () => {
    it('When including textarea field, Then renders textarea element', () => {
      const html = generateFormTemplate(validDesignSpec, {
        fields: [{ name: 'message', label: 'Message', type: 'textarea' }],
      });

      expect(html).toContain('<textarea');
      expect(html).toContain('</textarea>');
      expect(html).toContain('Message');
    });

    it('When textarea has placeholder, Then includes placeholder attribute', () => {
      const html = generateFormTemplate(validDesignSpec, {
        fields: [
          { name: 'message', label: 'Message', type: 'textarea', placeholder: 'Enter message...' },
        ],
      });

      expect(html).toContain('placeholder="Enter message..."');
    });
  });

  describe('Given form with select dropdown', () => {
    it('When including select field, Then renders select element', () => {
      const html = generateFormTemplate(validDesignSpec, {
        fields: [
          {
            name: 'country',
            label: 'Country',
            type: 'select',
            options: ['USA', 'Canada', 'Mexico'],
          },
        ],
      });

      expect(html).toContain('<select');
      expect(html).toContain('</select>');
      expect(html).toContain('<option');
    });

    it('When select has multiple options, Then includes all options', () => {
      const html = generateFormTemplate(validDesignSpec, {
        fields: [
          {
            name: 'country',
            label: 'Country',
            type: 'select',
            options: ['USA', 'Canada', 'Mexico'],
          },
        ],
      });

      expect(html).toContain('USA');
      expect(html).toContain('Canada');
      expect(html).toContain('Mexico');
    });
  });
});

describe('visuals/generator/templates - generateButtonTemplate()', () => {
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

  describe('Given valid design spec (AC-1: Button component)', () => {
    it('When generating button template, Then returns HTML string', () => {
      const html = generateButtonTemplate(validDesignSpec);

      expect(html).toBeDefined();
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
    });

    it('When generating button, Then includes button tag', () => {
      const html = generateButtonTemplate(validDesignSpec);

      expect(html).toContain('<button');
      expect(html).toContain('</button>');
    });

    it('When generating button, Then applies primary color as background', () => {
      const html = generateButtonTemplate(validDesignSpec);

      expect(html).toContain('#007bff');
      expect(html).toContain('background-color');
    });

    it('When generating button, Then applies typography', () => {
      const html = generateButtonTemplate(validDesignSpec);

      expect(html).toContain('Arial, sans-serif');
    });

    it('When generating button, Then applies padding', () => {
      const html = generateButtonTemplate(validDesignSpec);

      expect(html).toContain('padding');
    });

    it('When generating button with text, Then includes button text', () => {
      const html = generateButtonTemplate(validDesignSpec, { text: 'Click Me' });

      expect(html).toContain('Click Me');
    });

    it('When generating button without text, Then uses default text', () => {
      const html = generateButtonTemplate(validDesignSpec);

      expect(html).toContain('Button');
    });

    it('When generating button, Then includes hover state styles', () => {
      const html = generateButtonTemplate(validDesignSpec);

      expect(html).toContain(':hover');
    });

    it('When generating button, Then applies border radius for rounded corners', () => {
      const html = generateButtonTemplate(validDesignSpec);

      expect(html).toContain('border-radius');
    });

    it('When generating button, Then uses white text color', () => {
      const html = generateButtonTemplate(validDesignSpec);

      expect(html).toContain('#ffffff');
      expect(html).toContain('color');
    });
  });

  describe('Given button with variant styles', () => {
    it('When variant is secondary, Then uses secondary color', () => {
      const html = generateButtonTemplate(validDesignSpec, { variant: 'secondary' });

      expect(html).toContain('#6c757d');
    });

    it('When variant is outline, Then uses transparent background with border', () => {
      const html = generateButtonTemplate(validDesignSpec, { variant: 'outline' });

      expect(html).toContain('border');
      expect(html).toContain('#007bff');
    });

    it('When variant is text, Then uses no background', () => {
      const html = generateButtonTemplate(validDesignSpec, { variant: 'text' });

      expect(html).toContain('transparent');
    });
  });

  describe('Given button with size options', () => {
    it('When size is small, Then applies smaller padding', () => {
      const html = generateButtonTemplate(validDesignSpec, { size: 'small' });

      expect(html).toContain('padding');
    });

    it('When size is large, Then applies larger padding', () => {
      const html = generateButtonTemplate(validDesignSpec, { size: 'large' });

      expect(html).toContain('padding');
    });
  });

  describe('Given button with disabled state', () => {
    it('When disabled is true, Then includes disabled attribute', () => {
      const html = generateButtonTemplate(validDesignSpec, { disabled: true });

      expect(html).toContain('disabled');
    });

    it('When disabled is true, Then applies disabled opacity styles', () => {
      const html = generateButtonTemplate(validDesignSpec, { disabled: true });

      expect(html).toContain('opacity');
    });
  });
});

describe('visuals/generator/templates - getAvailableTemplates()', () => {
  it('When getting available templates, Then returns array of template names', () => {
    const templates = getAvailableTemplates();

    expect(Array.isArray(templates)).toBe(true);
    expect(templates.length).toBeGreaterThan(0);
  });

  it('When getting available templates, Then includes header', () => {
    const templates = getAvailableTemplates();

    expect(templates).toContain('header');
  });

  it('When getting available templates, Then includes card', () => {
    const templates = getAvailableTemplates();

    expect(templates).toContain('card');
  });

  it('When getting available templates, Then includes form', () => {
    const templates = getAvailableTemplates();

    expect(templates).toContain('form');
  });

  it('When getting available templates, Then includes button', () => {
    const templates = getAvailableTemplates();

    expect(templates).toContain('button');
  });

  it('When getting available templates, Then returns at least 4 templates (AC-1)', () => {
    const templates = getAvailableTemplates();

    expect(templates.length).toBeGreaterThanOrEqual(4);
  });
});

describe('visuals/generator/templates - renderTemplate()', () => {
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

  describe('Given valid template name', () => {
    it('When rendering header template, Then returns HTML', () => {
      const html = renderTemplate('header', validDesignSpec);

      expect(html).toBeDefined();
      expect(html).toContain('<header');
    });

    it('When rendering card template, Then returns HTML', () => {
      const html = renderTemplate('card', validDesignSpec);

      expect(html).toBeDefined();
      expect(html).toContain('class="card"');
    });

    it('When rendering form template, Then returns HTML', () => {
      const html = renderTemplate('form', validDesignSpec);

      expect(html).toBeDefined();
      expect(html).toContain('<form');
    });

    it('When rendering button template, Then returns HTML', () => {
      const html = renderTemplate('button', validDesignSpec);

      expect(html).toBeDefined();
      expect(html).toContain('<button');
    });
  });

  describe('Given invalid template name', () => {
    it('When template name does not exist, Then throws error', () => {
      expect(() => renderTemplate('invalid-template', validDesignSpec)).toThrow(
        'Unknown template: invalid-template'
      );
    });

    it('When template name is empty, Then throws error', () => {
      expect(() => renderTemplate('', validDesignSpec)).toThrow();
    });

    it('When template name is null, Then throws error', () => {
      expect(() => renderTemplate(null as any, validDesignSpec)).toThrow();
    });
  });

  describe('Given template with options', () => {
    it('When passing options to template, Then applies options', () => {
      const html = renderTemplate('header', validDesignSpec, { title: 'Custom Title' });

      expect(html).toContain('Custom Title');
    });

    it('When passing multiple options, Then applies all options', () => {
      const html = renderTemplate('card', validDesignSpec, {
        title: 'Card Title',
        body: 'Card Body',
      });

      expect(html).toContain('Card Title');
      expect(html).toContain('Card Body');
    });
  });
});

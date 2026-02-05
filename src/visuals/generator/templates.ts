/**
 * WS-18: Puppeteer Generation Engine - Template Library
 *
 * Provides HTML template generation for common UI components.
 * Implements AC-1: Template library with header, card, form, button components.
 */

import type { DesignSpec } from '@/visuals/types';

interface TemplateOptions {
  title?: string;
  text?: string;
  body?: string;
  imageUrl?: string;
  footer?: string;
  fields?: Array<{
    name: string;
    label: string;
    type: string;
    placeholder?: string;
    options?: string[];
  }>;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/=/g, '&#61;');
}

function validateDesignSpec(spec: DesignSpec): void {
  if (!spec) {
    throw new Error('Design spec is required');
  }
  if (!spec.colors) {
    throw new Error('Missing required field: colors');
  }
  if (!spec.typography) {
    throw new Error('Missing required field: typography');
  }
  if (!spec.dimensions) {
    throw new Error('Missing required field: dimensions');
  }
}

export function generateHeaderTemplate(
  designSpec: DesignSpec,
  options: TemplateOptions = {}
): string {
  validateDesignSpec(designSpec);

  const title = options.title ? escapeHtml(options.title) : 'Header';
  const { colors, typography, dimensions } = designSpec;

  return `<header style="background-color: ${colors.primary}; color: #ffffff; padding: ${dimensions.padding}px; width: ${dimensions.width}px; font-family: ${typography.fontFamily}; box-sizing: border-box;">
  <h1 style="margin: 0; font-size: ${typography.fontSize.heading}; font-weight: ${typography.fontWeight.bold};">${title}</h1>
</header>`;
}

export function generateCardTemplate(
  designSpec: DesignSpec,
  options: TemplateOptions = {}
): string {
  validateDesignSpec(designSpec);

  const title = options.title ? escapeHtml(options.title) : 'Card';
  const body = options.body ? escapeHtml(options.body) : '';
  const imageUrl = options.imageUrl || '';
  const footer = options.footer ? escapeHtml(options.footer) : '';
  const { colors, typography, dimensions } = designSpec;

  let html = `<div class="card" style="background-color: ${colors.background}; border: 1px solid ${colors.secondary}; border-radius: 8px; padding: ${dimensions.padding}px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); color: ${colors.text}; font-family: ${typography.fontFamily};">`;

  if (imageUrl) {
    html += `\n  <img src="${imageUrl}" style="width: 100%; border-radius: 4px; margin-bottom: ${dimensions.padding}px;" alt="Card image">`;
  }

  html += `\n  <h2 style="margin: 0 0 ${dimensions.padding}px 0; font-size: ${typography.fontSize.heading}; font-weight: ${typography.fontWeight.bold};">${title}</h2>`;

  if (body) {
    html += `\n  <p style="margin: 0; font-size: ${typography.fontSize.base}; line-height: 1.5;">${body}</p>`;
  }

  if (footer) {
    html += `\n  <div style="margin-top: ${dimensions.padding}px; padding-top: ${dimensions.padding}px; border-top: 1px solid ${colors.secondary}; font-size: 14px; color: ${colors.secondary};">${footer}</div>`;
  }

  html += '\n</div>';

  return html;
}

export function generateFormTemplate(
  designSpec: DesignSpec,
  options: TemplateOptions = {}
): string {
  validateDesignSpec(designSpec);

  const { colors, typography, dimensions } = designSpec;
  const fields = options.fields || [
    { name: 'name', label: 'Name', type: 'text' },
    { name: 'email', label: 'Email', type: 'email' },
  ];

  let html = `<form style="font-family: ${typography.fontFamily}; color: ${colors.text};">`;

  for (const field of fields) {
    const label = escapeHtml(field.label);
    const fieldId = field.name;

    html += `\n  <div style="margin-bottom: ${dimensions.padding}px;">`;
    html += `\n    <label for="${fieldId}" style="display: block; margin-bottom: 8px; font-size: ${typography.fontSize.base}; font-weight: ${typography.fontWeight.normal};">${label}</label>`;

    if (field.type === 'textarea') {
      const placeholder = field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : '';
      html += `\n    <textarea id="${fieldId}" name="${field.name}" ${placeholder} style="width: 100%; padding: ${dimensions.padding / 2}px; font-size: ${typography.fontSize.base}; font-family: ${typography.fontFamily}; border: 1px solid ${colors.secondary}; border-radius: 4px; box-sizing: border-box;"></textarea>`;
    } else if (field.type === 'select' && field.options) {
      html += `\n    <select id="${fieldId}" name="${field.name}" style="width: 100%; padding: ${dimensions.padding / 2}px; font-size: ${typography.fontSize.base}; font-family: ${typography.fontFamily}; border: 1px solid ${colors.secondary}; border-radius: 4px; box-sizing: border-box;">`;
      for (const option of field.options) {
        html += `\n      <option>${escapeHtml(option)}</option>`;
      }
      html += '\n    </select>';
    } else {
      const placeholder = field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : '';
      html += `\n    <input type="${field.type}" id="${fieldId}" name="${field.name}" ${placeholder} style="width: 100%; padding: ${dimensions.padding / 2}px; font-size: ${typography.fontSize.base}; font-family: ${typography.fontFamily}; border: 1px solid ${colors.secondary}; border-radius: 4px; box-sizing: border-box;">`;
    }

    html += '\n  </div>';
  }

  html += `\n  <button type="submit" style="background-color: ${colors.primary}; color: #ffffff; padding: ${dimensions.padding / 2}px ${dimensions.padding}px; font-size: ${typography.fontSize.base}; font-family: ${typography.fontFamily}; border: none; border-radius: 4px; cursor: pointer; font-weight: ${typography.fontWeight.bold};">Submit</button>`;
  html += '\n</form>';

  return html;
}

export function generateButtonTemplate(
  designSpec: DesignSpec,
  options: TemplateOptions = {}
): string {
  validateDesignSpec(designSpec);

  const text = options.text ? escapeHtml(options.text) : 'Button';
  const { colors, typography, dimensions } = designSpec;
  const variant = options.variant || 'primary';
  const size = options.size || 'medium';
  const disabled = options.disabled || false;

  let backgroundColor: string;
  let textColor: string;
  let border = 'none';

  if (variant === 'secondary') {
    backgroundColor = colors.secondary;
    textColor = '#ffffff';
  } else if (variant === 'outline') {
    backgroundColor = 'transparent';
    textColor = colors.primary;
    border = `2px solid ${colors.primary}`;
  } else if (variant === 'text') {
    backgroundColor = 'transparent';
    textColor = colors.primary;
  } else {
    backgroundColor = colors.primary;
    textColor = '#ffffff';
  }

  let padding: string;
  if (size === 'small') {
    padding = `${dimensions.padding / 3}px ${dimensions.padding / 1.5}px`;
  } else if (size === 'large') {
    padding = `${dimensions.padding * 1.5}px ${dimensions.padding * 2}px`;
  } else {
    padding = `${dimensions.padding / 2}px ${dimensions.padding}px`;
  }

  const opacity = disabled ? 'opacity: 0.6;' : '';
  const disabledAttr = disabled ? 'disabled' : '';

  const styles = `background-color: ${backgroundColor}; color: ${textColor}; padding: ${padding}; font-size: ${typography.fontSize.base}; font-family: ${typography.fontFamily}; border: ${border}; border-radius: 4px; cursor: pointer; font-weight: ${typography.fontWeight.bold}; ${opacity}`;

  const hoverStyle = `<style>button:hover { opacity: 0.9; }</style>`;

  return `${hoverStyle}<button ${disabledAttr} style="${styles}">${text}</button>`;
}

export function getAvailableTemplates(): string[] {
  return ['header', 'card', 'form', 'button'];
}

export function renderTemplate(
  templateName: string,
  designSpec: DesignSpec,
  options: TemplateOptions = {}
): string {
  if (!templateName) {
    throw new Error('Template name is required');
  }

  switch (templateName) {
    case 'header':
      return generateHeaderTemplate(designSpec, options);
    case 'card':
      return generateCardTemplate(designSpec, options);
    case 'form':
      return generateFormTemplate(designSpec, options);
    case 'button':
      return generateButtonTemplate(designSpec, options);
    default:
      throw new Error(`Unknown template: ${templateName}`);
  }
}

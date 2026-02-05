/**
 * WS-17: Visual Generation Infrastructure - Design Spec Validator
 *
 * Validates design specifications for visual generation.
 * Checks colors, typography, and dimensions for completeness and correctness.
 */

import type { DesignSpec, ValidationResult } from './types';

/**
 * Required color fields that must be present in design spec
 */
const REQUIRED_COLORS = ['primary', 'secondary', 'background', 'text'];

/**
 * Validates a design specification and returns detailed validation results.
 * Aggregates all errors before returning (doesn't stop at first error).
 */
export function validateDesignSpec(spec: any): ValidationResult {
  const errors: string[] = [];

  // Check if spec is null/undefined
  if (!spec || typeof spec !== 'object') {
    errors.push('Design spec must be an object');
    return { valid: false, errors };
  }

  // Validate colors section
  if (spec.colors === null || spec.colors === undefined) {
    if (spec.colors === null) {
      errors.push('Invalid colors: must be an object');
    } else {
      errors.push('Missing required field: colors');
    }
  } else if (typeof spec.colors !== 'object' || Array.isArray(spec.colors)) {
    errors.push('Invalid colors: must be an object');
  } else {
    // Check required color fields
    const hasAllColors = REQUIRED_COLORS.every(color => color in spec.colors);
    if (!hasAllColors) {
      const missing = REQUIRED_COLORS.filter(color => !(color in spec.colors));
      if (missing.length === REQUIRED_COLORS.length) {
        errors.push('colors must include: primary, secondary, background, text');
      } else {
        missing.forEach(color => {
          errors.push(`Missing required color: ${color}`);
        });
      }
    }

    // Validate color formats
    for (const [key, value] of Object.entries(spec.colors)) {
      if (!isValidColorFormat(value as string)) {
        errors.push(`Invalid color format for ${key}: must be hex (#RRGGBB), rgb(), or rgba()`);
      }
    }
  }

  // Validate typography section
  if (!spec.typography) {
    errors.push('Missing required field: typography');
  } else if (typeof spec.typography !== 'object' || Array.isArray(spec.typography) || spec.typography === null) {
    errors.push('Invalid typography: must be an object');
  } else {
    // Check fontFamily
    if (spec.typography.fontFamily === undefined || spec.typography.fontFamily === null) {
      errors.push('Missing required typography field: fontFamily');
    } else if (typeof spec.typography.fontFamily === 'string' && spec.typography.fontFamily.trim() === '') {
      errors.push('fontFamily cannot be empty');
    } else if (typeof spec.typography.fontFamily !== 'string') {
      errors.push('Missing required typography field: fontFamily');
    }

    // Check fontSize
    if (!spec.typography.fontSize) {
      errors.push('Missing required typography field: fontSize');
    } else if (typeof spec.typography.fontSize === 'object' && !Array.isArray(spec.typography.fontSize)) {
      if (!spec.typography.fontSize.base) {
        errors.push('fontSize must include base size');
      }
    }

    // Check fontWeight
    if (!spec.typography.fontWeight) {
      errors.push('Missing required typography field: fontWeight');
    } else if (typeof spec.typography.fontWeight === 'object' && !Array.isArray(spec.typography.fontWeight)) {
      if (!spec.typography.fontWeight.normal) {
        errors.push('fontWeight must include normal weight');
      }
    }
  }

  // Validate dimensions section
  if (!spec.dimensions) {
    errors.push('Missing required field: dimensions');
  } else if (typeof spec.dimensions !== 'object' || Array.isArray(spec.dimensions) || spec.dimensions === null) {
    errors.push('Invalid dimensions: must be an object');
  } else {
    // Check width
    if (!('width' in spec.dimensions)) {
      errors.push('Missing required dimension: width');
    } else if (typeof spec.dimensions.width !== 'number' || spec.dimensions.width <= 0) {
      errors.push('width must be a positive number');
    }

    // Check height
    if (!('height' in spec.dimensions)) {
      errors.push('Missing required dimension: height');
    } else if (typeof spec.dimensions.height !== 'number' || spec.dimensions.height <= 0) {
      errors.push('height must be a positive number');
    }

    // Optional: padding and margin (if present, must be positive numbers)
    if ('padding' in spec.dimensions && spec.dimensions.padding !== undefined) {
      if (typeof spec.dimensions.padding !== 'number' || spec.dimensions.padding < 0) {
        errors.push('padding must be a positive number');
      }
    }

    if ('margin' in spec.dimensions && spec.dimensions.margin !== undefined) {
      if (typeof spec.dimensions.margin !== 'number' || spec.dimensions.margin < 0) {
        errors.push('margin must be a positive number');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Shorthand for checking if a design spec is valid.
 * Returns true if spec passes validation, false otherwise.
 */
export function isValidDesignSpec(spec: any): boolean {
  return validateDesignSpec(spec).valid;
}

/**
 * Shorthand for getting validation errors from a design spec.
 * Returns array of error messages.
 */
export function getValidationErrors(spec: any): string[] {
  return validateDesignSpec(spec).errors;
}

/**
 * Validates color format.
 * Accepts: #RRGGBB (6-digit hex), rgb(r, g, b), rgba(r, g, b, a)
 * Rejects: short hex (#fff), named colors (blue, red), invalid formats
 */
function isValidColorFormat(color: string): boolean {
  if (typeof color !== 'string') {
    return false;
  }

  // Check for 6-digit hex: #RRGGBB
  const hexPattern = /^#[0-9a-fA-F]{6}$/;
  if (hexPattern.test(color)) {
    return true;
  }

  // Check for rgb(r, g, b)
  const rgbPattern = /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/;
  if (rgbPattern.test(color)) {
    return true;
  }

  // Check for rgba(r, g, b, a)
  const rgbaPattern = /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/;
  if (rgbaPattern.test(color)) {
    return true;
  }

  return false;
}

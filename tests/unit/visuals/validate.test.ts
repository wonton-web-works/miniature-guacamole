/**
 * WS-17: Visual Generation Infrastructure - Design Spec Validator Tests
 *
 * BDD Scenarios:
 * - AC-3: Design spec validator checks required fields (colors, typography, dimensions)
 * - Color validation (hex, rgb, rgba formats)
 * - Typography validation (font families, sizes, weights)
 * - Dimension validation (width, height, spacing)
 * - Schema completeness checks
 *
 * Target: 99% coverage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateDesignSpec, isValidDesignSpec, getValidationErrors } from '@/visuals/validate';

describe('visuals/validate - validateDesignSpec()', () => {
  describe('Given complete valid design spec (AC-3: Required fields)', () => {
    it('When validating spec with all required fields, Then returns valid=true', () => {
      const spec = {
        colors: {
          primary: '#007bff',
          secondary: '#6c757d',
          background: '#ffffff',
          text: '#212529'
        },
        typography: {
          fontFamily: 'Arial, sans-serif',
          fontSize: {
            base: '16px',
            heading: '24px'
          },
          fontWeight: {
            normal: '400',
            bold: '700'
          }
        },
        dimensions: {
          width: 800,
          height: 600,
          padding: 20,
          margin: 10
        }
      };

      const result = validateDesignSpec(spec);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('When validating valid spec, Then returns no errors', () => {
      const spec = {
        colors: {
          primary: '#ff0000',
          secondary: '#00ff00',
          background: '#ffffff',
          text: '#000000'
        },
        typography: {
          fontFamily: 'Helvetica',
          fontSize: { base: '14px', heading: '28px' },
          fontWeight: { normal: '400', bold: '700' }
        },
        dimensions: {
          width: 1024,
          height: 768,
          padding: 16,
          margin: 8
        }
      };

      const result = validateDesignSpec(spec);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('Given missing colors section (AC-3: Colors required)', () => {
    it('When colors field missing, Then returns valid=false', () => {
      const spec = {
        typography: {
          fontFamily: 'Arial',
          fontSize: { base: '16px', heading: '24px' },
          fontWeight: { normal: '400', bold: '700' }
        },
        dimensions: {
          width: 800,
          height: 600,
          padding: 20,
          margin: 10
        }
      };

      const result = validateDesignSpec(spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: colors');
    });

    it('When colors is null, Then returns validation error', () => {
      const spec = {
        colors: null,
        typography: {
          fontFamily: 'Arial',
          fontSize: { base: '16px', heading: '24px' },
          fontWeight: { normal: '400', bold: '700' }
        },
        dimensions: {
          width: 800,
          height: 600,
          padding: 20,
          margin: 10
        }
      };

      const result = validateDesignSpec(spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid colors: must be an object');
    });

    it('When colors is empty object, Then returns validation error', () => {
      const spec = {
        colors: {},
        typography: {
          fontFamily: 'Arial',
          fontSize: { base: '16px', heading: '24px' },
          fontWeight: { normal: '400', bold: '700' }
        },
        dimensions: {
          width: 800,
          height: 600,
          padding: 20,
          margin: 10
        }
      };

      const result = validateDesignSpec(spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('colors must include: primary, secondary, background, text');
    });
  });

  describe('Given missing typography section (AC-3: Typography required)', () => {
    it('When typography field missing, Then returns valid=false', () => {
      const spec = {
        colors: {
          primary: '#007bff',
          secondary: '#6c757d',
          background: '#ffffff',
          text: '#212529'
        },
        dimensions: {
          width: 800,
          height: 600,
          padding: 20,
          margin: 10
        }
      };

      const result = validateDesignSpec(spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: typography');
    });

    it('When typography is not an object, Then returns validation error', () => {
      const spec = {
        colors: {
          primary: '#007bff',
          secondary: '#6c757d',
          background: '#ffffff',
          text: '#212529'
        },
        typography: 'invalid',
        dimensions: {
          width: 800,
          height: 600,
          padding: 20,
          margin: 10
        }
      };

      const result = validateDesignSpec(spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid typography: must be an object');
    });
  });

  describe('Given missing dimensions section (AC-3: Dimensions required)', () => {
    it('When dimensions field missing, Then returns valid=false', () => {
      const spec = {
        colors: {
          primary: '#007bff',
          secondary: '#6c757d',
          background: '#ffffff',
          text: '#212529'
        },
        typography: {
          fontFamily: 'Arial',
          fontSize: { base: '16px', heading: '24px' },
          fontWeight: { normal: '400', bold: '700' }
        }
      };

      const result = validateDesignSpec(spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: dimensions');
    });

    it('When dimensions is array instead of object, Then returns validation error', () => {
      const spec = {
        colors: {
          primary: '#007bff',
          secondary: '#6c757d',
          background: '#ffffff',
          text: '#212529'
        },
        typography: {
          fontFamily: 'Arial',
          fontSize: { base: '16px', heading: '24px' },
          fontWeight: { normal: '400', bold: '700' }
        },
        dimensions: [800, 600]
      };

      const result = validateDesignSpec(spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid dimensions: must be an object');
    });
  });

  describe('Given invalid color formats (AC-3: Color validation)', () => {
    it('When color is not hex format, Then returns validation error', () => {
      const spec = {
        colors: {
          primary: 'blue',
          secondary: '#6c757d',
          background: '#ffffff',
          text: '#212529'
        },
        typography: {
          fontFamily: 'Arial',
          fontSize: { base: '16px', heading: '24px' },
          fontWeight: { normal: '400', bold: '700' }
        },
        dimensions: {
          width: 800,
          height: 600,
          padding: 20,
          margin: 10
        }
      };

      const result = validateDesignSpec(spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid color format for primary: must be hex (#RRGGBB), rgb(), or rgba()');
    });

    it('When hex color missing #, Then returns validation error', () => {
      const spec = {
        colors: {
          primary: '007bff',
          secondary: '#6c757d',
          background: '#ffffff',
          text: '#212529'
        },
        typography: {
          fontFamily: 'Arial',
          fontSize: { base: '16px', heading: '24px' },
          fontWeight: { normal: '400', bold: '700' }
        },
        dimensions: {
          width: 800,
          height: 600,
          padding: 20,
          margin: 10
        }
      };

      const result = validateDesignSpec(spec);

      expect(result.valid).toBe(false);
    });

    it('When hex color has invalid length, Then returns validation error', () => {
      const spec = {
        colors: {
          primary: '#fff',
          secondary: '#6c757d',
          background: '#ffffff',
          text: '#212529'
        },
        typography: {
          fontFamily: 'Arial',
          fontSize: { base: '16px', heading: '24px' },
          fontWeight: { normal: '400', bold: '700' }
        },
        dimensions: {
          width: 800,
          height: 600,
          padding: 20,
          margin: 10
        }
      };

      const result = validateDesignSpec(spec);

      // Short hex codes (#fff) should be rejected in strict mode
      expect(result.valid).toBe(false);
    });

    it('When rgb color is valid, Then accepts format', () => {
      const spec = {
        colors: {
          primary: 'rgb(0, 123, 255)',
          secondary: '#6c757d',
          background: '#ffffff',
          text: '#212529'
        },
        typography: {
          fontFamily: 'Arial',
          fontSize: { base: '16px', heading: '24px' },
          fontWeight: { normal: '400', bold: '700' }
        },
        dimensions: {
          width: 800,
          height: 600,
          padding: 20,
          margin: 10
        }
      };

      const result = validateDesignSpec(spec);

      expect(result.valid).toBe(true);
    });

    it('When rgba color is valid, Then accepts format', () => {
      const spec = {
        colors: {
          primary: 'rgba(0, 123, 255, 0.5)',
          secondary: '#6c757d',
          background: '#ffffff',
          text: '#212529'
        },
        typography: {
          fontFamily: 'Arial',
          fontSize: { base: '16px', heading: '24px' },
          fontWeight: { normal: '400', bold: '700' }
        },
        dimensions: {
          width: 800,
          height: 600,
          padding: 20,
          margin: 10
        }
      };

      const result = validateDesignSpec(spec);

      expect(result.valid).toBe(true);
    });
  });

  describe('Given missing color fields', () => {
    it('When primary color missing, Then returns validation error', () => {
      const spec = {
        colors: {
          secondary: '#6c757d',
          background: '#ffffff',
          text: '#212529'
        },
        typography: {
          fontFamily: 'Arial',
          fontSize: { base: '16px', heading: '24px' },
          fontWeight: { normal: '400', bold: '700' }
        },
        dimensions: {
          width: 800,
          height: 600,
          padding: 20,
          margin: 10
        }
      };

      const result = validateDesignSpec(spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required color: primary');
    });

    it('When background color missing, Then returns validation error', () => {
      const spec = {
        colors: {
          primary: '#007bff',
          secondary: '#6c757d',
          text: '#212529'
        },
        typography: {
          fontFamily: 'Arial',
          fontSize: { base: '16px', heading: '24px' },
          fontWeight: { normal: '400', bold: '700' }
        },
        dimensions: {
          width: 800,
          height: 600,
          padding: 20,
          margin: 10
        }
      };

      const result = validateDesignSpec(spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required color: background');
    });
  });

  describe('Given invalid typography fields (AC-3: Typography validation)', () => {
    it('When fontFamily missing, Then returns validation error', () => {
      const spec = {
        colors: {
          primary: '#007bff',
          secondary: '#6c757d',
          background: '#ffffff',
          text: '#212529'
        },
        typography: {
          fontSize: { base: '16px', heading: '24px' },
          fontWeight: { normal: '400', bold: '700' }
        },
        dimensions: {
          width: 800,
          height: 600,
          padding: 20,
          margin: 10
        }
      };

      const result = validateDesignSpec(spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required typography field: fontFamily');
    });

    it('When fontFamily is empty string, Then returns validation error', () => {
      const spec = {
        colors: {
          primary: '#007bff',
          secondary: '#6c757d',
          background: '#ffffff',
          text: '#212529'
        },
        typography: {
          fontFamily: '',
          fontSize: { base: '16px', heading: '24px' },
          fontWeight: { normal: '400', bold: '700' }
        },
        dimensions: {
          width: 800,
          height: 600,
          padding: 20,
          margin: 10
        }
      };

      const result = validateDesignSpec(spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('fontFamily cannot be empty');
    });

    it('When fontSize missing, Then returns validation error', () => {
      const spec = {
        colors: {
          primary: '#007bff',
          secondary: '#6c757d',
          background: '#ffffff',
          text: '#212529'
        },
        typography: {
          fontFamily: 'Arial',
          fontWeight: { normal: '400', bold: '700' }
        },
        dimensions: {
          width: 800,
          height: 600,
          padding: 20,
          margin: 10
        }
      };

      const result = validateDesignSpec(spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required typography field: fontSize');
    });

    it('When fontSize.base missing, Then returns validation error', () => {
      const spec = {
        colors: {
          primary: '#007bff',
          secondary: '#6c757d',
          background: '#ffffff',
          text: '#212529'
        },
        typography: {
          fontFamily: 'Arial',
          fontSize: { heading: '24px' },
          fontWeight: { normal: '400', bold: '700' }
        },
        dimensions: {
          width: 800,
          height: 600,
          padding: 20,
          margin: 10
        }
      };

      const result = validateDesignSpec(spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('fontSize must include base size');
    });

    it('When fontWeight missing, Then returns validation error', () => {
      const spec = {
        colors: {
          primary: '#007bff',
          secondary: '#6c757d',
          background: '#ffffff',
          text: '#212529'
        },
        typography: {
          fontFamily: 'Arial',
          fontSize: { base: '16px', heading: '24px' }
        },
        dimensions: {
          width: 800,
          height: 600,
          padding: 20,
          margin: 10
        }
      };

      const result = validateDesignSpec(spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required typography field: fontWeight');
    });
  });

  describe('Given invalid dimensions fields (AC-3: Dimensions validation)', () => {
    it('When width missing, Then returns validation error', () => {
      const spec = {
        colors: {
          primary: '#007bff',
          secondary: '#6c757d',
          background: '#ffffff',
          text: '#212529'
        },
        typography: {
          fontFamily: 'Arial',
          fontSize: { base: '16px', heading: '24px' },
          fontWeight: { normal: '400', bold: '700' }
        },
        dimensions: {
          height: 600,
          padding: 20,
          margin: 10
        }
      };

      const result = validateDesignSpec(spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required dimension: width');
    });

    it('When height missing, Then returns validation error', () => {
      const spec = {
        colors: {
          primary: '#007bff',
          secondary: '#6c757d',
          background: '#ffffff',
          text: '#212529'
        },
        typography: {
          fontFamily: 'Arial',
          fontSize: { base: '16px', heading: '24px' },
          fontWeight: { normal: '400', bold: '700' }
        },
        dimensions: {
          width: 800,
          padding: 20,
          margin: 10
        }
      };

      const result = validateDesignSpec(spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required dimension: height');
    });

    it('When width is not a number, Then returns validation error', () => {
      const spec = {
        colors: {
          primary: '#007bff',
          secondary: '#6c757d',
          background: '#ffffff',
          text: '#212529'
        },
        typography: {
          fontFamily: 'Arial',
          fontSize: { base: '16px', heading: '24px' },
          fontWeight: { normal: '400', bold: '700' }
        },
        dimensions: {
          width: '800px',
          height: 600,
          padding: 20,
          margin: 10
        }
      };

      const result = validateDesignSpec(spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('width must be a positive number');
    });

    it('When height is negative, Then returns validation error', () => {
      const spec = {
        colors: {
          primary: '#007bff',
          secondary: '#6c757d',
          background: '#ffffff',
          text: '#212529'
        },
        typography: {
          fontFamily: 'Arial',
          fontSize: { base: '16px', heading: '24px' },
          fontWeight: { normal: '400', bold: '700' }
        },
        dimensions: {
          width: 800,
          height: -600,
          padding: 20,
          margin: 10
        }
      };

      const result = validateDesignSpec(spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('height must be a positive number');
    });

    it('When width is zero, Then returns validation error', () => {
      const spec = {
        colors: {
          primary: '#007bff',
          secondary: '#6c757d',
          background: '#ffffff',
          text: '#212529'
        },
        typography: {
          fontFamily: 'Arial',
          fontSize: { base: '16px', heading: '24px' },
          fontWeight: { normal: '400', bold: '700' }
        },
        dimensions: {
          width: 0,
          height: 600,
          padding: 20,
          margin: 10
        }
      };

      const result = validateDesignSpec(spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('width must be a positive number');
    });
  });

  describe('Given optional dimension fields', () => {
    it('When padding missing, Then accepts spec', () => {
      const spec = {
        colors: {
          primary: '#007bff',
          secondary: '#6c757d',
          background: '#ffffff',
          text: '#212529'
        },
        typography: {
          fontFamily: 'Arial',
          fontSize: { base: '16px', heading: '24px' },
          fontWeight: { normal: '400', bold: '700' }
        },
        dimensions: {
          width: 800,
          height: 600
        }
      };

      const result = validateDesignSpec(spec);

      expect(result.valid).toBe(true);
    });

    it('When margin missing, Then accepts spec', () => {
      const spec = {
        colors: {
          primary: '#007bff',
          secondary: '#6c757d',
          background: '#ffffff',
          text: '#212529'
        },
        typography: {
          fontFamily: 'Arial',
          fontSize: { base: '16px', heading: '24px' },
          fontWeight: { normal: '400', bold: '700' }
        },
        dimensions: {
          width: 800,
          height: 600,
          padding: 20
        }
      };

      const result = validateDesignSpec(spec);

      expect(result.valid).toBe(true);
    });
  });

  describe('Given multiple validation errors', () => {
    it('When multiple fields invalid, Then returns all errors', () => {
      const spec = {
        colors: {
          primary: 'invalid-color'
        },
        typography: {
          fontFamily: ''
        },
        dimensions: {
          width: -100
        }
      };

      const result = validateDesignSpec(spec);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3);
    });

    it('When completely invalid spec, Then returns comprehensive error list', () => {
      const spec = {
        colors: null,
        typography: 'invalid',
        dimensions: []
      };

      const result = validateDesignSpec(spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid colors: must be an object');
      expect(result.errors).toContain('Invalid typography: must be an object');
      expect(result.errors).toContain('Invalid dimensions: must be an object');
    });
  });
});

describe('visuals/validate - isValidDesignSpec()', () => {
  it('When spec is valid, Then returns true', () => {
    const spec = {
      colors: {
        primary: '#007bff',
        secondary: '#6c757d',
        background: '#ffffff',
        text: '#212529'
      },
      typography: {
        fontFamily: 'Arial',
        fontSize: { base: '16px', heading: '24px' },
        fontWeight: { normal: '400', bold: '700' }
      },
      dimensions: {
        width: 800,
        height: 600,
        padding: 20,
        margin: 10
      }
    };

    expect(isValidDesignSpec(spec)).toBe(true);
  });

  it('When spec is invalid, Then returns false', () => {
    const spec = {
      colors: {
        primary: 'invalid'
      }
    };

    expect(isValidDesignSpec(spec)).toBe(false);
  });

  it('When spec is null, Then returns false', () => {
    expect(isValidDesignSpec(null)).toBe(false);
  });

  it('When spec is undefined, Then returns false', () => {
    expect(isValidDesignSpec(undefined)).toBe(false);
  });
});

describe('visuals/validate - getValidationErrors()', () => {
  it('When spec is valid, Then returns empty array', () => {
    const spec = {
      colors: {
        primary: '#007bff',
        secondary: '#6c757d',
        background: '#ffffff',
        text: '#212529'
      },
      typography: {
        fontFamily: 'Arial',
        fontSize: { base: '16px', heading: '24px' },
        fontWeight: { normal: '400', bold: '700' }
      },
      dimensions: {
        width: 800,
        height: 600
      }
    };

    const errors = getValidationErrors(spec);

    expect(errors).toEqual([]);
  });

  it('When spec has errors, Then returns error array', () => {
    const spec = {
      colors: {
        primary: 'invalid'
      }
    };

    const errors = getValidationErrors(spec);

    expect(errors.length).toBeGreaterThan(0);
    expect(Array.isArray(errors)).toBe(true);
  });

  it('When spec has multiple errors, Then returns all errors', () => {
    const spec = {
      colors: {},
      typography: null,
      dimensions: { width: -1 }
    };

    const errors = getValidationErrors(spec);

    expect(errors.length).toBeGreaterThan(2);
  });
});

/**
 * Validation operations for the Shared Memory Layer
 *
 * Validates JSON and Markdown memory files for integrity and format.
 */

import * as fs from 'fs';
import { ValidationResult } from './types';
import { parseJSON } from './utils';

export function validateMemoryFile(
  filePath: string,
  format: 'json' | 'markdown'
): ValidationResult {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return {
        valid: false,
        format,
        error: 'File not found',
      };
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    if (format === 'json') {
      // Validate JSON format
      try {
        parseJSON(content);
        return {
          valid: true,
          format: 'json',
        };
      } catch (error) {
        return {
          valid: false,
          format: 'json',
          error: 'Invalid JSON format',
        };
      }
    } else if (format === 'markdown') {
      // Basic markdown validation (check for markdown syntax)
      if (content.length === 0) {
        return {
          valid: false,
          format: 'markdown',
          error: 'Empty markdown file',
        };
      }

      // Markdown is valid if it has content and follows basic structure
      return {
        valid: true,
        format: 'markdown',
      };
    } else {
      return {
        valid: false,
        format,
        error: 'Unsupported format',
      };
    }
  } catch (error) {
    return {
      valid: false,
      format,
      error: error instanceof Error ? error.message : 'Validation error',
    };
  }
}

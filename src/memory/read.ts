/**
 * Read operations for the Shared Memory Layer
 *
 * Handles retrieving state from JSON files with graceful error handling
 * and support for concurrent reads without blocking.
 */

import * as fs from 'fs';
import { MemoryReadResult } from './types';
import { MEMORY_CONFIG } from './config';
import { parseJSON } from './utils';

export async function readMemory(
  filePath: string = MEMORY_CONFIG.SHARED_MEMORY_FILE
): Promise<MemoryReadResult> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        data: null,
        error: 'File not found',
      };
    }

    // Read file content
    const content = fs.readFileSync(filePath, MEMORY_CONFIG.ENCODING);

    // Parse JSON
    const data = parseJSON(content);

    return {
      success: true,
      data,
    };
  } catch (error) {
    // Handle permission errors
    if (error instanceof Error && error.message.includes('EACCES')) {
      return {
        success: false,
        data: null,
        error: 'Permission denied',
      };
    }

    // Handle JSON parsing errors
    if (error instanceof Error && error.message.includes('Invalid JSON')) {
      return {
        success: false,
        data: null,
        error: 'Invalid JSON in file',
      };
    }

    // Generic error handling
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error during read',
    };
  }
}

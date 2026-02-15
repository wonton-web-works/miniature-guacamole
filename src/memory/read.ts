/**
 * Read operations for the Shared Memory Layer
 *
 * Handles retrieving state from JSON files with graceful error handling
 * and support for concurrent reads without blocking.
 *
 * Refactored to use FileAdapter internally while maintaining backward compatibility.
 */

import * as path from 'path';
import * as fs from 'fs';
import { MemoryReadResult } from './types';
import { MEMORY_CONFIG } from './config';
import { FileAdapter } from './adapters/file-adapter';
import { parseJSON } from './utils';

// Create default adapter instance
const defaultAdapter = new FileAdapter({ baseDir: MEMORY_CONFIG.MEMORY_DIR });

export async function readMemory(
  filePath: string = MEMORY_CONFIG.SHARED_MEMORY_FILE
): Promise<MemoryReadResult> {
  try {
    // For absolute paths, use legacy implementation to maintain compatibility
    if (path.isAbsolute(filePath)) {
      // Legacy implementation for absolute paths
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          data: null,
          error: 'File not found',
        };
      }

      const content = fs.readFileSync(filePath, MEMORY_CONFIG.ENCODING);
      const data = parseJSON(content);

      return {
        success: true,
        data,
      };
    }

    // For relative paths, use FileAdapter
    const result = await defaultAdapter.read(filePath);

    // Map AdapterReadResult to MemoryReadResult
    return {
      success: result.success,
      data: result.data || null,
      error: result.error,
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

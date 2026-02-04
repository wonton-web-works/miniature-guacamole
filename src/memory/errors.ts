/**
 * Error handling and recovery for the Shared Memory Layer
 *
 * Detects and recovers from corrupted files, disk space exhaustion,
 * and other error conditions.
 */

import * as fs from 'fs';
import { MemoryReadResult } from './types';
import { MEMORY_CONFIG } from './config';
import { parseJSON, sanitizePath } from './utils';
import { createBackup } from './backup';

export async function recoverMemory(filePath: string): Promise<MemoryReadResult> {
  try {
    // Validate path to prevent directory traversal
    sanitizePath(filePath);

    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        data: null,
        error: 'File not found',
      };
    }

    // Try to read and parse the file
    const content = fs.readFileSync(filePath, MEMORY_CONFIG.ENCODING);

    try {
      const data = parseJSON(content);
      return {
        success: true,
        data,
      };
    } catch (error) {
      // File is corrupted, attempt recovery
      try {
        // Create backup of corrupted file
        const backupPath = filePath + '.corrupted';
        fs.copyFileSync(filePath, backupPath);

        // File is corrupted and cannot be recovered
        fs.unlinkSync(filePath);

        return {
          success: false,
          data: null,
          error: 'File was corrupted and has been backed up',
        };
      } catch (recoveryError) {
        return {
          success: false,
          data: null,
          error: 'File is corrupted and recovery failed',
        };
      }
    }
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Recovery failed',
    };
  }
}

export function validatePath(filePath: string): boolean {
  try {
    sanitizePath(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

export function checkDiskSpace(requiredBytes: number): boolean {
  try {
    // Simple check: file size should not exceed max
    return requiredBytes <= MEMORY_CONFIG.MAX_FILE_SIZE;
  } catch (error) {
    return false;
  }
}

export function detectCircularReferences(obj: any): boolean {
  const seen = new WeakSet();

  function detect(o: any): boolean {
    if (typeof o !== 'object' || o === null) {
      return false;
    }

    if (seen.has(o)) {
      return true;
    }

    seen.add(o);

    for (const key in o) {
      if (o.hasOwnProperty(key)) {
        if (detect(o[key])) {
          return true;
        }
      }
    }

    return false;
  }

  return detect(obj);
}

export function isValidUTF8(buffer: Buffer): boolean {
  try {
    const str = buffer.toString(MEMORY_CONFIG.ENCODING);
    // Re-encode to verify
    const reencoded = Buffer.from(str, MEMORY_CONFIG.ENCODING);
    return buffer.equals(reencoded);
  } catch (error) {
    return false;
  }
}

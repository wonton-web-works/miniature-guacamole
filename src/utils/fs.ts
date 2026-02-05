/**
 * Shared Filesystem Utilities
 *
 * Common file system operations used across the codebase.
 * DRY principle: Avoid duplicating directory creation logic.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Ensures a directory exists, creating it recursively if necessary.
 * Safe to call multiple times - idempotent operation.
 *
 * @param dirPath - Path to directory or file (directory will be extracted)
 */
export function ensureDirectoryExists(dirPath: string): void {
  // If dirPath looks like a file path, extract directory
  const directory = dirPath.includes('.') && !dirPath.endsWith('/')
    ? path.dirname(dirPath)
    : dirPath;

  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

/**
 * WS-21: Git Integration and LFS Support - Security Module
 *
 * Security utilities for git operations to prevent command injection.
 * Critical: All git operations must use execFileSync with argument arrays.
 */

import * as path from 'path';

/**
 * Validates that a file path is within the .claude/visuals/ directory.
 * Prevents directory traversal attacks.
 */
export function validateVisualPath(filePath: string): void {
  const normalized = path.normalize(filePath);

  // Check that path is within .claude/visuals/
  if (!normalized.startsWith('.claude/visuals/')) {
    throw new Error('Invalid visual path: must be within .claude/visuals/');
  }

  // Check for directory traversal attempts
  if (normalized.includes('..')) {
    throw new Error('Invalid visual path: directory traversal not allowed');
  }
}

/**
 * Validates an array of file paths.
 */
export function validateVisualPaths(filePaths: string[]): void {
  for (const filePath of filePaths) {
    validateVisualPath(filePath);
  }
}

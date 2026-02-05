/**
 * WS-17: Visual Generation Infrastructure - Directory Management
 *
 * Manages directory structure for visual generation.
 * Creates and validates workstream-specific directories with security checks.
 */

import * as fs from 'fs';
import * as path from 'path';
import { VISUAL_CONFIG } from './config';

/**
 * Creates the base visuals directory.
 * Idempotent: safe to call multiple times.
 */
export function createVisualsDirectory(basePath?: string): boolean {
  try {
    const visualsPath = basePath || path.resolve(process.cwd(), VISUAL_CONFIG.OUTPUT_DIR);

    if (!fs.existsSync(visualsPath)) {
      fs.mkdirSync(visualsPath, { recursive: true });
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Creates directory structure for a workstream.
 * Structure: .claude/visuals/WS-{id}/pending/, approved/, archive/
 *
 * Security: Sanitizes workstream ID to prevent path traversal.
 * Idempotent: safe to call multiple times.
 */
export function createWorkstreamDirectories(
  workstreamId: string,
  basePath?: string
): void {
  // Sanitize workstream ID
  const sanitizedId = sanitizeWorkstreamId(workstreamId);

  // Determine base path
  const visualsBase = basePath
    ? path.resolve(process.cwd(), basePath)
    : path.resolve(process.cwd(), VISUAL_CONFIG.OUTPUT_DIR);

  const workstreamBase = path.join(visualsBase, sanitizedId);

  // Create subdirectories: pending, approved, archive
  const subdirectories = ['pending', 'approved', 'archive'];

  for (const subdir of subdirectories) {
    const dirPath = path.join(workstreamBase, subdir);

    if (!fs.existsSync(dirPath)) {
      try {
        fs.mkdirSync(dirPath, { recursive: true });
      } catch (error: any) {
        // Re-throw with better error messages
        if (error.code === 'EACCES') {
          throw new Error(`Permission denied creating directory: ${dirPath}`);
        } else if (error.code === 'ENOSPC') {
          throw new Error(`No space left on device: ${dirPath}`);
        }
        throw error;
      }
    }
  }
}

/**
 * Gets the path for a workstream directory or subdirectory.
 */
export function getWorkstreamPath(
  workstreamId: string,
  subdirectory?: 'pending' | 'approved' | 'archive',
  basePath?: string
): string {
  const sanitizedId = sanitizeWorkstreamId(workstreamId);

  const visualsBase = basePath
    ? path.resolve(process.cwd(), basePath)
    : path.resolve(process.cwd(), VISUAL_CONFIG.OUTPUT_DIR);

  const workstreamBase = path.join(visualsBase, sanitizedId);

  if (subdirectory) {
    return path.join(workstreamBase, subdirectory);
  }

  return workstreamBase;
}

/**
 * Ensures a directory exists, creating it if necessary.
 * Returns true if directory exists or was created successfully.
 */
export function ensureDirectoryExists(dirPath: string): boolean {
  // Validate input
  if (!dirPath || typeof dirPath !== 'string' || dirPath.trim() === '') {
    return false;
  }

  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validates that a directory exists and has proper read/write permissions.
 */
export function validateDirectoryPermissions(dirPath: string): boolean {
  try {
    // Check if directory exists
    if (!fs.existsSync(dirPath)) {
      return false;
    }

    // Check read and write permissions
    fs.accessSync(dirPath, fs.constants.R_OK | fs.constants.W_OK);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Sanitizes a workstream ID to prevent path traversal and injection attacks.
 * Removes dangerous characters and patterns.
 */
function sanitizeWorkstreamId(id: string): string {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid workstream ID');
  }

  // Remove path traversal attempts
  let sanitized = id.replace(/\.\./g, '');

  // Remove special characters (keep alphanumeric, dash, underscore)
  sanitized = sanitized.replace(/[^a-zA-Z0-9\-_]/g, '');

  // For inputs like "WS-17; rm -rf /", keep only up to first valid segment
  // Look for WS-### pattern at start
  const wsMatch = sanitized.match(/^(WS-\d+)/);
  if (wsMatch) {
    sanitized = wsMatch[1];
  }

  if (!sanitized || sanitized.trim() === '') {
    throw new Error('Invalid workstream ID');
  }

  return sanitized;
}

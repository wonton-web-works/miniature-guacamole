/**
 * WS-AUDIT-2: ROI Reporting & Cross-Project Aggregation - Cross-Project Support
 *
 * Purpose: Read and aggregate audit logs from multiple project directories
 * AC-4: --projects flag reads audit logs from multiple project directories
 */

import * as fs from 'fs';
import * as path from 'path';
import { readAuditLog, type TrackedAuditEntry } from './reader';

/**
 * Project configuration for cross-project aggregation
 */
export interface ProjectConfig {
  name: string;
  audit_log_path: string;
}

/**
 * Cross-project aggregation result
 */
export interface CrossProjectResult<T> {
  by_project: Map<string, T[]>;
  combined: T[];
}

/**
 * Validates that a path is safe (no traversal attacks).
 */
export function validateProjectPath(projectPath: string): boolean {
  if (!projectPath || typeof projectPath !== 'string') {
    throw new Error('Invalid project path: path must be a non-empty string');
  }

  // Check for path traversal attempts in original path
  if (projectPath.includes('..')) {
    throw new Error('Path traversal detected: project path cannot contain ..');
  }

  // Check for encoded traversal
  if (projectPath.includes('%2e%2e') || projectPath.includes('..%2F') || projectPath.includes('%2F..')) {
    throw new Error('Path traversal detected: project path cannot contain encoded traversal sequences');
  }

  return true;
}

/**
 * Parses comma-separated project paths.
 */
export function parseProjectPaths(pathsString: string): string[] {
  if (!pathsString || typeof pathsString !== 'string') {
    throw new Error('Invalid paths: must be a non-empty string');
  }

  if (pathsString.trim() === '') {
    throw new Error('Invalid paths: cannot be empty or whitespace-only');
  }

  if (Array.isArray(pathsString)) {
    throw new Error('Invalid paths: must be a string, not an array');
  }

  // Split by comma and trim whitespace
  const paths = pathsString.split(',')
    .map(p => p.trim())
    .filter(p => p.length > 0); // Remove empty entries

  if (paths.length === 0) {
    throw new Error('Invalid paths: no valid paths found after parsing');
  }

  // Validate each path
  for (const projectPath of paths) {
    validateProjectPath(projectPath);
  }

  return paths;
}

/**
 * Reads audit logs from multiple project directories.
 * Returns a Map of project path -> entries.
 */
export function readMultipleAuditLogs(
  projectPaths: string[]
): Map<string, TrackedAuditEntry[]> {
  if (!Array.isArray(projectPaths)) {
    throw new Error('Invalid project paths: must be an array');
  }

  if (projectPaths.length === 0) {
    return new Map();
  }

  const results = new Map<string, TrackedAuditEntry[]>();

  for (const projectPath of projectPaths) {
    // Validate path
    validateProjectPath(projectPath);

    // Check if directory exists
    if (!fs.existsSync(projectPath)) {
      throw new Error(`Project directory not found: ${projectPath}`);
    }

    const stats = fs.statSync(projectPath);
    if (!stats.isDirectory()) {
      throw new Error(`Project path is not a directory: ${projectPath}`);
    }

    // Look for audit.log in the project directory
    const auditLogPath = path.join(projectPath, 'audit.log');

    if (!fs.existsSync(auditLogPath)) {
      throw new Error(`Audit log not found in project directory: ${projectPath}`);
    }

    // Read audit log
    try {
      const entries = readAuditLog(auditLogPath);
      results.set(projectPath, entries);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to read audit log from ${projectPath}: ${error.message}`);
      }
      throw error;
    }
  }

  return results;
}

/**
 * Aggregates entries from multiple projects into a combined result.
 */
export function aggregateCrossProject<T extends TrackedAuditEntry>(
  entriesByProject: Map<string, T[]>
): CrossProjectResult<T> {
  if (!(entriesByProject instanceof Map)) {
    throw new Error('Invalid entries: must be a Map');
  }

  const byProject = new Map<string, T[]>();
  const combined: T[] = [];

  for (const [projectPath, entries] of entriesByProject.entries()) {
    byProject.set(projectPath, entries);
    combined.push(...entries);
  }

  return {
    by_project: byProject,
    combined,
  };
}

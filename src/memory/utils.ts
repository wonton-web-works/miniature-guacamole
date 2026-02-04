/**
 * Utility functions for the Shared Memory Layer
 *
 * DRY principle: Common file I/O and data manipulation functions
 */

import * as fs from 'fs';
import * as path from 'path';
import { MEMORY_CONFIG } from './config';

export function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function getTimestamp(): string {
  return new Date().toISOString();
}

export function hasCircularReferences(obj: any): boolean {
  if (MEMORY_CONFIG.DETECT_CIRCULAR_REFS) {
    const seen = new WeakSet();
    return hasCircular(obj, seen);
  }
  return false;
}

function hasCircular(obj: any, seen: WeakSet<any>): boolean {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  if (seen.has(obj)) {
    return true;
  }

  seen.add(obj);

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (hasCircular(obj[key], seen)) {
        return true;
      }
    }
  }

  return false;
}

export function sanitizePath(filePath: string): string {
  // Prevent directory traversal attacks
  const normalized = path.normalize(filePath);
  const resolved = path.resolve(normalized);

  // Ensure path is within .claude/memory directory
  const memoryDir = path.resolve(MEMORY_CONFIG.MEMORY_DIR);
  if (!resolved.startsWith(memoryDir)) {
    throw new Error('Invalid path: directory traversal attempt detected');
  }

  return resolved;
}

export function formatJSON(data: any): string {
  return JSON.stringify(data, null, MEMORY_CONFIG.JSON_INDENT);
}

export function parseJSON(content: string): any {
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}

export function createBackupPath(filePath: string, timestamp: string): string {
  const dir = path.dirname(filePath);
  const filename = path.basename(filePath);
  return path.join(dir, `${filename}.${timestamp}.bak`);
}

export function getBackupTimestamp(): string {
  return new Date().toISOString();
}

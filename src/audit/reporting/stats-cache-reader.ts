/**
 * WS-AUDIT-1: Cost Estimation & Enhanced Reporting - Stats Cache Reader
 *
 * Purpose: Reads and parses ~/.claude/stats-cache.json
 * Extracts model usage statistics for cost estimation.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * Model usage statistics from stats-cache.json
 */
export interface ModelUsageStats {
  model: string;
  total_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_creation_tokens: number;
  total_cache_read_tokens: number;
}

/**
 * Stats cache file structure (version 2 format)
 */
export interface StatsCacheData {
  version: number;
  lastComputedDate: string;
  dailyActivity: Array<{
    date: string;
    messageCount: number;
    sessionCount: number;
    toolCallCount: number;
  }>;
  modelUsage?: ModelUsageStats[];
}

/**
 * Validates that a file path is safe to read.
 * Rejects paths with:
 * - Path traversal attempts (..)
 * - Wrong file extension (must be .json)
 *
 * @param filePath - Path to validate
 * @throws Error if path is unsafe
 */
function validateFilePath(filePath: string): void {
  // Check for path traversal in the original path (before normalization)
  // This catches attempts like '../../../etc/passwd.json'
  if (filePath.includes('..')) {
    throw new Error('Invalid path: path traversal detected');
  }

  // Also check after normalization (defense in depth)
  const normalized = path.normalize(filePath);
  if (normalized.includes('..')) {
    throw new Error('Invalid path: path traversal detected');
  }

  // Then check file extension
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.json') {
    throw new Error('Invalid path: only .json files are allowed');
  }
}

/**
 * Gets the path to the stats-cache.json file.
 * Default: ~/.claude/stats-cache.json
 *
 * @param customPath - Optional custom path (if provided, returns as-is or resolves relative paths)
 * @returns Absolute path to stats-cache.json
 * @throws Error if custom path contains path traversal attempts
 */
export function getStatsCachePath(customPath?: string): string {
  if (customPath) {
    // Validate custom path for security
    validateFilePath(customPath);

    // If custom path is provided, resolve to absolute
    if (path.isAbsolute(customPath)) {
      return customPath;
    }
    return path.resolve(process.cwd(), customPath);
  }

  // Default path: ~/.claude/stats-cache.json
  const homeDir = process.env.HOME || os.homedir();
  return path.join(homeDir, '.claude', 'stats-cache.json');
}

/**
 * Validates stats-cache data structure.
 * Returns false for invalid data (does not throw).
 */
export function validateStatsCacheData(data: any): data is StatsCacheData {
  // Check basic type
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return false;
  }

  // Check required fields
  if (typeof data.version !== 'number') {
    return false;
  }
  if (typeof data.lastComputedDate !== 'string') {
    return false;
  }
  if (!Array.isArray(data.dailyActivity)) {
    return false;
  }

  // Check optional modelUsage field
  if (data.modelUsage !== undefined && !Array.isArray(data.modelUsage)) {
    return false;
  }

  return true;
}

/**
 * Validates a single model usage stats entry.
 * Throws error if invalid.
 */
function validateModelUsageEntry(entry: any): void {
  if (!entry.model || typeof entry.model !== 'string') {
    throw new Error('Invalid model usage entry: missing model field');
  }

  const numericFields = [
    'total_requests',
    'total_input_tokens',
    'total_output_tokens',
    'total_cache_creation_tokens',
    'total_cache_read_tokens',
  ];

  for (const field of numericFields) {
    const value = entry[field];
    if (typeof value !== 'number' || !isFinite(value)) {
      throw new Error(`Invalid value in model usage entry: ${field}`);
    }
    if (value < 0) {
      throw new Error(`Negative token count in model usage entry: ${field}`);
    }
  }
}

/**
 * Reads and parses stats-cache.json file.
 *
 * @param cachePath - Path to stats-cache.json file
 * @returns Parsed stats cache data
 * @throws Error if file is invalid or malformed
 */
export function readStatsCache(cachePath: string): StatsCacheData {
  // Validate path
  if (!cachePath || typeof cachePath !== 'string' || cachePath.trim() === '') {
    throw new Error('Invalid path: path cannot be empty');
  }

  // Validate path for security (path traversal, file extension)
  validateFilePath(cachePath);

  // Check if path is a directory
  try {
    const stats = fs.statSync(cachePath);
    if (stats.isDirectory()) {
      throw new Error('Not a file: path points to a directory');
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error('File not found: stats-cache.json does not exist');
    }
    if (error.message && error.message.includes('directory')) {
      throw error;
    }
    // For other stat errors, let file read attempt handle it
  }

  // Read file
  const content = fs.readFileSync(cachePath, 'utf8');

  // Check for empty file
  if (!content || content.trim() === '') {
    throw new Error('Empty file: stats-cache.json is empty');
  }

  // Parse JSON
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error('Invalid JSON: cannot parse stats-cache.json');
  }

  // Validate structure
  if (!validateStatsCacheData(parsed)) {
    throw new Error('Invalid stats-cache structure');
  }

  return parsed;
}

/**
 * Extracts model usage statistics from stats-cache.json.
 *
 * @param cachePath - Path to stats-cache.json file (optional, defaults to ~/.claude/stats-cache.json)
 * @returns Array of model usage stats, or empty array if modelUsage field not present
 * @throws Error if file is invalid or model usage data is malformed
 */
export function getModelUsageStats(cachePath?: string): ModelUsageStats[] {
  const effectivePath = cachePath || getStatsCachePath();
  const cacheData = readStatsCache(effectivePath);

  // If no modelUsage field, return empty array
  if (!cacheData.modelUsage || cacheData.modelUsage.length === 0) {
    return [];
  }

  // Validate and filter model usage entries
  const validEntries: ModelUsageStats[] = [];
  for (const entry of cacheData.modelUsage) {
    // Skip entries missing the model field
    if (!entry.model) {
      continue;
    }

    // Validate entry (throws on invalid data)
    validateModelUsageEntry(entry);

    validEntries.push(entry);
  }

  return validEntries;
}

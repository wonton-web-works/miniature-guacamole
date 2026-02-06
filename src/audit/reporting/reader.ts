/**
 * WS-TRACKING Phase 2: Audit Log Reader Module
 *
 * Purpose: Read and parse existing audit log files for reporting.
 * Handles JSONL format (one JSON object per line).
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { AuditEntry } from '../format';

/**
 * Audit entry that may have tracking fields (Phase 1).
 * Handles backward compatibility with entries that don't have tracking.
 */
export interface TrackedAuditEntry extends AuditEntry {
  schema_version?: string;
  workstream_id?: string | null;
  agent_name?: string | null;
  feature_name?: string | null;
  success?: boolean; // For success metrics
}

/**
 * Gets the default audit log path.
 * Priority: CLAUDE_AUDIT_LOG_PATH env var > ~/.claude/audit.log
 */
export function getDefaultAuditLogPath(): string {
  if (process.env.CLAUDE_AUDIT_LOG_PATH) {
    return process.env.CLAUDE_AUDIT_LOG_PATH;
  }
  return path.join(os.homedir(), '.claude', 'audit.log');
}

/**
 * Parses a single JSONL line into an audit entry.
 * Returns null if the line is invalid.
 */
export function parseAuditLogLine(line: string): TrackedAuditEntry | null {
  // Skip empty or whitespace-only lines
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);

    // Validate required fields (from format.ts)
    const requiredFields = [
      'timestamp',
      'session_id',
      'model',
      'input_tokens',
      'output_tokens',
      'cache_creation_tokens',
      'cache_read_tokens',
      'total_cost_usd',
      'duration_ms'
    ];

    for (const field of requiredFields) {
      if (!(field in parsed)) {
        return null;
      }
    }

    return parsed as TrackedAuditEntry;
  } catch (error) {
    // Invalid JSON
    return null;
  }
}

/**
 * Validates if an entry has all required fields.
 */
export function isValidAuditEntry(entry: Record<string, any>): boolean {
  const requiredFields = [
    'timestamp',
    'session_id',
    'model',
    'input_tokens',
    'output_tokens',
    'cache_creation_tokens',
    'cache_read_tokens',
    'total_cost_usd',
    'duration_ms'
  ];

  for (const field of requiredFields) {
    if (!(field in entry)) {
      return false;
    }
  }

  // Validate timestamp format (ISO 8601)
  if (typeof entry.timestamp === 'string') {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(entry.timestamp)) {
      return false;
    }
  }

  return true;
}

/**
 * Reads audit log from specified path or default location.
 * Parses JSONL format and returns array of entries.
 * Skips invalid lines with warnings.
 *
 * @param logPath - Optional path to audit log (defaults to ~/.claude/audit.log)
 * @returns Array of parsed audit entries
 * @throws Error if log file does not exist
 */
export function readAuditLog(logPath?: string): TrackedAuditEntry[] {
  const filePath = logPath || getDefaultAuditLogPath();

  if (!fs.existsSync(filePath)) {
    throw new Error(`Audit log not found at: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  // Handle empty file
  if (!content.trim()) {
    return [];
  }

  const lines = content.split('\n');
  const entries: TrackedAuditEntry[] = [];
  let skippedLines = 0;

  for (const line of lines) {
    const entry = parseAuditLogLine(line);
    if (entry) {
      entries.push(entry);
    } else if (line.trim()) {
      // Non-empty line that failed to parse
      skippedLines++;
    }
  }

  if (skippedLines > 0) {
    console.warn(`WARNING: Skipped ${skippedLines} invalid lines in audit log`);
  }

  return entries;
}

/**
 * Placeholder for streaming reader (future optimization for large files).
 * Not implemented in Phase 2.
 */
export function readAuditLogStream(
  logPath: string,
  onEntry: (entry: TrackedAuditEntry) => void
): void {
  throw new Error('readAuditLogStream not implemented yet (future optimization)');
}

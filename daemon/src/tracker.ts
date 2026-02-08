// Processed tickets tracker - state persistence
// WS-DAEMON-4: Tracker module

import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import type { ProcessedTicket } from './types';

// File paths
const PROCESSED_FILE = join(process.cwd(), '..', '.mg-daemon', 'processed.json');
const PROCESSED_FILE_TMP = `${PROCESSED_FILE}.tmp`;

/**
 * Get list of processed ticket keys
 * AC-4.3: Integration with Jira client to skip processed tickets
 */
export function getProcessedTickets(): string[] {
  try {
    if (!existsSync(PROCESSED_FILE)) {
      return [];
    }

    const content = readFileSync(PROCESSED_FILE, 'utf-8');
    const data = JSON.parse(content);
    return Object.keys(data);
  } catch (error) {
    // Return empty array on any error (corrupted JSON, read error, etc.)
    return [];
  }
}

/**
 * Load existing processed tickets data
 */
function loadProcessedData(): Record<string, ProcessedTicket> {
  try {
    if (!existsSync(PROCESSED_FILE)) {
      return {};
    }

    const content = readFileSync(PROCESSED_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // Start fresh if file is corrupted
    return {};
  }
}

/**
 * Save processed tickets data atomically (write-tmp-then-rename)
 * AC-4.9: Atomic file operations following ARCH-005-C
 */
function saveProcessedData(data: Record<string, ProcessedTicket>): void {
  const dir = dirname(PROCESSED_FILE);

  // Ensure directory exists
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Write to temp file
  const content = JSON.stringify(data, null, 2);
  writeFileSync(PROCESSED_FILE_TMP, content, 'utf-8');

  // Atomic rename
  renameSync(PROCESSED_FILE_TMP, PROCESSED_FILE);
}

/**
 * Mark a ticket as processing
 * AC-4.9: Uses atomic file operations (write-tmp-then-rename) following ARCH-005-C
 * AC-4.10: Stores { [issueKey]: { processedAt, prUrl?, status, error? } }
 * AC-4.11: Updates status='processing' with timestamp
 */
export function markProcessing(key: string): void {
  const data = loadProcessedData();

  data[key] = {
    processedAt: new Date().toISOString(),
    status: 'processing',
  };

  saveProcessedData(data);
}

/**
 * Mark a ticket as complete with PR URL
 * AC-4.9: Uses atomic file operations (write-tmp-then-rename) following ARCH-005-C
 * AC-4.10: Stores { [issueKey]: { processedAt, prUrl?, status, error? } }
 * AC-4.12: Updates status='complete' with prUrl
 */
export function markComplete(key: string, prUrl: string): void {
  const data = loadProcessedData();

  // Preserve processedAt if it exists, otherwise create new
  const existingProcessedAt = data[key]?.processedAt || new Date().toISOString();

  data[key] = {
    processedAt: existingProcessedAt,
    status: 'complete',
    prUrl,
  };

  saveProcessedData(data);
}

/**
 * Mark a ticket as failed with error message
 * AC-4.9: Uses atomic file operations (write-tmp-then-rename) following ARCH-005-C
 * AC-4.10: Stores { [issueKey]: { processedAt, prUrl?, status, error? } }
 * AC-4.13: Updates status='failed' with error message
 */
export function markFailed(key: string, error: string): void {
  const data = loadProcessedData();

  // Preserve processedAt if it exists, otherwise create new
  const existingProcessedAt = data[key]?.processedAt || new Date().toISOString();

  data[key] = {
    processedAt: existingProcessedAt,
    status: 'failed',
    error,
  };

  saveProcessedData(data);
}

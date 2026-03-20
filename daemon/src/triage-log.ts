// Triage log persistence — append-only log of all triage outcomes
// GH-106: Triage Log Persistence

import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import type { TriageOutcome } from './triage';

export interface TriageLogEntry {
  ticketId: string;
  outcome: TriageOutcome;
  reason: string;
  timestamp: string;
}

const LOG_FILE = join(process.cwd(), '..', '.mg-daemon', 'triage-log.json');
const LOG_FILE_TMP = `${LOG_FILE}.tmp`;

/**
 * Load existing triage log entries from disk.
 * Returns empty array on missing file, corrupted JSON, or non-array content.
 */
function loadEntries(): TriageLogEntry[] {
  try {
    if (!existsSync(LOG_FILE)) {
      return [];
    }
    const content = readFileSync(LOG_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save entries atomically using write-tmp-then-rename pattern.
 */
function saveEntries(entries: TriageLogEntry[]): void {
  const dir = dirname(LOG_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const content = JSON.stringify(entries, null, 2);
  writeFileSync(LOG_FILE_TMP, content, 'utf-8');
  renameSync(LOG_FILE_TMP, LOG_FILE);
}

/**
 * Append a triage log entry. Never throws — failures are silently swallowed
 * so the pipeline is not disrupted by logging errors.
 */
export function appendTriageLog(entry: TriageLogEntry): void {
  try {
    const entries = loadEntries();
    entries.push(entry);
    saveEntries(entries);
  } catch {
    // Swallow all errors — triage logging must never disrupt the pipeline
  }
}

/**
 * Read all triage log entries. Returns empty array on missing or corrupted file.
 */
export function readTriageLog(): TriageLogEntry[] {
  return loadEntries();
}

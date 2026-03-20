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

export interface TriageStats {
  go: number;
  needsInfo: number;
  rejected: number;
}

// Default base path — overridable for testing
let basePath = join(process.cwd(), '..', '.mg-daemon');

/**
 * Override base path for test isolation.
 * @internal
 */
export function _setBasePath(path: string): void {
  basePath = path;
}

function getLogFile(): string {
  return join(basePath, 'triage-log.json');
}

/**
 * Load existing triage log entries from disk.
 * Returns empty array on missing file, corrupted JSON, or non-array content.
 */
function loadEntries(): TriageLogEntry[] {
  try {
    const file = getLogFile();
    if (!existsSync(file)) {
      return [];
    }
    const content = readFileSync(file, 'utf-8');
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
  const logFile = getLogFile();
  const dir = dirname(logFile);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const content = JSON.stringify(entries, null, 2);
  const tmpFile = `${logFile}.tmp`;
  writeFileSync(tmpFile, content, 'utf-8');
  renameSync(tmpFile, logFile);
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
 * Read all triage log entries and return aggregated stats.
 * Returns zero counts on missing or corrupted file.
 */
export function readTriageLog(): TriageStats {
  const entries = loadEntries();
  const stats: TriageStats = { go: 0, needsInfo: 0, rejected: 0 };
  for (const entry of entries) {
    switch (entry.outcome) {
      case 'GO':
        stats.go++;
        break;
      case 'NEEDS_CLARIFICATION':
        stats.needsInfo++;
        break;
      case 'REJECT':
        stats.rejected++;
        break;
    }
  }
  return stats;
}

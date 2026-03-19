// Triage log persistence for miniature-guacamole daemon
// GH-81: All triage outcomes appended to .mg-daemon/triage-log.json

import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

export const TRIAGE_LOG_PATH = join(process.cwd(), '..', '.mg-daemon', 'triage-log.json');
const TRIAGE_LOG_TMP = `${TRIAGE_LOG_PATH}.tmp`;

export interface TriageLogEntry {
  ticketId: string;
  outcome: 'GO' | 'NEEDS_CLARIFICATION' | 'REJECT';
  reason: string;
  timestamp: string;
}

/**
 * Load the triage log from disk.
 * Returns an empty array if the file does not exist or is corrupted.
 */
export function loadTriageLog(): TriageLogEntry[] {
  try {
    if (!existsSync(TRIAGE_LOG_PATH)) return [];
    const content = readFileSync(TRIAGE_LOG_PATH, 'utf-8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Append a triage entry to the log using atomic write-tmp-then-rename.
 * Failures are silently caught — appendTriageLog must never disrupt the pipeline.
 */
export function appendTriageLog(entry: TriageLogEntry): void {
  try {
    const dir = dirname(TRIAGE_LOG_PATH);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const existing = loadTriageLog();
    existing.push(entry);

    const content = JSON.stringify(existing, null, 2);
    writeFileSync(TRIAGE_LOG_TMP, content, 'utf-8');
    renameSync(TRIAGE_LOG_TMP, TRIAGE_LOG_PATH);
  } catch {
    // Best-effort — never disrupt the pipeline
  }
}

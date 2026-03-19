// Triage log — persistent append-only log of triage decisions
// WS-DAEMON-79: Triage Log Module

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import type { TriageOutcome } from './triage';

export interface TriageLogEntry {
  ticketId: string;
  outcome: TriageOutcome;
  reason: string;
  timestamp: string;
}

const DAEMON_DIR = '.mg-daemon';
const LOG_FILE = 'triage-log.json';

/** Relative path from project root to the triage log file. */
export const TRIAGE_LOG_PATH = path.join(DAEMON_DIR, LOG_FILE);

function logFilePath(baseDir: string): string {
  return path.join(baseDir, DAEMON_DIR, LOG_FILE);
}

// Per-directory write lock to serialize concurrent appends
const locks = new Map<string, Promise<void>>();

function withLock(key: string, fn: () => Promise<void>): Promise<void> {
  const prev = locks.get(key) ?? Promise.resolve();
  const next = prev.then(fn, fn); // run fn after previous completes (even if it failed)
  locks.set(key, next);
  // Clean up when chain settles to avoid unbounded map growth
  next.then(() => {
    if (locks.get(key) === next) locks.delete(key);
  });
  return next;
}

/**
 * Read the triage log from disk.
 * Returns an empty array on any error (missing file, corrupted JSON, etc.).
 * Never throws.
 */
export async function readTriageLog(baseDir: string): Promise<TriageLogEntry[]> {
  try {
    const raw = await fs.readFile(logFilePath(baseDir), 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

/**
 * Append an entry to the triage log with atomic write-tmp-then-rename durability.
 * Creates the .mg-daemon directory if it does not exist.
 * Best-effort — never throws.
 */
export async function appendTriageLog(entry: TriageLogEntry, baseDir: string): Promise<void> {
  const filePath = logFilePath(baseDir);
  return withLock(filePath, async () => {
    try {
      const dir = path.join(baseDir, DAEMON_DIR);
      await fs.mkdir(dir, { recursive: true });

      const existing = await readTriageLog(baseDir);
      existing.push(entry);

      const tmpPath = filePath + '.tmp';
      await fs.writeFile(tmpPath, JSON.stringify(existing, null, 2), 'utf-8');
      await fs.rename(tmpPath, filePath);
    } catch {
      // Best-effort — swallow all errors
    }
  });
}

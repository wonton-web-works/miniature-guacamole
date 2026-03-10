/**
 * WS-16: Token Usage Audit Log — Logger
 *
 * Appends AuditEntry records to a JSONL log file.
 * Never throws — all errors are caught and written to stderr.
 *
 * Mock-aware: uses standard 'fs/promises' import so vi.mock() intercepts.
 */

import * as fsp from 'fs/promises';
import * as path from 'path';
import type { AuditEntry, AuditConfig } from './types';
import { resolveLogPath } from './config';
import { shouldRotate, rotate } from './rotation';

// ---------------------------------------------------------------------------
// In-process write lock (promise queue) — prevents concurrent interleaving
// ---------------------------------------------------------------------------

let _lockQueue: Promise<void> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = _lockQueue.then(() => fn());
  // Keep the queue moving even if fn rejects (errors are handled inside fn)
  _lockQueue = next.then(
    () => {},
    () => {}
  );
  return next;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns true if audit logging is enabled per the given config.
 */
export function isEnabled(config: AuditConfig): boolean {
  return config.enabled;
}

/**
 * Appends an audit entry to the log file.
 * No-op when config.enabled is false.
 * Never throws — swallows all errors with a stderr warning.
 */
export async function log(entry: AuditEntry, config: AuditConfig): Promise<void> {
  if (!config.enabled) {
    return;
  }

  return withLock(async () => {
    try {
      const resolvedPath = resolveLogPath(config.log_path);
      const dir = path.dirname(resolvedPath);

      // Ensure parent directory exists
      await fsp.mkdir(dir, { recursive: true });

      // Rotate if needed
      if (await shouldRotate(resolvedPath, config.max_size_mb)) {
        await rotate(resolvedPath, config.keep_backups);
      }

      // Serialize entry as single-line JSON + newline (JSONL format)
      const line = JSON.stringify(entry) + '\n';

      // Append with mode 600 (owner read/write only)
      await fsp.appendFile(resolvedPath, line, { mode: 0o600, flag: 'a' });
    } catch (err) {
      // Never throw — write warning to stderr and continue
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[audit-logger] WARNING: failed to write audit entry: ${message}`);
    }
  });
}

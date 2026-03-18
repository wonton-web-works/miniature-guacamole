// Log rotation for miniature-guacamole daemon
// WS-DAEMON-13: Mac Mini Setup & Process Hardening

import { existsSync, statSync, renameSync, writeFileSync, unlinkSync, appendFileSync } from 'fs';

export interface LogRotationConfig {
  maxSizeBytes: number;  // default 10 * 1024 * 1024 (10MB)
  maxRotations: number;  // default 5
  logPath: string;
}

/**
 * Check if the log file exceeds maxSizeBytes and needs rotation.
 */
export function shouldRotate(config: LogRotationConfig): boolean {
  if (!existsSync(config.logPath)) {
    return false;
  }

  try {
    const stat = statSync(config.logPath);
    return stat.size >= config.maxSizeBytes;
  } catch {
    return false;
  }
}

/**
 * Rotate log files.
 * daemon.log.{maxRotations} → delete
 * daemon.log.{n} → daemon.log.{n+1}  (descending from maxRotations-1 to 1)
 * daemon.log   → daemon.log.1
 * Create fresh daemon.log
 */
export function rotate(config: LogRotationConfig): void {
  const { logPath, maxRotations } = config;

  // Delete oldest rotation if it exists
  const oldestPath = `${logPath}.${maxRotations}`;
  if (existsSync(oldestPath)) {
    unlinkSync(oldestPath);
  }

  // Shift existing rotations: n → n+1 (from maxRotations-1 down to 1)
  for (let i = maxRotations - 1; i >= 1; i--) {
    const fromPath = `${logPath}.${i}`;
    const toPath = `${logPath}.${i + 1}`;
    if (existsSync(fromPath)) {
      renameSync(fromPath, toPath);
    }
  }

  // Rotate current log to .1
  if (existsSync(logPath)) {
    renameSync(logPath, `${logPath}.1`);
  }

  // Create fresh empty log
  writeFileSync(logPath, '', 'utf-8');
}

/**
 * Append a timestamped message to the log, rotating first if needed.
 */
export function appendLog(config: LogRotationConfig, message: string): void {
  if (shouldRotate(config)) {
    rotate(config);
  }

  const timestamp = new Date().toISOString();
  const line = `${timestamp} ${message}\n`;
  appendFileSync(config.logPath, line, 'utf-8');
}

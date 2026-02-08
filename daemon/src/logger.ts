// Logger module for miniature-guacamole daemon
// WS-DAEMON-3: Structured logging to .mg-daemon/daemon.log

import { existsSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';

const LOG_DIR = '.mg-daemon';
const LOG_FILE = join(LOG_DIR, 'daemon.log');

export type LogLevel = 'info' | 'warn' | 'error';

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  log(level: LogLevel, message: string): void;
}

/**
 * Ensures the log directory exists
 */
function ensureLogDirectory(): void {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }
}

/**
 * Creates a logger instance that writes to .mg-daemon/daemon.log
 * AC-3.8: Logs with format '[ISO-TIMESTAMP] [LEVEL] message'
 * AC-3.9: Supports levels: info, warn, error
 * AC-3.10: Appends (doesn't truncate) on restart
 * AC-3.11: Creates .mg-daemon/ directory if missing
 */
export function createLogger(): Logger {
  ensureLogDirectory();
  return {
    info: (message: string) => log('info', message),
    warn: (message: string) => log('warn', message),
    error: (message: string) => log('error', message),
    log: (level: LogLevel, message: string) => log(level, message),
  };
}

/**
 * Log a message at the specified level
 * AC-3.8: Format '[ISO-TIMESTAMP] [LEVEL] message'
 */
export function log(level: LogLevel, message: string): void {
  ensureLogDirectory();
  const timestamp = new Date().toISOString();
  const levelUpper = level.toUpperCase();
  const logLine = `[${timestamp}] [${levelUpper}] ${message}\n`;
  appendFileSync(LOG_FILE, logLine);
}

/**
 * Log an info message
 */
export function info(message: string): void {
  log('info', message);
}

/**
 * Log a warning message
 */
export function warn(message: string): void {
  log('warn', message);
}

/**
 * Log an error message
 */
export function error(message: string): void {
  log('error', message);
}

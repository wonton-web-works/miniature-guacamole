/**
 * Configuration for the Shared Memory Layer
 *
 * Centralizes all configuration (paths, defaults, retention policies)
 * following the config-over-composition principle.
 */

import * as path from 'path';
import * as os from 'os';

export const MEMORY_CONFIG = {
  // Base directory for all memory files
  MEMORY_DIR: path.join(os.homedir(), '.claude', 'memory'),

  // Primary shared memory file
  SHARED_MEMORY_FILE: path.join(os.homedir(), '.claude', 'memory', 'shared.json'),

  // Backup directory
  BACKUP_DIR: path.join(os.homedir(), '.claude', 'memory', 'backups'),

  // Lock file location
  LOCK_FILE: path.join(os.homedir(), '.claude', 'memory', '.locks'),

  // Default timestamp format: ISO 8601
  TIMESTAMP_FORMAT: 'iso8601',

  // File locking timeout (milliseconds)
  LOCK_TIMEOUT: 5000,

  // Lock retry interval (milliseconds)
  LOCK_RETRY_INTERVAL: 100,

  // Backup retention policy (days)
  BACKUP_RETENTION_DAYS: 7,

  // Maximum file size for writes (10MB)
  MAX_FILE_SIZE: 10 * 1024 * 1024,

  // JSON formatting options
  JSON_INDENT: 2,

  // Circular reference detection
  DETECT_CIRCULAR_REFS: true,

  // Encoding
  ENCODING: 'utf-8',
};

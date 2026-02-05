/**
 * WS-16: Token Usage Audit Log - Config Module
 *
 * Loads and validates audit logging configuration.
 * Supports both global (~/.claude/config.json) and project-level (.clauderc) configs.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface AuditConfig {
  enabled: boolean;
  log_path: string;
  max_size_mb: number;
  keep_backups: number;
}

/**
 * Centralized audit logging configuration.
 * Follows MEMORY_CONFIG pattern for consistency.
 */
export const AUDIT_CONFIG = {
  // Default settings
  ENABLED: false,
  LOG_PATH: '~/.claude/audit.log',
  MAX_SIZE_MB: 10,
  KEEP_BACKUPS: 1,

  // Validation constraints
  MAX_SIZE_MB_LIMIT: 1000,
  MIN_SIZE_MB: 1,

  // Config file paths (computed lazily to avoid module initialization issues)
  get GLOBAL_CONFIG_PATH(): string {
    return path.join(os.homedir(), '.claude', 'config.json');
  },
  PROJECT_CONFIG_PATH: '.clauderc',

  // Config key in JSON files
  CONFIG_KEY: 'audit_logging',
} as const;

/**
 * Loads audit logging configuration from config files.
 * Priority: .clauderc (project) > ~/.claude/config.json (global) > defaults
 */
export function loadAuditConfig(): AuditConfig {
  const projectConfigPath = path.join(process.cwd(), AUDIT_CONFIG.PROJECT_CONFIG_PATH);

  let globalConfig: Partial<AuditConfig> = {};
  let projectConfig: Partial<AuditConfig> = {};

  // Load global config
  if (fs.existsSync(AUDIT_CONFIG.GLOBAL_CONFIG_PATH)) {
    try {
      const content = fs.readFileSync(AUDIT_CONFIG.GLOBAL_CONFIG_PATH, 'utf8');
      const parsed = JSON.parse(content);
      globalConfig = parsed[AUDIT_CONFIG.CONFIG_KEY] || {};
    } catch (error) {
      console.error(`ERROR: Cannot parse config.json: ${error}`);
      globalConfig = {};
    }
  }

  // Load project config (overrides global)
  if (fs.existsSync(projectConfigPath)) {
    try {
      const content = fs.readFileSync(projectConfigPath, 'utf8');
      const parsed = JSON.parse(content);
      projectConfig = parsed[AUDIT_CONFIG.CONFIG_KEY] || {};
    } catch (error) {
      // Silently ignore project config errors - use global config
      projectConfig = {};
    }
  }

  // Merge configs: project > global > defaults
  const mergedConfig: Partial<AuditConfig> = {
    enabled: AUDIT_CONFIG.ENABLED,
    log_path: AUDIT_CONFIG.LOG_PATH,
    max_size_mb: AUDIT_CONFIG.MAX_SIZE_MB,
    keep_backups: AUDIT_CONFIG.KEEP_BACKUPS,
    ...globalConfig,
    ...projectConfig
  };

  return validateAuditConfig(mergedConfig);
}

/**
 * Validates and normalizes audit config values.
 * Applies defaults for missing/invalid fields and logs warnings.
 */
export function validateAuditConfig(config: Partial<AuditConfig>): AuditConfig {
  const validated: AuditConfig = {
    enabled: config.enabled ?? AUDIT_CONFIG.ENABLED,
    log_path: config.log_path ?? AUDIT_CONFIG.LOG_PATH,
    max_size_mb: AUDIT_CONFIG.MAX_SIZE_MB,
    keep_backups: AUDIT_CONFIG.KEEP_BACKUPS
  };

  // Validate max_size_mb
  if (
    typeof config.max_size_mb === 'number' &&
    config.max_size_mb >= AUDIT_CONFIG.MIN_SIZE_MB &&
    config.max_size_mb <= AUDIT_CONFIG.MAX_SIZE_MB_LIMIT
  ) {
    validated.max_size_mb = config.max_size_mb;
  } else if (config.max_size_mb !== undefined) {
    if (typeof config.max_size_mb === 'number' && config.max_size_mb > AUDIT_CONFIG.MAX_SIZE_MB_LIMIT) {
      console.warn(`WARNING: max_size_mb exceeds ${AUDIT_CONFIG.MAX_SIZE_MB_LIMIT}, capping at ${AUDIT_CONFIG.MAX_SIZE_MB_LIMIT}MB`);
      validated.max_size_mb = AUDIT_CONFIG.MAX_SIZE_MB_LIMIT;
    } else {
      console.warn(`WARNING: Invalid max_size_mb value, using default (${AUDIT_CONFIG.MAX_SIZE_MB}MB)`);
      validated.max_size_mb = AUDIT_CONFIG.MAX_SIZE_MB;
    }
  }

  // Validate keep_backups (MVP only supports 1)
  if (config.keep_backups !== undefined && config.keep_backups !== AUDIT_CONFIG.KEEP_BACKUPS) {
    console.warn(`WARNING: keep_backups currently only supports value of ${AUDIT_CONFIG.KEEP_BACKUPS} (MVP limitation)`);
    validated.keep_backups = AUDIT_CONFIG.KEEP_BACKUPS;
  }

  return validated;
}

/**
 * Resolves log path with tilde expansion and relative path handling.
 * Relative paths are resolved relative to ~/.claude/
 */
export function resolveLogPath(logPath: string): string {
  const homeDir = os.homedir();

  // Expand tilde
  if (logPath.startsWith('~/')) {
    return path.join(homeDir, logPath.slice(2));
  }

  // Handle absolute paths
  if (path.isAbsolute(logPath)) {
    return logPath;
  }

  // Treat relative paths as relative to ~/.claude/
  const claudeDir = path.dirname(AUDIT_CONFIG.GLOBAL_CONFIG_PATH);

  // Remove leading './' if present
  const cleanPath = logPath.startsWith('./') ? logPath.slice(2) : logPath;

  return path.join(claudeDir, cleanPath);
}

/**
 * WS-16: Token Usage Audit Log - Config Module
 *
 * Loads and validates audit logging configuration.
 * Supports both global (~/.claude/config.json) and project-level (.clauderc) configs.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export type { AuditConfig } from './types';
import type { AuditConfig } from './types';

/**
 * Centralized audit logging configuration constants.
 * Numeric/boolean values are typed as their base types (not literals) to allow arithmetic.
 */
export const AUDIT_CONFIG = {
  ENABLED: false as boolean,
  LOG_PATH: '~/.claude/audit.log' as string,
  MAX_SIZE_MB: 10 as number,
  KEEP_BACKUPS: 1 as number,

  MAX_SIZE_MB_LIMIT: 1000 as number,
  MIN_SIZE_MB: 1 as number,

  get GLOBAL_CONFIG_PATH(): string {
    return path.join(os.homedir(), '.claude', 'config.json');
  },
  PROJECT_CONFIG_PATH: '.clauderc' as string,
  CONFIG_KEY: 'audit_logging' as string,
};

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
    } catch {
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
    ...projectConfig,
  };

  return validateAuditConfig(mergedConfig);
}

/**
 * Validates and normalizes audit config values.
 *
 * max_size_mb:
 *   - Valid range [1, 1000]: accepted as-is
 *   - > 1000: capped at 1000 with console.warn
 *   - < 1 or wrong type: falls back to default (10) with console.warn
 *
 * keep_backups:
 *   - Valid range [0, 10]: accepted as-is
 *   - > 10: clamped to 10 with console.warn
 *   - < 0: clamped to 0 with console.warn
 *   - non-number: defaults to 1 with console.warn
 *
 * enabled: boolean type checked, defaults to false for wrong types.
 * log_path: string type checked, defaults to '~/.claude/audit.log' for wrong types.
 */
export function validateAuditConfig(config: Partial<AuditConfig>): AuditConfig {
  // enabled: must be boolean
  const enabled =
    typeof config.enabled === 'boolean' ? config.enabled : AUDIT_CONFIG.ENABLED;

  // log_path: must be string
  const log_path =
    typeof config.log_path === 'string' ? config.log_path : AUDIT_CONFIG.LOG_PATH;

  // max_size_mb: number in [1, 1000]; cap above, default below/wrong-type
  let max_size_mb: number = AUDIT_CONFIG.MAX_SIZE_MB;
  if (config.max_size_mb !== undefined) {
    if (typeof config.max_size_mb === 'number' && !isNaN(config.max_size_mb)) {
      if (config.max_size_mb > AUDIT_CONFIG.MAX_SIZE_MB_LIMIT) {
        console.warn(
          `WARNING: max_size_mb exceeds ${AUDIT_CONFIG.MAX_SIZE_MB_LIMIT}, capping at ${AUDIT_CONFIG.MAX_SIZE_MB_LIMIT}MB`
        );
        max_size_mb = AUDIT_CONFIG.MAX_SIZE_MB_LIMIT;
      } else if (config.max_size_mb < AUDIT_CONFIG.MIN_SIZE_MB) {
        console.warn(
          `WARNING: Invalid max_size_mb value, using default (${AUDIT_CONFIG.MAX_SIZE_MB}MB)`
        );
        max_size_mb = AUDIT_CONFIG.MAX_SIZE_MB;
      } else {
        max_size_mb = config.max_size_mb;
      }
    } else {
      console.warn(
        `WARNING: Invalid max_size_mb value, using default (${AUDIT_CONFIG.MAX_SIZE_MB}MB)`
      );
      max_size_mb = AUDIT_CONFIG.MAX_SIZE_MB;
    }
  }

  // keep_backups: number in [0, 10]; clamp above/below, default for wrong type
  let keep_backups: number = AUDIT_CONFIG.KEEP_BACKUPS;
  if (config.keep_backups !== undefined) {
    if (typeof config.keep_backups === 'number' && !isNaN(config.keep_backups)) {
      if (config.keep_backups < 0) {
        console.warn('WARNING: keep_backups cannot be negative, clamping to 0');
        keep_backups = 0;
      } else if (config.keep_backups > 10) {
        console.warn('WARNING: keep_backups exceeds maximum of 10, clamping to 10');
        keep_backups = 10;
      } else {
        keep_backups = config.keep_backups;
      }
    } else {
      console.warn(
        `WARNING: Invalid keep_backups value, using default (${AUDIT_CONFIG.KEEP_BACKUPS})`
      );
      keep_backups = AUDIT_CONFIG.KEEP_BACKUPS;
    }
  }

  return { enabled, log_path, max_size_mb, keep_backups };
}

/**
 * Resolves log path: expands tilde, passes absolute paths unchanged,
 * resolves relative paths under ~/.claude/.
 */
export function resolveLogPath(logPath: string): string {
  const homeDir = os.homedir();

  if (logPath.startsWith('~/')) {
    return path.join(homeDir, logPath.slice(2));
  }

  if (path.isAbsolute(logPath)) {
    return logPath;
  }

  // Relative paths resolve under ~/.claude/
  const claudeDir = path.join(homeDir, '.claude');
  const cleanPath = logPath.startsWith('./') ? logPath.slice(2) : logPath;
  return path.join(claudeDir, cleanPath);
}

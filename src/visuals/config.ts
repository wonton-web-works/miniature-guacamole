/**
 * WS-17: Visual Generation Infrastructure - Config Module
 *
 * Loads and validates visual generation configuration.
 * Supports both global (~/.claude/config.json) and project-level (.clauderc) configs.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { VisualConfig } from './types';

/**
 * Centralized visual generation configuration.
 * Follows AUDIT_CONFIG pattern for consistency.
 */
export const VISUAL_CONFIG = {
  // Default settings
  ENABLED: false,
  OUTPUT_DIR: '.claude/visuals',
  TEMPLATES_DIR: '.claude/templates/visuals',

  // Config file paths (computed lazily to avoid module initialization issues)
  get GLOBAL_CONFIG_PATH(): string {
    const homeDir = os.homedir() || process.env.HOME || '/tmp';
    return path.join(homeDir, '.claude', 'config.json');
  },
  PROJECT_CONFIG_PATH: '.clauderc',

  // Config key in JSON files
  CONFIG_KEY: 'visual_generation',
} as const;

/**
 * Loads visual generation configuration from config files.
 * Priority: .clauderc (project) > ~/.claude/config.json (global) > defaults
 */
export function loadVisualConfig(): VisualConfig {
  const projectConfigPath = path.join(process.cwd(), VISUAL_CONFIG.PROJECT_CONFIG_PATH);

  let globalConfig: Partial<VisualConfig> = {};
  let projectConfig: Partial<VisualConfig> = {};

  // Load global config
  if (fs.existsSync(VISUAL_CONFIG.GLOBAL_CONFIG_PATH)) {
    try {
      const content = fs.readFileSync(VISUAL_CONFIG.GLOBAL_CONFIG_PATH, 'utf8');
      const parsed = JSON.parse(content);
      globalConfig = parsed[VISUAL_CONFIG.CONFIG_KEY] || {};
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
      projectConfig = parsed[VISUAL_CONFIG.CONFIG_KEY] || {};
    } catch (error) {
      // Silently ignore project config errors - use global config
      projectConfig = {};
    }
  }

  // Merge configs: project > global > defaults
  const mergedConfig: Partial<VisualConfig> = {
    enabled: VISUAL_CONFIG.ENABLED,
    output_dir: VISUAL_CONFIG.OUTPUT_DIR,
    templates_dir: VISUAL_CONFIG.TEMPLATES_DIR,
    ...globalConfig,
    ...projectConfig
  };

  return validateVisualConfig(mergedConfig);
}

/**
 * Validates and normalizes visual config values.
 * Applies defaults for missing/invalid fields and logs warnings.
 */
export function validateVisualConfig(config: Partial<VisualConfig>): VisualConfig {
  const validated: VisualConfig = {
    enabled: VISUAL_CONFIG.ENABLED,
    output_dir: VISUAL_CONFIG.OUTPUT_DIR,
    templates_dir: VISUAL_CONFIG.TEMPLATES_DIR
  };

  // Validate enabled
  if (typeof config.enabled === 'boolean') {
    validated.enabled = config.enabled;
  } else if (config.enabled !== undefined) {
    console.warn('WARNING: Invalid enabled value, using default (false)');
    validated.enabled = VISUAL_CONFIG.ENABLED;
  }

  // Validate output_dir
  if (typeof config.output_dir === 'string' && config.output_dir.trim().length > 0) {
    // Sanitize path traversal attempts
    const sanitized = config.output_dir.replace(/\.\./g, '');
    validated.output_dir = sanitized;
  } else if (config.output_dir !== undefined) {
    console.warn('WARNING: Invalid output_dir, using default (.claude/visuals)');
    validated.output_dir = VISUAL_CONFIG.OUTPUT_DIR;
  }

  // Validate templates_dir
  if (typeof config.templates_dir === 'string' && config.templates_dir.trim().length > 0) {
    validated.templates_dir = config.templates_dir;
  } else if (config.templates_dir !== undefined) {
    console.warn('WARNING: Invalid templates_dir, using default (.claude/templates/visuals)');
    validated.templates_dir = VISUAL_CONFIG.TEMPLATES_DIR;
  }

  return validated;
}

/**
 * Resolves visual path with tilde expansion and relative path handling.
 * Relative paths are resolved relative to current working directory.
 */
export function resolveVisualPath(visualPath: string): string {
  const homeDir = os.homedir();

  // Expand tilde
  if (visualPath.startsWith('~/')) {
    return path.join(homeDir, visualPath.slice(2));
  }

  // Handle absolute paths
  if (path.isAbsolute(visualPath)) {
    return visualPath;
  }

  // Treat relative paths as relative to cwd
  return path.resolve(process.cwd(), visualPath);
}

/**
 * Helper function to check if a module can be resolved.
 * Exported separately to allow mocking in tests.
 */
export function canResolveModule(moduleName: string): boolean {
  try {
    require.resolve(moduleName);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if Puppeteer is installed and available.
 * Logs a warning if not installed but returns false instead of throwing.
 */
export function checkPuppeteerInstalled(): boolean {
  const isInstalled = canResolveModule('puppeteer');

  if (!isInstalled) {
    console.warn('WARNING: Puppeteer not installed. Run: npm install puppeteer');
  }

  return isInstalled;
}

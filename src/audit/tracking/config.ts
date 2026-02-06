/**
 * WS-TRACKING Phase 1: Tracking Config Module
 *
 * Loads workstream tracking configuration from config files.
 * Follows the same pattern as audit/config.ts for consistency.
 *
 * Config priority: .clauderc (project) > ~/.claude/config.json (global) > defaults
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { validateWorkstreamId, validateAgentName } from './validation';

/**
 * Schema version for tracking config and audit entries.
 * CTO condition: All entries include schema_version for future migration.
 */
export const SCHEMA_VERSION = '1.0';

/**
 * Tracking configuration interface.
 */
export interface TrackingConfig {
  enabled: boolean;
  schema_version: string;
  workstream_id: string | null;
  agent_name: string | null;
  feature_name: string | null;
}

/**
 * Default tracking configuration values.
 */
export const TRACKING_CONFIG_DEFAULTS: TrackingConfig = {
  enabled: false,
  schema_version: SCHEMA_VERSION,
  workstream_id: null,
  agent_name: null,
  feature_name: null,
};

/** Config key used in JSON files */
const TRACKING_CONFIG_KEY = 'tracking';

/**
 * Loads tracking configuration from config files.
 * Priority: .clauderc (project) > ~/.claude/config.json (global) > defaults
 *
 * Validates workstream_id and agent_name formats.
 * Invalid values are set to null with a console warning.
 */
export function loadTrackingConfig(): TrackingConfig {
  const globalConfigPath = path.join(os.homedir(), '.claude', 'config.json');
  const projectConfigPath = path.join(process.cwd(), '.clauderc');

  let globalTracking: Partial<TrackingConfig> = {};
  let projectTracking: Partial<TrackingConfig> = {};

  // Load global config
  if (fs.existsSync(globalConfigPath)) {
    try {
      const content = fs.readFileSync(globalConfigPath, 'utf8');
      const parsed = JSON.parse(content);
      globalTracking = parsed[TRACKING_CONFIG_KEY] || {};
    } catch (error) {
      console.error(`ERROR: Cannot parse config.json for tracking: ${error}`);
      globalTracking = {};
    }
  }

  // Load project config (overrides global)
  if (fs.existsSync(projectConfigPath)) {
    try {
      const content = fs.readFileSync(projectConfigPath, 'utf8');
      const parsed = JSON.parse(content);
      projectTracking = parsed[TRACKING_CONFIG_KEY] || {};
    } catch (error) {
      console.error(`ERROR: Cannot parse .clauderc for tracking: ${error}`);
      projectTracking = {};
    }
  }

  // Merge: project > global > defaults
  const merged: TrackingConfig = {
    enabled: projectTracking.enabled ?? globalTracking.enabled ?? TRACKING_CONFIG_DEFAULTS.enabled,
    schema_version: SCHEMA_VERSION,
    workstream_id: projectTracking.workstream_id ?? globalTracking.workstream_id ?? TRACKING_CONFIG_DEFAULTS.workstream_id,
    agent_name: projectTracking.agent_name ?? globalTracking.agent_name ?? TRACKING_CONFIG_DEFAULTS.agent_name,
    feature_name: projectTracking.feature_name ?? globalTracking.feature_name ?? TRACKING_CONFIG_DEFAULTS.feature_name,
  };

  // Validate workstream_id format
  if (merged.workstream_id !== null && !validateWorkstreamId(merged.workstream_id)) {
    console.warn(`WARNING: Invalid workstream_id format '${merged.workstream_id}'. Expected pattern: [A-Z]+-[0-9]+ (e.g., WS-18). Setting to null.`);
    merged.workstream_id = null;
  }

  // Validate agent_name format
  if (merged.agent_name !== null && !validateAgentName(merged.agent_name)) {
    console.warn(`WARNING: Invalid agent_name format '${merged.agent_name}'. Expected pattern: lowercase-with-dashes (e.g., code-review). Setting to null.`);
    merged.agent_name = null;
  }

  return merged;
}

/**
 * Auto-detects agent name from a script/module file path.
 * Extracts the filename (without extension) as the agent name.
 *
 * @param scriptPath - Path to the script file, or undefined/empty
 * @returns Detected agent name, or null if not detectable
 */
export function detectAgentName(scriptPath: string | undefined): string | null {
  if (!scriptPath || scriptPath.trim() === '') {
    return null;
  }

  // Extract filename without extension
  const basename = path.basename(scriptPath);
  const name = basename.replace(/\.[^.]+$/, '');

  // Only return if it looks like a valid agent name (not generic like 'index')
  if (!name || name === 'index' || name === 'main') {
    return null;
  }

  // Validate the extracted name matches agent name pattern
  if (!validateAgentName(name)) {
    return null;
  }

  return name;
}

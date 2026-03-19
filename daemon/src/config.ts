// Configuration module for miniature-guacamole daemon

import { existsSync, readFileSync, writeFileSync, statSync, chmodSync } from 'fs';
import { join } from 'path';
import type { DaemonConfig, ValidationError } from './types';

// Config file path - at project root
const CONFIG_FILE_NAME = '.mg-daemon.json';
const CONFIG_PATH = join(process.cwd(), '..', CONFIG_FILE_NAME);

/**
 * Helper to validate a required string field
 */
function validateRequiredString(
  value: string | undefined,
  field: string,
  errors: ValidationError[]
): void {
  if (!value || value.trim() === '') {
    errors.push({ field, message: `${field} is required` });
  }
}

/**
 * Helper to validate a required positive number field
 */
function validatePositiveNumber(
  value: number | undefined,
  field: string,
  errors: ValidationError[]
): void {
  if (!value || value <= 0) {
    errors.push({ field, message: `${field} must be a positive number` });
  }
}

/**
 * Validates a config object and returns array of validation errors.
 * Only validates the active provider's config section (not all sections).
 *
 * AC-1.4: Returns structured validation errors for missing fields
 * AC-1.5: Validates jira.host as valid URL
 * AC-1.9: 99%+ branch coverage on validation paths
 */
export function validateConfig(config: DaemonConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate provider field
  const validProviders = ['jira', 'linear', 'github'];
  if (!config.provider || !validProviders.includes(config.provider)) {
    errors.push({
      field: 'provider',
      message: `provider must be one of: ${validProviders.join(', ')}`,
    });
    // Can't validate provider-specific config without a valid provider
    return errors;
  }

  // Validate only the active provider's config section
  if (config.provider === 'jira') {
    if (!config.jira?.host || config.jira.host.trim() === '') {
      errors.push({ field: 'jira.host', message: 'jira.host is required' });
    } else {
      try {
        new URL(config.jira.host);
      } catch {
        errors.push({ field: 'jira.host', message: 'jira.host must be a valid URL' });
      }
    }

    validateRequiredString(config.jira?.email, 'jira.email', errors);
    validateRequiredString(config.jira?.apiToken, 'jira.apiToken', errors);
    validateRequiredString(config.jira?.project, 'jira.project', errors);
    validateRequiredString(config.jira?.jql, 'jira.jql', errors);
  }

  if (config.provider === 'linear') {
    validateRequiredString(config.linear?.apiKey, 'linear.apiKey', errors);
    validateRequiredString(config.linear?.teamId, 'linear.teamId', errors);
  }

  // Always validate github section (used for PR creation regardless of ticket provider)
  validateRequiredString(config.github?.repo, 'github.repo', errors);
  validateRequiredString(config.github?.baseBranch, 'github.baseBranch', errors);

  // Validate polling section
  validatePositiveNumber(config.polling?.intervalSeconds, 'polling.intervalSeconds', errors);
  validatePositiveNumber(config.polling?.batchSize, 'polling.batchSize', errors);

  // Validate optional triage section (WS-DAEMON-15)
  if (config.triage !== undefined) {
    if (typeof config.triage.enabled !== 'boolean') {
      errors.push({ field: 'triage.enabled', message: 'triage.enabled must be a boolean' });
    }
    if (typeof config.triage.autoReject !== 'boolean') {
      errors.push({ field: 'triage.autoReject', message: 'triage.autoReject must be a boolean' });
    }
    if (typeof config.triage.maxTicketSizeChars !== 'number' || config.triage.maxTicketSizeChars <= 0) {
      errors.push({ field: 'triage.maxTicketSizeChars', message: 'triage.maxTicketSizeChars must be a positive number' });
    }
  }

  return errors;
}

/**
 * Loads and validates daemon configuration from .mg-daemon.json
 * AC-1.1: Throws error if config file does not exist
 * AC-1.4: Returns validation errors for missing required fields
 * AC-1.5: Validates URL format for jira.host
 * AC-1.6: Returns typed DaemonConfig object when valid
 */
export function loadConfig(): DaemonConfig {
  // AC-1.1: Check if config exists
  if (!existsSync(CONFIG_PATH)) {
    throw new Error('Config not found. Run mg-daemon init.');
  }

  // Enforce 0o600 permissions — config may contain API tokens
  const stat = statSync(CONFIG_PATH);
  if ((stat.mode & 0o077) !== 0) {
    chmodSync(CONFIG_PATH, 0o600);
  }

  // Read and parse config
  const fileContent = readFileSync(CONFIG_PATH, 'utf-8');
  const config = JSON.parse(fileContent) as DaemonConfig;

  // Validate config
  const errors = validateConfig(config);
  if (errors.length > 0) {
    const errorMessages = errors.map(e => `${e.field}: ${e.message}`).join(', ');
    throw new Error(`Configuration validation failed: ${errorMessages}`);
  }

  return config;
}

/**
 * Initializes a new config file with template values for all three providers.
 * AC-1.2: Creates template with all required fields when file doesn't exist
 * AC-1.3: Throws error if config file already exists
 */
export function initConfig(): void {
  // AC-1.3: Check if config already exists
  if (existsSync(CONFIG_PATH)) {
    throw new Error('Config already exists');
  }

  // AC-1.2: Create template config with all provider sections
  const template: DaemonConfig = {
    provider: 'jira',
    jira: {
      host: 'https://your-domain.atlassian.net',
      email: 'YOUR_JIRA_EMAIL',
      apiToken: 'YOUR_JIRA_API_TOKEN',
      project: 'PROJECT_KEY',
      jql: 'project = PROJECT_KEY AND status = "To Do"',
    },
    linear: {
      apiKey: 'YOUR_LINEAR_API_KEY',
      teamId: 'YOUR_LINEAR_TEAM_ID',
      filter: 'state[name][eq]: "Todo"',
    },
    github: {
      repo: 'owner/repository',
      baseBranch: 'main',
      issueFilter: 'label:mg-daemon state:open',
    },
    polling: {
      intervalSeconds: 300,
      batchSize: 5,
    },
    triage: {
      enabled: true,
      autoReject: false,
      maxTicketSizeChars: 10000,
    },
  };

  // Write config with formatting — mode 0o600 keeps API tokens owner-readable only
  const configJson = JSON.stringify(template, null, 2);
  writeFileSync(CONFIG_PATH, configJson, { encoding: 'utf-8', mode: 0o600 });
}

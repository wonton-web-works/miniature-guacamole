// Configuration module for miniature-guacamole daemon

import { existsSync, readFileSync, writeFileSync } from 'fs';
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
 * Validates a config object and returns array of validation errors
 * AC-1.4: Returns structured validation errors for missing fields
 * AC-1.5: Validates jira.host as valid URL
 * AC-1.9: 99%+ branch coverage on validation paths
 * @param config - The configuration object to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateConfig(config: DaemonConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate jira section
  if (!config.jira?.host || config.jira.host.trim() === '') {
    errors.push({ field: 'jira.host', message: 'jira.host is required' });
  } else {
    // Validate URL format
    try {
      new URL(config.jira.host);
    } catch {
      errors.push({ field: 'jira.host', message: 'jira.host must be a valid URL' });
    }
  }

  validateRequiredString(config.jira?.apiToken, 'jira.apiToken', errors);
  validateRequiredString(config.jira?.project, 'jira.project', errors);
  validateRequiredString(config.jira?.jql, 'jira.jql', errors);

  // Validate github section
  validateRequiredString(config.github?.repo, 'github.repo', errors);
  validateRequiredString(config.github?.token, 'github.token', errors);
  validateRequiredString(config.github?.baseBranch, 'github.baseBranch', errors);

  // Validate polling section
  validatePositiveNumber(config.polling?.intervalSeconds, 'polling.intervalSeconds', errors);
  validatePositiveNumber(config.polling?.batchSize, 'polling.batchSize', errors);

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
 * Initializes a new config file with template values
 * AC-1.2: Creates template with all required fields when file doesn't exist
 * AC-1.3: Throws error if config file already exists
 */
export function initConfig(): void {
  // AC-1.3: Check if config already exists
  if (existsSync(CONFIG_PATH)) {
    throw new Error('Config already exists');
  }

  // AC-1.2: Create template config
  const template: DaemonConfig = {
    jira: {
      host: 'https://your-domain.atlassian.net',
      apiToken: 'YOUR_JIRA_API_TOKEN',
      project: 'PROJECT_KEY',
      jql: 'project = PROJECT_KEY AND status = "To Do"',
    },
    github: {
      repo: 'owner/repository',
      token: 'ghp_YOUR_GITHUB_TOKEN',
      baseBranch: 'main',
    },
    polling: {
      intervalSeconds: 300,
      batchSize: 5,
    },
  };

  // Write config with formatting
  const configJson = JSON.stringify(template, null, 2);
  writeFileSync(CONFIG_PATH, configJson, 'utf-8');
}

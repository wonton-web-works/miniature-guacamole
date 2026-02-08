// Config loader - ARCH-006 compliant YAML config loading
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { load } from 'js-yaml';
import type { DaemonConfig } from './types';
import { validateConfig } from './validator';

export function loadConfig(projectPath: string, configPath?: string): DaemonConfig {
  // Determine config file path
  const finalPath = configPath || resolve(projectPath, '.claude/daemon-config.yaml');

  // Check if file exists
  if (!existsSync(finalPath)) {
    throw new Error(
      'Config file not found at .claude/daemon-config.yaml. Run "mg-daemon init" to create one.'
    );
  }

  // Read file contents
  let fileContents: string;
  try {
    fileContents = readFileSync(finalPath, 'utf-8');
  } catch (error: any) {
    if (error.code === 'EACCES') {
      throw new Error(`Permission denied reading config file: ${finalPath}`);
    }
    if (error.code === 'EISDIR') {
      throw new Error(`Path is a directory, not a file: ${finalPath}`);
    }
    throw error;
  }

  // Parse YAML
  let parsed: any;
  try {
    parsed = load(fileContents);
  } catch (error: any) {
    throw new Error(`YAML parse error: ${error.message}`);
  }

  // Check for empty or invalid content
  if (!parsed || parsed === null || parsed === undefined) {
    throw new Error('Config file is empty or invalid');
  }

  // Check that root is an object
  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Config file must be an object');
  }

  // Validate the config structure
  const errors = validateConfig(parsed as DaemonConfig);
  if (errors.length > 0) {
    const errorMessages = errors.map(e => `${e.field}: ${e.message}`).join(', ');
    throw new Error(`Configuration validation failed: ${errorMessages}`);
  }

  return parsed as DaemonConfig;
}

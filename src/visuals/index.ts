/**
 * WS-17: Visual Generation Infrastructure - Public API
 *
 * Exports all public interfaces and functions for visual generation.
 */

export type { VisualConfig, DesignSpec, ValidationResult } from './types';

export {
  loadVisualConfig,
  validateVisualConfig,
  resolveVisualPath,
  checkPuppeteerInstalled,
  VISUAL_CONFIG
} from './config';

export {
  validateDesignSpec,
  isValidDesignSpec,
  getValidationErrors
} from './validate';

export {
  createWorkstreamDirectories,
  getWorkstreamPath,
  ensureDirectoryExists,
  validateDirectoryPermissions,
  createVisualsDirectory
} from './directories';

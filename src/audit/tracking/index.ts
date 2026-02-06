/**
 * WS-TRACKING Phase 1: Public API
 *
 * Exports all tracking module functionality:
 * - Configuration loading and agent detection
 * - Validation for workstream IDs, agent names, feature names
 * - Tagging functions to add tracking fields to audit entries
 * - Constants for schema version and validation patterns
 */

// Config exports
export {
  loadTrackingConfig,
  detectAgentName,
  SCHEMA_VERSION,
  TRACKING_CONFIG_DEFAULTS,
} from './config';
export type { TrackingConfig } from './config';

// Validation exports
export {
  validateWorkstreamId,
  validateAgentName,
  validateFeatureName,
  WORKSTREAM_ID_PATTERN,
  AGENT_NAME_PATTERN,
  FEATURE_NAME_PATTERN,
} from './validation';

// Tagging exports
export {
  addTrackingFields,
  createTrackingFields,
} from './tagging';
export type { TrackingFields, TrackedAuditEntry } from './tagging';

/**
 * WS-TRACKING Phase 1: Validation Module
 *
 * Validates workstream tracking fields:
 * - workstream_id: Must match pattern [A-Z]+-[0-9]+ (e.g., WS-18)
 * - agent_name: Must match pattern ^[a-z]+(-[a-z]+)*$ (e.g., code-review)
 * - feature_name: Lowercase string, non-empty if provided
 *
 * All fields are optional (null/undefined are valid).
 */

/**
 * Pattern for valid workstream IDs.
 * Format: One or more uppercase letters, a dash, one or more digits.
 * Examples: WS-18, PROJ-1, TRACKING-100
 */
export const WORKSTREAM_ID_PATTERN = /^[A-Z]+-[0-9]+$/;

/**
 * Pattern for valid agent names.
 * Format: Lowercase letters, optionally separated by single dashes.
 * Examples: qa, code-review, staff-engineer
 */
export const AGENT_NAME_PATTERN = /^[a-z]+(-[a-z]+)*$/;

/**
 * Pattern for valid feature names.
 * Format: Lowercase letters and digits, optionally separated by single dashes.
 * Examples: dark-mode, auth, user-profile-v2
 */
export const FEATURE_NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Validates a workstream ID against the required pattern.
 * Null and undefined are valid (field is optional).
 *
 * @param id - The workstream ID to validate, or null/undefined
 * @returns true if valid or null/undefined, false if invalid format
 */
export function validateWorkstreamId(id: string | null | undefined): boolean {
  if (id === null || id === undefined) {
    return true;
  }

  return WORKSTREAM_ID_PATTERN.test(id);
}

/**
 * Validates an agent name against the required pattern.
 * Null and undefined are valid (field is optional).
 *
 * @param name - The agent name to validate, or null/undefined
 * @returns true if valid or null/undefined, false if invalid format
 */
export function validateAgentName(name: string | null | undefined): boolean {
  if (name === null || name === undefined) {
    return true;
  }

  return AGENT_NAME_PATTERN.test(name);
}

/**
 * Validates a feature name.
 * Null and undefined are valid (field is optional).
 * Empty string is not valid.
 *
 * @param name - The feature name to validate, or null/undefined
 * @returns true if valid or null/undefined, false if invalid
 */
export function validateFeatureName(name: string | null | undefined): boolean {
  if (name === null || name === undefined) {
    return true;
  }

  return FEATURE_NAME_PATTERN.test(name);
}

/**
 * WS-TRACKING Phase 1: Tagging Module
 *
 * Adds workstream tracking fields to audit log entries.
 * Preserves all existing audit entry fields (backward compatible).
 *
 * Fields added:
 * - schema_version: Always present (CTO condition)
 * - workstream_id: Optional, from config
 * - agent_name: Optional, auto-detected or from config
 * - feature_name: Optional, from config
 */

import type { AuditEntry } from '../format';
import { SCHEMA_VERSION } from './config';

/**
 * Tracking fields to be added to audit log entries.
 */
export interface TrackingFields {
  schema_version: string;
  workstream_id: string | null;
  agent_name: string | null;
  feature_name: string | null;
}

/**
 * Audit entry extended with tracking fields.
 */
export interface TrackedAuditEntry extends AuditEntry {
  schema_version: string;
  workstream_id: string | null;
  agent_name: string | null;
  feature_name: string | null;
}

/**
 * Creates a TrackingFields object from partial input.
 * Missing fields default to null. schema_version is always set.
 *
 * @param input - Partial tracking field values
 * @returns Complete TrackingFields with nulls for missing values
 */
export function createTrackingFields(input: {
  schema_version: string;
  workstream_id?: string | null;
  agent_name?: string | null;
  feature_name?: string | null;
}): TrackingFields {
  return {
    schema_version: input.schema_version,
    workstream_id: input.workstream_id ?? null,
    agent_name: input.agent_name ?? null,
    feature_name: input.feature_name ?? null,
  };
}

/**
 * Adds tracking fields to an existing audit entry.
 * Preserves all original fields. If no tracking is provided,
 * defaults to null values with current schema_version.
 *
 * @param entry - Base audit entry
 * @param tracking - Optional tracking fields to add
 * @returns New entry object with tracking fields merged in
 */
export function addTrackingFields(
  entry: AuditEntry,
  tracking?: TrackingFields,
): TrackedAuditEntry {
  const fields = tracking ?? createTrackingFields({
    schema_version: SCHEMA_VERSION,
  });

  return {
    schema_version: fields.schema_version,
    ...entry,
    workstream_id: fields.workstream_id,
    agent_name: fields.agent_name,
    feature_name: fields.feature_name,
  };
}

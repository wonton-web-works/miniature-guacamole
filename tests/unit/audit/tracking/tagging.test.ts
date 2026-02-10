/**
 * WS-TRACKING Phase 1: Tagging Module Tests
 *
 * BDD Scenarios:
 * - AC-1.1: Each audit log entry includes workstream_id field
 * - AC-1.2: Each audit log entry includes agent_name field
 * - AC-1.5: Fields are optional (backward compatibility)
 * - AC-1.6: Null values handled gracefully
 * - TRACK-BDD-1: Log entry includes workstream tagging
 * - TRACK-BDD-4: Backward compatibility with non-workstream usage
 * - CTO: schema_version field in entries
 *
 * Target: 100% coverage of tagging.ts
 */

import { describe, it, expect } from 'vitest';
import {
  addTrackingFields,
  createTrackingFields,
  TrackingFields,
} from '@/audit/tracking/tagging';
import type { AuditEntry } from '@/audit/format';

describe('audit/tracking/tagging - createTrackingFields()', () => {
  describe('Given complete tracking configuration (TRACK-BDD-1)', () => {
    it('When creating tracking fields with all values, Then returns complete object', () => {
      const fields = createTrackingFields({
        schema_version: '1.0',
        workstream_id: 'WS-18',
        agent_name: 'mg-code-review',
        feature_name: 'dark-mode',
      });

      expect(fields.schema_version).toBe('1.0');
      expect(fields.workstream_id).toBe('WS-18');
      expect(fields.agent_name).toBe('mg-code-review');
      expect(fields.feature_name).toBe('dark-mode');
    });
  });

  describe('Given partial tracking configuration (AC-1.5)', () => {
    it('When only workstream_id provided, Then other fields are null', () => {
      const fields = createTrackingFields({
        schema_version: '1.0',
        workstream_id: 'WS-18',
      });

      expect(fields.workstream_id).toBe('WS-18');
      expect(fields.agent_name).toBeNull();
      expect(fields.feature_name).toBeNull();
    });

    it('When only agent_name provided, Then other fields are null', () => {
      const fields = createTrackingFields({
        schema_version: '1.0',
        agent_name: 'qa',
      });

      expect(fields.workstream_id).toBeNull();
      expect(fields.agent_name).toBe('qa');
      expect(fields.feature_name).toBeNull();
    });
  });

  describe('Given no tracking values (TRACK-BDD-4, AC-1.6)', () => {
    it('When no values provided, Then all fields are null', () => {
      const fields = createTrackingFields({
        schema_version: '1.0',
      });

      expect(fields.schema_version).toBe('1.0');
      expect(fields.workstream_id).toBeNull();
      expect(fields.agent_name).toBeNull();
      expect(fields.feature_name).toBeNull();
    });
  });

  describe('Given schema_version requirement (CTO condition)', () => {
    it('When creating fields, Then schema_version is always present', () => {
      const fields = createTrackingFields({ schema_version: '1.0' });
      expect(fields.schema_version).toBe('1.0');
    });
  });
});

describe('audit/tracking/tagging - addTrackingFields()', () => {
  const baseEntry: AuditEntry = {
    timestamp: '2026-02-04T23:45:12.345Z',
    session_id: '550e8400-e29b-41d4-a716-446655440000',
    model: 'claude-opus-4-5-20251101',
    input_tokens: 1234,
    output_tokens: 567,
    cache_creation_tokens: 1688,
    cache_read_tokens: 19666,
    total_cost_usd: 0.02124,
    duration_ms: 2231,
  };

  describe('Given a base audit entry with tracking fields (AC-1.1, AC-1.2)', () => {
    it('When adding tracking fields, Then entry includes workstream_id', () => {
      const tracking: TrackingFields = {
        schema_version: '1.0',
        workstream_id: 'WS-18',
        agent_name: 'mg-code-review',
        feature_name: 'dark-mode',
      };

      const result = addTrackingFields(baseEntry, tracking);

      expect(result.workstream_id).toBe('WS-18');
    });

    it('When adding tracking fields, Then entry includes agent_name', () => {
      const tracking: TrackingFields = {
        schema_version: '1.0',
        workstream_id: 'WS-18',
        agent_name: 'mg-code-review',
        feature_name: null,
      };

      const result = addTrackingFields(baseEntry, tracking);

      expect(result.agent_name).toBe('mg-code-review');
    });

    it('When adding tracking fields, Then entry includes schema_version', () => {
      const tracking: TrackingFields = {
        schema_version: '1.0',
        workstream_id: null,
        agent_name: null,
        feature_name: null,
      };

      const result = addTrackingFields(baseEntry, tracking);

      expect(result.schema_version).toBe('1.0');
    });

    it('When adding tracking fields, Then original fields are preserved', () => {
      const tracking: TrackingFields = {
        schema_version: '1.0',
        workstream_id: 'WS-18',
        agent_name: 'mg-code-review',
        feature_name: 'dark-mode',
      };

      const result = addTrackingFields(baseEntry, tracking);

      expect(result.timestamp).toBe(baseEntry.timestamp);
      expect(result.session_id).toBe(baseEntry.session_id);
      expect(result.model).toBe(baseEntry.model);
      expect(result.input_tokens).toBe(baseEntry.input_tokens);
      expect(result.output_tokens).toBe(baseEntry.output_tokens);
      expect(result.cache_creation_tokens).toBe(baseEntry.cache_creation_tokens);
      expect(result.cache_read_tokens).toBe(baseEntry.cache_read_tokens);
      expect(result.total_cost_usd).toBe(baseEntry.total_cost_usd);
      expect(result.duration_ms).toBe(baseEntry.duration_ms);
    });

    it('When serialized to JSON, Then is valid JSONL (single line)', () => {
      const tracking: TrackingFields = {
        schema_version: '1.0',
        workstream_id: 'WS-18',
        agent_name: 'mg-code-review',
        feature_name: 'dark-mode',
      };

      const result = addTrackingFields(baseEntry, tracking);
      const json = JSON.stringify(result);

      expect(json).not.toContain('\n');
      expect(json).not.toContain('\r');
      expect(() => JSON.parse(json)).not.toThrow();
    });
  });

  describe('Given null tracking fields (AC-1.5, AC-1.6, TRACK-BDD-4)', () => {
    it('When all tracking fields are null, Then entry is still valid', () => {
      const tracking: TrackingFields = {
        schema_version: '1.0',
        workstream_id: null,
        agent_name: null,
        feature_name: null,
      };

      const result = addTrackingFields(baseEntry, tracking);

      expect(result.workstream_id).toBeNull();
      expect(result.agent_name).toBeNull();
      expect(result.feature_name).toBeNull();
      expect(result.schema_version).toBe('1.0');
      // Original fields preserved
      expect(result.timestamp).toBe(baseEntry.timestamp);
      expect(result.session_id).toBe(baseEntry.session_id);
    });

    it('When all tracking fields are null, Then JSON serialization handles nulls', () => {
      const tracking: TrackingFields = {
        schema_version: '1.0',
        workstream_id: null,
        agent_name: null,
        feature_name: null,
      };

      const result = addTrackingFields(baseEntry, tracking);
      const json = JSON.stringify(result);
      const parsed = JSON.parse(json);

      expect(parsed.workstream_id).toBeNull();
      expect(parsed.agent_name).toBeNull();
      expect(parsed.feature_name).toBeNull();
    });
  });

  describe('Given no tracking fields provided (backward compatibility)', () => {
    it('When tracking is undefined, Then returns entry with default null tracking', () => {
      const result = addTrackingFields(baseEntry);

      expect(result.schema_version).toBe('1.0');
      expect(result.workstream_id).toBeNull();
      expect(result.agent_name).toBeNull();
      expect(result.feature_name).toBeNull();
      // Original fields still present
      expect(result.timestamp).toBe(baseEntry.timestamp);
    });
  });
});

describe('audit/tracking/tagging - TrackingFields type', () => {
  it('TrackingFields has required shape with all fields', () => {
    const fields: TrackingFields = {
      schema_version: '1.0',
      workstream_id: 'WS-18',
      agent_name: 'mg-code-review',
      feature_name: 'dark-mode',
    };

    expect(fields).toHaveProperty('schema_version');
    expect(fields).toHaveProperty('workstream_id');
    expect(fields).toHaveProperty('agent_name');
    expect(fields).toHaveProperty('feature_name');
  });

  it('TrackingFields allows null values for optional fields', () => {
    const fields: TrackingFields = {
      schema_version: '1.0',
      workstream_id: null,
      agent_name: null,
      feature_name: null,
    };

    expect(fields.workstream_id).toBeNull();
    expect(fields.agent_name).toBeNull();
    expect(fields.feature_name).toBeNull();
  });
});

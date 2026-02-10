/**
 * WS-TRACKING Phase 1: Integration Test - End-to-End Tracking Flow
 *
 * Tests the complete flow of:
 * 1. Loading tracking config from .clauderc
 * 2. Validating workstream_id and agent_name
 * 3. Adding tracking fields to audit entries
 * 4. Ensuring backward compatibility
 *
 * BDD Scenarios:
 * - TRACK-BDD-1: Full tagging flow
 * - TRACK-BDD-2: Config persistence across requests
 * - TRACK-BDD-4: Backward compatibility
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock('os', () => ({
  homedir: vi.fn(),
}));

import {
  loadTrackingConfig,
  validateWorkstreamId,
  validateAgentName,
  addTrackingFields,
  createTrackingFields,
  SCHEMA_VERSION,
} from '@/audit/tracking/index';
import type { AuditEntry } from '@/audit/format';
import * as fs from 'fs';
import * as os from 'os';

describe('Integration: Audit Tracking End-to-End', () => {
  const mockHomeDir = '/home/testuser';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(os.homedir).mockReturnValue(mockHomeDir);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('TRACK-BDD-1: Full audit entry with workstream tagging', () => {
    it('Given WS-18 workstream with mg-code-review agent, When audit entry created, Then all fields present', () => {
      // Setup: .clauderc with tracking config
      const projectConfig = {
        tracking: {
          enabled: true,
          workstream_id: 'WS-18',
          agent_name: 'mg-code-review',
          feature_name: 'dark-mode',
        }
      };

      vi.mocked(fs.existsSync).mockImplementation((p) => {
        return p.toString().includes('.clauderc');
      });
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(projectConfig));

      // Step 1: Load config
      const trackingConfig = loadTrackingConfig();
      expect(trackingConfig.enabled).toBe(true);
      expect(trackingConfig.workstream_id).toBe('WS-18');

      // Step 2: Validate fields
      expect(validateWorkstreamId(trackingConfig.workstream_id)).toBe(true);
      expect(validateAgentName(trackingConfig.agent_name)).toBe(true);

      // Step 3: Create tracking fields
      const tracking = createTrackingFields({
        schema_version: trackingConfig.schema_version,
        workstream_id: trackingConfig.workstream_id,
        agent_name: trackingConfig.agent_name,
        feature_name: trackingConfig.feature_name,
      });

      // Step 4: Add to audit entry
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

      const taggedEntry = addTrackingFields(baseEntry, tracking);

      // Verify all fields
      expect(taggedEntry.schema_version).toBe('1.0');
      expect(taggedEntry.workstream_id).toBe('WS-18');
      expect(taggedEntry.agent_name).toBe('mg-code-review');
      expect(taggedEntry.feature_name).toBe('dark-mode');
      expect(taggedEntry.model).toBe('claude-opus-4-5-20251101');
      expect(taggedEntry.input_tokens).toBe(1234);

      // Verify JSONL compatibility
      const jsonStr = JSON.stringify(taggedEntry);
      expect(jsonStr).not.toContain('\n');
      const parsed = JSON.parse(jsonStr);
      expect(parsed.workstream_id).toBe('WS-18');
    });
  });

  describe('TRACK-BDD-2: Workstream ID persistence across multiple entries', () => {
    it('Given .clauderc with WS-21, When 3 entries created, Then all tagged with WS-21', () => {
      const projectConfig = {
        tracking: {
          enabled: true,
          workstream_id: 'WS-21',
        }
      };

      vi.mocked(fs.existsSync).mockImplementation((p) => {
        return p.toString().includes('.clauderc');
      });
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(projectConfig));

      const config = loadTrackingConfig();
      const tracking = createTrackingFields({
        schema_version: config.schema_version,
        workstream_id: config.workstream_id,
      });

      // Create 3 entries
      const entries = [1, 2, 3].map((i) => {
        const entry: AuditEntry = {
          timestamp: `2026-02-04T23:45:1${i}.345Z`,
          session_id: `session-${i}`,
          model: 'claude-opus-4-5-20251101',
          input_tokens: 1000 * i,
          output_tokens: 500 * i,
          cache_creation_tokens: null,
          cache_read_tokens: null,
          total_cost_usd: 0.01 * i,
          duration_ms: 1000 * i,
        };
        return addTrackingFields(entry, tracking);
      });

      // All 3 entries should have WS-21
      entries.forEach((entry) => {
        expect(entry.workstream_id).toBe('WS-21');
        expect(entry.schema_version).toBe('1.0');
      });
    });
  });

  describe('TRACK-BDD-4: Backward compatibility (no tracking config)', () => {
    it('Given no tracking config, When audit entry created, Then tracking fields are null', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const config = loadTrackingConfig();
      expect(config.enabled).toBe(false);

      const baseEntry: AuditEntry = {
        timestamp: '2026-02-04T23:45:12.345Z',
        session_id: '550e8400',
        model: 'claude-opus-4-5-20251101',
        input_tokens: 1234,
        output_tokens: 567,
        cache_creation_tokens: null,
        cache_read_tokens: null,
        total_cost_usd: 0.02124,
        duration_ms: 2231,
      };

      // Even without tracking enabled, addTrackingFields should work
      const taggedEntry = addTrackingFields(baseEntry);

      expect(taggedEntry.workstream_id).toBeNull();
      expect(taggedEntry.agent_name).toBeNull();
      expect(taggedEntry.feature_name).toBeNull();
      expect(taggedEntry.schema_version).toBe('1.0');

      // Original fields preserved
      expect(taggedEntry.timestamp).toBe(baseEntry.timestamp);
      expect(taggedEntry.model).toBe(baseEntry.model);
      expect(taggedEntry.input_tokens).toBe(1234);
    });

    it('Given no tracking config, When entry serialized to JSON, Then is valid JSONL', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const baseEntry: AuditEntry = {
        timestamp: '2026-02-04T23:45:12.345Z',
        session_id: '550e8400',
        model: 'claude-opus-4-5-20251101',
        input_tokens: 1234,
        output_tokens: 567,
        cache_creation_tokens: null,
        cache_read_tokens: null,
        total_cost_usd: 0.02124,
        duration_ms: 2231,
      };

      const taggedEntry = addTrackingFields(baseEntry);
      const json = JSON.stringify(taggedEntry);

      expect(json).not.toContain('\n');
      expect(() => JSON.parse(json)).not.toThrow();

      const parsed = JSON.parse(json);
      expect(parsed.workstream_id).toBeNull();
      expect(parsed.timestamp).toBe('2026-02-04T23:45:12.345Z');
    });
  });

  describe('TRACK-EDGE-3: Null handling in mixed workstream usage', () => {
    it('Given mix of tagged and untagged entries, When queried, Then all entries valid', () => {
      const tracking_ws18 = createTrackingFields({
        schema_version: '1.0',
        workstream_id: 'WS-18',
        agent_name: 'mg-code-review',
      });

      const tracking_none = createTrackingFields({
        schema_version: '1.0',
      });

      const baseEntry: AuditEntry = {
        timestamp: '2026-02-04T23:45:12.345Z',
        session_id: 'session-1',
        model: 'claude-opus-4-5-20251101',
        input_tokens: 1000,
        output_tokens: 500,
        cache_creation_tokens: null,
        cache_read_tokens: null,
        total_cost_usd: 0.01,
        duration_ms: 1000,
      };

      const taggedEntry = addTrackingFields(baseEntry, tracking_ws18);
      const untaggedEntry = addTrackingFields(
        { ...baseEntry, session_id: 'session-2' },
        tracking_none,
      );

      // Both are valid JSON
      expect(() => JSON.parse(JSON.stringify(taggedEntry))).not.toThrow();
      expect(() => JSON.parse(JSON.stringify(untaggedEntry))).not.toThrow();

      // Tagged entry has values
      expect(taggedEntry.workstream_id).toBe('WS-18');
      expect(taggedEntry.agent_name).toBe('mg-code-review');

      // Untagged entry has nulls
      expect(untaggedEntry.workstream_id).toBeNull();
      expect(untaggedEntry.agent_name).toBeNull();

      // Both have schema_version
      expect(taggedEntry.schema_version).toBe('1.0');
      expect(untaggedEntry.schema_version).toBe('1.0');
    });
  });

  describe('Schema versioning (CTO condition)', () => {
    it('SCHEMA_VERSION constant is "1.0"', () => {
      expect(SCHEMA_VERSION).toBe('1.0');
    });

    it('Config always includes schema_version regardless of tracking enabled state', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const config = loadTrackingConfig();
      expect(config.schema_version).toBe('1.0');
    });
  });
});

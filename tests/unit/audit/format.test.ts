/**
 * WS-16: Token Usage Audit Log - Format Module Tests
 *
 * BDD Scenarios:
 * - US-1: Track token usage per request
 * - Validates audit entry formatting
 * - Handles missing data gracefully
 *
 * Target: 100% coverage
 */

import { describe, it, expect } from 'vitest';
import { formatAuditEntry, validateEntry } from '@/audit/format';

describe('audit/format - formatAuditEntry()', () => {
  describe('Given a complete API response', () => {
    it('When formatting audit entry, Then returns valid JSON', () => {
      const response = {
        model: 'claude-opus-4-5-20251101',
        usage: {
          input_tokens: 1234,
          output_tokens: 567,
          cache_creation_input_tokens: 1688,
          cache_read_input_tokens: 19666
        },
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        total_cost_usd: 0.02124,
        duration_ms: 2231
      };

      const entry = formatAuditEntry(response);

      expect(() => JSON.parse(entry)).not.toThrow();
    });

    it('When formatting audit entry, Then includes all required fields', () => {
      const response = {
        model: 'claude-opus-4-5-20251101',
        usage: {
          input_tokens: 1234,
          output_tokens: 567,
          cache_creation_input_tokens: 1688,
          cache_read_input_tokens: 19666
        },
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        total_cost_usd: 0.02124,
        duration_ms: 2231
      };

      const entry = formatAuditEntry(response);
      const parsed = JSON.parse(entry);

      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('session_id');
      expect(parsed).toHaveProperty('model');
      expect(parsed).toHaveProperty('input_tokens');
      expect(parsed).toHaveProperty('output_tokens');
      expect(parsed).toHaveProperty('cache_creation_tokens');
      expect(parsed).toHaveProperty('cache_read_tokens');
      expect(parsed).toHaveProperty('total_cost_usd');
      expect(parsed).toHaveProperty('duration_ms');
    });

    it('When formatting audit entry, Then maps API fields correctly', () => {
      const response = {
        model: 'claude-opus-4-5-20251101',
        usage: {
          input_tokens: 1234,
          output_tokens: 567,
          cache_creation_input_tokens: 1688,
          cache_read_input_tokens: 19666
        },
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        total_cost_usd: 0.02124,
        duration_ms: 2231
      };

      const entry = formatAuditEntry(response);
      const parsed = JSON.parse(entry);

      expect(parsed.model).toBe('claude-opus-4-5-20251101');
      expect(parsed.input_tokens).toBe(1234);
      expect(parsed.output_tokens).toBe(567);
      expect(parsed.cache_creation_tokens).toBe(1688);
      expect(parsed.cache_read_tokens).toBe(19666);
      expect(parsed.session_id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(parsed.total_cost_usd).toBe(0.02124);
      expect(parsed.duration_ms).toBe(2231);
    });

    it('When formatting audit entry, Then timestamp is ISO 8601 format', () => {
      const response = {
        model: 'claude-opus-4-5-20251101',
        usage: {
          input_tokens: 1234,
          output_tokens: 567
        },
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        total_cost_usd: 0.02124,
        duration_ms: 2231
      };

      const entry = formatAuditEntry(response);
      const parsed = JSON.parse(entry);

      // ISO 8601: YYYY-MM-DDTHH:mm:ss.sssZ
      expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('When formatting audit entry, Then result is single line (JSONL)', () => {
      const response = {
        model: 'claude-opus-4-5-20251101',
        usage: {
          input_tokens: 1234,
          output_tokens: 567
        },
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        total_cost_usd: 0.02124,
        duration_ms: 2231
      };

      const entry = formatAuditEntry(response);

      expect(entry).not.toContain('\n');
      expect(entry).not.toContain('\r');
    });

    it('When formatting with multiple models, Then includes models_used array', () => {
      const response = {
        model: 'claude-opus-4-5-20251101',
        usage: {
          input_tokens: 1234,
          output_tokens: 567
        },
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        total_cost_usd: 0.02124,
        duration_ms: 2231,
        models_used: ['claude-haiku-4-5-20251001', 'claude-opus-4-5-20251101']
      };

      const entry = formatAuditEntry(response);
      const parsed = JSON.parse(entry);

      expect(parsed.models_used).toEqual(['claude-haiku-4-5-20251001', 'claude-opus-4-5-20251101']);
    });
  });

  describe('Given API response with missing usage data (EC-5)', () => {
    it('When formatting audit entry, Then logs null for missing token counts', () => {
      const response = {
        model: 'claude-opus-4-5-20251101',
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        duration_ms: 2231
        // usage field is missing
      };

      const entry = formatAuditEntry(response);
      const parsed = JSON.parse(entry);

      expect(parsed.input_tokens).toBeNull();
      expect(parsed.output_tokens).toBeNull();
      expect(parsed.cache_creation_tokens).toBeNull();
      expect(parsed.cache_read_tokens).toBeNull();
      expect(parsed.total_cost_usd).toBeNull();
    });

    it('When formatting with missing usage, Then includes warning field', () => {
      const response = {
        model: 'claude-opus-4-5-20251101',
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        duration_ms: 2231
      };

      const entry = formatAuditEntry(response);
      const parsed = JSON.parse(entry);

      expect(parsed.warning).toBe('missing_usage_data');
    });

    it('When formatting with partial usage data, Then preserves available values', () => {
      const response = {
        model: 'claude-opus-4-5-20251101',
        usage: {
          input_tokens: 1234,
          output_tokens: 567
          // cache fields missing
        },
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        duration_ms: 2231
      };

      const entry = formatAuditEntry(response);
      const parsed = JSON.parse(entry);

      expect(parsed.input_tokens).toBe(1234);
      expect(parsed.output_tokens).toBe(567);
      expect(parsed.cache_creation_tokens).toBeNull();
      expect(parsed.cache_read_tokens).toBeNull();
    });
  });

  describe('Given API response with very large metadata (EC-6)', () => {
    it('When model name is 1000 characters, Then preserves full name', () => {
      const longModelName = 'claude-' + 'x'.repeat(993); // 7 + 993 = 1000
      const response = {
        model: longModelName,
        usage: {
          input_tokens: 1234,
          output_tokens: 567
        },
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        total_cost_usd: 0.02124,
        duration_ms: 2231
      };

      const entry = formatAuditEntry(response);
      const parsed = JSON.parse(entry);

      expect(parsed.model).toBe(longModelName);
      expect(parsed.model.length).toBe(1000);
    });

    it('When formatting large metadata, Then produces valid JSON with proper escaping', () => {
      const response = {
        model: 'claude-with-"quotes"-and-\\backslashes',
        usage: {
          input_tokens: 1234,
          output_tokens: 567
        },
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        total_cost_usd: 0.02124,
        duration_ms: 2231
      };

      const entry = formatAuditEntry(response);

      expect(() => JSON.parse(entry)).not.toThrow();
      const parsed = JSON.parse(entry);
      expect(parsed.model).toBe('claude-with-"quotes"-and-\\backslashes');
    });
  });

  describe('Given optional duration_api_ms field', () => {
    it('When duration_api_ms provided, Then includes it in entry', () => {
      const response = {
        model: 'claude-opus-4-5-20251101',
        usage: {
          input_tokens: 1234,
          output_tokens: 567
        },
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        total_cost_usd: 0.02124,
        duration_ms: 2231,
        duration_api_ms: 4226
      };

      const entry = formatAuditEntry(response);
      const parsed = JSON.parse(entry);

      expect(parsed.duration_api_ms).toBe(4226);
    });

    it('When duration_api_ms not provided, Then omits field', () => {
      const response = {
        model: 'claude-opus-4-5-20251101',
        usage: {
          input_tokens: 1234,
          output_tokens: 567
        },
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        total_cost_usd: 0.02124,
        duration_ms: 2231
      };

      const entry = formatAuditEntry(response);
      const parsed = JSON.parse(entry);

      expect(parsed).not.toHaveProperty('duration_api_ms');
    });
  });
});

describe('audit/format - validateEntry()', () => {
  describe('Given a valid audit entry', () => {
    it('When validating, Then returns true', () => {
      const validEntry = {
        timestamp: '2026-02-04T23:45:12.345Z',
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        model: 'claude-opus-4-5-20251101',
        input_tokens: 1234,
        output_tokens: 567,
        cache_creation_tokens: 1688,
        cache_read_tokens: 19666,
        total_cost_usd: 0.02124,
        duration_ms: 2231
      };

      expect(validateEntry(validEntry)).toBe(true);
    });

    it('When validating with null token values, Then returns true', () => {
      const validEntry = {
        timestamp: '2026-02-04T23:45:12.345Z',
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        model: 'claude-opus-4-5-20251101',
        input_tokens: null,
        output_tokens: null,
        cache_creation_tokens: null,
        cache_read_tokens: null,
        total_cost_usd: null,
        duration_ms: 2231,
        warning: 'missing_usage_data'
      };

      expect(validateEntry(validEntry)).toBe(true);
    });
  });

  describe('Given an invalid audit entry', () => {
    it('When missing timestamp, Then returns false', () => {
      const invalidEntry = {
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        model: 'claude-opus-4-5-20251101',
        input_tokens: 1234,
        output_tokens: 567
      };

      expect(validateEntry(invalidEntry)).toBe(false);
    });

    it('When missing session_id, Then returns false', () => {
      const invalidEntry = {
        timestamp: '2026-02-04T23:45:12.345Z',
        model: 'claude-opus-4-5-20251101',
        input_tokens: 1234,
        output_tokens: 567
      };

      expect(validateEntry(invalidEntry)).toBe(false);
    });

    it('When missing model, Then returns false', () => {
      const invalidEntry = {
        timestamp: '2026-02-04T23:45:12.345Z',
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        input_tokens: 1234,
        output_tokens: 567
      };

      expect(validateEntry(invalidEntry)).toBe(false);
    });

    it('When timestamp has invalid format, Then returns false', () => {
      const invalidEntry = {
        timestamp: 'not-a-timestamp',
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        model: 'claude-opus-4-5-20251101',
        input_tokens: 1234,
        output_tokens: 567
      };

      expect(validateEntry(invalidEntry)).toBe(false);
    });
  });
});

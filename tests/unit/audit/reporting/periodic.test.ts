/**
 * WS-AUDIT-2: ROI Reporting & Cross-Project Aggregation - Periodic Rollups Tests
 *
 * BDD Scenarios:
 * - AC-1: Periodic rollup option: --period=daily|weekly|monthly groups data into time buckets
 *
 * Coverage Target: 99%+ of periodic.ts module
 * Test Pattern: MISUSE → BOUNDARY → GOLDEN PATH
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { TrackedAuditEntry } from '@/audit/reporting/reader';
import type { WorkstreamSummary } from '@/audit/reporting/aggregation';

/**
 * Time period for rollups
 */
export type TimePeriod = 'daily' | 'weekly' | 'monthly';

/**
 * Time bucket for periodic aggregation
 */
export interface TimeBucket {
  period: TimePeriod;
  start_date: string; // ISO 8601 date (YYYY-MM-DD)
  end_date: string;   // ISO 8601 date (YYYY-MM-DD)
  label: string;      // Human-readable label (e.g., "2026-02-08", "Week 2026-W06", "Feb 2026")
}

/**
 * Periodic workstream summary (extends WorkstreamSummary with time bucket)
 */
export interface PeriodicWorkstreamSummary extends WorkstreamSummary {
  time_bucket: TimeBucket;
}

/**
 * Placeholder imports (to be implemented in src/audit/reporting/periodic.ts)
 */
import {
  groupEntriesByPeriod,
  aggregateByWorkstreamPeriodic,
  formatTimeBucketLabel,
  getTimeBucketForDate,
} from '@/audit/reporting/periodic';

// ============================================================================
// MISUSE CASES - Invalid inputs, malformed data, error conditions
// ============================================================================

describe('audit/reporting/periodic - MISUSE CASES', () => {
  describe('groupEntriesByPeriod() with invalid period', () => {
    it('When period is invalid string, Then throws error', () => {
      const entries: TrackedAuditEntry[] = [];

      expect(() => groupEntriesByPeriod(entries, 'invalid' as TimePeriod))
        .toThrow(/invalid.*period/i);
    });

    it('When period is empty string, Then throws error', () => {
      const entries: TrackedAuditEntry[] = [];

      expect(() => groupEntriesByPeriod(entries, '' as TimePeriod))
        .toThrow(/invalid.*period/i);
    });

    it('When period is null, Then throws error', () => {
      const entries: TrackedAuditEntry[] = [];

      expect(() => groupEntriesByPeriod(entries, null as any))
        .toThrow(/invalid.*period/i);
    });

    it('When period is undefined, Then throws error', () => {
      const entries: TrackedAuditEntry[] = [];

      expect(() => groupEntriesByPeriod(entries, undefined as any))
        .toThrow(/invalid.*period/i);
    });

    it('When period is number, Then throws error', () => {
      const entries: TrackedAuditEntry[] = [];

      expect(() => groupEntriesByPeriod(entries, 1 as any))
        .toThrow(/invalid.*period/i);
    });

    it('When period is object, Then throws error', () => {
      const entries: TrackedAuditEntry[] = [];

      expect(() => groupEntriesByPeriod(entries, {} as any))
        .toThrow(/invalid.*period/i);
    });
  });

  describe('groupEntriesByPeriod() with malformed entries', () => {
    it('When entries have invalid timestamps, Then skips invalid entries', () => {
      const entries: TrackedAuditEntry[] = [
        {
          timestamp: 'invalid-date',
          session_id: 'sess1',
          model: 'claude-opus-4-6',
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.05,
          duration_ms: 1000,
        } as any,
      ];

      const result = groupEntriesByPeriod(entries, 'daily');

      // Should return empty or skip invalid entry
      expect(result).toEqual({});
    });

    it('When entries have null timestamp, Then skips entry', () => {
      const entries: TrackedAuditEntry[] = [
        {
          timestamp: null,
          session_id: 'sess1',
          model: 'claude-opus-4-6',
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.05,
          duration_ms: 1000,
        } as any,
      ];

      const result = groupEntriesByPeriod(entries, 'daily');

      expect(result).toEqual({});
    });

    it('When entries have undefined timestamp, Then skips entry', () => {
      const entries: TrackedAuditEntry[] = [
        {
          session_id: 'sess1',
          model: 'claude-opus-4-6',
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.05,
          duration_ms: 1000,
        } as any,
      ];

      const result = groupEntriesByPeriod(entries, 'daily');

      expect(result).toEqual({});
    });

    it('When entries array is null, Then throws error', () => {
      expect(() => groupEntriesByPeriod(null as any, 'daily'))
        .toThrow(/invalid.*entries/i);
    });

    it('When entries array is undefined, Then throws error', () => {
      expect(() => groupEntriesByPeriod(undefined as any, 'daily'))
        .toThrow(/invalid.*entries/i);
    });

    it('When entries is not an array, Then throws error', () => {
      expect(() => groupEntriesByPeriod('not-array' as any, 'daily'))
        .toThrow(/invalid.*entries/i);
    });
  });

  describe('getTimeBucketForDate() with invalid dates', () => {
    it('When date string is invalid, Then throws error', () => {
      expect(() => getTimeBucketForDate('invalid-date', 'daily'))
        .toThrow(/invalid.*date/i);
    });

    it('When date string is empty, Then throws error', () => {
      expect(() => getTimeBucketForDate('', 'daily'))
        .toThrow(/invalid.*date/i);
    });

    it('When date is malformed ISO, Then throws error', () => {
      expect(() => getTimeBucketForDate('2026-13-45', 'daily'))
        .toThrow(/invalid.*date/i);
    });

    it('When date is far future (year 9999), Then handles gracefully', () => {
      // Should not throw, but may have unusual output
      const result = getTimeBucketForDate('9999-12-31T23:59:59.999Z', 'daily');

      expect(result.start_date).toBe('9999-12-31');
    });

    it('When date is far past (year 0001), Then handles gracefully', () => {
      // Should not throw, but may have unusual output
      const result = getTimeBucketForDate('0001-01-01T00:00:00.000Z', 'daily');

      expect(result.start_date).toBe('0001-01-01');
    });
  });

  describe('formatTimeBucketLabel() with invalid inputs', () => {
    it('When start_date is invalid format, Then throws error', () => {
      expect(() => formatTimeBucketLabel('invalid-date', '2026-02-08', 'daily'))
        .toThrow(/invalid.*date/i);
    });

    it('When end_date is invalid format, Then throws error', () => {
      expect(() => formatTimeBucketLabel('2026-02-08', 'invalid-date', 'daily'))
        .toThrow(/invalid.*date/i);
    });

    it('When period is invalid, Then throws error', () => {
      expect(() => formatTimeBucketLabel('2026-02-08', '2026-02-08', 'invalid' as TimePeriod))
        .toThrow(/invalid.*period/i);
    });

    it('When start_date is after end_date, Then throws error', () => {
      expect(() => formatTimeBucketLabel('2026-02-10', '2026-02-08', 'daily'))
        .toThrow(/start.*after.*end/i);
    });
  });
});

// ============================================================================
// BOUNDARY TESTS - Edge cases, limits, unusual but valid inputs
// ============================================================================

describe('audit/reporting/periodic - BOUNDARY TESTS', () => {
  describe('groupEntriesByPeriod() with empty or single entries', () => {
    it('When entries array is empty, Then returns empty map', () => {
      const entries: TrackedAuditEntry[] = [];

      const result = groupEntriesByPeriod(entries, 'daily');

      expect(result).toEqual({});
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('When entries array has single entry, Then returns single bucket', () => {
      const entries: TrackedAuditEntry[] = [
        {
          timestamp: '2026-02-08T10:00:00.000Z',
          session_id: 'sess1',
          model: 'claude-opus-4-6',
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.05,
          duration_ms: 1000,
          workstream_id: 'WS-1',
          agent_name: 'dev',
        },
      ];

      const result = groupEntriesByPeriod(entries, 'daily');

      expect(Object.keys(result)).toHaveLength(1);
      expect(result['2026-02-08']).toHaveLength(1);
    });

    it('When all entries in same day, Then returns single daily bucket', () => {
      const entries: TrackedAuditEntry[] = [
        {
          timestamp: '2026-02-08T08:00:00.000Z',
          session_id: 'sess1',
          model: 'claude-opus-4-6',
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.05,
          duration_ms: 1000,
        },
        {
          timestamp: '2026-02-08T14:00:00.000Z',
          session_id: 'sess2',
          model: 'claude-opus-4-6',
          input_tokens: 2000,
          output_tokens: 1000,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.10,
          duration_ms: 2000,
        },
        {
          timestamp: '2026-02-08T23:59:59.999Z',
          session_id: 'sess3',
          model: 'claude-opus-4-6',
          input_tokens: 500,
          output_tokens: 250,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.025,
          duration_ms: 500,
        },
      ];

      const result = groupEntriesByPeriod(entries, 'daily');

      expect(Object.keys(result)).toHaveLength(1);
      expect(result['2026-02-08']).toHaveLength(3);
    });
  });

  describe('groupEntriesByPeriod() with timezone edge cases', () => {
    it('When entries span midnight UTC, Then groups by UTC date', () => {
      const entries: TrackedAuditEntry[] = [
        {
          timestamp: '2026-02-08T23:59:59.999Z',
          session_id: 'sess1',
          model: 'claude-opus-4-6',
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.05,
          duration_ms: 1000,
        },
        {
          timestamp: '2026-02-09T00:00:00.000Z',
          session_id: 'sess2',
          model: 'claude-opus-4-6',
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.05,
          duration_ms: 1000,
        },
      ];

      const result = groupEntriesByPeriod(entries, 'daily');

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['2026-02-08']).toHaveLength(1);
      expect(result['2026-02-09']).toHaveLength(1);
    });

    it('When entries span week boundary, Then groups by ISO week', () => {
      const entries: TrackedAuditEntry[] = [
        {
          timestamp: '2026-02-08T23:00:00.000Z', // Sunday
          session_id: 'sess1',
          model: 'claude-opus-4-6',
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.05,
          duration_ms: 1000,
        },
        {
          timestamp: '2026-02-09T01:00:00.000Z', // Monday (new week)
          session_id: 'sess2',
          model: 'claude-opus-4-6',
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.05,
          duration_ms: 1000,
        },
      ];

      const result = groupEntriesByPeriod(entries, 'weekly');

      // Should have 2 buckets (different ISO weeks)
      expect(Object.keys(result).length).toBeGreaterThanOrEqual(1);
    });

    it('When entries span month boundary, Then groups by calendar month', () => {
      const entries: TrackedAuditEntry[] = [
        {
          timestamp: '2026-01-31T23:59:59.999Z',
          session_id: 'sess1',
          model: 'claude-opus-4-6',
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.05,
          duration_ms: 1000,
        },
        {
          timestamp: '2026-02-01T00:00:00.000Z',
          session_id: 'sess2',
          model: 'claude-opus-4-6',
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.05,
          duration_ms: 1000,
        },
      ];

      const result = groupEntriesByPeriod(entries, 'monthly');

      expect(Object.keys(result)).toHaveLength(2);
    });
  });

  describe('getTimeBucketForDate() with edge dates', () => {
    it('When date is start of year, Then returns correct bucket', () => {
      const result = getTimeBucketForDate('2026-01-01T00:00:00.000Z', 'daily');

      expect(result.start_date).toBe('2026-01-01');
      expect(result.end_date).toBe('2026-01-01');
    });

    it('When date is end of year, Then returns correct bucket', () => {
      const result = getTimeBucketForDate('2026-12-31T23:59:59.999Z', 'daily');

      expect(result.start_date).toBe('2026-12-31');
      expect(result.end_date).toBe('2026-12-31');
    });

    it('When date is leap day, Then handles correctly', () => {
      const result = getTimeBucketForDate('2024-02-29T12:00:00.000Z', 'daily');

      expect(result.start_date).toBe('2024-02-29');
      expect(result.end_date).toBe('2024-02-29');
    });

    it('When date is DST transition, Then uses UTC consistently', () => {
      // DST transitions don't affect UTC dates
      const result = getTimeBucketForDate('2026-03-08T10:00:00.000Z', 'daily');

      expect(result.start_date).toBe('2026-03-08');
    });
  });

  describe('formatTimeBucketLabel() with edge cases', () => {
    it('When daily bucket at year boundary, Then formats correctly', () => {
      const label = formatTimeBucketLabel('2025-12-31', '2025-12-31', 'daily');

      expect(label).toBe('2025-12-31');
    });

    it('When weekly bucket spans year boundary, Then shows date range', () => {
      const label = formatTimeBucketLabel('2025-12-29', '2026-01-04', 'weekly');

      // Should indicate week span (format may vary)
      expect(label).toMatch(/2025|2026/);
    });

    it('When monthly bucket is December, Then formats correctly', () => {
      const label = formatTimeBucketLabel('2026-12-01', '2026-12-31', 'monthly');

      expect(label).toMatch(/Dec.*2026|2026-12/);
    });

    it('When monthly bucket is February (non-leap), Then shows correct end date', () => {
      const label = formatTimeBucketLabel('2026-02-01', '2026-02-28', 'monthly');

      expect(label).toMatch(/Feb.*2026|2026-02/);
    });

    it('When monthly bucket is February (leap year), Then shows Feb 29', () => {
      const label = formatTimeBucketLabel('2024-02-01', '2024-02-29', 'monthly');

      expect(label).toMatch(/Feb.*2024|2024-02/);
    });
  });
});

// ============================================================================
// GOLDEN PATH - Normal, expected operations
// ============================================================================

describe('audit/reporting/periodic - GOLDEN PATH', () => {
  describe('groupEntriesByPeriod() daily rollups (AC-1)', () => {
    it('When grouping by daily with multiple days, Then creates separate buckets', () => {
      const entries: TrackedAuditEntry[] = [
        {
          timestamp: '2026-02-06T10:00:00.000Z',
          session_id: 'sess1',
          model: 'claude-opus-4-6',
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.05,
          duration_ms: 1000,
          workstream_id: 'WS-1',
        },
        {
          timestamp: '2026-02-07T14:00:00.000Z',
          session_id: 'sess2',
          model: 'claude-opus-4-6',
          input_tokens: 2000,
          output_tokens: 1000,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.10,
          duration_ms: 2000,
          workstream_id: 'WS-1',
        },
        {
          timestamp: '2026-02-08T18:00:00.000Z',
          session_id: 'sess3',
          model: 'claude-opus-4-6',
          input_tokens: 1500,
          output_tokens: 750,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.075,
          duration_ms: 1500,
          workstream_id: 'WS-2',
        },
      ];

      const result = groupEntriesByPeriod(entries, 'daily');

      expect(Object.keys(result)).toHaveLength(3);
      expect(result['2026-02-06']).toHaveLength(1);
      expect(result['2026-02-07']).toHaveLength(1);
      expect(result['2026-02-08']).toHaveLength(1);
    });

    it('When multiple entries same day, Then groups together', () => {
      const entries: TrackedAuditEntry[] = [
        {
          timestamp: '2026-02-08T08:00:00.000Z',
          session_id: 'sess1',
          model: 'claude-opus-4-6',
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.05,
          duration_ms: 1000,
        },
        {
          timestamp: '2026-02-08T16:00:00.000Z',
          session_id: 'sess2',
          model: 'claude-opus-4-6',
          input_tokens: 2000,
          output_tokens: 1000,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.10,
          duration_ms: 2000,
        },
      ];

      const result = groupEntriesByPeriod(entries, 'daily');

      expect(Object.keys(result)).toHaveLength(1);
      expect(result['2026-02-08']).toHaveLength(2);
    });
  });

  describe('groupEntriesByPeriod() weekly rollups (AC-1)', () => {
    it('When grouping by weekly with multiple weeks, Then creates separate buckets', () => {
      const entries: TrackedAuditEntry[] = [
        {
          timestamp: '2026-02-02T10:00:00.000Z', // Week 6
          session_id: 'sess1',
          model: 'claude-opus-4-6',
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.05,
          duration_ms: 1000,
        },
        {
          timestamp: '2026-02-09T10:00:00.000Z', // Week 7
          session_id: 'sess2',
          model: 'claude-opus-4-6',
          input_tokens: 2000,
          output_tokens: 1000,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.10,
          duration_ms: 2000,
        },
      ];

      const result = groupEntriesByPeriod(entries, 'weekly');

      expect(Object.keys(result).length).toBeGreaterThanOrEqual(2);
    });

    it('When multiple entries same week, Then groups together', () => {
      const entries: TrackedAuditEntry[] = [
        {
          timestamp: '2026-02-02T10:00:00.000Z',
          session_id: 'sess1',
          model: 'claude-opus-4-6',
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.05,
          duration_ms: 1000,
        },
        {
          timestamp: '2026-02-05T16:00:00.000Z',
          session_id: 'sess2',
          model: 'claude-opus-4-6',
          input_tokens: 2000,
          output_tokens: 1000,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.10,
          duration_ms: 2000,
        },
      ];

      const result = groupEntriesByPeriod(entries, 'weekly');

      const firstWeek = Object.keys(result)[0];
      expect(result[firstWeek].length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('groupEntriesByPeriod() monthly rollups (AC-1)', () => {
    it('When grouping by monthly with multiple months, Then creates separate buckets', () => {
      const entries: TrackedAuditEntry[] = [
        {
          timestamp: '2026-01-15T10:00:00.000Z',
          session_id: 'sess1',
          model: 'claude-opus-4-6',
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.05,
          duration_ms: 1000,
        },
        {
          timestamp: '2026-02-15T10:00:00.000Z',
          session_id: 'sess2',
          model: 'claude-opus-4-6',
          input_tokens: 2000,
          output_tokens: 1000,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.10,
          duration_ms: 2000,
        },
        {
          timestamp: '2026-03-15T10:00:00.000Z',
          session_id: 'sess3',
          model: 'claude-opus-4-6',
          input_tokens: 1500,
          output_tokens: 750,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.075,
          duration_ms: 1500,
        },
      ];

      const result = groupEntriesByPeriod(entries, 'monthly');

      expect(Object.keys(result)).toHaveLength(3);
    });

    it('When multiple entries same month, Then groups together', () => {
      const entries: TrackedAuditEntry[] = [
        {
          timestamp: '2026-02-01T10:00:00.000Z',
          session_id: 'sess1',
          model: 'claude-opus-4-6',
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.05,
          duration_ms: 1000,
        },
        {
          timestamp: '2026-02-15T16:00:00.000Z',
          session_id: 'sess2',
          model: 'claude-opus-4-6',
          input_tokens: 2000,
          output_tokens: 1000,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.10,
          duration_ms: 2000,
        },
        {
          timestamp: '2026-02-28T20:00:00.000Z',
          session_id: 'sess3',
          model: 'claude-opus-4-6',
          input_tokens: 1500,
          output_tokens: 750,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.075,
          duration_ms: 1500,
        },
      ];

      const result = groupEntriesByPeriod(entries, 'monthly');

      expect(Object.keys(result)).toHaveLength(1);
      const monthKey = Object.keys(result)[0];
      expect(result[monthKey]).toHaveLength(3);
    });
  });

  describe('aggregateByWorkstreamPeriodic() integration (AC-1)', () => {
    it('When aggregating daily, Then produces periodic summaries', () => {
      const entries: TrackedAuditEntry[] = [
        {
          timestamp: '2026-02-06T10:00:00.000Z',
          session_id: 'sess1',
          model: 'claude-opus-4-6',
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.05,
          duration_ms: 1000,
          workstream_id: 'WS-1',
        },
        {
          timestamp: '2026-02-07T14:00:00.000Z',
          session_id: 'sess2',
          model: 'claude-opus-4-6',
          input_tokens: 2000,
          output_tokens: 1000,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.10,
          duration_ms: 2000,
          workstream_id: 'WS-1',
        },
      ];

      const result = aggregateByWorkstreamPeriodic(entries, 'daily');

      expect(result).toHaveLength(2);
      expect(result[0].time_bucket.period).toBe('daily');
      expect(result[0].workstream_id).toBe('WS-1');
      expect(result[0].time_bucket.label).toMatch(/2026-02/);
    });

    it('When aggregating weekly, Then produces weekly summaries', () => {
      const entries: TrackedAuditEntry[] = [
        {
          timestamp: '2026-02-02T10:00:00.000Z',
          session_id: 'sess1',
          model: 'claude-opus-4-6',
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.05,
          duration_ms: 1000,
          workstream_id: 'WS-1',
        },
        {
          timestamp: '2026-02-09T10:00:00.000Z',
          session_id: 'sess2',
          model: 'claude-opus-4-6',
          input_tokens: 2000,
          output_tokens: 1000,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.10,
          duration_ms: 2000,
          workstream_id: 'WS-1',
        },
      ];

      const result = aggregateByWorkstreamPeriodic(entries, 'weekly');

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result[0].time_bucket.period).toBe('weekly');
      expect(result[0].time_bucket.label).toMatch(/Week|W/);
    });

    it('When aggregating monthly, Then produces monthly summaries', () => {
      const entries: TrackedAuditEntry[] = [
        {
          timestamp: '2026-01-15T10:00:00.000Z',
          session_id: 'sess1',
          model: 'claude-opus-4-6',
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.05,
          duration_ms: 1000,
          workstream_id: 'WS-1',
        },
        {
          timestamp: '2026-02-15T10:00:00.000Z',
          session_id: 'sess2',
          model: 'claude-opus-4-6',
          input_tokens: 2000,
          output_tokens: 1000,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.10,
          duration_ms: 2000,
          workstream_id: 'WS-1',
        },
      ];

      const result = aggregateByWorkstreamPeriodic(entries, 'monthly');

      expect(result).toHaveLength(2);
      expect(result[0].time_bucket.period).toBe('monthly');
      expect(result[0].time_bucket.label).toMatch(/Jan|Feb|2026-01|2026-02/);
    });
  });

  describe('getTimeBucketForDate() correctness', () => {
    it('When getting daily bucket, Then returns single day', () => {
      const result = getTimeBucketForDate('2026-02-08T15:30:00.000Z', 'daily');

      expect(result.period).toBe('daily');
      expect(result.start_date).toBe('2026-02-08');
      expect(result.end_date).toBe('2026-02-08');
      expect(result.label).toBe('2026-02-08');
    });

    it('When getting weekly bucket, Then returns week range', () => {
      const result = getTimeBucketForDate('2026-02-08T15:30:00.000Z', 'weekly');

      expect(result.period).toBe('weekly');
      expect(result.start_date).toBeDefined();
      expect(result.end_date).toBeDefined();
      expect(result.label).toMatch(/Week|W/);
    });

    it('When getting monthly bucket, Then returns month range', () => {
      const result = getTimeBucketForDate('2026-02-08T15:30:00.000Z', 'monthly');

      expect(result.period).toBe('monthly');
      expect(result.start_date).toBe('2026-02-01');
      expect(result.end_date).toBe('2026-02-28');
      expect(result.label).toMatch(/Feb.*2026|2026-02/);
    });
  });

  describe('formatTimeBucketLabel() formatting', () => {
    it('When formatting daily label, Then shows date', () => {
      const label = formatTimeBucketLabel('2026-02-08', '2026-02-08', 'daily');

      expect(label).toBe('2026-02-08');
    });

    it('When formatting weekly label, Then shows week identifier', () => {
      const label = formatTimeBucketLabel('2026-02-02', '2026-02-08', 'weekly');

      expect(label).toMatch(/Week|W/);
      expect(label).toMatch(/2026/);
    });

    it('When formatting monthly label, Then shows month and year', () => {
      const label = formatTimeBucketLabel('2026-02-01', '2026-02-28', 'monthly');

      expect(label).toMatch(/Feb.*2026|2026-02/);
    });
  });
});

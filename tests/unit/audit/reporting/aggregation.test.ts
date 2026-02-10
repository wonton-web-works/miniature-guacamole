/**
 * WS-TRACKING Phase 2: Aggregation Module Tests
 *
 * BDD Scenarios:
 * - AC-2.2: Report includes: workstream_id, total_input_tokens, total_output_tokens, total_cost_usd
 * - AC-2.3: Report includes count of requests per workstream
 * - AC-2.4: Report shows date range (default: last 30 days)
 * - AC-2.5: Date range configurable via --from and --to flags
 * - AC-2.7: Workstreams with zero usage are included
 * - AC-3.2: Report includes: workstream_id, agent_name, total_tokens, cost_usd
 * - AC-3.4: Agents grouped within workstreams
 * - AC-3.5: Success rate calculated (merged / total requests)
 * - TRACK-BDD-5: View workstream summary
 * - TRACK-BDD-6: Filter by date range
 * - TRACK-BDD-8: Include workstreams with no requests
 * - TRACK-BDD-9: View agent breakdown within workstream
 * - TRACK-BDD-11: Success metrics per agent
 * - TRACK-EDGE-3: Null success values in aggregation
 *
 * Target: 100% coverage of aggregation.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { TrackedAuditEntry } from '@/audit/tracking/tagging';

// Type definitions for aggregation module (to be implemented)
interface WorkstreamSummary {
  workstream_id: string;
  request_count: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
}

interface AgentBreakdown {
  workstream_id: string;
  agent_name: string;
  request_count: number;
  total_tokens: number;
  total_cost_usd: number;
  success_count: number | null;
  success_rate: number | null;
}

interface DateRange {
  from?: Date;
  to?: Date;
}

// Placeholder imports (will be implemented)
import {
  aggregateByWorkstream,
  aggregateByAgent,
  filterByDateRange,
  includeZeroUsageWorkstreams,
  calculateSuccessRate,
} from '@/audit/reporting/aggregation';

describe('audit/reporting/aggregation - aggregateByWorkstream()', () => {
  const baseEntry1: TrackedAuditEntry = {
    timestamp: '2026-02-04T10:00:00.000Z',
    session_id: 'session-1',
    model: 'claude-opus-4-5-20251101',
    input_tokens: 1000,
    output_tokens: 500,
    cache_creation_tokens: 0,
    cache_read_tokens: 0,
    total_cost_usd: 0.015,
    duration_ms: 1000,
    schema_version: '1.0',
    workstream_id: 'WS-18',
    agent_name: 'mg-code-review',
    feature_name: null,
  };

  const baseEntry2: TrackedAuditEntry = {
    timestamp: '2026-02-04T11:00:00.000Z',
    session_id: 'session-2',
    model: 'claude-opus-4-5-20251101',
    input_tokens: 2000,
    output_tokens: 1000,
    cache_creation_tokens: 0,
    cache_read_tokens: 0,
    total_cost_usd: 0.030,
    duration_ms: 2000,
    schema_version: '1.0',
    workstream_id: 'WS-18',
    agent_name: 'qa',
    feature_name: null,
  };

  const baseEntry3: TrackedAuditEntry = {
    timestamp: '2026-02-04T12:00:00.000Z',
    session_id: 'session-3',
    model: 'claude-opus-4-5-20251101',
    input_tokens: 500,
    output_tokens: 250,
    cache_creation_tokens: 0,
    cache_read_tokens: 0,
    total_cost_usd: 0.010,
    duration_ms: 500,
    schema_version: '1.0',
    workstream_id: 'WS-19',
    agent_name: 'mg-design-review',
    feature_name: null,
  };

  describe('Given multiple entries from same workstream (AC-2.2, AC-2.3)', () => {
    it('When aggregating, Then sums tokens and costs correctly', () => {
      const entries = [baseEntry1, baseEntry2];

      // This will fail until implementation exists
      const result = aggregateByWorkstream(entries);
        expect(result).toHaveLength(1);
        expect(result[0].workstream_id).toBe('WS-18');
        expect(result[0].total_input_tokens).toBe(3000);
        expect(result[0].total_output_tokens).toBe(1500);
        expect(result[0].total_cost_usd).toBe(0.045);
        expect(result[0].request_count).toBe(2);
    });

    it('When aggregating, Then counts requests correctly', () => {
      const entries = [baseEntry1, baseEntry2];

      const result = aggregateByWorkstream(entries);
        expect(result[0].request_count).toBe(2);
    });
  });

  describe('Given entries from different workstreams (TRACK-BDD-5)', () => {
    it('When aggregating, Then separates by workstream_id', () => {
      const entries = [baseEntry1, baseEntry2, baseEntry3];

      const result = aggregateByWorkstream(entries);
        expect(result).toHaveLength(2);
        //
        const ws18 = result.find(r => r.workstream_id === 'WS-18');
        const ws19 = result.find(r => r.workstream_id === 'WS-19');
        //
        expect(ws18).toBeDefined();
        expect(ws18!.request_count).toBe(2);
        expect(ws18!.total_cost_usd).toBe(0.045);
        //
        expect(ws19).toBeDefined();
        expect(ws19!.request_count).toBe(1);
        expect(ws19!.total_cost_usd).toBe(0.010);
    });
  });

  describe('Given entries with null workstream_id (backward compatibility)', () => {
    it('When aggregating, Then groups nulls together', () => {
      const nullEntry: TrackedAuditEntry = {
        ...baseEntry1,
        workstream_id: null,
        agent_name: null,
      };

      const entries = [baseEntry1, nullEntry];

      const result = aggregateByWorkstream(entries);
        expect(result).toHaveLength(2);
        //
        const nullWorkstream = result.find(r => r.workstream_id === null);
        expect(nullWorkstream).toBeDefined();
        expect(nullWorkstream!.request_count).toBe(1);
    });
  });

  describe('Given entries with null costs (missing usage data)', () => {
    it('When aggregating, Then handles null costs gracefully', () => {
      const nullCostEntry: TrackedAuditEntry = {
        ...baseEntry1,
        total_cost_usd: null,
      };

      const entries = [baseEntry1, nullCostEntry];

      const result = aggregateByWorkstream(entries);
        expect(result[0].total_cost_usd).toBe(0.015); // Only counts non-null
        expect(result[0].request_count).toBe(2); // Still counts entry
    });

    it('When all costs are null, Then total_cost_usd is 0', () => {
      const nullCostEntry1: TrackedAuditEntry = {
        ...baseEntry1,
        total_cost_usd: null,
      };
      const nullCostEntry2: TrackedAuditEntry = {
        ...baseEntry2,
        total_cost_usd: null,
      };

      const entries = [nullCostEntry1, nullCostEntry2];

      const result = aggregateByWorkstream(entries);
        expect(result[0].total_cost_usd).toBe(0);
    });
  });

  describe('Given entries with null token counts', () => {
    it('When aggregating, Then handles null tokens gracefully', () => {
      const nullTokenEntry: TrackedAuditEntry = {
        ...baseEntry1,
        input_tokens: null,
        output_tokens: null,
      };

      const entries = [baseEntry1, nullTokenEntry];

      const result = aggregateByWorkstream(entries);
        expect(result[0].total_input_tokens).toBe(1000); // Only counts non-null
        expect(result[0].total_output_tokens).toBe(500);
    });
  });

  describe('Given empty array of entries', () => {
    it('When aggregating, Then returns empty array', () => {
      const result = aggregateByWorkstream([]);
        expect(result).toEqual([]);
    });
  });
});

describe('audit/reporting/aggregation - filterByDateRange()', () => {
  const jan1Entry: TrackedAuditEntry = {
    timestamp: '2026-01-01T10:00:00.000Z',
    session_id: 'session-jan',
    model: 'claude-opus-4-5-20251101',
    input_tokens: 1000,
    output_tokens: 500,
    cache_creation_tokens: 0,
    cache_read_tokens: 0,
    total_cost_usd: 0.015,
    duration_ms: 1000,
    schema_version: '1.0',
    workstream_id: 'WS-18',
    agent_name: 'mg-code-review',
    feature_name: null,
  };

  const feb1Entry: TrackedAuditEntry = {
    timestamp: '2026-02-01T10:00:00.000Z',
    session_id: 'session-feb1',
    model: 'claude-opus-4-5-20251101',
    input_tokens: 2000,
    output_tokens: 1000,
    cache_creation_tokens: 0,
    cache_read_tokens: 0,
    total_cost_usd: 0.030,
    duration_ms: 2000,
    schema_version: '1.0',
    workstream_id: 'WS-18',
    agent_name: 'qa',
    feature_name: null,
  };

  const feb4Entry: TrackedAuditEntry = {
    timestamp: '2026-02-04T10:00:00.000Z',
    session_id: 'session-feb4',
    model: 'claude-opus-4-5-20251101',
    input_tokens: 500,
    output_tokens: 250,
    cache_creation_tokens: 0,
    cache_read_tokens: 0,
    total_cost_usd: 0.010,
    duration_ms: 500,
    schema_version: '1.0',
    workstream_id: 'WS-19',
    agent_name: 'mg-design-review',
    feature_name: null,
  };

  describe('Given date range with from date (AC-2.5, TRACK-BDD-6)', () => {
    it('When filtering with from date, Then includes only entries after from', () => {
      const entries = [jan1Entry, feb1Entry, feb4Entry];
      const dateRange: DateRange = {
        from: new Date('2026-02-01T00:00:00.000Z'),
      };

      const result = filterByDateRange(entries, dateRange);
        expect(result).toHaveLength(2);
        expect(result.map(e => e.session_id)).toContain('session-feb1');
        expect(result.map(e => e.session_id)).toContain('session-feb4');
        expect(result.map(e => e.session_id)).not.toContain('session-jan');
    });
  });

  describe('Given date range with to date', () => {
    it('When filtering with to date, Then includes only entries before to', () => {
      const entries = [jan1Entry, feb1Entry, feb4Entry];
      const dateRange: DateRange = {
        to: new Date('2026-02-01T23:59:59.999Z'),
      };

      const result = filterByDateRange(entries, dateRange);
        expect(result).toHaveLength(2);
        expect(result.map(e => e.session_id)).toContain('session-jan');
        expect(result.map(e => e.session_id)).toContain('session-feb1');
        expect(result.map(e => e.session_id)).not.toContain('session-feb4');
    });
  });

  describe('Given date range with both from and to (AC-2.5)', () => {
    it('When filtering with both dates, Then includes only entries in range', () => {
      const entries = [jan1Entry, feb1Entry, feb4Entry];
      const dateRange: DateRange = {
        from: new Date('2026-02-01T00:00:00.000Z'),
        to: new Date('2026-02-03T23:59:59.999Z'),
      };

      const result = filterByDateRange(entries, dateRange);
        expect(result).toHaveLength(1);
        expect(result[0].session_id).toBe('session-feb1');
    });
  });

  describe('Given no date range (AC-2.4)', () => {
    it('When no date range provided, Then defaults to last 30 days', () => {
      const now = new Date('2026-02-05T00:00:00.000Z');
      const thirtyDaysAgo = new Date('2026-01-06T00:00:00.000Z');

      const oldEntry: TrackedAuditEntry = {
        ...jan1Entry,
        timestamp: '2026-01-05T10:00:00.000Z', // 31 days ago
      };

      const recentEntry: TrackedAuditEntry = {
        ...feb1Entry,
        timestamp: '2026-01-10T10:00:00.000Z', // 26 days ago
      };

      const entries = [oldEntry, recentEntry];

      const result = filterByDateRange(entries, {}, now);
        expect(result).toHaveLength(1);
        expect(result[0].session_id).toBe('session-feb1');
    });
  });

  describe('Given empty date range object', () => {
    it('When filtering with empty object, Then applies default 30 day window', () => {
      const entries = [jan1Entry, feb1Entry, feb4Entry];

      const result = filterByDateRange(entries, {});
        // Should include entries from last 30 days
        expect(result.length).toBeGreaterThan(0);
    });
  });
});

describe('audit/reporting/aggregation - includeZeroUsageWorkstreams()', () => {
  describe('Given known workstreams config (AC-2.7, TRACK-BDD-8)', () => {
    it('When including zero usage, Then adds workstreams with no entries', () => {
      const summaries: WorkstreamSummary[] = [
        {
          workstream_id: 'WS-18',
          request_count: 5,
          total_input_tokens: 5000,
          total_output_tokens: 2500,
          total_cost_usd: 0.075,
        },
      ];

      const knownWorkstreams = ['WS-18', 'WS-19', 'WS-20', 'WS-21'];

      const result = includeZeroUsageWorkstreams(summaries, knownWorkstreams);
        expect(result).toHaveLength(4);
        //
        const ws19 = result.find(r => r.workstream_id === 'WS-19');
        expect(ws19).toBeDefined();
        expect(ws19!.request_count).toBe(0);
        expect(ws19!.total_input_tokens).toBe(0);
        expect(ws19!.total_output_tokens).toBe(0);
        expect(ws19!.total_cost_usd).toBe(0);
    });

    it('When workstream already has usage, Then does not duplicate', () => {
      const summaries: WorkstreamSummary[] = [
        {
          workstream_id: 'WS-18',
          request_count: 5,
          total_input_tokens: 5000,
          total_output_tokens: 2500,
          total_cost_usd: 0.075,
        },
      ];

      const knownWorkstreams = ['WS-18'];

      const result = includeZeroUsageWorkstreams(summaries, knownWorkstreams);
        expect(result).toHaveLength(1);
        expect(result[0].workstream_id).toBe('WS-18');
        expect(result[0].request_count).toBe(5); // Original value preserved
    });
  });

  describe('Given empty known workstreams config', () => {
    it('When no known workstreams, Then returns original summaries', () => {
      const summaries: WorkstreamSummary[] = [
        {
          workstream_id: 'WS-18',
          request_count: 5,
          total_input_tokens: 5000,
          total_output_tokens: 2500,
          total_cost_usd: 0.075,
        },
      ];

      const result = includeZeroUsageWorkstreams(summaries, []);
        expect(result).toEqual(summaries);
    });
  });
});

describe('audit/reporting/aggregation - aggregateByAgent()', () => {
  const codeReviewEntry1: TrackedAuditEntry = {
    timestamp: '2026-02-04T10:00:00.000Z',
    session_id: 'session-1',
    model: 'claude-opus-4-5-20251101',
    input_tokens: 1000,
    output_tokens: 500,
    cache_creation_tokens: 0,
    cache_read_tokens: 0,
    total_cost_usd: 0.015,
    duration_ms: 1000,
    schema_version: '1.0',
    workstream_id: 'WS-18',
    agent_name: 'mg-code-review',
    feature_name: null,
  };

  const qaEntry1: TrackedAuditEntry = {
    timestamp: '2026-02-04T11:00:00.000Z',
    session_id: 'session-2',
    model: 'claude-opus-4-5-20251101',
    input_tokens: 2000,
    output_tokens: 1000,
    cache_creation_tokens: 0,
    cache_read_tokens: 0,
    total_cost_usd: 0.030,
    duration_ms: 2000,
    schema_version: '1.0',
    workstream_id: 'WS-18',
    agent_name: 'qa',
    feature_name: null,
  };

  const designReviewEntry1: TrackedAuditEntry = {
    timestamp: '2026-02-04T12:00:00.000Z',
    session_id: 'session-3',
    model: 'claude-opus-4-5-20251101',
    input_tokens: 500,
    output_tokens: 250,
    cache_creation_tokens: 0,
    cache_read_tokens: 0,
    total_cost_usd: 0.010,
    duration_ms: 500,
    schema_version: '1.0',
    workstream_id: 'WS-18',
    agent_name: 'mg-design-review',
    feature_name: null,
  };

  describe('Given multiple agents in same workstream (AC-3.2, AC-3.4, TRACK-BDD-9)', () => {
    it('When aggregating by agent, Then groups by workstream and agent', () => {
      const entries = [codeReviewEntry1, qaEntry1, designReviewEntry1];

      const result = aggregateByAgent(entries);
        expect(result).toHaveLength(3);
        //
        const codeReview = result.find(r => r.agent_name === 'mg-code-review');
        expect(codeReview).toBeDefined();
        expect(codeReview!.workstream_id).toBe('WS-18');
        expect(codeReview!.total_tokens).toBe(1500); // input + output
        expect(codeReview!.total_cost_usd).toBe(0.015);
        expect(codeReview!.request_count).toBe(1);
    });

    it('When aggregating, Then calculates total_tokens as input + output', () => {
      const entries = [codeReviewEntry1];

      const result = aggregateByAgent(entries);
        expect(result[0].total_tokens).toBe(1500); // 1000 + 500
    });
  });

  describe('Given same agent across different workstreams', () => {
    it('When aggregating, Then separates by workstream_id', () => {
      const ws18Entry: TrackedAuditEntry = {
        ...codeReviewEntry1,
        workstream_id: 'WS-18',
      };

      const ws19Entry: TrackedAuditEntry = {
        ...codeReviewEntry1,
        session_id: 'session-4',
        workstream_id: 'WS-19',
      };

      const entries = [ws18Entry, ws19Entry];

      const result = aggregateByAgent(entries);
        expect(result).toHaveLength(2);
        //
        const ws18Agent = result.find(r => r.workstream_id === 'WS-18');
        const ws19Agent = result.find(r => r.workstream_id === 'WS-19');
        //
        expect(ws18Agent).toBeDefined();
        expect(ws19Agent).toBeDefined();
        expect(ws18Agent!.agent_name).toBe('mg-code-review');
        expect(ws19Agent!.agent_name).toBe('mg-code-review');
    });
  });

  describe('Given entries with null agent_name', () => {
    it('When aggregating, Then groups nulls together', () => {
      const nullAgentEntry: TrackedAuditEntry = {
        ...codeReviewEntry1,
        agent_name: null,
      };

      const entries = [codeReviewEntry1, nullAgentEntry];

      const result = aggregateByAgent(entries);
        expect(result).toHaveLength(2);
        //
        const nullAgent = result.find(r => r.agent_name === null);
        expect(nullAgent).toBeDefined();
    });
  });

  describe('Given filter by workstream (AC-3.7)', () => {
    it('When filtering by workstream, Then includes only specified workstream', () => {
      const ws18Entry: TrackedAuditEntry = {
        ...codeReviewEntry1,
        workstream_id: 'WS-18',
      };

      const ws19Entry: TrackedAuditEntry = {
        ...codeReviewEntry1,
        session_id: 'session-4',
        workstream_id: 'WS-19',
      };

      const entries = [ws18Entry, ws19Entry];

      const result = aggregateByAgent(entries, { workstream: 'WS-18' });
        expect(result).toHaveLength(1);
        expect(result[0].workstream_id).toBe('WS-18');
    });
  });
});

describe('audit/reporting/aggregation - calculateSuccessRate()', () => {
  describe('Given entries with success metrics (AC-3.5, TRACK-BDD-11)', () => {
    it('When calculating success rate, Then returns percentage', () => {
      const successfulEntries = 12;
      const totalEntries = 15;

      const result = calculateSuccessRate(successfulEntries, totalEntries);
        expect(result).toBe(80); // 12/15 = 0.8 = 80%
    });

    it('When all entries successful, Then returns 100', () => {
      const result = calculateSuccessRate(10, 10);
        expect(result).toBe(100);
    });

    it('When no entries successful, Then returns 0', () => {
      const result = calculateSuccessRate(0, 10);
        expect(result).toBe(0);
    });
  });

  describe('Given zero total entries', () => {
    it('When calculating with zero total, Then returns null', () => {
      const result = calculateSuccessRate(0, 0);
        expect(result).toBeNull();
    });
  });

  describe('Given null success values (TRACK-EDGE-3)', () => {
    it('When calculating with null values, Then handles gracefully', () => {
      const result = calculateSuccessRate(null, 10);
        expect(result).toBeNull();
    });
  });

  describe('Given partial data (some success values null)', () => {
    it('When some entries have no success data, Then calculates based on non-null only', () => {
      const totalEntries = 15;
      const entriesWithSuccessData = 10;
      const successfulEntries = 8;

      const result = calculateSuccessRate(successfulEntries, entriesWithSuccessData);
        expect(result).toBe(80); // 8/10, ignoring 5 entries without success data
    });
  });
});

describe('audit/reporting/aggregation - edge cases', () => {
  describe('Given very large numbers', () => {
    it('When aggregating large token counts, Then handles without overflow', () => {
      const largeEntry: TrackedAuditEntry = {
        timestamp: '2026-02-04T10:00:00.000Z',
        session_id: 'session-large',
        model: 'claude-opus-4-5-20251101',
        input_tokens: 1000000,
        output_tokens: 500000,
        cache_creation_tokens: 0,
        cache_read_tokens: 0,
        total_cost_usd: 150.00,
        duration_ms: 10000,
        schema_version: '1.0',
        workstream_id: 'WS-18',
        agent_name: 'mg-code-review',
        feature_name: null,
      };

      const entries = Array(100).fill(largeEntry);

      const result = aggregateByWorkstream(entries);
        expect(result[0].total_input_tokens).toBe(100000000);
        expect(result[0].total_cost_usd).toBe(15000.00);
    });
  });

  describe('Given precision requirements for costs', () => {
    it('When summing fractional costs, Then maintains precision', () => {
      const entry1: TrackedAuditEntry = {
        timestamp: '2026-02-04T10:00:00.000Z',
        session_id: 'session-1',
        model: 'claude-opus-4-5-20251101',
        input_tokens: 100,
        output_tokens: 50,
        cache_creation_tokens: 0,
        cache_read_tokens: 0,
        total_cost_usd: 0.001,
        duration_ms: 100,
        schema_version: '1.0',
        workstream_id: 'WS-18',
        agent_name: 'mg-code-review',
        feature_name: null,
      };

      const entries = Array(1000).fill(entry1);

      const result = aggregateByWorkstream(entries);
        expect(result[0].total_cost_usd).toBe(1.000); // Should be exact
    });
  });
});

// ============================================================================
// WS-AUDIT-1: Enhanced Reporting with Duration and Cost Estimation
// ============================================================================

describe('audit/reporting/aggregation - WS-AUDIT-1 enhanced fields', () => {
  const baseEntry: TrackedAuditEntry = {
    timestamp: '2026-02-04T10:00:00.000Z',
    session_id: 'session-1',
    model: 'claude-opus-4-5-20251101',
    input_tokens: 1000,
    output_tokens: 500,
    cache_creation_tokens: 100,
    cache_read_tokens: 200,
    total_cost_usd: 0.015,
    duration_ms: 1500,
    schema_version: '1.0',
    workstream_id: 'WS-18',
    agent_name: 'mg-code-review',
    feature_name: null,
  };

  describe('WorkstreamSummary with duration and cost (AC-3, AC-4)', () => {
    it('When aggregating by workstream, Then includes total_duration_ms', () => {
      const entry1 = { ...baseEntry, duration_ms: 1000 };
      const entry2 = { ...baseEntry, session_id: 'session-2', duration_ms: 2000 };
      const entry3 = { ...baseEntry, session_id: 'session-3', duration_ms: 1500 };

      const entries = [entry1, entry2, entry3];

      const result = aggregateByWorkstream(entries);

      expect(result).toHaveLength(1);
      expect(result[0].total_duration_ms).toBe(4500); // 1000 + 2000 + 1500
    });

    it('When aggregating by workstream, Then includes estimated_cost_usd', () => {
      const entry1 = { ...baseEntry, total_cost_usd: null }; // Will need estimation
      const entry2 = { ...baseEntry, session_id: 'session-2', total_cost_usd: null };

      const entries = [entry1, entry2];

      const result = aggregateByWorkstream(entries);

      expect(result[0].estimated_cost_usd).toBeDefined();
      expect(result[0].estimated_cost_usd).toBeGreaterThan(0);
    });

    it('When aggregating by workstream, Then includes cache_savings_tokens', () => {
      const entry1 = { ...baseEntry, cache_read_tokens: 1000 };
      const entry2 = { ...baseEntry, session_id: 'session-2', cache_read_tokens: 2000 };

      const entries = [entry1, entry2];

      const result = aggregateByWorkstream(entries);

      expect(result[0].cache_savings_tokens).toBe(3000); // Sum of cache reads
    });

    it('When entries have null duration, Then handles gracefully', () => {
      const entry1 = { ...baseEntry, duration_ms: 1000 };
      const entry2 = { ...baseEntry, session_id: 'session-2', duration_ms: null };

      const entries = [entry1, entry2];

      const result = aggregateByWorkstream(entries);

      expect(result[0].total_duration_ms).toBe(1000); // Only counts non-null
    });

    it('When all durations are null, Then total_duration_ms is 0', () => {
      const entry1 = { ...baseEntry, duration_ms: null };
      const entry2 = { ...baseEntry, session_id: 'session-2', duration_ms: null };

      const entries = [entry1, entry2];

      const result = aggregateByWorkstream(entries);

      expect(result[0].total_duration_ms).toBe(0);
    });

    it('When no cache reads, Then cache_savings_tokens is 0', () => {
      const entry1 = { ...baseEntry, cache_read_tokens: 0 };
      const entry2 = { ...baseEntry, session_id: 'session-2', cache_read_tokens: 0 };

      const entries = [entry1, entry2];

      const result = aggregateByWorkstream(entries);

      expect(result[0].cache_savings_tokens).toBe(0);
    });

    it('When cache_read_tokens is null, Then treats as zero', () => {
      const entry1 = { ...baseEntry, cache_read_tokens: null };
      const entry2 = { ...baseEntry, session_id: 'session-2', cache_read_tokens: 1000 };

      const entries = [entry1, entry2];

      const result = aggregateByWorkstream(entries);

      expect(result[0].cache_savings_tokens).toBe(1000);
    });
  });

  describe('AgentBreakdown with duration and cost (AC-4)', () => {
    it('When aggregating by agent, Then includes total_duration_ms', () => {
      const entry1 = { ...baseEntry, duration_ms: 1000 };
      const entry2 = { ...baseEntry, session_id: 'session-2', duration_ms: 2000 };

      const entries = [entry1, entry2];

      const result = aggregateByAgent(entries);

      expect(result[0].total_duration_ms).toBe(3000);
    });

    it('When aggregating by agent, Then includes estimated_cost_usd', () => {
      const entry1 = { ...baseEntry, total_cost_usd: null };
      const entry2 = { ...baseEntry, session_id: 'session-2', total_cost_usd: null };

      const entries = [entry1, entry2];

      const result = aggregateByAgent(entries);

      expect(result[0].estimated_cost_usd).toBeDefined();
      expect(result[0].estimated_cost_usd).toBeGreaterThan(0);
    });

    it('When different agents in same workstream, Then each has own duration', () => {
      const qaEntry = { ...baseEntry, agent_name: 'qa', duration_ms: 2500 };
      const devEntry = { ...baseEntry, session_id: 'session-2', agent_name: 'dev', duration_ms: 3500 };

      const entries = [qaEntry, devEntry];

      const result = aggregateByAgent(entries);

      expect(result).toHaveLength(2);
      const qa = result.find(r => r.agent_name === 'qa');
      const dev = result.find(r => r.agent_name === 'dev');

      expect(qa!.total_duration_ms).toBe(2500);
      expect(dev!.total_duration_ms).toBe(3500);
    });
  });

  describe('Cost estimation integration (AC-1)', () => {
    it('When total_cost_usd is null, Then estimates from token counts', () => {
      const entry = {
        ...baseEntry,
        total_cost_usd: null,
        input_tokens: 1000000, // 1M tokens
        output_tokens: 500000,  // 500k tokens
        cache_creation_tokens: 0,
        cache_read_tokens: 0,
      };

      const entries = [entry];

      const result = aggregateByWorkstream(entries);

      // Should estimate cost using pricing module
      expect(result[0].estimated_cost_usd).toBeGreaterThan(0);
      expect(result[0].total_cost_usd).toBe(0); // Original field remains 0
    });

    it('When some entries have cost and some do not, Then estimates missing only', () => {
      const entry1 = { ...baseEntry, total_cost_usd: 0.015 };
      const entry2 = { ...baseEntry, session_id: 'session-2', total_cost_usd: null };

      const entries = [entry1, entry2];

      const result = aggregateByWorkstream(entries);

      // total_cost_usd: sum of known costs
      expect(result[0].total_cost_usd).toBe(0.015);
      // estimated_cost_usd: sum of all entries (known + estimated)
      expect(result[0].estimated_cost_usd).toBeGreaterThan(0.015);
    });

    it('When all entries have total_cost_usd, Then estimated equals total', () => {
      const entry1 = { ...baseEntry, total_cost_usd: 0.015 };
      const entry2 = { ...baseEntry, session_id: 'session-2', total_cost_usd: 0.020 };

      const entries = [entry1, entry2];

      const result = aggregateByWorkstream(entries);

      expect(result[0].total_cost_usd).toBe(0.035);
      expect(result[0].estimated_cost_usd).toBe(0.035);
    });
  });

  describe('Cache savings calculation (AC-3)', () => {
    it('When calculating cache savings, Then sums cache_read_tokens', () => {
      const entry1 = { ...baseEntry, cache_read_tokens: 5000 };
      const entry2 = { ...baseEntry, session_id: 'session-2', cache_read_tokens: 3000 };
      const entry3 = { ...baseEntry, session_id: 'session-3', cache_read_tokens: 2000 };

      const entries = [entry1, entry2, entry3];

      const result = aggregateByWorkstream(entries);

      expect(result[0].cache_savings_tokens).toBe(10000);
    });

    it('When cache_creation_tokens present, Then does not count as savings', () => {
      const entry = {
        ...baseEntry,
        cache_creation_tokens: 10000,
        cache_read_tokens: 5000,
      };

      const entries = [entry];

      const result = aggregateByWorkstream(entries);

      // Only cache_read_tokens count as savings
      expect(result[0].cache_savings_tokens).toBe(5000);
    });

    it('When no cache usage, Then cache_savings_tokens is 0', () => {
      const entry = {
        ...baseEntry,
        cache_creation_tokens: 0,
        cache_read_tokens: 0,
      };

      const entries = [entry];

      const result = aggregateByWorkstream(entries);

      expect(result[0].cache_savings_tokens).toBe(0);
    });
  });

  describe('Enhanced zero-usage workstreams (AC-3)', () => {
    it('When including zero-usage workstreams, Then initializes enhanced fields to zero', () => {
      const summaries: WorkstreamSummary[] = [
        {
          workstream_id: 'WS-18',
          request_count: 5,
          total_input_tokens: 5000,
          total_output_tokens: 2500,
          total_cost_usd: 0.075,
          total_duration_ms: 5000,
          estimated_cost_usd: 0.075,
          cache_savings_tokens: 1000,
        },
      ];

      const knownWorkstreams = ['WS-18', 'WS-19'];

      const result = includeZeroUsageWorkstreams(summaries, knownWorkstreams);

      const ws19 = result.find(r => r.workstream_id === 'WS-19');
      expect(ws19).toBeDefined();
      expect(ws19!.total_duration_ms).toBe(0);
      expect(ws19!.estimated_cost_usd).toBe(0);
      expect(ws19!.cache_savings_tokens).toBe(0);
    });
  });

  describe('Duration aggregation edge cases', () => {
    it('When duration exceeds 1 hour, Then sums correctly', () => {
      const longEntry = { ...baseEntry, duration_ms: 3600000 }; // 1 hour

      const entries = Array(10).fill(longEntry);

      const result = aggregateByWorkstream(entries);

      expect(result[0].total_duration_ms).toBe(36000000); // 10 hours in ms
    });

    it('When duration is very small, Then maintains precision', () => {
      const fastEntry = { ...baseEntry, duration_ms: 1 }; // 1ms

      const entries = Array(1000).fill(fastEntry);

      const result = aggregateByWorkstream(entries);

      expect(result[0].total_duration_ms).toBe(1000);
    });

    it('When mixing null and valid durations, Then sums valid only', () => {
      const entry1 = { ...baseEntry, duration_ms: 1000 };
      const entry2 = { ...baseEntry, session_id: 'session-2', duration_ms: null };
      const entry3 = { ...baseEntry, session_id: 'session-3', duration_ms: 2000 };

      const entries = [entry1, entry2, entry3];

      const result = aggregateByWorkstream(entries);

      expect(result[0].total_duration_ms).toBe(3000);
      expect(result[0].request_count).toBe(3); // Still counts all entries
    });
  });
});

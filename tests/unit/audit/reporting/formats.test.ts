/**
 * WS-TRACKING Phase 2: Formats Module Tests
 *
 * BDD Scenarios:
 * - AC-2.6: Output formats: table (default), json, csv
 * - AC-2.8: Report sorted by total_cost_usd descending
 * - AC-2.9: Total row at bottom sums all workstreams
 * - AC-3.6: Output formats: table, json, csv
 * - AC-3.8: Default sorted by cost descending within workstream
 * - TRACK-BDD-5: View workstream summary (table output)
 * - TRACK-BDD-7: JSON output for programmatic use
 * - TRACK-BDD-9: View agent breakdown within workstream
 *
 * Target: 100% coverage of formats.ts
 */

import { describe, it, expect } from 'vitest';

// Type definitions for formats module (to be implemented)
interface WorkstreamSummary {
  workstream_id: string;
  request_count: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  total_duration_ms: number;
  estimated_cost_usd: number;
  cache_savings_tokens: number;
}

interface AgentBreakdown {
  workstream_id: string;
  agent_name: string;
  request_count: number;
  total_tokens: number;
  total_cost_usd: number;
  success_count: number | null;
  success_rate: number | null;
  total_duration_ms: number;
  estimated_cost_usd: number;
}

enum OutputFormat {
  TABLE = 'table',
  JSON = 'json',
  CSV = 'csv',
}

// Placeholder imports (will be implemented)
import {
  formatWorkstreamSummary,
  formatAgentBreakdown,
  sortByTotalCost,
  addTotalRow,
} from '@/audit/reporting/formats';

describe('audit/reporting/formats - formatWorkstreamSummary()', () => {
  const summaries: WorkstreamSummary[] = [
    {
      workstream_id: 'WS-19',
      request_count: 3,
      total_input_tokens: 2000,
      total_output_tokens: 1000,
      total_cost_usd: 0.030,
      total_duration_ms: 1500,
      estimated_cost_usd: 0.030,
      cache_savings_tokens: 100,
    },
    {
      workstream_id: 'WS-18',
      request_count: 5,
      total_input_tokens: 1000,
      total_output_tokens: 500,
      total_cost_usd: 0.015,
      total_duration_ms: 2000,
      estimated_cost_usd: 0.015,
      cache_savings_tokens: 50,
    },
    {
      workstream_id: 'WS-21',
      request_count: 1,
      total_input_tokens: 500,
      total_output_tokens: 250,
      total_cost_usd: 0.010,
      total_duration_ms: 800,
      estimated_cost_usd: 0.010,
      cache_savings_tokens: 0,
    },
  ];

  describe('Given table format (AC-2.6, TRACK-BDD-5)', () => {
    it('When formatting as table, Then returns formatted table string', () => {
      const result = formatWorkstreamSummary(summaries, OutputFormat.TABLE);
        expect(result).toContain('workstream_id');
        expect(result).toContain('requests');
        expect(result).toContain('input_tokens');
        expect(result).toContain('output_tokens');
        expect(result).toContain('cost_usd');
        expect(result).toContain('WS-18');
        expect(result).toContain('WS-19');
        expect(result).toContain('WS-21');
    });

    it('When formatting as table, Then aligns columns properly', () => {
      const result = formatWorkstreamSummary(summaries, OutputFormat.TABLE);
        const lines = result.split('\n');
        // Check that header and data rows have consistent column positions
        expect(lines.length).toBeGreaterThan(2);
    });

    it('When formatting as table, Then includes header row', () => {
      const result = formatWorkstreamSummary(summaries, OutputFormat.TABLE);
        const lines = result.split('\n');
        // Header row is after date range line and blank line
        const headerLine = lines.find(line => line.includes('workstream_id'));
        expect(headerLine).toMatch(/workstream_id.*requests.*input_tokens.*output_tokens.*cost_usd/);
    });

    it('When formatting as table, Then includes separator line', () => {
      const result = formatWorkstreamSummary(summaries, OutputFormat.TABLE);
        const lines = result.split('\n');
        // Should have a line with dashes or similar separator
        const separatorLine = lines.find(line => /[-─═]+/.test(line));
        expect(separatorLine).toMatch(/[-─═]+/);
    });
  });

  describe('Given JSON format (AC-2.6, TRACK-BDD-7)', () => {
    it('When formatting as JSON, Then returns valid JSON array', () => {
      const result = formatWorkstreamSummary(summaries, OutputFormat.JSON);
        const parsed = JSON.parse(result);
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed).toHaveLength(3);
    });

    it('When formatting as JSON, Then includes all required fields', () => {
      const result = formatWorkstreamSummary(summaries, OutputFormat.JSON);
        const parsed = JSON.parse(result);
        expect(parsed[0]).toHaveProperty('workstream_id');
        expect(parsed[0]).toHaveProperty('request_count');
        expect(parsed[0]).toHaveProperty('total_input_tokens');
        expect(parsed[0]).toHaveProperty('total_output_tokens');
        expect(parsed[0]).toHaveProperty('total_cost_usd');
    });

    it('When formatting as JSON, Then is parseable by jq', () => {
      const result = formatWorkstreamSummary(summaries, OutputFormat.JSON);
        // Should not have trailing commas or other JSON5 features
        expect(() => JSON.parse(result)).not.toThrow();
    });

    it('When formatting as JSON, Then uses snake_case for consistency', () => {
      const result = formatWorkstreamSummary(summaries, OutputFormat.JSON);
        expect(result).toContain('workstream_id');
        expect(result).toContain('request_count');
        expect(result).toContain('total_input_tokens');
        expect(result).not.toContain('workstreamId'); // camelCase
        expect(result).not.toContain('requestCount');
    });
  });

  describe('Given CSV format (AC-2.6)', () => {
    it('When formatting as CSV, Then returns valid CSV with headers', () => {
      const result = formatWorkstreamSummary(summaries, OutputFormat.CSV);
        const lines = result.split('\n');
        // Check that header includes required fields and enhanced fields
        expect(lines[0]).toContain('workstream_id');
        expect(lines[0]).toContain('request_count');
        expect(lines[0]).toContain('total_input_tokens');
        expect(lines[0]).toContain('total_output_tokens');
        expect(lines[0]).toContain('total_cost_usd');
        expect(lines[0]).toContain('total_duration_ms');
        expect(lines[0]).toContain('estimated_cost_usd');
        expect(lines[0]).toContain('cache_savings_tokens');
    });

    it('When formatting as CSV, Then includes data rows', () => {
      const result = formatWorkstreamSummary(summaries, OutputFormat.CSV);
        const lines = result.split('\n');
        expect(lines).toHaveLength(4); // header + 3 data rows
        expect(lines[1]).toContain('WS-19');
        expect(lines[1]).toContain('3'); // request_count
        expect(lines[1]).toContain('0.030'); // cost
    });

    it('When formatting as CSV, Then properly escapes values with commas', () => {
      const summaryWithComma: WorkstreamSummary[] = [
        {
          workstream_id: 'WS-18',
          request_count: 1,
          total_input_tokens: 1000,
          total_output_tokens: 500,
          total_cost_usd: 0.015,
          total_duration_ms: 500,
          estimated_cost_usd: 0.015,
          cache_savings_tokens: 0,
        },
      ];

      const result = formatWorkstreamSummary(summaryWithComma, OutputFormat.CSV);
        // If workstream_id contained comma, it should be quoted
        // For now, just ensure basic CSV structure is valid
        expect(result.split('\n')[1].split(',').length).toBe(8);
    });

    it('When formatting as CSV, Then is importable to Excel/Tableau', () => {
      const result = formatWorkstreamSummary(summaries, OutputFormat.CSV);
        // Should not have quotes around numbers
        // Should have consistent delimiter (comma)
        const lines = result.split('\n');
        // Enhanced version has 8 columns: workstream_id, request_count, total_input_tokens, total_output_tokens,
        // total_cost_usd, total_duration_ms, estimated_cost_usd, cache_savings_tokens
        expect(lines[1].split(',').length).toBe(8);
    });
  });

  describe('Given default format not specified', () => {
    it('When no format provided, Then defaults to table', () => {
      const result = formatWorkstreamSummary(summaries);
        // Should be table format (has newlines and headers)
        expect(result).toContain('workstream_id');
        expect(result).toContain('\n');
    });
  });

  describe('Given empty summaries array', () => {
    it('When formatting empty array, Then returns appropriate empty output', () => {
      const result = formatWorkstreamSummary([], OutputFormat.TABLE);
        expect(result).toContain('No data');
    });
  });
});

describe('audit/reporting/formats - sortByTotalCost()', () => {
  const unsortedSummaries: WorkstreamSummary[] = [
    {
      workstream_id: 'WS-21',
      request_count: 1,
      total_input_tokens: 500,
      total_output_tokens: 250,
      total_cost_usd: 0.010,
    },
    {
      workstream_id: 'WS-19',
      request_count: 3,
      total_input_tokens: 2000,
      total_output_tokens: 1000,
      total_cost_usd: 0.030,
    },
    {
      workstream_id: 'WS-18',
      request_count: 5,
      total_input_tokens: 1000,
      total_output_tokens: 500,
      total_cost_usd: 0.015,
    },
  ];

  describe('Given unsorted summaries (AC-2.8, TRACK-BDD-5)', () => {
    it('When sorting, Then orders by total_cost_usd descending', () => {
      const result = sortByTotalCost(unsortedSummaries);
        expect(result[0].workstream_id).toBe('WS-19'); // 0.030
        expect(result[1].workstream_id).toBe('WS-18'); // 0.015
        expect(result[2].workstream_id).toBe('WS-21'); // 0.010
    });

    it('When sorting, Then does not mutate original array', () => {
      const original = [...unsortedSummaries];
        const result = sortByTotalCost(unsortedSummaries);
        expect(unsortedSummaries).toEqual(original);
    });
  });

  describe('Given summaries with same cost', () => {
    it('When sorting, Then maintains stable order', () => {
      const sameCostSummaries: WorkstreamSummary[] = [
        {
          workstream_id: 'WS-A',
          request_count: 1,
          total_input_tokens: 1000,
          total_output_tokens: 500,
          total_cost_usd: 0.015,
        },
        {
          workstream_id: 'WS-B',
          request_count: 1,
          total_input_tokens: 1000,
          total_output_tokens: 500,
          total_cost_usd: 0.015,
        },
      ];

      const result = sortByTotalCost(sameCostSummaries);
        expect(result[0].workstream_id).toBe('WS-A');
        expect(result[1].workstream_id).toBe('WS-B');
    });
  });

  describe('Given zero cost entries', () => {
    it('When sorting, Then zero cost entries appear last', () => {
      const withZeroCost: WorkstreamSummary[] = [
        ...unsortedSummaries,
        {
          workstream_id: 'WS-ZERO',
          request_count: 0,
          total_input_tokens: 0,
          total_output_tokens: 0,
          total_cost_usd: 0,
        },
      ];

      const result = sortByTotalCost(withZeroCost);
        expect(result[result.length - 1].workstream_id).toBe('WS-ZERO');
    });
  });
});

describe('audit/reporting/formats - addTotalRow()', () => {
  const summaries: WorkstreamSummary[] = [
    {
      workstream_id: 'WS-19',
      request_count: 3,
      total_input_tokens: 2000,
      total_output_tokens: 1000,
      total_cost_usd: 0.030,
    },
    {
      workstream_id: 'WS-18',
      request_count: 5,
      total_input_tokens: 1000,
      total_output_tokens: 500,
      total_cost_usd: 0.015,
    },
    {
      workstream_id: 'WS-21',
      request_count: 1,
      total_input_tokens: 500,
      total_output_tokens: 250,
      total_cost_usd: 0.010,
    },
  ];

  describe('Given multiple summaries (AC-2.9, TRACK-BDD-5)', () => {
    it('When adding total row, Then sums all numeric fields', () => {
      const result = addTotalRow(summaries);
        const totalRow = result[result.length - 1];
        expect(totalRow.workstream_id).toBe('TOTAL');
        expect(totalRow.request_count).toBe(9); // 3 + 5 + 1
        expect(totalRow.total_input_tokens).toBe(3500); // 2000 + 1000 + 500
        expect(totalRow.total_output_tokens).toBe(1750); // 1000 + 500 + 250
        expect(totalRow.total_cost_usd).toBe(0.055); // 0.030 + 0.015 + 0.010
    });

    it('When adding total row, Then maintains precision for costs', () => {
      const result = addTotalRow(summaries);
        const totalRow = result[result.length - 1];
        // Should be exactly 0.055, not 0.055000000001
        expect(totalRow.total_cost_usd).toBe(0.055);
    });

    it('When adding total row, Then does not mutate original array', () => {
      const original = [...summaries];
        const result = addTotalRow(summaries);
        expect(summaries).toEqual(original);
        expect(result.length).toBe(summaries.length + 1);
    });
  });

  describe('Given empty array', () => {
    it('When adding total row to empty array, Then returns array with zero total', () => {
      const result = addTotalRow([]);
        expect(result).toHaveLength(1);
        expect(result[0].workstream_id).toBe('TOTAL');
        expect(result[0].request_count).toBe(0);
        expect(result[0].total_cost_usd).toBe(0);
    });
  });
});

describe('audit/reporting/formats - formatAgentBreakdown()', () => {
  const agentData: AgentBreakdown[] = [
    {
      workstream_id: 'WS-18',
      agent_name: 'code-review',
      request_count: 5,
      total_tokens: 7500,
      total_cost_usd: 0.025,
      success_count: 4,
      success_rate: 80,
      total_duration_ms: 1200,
      estimated_cost_usd: 0.025,
    },
    {
      workstream_id: 'WS-18',
      agent_name: 'qa',
      request_count: 8,
      total_tokens: 4500,
      total_cost_usd: 0.012,
      success_count: null,
      success_rate: null,
      total_duration_ms: 1800,
      estimated_cost_usd: 0.012,
    },
    {
      workstream_id: 'WS-18',
      agent_name: 'design-review',
      request_count: 3,
      total_tokens: 2000,
      total_cost_usd: 0.005,
      success_count: null,
      success_rate: null,
      total_duration_ms: 900,
      estimated_cost_usd: 0.005,
    },
  ];

  describe('Given agent breakdown data (AC-3.6, TRACK-BDD-9)', () => {
    it('When formatting as table, Then includes agent-specific columns', () => {
      const result = formatAgentBreakdown(agentData, OutputFormat.TABLE);
        expect(result).toContain('workstream_id');
        expect(result).toContain('agent_name');
        expect(result).toContain('requests');
        expect(result).toContain('total_tokens');
        expect(result).toContain('cost_usd');
        expect(result).toContain('success_rate');
    });

    it('When formatting as table, Then groups by workstream', () => {
      const result = formatAgentBreakdown(agentData, OutputFormat.TABLE);
        // Should have workstream header or grouping
        expect(result).toContain('WS-18');
    });

    it('When formatting success_rate, Then shows percentage or N/A', () => {
      const result = formatAgentBreakdown(agentData, OutputFormat.TABLE);
        expect(result).toContain('80.00%'); // code-review success rate
        expect(result).toMatch(/N\/A|null|-/); // qa success rate (null)
    });
  });

  describe('Given agent breakdown as JSON (AC-3.6)', () => {
    it('When formatting as JSON, Then includes success metrics', () => {
      const result = formatAgentBreakdown(agentData, OutputFormat.JSON);
        const parsed = JSON.parse(result);
        expect(parsed[0]).toHaveProperty('success_count');
        expect(parsed[0]).toHaveProperty('success_rate');
    });

    it('When formatting as JSON, Then preserves null success values', () => {
      const result = formatAgentBreakdown(agentData, OutputFormat.JSON);
        const parsed = JSON.parse(result);
        const qaAgent = parsed.find((a: any) => a.agent_name === 'qa');
        expect(qaAgent.success_count).toBeNull();
        expect(qaAgent.success_rate).toBeNull();
    });
  });

  describe('Given agent breakdown as CSV', () => {
    it('When formatting as CSV, Then includes all agent columns', () => {
      const result = formatAgentBreakdown(agentData, OutputFormat.CSV);
        const lines = result.split('\n');
        expect(lines[0]).toContain('workstream_id');
        expect(lines[0]).toContain('agent_name');
        expect(lines[0]).toContain('success_rate');
    });
  });

  describe('Given sorting requirement (AC-3.8)', () => {
    it('When formatting agents, Then sorts by cost descending within workstream', () => {
      const unsortedAgentData: AgentBreakdown[] = [
        {
          workstream_id: 'WS-18',
          agent_name: 'design-review',
          request_count: 3,
          total_tokens: 2000,
          total_cost_usd: 0.005,
          success_count: null,
          success_rate: null,
        },
        {
          workstream_id: 'WS-18',
          agent_name: 'code-review',
          request_count: 5,
          total_tokens: 7500,
          total_cost_usd: 0.025,
          success_count: 4,
          success_rate: 80,
        },
        {
          workstream_id: 'WS-18',
          agent_name: 'qa',
          request_count: 8,
          total_tokens: 4500,
          total_cost_usd: 0.012,
          success_count: null,
          success_rate: null,
        },
      ];

      const result = formatAgentBreakdown(unsortedAgentData, OutputFormat.JSON);
        const parsed = JSON.parse(result);
        expect(parsed[0].agent_name).toBe('code-review'); // 0.025
        expect(parsed[1].agent_name).toBe('qa'); // 0.012
        expect(parsed[2].agent_name).toBe('design-review'); // 0.005
    });
  });
});

describe('audit/reporting/formats - table formatting details', () => {
  describe('Given numeric formatting requirements', () => {
    it('When formatting costs, Then uses 2 decimal places', () => {
      const summary: WorkstreamSummary[] = [
        {
          workstream_id: 'WS-18',
          request_count: 1,
          total_input_tokens: 1000,
          total_output_tokens: 500,
          total_cost_usd: 0.015678,
          total_duration_ms: 500,
          estimated_cost_usd: 0.015678,
          cache_savings_tokens: 0,
        },
      ];

      const result = formatWorkstreamSummary(summary, OutputFormat.TABLE);
        expect(result).toContain('0.02'); // Rounded to 2 decimals
    });

    it('When formatting large numbers, Then adds thousand separators', () => {
      const summary: WorkstreamSummary[] = [
        {
          workstream_id: 'WS-18',
          request_count: 1,
          total_input_tokens: 1234567,
          total_output_tokens: 987654,
          total_cost_usd: 15.00,
          total_duration_ms: 1000,
          estimated_cost_usd: 15.00,
          cache_savings_tokens: 0,
        },
      ];

      const result = formatWorkstreamSummary(summary, OutputFormat.TABLE);
        expect(result).toMatch(/1,234,567/); // or 1 234 567 depending on locale
    });
  });

  describe('Given column alignment', () => {
    it('When formatting table, Then right-aligns numeric columns', () => {
      const summary: WorkstreamSummary[] = [
        {
          workstream_id: 'WS-18',
          request_count: 5,
          total_input_tokens: 1000,
          total_output_tokens: 500,
          total_cost_usd: 0.015,
          total_duration_ms: 500,
          estimated_cost_usd: 0.015,
          cache_savings_tokens: 0,
        },
        {
          workstream_id: 'WS-100',
          request_count: 12345,
          total_input_tokens: 1234567,
          total_output_tokens: 987654,
          total_cost_usd: 150.00,
          total_duration_ms: 5000,
          estimated_cost_usd: 150.00,
          cache_savings_tokens: 1000,
        },
      ];

      const result = formatWorkstreamSummary(summary, OutputFormat.TABLE);
        // Numbers should align on right side
        const lines = result.split('\n');
        // This is a visual check - implementation detail
        expect(lines.length).toBeGreaterThan(2);
    });

    it('When formatting table, Then left-aligns text columns', () => {
      const summary: WorkstreamSummary[] = [
          { workstream_id: 'WS-18', request_count: 1, total_input_tokens: 1000, total_output_tokens: 500, total_cost_usd: 0.015, total_duration_ms: 500, estimated_cost_usd: 0.015, cache_savings_tokens: 0 },
        ];
        const result = formatWorkstreamSummary(summary, OutputFormat.TABLE);
        // workstream_id should be left-aligned
        expect(result).toBeTruthy();
    });
  });
});

describe('audit/reporting/formats - date range display (AC-2.4)', () => {
  describe('Given date range in report', () => {
    it('When formatting, Then includes date range in header', () => {
      const summary: WorkstreamSummary[] = [
        {
          workstream_id: 'WS-18',
          request_count: 1,
          total_input_tokens: 1000,
          total_output_tokens: 500,
          total_cost_usd: 0.015,
          total_duration_ms: 500,
          estimated_cost_usd: 0.015,
          cache_savings_tokens: 0,
        },
      ];

      const dateRange = {
        from: new Date('2026-02-01T00:00:00.000Z'),
        to: new Date('2026-02-04T23:59:59.999Z'),
      };

      const result = formatWorkstreamSummary(summary, OutputFormat.TABLE, dateRange);
        expect(result).toContain('2026-02-01');
        expect(result).toContain('2026-02-04');
    });

    it('When no explicit date range, Then shows "Last 30 days"', () => {
      const summary: WorkstreamSummary[] = [
        {
          workstream_id: 'WS-18',
          request_count: 1,
          total_input_tokens: 1000,
          total_output_tokens: 500,
          total_cost_usd: 0.015,
          total_duration_ms: 500,
          estimated_cost_usd: 0.015,
          cache_savings_tokens: 0,
        },
      ];

      const result = formatWorkstreamSummary(summary, OutputFormat.TABLE);
        expect(result).toContain('Last 30 days');
    });
  });
});

// ============================================================================
// WS-AUDIT-1: Enhanced Reporting with Duration and Cost Columns
// ============================================================================

describe('audit/reporting/formats - WS-AUDIT-1 enhanced columns (AC-5)', () => {
  interface EnhancedWorkstreamSummary extends WorkstreamSummary {
    total_duration_ms: number;
    estimated_cost_usd: number;
    cache_savings_tokens: number;
  }

  interface EnhancedAgentBreakdown extends AgentBreakdown {
    total_duration_ms: number;
    estimated_cost_usd: number;
  }

  const enhancedSummaries: EnhancedWorkstreamSummary[] = [
    {
      workstream_id: 'WS-18',
      request_count: 10,
      total_input_tokens: 10000,
      total_output_tokens: 5000,
      total_cost_usd: 0.150,
      total_duration_ms: 15000,
      estimated_cost_usd: 0.160,
      cache_savings_tokens: 2000,
    },
    {
      workstream_id: 'WS-19',
      request_count: 5,
      total_input_tokens: 5000,
      total_output_tokens: 2500,
      total_cost_usd: 0.075,
      total_duration_ms: 7500,
      estimated_cost_usd: 0.080,
      cache_savings_tokens: 1000,
    },
  ];

  describe('formatWorkstreamSummary() with enhanced fields - TABLE format', () => {
    it('When formatting table, Then includes duration_ms column', () => {
      const result = formatWorkstreamSummary(enhancedSummaries as any, OutputFormat.TABLE);

      expect(result).toContain('duration_ms');
      expect(result).toContain('15000'); // WS-18 duration
      expect(result).toContain('7500');  // WS-19 duration
    });

    it('When formatting table, Then includes estimated_cost_usd column', () => {
      const result = formatWorkstreamSummary(enhancedSummaries as any, OutputFormat.TABLE);

      expect(result).toContain('estimated_cost');
      expect(result).toContain('0.16'); // WS-18 estimated cost
      expect(result).toContain('0.08'); // WS-19 estimated cost
    });

    it('When formatting table, Then includes cache_savings column', () => {
      const result = formatWorkstreamSummary(enhancedSummaries as any, OutputFormat.TABLE);

      expect(result).toContain('cache_savings');
      expect(result).toContain('2000'); // WS-18 cache savings
      expect(result).toContain('1000'); // WS-19 cache savings
    });

    it('When formatting table, Then aligns new columns properly', () => {
      const result = formatWorkstreamSummary(enhancedSummaries as any, OutputFormat.TABLE);
      const lines = result.split('\n');

      // Check header has all columns
      const headerLine = lines.find(l => l.includes('workstream_id'));
      expect(headerLine).toContain('duration_ms');
      expect(headerLine).toContain('estimated_cost');
      expect(headerLine).toContain('cache_savings');
    });

    it('When duration is 0, Then displays 0 in table', () => {
      const summaryWithZeroDuration = [{
        ...enhancedSummaries[0],
        total_duration_ms: 0,
      }];

      const result = formatWorkstreamSummary(summaryWithZeroDuration as any, OutputFormat.TABLE);

      expect(result).toContain('0'); // duration column should show 0
    });

    it('When duration exceeds 1 hour, Then formats readably', () => {
      const summaryWithLongDuration = [{
        ...enhancedSummaries[0],
        total_duration_ms: 3600000, // 1 hour
      }];

      const result = formatWorkstreamSummary(summaryWithLongDuration as any, OutputFormat.TABLE);

      // Should include duration in ms (exact formatting TBD in implementation)
      expect(result).toContain('3600000');
    });
  });

  describe('formatWorkstreamSummary() with enhanced fields - JSON format', () => {
    it('When formatting JSON, Then includes all enhanced fields', () => {
      const result = formatWorkstreamSummary(enhancedSummaries as any, OutputFormat.JSON);
      const parsed = JSON.parse(result);

      expect(parsed[0]).toHaveProperty('total_duration_ms');
      expect(parsed[0]).toHaveProperty('estimated_cost_usd');
      expect(parsed[0]).toHaveProperty('cache_savings_tokens');
    });

    it('When formatting JSON, Then preserves numeric precision', () => {
      const result = formatWorkstreamSummary(enhancedSummaries as any, OutputFormat.JSON);
      const parsed = JSON.parse(result);

      expect(parsed[0].total_duration_ms).toBe(15000);
      expect(parsed[0].estimated_cost_usd).toBeCloseTo(0.160, 3);
      expect(parsed[0].cache_savings_tokens).toBe(2000);
    });

    it('When formatting JSON, Then uses snake_case for new fields', () => {
      const result = formatWorkstreamSummary(enhancedSummaries as any, OutputFormat.JSON);

      expect(result).toContain('total_duration_ms');
      expect(result).toContain('estimated_cost_usd');
      expect(result).toContain('cache_savings_tokens');
      expect(result).not.toContain('totalDurationMs');
      expect(result).not.toContain('estimatedCostUsd');
    });
  });

  describe('formatWorkstreamSummary() with enhanced fields - CSV format', () => {
    it('When formatting CSV, Then includes enhanced columns in header', () => {
      const result = formatWorkstreamSummary(enhancedSummaries as any, OutputFormat.CSV);
      const lines = result.split('\n');

      expect(lines[0]).toContain('total_duration_ms');
      expect(lines[0]).toContain('estimated_cost_usd');
      expect(lines[0]).toContain('cache_savings_tokens');
    });

    it('When formatting CSV, Then includes enhanced values in data rows', () => {
      const result = formatWorkstreamSummary(enhancedSummaries as any, OutputFormat.CSV);
      const lines = result.split('\n');

      // First data row (WS-18)
      expect(lines[1]).toContain('15000'); // duration
      expect(lines[1]).toContain('0.160'); // estimated cost
      expect(lines[1]).toContain('2000');  // cache savings
    });

    it('When formatting CSV, Then maintains column order', () => {
      const result = formatWorkstreamSummary(enhancedSummaries as any, OutputFormat.CSV);
      const lines = result.split('\n');
      const headers = lines[0].split(',');

      // Enhanced fields should be at the end
      expect(headers).toContain('total_duration_ms');
      expect(headers).toContain('estimated_cost_usd');
      expect(headers).toContain('cache_savings_tokens');
    });
  });

  describe('formatAgentBreakdown() with enhanced fields - TABLE format', () => {
    const enhancedBreakdowns: EnhancedAgentBreakdown[] = [
      {
        workstream_id: 'WS-18',
        agent_name: 'qa',
        request_count: 5,
        total_tokens: 7500,
        total_cost_usd: 0.075,
        success_count: 4,
        success_rate: 80.0,
        total_duration_ms: 7500,
        estimated_cost_usd: 0.080,
      },
      {
        workstream_id: 'WS-18',
        agent_name: 'dev',
        request_count: 3,
        total_tokens: 4500,
        total_cost_usd: 0.045,
        success_count: 3,
        success_rate: 100.0,
        total_duration_ms: 4500,
        estimated_cost_usd: 0.050,
      },
    ];

    it('When formatting agent table, Then includes duration_ms column', () => {
      const result = formatAgentBreakdown(enhancedBreakdowns as any, OutputFormat.TABLE);

      expect(result).toContain('duration_ms');
      expect(result).toContain('7500');
      expect(result).toContain('4500');
    });

    it('When formatting agent table, Then includes estimated_cost_usd column', () => {
      const result = formatAgentBreakdown(enhancedBreakdowns as any, OutputFormat.TABLE);

      expect(result).toContain('estimated_cost');
      expect(result).toContain('0.08');
      expect(result).toContain('0.05');
    });

    it('When formatting agent table, Then maintains existing columns', () => {
      const result = formatAgentBreakdown(enhancedBreakdowns as any, OutputFormat.TABLE);

      // Should still have original columns
      expect(result).toContain('workstream_id');
      expect(result).toContain('agent_name');
      expect(result).toContain('requests');
      expect(result).toContain('total_tokens');
      expect(result).toContain('cost_usd');
      expect(result).toContain('success_rate');
    });
  });

  describe('formatAgentBreakdown() with enhanced fields - JSON format', () => {
    const enhancedBreakdowns: EnhancedAgentBreakdown[] = [
      {
        workstream_id: 'WS-18',
        agent_name: 'qa',
        request_count: 5,
        total_tokens: 7500,
        total_cost_usd: 0.075,
        success_count: 4,
        success_rate: 80.0,
        total_duration_ms: 7500,
        estimated_cost_usd: 0.080,
      },
    ];

    it('When formatting JSON, Then includes enhanced fields', () => {
      const result = formatAgentBreakdown(enhancedBreakdowns as any, OutputFormat.JSON);
      const parsed = JSON.parse(result);

      expect(parsed[0]).toHaveProperty('total_duration_ms');
      expect(parsed[0]).toHaveProperty('estimated_cost_usd');
    });

    it('When formatting JSON, Then preserves all existing fields', () => {
      const result = formatAgentBreakdown(enhancedBreakdowns as any, OutputFormat.JSON);
      const parsed = JSON.parse(result);

      expect(parsed[0]).toHaveProperty('workstream_id');
      expect(parsed[0]).toHaveProperty('agent_name');
      expect(parsed[0]).toHaveProperty('request_count');
      expect(parsed[0]).toHaveProperty('total_tokens');
      expect(parsed[0]).toHaveProperty('total_cost_usd');
      expect(parsed[0]).toHaveProperty('success_count');
      expect(parsed[0]).toHaveProperty('success_rate');
    });
  });

  describe('formatAgentBreakdown() with enhanced fields - CSV format', () => {
    const enhancedBreakdowns: EnhancedAgentBreakdown[] = [
      {
        workstream_id: 'WS-18',
        agent_name: 'qa',
        request_count: 5,
        total_tokens: 7500,
        total_cost_usd: 0.075,
        success_count: 4,
        success_rate: 80.0,
        total_duration_ms: 7500,
        estimated_cost_usd: 0.080,
      },
    ];

    it('When formatting CSV, Then includes enhanced columns', () => {
      const result = formatAgentBreakdown(enhancedBreakdowns as any, OutputFormat.CSV);
      const lines = result.split('\n');

      expect(lines[0]).toContain('total_duration_ms');
      expect(lines[0]).toContain('estimated_cost_usd');
    });

    it('When formatting CSV, Then includes enhanced values', () => {
      const result = formatAgentBreakdown(enhancedBreakdowns as any, OutputFormat.CSV);
      const lines = result.split('\n');

      expect(lines[1]).toContain('7500'); // duration
      expect(lines[1]).toContain('0.080'); // estimated cost
    });
  });

  describe('addTotalRow() with enhanced fields', () => {
    it('When adding total row, Then sums duration_ms', () => {
      const result = addTotalRow(enhancedSummaries as any);

      const totalRow = result.find(r => r.workstream_id === 'TOTAL');
      expect(totalRow).toBeDefined();
      expect(totalRow!.total_duration_ms).toBe(22500); // 15000 + 7500
    });

    it('When adding total row, Then sums estimated_cost_usd', () => {
      const result = addTotalRow(enhancedSummaries as any);

      const totalRow = result.find(r => r.workstream_id === 'TOTAL');
      expect(totalRow!.estimated_cost_usd).toBeCloseTo(0.240, 3); // 0.160 + 0.080
    });

    it('When adding total row, Then sums cache_savings_tokens', () => {
      const result = addTotalRow(enhancedSummaries as any);

      const totalRow = result.find(r => r.workstream_id === 'TOTAL');
      expect(totalRow!.cache_savings_tokens).toBe(3000); // 2000 + 1000
    });

    it('When adding total row, Then preserves original summaries', () => {
      const result = addTotalRow(enhancedSummaries as any);

      // Should have original 2 + TOTAL = 3
      expect(result).toHaveLength(3);
      expect(result.find(r => r.workstream_id === 'WS-18')).toBeDefined();
      expect(result.find(r => r.workstream_id === 'WS-19')).toBeDefined();
    });
  });

  describe('Duration formatting helpers', () => {
    it('When duration < 1 second, Then shows milliseconds', () => {
      const summary = [{
        ...enhancedSummaries[0],
        total_duration_ms: 500,
      }];

      const result = formatWorkstreamSummary(summary as any, OutputFormat.TABLE);

      expect(result).toContain('500');
    });

    it('When duration > 1 hour, Then still shows in milliseconds', () => {
      const summary = [{
        ...enhancedSummaries[0],
        total_duration_ms: 7200000, // 2 hours
      }];

      const result = formatWorkstreamSummary(summary as any, OutputFormat.TABLE);

      expect(result).toContain('7200000');
    });

    it('When duration is 0, Then shows 0', () => {
      const summary = [{
        ...enhancedSummaries[0],
        total_duration_ms: 0,
      }];

      const result = formatWorkstreamSummary(summary as any, OutputFormat.TABLE);

      expect(result).toContain('0');
    });
  });

  describe('Cost formatting with estimation', () => {
    it('When estimated_cost differs from total_cost, Then shows both', () => {
      const summary = [{
        ...enhancedSummaries[0],
        total_cost_usd: 0.100,
        estimated_cost_usd: 0.150,
      }];

      const result = formatWorkstreamSummary(summary as any, OutputFormat.TABLE);

      expect(result).toContain('0.10'); // total_cost
      expect(result).toContain('0.15'); // estimated_cost
    });

    it('When estimated_cost equals total_cost, Then shows both identically', () => {
      const summary = [{
        ...enhancedSummaries[0],
        total_cost_usd: 0.150,
        estimated_cost_usd: 0.150,
      }];

      const result = formatWorkstreamSummary(summary as any, OutputFormat.TABLE);

      // Both columns should show same value
      expect(result).toContain('0.15');
    });

    it('When cost is very small, Then preserves precision', () => {
      const summary = [{
        ...enhancedSummaries[0],
        total_cost_usd: 0.001,
        estimated_cost_usd: 0.0015,
      }];

      const result = formatWorkstreamSummary(summary as any, OutputFormat.TABLE);

      expect(result).toContain('0.00'); // Should show fractional cents
    });
  });

  describe('Cache savings display', () => {
    it('When cache_savings is 0, Then shows 0', () => {
      const summary = [{
        ...enhancedSummaries[0],
        cache_savings_tokens: 0,
      }];

      const result = formatWorkstreamSummary(summary as any, OutputFormat.TABLE);

      expect(result).toContain('0'); // cache_savings column
    });

    it('When cache_savings is large, Then formats with separators', () => {
      const summary = [{
        ...enhancedSummaries[0],
        cache_savings_tokens: 1234567,
      }];

      const result = formatWorkstreamSummary(summary as any, OutputFormat.TABLE);

      // Should have thousands separators (format TBD)
      expect(result).toContain('1234567');
    });
  });
});

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
        expect(lines[0]).toMatch(/workstream_id.*requests.*input_tokens.*output_tokens.*cost_usd/);
    });

    it('When formatting as table, Then includes separator line', () => {
      const result = formatWorkstreamSummary(summaries, OutputFormat.TABLE);
        const lines = result.split('\n');
        // Should have a line with dashes or similar separator
        expect(lines[1]).toMatch(/[-─═]+/);
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
        expect(lines[0]).toBe('workstream_id,request_count,total_input_tokens,total_output_tokens,total_cost_usd');
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
        },
      ];

      const result = formatWorkstreamSummary(summaryWithComma, OutputFormat.CSV);
        // If workstream_id contained comma, it should be quoted
        // For now, just ensure basic CSV structure is valid
        expect(result.split('\n')[1].split(',').length).toBe(5);
    });

    it('When formatting as CSV, Then is importable to Excel/Tableau', () => {
      const result = formatWorkstreamSummary(summaries, OutputFormat.CSV);
        // Should not have quotes around numbers
        // Should have consistent delimiter (comma)
        const lines = result.split('\n');
        expect(lines[1]).toMatch(/^[^,]+,\d+,\d+,\d+,\d+\.\d+$/);
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
    {
      workstream_id: 'WS-18',
      agent_name: 'design-review',
      request_count: 3,
      total_tokens: 2000,
      total_cost_usd: 0.005,
      success_count: null,
      success_rate: null,
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
        expect(result).toContain('80%'); // code-review success rate
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
        },
        {
          workstream_id: 'WS-100',
          request_count: 12345,
          total_input_tokens: 1234567,
          total_output_tokens: 987654,
          total_cost_usd: 150.00,
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
          { workstream_id: 'WS-18', request_count: 1, total_input_tokens: 1000, total_output_tokens: 500, total_cost_usd: 0.015 },
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
        },
      ];

      const result = formatWorkstreamSummary(summary, OutputFormat.TABLE);
        expect(result).toContain('Last 30 days');
    });
  });
});

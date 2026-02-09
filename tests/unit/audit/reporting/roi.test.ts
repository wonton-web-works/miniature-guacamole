/**
 * WS-AUDIT-2: ROI Reporting & Cross-Project Aggregation - ROI Tests
 *
 * BDD Scenarios:
 * - AC-2: Human time savings estimate: configurable hourly_rate in config, heuristic maps workstream token usage to estimated human-hours
 * - AC-3: ROI comparison output: shows agent_cost vs human_cost_estimate and savings_percentage
 * - AC-5: Summary dashboard output: total spend, total savings, workstream count, average cost per workstream
 *
 * Coverage Target: 99%+ of roi.ts module
 * Test Pattern: MISUSE → BOUNDARY → GOLDEN PATH
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { WorkstreamSummary } from '@/audit/reporting/aggregation';

/**
 * ROI configuration
 */
export interface ROIConfig {
  hourly_rate_usd: number;
  token_to_hour_heuristic: 'linear' | 'logarithmic' | 'custom';
  custom_heuristic_params?: Record<string, number>;
}

/**
 * ROI calculation result
 */
export interface ROIResult {
  agent_cost_usd: number;
  human_cost_estimate_usd: number;
  savings_usd: number;
  savings_percentage: number;
  estimated_human_hours: number;
}

/**
 * Extended workstream summary with ROI data
 */
export interface WorkstreamSummaryWithROI extends WorkstreamSummary {
  roi: ROIResult;
}

/**
 * Summary dashboard data
 */
export interface SummaryDashboard {
  total_agent_cost_usd: number;
  total_human_cost_estimate_usd: number;
  total_savings_usd: number;
  total_savings_percentage: number;
  workstream_count: number;
  average_cost_per_workstream_usd: number;
  total_estimated_human_hours: number;
  date_range?: {
    from: string;
    to: string;
  };
}

/**
 * Placeholder imports (to be implemented in src/audit/reporting/roi.ts)
 */
import {
  estimateHumanHours,
  calculateROI,
  enhanceSummaryWithROI,
  generateSummaryDashboard,
  loadROIConfig,
  DEFAULT_ROI_CONFIG,
} from '@/audit/reporting/roi';

// ============================================================================
// MISUSE CASES - Invalid inputs, malformed data, error conditions
// ============================================================================

describe('audit/reporting/roi - MISUSE CASES', () => {
  describe('estimateHumanHours() with invalid inputs', () => {
    it('When total_tokens is negative, Then throws error', () => {
      expect(() => estimateHumanHours(-1000, DEFAULT_ROI_CONFIG))
        .toThrow(/negative.*token/i);
    });

    it('When total_tokens is NaN, Then throws error', () => {
      expect(() => estimateHumanHours(NaN, DEFAULT_ROI_CONFIG))
        .toThrow(/invalid.*token/i);
    });

    it('When total_tokens is Infinity, Then throws error', () => {
      expect(() => estimateHumanHours(Infinity, DEFAULT_ROI_CONFIG))
        .toThrow(/invalid.*token/i);
    });

    it('When config is null, Then throws error', () => {
      expect(() => estimateHumanHours(1000, null as any))
        .toThrow(/invalid.*config/i);
    });

    it('When config is undefined, Then throws error', () => {
      expect(() => estimateHumanHours(1000, undefined as any))
        .toThrow(/invalid.*config/i);
    });

    it('When config.hourly_rate_usd is negative, Then throws error', () => {
      const invalidConfig: ROIConfig = {
        hourly_rate_usd: -50,
        token_to_hour_heuristic: 'linear',
      };

      expect(() => estimateHumanHours(1000, invalidConfig))
        .toThrow(/negative.*rate/i);
    });

    it('When config.hourly_rate_usd is NaN, Then throws error', () => {
      const invalidConfig: ROIConfig = {
        hourly_rate_usd: NaN,
        token_to_hour_heuristic: 'linear',
      };

      expect(() => estimateHumanHours(1000, invalidConfig))
        .toThrow(/invalid.*rate/i);
    });

    it('When config.hourly_rate_usd is Infinity, Then throws error', () => {
      const invalidConfig: ROIConfig = {
        hourly_rate_usd: Infinity,
        token_to_hour_heuristic: 'linear',
      };

      expect(() => estimateHumanHours(1000, invalidConfig))
        .toThrow(/invalid.*rate/i);
    });

    it('When config.token_to_hour_heuristic is invalid, Then throws error', () => {
      const invalidConfig: ROIConfig = {
        hourly_rate_usd: 50,
        token_to_hour_heuristic: 'invalid' as any,
      };

      expect(() => estimateHumanHours(1000, invalidConfig))
        .toThrow(/invalid.*heuristic/i);
    });

    it('When config.token_to_hour_heuristic is empty string, Then throws error', () => {
      const invalidConfig: ROIConfig = {
        hourly_rate_usd: 50,
        token_to_hour_heuristic: '' as any,
      };

      expect(() => estimateHumanHours(1000, invalidConfig))
        .toThrow(/invalid.*heuristic/i);
    });
  });

  describe('calculateROI() with invalid inputs', () => {
    it('When agent_cost_usd is negative, Then throws error', () => {
      expect(() => calculateROI(-10, 5, DEFAULT_ROI_CONFIG))
        .toThrow(/negative.*cost/i);
    });

    it('When agent_cost_usd is NaN, Then throws error', () => {
      expect(() => calculateROI(NaN, 5, DEFAULT_ROI_CONFIG))
        .toThrow(/invalid.*cost/i);
    });

    it('When agent_cost_usd is Infinity, Then throws error', () => {
      expect(() => calculateROI(Infinity, 5, DEFAULT_ROI_CONFIG))
        .toThrow(/invalid.*cost/i);
    });

    it('When estimated_human_hours is negative, Then throws error', () => {
      expect(() => calculateROI(10, -5, DEFAULT_ROI_CONFIG))
        .toThrow(/negative.*hour/i);
    });

    it('When estimated_human_hours is NaN, Then throws error', () => {
      expect(() => calculateROI(10, NaN, DEFAULT_ROI_CONFIG))
        .toThrow(/invalid.*hour/i);
    });

    it('When estimated_human_hours is Infinity, Then throws error', () => {
      expect(() => calculateROI(10, Infinity, DEFAULT_ROI_CONFIG))
        .toThrow(/invalid.*hour/i);
    });
  });

  describe('enhanceSummaryWithROI() with invalid summaries', () => {
    it('When summaries array is null, Then throws error', () => {
      expect(() => enhanceSummaryWithROI(null as any, DEFAULT_ROI_CONFIG))
        .toThrow(/invalid.*summaries/i);
    });

    it('When summaries array is undefined, Then throws error', () => {
      expect(() => enhanceSummaryWithROI(undefined as any, DEFAULT_ROI_CONFIG))
        .toThrow(/invalid.*summaries/i);
    });

    it('When summaries is not an array, Then throws error', () => {
      expect(() => enhanceSummaryWithROI('not-array' as any, DEFAULT_ROI_CONFIG))
        .toThrow(/invalid.*summaries/i);
    });

    it('When summary has negative cost, Then throws error', () => {
      const summaries: WorkstreamSummary[] = [
        {
          workstream_id: 'WS-1',
          request_count: 10,
          total_input_tokens: 1000,
          total_output_tokens: 500,
          total_cost_usd: -10, // invalid
          total_duration_ms: 1000,
          estimated_cost_usd: 10,
          cache_savings_tokens: 0,
        },
      ];

      expect(() => enhanceSummaryWithROI(summaries, DEFAULT_ROI_CONFIG))
        .toThrow(/negative.*cost/i);
    });

    it('When summary has negative tokens, Then throws error', () => {
      const summaries: WorkstreamSummary[] = [
        {
          workstream_id: 'WS-1',
          request_count: 10,
          total_input_tokens: -1000, // invalid
          total_output_tokens: 500,
          total_cost_usd: 10,
          total_duration_ms: 1000,
          estimated_cost_usd: 10,
          cache_savings_tokens: 0,
        },
      ];

      expect(() => enhanceSummaryWithROI(summaries, DEFAULT_ROI_CONFIG))
        .toThrow(/negative.*token/i);
    });
  });

  describe('loadROIConfig() with invalid config files', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'roi-test-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('When config file contains malformed JSON, Then falls back to default', () => {
      const configPath = path.join(tempDir, 'invalid-roi-config.json');
      fs.writeFileSync(configPath, '{ invalid json', 'utf8');

      const result = loadROIConfig(configPath);

      expect(result).toEqual(DEFAULT_ROI_CONFIG);
    });

    it('When config file contains invalid structure, Then falls back to default', () => {
      const invalidConfig = {
        hourly_rate_usd: -50, // negative
        token_to_hour_heuristic: 'linear',
      };

      const configPath = path.join(tempDir, 'invalid-structure-roi.json');
      fs.writeFileSync(configPath, JSON.stringify(invalidConfig), 'utf8');

      const result = loadROIConfig(configPath);

      expect(result).toEqual(DEFAULT_ROI_CONFIG);
    });

    it('When config file path is empty string, Then uses default', () => {
      const result = loadROIConfig('');

      expect(result).toEqual(DEFAULT_ROI_CONFIG);
    });

    it('When config file does not exist, Then uses default', () => {
      const result = loadROIConfig('/nonexistent/path/roi.json');

      expect(result).toEqual(DEFAULT_ROI_CONFIG);
    });

    it('When config path contains .. traversal, Then rejects and uses default', () => {
      const maliciousPath = '/tmp/../../../etc/passwd';
      const result = loadROIConfig(maliciousPath);

      expect(result).toEqual(DEFAULT_ROI_CONFIG);
    });

    it('When config path is not .json, Then rejects and uses default', () => {
      const maliciousPath = '/etc/passwd';
      const result = loadROIConfig(maliciousPath);

      expect(result).toEqual(DEFAULT_ROI_CONFIG);
    });
  });

  describe('generateSummaryDashboard() with invalid inputs', () => {
    it('When summaries with ROI array is null, Then throws error', () => {
      expect(() => generateSummaryDashboard(null as any))
        .toThrow(/invalid.*summaries/i);
    });

    it('When summaries with ROI array is undefined, Then throws error', () => {
      expect(() => generateSummaryDashboard(undefined as any))
        .toThrow(/invalid.*summaries/i);
    });

    it('When summaries is not an array, Then throws error', () => {
      expect(() => generateSummaryDashboard('not-array' as any))
        .toThrow(/invalid.*summaries/i);
    });
  });
});

// ============================================================================
// BOUNDARY TESTS - Edge cases, limits, unusual but valid inputs
// ============================================================================

describe('audit/reporting/roi - BOUNDARY TESTS', () => {
  describe('estimateHumanHours() with edge values', () => {
    it('When total_tokens is zero, Then returns zero hours', () => {
      const hours = estimateHumanHours(0, DEFAULT_ROI_CONFIG);

      expect(hours).toBe(0);
    });

    it('When total_tokens is very small (1), Then returns fractional hours', () => {
      const hours = estimateHumanHours(1, DEFAULT_ROI_CONFIG);

      expect(hours).toBeGreaterThanOrEqual(0);
      expect(hours).toBeLessThan(0.01);
    });

    it('When total_tokens is very large (1 billion), Then handles gracefully', () => {
      const hours = estimateHumanHours(1_000_000_000, DEFAULT_ROI_CONFIG);

      expect(hours).toBeGreaterThan(0);
      expect(hours).toBeLessThan(1_000_000); // reasonable upper bound
    });

    it('When hourly_rate_usd is zero, Then calculates zero human cost', () => {
      const config: ROIConfig = {
        hourly_rate_usd: 0,
        token_to_hour_heuristic: 'linear',
      };

      const hours = estimateHumanHours(100000, config);
      const roi = calculateROI(10, hours, config);

      expect(roi.human_cost_estimate_usd).toBe(0);
    });

    it('When hourly_rate_usd is very high (10000), Then calculates high human cost', () => {
      const config: ROIConfig = {
        hourly_rate_usd: 10000,
        token_to_hour_heuristic: 'linear',
      };

      const hours = estimateHumanHours(100000, config);
      const roi = calculateROI(10, hours, config);

      expect(roi.human_cost_estimate_usd).toBeGreaterThan(100);
    });
  });

  describe('calculateROI() with edge values', () => {
    it('When agent_cost is zero, Then returns 100% savings', () => {
      const roi = calculateROI(0, 10, DEFAULT_ROI_CONFIG);

      expect(roi.savings_percentage).toBe(100);
      expect(roi.savings_usd).toBeGreaterThan(0);
    });

    it('When estimated_human_hours is zero, Then returns negative savings', () => {
      const roi = calculateROI(10, 0, DEFAULT_ROI_CONFIG);

      expect(roi.human_cost_estimate_usd).toBe(0);
      expect(roi.savings_usd).toBe(-10);
      expect(roi.savings_percentage).toBe(-Infinity);
    });

    it('When agent_cost equals human_cost, Then returns 0% savings', () => {
      const config: ROIConfig = {
        hourly_rate_usd: 100,
        token_to_hour_heuristic: 'linear',
      };

      const humanHours = 1; // 1 hour
      const agentCost = 100; // $100

      const roi = calculateROI(agentCost, humanHours, config);

      expect(roi.savings_usd).toBeCloseTo(0, 2);
      expect(roi.savings_percentage).toBeCloseTo(0, 2);
    });

    it('When agent_cost exceeds human_cost, Then returns negative savings', () => {
      const config: ROIConfig = {
        hourly_rate_usd: 50,
        token_to_hour_heuristic: 'linear',
      };

      const humanHours = 1; // 1 hour = $50 human cost
      const agentCost = 100; // $100 agent cost

      const roi = calculateROI(agentCost, humanHours, config);

      expect(roi.savings_usd).toBeLessThan(0);
      expect(roi.savings_percentage).toBeLessThan(0);
    });
  });

  describe('enhanceSummaryWithROI() with edge cases', () => {
    it('When summaries array is empty, Then returns empty array', () => {
      const result = enhanceSummaryWithROI([], DEFAULT_ROI_CONFIG);

      expect(result).toEqual([]);
    });

    it('When summary has zero tokens, Then calculates zero hours', () => {
      const summaries: WorkstreamSummary[] = [
        {
          workstream_id: 'WS-1',
          request_count: 0,
          total_input_tokens: 0,
          total_output_tokens: 0,
          total_cost_usd: 0,
          total_duration_ms: 0,
          estimated_cost_usd: 0,
          cache_savings_tokens: 0,
        },
      ];

      const result = enhanceSummaryWithROI(summaries, DEFAULT_ROI_CONFIG);

      expect(result).toHaveLength(1);
      expect(result[0].roi.estimated_human_hours).toBe(0);
    });

    it('When summary has zero cost, Then shows 100% savings', () => {
      const summaries: WorkstreamSummary[] = [
        {
          workstream_id: 'WS-1',
          request_count: 10,
          total_input_tokens: 1000,
          total_output_tokens: 500,
          total_cost_usd: 0,
          total_duration_ms: 1000,
          estimated_cost_usd: 0,
          cache_savings_tokens: 0,
        },
      ];

      const result = enhanceSummaryWithROI(summaries, DEFAULT_ROI_CONFIG);

      expect(result).toHaveLength(1);
      expect(result[0].roi.savings_percentage).toBe(100);
    });
  });

  describe('generateSummaryDashboard() with edge cases', () => {
    it('When summaries array is empty, Then returns zero values', () => {
      const dashboard = generateSummaryDashboard([]);

      expect(dashboard.total_agent_cost_usd).toBe(0);
      expect(dashboard.total_human_cost_estimate_usd).toBe(0);
      expect(dashboard.total_savings_usd).toBe(0);
      expect(dashboard.workstream_count).toBe(0);
      expect(dashboard.average_cost_per_workstream_usd).toBe(0);
      expect(dashboard.total_estimated_human_hours).toBe(0);
    });

    it('When single workstream, Then average equals total cost', () => {
      const summariesWithROI: WorkstreamSummaryWithROI[] = [
        {
          workstream_id: 'WS-1',
          request_count: 10,
          total_input_tokens: 1000,
          total_output_tokens: 500,
          total_cost_usd: 10,
          total_duration_ms: 1000,
          estimated_cost_usd: 10,
          cache_savings_tokens: 0,
          roi: {
            agent_cost_usd: 10,
            human_cost_estimate_usd: 50,
            savings_usd: 40,
            savings_percentage: 80,
            estimated_human_hours: 1,
          },
        },
      ];

      const dashboard = generateSummaryDashboard(summariesWithROI);

      expect(dashboard.workstream_count).toBe(1);
      expect(dashboard.average_cost_per_workstream_usd).toBe(10);
      expect(dashboard.total_agent_cost_usd).toBe(10);
    });

    it('When all workstreams have zero cost, Then average is zero', () => {
      const summariesWithROI: WorkstreamSummaryWithROI[] = [
        {
          workstream_id: 'WS-1',
          request_count: 0,
          total_input_tokens: 0,
          total_output_tokens: 0,
          total_cost_usd: 0,
          total_duration_ms: 0,
          estimated_cost_usd: 0,
          cache_savings_tokens: 0,
          roi: {
            agent_cost_usd: 0,
            human_cost_estimate_usd: 0,
            savings_usd: 0,
            savings_percentage: 0,
            estimated_human_hours: 0,
          },
        },
        {
          workstream_id: 'WS-2',
          request_count: 0,
          total_input_tokens: 0,
          total_output_tokens: 0,
          total_cost_usd: 0,
          total_duration_ms: 0,
          estimated_cost_usd: 0,
          cache_savings_tokens: 0,
          roi: {
            agent_cost_usd: 0,
            human_cost_estimate_usd: 0,
            savings_usd: 0,
            savings_percentage: 0,
            estimated_human_hours: 0,
          },
        },
      ];

      const dashboard = generateSummaryDashboard(summariesWithROI);

      expect(dashboard.average_cost_per_workstream_usd).toBe(0);
    });
  });
});

// ============================================================================
// GOLDEN PATH - Normal, expected operations
// ============================================================================

describe('audit/reporting/roi - GOLDEN PATH', () => {
  describe('DEFAULT_ROI_CONFIG constant', () => {
    it('When accessed, Then has reasonable default values', () => {
      expect(DEFAULT_ROI_CONFIG).toBeDefined();
      expect(DEFAULT_ROI_CONFIG.hourly_rate_usd).toBeGreaterThan(0);
      expect(DEFAULT_ROI_CONFIG.token_to_hour_heuristic).toBe('linear');
    });

    it('When accessed, Then hourly rate is within reasonable range', () => {
      // Typical developer hourly rate: $50-$200
      expect(DEFAULT_ROI_CONFIG.hourly_rate_usd).toBeGreaterThanOrEqual(50);
      expect(DEFAULT_ROI_CONFIG.hourly_rate_usd).toBeLessThanOrEqual(200);
    });
  });

  describe('estimateHumanHours() with linear heuristic (AC-2)', () => {
    it('When estimating with 10k tokens, Then returns reasonable hours', () => {
      const config: ROIConfig = {
        hourly_rate_usd: 100,
        token_to_hour_heuristic: 'linear',
      };

      const hours = estimateHumanHours(10000, config);

      // Should be some reasonable fraction (e.g., 0.5-2 hours for 10k tokens)
      expect(hours).toBeGreaterThan(0);
      expect(hours).toBeLessThan(10);
    });

    it('When estimating with 100k tokens, Then hours scale linearly', () => {
      const config: ROIConfig = {
        hourly_rate_usd: 100,
        token_to_hour_heuristic: 'linear',
      };

      const hours10k = estimateHumanHours(10000, config);
      const hours100k = estimateHumanHours(100000, config);

      // 100k should be ~10x 10k
      expect(hours100k).toBeCloseTo(hours10k * 10, 1);
    });
  });

  describe('calculateROI() with typical values (AC-3)', () => {
    it('When agent cost is $10 and human hours is 1, Then calculates ROI', () => {
      const config: ROIConfig = {
        hourly_rate_usd: 100,
        token_to_hour_heuristic: 'linear',
      };

      const roi = calculateROI(10, 1, config);

      expect(roi.agent_cost_usd).toBe(10);
      expect(roi.human_cost_estimate_usd).toBe(100);
      expect(roi.savings_usd).toBe(90);
      expect(roi.savings_percentage).toBe(90);
      expect(roi.estimated_human_hours).toBe(1);
    });

    it('When agent cost is $5 and human hours is 0.5, Then calculates correctly', () => {
      const config: ROIConfig = {
        hourly_rate_usd: 100,
        token_to_hour_heuristic: 'linear',
      };

      const roi = calculateROI(5, 0.5, config);

      expect(roi.agent_cost_usd).toBe(5);
      expect(roi.human_cost_estimate_usd).toBe(50);
      expect(roi.savings_usd).toBe(45);
      expect(roi.savings_percentage).toBe(90);
      expect(roi.estimated_human_hours).toBe(0.5);
    });

    it('When savings is negative, Then shows negative percentage', () => {
      const config: ROIConfig = {
        hourly_rate_usd: 50,
        token_to_hour_heuristic: 'linear',
      };

      const roi = calculateROI(100, 1, config); // $100 agent vs $50 human

      expect(roi.savings_usd).toBe(-50);
      expect(roi.savings_percentage).toBeLessThan(0);
    });
  });

  describe('enhanceSummaryWithROI() integration (AC-3)', () => {
    it('When enhancing workstream summaries, Then adds ROI data', () => {
      const summaries: WorkstreamSummary[] = [
        {
          workstream_id: 'WS-1',
          request_count: 10,
          total_input_tokens: 10000,
          total_output_tokens: 5000,
          total_cost_usd: 10.0,
          total_duration_ms: 10000,
          estimated_cost_usd: 10.0,
          cache_savings_tokens: 0,
        },
      ];

      const config: ROIConfig = {
        hourly_rate_usd: 100,
        token_to_hour_heuristic: 'linear',
      };

      const result = enhanceSummaryWithROI(summaries, config);

      expect(result).toHaveLength(1);
      expect(result[0].workstream_id).toBe('WS-1');
      expect(result[0].roi).toBeDefined();
      expect(result[0].roi.agent_cost_usd).toBe(10.0);
      expect(result[0].roi.human_cost_estimate_usd).toBeGreaterThan(0);
      expect(result[0].roi.savings_usd).toBeDefined();
      expect(result[0].roi.savings_percentage).toBeDefined();
      expect(result[0].roi.estimated_human_hours).toBeGreaterThan(0);
    });

    it('When enhancing multiple summaries, Then processes all', () => {
      const summaries: WorkstreamSummary[] = [
        {
          workstream_id: 'WS-1',
          request_count: 10,
          total_input_tokens: 10000,
          total_output_tokens: 5000,
          total_cost_usd: 10.0,
          total_duration_ms: 10000,
          estimated_cost_usd: 10.0,
          cache_savings_tokens: 0,
        },
        {
          workstream_id: 'WS-2',
          request_count: 5,
          total_input_tokens: 5000,
          total_output_tokens: 2500,
          total_cost_usd: 5.0,
          total_duration_ms: 5000,
          estimated_cost_usd: 5.0,
          cache_savings_tokens: 0,
        },
      ];

      const result = enhanceSummaryWithROI(summaries, DEFAULT_ROI_CONFIG);

      expect(result).toHaveLength(2);
      expect(result[0].roi).toBeDefined();
      expect(result[1].roi).toBeDefined();
    });
  });

  describe('generateSummaryDashboard() with typical data (AC-5)', () => {
    it('When generating dashboard from multiple workstreams, Then aggregates totals', () => {
      const summariesWithROI: WorkstreamSummaryWithROI[] = [
        {
          workstream_id: 'WS-1',
          request_count: 10,
          total_input_tokens: 10000,
          total_output_tokens: 5000,
          total_cost_usd: 10.0,
          total_duration_ms: 10000,
          estimated_cost_usd: 10.0,
          cache_savings_tokens: 0,
          roi: {
            agent_cost_usd: 10.0,
            human_cost_estimate_usd: 100.0,
            savings_usd: 90.0,
            savings_percentage: 90.0,
            estimated_human_hours: 1.0,
          },
        },
        {
          workstream_id: 'WS-2',
          request_count: 5,
          total_input_tokens: 5000,
          total_output_tokens: 2500,
          total_cost_usd: 5.0,
          total_duration_ms: 5000,
          estimated_cost_usd: 5.0,
          cache_savings_tokens: 0,
          roi: {
            agent_cost_usd: 5.0,
            human_cost_estimate_usd: 50.0,
            savings_usd: 45.0,
            savings_percentage: 90.0,
            estimated_human_hours: 0.5,
          },
        },
      ];

      const dashboard = generateSummaryDashboard(summariesWithROI);

      expect(dashboard.total_agent_cost_usd).toBe(15.0);
      expect(dashboard.total_human_cost_estimate_usd).toBe(150.0);
      expect(dashboard.total_savings_usd).toBe(135.0);
      expect(dashboard.total_savings_percentage).toBe(90.0);
      expect(dashboard.workstream_count).toBe(2);
      expect(dashboard.average_cost_per_workstream_usd).toBe(7.5);
      expect(dashboard.total_estimated_human_hours).toBe(1.5);
    });

    it('When dashboard includes date range, Then preserves date range', () => {
      const summariesWithROI: WorkstreamSummaryWithROI[] = [
        {
          workstream_id: 'WS-1',
          request_count: 10,
          total_input_tokens: 10000,
          total_output_tokens: 5000,
          total_cost_usd: 10.0,
          total_duration_ms: 10000,
          estimated_cost_usd: 10.0,
          cache_savings_tokens: 0,
          roi: {
            agent_cost_usd: 10.0,
            human_cost_estimate_usd: 100.0,
            savings_usd: 90.0,
            savings_percentage: 90.0,
            estimated_human_hours: 1.0,
          },
        },
      ];

      const dateRange = {
        from: '2026-02-01',
        to: '2026-02-08',
      };

      const dashboard = generateSummaryDashboard(summariesWithROI, dateRange);

      expect(dashboard.date_range).toBeDefined();
      expect(dashboard.date_range?.from).toBe('2026-02-01');
      expect(dashboard.date_range?.to).toBe('2026-02-08');
    });
  });

  describe('loadROIConfig() with valid config', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'roi-test-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('When no config path provided, Then returns default config', () => {
      const result = loadROIConfig();

      expect(result).toEqual(DEFAULT_ROI_CONFIG);
    });

    it('When valid config file exists, Then loads custom config', () => {
      const customConfig: ROIConfig = {
        hourly_rate_usd: 150,
        token_to_hour_heuristic: 'logarithmic',
      };

      const configPath = path.join(tempDir, 'custom-roi.json');
      fs.writeFileSync(configPath, JSON.stringify(customConfig), 'utf8');

      const result = loadROIConfig(configPath);

      expect(result).toEqual(customConfig);
    });

    it('When config has custom heuristic params, Then preserves params', () => {
      const customConfig: ROIConfig = {
        hourly_rate_usd: 120,
        token_to_hour_heuristic: 'custom',
        custom_heuristic_params: {
          scale_factor: 0.0001,
          base_hours: 0.5,
        },
      };

      const configPath = path.join(tempDir, 'custom-heuristic-roi.json');
      fs.writeFileSync(configPath, JSON.stringify(customConfig), 'utf8');

      const result = loadROIConfig(configPath);

      expect(result).toEqual(customConfig);
      expect(result.custom_heuristic_params).toBeDefined();
    });
  });

  describe('ROI calculation precision', () => {
    it('When calculating fractional savings, Then rounds correctly', () => {
      const config: ROIConfig = {
        hourly_rate_usd: 75.50,
        token_to_hour_heuristic: 'linear',
      };

      const roi = calculateROI(10.25, 1.5, config);

      expect(roi.human_cost_estimate_usd).toBeCloseTo(113.25, 2);
      expect(roi.savings_usd).toBeCloseTo(103.00, 2);
    });

    it('When calculating very small costs, Then maintains precision', () => {
      const config: ROIConfig = {
        hourly_rate_usd: 100,
        token_to_hour_heuristic: 'linear',
      };

      const roi = calculateROI(0.01, 0.001, config);

      expect(roi.agent_cost_usd).toBe(0.01);
      expect(roi.human_cost_estimate_usd).toBe(0.10);
      expect(roi.savings_usd).toBeCloseTo(0.09, 2);
    });
  });
});

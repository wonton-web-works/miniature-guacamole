/**
 * WS-TRACKING Phase 2: End-to-End Reporting Tests
 *
 * BDD Scenarios:
 * - TRACK-BDD-5: View workstream summary
 * - TRACK-BDD-6: Filter by date range
 * - TRACK-BDD-7: JSON output for programmatic use
 * - TRACK-BDD-8: Include workstreams with no requests
 * - TRACK-BDD-9: View agent breakdown within workstream
 * - TRACK-BDD-11: Success metrics per agent
 * - All 17 Acceptance Criteria from US-TRACK-2 and US-TRACK-3
 *
 * Target: Full end-to-end workflow coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock imports (will be implemented)
import { runReport } from '@/audit/reporting/cli';
import { loadTrackingConfig } from '@/audit/tracking/config';

describe('audit/reporting E2E - Workstream Summary Report', () => {
  let tempDir: string;
  let auditLogPath: string;

  beforeEach(() => {
    // Create temporary directory for test audit logs
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-test-'));
    auditLogPath = path.join(tempDir, 'audit.log');
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Given sample audit log with multiple workstreams (TRACK-BDD-5)', () => {
    it('When running report, Then shows all workstreams sorted by cost', () => {
      // Create sample audit log
      const entries = [
        {
          timestamp: '2026-02-04T10:00:00.000Z',
          session_id: 'session-1',
          model: 'claude-opus-4-5-20251101',
          input_tokens: 2000,
          output_tokens: 1000,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.030,
          duration_ms: 2000,
          schema_version: '1.0',
          workstream_id: 'WS-19',
          agent_name: 'design-review',
          feature_name: null,
        },
        {
          timestamp: '2026-02-04T11:00:00.000Z',
          session_id: 'session-2',
          model: 'claude-opus-4-5-20251101',
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.015,
          duration_ms: 1000,
          schema_version: '1.0',
          workstream_id: 'WS-18',
          agent_name: 'code-review',
          feature_name: null,
        },
        {
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
          workstream_id: 'WS-21',
          agent_name: 'qa',
          feature_name: null,
        },
      ];

      const logContent = entries.map(e => JSON.stringify(e)).join('\n');
      fs.writeFileSync(auditLogPath, logContent);

      const result = runReport({
          byWorkstream: true,
          format: 'table',
          auditLogPath,
        });
        //
        // AC-2.8: Sorted by cost descending
        const lines = result.split('\n');
        const ws19Line = lines.find(l => l.includes('WS-19'));
        const ws18Line = lines.find(l => l.includes('WS-18'));
        const ws21Line = lines.find(l => l.includes('WS-21'));
        //
        const ws19Index = lines.indexOf(ws19Line!);
        const ws18Index = lines.indexOf(ws18Line!);
        const ws21Index = lines.indexOf(ws21Line!);
        //
        expect(ws19Index).toBeLessThan(ws18Index);
        expect(ws18Index).toBeLessThan(ws21Index);
        //
        // AC-2.9: Total row at bottom
        expect(result).toContain('TOTAL');
        const totalLine = lines.find(l => l.includes('TOTAL'));
        expect(totalLine).toContain('0.055'); // 0.030 + 0.015 + 0.010
    });

    it('When running report as JSON, Then produces parseable JSON (TRACK-BDD-7)', () => {
      const entries = [
        {
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
          agent_name: 'code-review',
          feature_name: null,
        },
      ];

      const logContent = entries.map(e => JSON.stringify(e)).join('\n');
      fs.writeFileSync(auditLogPath, logContent);

      const result = runReport({
          byWorkstream: true,
          format: 'json',
          auditLogPath,
        });
        //
        // AC-2.6: Valid JSON output
        const parsed = JSON.parse(result);
        expect(Array.isArray(parsed)).toBe(true);
        //
        // AC-2.2: Required fields
        expect(parsed[0]).toHaveProperty('workstream_id');
        expect(parsed[0]).toHaveProperty('request_count');
        expect(parsed[0]).toHaveProperty('total_input_tokens');
        expect(parsed[0]).toHaveProperty('total_output_tokens');
        expect(parsed[0]).toHaveProperty('total_cost_usd');
        //
        expect(parsed[0].workstream_id).toBe('WS-18');
        expect(parsed[0].request_count).toBe(1);
        expect(parsed[0].total_input_tokens).toBe(1000);
        expect(parsed[0].total_output_tokens).toBe(500);
        expect(parsed[0].total_cost_usd).toBe(0.015);
    });
  });

  describe('Given audit log spanning multiple months (TRACK-BDD-6)', () => {
    it('When filtering by date range, Then includes only entries in range', () => {
      const entries = [
        {
          timestamp: '2026-01-01T10:00:00.000Z', // January
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
          agent_name: 'code-review',
          feature_name: null,
        },
        {
          timestamp: '2026-02-01T10:00:00.000Z', // February
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
        },
        {
          timestamp: '2026-02-04T10:00:00.000Z', // February
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
          agent_name: 'design-review',
          feature_name: null,
        },
      ];

      const logContent = entries.map(e => JSON.stringify(e)).join('\n');
      fs.writeFileSync(auditLogPath, logContent);

      // AC-2.5: Date range configurable
        const result = runReport({
          byWorkstream: true,
          format: 'json',
          from: '2026-02-01',
          to: '2026-02-04',
          auditLogPath,
        });
        //
        const parsed = JSON.parse(result);
        //
        // Should include WS-18 and WS-19 (Feb entries)
        const ws18 = parsed.find((r: any) => r.workstream_id === 'WS-18');
        const ws19 = parsed.find((r: any) => r.workstream_id === 'WS-19');
        //
        // AC-2.3: Request count
        expect(ws18.request_count).toBe(2); // Feb 1 and Feb 4 entries for WS-18
        expect(ws19.request_count).toBe(1);
        //
        // Total cost should be Feb entries only (0.030 + 0.010 = 0.040)
        const totalCost = parsed.reduce((sum: number, r: any) => sum + r.total_cost_usd, 0);
        expect(totalCost).toBeCloseTo(0.040, 3);
    });

    it('When no date range specified, Then defaults to last 30 days (AC-2.4)', () => {
      const now = new Date('2026-02-05T00:00:00.000Z');
      const thirtyOneDaysAgo = new Date('2026-01-05T00:00:00.000Z');
      const twentyDaysAgo = new Date('2026-01-16T00:00:00.000Z');

      const entries = [
        {
          timestamp: thirtyOneDaysAgo.toISOString(), // 31 days ago - excluded
          session_id: 'session-old',
          model: 'claude-opus-4-5-20251101',
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.015,
          duration_ms: 1000,
          schema_version: '1.0',
          workstream_id: 'WS-18',
          agent_name: 'code-review',
          feature_name: null,
        },
        {
          timestamp: twentyDaysAgo.toISOString(), // 20 days ago - included
          session_id: 'session-recent',
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
        },
      ];

      const logContent = entries.map(e => JSON.stringify(e)).join('\n');
      fs.writeFileSync(auditLogPath, logContent);

      const result = runReport({
          byWorkstream: true,
          format: 'json',
          auditLogPath,
          currentDate: now, // Mock current date
        });
        //
        const parsed = JSON.parse(result);
        const ws18 = parsed.find((r: any) => r.workstream_id === 'WS-18');
        //
        // Should only include recent entry
        expect(ws18.request_count).toBe(1);
        expect(ws18.total_cost_usd).toBe(0.030);
    });
  });

  describe('Given config with known workstreams (TRACK-BDD-8)', () => {
    it('When running report, Then includes zero-usage workstreams (AC-2.7)', () => {
      // Only WS-18 has actual usage
      const entries = [
        {
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
          agent_name: 'code-review',
          feature_name: null,
        },
      ];

      const logContent = entries.map(e => JSON.stringify(e)).join('\n');
      fs.writeFileSync(auditLogPath, logContent);

      // Mock config with known workstreams
      const configPath = path.join(tempDir, '.clauderc');
      const config = {
        tracking: {
          known_workstreams: ['WS-18', 'WS-19', 'WS-20', 'WS-21'],
        },
      };
      fs.writeFileSync(configPath, JSON.stringify(config));

      const result = runReport({
          byWorkstream: true,
          format: 'json',
          auditLogPath,
          configPath,
        });
        //
        const parsed = JSON.parse(result);
        //
        // Should include all 4 workstreams
        expect(parsed).toHaveLength(4);
        //
        const ws18 = parsed.find((r: any) => r.workstream_id === 'WS-18');
        const ws19 = parsed.find((r: any) => r.workstream_id === 'WS-19');
        const ws20 = parsed.find((r: any) => r.workstream_id === 'WS-20');
        const ws21 = parsed.find((r: any) => r.workstream_id === 'WS-21');
        //
        expect(ws18.request_count).toBe(1);
        expect(ws18.total_cost_usd).toBe(0.015);
        //
        // Zero usage workstreams
        expect(ws19.request_count).toBe(0);
        expect(ws19.total_cost_usd).toBe(0);
        expect(ws20.request_count).toBe(0);
        expect(ws20.total_cost_usd).toBe(0);
        expect(ws21.request_count).toBe(0);
        expect(ws21.total_cost_usd).toBe(0);
    });
  });

  describe('Given backward compatibility with non-tracked entries', () => {
    it('When log contains null workstream_id, Then handles gracefully', () => {
      const entries = [
        {
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
          agent_name: 'code-review',
          feature_name: null,
        },
        {
          timestamp: '2026-02-04T11:00:00.000Z',
          session_id: 'session-2',
          model: 'claude-opus-4-5-20251101',
          input_tokens: 2000,
          output_tokens: 1000,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.030,
          duration_ms: 2000,
          No tracking fields (old format)
        },
      ];

      const logContent = entries.map(e => JSON.stringify(e)).join('\n');
      fs.writeFileSync(auditLogPath, logContent);

      const result = runReport({
          byWorkstream: true,
          format: 'json',
          auditLogPath,
        });
        //
        const parsed = JSON.parse(result);
        //
        // Should have WS-18 and null workstream
        const ws18 = parsed.find((r: any) => r.workstream_id === 'WS-18');
        const nullWs = parsed.find((r: any) => r.workstream_id === null || r.workstream_id === 'UNTRACKED');
        //
        expect(ws18).toBeDefined();
        expect(ws18.request_count).toBe(1);
        //
        expect(nullWs).toBeDefined();
        expect(nullWs.request_count).toBe(1);
        expect(nullWs.total_cost_usd).toBe(0.030);
    });
  });
});

describe('audit/reporting E2E - Agent Breakdown Report', () => {
  let tempDir: string;
  let auditLogPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-test-'));
    auditLogPath = path.join(tempDir, 'audit.log');
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Given WS-18 with multiple agents (TRACK-BDD-9)', () => {
    it('When running agent report, Then shows breakdown by agent (AC-3.1, AC-3.2)', () => {
      const entries = [
        {
          timestamp: '2026-02-04T10:00:00.000Z',
          session_id: 'session-1',
          model: 'claude-opus-4-5-20251101',
          input_tokens: 3000,
          output_tokens: 2000,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.025,
          duration_ms: 2000,
          schema_version: '1.0',
          workstream_id: 'WS-18',
          agent_name: 'code-review',
          feature_name: null,
        },
        {
          timestamp: '2026-02-04T11:00:00.000Z',
          session_id: 'session-2',
          model: 'claude-opus-4-5-20251101',
          input_tokens: 1500,
          output_tokens: 1000,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.012,
          duration_ms: 1500,
          schema_version: '1.0',
          workstream_id: 'WS-18',
          agent_name: 'qa',
          feature_name: null,
        },
        {
          timestamp: '2026-02-04T12:00:00.000Z',
          session_id: 'session-3',
          model: 'claude-opus-4-5-20251101',
          input_tokens: 800,
          output_tokens: 400,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.005,
          duration_ms: 800,
          schema_version: '1.0',
          workstream_id: 'WS-18',
          agent_name: 'design-review',
          feature_name: null,
        },
      ];

      const logContent = entries.map(e => JSON.stringify(e)).join('\n');
      fs.writeFileSync(auditLogPath, logContent);

      const result = runReport({
          byAgent: true,
          format: 'json',
          auditLogPath,
        });
        //
        const parsed = JSON.parse(result);
        //
        // AC-3.4: Agents grouped within workstreams
        expect(parsed).toHaveLength(3);
        //
        const codeReview = parsed.find((r: any) => r.agent_name === 'code-review');
        const qa = parsed.find((r: any) => r.agent_name === 'qa');
        const designReview = parsed.find((r: any) => r.agent_name === 'design-review');
        //
        expect(codeReview.workstream_id).toBe('WS-18');
        expect(codeReview.total_tokens).toBe(5000); // 3000 + 2000
        expect(codeReview.total_cost_usd).toBe(0.025);
        expect(codeReview.request_count).toBe(1);
        //
        expect(qa.total_tokens).toBe(2500); // 1500 + 1000
        expect(designReview.total_tokens).toBe(1200); // 800 + 400
        //
        // AC-3.8: Sorted by cost descending
        expect(parsed[0].agent_name).toBe('code-review'); // $0.025
        expect(parsed[1].agent_name).toBe('qa'); // $0.012
        expect(parsed[2].agent_name).toBe('design-review'); // $0.005
    });

    it('When filtering by workstream, Then shows only that workstream (AC-3.7)', () => {
      const entries = [
        {
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
          agent_name: 'code-review',
          feature_name: null,
        },
        {
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
          workstream_id: 'WS-19',
          agent_name: 'code-review',
          feature_name: null,
        },
      ];

      const logContent = entries.map(e => JSON.stringify(e)).join('\n');
      fs.writeFileSync(auditLogPath, logContent);

      const result = runReport({
          byAgent: true,
          workstream: 'WS-18',
          format: 'json',
          auditLogPath,
        });
        //
        const parsed = JSON.parse(result);
        //
        // Should only show WS-18 agents
        expect(parsed).toHaveLength(1);
        expect(parsed[0].workstream_id).toBe('WS-18');
        expect(parsed[0].agent_name).toBe('code-review');
        expect(parsed[0].total_cost_usd).toBe(0.015);
    });
  });

  describe('Given agents with success metrics (TRACK-BDD-11)', () => {
    it('When running agent report, Then calculates success rate (AC-3.3, AC-3.5)', () => {
      const entries = [
        {
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
          agent_name: 'code-review',
          feature_name: null,
          success: true, // Merged
        },
        {
          timestamp: '2026-02-04T11:00:00.000Z',
          session_id: 'session-2',
          model: 'claude-opus-4-5-20251101',
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.015,
          duration_ms: 1000,
          schema_version: '1.0',
          workstream_id: 'WS-18',
          agent_name: 'code-review',
          feature_name: null,
          success: true, // Merged
        },
        {
          timestamp: '2026-02-04T12:00:00.000Z',
          session_id: 'session-3',
          model: 'claude-opus-4-5-20251101',
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.015,
          duration_ms: 1000,
          schema_version: '1.0',
          workstream_id: 'WS-18',
          agent_name: 'code-review',
          feature_name: null,
          success: false, // Not merged
        },
      ];

      const logContent = entries.map(e => JSON.stringify(e)).join('\n');
      fs.writeFileSync(auditLogPath, logContent);

      const result = runReport({
          byAgent: true,
          format: 'json',
          auditLogPath,
        });
        //
        const parsed = JSON.parse(result);
        const codeReview = parsed.find((r: any) => r.agent_name === 'code-review');
        //
        expect(codeReview.request_count).toBe(3);
        expect(codeReview.success_count).toBe(2); // 2 merged, 1 not
        expect(codeReview.success_rate).toBeCloseTo(66.67, 1); // 2/3 = 66.67%
    });

    it('When agent has no success data, Then success_rate is null (TRACK-EDGE-3)', () => {
      const entries = [
        {
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
          agent_name: 'design-review',
          feature_name: null,
          No success field (not applicable for design agents)
        },
      ];

      const logContent = entries.map(e => JSON.stringify(e)).join('\n');
      fs.writeFileSync(auditLogPath, logContent);

      const result = runReport({
          byAgent: true,
          format: 'json',
          auditLogPath,
        });
        //
        const parsed = JSON.parse(result);
        const designReview = parsed.find((r: any) => r.agent_name === 'design-review');
        //
        expect(designReview.request_count).toBe(1);
        expect(designReview.success_count).toBeNull();
        expect(designReview.success_rate).toBeNull();
    });

    it('When mixing agents with and without success data, Then handles both', () => {
      const entries = [
        {
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
          agent_name: 'code-review',
          feature_name: null,
          success: true,
        },
        {
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
          agent_name: 'design-review',
          feature_name: null,
          No success field
        },
      ];

      const logContent = entries.map(e => JSON.stringify(e)).join('\n');
      fs.writeFileSync(auditLogPath, logContent);

      const result = runReport({
          byAgent: true,
          format: 'json',
          auditLogPath,
        });
        //
        const parsed = JSON.parse(result);
        //
        const codeReview = parsed.find((r: any) => r.agent_name === 'code-review');
        const designReview = parsed.find((r: any) => r.agent_name === 'design-review');
        //
        expect(codeReview.success_rate).toBe(100);
        expect(designReview.success_rate).toBeNull();
    });
  });
});

describe('audit/reporting E2E - CSV Output', () => {
  let tempDir: string;
  let auditLogPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-test-'));
    auditLogPath = path.join(tempDir, 'audit.log');
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Given CSV format request (AC-2.6, AC-3.6)', () => {
    it('When requesting workstream report as CSV, Then produces valid CSV', () => {
      const entries = [
        {
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
          agent_name: 'code-review',
          feature_name: null,
        },
      ];

      const logContent = entries.map(e => JSON.stringify(e)).join('\n');
      fs.writeFileSync(auditLogPath, logContent);

      const result = runReport({
          byWorkstream: true,
          format: 'csv',
          auditLogPath,
        });
        //
        const lines = result.split('\n');
        expect(lines[0]).toBe('workstream_id,request_count,total_input_tokens,total_output_tokens,total_cost_usd');
        expect(lines[1]).toContain('WS-18');
        expect(lines[1]).toContain('1');
        expect(lines[1]).toContain('1000');
        expect(lines[1]).toContain('500');
        expect(lines[1]).toContain('0.015');
    });

    it('When requesting agent report as CSV, Then includes success metrics', () => {
      const entries = [
        {
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
          agent_name: 'code-review',
          feature_name: null,
          success: true,
        },
      ];

      const logContent = entries.map(e => JSON.stringify(e)).join('\n');
      fs.writeFileSync(auditLogPath, logContent);

      const result = runReport({
          byAgent: true,
          format: 'csv',
          auditLogPath,
        });
        //
        const lines = result.split('\n');
        expect(lines[0]).toContain('workstream_id');
        expect(lines[0]).toContain('agent_name');
        expect(lines[0]).toContain('success_rate');
    });
  });
});

describe('audit/reporting E2E - Error Handling', () => {
  let tempDir: string;
  let auditLogPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-test-'));
    auditLogPath = path.join(tempDir, 'audit.log');
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Given malformed audit log', () => {
    it('When log contains invalid JSON, Then skips and continues', () => {
      const logContent = `
invalid json line
{"timestamp": "2026-02-04T10:00:00.000Z", "session_id": "session-1", "model": "claude-opus-4-5-20251101", "input_tokens": 1000, "output_tokens": 500, "cache_creation_tokens": 0, "cache_read_tokens": 0, "total_cost_usd": 0.015, "duration_ms": 1000, "schema_version": "1.0", "workstream_id": "WS-18", "agent_name": "code-review", "feature_name": null}
another invalid line
      `.trim();

      fs.writeFileSync(auditLogPath, logContent);

      const result = runReport({
          byWorkstream: true,
          format: 'json',
          auditLogPath,
        });
        //
        const parsed = JSON.parse(result);
        expect(parsed).toHaveLength(1);
        expect(parsed[0].workstream_id).toBe('WS-18');
    });
  });

  describe('Given missing audit log', () => {
    it('When log does not exist, Then returns helpful error', () => {
      const nonExistentPath = path.join(tempDir, 'does-not-exist.log');

      runReport({
            byWorkstream: true,
            auditLogPath: nonExistentPath,
          });
        }).toThrow('Audit log not found');
    });
  });
});

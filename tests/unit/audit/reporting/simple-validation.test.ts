/**
 * Simple validation tests to confirm Phase 2 implementation works
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  readAuditLog,
  parseAuditLogLine,
  getDefaultAuditLogPath,
} from '@/audit/reporting/reader';
import {
  aggregateByWorkstream,
  aggregateByAgent,
  filterByDateRange,
} from '@/audit/reporting/aggregation';
import {
  formatWorkstreamSummary,
  formatAgentBreakdown,
} from '@/audit/reporting/formats';
import {
  runReport,
  parseReportArgs,
  validateReportArgs,
} from '@/audit/reporting/cli';

describe('Phase 2: Implementation Validation', () => {
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

  it('Reader: parses valid JSONL lines', () => {
    const line = JSON.stringify({
      timestamp: '2026-02-04T10:00:00.000Z',
      session_id: 'session-1',
      model: 'claude-opus-4-5',
      input_tokens: 1000,
      output_tokens: 500,
      cache_creation_tokens: 0,
      cache_read_tokens: 0,
      total_cost_usd: 0.015,
      duration_ms: 1000,
      workstream_id: 'WS-18',
      agent_name: 'mg-code-review',
    });

    const result = parseAuditLogLine(line);
    expect(result).toBeDefined();
    expect(result!.workstream_id).toBe('WS-18');
  });

  it('Reader: reads audit log from file', () => {
    const entries = [
      {
        timestamp: '2026-02-04T10:00:00.000Z',
        session_id: 'session-1',
        model: 'claude-opus-4-5',
        input_tokens: 1000,
        output_tokens: 500,
        cache_creation_tokens: 0,
        cache_read_tokens: 0,
        total_cost_usd: 0.015,
        duration_ms: 1000,
        workstream_id: 'WS-18',
        agent_name: 'mg-code-review',
      },
    ];

    fs.writeFileSync(auditLogPath, entries.map(e => JSON.stringify(e)).join('\n'));
    const result = readAuditLog(auditLogPath);
    expect(result).toHaveLength(1);
  });

  it('Aggregation: aggregates by workstream', () => {
    const entries = [
      {
        timestamp: '2026-02-04T10:00:00.000Z',
        session_id: 'session-1',
        model: 'claude-opus-4-5',
        input_tokens: 1000,
        output_tokens: 500,
        cache_creation_tokens: 0,
        cache_read_tokens: 0,
        total_cost_usd: 0.015,
        duration_ms: 1000,
        workstream_id: 'WS-18',
      } as any,
    ];

    const result = aggregateByWorkstream(entries);
    expect(result).toHaveLength(1);
    expect(result[0].workstream_id).toBe('WS-18');
    expect(result[0].total_cost_usd).toBe(0.015);
  });

  it('Formats: formats as table', () => {
    const summaries = [
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

    const result = formatWorkstreamSummary(summaries, 'table');
    expect(result).toContain('WS-18');
    expect(result).toContain('workstream_id');
  });

  it('Formats: formats as JSON', () => {
    const summaries = [
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

    const result = formatWorkstreamSummary(summaries, 'json');
    const parsed = JSON.parse(result);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].workstream_id).toBe('WS-18');
  });

  it('CLI: parses arguments correctly', () => {
    const result = parseReportArgs(['report', '--by-workstream', '--format=json']);
    expect(result.byWorkstream).toBe(true);
    expect(result.format).toBe('json');
  });

  it('CLI: validates arguments', () => {
    const result = validateReportArgs({ byWorkstream: true, format: 'table' });
    expect(result.valid).toBe(true);
  });

  it('E2E: full reporting pipeline works', () => {
    const entries = [
      {
        timestamp: '2026-02-04T10:00:00.000Z',
        session_id: 'session-1',
        model: 'claude-opus-4-5',
        input_tokens: 1000,
        output_tokens: 500,
        cache_creation_tokens: 0,
        cache_read_tokens: 0,
        total_cost_usd: 0.015,
        duration_ms: 1000,
        workstream_id: 'WS-18',
        agent_name: 'mg-code-review',
      },
    ];

    fs.writeFileSync(auditLogPath, entries.map(e => JSON.stringify(e)).join('\n'));

    const result = runReport({
      byWorkstream: true,
      format: 'json',
      auditLogPath,
    });

    expect(result).toBeTruthy();
    const parsed = JSON.parse(result);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].workstream_id).toBe('WS-18');
  });
});

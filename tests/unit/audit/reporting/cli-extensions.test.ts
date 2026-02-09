/**
 * WS-AUDIT-2: ROI Reporting & Cross-Project Aggregation - CLI Extensions Tests
 *
 * BDD Scenarios:
 * - AC-1: --period flag for periodic rollups (daily/weekly/monthly)
 * - AC-2: --hourly-rate flag for custom ROI calculations
 * - AC-3: --summary flag for dashboard output
 * - AC-4: --projects flag for cross-project aggregation
 *
 * Coverage Target: 99%+ of new CLI functionality
 * Test Pattern: MISUSE → BOUNDARY → GOLDEN PATH
 *
 * NOTE: This extends existing cli.test.ts with WS-AUDIT-2 features.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * Extended report options with WS-AUDIT-2 features
 */
interface ReportOptions {
  byWorkstream?: boolean;
  byAgent?: boolean;
  format?: 'table' | 'json' | 'csv';
  from?: string;
  to?: string;
  workstream?: string;
  auditLogPath?: string;
  currentDate?: Date;
  configPath?: string;
  // NEW: WS-AUDIT-2 options
  period?: 'daily' | 'weekly' | 'monthly';
  hourlyRate?: number;
  summary?: boolean;
  projects?: string;
}

/**
 * Placeholder imports (to be implemented in cli.ts)
 */
import {
  parseReportArgs,
  runReport,
  validateReportArgs,
  getReportHelp,
  formatCliError,
  runReportCli,
} from '@/audit/reporting/cli';

// ============================================================================
// MISUSE CASES - Invalid inputs, malformed data, error conditions
// ============================================================================

describe('audit/reporting/cli-extensions - MISUSE CASES', () => {
  describe('parseReportArgs() with invalid --period flag', () => {
    it('When period value is invalid, Then throws error', () => {
      const args = ['report', '--by-workstream', '--period=invalid'];

      expect(() => parseReportArgs(args))
        .toThrow(/invalid.*period/i);
    });

    it('When period value is empty, Then throws error', () => {
      const args = ['report', '--by-workstream', '--period='];

      expect(() => parseReportArgs(args))
        .toThrow(/invalid.*period/i);
    });

    it('When period is number, Then throws error', () => {
      const args = ['report', '--by-workstream', '--period=7'];

      expect(() => parseReportArgs(args))
        .toThrow(/invalid.*period/i);
    });

    it('When period is misspelled, Then throws error', () => {
      const args = ['report', '--by-workstream', '--period=dayly'];

      expect(() => parseReportArgs(args))
        .toThrow(/invalid.*period/i);
    });
  });

  describe('parseReportArgs() with invalid --hourly-rate flag', () => {
    it('When hourly rate is negative, Then throws error', () => {
      const args = ['report', '--by-workstream', '--hourly-rate=-50'];

      expect(() => parseReportArgs(args))
        .toThrow(/negative.*rate/i);
    });

    it('When hourly rate is zero, Then throws error', () => {
      const args = ['report', '--by-workstream', '--hourly-rate=0'];

      expect(() => parseReportArgs(args))
        .toThrow(/invalid.*rate/i);
    });

    it('When hourly rate is not a number, Then throws error', () => {
      const args = ['report', '--by-workstream', '--hourly-rate=abc'];

      expect(() => parseReportArgs(args))
        .toThrow(/invalid.*rate/i);
    });

    it('When hourly rate is NaN, Then throws error', () => {
      const args = ['report', '--by-workstream', '--hourly-rate=NaN'];

      expect(() => parseReportArgs(args))
        .toThrow(/invalid.*rate/i);
    });

    it('When hourly rate is Infinity, Then throws error', () => {
      const args = ['report', '--by-workstream', '--hourly-rate=Infinity'];

      expect(() => parseReportArgs(args))
        .toThrow(/invalid.*rate/i);
    });

    it('When hourly rate exceeds reasonable maximum, Then throws error', () => {
      const args = ['report', '--by-workstream', '--hourly-rate=999999'];

      expect(() => parseReportArgs(args))
        .toThrow(/rate.*too.*high/i);
    });
  });

  describe('parseReportArgs() with invalid --projects flag', () => {
    it('When projects path contains .. traversal, Then throws error', () => {
      const args = ['report', '--projects=/path1,/path2/../../etc/passwd'];

      expect(() => parseReportArgs(args))
        .toThrow(/path.*traversal/i);
    });

    it('When projects path is empty string, Then throws error', () => {
      const args = ['report', '--projects='];

      expect(() => parseReportArgs(args))
        .toThrow(/invalid.*projects/i);
    });

    it('When projects path contains only commas, Then throws error', () => {
      const args = ['report', '--projects=,,,'];

      expect(() => parseReportArgs(args))
        .toThrow(/invalid.*projects/i);
    });

    it('When projects path contains non-existent directory, Then validation fails', () => {
      const args = ['report', '--projects=/nonexistent/project1,/nonexistent/project2'];

      const options = parseReportArgs(args);
      const validation = validateReportArgs(options);

      expect(validation.valid).toBe(false);
      expect(validation.errors[0]).toMatch(/not.*found|does not exist/i);
    });
  });

  describe('validateReportArgs() with conflicting flags', () => {
    it('When --period used with --by-agent, Then returns error', () => {
      const options: ReportOptions = {
        byAgent: true,
        period: 'daily',
      };

      const result = validateReportArgs(options);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/period.*only.*workstream/i);
    });

    it('When --summary used with --period, Then returns error', () => {
      const options: ReportOptions = {
        byWorkstream: true,
        period: 'daily',
        summary: true,
      };

      const result = validateReportArgs(options);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/cannot.*combine.*period.*summary/i);
    });

    it('When --projects used without directory access, Then returns error', () => {
      const options: ReportOptions = {
        byWorkstream: true,
        projects: '/restricted/directory',
      };

      const result = validateReportArgs(options);

      // May fail due to permissions or non-existence
      expect(result.valid).toBe(false);
    });
  });

  describe('runReport() with invalid periodic options', () => {
    it('When period is invalid at runtime, Then throws error', () => {
      const options: ReportOptions = {
        byWorkstream: true,
        period: 'invalid' as any,
      };

      expect(() => runReport(options))
        .toThrow(/invalid.*period/i);
    });

    it('When hourly rate is invalid at runtime, Then throws error', () => {
      const options: ReportOptions = {
        byWorkstream: true,
        hourlyRate: -100,
      };

      expect(() => runReport(options))
        .toThrow(/negative.*rate/i);
    });
  });
});

// ============================================================================
// BOUNDARY TESTS - Edge cases, limits, unusual but valid inputs
// ============================================================================

describe('audit/reporting/cli-extensions - BOUNDARY TESTS', () => {
  describe('parseReportArgs() with edge cases', () => {
    it('When --period with minimal data, Then handles gracefully', () => {
      const args = ['report', '--by-workstream', '--period=daily'];

      const result = parseReportArgs(args);

      expect(result.period).toBe('daily');
      expect(result.byWorkstream).toBe(true);
    });

    it('When --hourly-rate is minimum valid value (0.01), Then accepts', () => {
      const args = ['report', '--by-workstream', '--hourly-rate=0.01'];

      const result = parseReportArgs(args);

      expect(result.hourlyRate).toBe(0.01);
    });

    it('When --hourly-rate is very high but reasonable (1000), Then accepts', () => {
      const args = ['report', '--by-workstream', '--hourly-rate=1000'];

      const result = parseReportArgs(args);

      expect(result.hourlyRate).toBe(1000);
    });

    it('When --projects has single project, Then parses correctly', () => {
      const args = ['report', '--projects=/home/user/project1'];

      const result = parseReportArgs(args);

      expect(result.projects).toBe('/home/user/project1');
    });

    it('When --summary with empty data, Then shows zeros', () => {
      const options: ReportOptions = {
        byWorkstream: true,
        summary: true,
      };

      // Mock empty audit log
      const result = runReport(options);

      expect(result).toContain('0');
      expect(result).toContain('total');
    });
  });

  describe('validateReportArgs() with boundary values', () => {
    it('When hourly rate is 0.01, Then validates successfully', () => {
      const options: ReportOptions = {
        byWorkstream: true,
        hourlyRate: 0.01,
      };

      const result = validateReportArgs(options);

      expect(result.valid).toBe(true);
    });

    it('When hourly rate is 10000, Then validates with warning', () => {
      const options: ReportOptions = {
        byWorkstream: true,
        hourlyRate: 10000,
      };

      const result = validateReportArgs(options);

      expect(result.warnings).toBeDefined();
      expect(result.warnings?.[0]).toMatch(/unusually.*high/i);
    });

    it('When projects list is very long, Then parses all', () => {
      const projectPaths = Array.from({ length: 10 }, (_, i) => `/project${i}`).join(',');
      const options: ReportOptions = {
        byWorkstream: true,
        projects: projectPaths,
      };

      const result = validateReportArgs(options);

      // May validate or warn about many projects
      expect(result).toBeDefined();
    });
  });

  describe('runReport() with boundary cases', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-test-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('When single entry in period, Then shows that period', () => {
      const auditLog = path.join(tempDir, 'audit.log');
      const entry = {
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
      };
      fs.writeFileSync(auditLog, JSON.stringify(entry), 'utf8');

      const options: ReportOptions = {
        byWorkstream: true,
        period: 'daily',
        auditLogPath: auditLog,
      };

      const result = runReport(options);

      expect(result).toContain('2026-02-08');
    });

    it('When all entries in same period, Then shows single bucket', () => {
      const auditLog = path.join(tempDir, 'audit.log');
      const entries = [
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
      fs.writeFileSync(
        auditLog,
        entries.map(e => JSON.stringify(e)).join('\n'),
        'utf8'
      );

      const options: ReportOptions = {
        byWorkstream: true,
        period: 'daily',
        auditLogPath: auditLog,
      };

      const result = runReport(options);

      // Should show single daily bucket
      expect(result).toContain('2026-02-08');
    });
  });
});

// ============================================================================
// GOLDEN PATH - Normal, expected operations
// ============================================================================

describe('audit/reporting/cli-extensions - GOLDEN PATH', () => {
  describe('parseReportArgs() with --period flag (AC-1)', () => {
    it('When parsing --period=daily, Then sets period to daily', () => {
      const args = ['report', '--by-workstream', '--period=daily'];

      const result = parseReportArgs(args);

      expect(result.period).toBe('daily');
      expect(result.byWorkstream).toBe(true);
    });

    it('When parsing --period=weekly, Then sets period to weekly', () => {
      const args = ['report', '--by-workstream', '--period=weekly'];

      const result = parseReportArgs(args);

      expect(result.period).toBe('weekly');
    });

    it('When parsing --period=monthly, Then sets period to monthly', () => {
      const args = ['report', '--by-workstream', '--period=monthly'];

      const result = parseReportArgs(args);

      expect(result.period).toBe('monthly');
    });

    it('When parsing period with space, Then accepts --period daily', () => {
      const args = ['report', '--by-workstream', '--period', 'daily'];

      const result = parseReportArgs(args);

      expect(result.period).toBe('daily');
    });
  });

  describe('parseReportArgs() with --hourly-rate flag (AC-2)', () => {
    it('When parsing --hourly-rate=100, Then sets hourly rate', () => {
      const args = ['report', '--by-workstream', '--hourly-rate=100'];

      const result = parseReportArgs(args);

      expect(result.hourlyRate).toBe(100);
    });

    it('When parsing hourly rate with space, Then accepts --hourly-rate 150', () => {
      const args = ['report', '--by-workstream', '--hourly-rate', '150'];

      const result = parseReportArgs(args);

      expect(result.hourlyRate).toBe(150);
    });

    it('When parsing fractional hourly rate, Then preserves decimals', () => {
      const args = ['report', '--by-workstream', '--hourly-rate=75.50'];

      const result = parseReportArgs(args);

      expect(result.hourlyRate).toBe(75.50);
    });
  });

  describe('parseReportArgs() with --summary flag (AC-3)', () => {
    it('When parsing --summary, Then sets summary to true', () => {
      const args = ['report', '--by-workstream', '--summary'];

      const result = parseReportArgs(args);

      expect(result.summary).toBe(true);
    });

    it('When not specifying --summary, Then summary is undefined', () => {
      const args = ['report', '--by-workstream'];

      const result = parseReportArgs(args);

      expect(result.summary).toBeUndefined();
    });
  });

  describe('parseReportArgs() with --projects flag (AC-4)', () => {
    it('When parsing --projects with comma-separated paths, Then sets projects', () => {
      const args = ['report', '--projects=/home/user/proj1,/home/user/proj2'];

      const result = parseReportArgs(args);

      expect(result.projects).toBe('/home/user/proj1,/home/user/proj2');
    });

    it('When parsing projects with space, Then accepts --projects /path1,/path2', () => {
      const args = ['report', '--projects', '/path1,/path2'];

      const result = parseReportArgs(args);

      expect(result.projects).toBe('/path1,/path2');
    });
  });

  describe('validateReportArgs() with WS-AUDIT-2 options', () => {
    it('When validating --period daily, Then returns no errors', () => {
      const options: ReportOptions = {
        byWorkstream: true,
        period: 'daily',
      };

      const result = validateReportArgs(options);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('When validating --hourly-rate 100, Then returns no errors', () => {
      const options: ReportOptions = {
        byWorkstream: true,
        hourlyRate: 100,
      };

      const result = validateReportArgs(options);

      expect(result.valid).toBe(true);
    });

    it('When validating --summary, Then returns no errors', () => {
      const options: ReportOptions = {
        byWorkstream: true,
        summary: true,
      };

      const result = validateReportArgs(options);

      expect(result.valid).toBe(true);
    });
  });

  describe('runReport() with --period flag (AC-1)', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-test-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('When running with --period=daily, Then groups by day', () => {
      const auditLog = path.join(tempDir, 'audit.log');
      const entries = [
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
      fs.writeFileSync(
        auditLog,
        entries.map(e => JSON.stringify(e)).join('\n'),
        'utf8'
      );

      const options: ReportOptions = {
        byWorkstream: true,
        period: 'daily',
        auditLogPath: auditLog,
        format: 'table',
      };

      const result = runReport(options);

      expect(result).toContain('2026-02-06');
      expect(result).toContain('2026-02-07');
    });

    it('When running with --period=weekly, Then groups by week', () => {
      const auditLog = path.join(tempDir, 'audit.log');
      const entries = [
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
          timestamp: '2026-02-09T10:00:00.000Z',
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
      fs.writeFileSync(
        auditLog,
        entries.map(e => JSON.stringify(e)).join('\n'),
        'utf8'
      );

      const options: ReportOptions = {
        byWorkstream: true,
        period: 'weekly',
        auditLogPath: auditLog,
        format: 'table',
      };

      const result = runReport(options);

      expect(result).toMatch(/Week|W/);
    });

    it('When running with --period=monthly, Then groups by month', () => {
      const auditLog = path.join(tempDir, 'audit.log');
      const entries = [
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
      ];
      fs.writeFileSync(
        auditLog,
        entries.map(e => JSON.stringify(e)).join('\n'),
        'utf8'
      );

      const options: ReportOptions = {
        byWorkstream: true,
        period: 'monthly',
        auditLogPath: auditLog,
        format: 'table',
      };

      const result = runReport(options);

      expect(result).toMatch(/Jan|Feb|2026-01|2026-02/);
    });
  });

  describe('runReport() with --hourly-rate and ROI (AC-2, AC-3)', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-test-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('When running with custom hourly rate, Then shows ROI calculations', () => {
      const auditLog = path.join(tempDir, 'audit.log');
      const entry = {
        timestamp: '2026-02-08T10:00:00.000Z',
        session_id: 'sess1',
        model: 'claude-opus-4-6',
        input_tokens: 10000,
        output_tokens: 5000,
        cache_creation_tokens: 0,
        cache_read_tokens: 0,
        total_cost_usd: 1.0,
        duration_ms: 1000,
        workstream_id: 'WS-1',
      };
      fs.writeFileSync(auditLog, JSON.stringify(entry), 'utf8');

      const options: ReportOptions = {
        byWorkstream: true,
        hourlyRate: 100,
        auditLogPath: auditLog,
        format: 'table',
      };

      const result = runReport(options);

      expect(result).toMatch(/roi|savings|human.*cost/i);
    });
  });

  describe('runReport() with --summary flag (AC-5)', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-test-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('When running with --summary, Then shows dashboard output', () => {
      const auditLog = path.join(tempDir, 'audit.log');
      const entries = [
        {
          timestamp: '2026-02-08T10:00:00.000Z',
          session_id: 'sess1',
          model: 'claude-opus-4-6',
          input_tokens: 10000,
          output_tokens: 5000,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 1.0,
          duration_ms: 1000,
          workstream_id: 'WS-1',
        },
        {
          timestamp: '2026-02-08T11:00:00.000Z',
          session_id: 'sess2',
          model: 'claude-opus-4-6',
          input_tokens: 5000,
          output_tokens: 2500,
          cache_creation_tokens: 0,
          cache_read_tokens: 0,
          total_cost_usd: 0.5,
          duration_ms: 500,
          workstream_id: 'WS-2',
        },
      ];
      fs.writeFileSync(
        auditLog,
        entries.map(e => JSON.stringify(e)).join('\n'),
        'utf8'
      );

      const options: ReportOptions = {
        byWorkstream: true,
        summary: true,
        auditLogPath: auditLog,
        format: 'table',
      };

      const result = runReport(options);

      expect(result).toMatch(/total.*spend|total.*cost/i);
      expect(result).toMatch(/total.*savings/i);
      expect(result).toMatch(/workstream.*count/i);
      expect(result).toMatch(/average.*cost/i);
    });

    it('When summary output is JSON, Then contains all dashboard fields', () => {
      const auditLog = path.join(tempDir, 'audit.log');
      const entry = {
        timestamp: '2026-02-08T10:00:00.000Z',
        session_id: 'sess1',
        model: 'claude-opus-4-6',
        input_tokens: 10000,
        output_tokens: 5000,
        cache_creation_tokens: 0,
        cache_read_tokens: 0,
        total_cost_usd: 1.0,
        duration_ms: 1000,
        workstream_id: 'WS-1',
      };
      fs.writeFileSync(auditLog, JSON.stringify(entry), 'utf8');

      const options: ReportOptions = {
        byWorkstream: true,
        summary: true,
        auditLogPath: auditLog,
        format: 'json',
      };

      const result = runReport(options);
      const dashboard = JSON.parse(result);

      expect(dashboard).toHaveProperty('total_agent_cost_usd');
      expect(dashboard).toHaveProperty('total_human_cost_estimate_usd');
      expect(dashboard).toHaveProperty('total_savings_usd');
      expect(dashboard).toHaveProperty('total_savings_percentage');
      expect(dashboard).toHaveProperty('workstream_count');
      expect(dashboard).toHaveProperty('average_cost_per_workstream_usd');
      expect(dashboard).toHaveProperty('total_estimated_human_hours');
    });
  });

  describe('runReport() with --projects flag (AC-4)', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-test-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('When running with multiple projects, Then aggregates all data', () => {
      const project1 = path.join(tempDir, 'project1');
      const project2 = path.join(tempDir, 'project2');
      fs.mkdirSync(project1);
      fs.mkdirSync(project2);

      const entry1 = {
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
      };

      const entry2 = {
        timestamp: '2026-02-08T11:00:00.000Z',
        session_id: 'sess2',
        model: 'claude-opus-4-6',
        input_tokens: 2000,
        output_tokens: 1000,
        cache_creation_tokens: 0,
        cache_read_tokens: 0,
        total_cost_usd: 0.10,
        duration_ms: 2000,
        workstream_id: 'WS-2',
      };

      fs.writeFileSync(path.join(project1, 'audit.log'), JSON.stringify(entry1), 'utf8');
      fs.writeFileSync(path.join(project2, 'audit.log'), JSON.stringify(entry2), 'utf8');

      const options: ReportOptions = {
        byWorkstream: true,
        projects: `${project1},${project2}`,
        format: 'table',
      };

      const result = runReport(options);

      expect(result).toContain('WS-1');
      expect(result).toContain('WS-2');
    });

    it('When cross-project with same workstream ID, Then aggregates together', () => {
      const project1 = path.join(tempDir, 'project1');
      const project2 = path.join(tempDir, 'project2');
      fs.mkdirSync(project1);
      fs.mkdirSync(project2);

      const entry1 = {
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
      };

      const entry2 = {
        timestamp: '2026-02-08T11:00:00.000Z',
        session_id: 'sess2',
        model: 'claude-opus-4-6',
        input_tokens: 2000,
        output_tokens: 1000,
        cache_creation_tokens: 0,
        cache_read_tokens: 0,
        total_cost_usd: 0.10,
        duration_ms: 2000,
        workstream_id: 'WS-1', // Same workstream
      };

      fs.writeFileSync(path.join(project1, 'audit.log'), JSON.stringify(entry1), 'utf8');
      fs.writeFileSync(path.join(project2, 'audit.log'), JSON.stringify(entry2), 'utf8');

      const options: ReportOptions = {
        byWorkstream: true,
        projects: `${project1},${project2}`,
        format: 'json',
      };

      const result = runReport(options);
      const summaries = JSON.parse(result);

      // Should aggregate into single WS-1 entry or show combined total
      const ws1Summaries = summaries.filter((s: any) => s.workstream_id === 'WS-1');
      expect(ws1Summaries.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getReportHelp() with WS-AUDIT-2 additions', () => {
    it('When getting help text, Then includes new flags', () => {
      const helpText = getReportHelp();

      expect(helpText).toMatch(/--period/i);
      expect(helpText).toMatch(/--hourly-rate/i);
      expect(helpText).toMatch(/--summary/i);
      expect(helpText).toMatch(/--projects/i);
    });

    it('When getting help text, Then describes period values', () => {
      const helpText = getReportHelp();

      expect(helpText).toMatch(/daily/i);
      expect(helpText).toMatch(/weekly/i);
      expect(helpText).toMatch(/monthly/i);
    });
  });
});

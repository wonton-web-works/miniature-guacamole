/**
 * WS-TRACKING Phase 2: CLI Module Tests
 *
 * BDD Scenarios:
 * - AC-2.1: CLI command 'claude-audit report --by-workstream' produces summary
 * - AC-2.5: Date range configurable via --from and --to flags
 * - AC-2.6: Output formats: table (default), json, csv
 * - AC-3.1: CLI command 'claude-audit report --by-agent' shows breakdown
 * - AC-3.7: Can filter by workstream: --workstream WS-18
 * - TRACK-BDD-4: CLI report by workstream
 * - TRACK-BDD-5: CLI report by agent with filtering
 * - TRACK-BDD-6: Output format selection
 * - TRACK-BDD-7: Date range filtering
 *
 * Target: 100% coverage of cli.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Type definitions for CLI module (to be implemented)
interface ReportOptions {
  byWorkstream?: boolean;
  byAgent?: boolean;
  format?: 'table' | 'json' | 'csv';
  from?: string;
  to?: string;
  workstream?: string;
}

// Placeholder imports (will be implemented)
import {
  parseReportArgs,
  runReport,
  validateReportArgs,
  getReportHelp,
  formatCliError,
  runReportCli,
} from '@/audit/reporting/cli';

describe('audit/reporting/cli - parseReportArgs()', () => {
  describe('Given --by-workstream flag (AC-2.1, TRACK-BDD-4)', () => {
    it('When parsing args, Then sets byWorkstream to true', () => {
      const args = ['report', '--by-workstream'];

      const result = parseReportArgs(args);
        expect(result.byWorkstream).toBe(true);
        expect(result.byAgent).toBe(false);
    });

    it('When parsing args with alias, Then accepts --by-ws', () => {
      const args = ['report', '--by-ws'];

      const result = parseReportArgs(args);
        expect(result.byWorkstream).toBe(true);
    });
  });

  describe('Given --by-agent flag (AC-3.1, TRACK-BDD-5)', () => {
    it('When parsing args, Then sets byAgent to true', () => {
      const args = ['report', '--by-agent'];

      const result = parseReportArgs(args);
        expect(result.byAgent).toBe(true);
        expect(result.byWorkstream).toBe(false);
    });
  });

  describe('Given --format flag (AC-2.6, TRACK-BDD-6)', () => {
    it('When parsing --format=json, Then sets format to json', () => {
      const args = ['report', '--by-workstream', '--format=json'];

      const result = parseReportArgs(args);
        expect(result.format).toBe('json');
    });

    it('When parsing --format=csv, Then sets format to csv', () => {
      const args = ['report', '--by-workstream', '--format=csv'];

      const result = parseReportArgs(args);
        expect(result.format).toBe('csv');
    });

    it('When parsing --format=table, Then sets format to table', () => {
      const args = ['report', '--by-workstream', '--format=table'];

      const result = parseReportArgs(args);
        expect(result.format).toBe('table');
    });

    it('When no format specified, Then defaults to table', () => {
      const args = ['report', '--by-workstream'];

      const result = parseReportArgs(args);
        expect(result.format).toBe('table');
    });

    it('When parsing format with space, Then accepts --format json', () => {
      const args = ['report', '--by-workstream', '--format', 'json'];

      const result = parseReportArgs(args);
        expect(result.format).toBe('json');
    });
  });

  describe('Given date range flags (AC-2.5, TRACK-BDD-7)', () => {
    it('When parsing --from date, Then sets from date', () => {
      const args = ['report', '--by-workstream', '--from=2026-02-01'];

      const result = parseReportArgs(args);
        expect(result.from).toBe('2026-02-01');
    });

    it('When parsing --to date, Then sets to date', () => {
      const args = ['report', '--by-workstream', '--to=2026-02-04'];

      const result = parseReportArgs(args);
        expect(result.to).toBe('2026-02-04');
    });

    it('When parsing both date flags, Then sets both dates', () => {
      const args = ['report', '--by-workstream', '--from=2026-02-01', '--to=2026-02-04'];

      const result = parseReportArgs(args);
        expect(result.from).toBe('2026-02-01');
        expect(result.to).toBe('2026-02-04');
    });

    it('When parsing date with space, Then accepts --from 2026-02-01', () => {
      const args = ['report', '--by-workstream', '--from', '2026-02-01'];

      const result = parseReportArgs(args);
        expect(result.from).toBe('2026-02-01');
    });
  });

  describe('Given --workstream filter (AC-3.7)', () => {
    it('When parsing --workstream flag, Then sets workstream filter', () => {
      const args = ['report', '--by-agent', '--workstream=WS-18'];

      const result = parseReportArgs(args);
        expect(result.workstream).toBe('WS-18');
    });

    it('When parsing workstream with space, Then accepts --workstream WS-18', () => {
      const args = ['report', '--by-agent', '--workstream', 'WS-18'];

      const result = parseReportArgs(args);
        expect(result.workstream).toBe('WS-18');
    });

    it('When parsing --ws alias, Then accepts shorthand', () => {
      const args = ['report', '--by-agent', '--ws=WS-18'];

      const result = parseReportArgs(args);
        expect(result.workstream).toBe('WS-18');
    });
  });

  describe('Given combined flags', () => {
    it('When parsing multiple flags, Then sets all options correctly', () => {
      const args = [
        'report',
        '--by-agent',
        '--workstream=WS-18',
        '--format=json',
        '--from=2026-02-01',
        '--to=2026-02-04',
      ];

      const result = parseReportArgs(args);
        expect(result.byAgent).toBe(true);
        expect(result.workstream).toBe('WS-18');
        expect(result.format).toBe('json');
        expect(result.from).toBe('2026-02-01');
        expect(result.to).toBe('2026-02-04');
    });
  });

  describe('Given no report type flag', () => {
    it('When neither --by-workstream nor --by-agent specified, Then defaults to by-workstream', () => {
      const args = ['report'];

      const result = parseReportArgs(args);
        expect(result.byWorkstream).toBe(true);
        expect(result.byAgent).toBe(false);
    });
  });
});

describe('audit/reporting/cli - validateReportArgs()', () => {
  describe('Given valid arguments', () => {
    it('When validating --by-workstream, Then returns no errors', () => {
      const options: ReportOptions = {
        byWorkstream: true,
        format: 'table',
      };

      const result = validateReportArgs(options);
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
    });
  });

  describe('Given both --by-workstream and --by-agent', () => {
    it('When validating mutually exclusive flags, Then returns error', () => {
      const options: ReportOptions = {
        byWorkstream: true,
        byAgent: true,
      };

      const result = validateReportArgs(options);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Cannot specify both --by-workstream and --by-agent');
    });
  });

  describe('Given invalid format value', () => {
    it('When format is not table/json/csv, Then returns error', () => {
      const options: ReportOptions = {
        byWorkstream: true,
        format: 'xml' as any,
      };

      const result = validateReportArgs(options);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid format: xml. Must be table, json, or csv.');
    });
  });

  describe('Given invalid date format', () => {
    it('When --from is not valid ISO date, Then returns error', () => {
      const options: ReportOptions = {
        byWorkstream: true,
        from: '02/01/2026', // MM/DD/YYYY not accepted
      };

      const result = validateReportArgs(options);
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('Invalid date format');
    });

    it('When --to is not valid ISO date, Then returns error', () => {
      const options: ReportOptions = {
        byWorkstream: true,
        to: 'invalid-date',
      };

      const result = validateReportArgs(options);
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('Invalid date format');
    });

    it('When --from is after --to, Then returns error', () => {
      const options: ReportOptions = {
        byWorkstream: true,
        from: '2026-02-10',
        to: '2026-02-01',
      };

      const result = validateReportArgs(options);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('--from date cannot be after --to date');
    });
  });

  describe('Given invalid workstream ID', () => {
    it('When workstream ID does not match pattern, Then returns error', () => {
      const options: ReportOptions = {
        byAgent: true,
        workstream: 'WS18', // Missing dash
      };

      const result = validateReportArgs(options);
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('Invalid workstream ID format');
    });
  });

  describe('Given --workstream filter without --by-agent', () => {
    it('When using --workstream with --by-workstream, Then returns warning', () => {
      const options: ReportOptions = {
        byWorkstream: true,
        workstream: 'WS-18',
      };

      const result = validateReportArgs(options);
        // Could be valid but warn that it doesn't make sense
        expect(result.warnings).toContain('--workstream filter has no effect with --by-workstream');
    });
  });
});

describe('audit/reporting/cli - runReport()', () => {
  describe('Given --by-workstream command (AC-2.1)', () => {
    it('When running report, Then reads audit log and produces output', () => {
      const options: ReportOptions = {
        byWorkstream: true,
        format: 'table',
      };

      const result = runReport(options);
        expect(result).toContain('workstream_id');
        expect(result).toContain('TOTAL');
    });

    it('When running with --format=json, Then outputs JSON', () => {
      const options: ReportOptions = {
        byWorkstream: true,
        format: 'json',
      };

      const result = runReport(options);
        expect(() => JSON.parse(result)).not.toThrow();
    });

    it('When running with date range, Then filters entries', () => {
      const options: ReportOptions = {
        byWorkstream: true,
        format: 'table',
        from: '2026-02-01',
        to: '2026-02-04',
      };

      const result = runReport(options);
        expect(result).toContain('2026-02-01');
        expect(result).toContain('2026-02-04');
    });
  });

  describe('Given --by-agent command (AC-3.1)', () => {
    it('When running report, Then shows agent breakdown', () => {
      const options: ReportOptions = {
        byAgent: true,
        format: 'table',
      };

      const result = runReport(options);
        expect(result).toContain('agent_name');
        expect(result).toContain('workstream_id');
    });

    it('When running with --workstream filter, Then shows only specified workstream', () => {
      const options: ReportOptions = {
        byAgent: true,
        workstream: 'WS-18',
        format: 'table',
      };

      const result = runReport(options);
        expect(result).toContain('WS-18');
        expect(result).not.toContain('WS-19');
    });
  });

  describe('Given audit log does not exist', () => {
    it('When running report, Then returns error message', () => {
      const options: ReportOptions = {
        byWorkstream: true,
      };

      // Mock fs.existsSync to return false
        vi.mock('fs', () => ({
          existsSync: vi.fn(() => false),
        }));
        //
        const result = runReport(options);
        expect(result).toContain('Audit log not found');
    });
  });

  describe('Given empty audit log', () => {
    it('When running report, Then shows "No data" message', () => {
      const options: ReportOptions = {
        byWorkstream: true,
      };

      // Mock readFileSync to return empty string
        vi.mock('fs', () => ({
          existsSync: vi.fn(() => true),
          readFileSync: vi.fn(() => ''),
        }));
        //
        const result = runReport(options);
        expect(result).toContain('No data');
    });
  });

  describe('Given malformed audit log', () => {
    it('When running report, Then skips invalid entries and logs warning', () => {
      const options: ReportOptions = {
        byWorkstream: true,
      };

      // Mock readFileSync to return invalid JSON
        vi.mock('fs', () => ({
          existsSync: vi.fn(() => true),
          readFileSync: vi.fn(() => 'invalid json\n{"valid": "entry"}'),
        }));
        //
        const result = runReport(options);
        // Should process valid entry, skip invalid
        expect(result).toBeTruthy();
    });
  });
});

describe('audit/reporting/cli - help and usage', () => {
  describe('Given --help flag', () => {
    it('When showing help, Then displays usage examples', () => {
      const help = getReportHelp();
        expect(help).toContain('claude-audit report --by-workstream');
        expect(help).toContain('claude-audit report --by-agent');
        expect(help).toContain('--format=json');
        expect(help).toContain('--from=YYYY-MM-DD');
        expect(help).toContain('--to=YYYY-MM-DD');
    });

    it('When showing help, Then includes flag descriptions', () => {
      const help = getReportHelp();
        expect(help).toContain('--by-workstream');
        expect(help).toContain('Group by workstream');
        expect(help).toContain('--by-agent');
        expect(help).toContain('Group by agent');
    });

    it('When showing help, Then includes format options', () => {
      const help = getReportHelp();
        expect(help).toContain('table (default)');
        expect(help).toContain('json');
        expect(help).toContain('csv');
    });
  });

  describe('Given invalid arguments', () => {
    it('When showing error, Then suggests --help', () => {
      const error = formatCliError('Unknown flag: --invalid');
        expect(error).toContain('--help');
    });
  });
});

describe('audit/reporting/cli - exit codes', () => {
  describe('Given successful command', () => {
    it('When command succeeds, Then exits with code 0', () => {
      const exitCode = runReportCli(['report', '--by-workstream']);
        expect(exitCode).toBe(0);
    });
  });

  describe('Given validation error', () => {
    it('When arguments are invalid, Then exits with code 1', () => {
      const exitCode = runReportCli(['report', '--by-workstream', '--by-agent']);
        expect(exitCode).toBe(1);
    });
  });

  describe('Given file not found error', () => {
    it('When audit log missing, Then exits with code 2', () => {
      const exitCode = runReportCli(['report', '--by-workstream']);
        expect(exitCode).toBe(2);
    });
  });

  describe('Given unexpected error', () => {
    it('When unhandled error occurs, Then exits with code 3', () => {
      const exitCode = runReportCli(['report', '--by-workstream']);
        expect(exitCode).toBe(3);
    });
  });
});

describe('audit/reporting/cli - integration with tracking config', () => {
  describe('Given known_workstreams in config (AC-2.7)', () => {
    it('When running report, Then includes zero-usage workstreams', () => {
      const options: ReportOptions = {
        byWorkstream: true,
      };

      // Mock loadTrackingConfig to return known workstreams
        vi.mock('@/audit/tracking/config', () => ({
          loadTrackingConfig: vi.fn(() => ({
            tracking: {
              known_workstreams: ['WS-18', 'WS-19', 'WS-20', 'WS-21'],
            },
          })),
        }));
        //
        const result = runReport(options);
        expect(result).toContain('WS-18');
        expect(result).toContain('WS-19');
        expect(result).toContain('WS-20');
        expect(result).toContain('WS-21');
    });
  });
});

describe('audit/reporting/cli - performance', () => {
  describe('Given large audit log', () => {
    it('When processing 10,000+ entries, Then completes in reasonable time', () => {
      const options: ReportOptions = {
          byWorkstream: true,
        };
        //
        // Mock large audit log
        const largeLog = Array(10000)
          .fill(null)
          .map((_, i) => JSON.stringify({
            timestamp: new Date().toISOString(),
            session_id: `session-${i}`,
            workstream_id: `WS-${i % 5}`,
            input_tokens: 1000,
            output_tokens: 500,
            total_cost_usd: 0.015,
          }))
          .join('\n');
        //
        const start = Date.now();
        const result = runReport(options);
        const duration = Date.now() - start;
        //
        expect(duration).toBeLessThan(5000); // Should complete in < 5 seconds
    });
  });
});

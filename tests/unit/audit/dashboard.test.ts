/**
 * GH-82: Dashboard Triage Stats - Tests
 *
 * BDD Scenarios:
 * - readTriageLog: file missing, empty, malformed JSON, invalid structure, negative counts, valid data
 * - gatherDashboardData: integrates triage stats with graceful fallback
 * - formatDashboard: renders TRIAGE section with GO/NEEDS_INFO/REJECT counts
 * - parseDashboardArgs / runDashboardCli: CLI integration
 *
 * Order: misuse → boundary → golden path
 * Target: 99% coverage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as path from 'path';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  statSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  appendFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  renameSync: vi.fn(),
  promises: { appendFile: vi.fn() },
}));

import * as fs from 'fs';
import {
  readTriageLog,
  gatherDashboardData,
  formatDashboard,
  parseDashboardArgs,
  runDashboardCli,
  type TriageStats,
  type DashboardData,
  type TriageLogEntry,
} from '@/audit/reporting/dashboard';

describe('audit/reporting/dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // readTriageLog — MISUSE CASES
  // =========================================================================
  describe('readTriageLog()', () => {
    describe('Given misuse: path traversal attempts', () => {
      it('When path contains .., Then throws path traversal error', () => {
        expect(() => readTriageLog('../../etc/passwd')).toThrow('path traversal');
      });

      it('When path contains encoded traversal, Then throws path traversal error', () => {
        expect(() => readTriageLog('%2e%2e/secret')).toThrow('path traversal');
      });
    });

    describe('Given misuse: non-JSON file extension', () => {
      it('When path has .txt extension, Then throws invalid extension error', () => {
        expect(() => readTriageLog('/tmp/triage.txt')).toThrow('only .json files');
      });

      it('When path has no extension, Then throws invalid extension error', () => {
        expect(() => readTriageLog('/tmp/triage')).toThrow('only .json files');
      });
    });

    describe('Given misuse: empty or invalid path', () => {
      it('When path is empty string, Then throws empty path error', () => {
        expect(() => readTriageLog('')).toThrow('path cannot be empty');
      });

      it('When path is whitespace only, Then throws empty path error', () => {
        expect(() => readTriageLog('   ')).toThrow('path cannot be empty');
      });
    });

    describe('Given misuse: malformed JSON content', () => {
      it('When file contains invalid JSON, Then returns zeroed stats', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue('not-json{{{');

        const result = readTriageLog('/tmp/triage-log.json');
        expect(result).toEqual({ go: 0, needsInfo: 0, rejected: 0 });
      });
    });

    describe('Given misuse: invalid data types in entries', () => {
      it('When entries contain non-string verdicts, Then skips invalid entries', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify([
          { verdict: 123, timestamp: '2026-03-19T00:00:00Z' },
          { verdict: 'GO', timestamp: '2026-03-19T00:00:00Z' },
        ]));

        const result = readTriageLog('/tmp/triage-log.json');
        expect(result.go).toBe(1);
      });

      it('When data is not an array, Then returns zeroed stats', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ verdict: 'GO' }));

        const result = readTriageLog('/tmp/triage-log.json');
        expect(result).toEqual({ go: 0, needsInfo: 0, rejected: 0 });
      });

      it('When data is null, Then returns zeroed stats', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue('null');

        const result = readTriageLog('/tmp/triage-log.json');
        expect(result).toEqual({ go: 0, needsInfo: 0, rejected: 0 });
      });
    });

    // =========================================================================
    // readTriageLog — BOUNDARY CASES
    // =========================================================================
    describe('Given boundary: file does not exist', () => {
      it('When file is missing, Then returns zeroed stats (graceful fallback)', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        const result = readTriageLog('/tmp/triage-log.json');
        expect(result).toEqual({ go: 0, needsInfo: 0, rejected: 0 });
      });
    });

    describe('Given boundary: empty file', () => {
      it('When file is empty string, Then returns zeroed stats', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue('');

        const result = readTriageLog('/tmp/triage-log.json');
        expect(result).toEqual({ go: 0, needsInfo: 0, rejected: 0 });
      });

      it('When file has only whitespace, Then returns zeroed stats', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue('   \n  ');

        const result = readTriageLog('/tmp/triage-log.json');
        expect(result).toEqual({ go: 0, needsInfo: 0, rejected: 0 });
      });
    });

    describe('Given boundary: empty array', () => {
      it('When file contains empty array, Then returns zeroed stats', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue('[]');

        const result = readTriageLog('/tmp/triage-log.json');
        expect(result).toEqual({ go: 0, needsInfo: 0, rejected: 0 });
      });
    });

    describe('Given boundary: unknown verdict values', () => {
      it('When entries have unrecognized verdicts, Then ignores them', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify([
          { verdict: 'GO', timestamp: '2026-03-19T00:00:00Z' },
          { verdict: 'UNKNOWN', timestamp: '2026-03-19T00:00:00Z' },
          { verdict: 'MAYBE', timestamp: '2026-03-19T00:00:00Z' },
        ]));

        const result = readTriageLog('/tmp/triage-log.json');
        expect(result).toEqual({ go: 1, needsInfo: 0, rejected: 0 });
      });
    });

    describe('Given boundary: case insensitive verdicts', () => {
      it('When verdicts use different casing, Then normalizes correctly', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify([
          { verdict: 'go', timestamp: '2026-03-19T00:00:00Z' },
          { verdict: 'Go', timestamp: '2026-03-19T00:00:00Z' },
          { verdict: 'needs_info', timestamp: '2026-03-19T00:00:00Z' },
          { verdict: 'NEEDS_INFO', timestamp: '2026-03-19T00:00:00Z' },
          { verdict: 'reject', timestamp: '2026-03-19T00:00:00Z' },
          { verdict: 'REJECT', timestamp: '2026-03-19T00:00:00Z' },
        ]));

        const result = readTriageLog('/tmp/triage-log.json');
        expect(result).toEqual({ go: 2, needsInfo: 2, rejected: 2 });
      });
    });

    describe('Given boundary: fs read error', () => {
      it('When readFileSync throws, Then returns zeroed stats', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockImplementation(() => {
          throw new Error('EACCES: permission denied');
        });

        const result = readTriageLog('/tmp/triage-log.json');
        expect(result).toEqual({ go: 0, needsInfo: 0, rejected: 0 });
      });
    });

    // =========================================================================
    // readTriageLog — GOLDEN PATH
    // =========================================================================
    describe('Given golden path: valid triage log', () => {
      it('When file has mixed verdicts, Then counts correctly', () => {
        const entries: TriageLogEntry[] = [
          { verdict: 'GO', timestamp: '2026-03-19T00:00:00Z' },
          { verdict: 'GO', timestamp: '2026-03-19T01:00:00Z' },
          { verdict: 'GO', timestamp: '2026-03-19T02:00:00Z' },
          { verdict: 'NEEDS_INFO', timestamp: '2026-03-19T03:00:00Z' },
          { verdict: 'NEEDS_INFO', timestamp: '2026-03-19T04:00:00Z' },
          { verdict: 'REJECT', timestamp: '2026-03-19T05:00:00Z' },
        ];

        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(entries));

        const result = readTriageLog('/tmp/triage-log.json');
        expect(result).toEqual({ go: 3, needsInfo: 2, rejected: 1 });
      });

      it('When all entries are GO, Then counts only go', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify([
          { verdict: 'GO', timestamp: '2026-03-19T00:00:00Z' },
          { verdict: 'GO', timestamp: '2026-03-19T01:00:00Z' },
        ]));

        const result = readTriageLog('/tmp/triage-log.json');
        expect(result).toEqual({ go: 2, needsInfo: 0, rejected: 0 });
      });

      it('When entries have extra fields, Then ignores extra fields', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify([
          { verdict: 'GO', timestamp: '2026-03-19T00:00:00Z', issueNumber: 42, title: 'test' },
          { verdict: 'REJECT', timestamp: '2026-03-19T01:00:00Z', reason: 'duplicate' },
        ]));

        const result = readTriageLog('/tmp/triage-log.json');
        expect(result).toEqual({ go: 1, needsInfo: 0, rejected: 1 });
      });
    });
  });

  // =========================================================================
  // gatherDashboardData — MISUSE / BOUNDARY / GOLDEN PATH
  // =========================================================================
  describe('gatherDashboardData()', () => {
    describe('Given misuse: invalid triageLogPath', () => {
      it('When triageLogPath has path traversal, Then triageStats are zeroed (graceful)', () => {
        // gatherDashboardData should not throw — it catches readTriageLog errors
        const data = gatherDashboardData({ triageLogPath: '../../etc/passwd' });
        expect(data.triageStats).toEqual({ go: 0, needsInfo: 0, rejected: 0 });
      });
    });

    describe('Given boundary: no triage log path provided', () => {
      it('When triageLogPath is undefined, Then uses default path and returns zeroed if missing', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        const data = gatherDashboardData({});
        expect(data.triageStats).toEqual({ go: 0, needsInfo: 0, rejected: 0 });
      });
    });

    describe('Given golden path: valid triage log', () => {
      it('When triage log exists with data, Then populates triageStats', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify([
          { verdict: 'GO', timestamp: '2026-03-19T00:00:00Z' },
          { verdict: 'NEEDS_INFO', timestamp: '2026-03-19T01:00:00Z' },
          { verdict: 'REJECT', timestamp: '2026-03-19T02:00:00Z' },
        ]));

        const data = gatherDashboardData({ triageLogPath: '/tmp/triage-log.json' });
        expect(data.triageStats).toEqual({ go: 1, needsInfo: 1, rejected: 1 });
      });
    });
  });

  // =========================================================================
  // formatDashboard — MISUSE / BOUNDARY / GOLDEN PATH
  // =========================================================================
  describe('formatDashboard()', () => {
    const zeroed: DashboardData = {
      triageStats: { go: 0, needsInfo: 0, rejected: 0 },
    };

    describe('Given misuse: negative triage counts', () => {
      it('When triageStats has negative values, Then clamps to 0', () => {
        const data: DashboardData = {
          triageStats: { go: -1, needsInfo: -5, rejected: -3 },
        };
        const output = formatDashboard(data);
        expect(output).toContain('GO:          0');
        expect(output).toContain('NEEDS_INFO:  0');
        expect(output).toContain('REJECT:      0');
      });
    });

    describe('Given boundary: all zeros', () => {
      it('When triageStats are all zero, Then renders section with zeros', () => {
        const output = formatDashboard(zeroed);
        expect(output).toContain('TRIAGE');
        expect(output).toContain('GO:          0');
        expect(output).toContain('NEEDS_INFO:  0');
        expect(output).toContain('REJECT:      0');
      });
    });

    describe('Given boundary: JSON format', () => {
      it('When format is json, Then returns valid JSON', () => {
        const data: DashboardData = {
          triageStats: { go: 5, needsInfo: 2, rejected: 1 },
        };
        const output = formatDashboard(data, 'json');
        const parsed = JSON.parse(output);
        expect(parsed.triageStats).toEqual({ go: 5, needsInfo: 2, rejected: 1 });
      });
    });

    describe('Given golden path: populated triage stats', () => {
      it('When triageStats has data, Then renders TRIAGE section with counts', () => {
        const data: DashboardData = {
          triageStats: { go: 10, needsInfo: 3, rejected: 2 },
        };
        const output = formatDashboard(data);
        expect(output).toContain('TRIAGE');
        expect(output).toContain('GO:          10');
        expect(output).toContain('NEEDS_INFO:  3');
        expect(output).toContain('REJECT:      2');
        expect(output).toContain('Total:       15');
      });

      it('When format is table (default), Then renders human-readable table', () => {
        const data: DashboardData = {
          triageStats: { go: 1, needsInfo: 0, rejected: 0 },
        };
        const output = formatDashboard(data);
        expect(output).toContain('=');
        expect(output).toContain('Dashboard');
      });
    });
  });

  // =========================================================================
  // parseDashboardArgs — MISUSE / BOUNDARY / GOLDEN PATH
  // =========================================================================
  describe('parseDashboardArgs()', () => {
    describe('Given misuse: unknown flags', () => {
      it('When unknown flag passed, Then ignores it', () => {
        const opts = parseDashboardArgs(['dashboard', '--unknown']);
        expect(opts.format).toBe('table');
      });
    });

    describe('Given boundary: empty args', () => {
      it('When no args, Then returns defaults', () => {
        const opts = parseDashboardArgs([]);
        expect(opts.format).toBe('table');
        expect(opts.triageLogPath).toBeUndefined();
      });
    });

    describe('Given golden path: valid args', () => {
      it('When --format=json, Then sets format to json', () => {
        const opts = parseDashboardArgs(['dashboard', '--format=json']);
        expect(opts.format).toBe('json');
      });

      it('When --format json (space separated), Then sets format to json', () => {
        const opts = parseDashboardArgs(['dashboard', '--format', 'json']);
        expect(opts.format).toBe('json');
      });

      it('When --triage-log=<path>, Then sets triageLogPath', () => {
        const opts = parseDashboardArgs(['dashboard', '--triage-log=/tmp/triage-log.json']);
        expect(opts.triageLogPath).toBe('/tmp/triage-log.json');
      });

      it('When --triage-log <path> (space separated), Then sets triageLogPath', () => {
        const opts = parseDashboardArgs(['dashboard', '--triage-log', '/tmp/triage-log.json']);
        expect(opts.triageLogPath).toBe('/tmp/triage-log.json');
      });
    });
  });

  // =========================================================================
  // runDashboardCli — MISUSE / BOUNDARY / GOLDEN PATH
  // =========================================================================
  describe('runDashboardCli()', () => {
    let logSpy: ReturnType<typeof vi.spyOn>;
    let errorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    describe('Given golden path: --help', () => {
      it('When --help flag, Then prints help and returns 0', () => {
        const code = runDashboardCli(['dashboard', '--help']);
        expect(code).toBe(0);
        expect(logSpy).toHaveBeenCalled();
        const helpText = logSpy.mock.calls[0][0] as string;
        expect(helpText).toContain('dashboard');
      });
    });

    describe('Given golden path: dashboard with no triage log', () => {
      it('When triage log missing, Then renders dashboard with zeroed stats and returns 0', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        const code = runDashboardCli(['dashboard']);
        expect(code).toBe(0);
        expect(logSpy).toHaveBeenCalled();
        const output = logSpy.mock.calls[0][0] as string;
        expect(output).toContain('TRIAGE');
        expect(output).toContain('GO:          0');
      });
    });

    describe('Given golden path: dashboard with data', () => {
      it('When triage log exists, Then renders dashboard with stats and returns 0', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify([
          { verdict: 'GO', timestamp: '2026-03-19T00:00:00Z' },
          { verdict: 'GO', timestamp: '2026-03-19T01:00:00Z' },
          { verdict: 'NEEDS_INFO', timestamp: '2026-03-19T02:00:00Z' },
          { verdict: 'REJECT', timestamp: '2026-03-19T03:00:00Z' },
        ]));

        const code = runDashboardCli(['dashboard', '--triage-log=/tmp/triage-log.json']);
        expect(code).toBe(0);
        const output = logSpy.mock.calls[0][0] as string;
        expect(output).toContain('GO:          2');
        expect(output).toContain('NEEDS_INFO:  1');
        expect(output).toContain('REJECT:      1');
        expect(output).toContain('Total:       4');
      });
    });

    describe('Given golden path: JSON format output', () => {
      it('When --format=json, Then outputs valid JSON and returns 0', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify([
          { verdict: 'GO', timestamp: '2026-03-19T00:00:00Z' },
        ]));

        const code = runDashboardCli(['dashboard', '--format=json', '--triage-log=/tmp/triage-log.json']);
        expect(code).toBe(0);
        const output = logSpy.mock.calls[0][0] as string;
        const parsed = JSON.parse(output);
        expect(parsed.triageStats.go).toBe(1);
      });
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

// Mock process module
vi.mock('../../src/process', () => ({
  statusDaemon: vi.fn(),
}));

// Mock heartbeat module
vi.mock('../../src/heartbeat', () => ({
  isStale: vi.fn(),
}));

import { existsSync, readFileSync } from 'fs';
import * as processModule from '../../src/process';
import * as heartbeatModule from '../../src/heartbeat';
import { gatherDashboardData, formatDashboard } from '../../src/dashboard';
import type { DaemonConfig } from '../../src/types';

const baseConfig: DaemonConfig = {
  provider: 'github',
  github: { repo: 'org/repo', baseBranch: 'main' },
  polling: { intervalSeconds: 60, batchSize: 5 },
};

describe('Dashboard Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── gatherDashboardData ────────────────────────────────────────────────────

  describe('gatherDashboardData()', () => {
    describe('GIVEN daemon is running WHEN gatherDashboardData called THEN reflects running status', () => {
      it('GIVEN statusDaemon returns running THEN daemonStatus.running is true', () => {
        vi.mocked(processModule.statusDaemon).mockReturnValue({ running: true, pid: 42, uptimeMs: 5000 });
        vi.mocked(heartbeatModule.isStale).mockReturnValue(false);
        vi.mocked(existsSync).mockReturnValue(false);

        const data = gatherDashboardData(baseConfig);

        expect(data.daemonStatus.running).toBe(true);
        expect(data.daemonStatus.pid).toBe(42);
        expect(data.daemonStatus.uptimeMs).toBe(5000);
      });

      it('GIVEN statusDaemon returns not running THEN daemonStatus.running is false', () => {
        vi.mocked(processModule.statusDaemon).mockReturnValue({ running: false });
        vi.mocked(heartbeatModule.isStale).mockReturnValue(true);
        vi.mocked(existsSync).mockReturnValue(false);

        const data = gatherDashboardData(baseConfig);

        expect(data.daemonStatus.running).toBe(false);
        expect(data.daemonStatus.pid).toBeUndefined();
      });
    });

    describe('GIVEN heartbeat is stale WHEN gatherDashboardData called THEN heartbeatStale is true', () => {
      it('GIVEN isStale returns true THEN heartbeatStale is true', () => {
        vi.mocked(processModule.statusDaemon).mockReturnValue({ running: true, pid: 1, uptimeMs: 100 });
        vi.mocked(heartbeatModule.isStale).mockReturnValue(true);
        vi.mocked(existsSync).mockReturnValue(false);

        const data = gatherDashboardData(baseConfig);

        expect(data.heartbeatStale).toBe(true);
      });

      it('GIVEN isStale returns false THEN heartbeatStale is false', () => {
        vi.mocked(processModule.statusDaemon).mockReturnValue({ running: true, pid: 1, uptimeMs: 100 });
        vi.mocked(heartbeatModule.isStale).mockReturnValue(false);
        vi.mocked(existsSync).mockReturnValue(false);

        const data = gatherDashboardData(baseConfig);

        expect(data.heartbeatStale).toBe(false);
      });
    });

    describe('GIVEN processed.json exists WHEN gatherDashboardData called THEN populates ticket lists', () => {
      it('GIVEN processed.json with in-flight ticket THEN inFlightTickets contains it', () => {
        vi.mocked(processModule.statusDaemon).mockReturnValue({ running: true, pid: 1, uptimeMs: 100 });
        vi.mocked(heartbeatModule.isStale).mockReturnValue(false);
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(
          JSON.stringify({
            'PROJ-123': { processedAt: '2026-03-18T12:00:00Z', status: 'processing' },
          })
        );

        const data = gatherDashboardData(baseConfig);

        expect(data.inFlightTickets).toHaveLength(1);
        expect(data.inFlightTickets[0].id).toBe('PROJ-123');
        expect(data.inFlightTickets[0].status).toBe('processing');
        expect(data.inFlightTickets[0].startedAt).toBe('2026-03-18T12:00:00Z');
      });

      it('GIVEN processed.json with completed ticket THEN recentCompleted contains it', () => {
        vi.mocked(processModule.statusDaemon).mockReturnValue({ running: true, pid: 1, uptimeMs: 100 });
        vi.mocked(heartbeatModule.isStale).mockReturnValue(false);
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(
          JSON.stringify({
            'PROJ-120': { processedAt: '2026-03-18T11:00:00Z', status: 'complete', prUrl: 'https://github.com/org/repo/pull/45' },
          })
        );

        const data = gatherDashboardData(baseConfig);

        expect(data.recentCompleted).toHaveLength(1);
        expect(data.recentCompleted[0].id).toBe('PROJ-120');
        expect(data.recentCompleted[0].prUrl).toBe('https://github.com/org/repo/pull/45');
      });

      it('GIVEN processed.json with failed ticket THEN recentFailed contains it', () => {
        vi.mocked(processModule.statusDaemon).mockReturnValue({ running: true, pid: 1, uptimeMs: 100 });
        vi.mocked(heartbeatModule.isStale).mockReturnValue(false);
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(
          JSON.stringify({
            'PROJ-121': { processedAt: '2026-03-18T10:00:00Z', status: 'failed', error: 'claude timeout after 30m' },
          })
        );

        const data = gatherDashboardData(baseConfig);

        expect(data.recentFailed).toHaveLength(1);
        expect(data.recentFailed[0].id).toBe('PROJ-121');
        expect(data.recentFailed[0].error).toBe('claude timeout after 30m');
      });

      it('GIVEN processed.json with mixed statuses THEN each appears in correct list', () => {
        vi.mocked(processModule.statusDaemon).mockReturnValue({ running: true, pid: 1, uptimeMs: 100 });
        vi.mocked(heartbeatModule.isStale).mockReturnValue(false);
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(
          JSON.stringify({
            'PROJ-123': { processedAt: '2026-03-18T12:00:00Z', status: 'processing' },
            'PROJ-120': { processedAt: '2026-03-18T11:00:00Z', status: 'complete', prUrl: 'https://github.com/org/repo/pull/45' },
            'PROJ-121': { processedAt: '2026-03-18T10:00:00Z', status: 'failed', error: 'timeout' },
          })
        );

        const data = gatherDashboardData(baseConfig);

        expect(data.inFlightTickets).toHaveLength(1);
        expect(data.recentCompleted).toHaveLength(1);
        expect(data.recentFailed).toHaveLength(1);
      });
    });

    describe('GIVEN no processed.json WHEN gatherDashboardData called THEN returns empty lists', () => {
      it('GIVEN file does not exist THEN all ticket lists are empty', () => {
        vi.mocked(processModule.statusDaemon).mockReturnValue({ running: false });
        vi.mocked(heartbeatModule.isStale).mockReturnValue(false);
        vi.mocked(existsSync).mockReturnValue(false);

        const data = gatherDashboardData(baseConfig);

        expect(data.inFlightTickets).toHaveLength(0);
        expect(data.recentCompleted).toHaveLength(0);
        expect(data.recentFailed).toHaveLength(0);
      });
    });

    describe('GIVEN error-budget.json exists WHEN gatherDashboardData called THEN populates errorBudget', () => {
      it('GIVEN error-budget.json with state THEN errorBudget reflects it', () => {
        vi.mocked(processModule.statusDaemon).mockReturnValue({ running: true, pid: 1, uptimeMs: 100 });
        vi.mocked(heartbeatModule.isStale).mockReturnValue(false);
        vi.mocked(existsSync).mockImplementation((p) => {
          const path = String(p);
          return path.includes('error-budget') || path.includes('processed');
        });
        vi.mocked(readFileSync).mockImplementation((p) => {
          const path = String(p);
          if (path.includes('error-budget')) {
            return JSON.stringify({ consecutiveFailures: 1, paused: false });
          }
          return '{}';
        });

        const data = gatherDashboardData(baseConfig);

        expect(data.errorBudget.consecutive).toBe(1);
        expect(data.errorBudget.paused).toBe(false);
      });

      it('GIVEN no error-budget.json THEN errorBudget defaults to 0 consecutive failures', () => {
        vi.mocked(processModule.statusDaemon).mockReturnValue({ running: false });
        vi.mocked(heartbeatModule.isStale).mockReturnValue(false);
        vi.mocked(existsSync).mockReturnValue(false);

        const data = gatherDashboardData(baseConfig);

        expect(data.errorBudget.consecutive).toBe(0);
        expect(data.errorBudget.paused).toBe(false);
      });
    });

    describe('GIVEN lastPoll file exists WHEN gatherDashboardData called THEN shows lastPollTime', () => {
      it('GIVEN poll tracking file THEN lastPollTime is populated', () => {
        vi.mocked(processModule.statusDaemon).mockReturnValue({ running: true, pid: 1, uptimeMs: 100 });
        vi.mocked(heartbeatModule.isStale).mockReturnValue(false);
        vi.mocked(existsSync).mockImplementation((p) => {
          const path = String(p);
          return path.includes('last-poll') || path.includes('processed');
        });
        vi.mocked(readFileSync).mockImplementation((p) => {
          const path = String(p);
          if (path.includes('last-poll')) {
            return JSON.stringify({ timestamp: '2026-03-18T14:30:00Z' });
          }
          return '{}';
        });

        const data = gatherDashboardData(baseConfig);

        expect(data.lastPollTime).toBe('2026-03-18T14:30:00Z');
      });

      it('GIVEN no poll file THEN lastPollTime is null', () => {
        vi.mocked(processModule.statusDaemon).mockReturnValue({ running: false });
        vi.mocked(heartbeatModule.isStale).mockReturnValue(false);
        vi.mocked(existsSync).mockReturnValue(false);

        const data = gatherDashboardData(baseConfig);

        expect(data.lastPollTime).toBeNull();
      });
    });

    describe('GIVEN corrupted JSON files WHEN gatherDashboardData called THEN handles gracefully', () => {
      it('GIVEN corrupted processed.json THEN returns empty lists without throwing', () => {
        vi.mocked(processModule.statusDaemon).mockReturnValue({ running: false });
        vi.mocked(heartbeatModule.isStale).mockReturnValue(false);
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue('not-valid-json{{{');

        expect(() => gatherDashboardData(baseConfig)).not.toThrow();

        const data = gatherDashboardData(baseConfig);
        expect(data.inFlightTickets).toHaveLength(0);
      });
    });
  });

  // ─── formatDashboard ────────────────────────────────────────────────────────

  describe('formatDashboard()', () => {
    describe('GIVEN dashboard data WHEN formatDashboard called THEN returns string', () => {
      it('GIVEN any valid data THEN output is a non-empty string', () => {
        const data = {
          daemonStatus: { running: false },
          lastPollTime: null,
          heartbeatStale: false,
          inFlightTickets: [],
          recentCompleted: [],
          recentFailed: [],
          errorBudget: { consecutive: 0, threshold: 3, paused: false },
        };

        const output = formatDashboard(data);
        expect(typeof output).toBe('string');
        expect(output.length).toBeGreaterThan(0);
      });

      it('GIVEN any valid data THEN output contains "MG DAEMON DASHBOARD" header', () => {
        const data = {
          daemonStatus: { running: false },
          lastPollTime: null,
          heartbeatStale: false,
          inFlightTickets: [],
          recentCompleted: [],
          recentFailed: [],
          errorBudget: { consecutive: 0, threshold: 3, paused: false },
        };

        const output = formatDashboard(data);
        expect(output).toContain('MG DAEMON DASHBOARD');
      });

      it('GIVEN any valid data THEN each line is at most 80 characters', () => {
        const data = {
          daemonStatus: { running: true, pid: 12345, uptimeMs: 8100000 },
          lastPollTime: '2026-03-18T14:30:00Z',
          heartbeatStale: false,
          inFlightTickets: [{ id: 'PROJ-123', status: 'processing' as const, startedAt: '2026-03-18T14:25:00Z' }],
          recentCompleted: [{ id: 'PROJ-120', prUrl: 'https://github.com/org/repo/pull/45', completedAt: '2026-03-18T13:00:00Z' }],
          recentFailed: [{ id: 'PROJ-121', error: 'claude timeout after 30m', failedAt: '2026-03-18T12:00:00Z' }],
          errorBudget: { consecutive: 1, threshold: 3, paused: false },
        };

        const output = formatDashboard(data);
        const lines = output.split('\n');
        for (const line of lines) {
          expect(line.length).toBeLessThanOrEqual(80);
        }
      });
    });

    describe('GIVEN daemon is running WHEN formatDashboard called THEN shows running status', () => {
      it('GIVEN running daemon THEN output contains PID', () => {
        const data = {
          daemonStatus: { running: true, pid: 12345, uptimeMs: 5000 },
          lastPollTime: null,
          heartbeatStale: false,
          inFlightTickets: [],
          recentCompleted: [],
          recentFailed: [],
          errorBudget: { consecutive: 0, threshold: 3, paused: false },
        };

        const output = formatDashboard(data);
        expect(output).toContain('12345');
      });

      it('GIVEN running daemon THEN output contains "Running"', () => {
        const data = {
          daemonStatus: { running: true, pid: 12345, uptimeMs: 5000 },
          lastPollTime: null,
          heartbeatStale: false,
          inFlightTickets: [],
          recentCompleted: [],
          recentFailed: [],
          errorBudget: { consecutive: 0, threshold: 3, paused: false },
        };

        const output = formatDashboard(data);
        expect(output.toLowerCase()).toContain('running');
      });

      it('GIVEN daemon not running THEN output indicates stopped', () => {
        const data = {
          daemonStatus: { running: false },
          lastPollTime: null,
          heartbeatStale: false,
          inFlightTickets: [],
          recentCompleted: [],
          recentFailed: [],
          errorBudget: { consecutive: 0, threshold: 3, paused: false },
        };

        const output = formatDashboard(data);
        expect(output.toLowerCase()).toMatch(/stopped|not running/);
      });
    });

    describe('GIVEN heartbeat stale WHEN formatDashboard called THEN shows stale warning', () => {
      it('GIVEN heartbeatStale true THEN output contains stale indicator', () => {
        const data = {
          daemonStatus: { running: true, pid: 1, uptimeMs: 100 },
          lastPollTime: null,
          heartbeatStale: true,
          inFlightTickets: [],
          recentCompleted: [],
          recentFailed: [],
          errorBudget: { consecutive: 0, threshold: 3, paused: false },
        };

        const output = formatDashboard(data);
        expect(output.toLowerCase()).toMatch(/stale|warn/);
      });

      it('GIVEN heartbeatStale false THEN output contains OK indicator', () => {
        const data = {
          daemonStatus: { running: true, pid: 1, uptimeMs: 100 },
          lastPollTime: null,
          heartbeatStale: false,
          inFlightTickets: [],
          recentCompleted: [],
          recentFailed: [],
          errorBudget: { consecutive: 0, threshold: 3, paused: false },
        };

        const output = formatDashboard(data);
        expect(output).toContain('OK');
      });
    });

    describe('GIVEN in-flight tickets WHEN formatDashboard called THEN shows them', () => {
      it('GIVEN inFlightTickets has entry THEN ticket ID appears in output', () => {
        const data = {
          daemonStatus: { running: true, pid: 1, uptimeMs: 100 },
          lastPollTime: null,
          heartbeatStale: false,
          inFlightTickets: [{ id: 'PROJ-123', status: 'processing' as const, startedAt: '2026-03-18T14:25:00Z' }],
          recentCompleted: [],
          recentFailed: [],
          errorBudget: { consecutive: 0, threshold: 3, paused: false },
        };

        const output = formatDashboard(data);
        expect(output).toContain('PROJ-123');
      });

      it('GIVEN inFlightTickets has entry THEN "processing" label appears', () => {
        const data = {
          daemonStatus: { running: true, pid: 1, uptimeMs: 100 },
          lastPollTime: null,
          heartbeatStale: false,
          inFlightTickets: [{ id: 'PROJ-123', status: 'processing' as const, startedAt: '2026-03-18T14:25:00Z' }],
          recentCompleted: [],
          recentFailed: [],
          errorBudget: { consecutive: 0, threshold: 3, paused: false },
        };

        const output = formatDashboard(data);
        expect(output.toLowerCase()).toContain('processing');
      });
    });

    describe('GIVEN completed tickets WHEN formatDashboard called THEN shows PR URLs', () => {
      it('GIVEN recentCompleted has entry THEN PR URL appears in output', () => {
        const data = {
          daemonStatus: { running: true, pid: 1, uptimeMs: 100 },
          lastPollTime: null,
          heartbeatStale: false,
          inFlightTickets: [],
          recentCompleted: [{ id: 'PROJ-120', prUrl: 'https://github.com/org/repo/pull/45', completedAt: '2026-03-18T13:00:00Z' }],
          recentFailed: [],
          errorBudget: { consecutive: 0, threshold: 3, paused: false },
        };

        const output = formatDashboard(data);
        expect(output).toContain('PROJ-120');
        expect(output).toContain('https://github.com/org/repo/pull/45');
      });
    });

    describe('GIVEN failed tickets WHEN formatDashboard called THEN shows errors', () => {
      it('GIVEN recentFailed has entry THEN error message appears in output', () => {
        const data = {
          daemonStatus: { running: true, pid: 1, uptimeMs: 100 },
          lastPollTime: null,
          heartbeatStale: false,
          inFlightTickets: [],
          recentCompleted: [],
          recentFailed: [{ id: 'PROJ-121', error: 'claude timeout after 30m', failedAt: '2026-03-18T12:00:00Z' }],
          errorBudget: { consecutive: 0, threshold: 3, paused: false },
        };

        const output = formatDashboard(data);
        expect(output).toContain('PROJ-121');
        expect(output).toContain('claude timeout after 30m');
      });
    });

    describe('GIVEN error budget paused WHEN formatDashboard called THEN shows paused state', () => {
      it('GIVEN paused true THEN output contains "PAUSED"', () => {
        const data = {
          daemonStatus: { running: true, pid: 1, uptimeMs: 100 },
          lastPollTime: null,
          heartbeatStale: false,
          inFlightTickets: [],
          recentCompleted: [],
          recentFailed: [],
          errorBudget: { consecutive: 3, threshold: 3, paused: true },
        };

        const output = formatDashboard(data);
        expect(output.toUpperCase()).toContain('PAUSED');
      });

      it('GIVEN budget not exceeded THEN output shows consecutive/threshold', () => {
        const data = {
          daemonStatus: { running: true, pid: 1, uptimeMs: 100 },
          lastPollTime: null,
          heartbeatStale: false,
          inFlightTickets: [],
          recentCompleted: [],
          recentFailed: [],
          errorBudget: { consecutive: 1, threshold: 3, paused: false },
        };

        const output = formatDashboard(data);
        expect(output).toContain('1');
        expect(output).toContain('3');
      });
    });

    describe('GIVEN last poll time set WHEN formatDashboard called THEN shows it', () => {
      it('GIVEN lastPollTime is set THEN it appears in output', () => {
        const data = {
          daemonStatus: { running: true, pid: 1, uptimeMs: 100 },
          lastPollTime: '2026-03-18T14:30:00Z',
          heartbeatStale: false,
          inFlightTickets: [],
          recentCompleted: [],
          recentFailed: [],
          errorBudget: { consecutive: 0, threshold: 3, paused: false },
        };

        const output = formatDashboard(data);
        expect(output).toContain('2026-03-18T14:30:00Z');
      });

      it('GIVEN lastPollTime is null THEN output shows "Never" or dashes', () => {
        const data = {
          daemonStatus: { running: false },
          lastPollTime: null,
          heartbeatStale: false,
          inFlightTickets: [],
          recentCompleted: [],
          recentFailed: [],
          errorBudget: { consecutive: 0, threshold: 3, paused: false },
        };

        const output = formatDashboard(data);
        expect(output.toLowerCase()).toMatch(/never|--|none/);
      });
    });

    describe('GIVEN uptime in ms WHEN formatDashboard called THEN formats human-readable', () => {
      it('GIVEN 8100000ms uptime THEN output shows hours and minutes', () => {
        const data = {
          daemonStatus: { running: true, pid: 1, uptimeMs: 8100000 }, // 2h 15m
          lastPollTime: null,
          heartbeatStale: false,
          inFlightTickets: [],
          recentCompleted: [],
          recentFailed: [],
          errorBudget: { consecutive: 0, threshold: 3, paused: false },
        };

        const output = formatDashboard(data);
        expect(output).toMatch(/2h|2 h/);
      });
    });
  });
});

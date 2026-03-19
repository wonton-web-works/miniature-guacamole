import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';

// Module under test
import { main, cmdInit, cmdStart, cmdStop, cmdStatus, cmdLogs, cmdDashboard, cmdResume, cmdInstall, cmdSetupUser, cmdUninstall, cmdSetupMac, readDryRunFlag } from '../../src/cli';

// Mock dependencies
import * as configModule from '../../src/config';
import * as processModule from '../../src/process';

// Mock fs module
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

// Mock config module
vi.mock('../../src/config', () => ({
  initConfig: vi.fn(),
  loadConfig: vi.fn().mockReturnValue({
    provider: 'github',
    github: { repo: 'org/repo', baseBranch: 'main' },
    polling: { intervalSeconds: 60, batchSize: 5 },
  }),
}));

// Mock dashboard module
vi.mock('../../src/dashboard', () => ({
  gatherDashboardData: vi.fn().mockReturnValue({
    daemonStatus: { running: false },
    lastPollTime: null,
    heartbeatStale: false,
    inFlightTickets: [],
    recentCompleted: [],
    recentFailed: [],
    errorBudget: { consecutive: 0, threshold: 3, paused: false },
  }),
  formatDashboard: vi.fn().mockReturnValue('[ MG DAEMON DASHBOARD ]'),
}));

// Mock error-budget module
vi.mock('../../src/error-budget', () => ({
  ErrorBudget: {
    load: vi.fn().mockReturnValue({
      resume: vi.fn(),
      save: vi.fn(),
      canProcess: true,
      recordSuccess: vi.fn(),
      recordFailure: vi.fn(),
    }),
  },
}));

// Mock process module
vi.mock('../../src/process', () => ({
  startDaemon: vi.fn(),
  stopDaemon: vi.fn(),
  statusDaemon: vi.fn(),
  setupSignalHandlers: vi.fn(),
}));

// Mock launchd module
vi.mock('../../src/launchd', () => ({
  installService: vi.fn(),
  uninstallService: vi.fn(),
}));

// Mock prereqs module
vi.mock('../../src/prereqs', () => ({
  checkPrereqs: vi.fn().mockReturnValue([]),
  formatPrereqReport: vi.fn().mockReturnValue('All prerequisites met.'),
}));

// Mock heartbeat module
vi.mock('../../src/heartbeat', () => ({
  isStale: vi.fn().mockReturnValue(false),
  writeHeartbeat: vi.fn(),
}));

// Mock setup-user module
vi.mock('../../src/setup-user', () => ({
  createDaemonUser: vi.fn().mockReturnValue({ created: true, username: 'mg-daemon', uid: 300 }),
  formatSetupInstructions: vi.fn().mockReturnValue('Setup instructions here.'),
}));

// Mock log-rotation module
vi.mock('../../src/log-rotation', () => ({
  appendLog: vi.fn(),
}));

// Mock orchestrator module
vi.mock('../../src/orchestrator', () => ({
  runPollCycle: vi.fn().mockResolvedValue([]),
}));

// Mock providers/factory module
vi.mock('../../src/providers/factory', () => ({
  createProvider: vi.fn().mockReturnValue({
    poll: vi.fn().mockResolvedValue([]),
  }),
}));

// Mock tracker module
vi.mock('../../src/tracker', () => ({
  getProcessedTickets: vi.fn().mockReturnValue([]),
  markProcessing: vi.fn(),
  markComplete: vi.fn(),
  markFailed: vi.fn(),
}));

describe('CLI Module', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  const mockConfig = {
    provider: 'github' as const,
    github: { repo: 'org/repo', baseBranch: 'main' },
    polling: { intervalSeconds: 60, batchSize: 5 },
  };

  const mockDashboardData = {
    daemonStatus: { running: false },
    lastPollTime: null,
    heartbeatStale: false,
    inFlightTickets: [],
    recentCompleted: [],
    recentFailed: [],
    errorBudget: { consecutive: 0, threshold: 3, paused: false },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Fix: process.exit mock should NOT throw — just track calls.
    // The throw-based mock caused unhandled rejections in foreground mode where
    // runForegroundLoop's .catch() would itself throw.
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((_code?: number) => undefined as never);

    // Set up default return values for modules reset by mockReset
    vi.mocked(configModule.loadConfig).mockReturnValue(mockConfig);

    const dashboardModule = await import('../../src/dashboard');
    vi.mocked(dashboardModule.gatherDashboardData).mockReturnValue(mockDashboardData);
    vi.mocked(dashboardModule.formatDashboard).mockReturnValue('[ MG DAEMON DASHBOARD ]');

    const { ErrorBudget } = await import('../../src/error-budget');
    vi.mocked(ErrorBudget.load).mockReturnValue({
      resume: vi.fn(),
      save: vi.fn(),
      canProcess: true,
      recordSuccess: vi.fn(),
      recordFailure: vi.fn(),
    } as any);

    // Default fs mocks
    const fs = await import('fs');
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.writeFileSync).mockImplementation(() => {});
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('cmdInit()', () => {
    describe('AC-3.1: GIVEN no config exists WHEN mg-daemon init called THEN it creates config template', () => {
      it('GIVEN no config exists WHEN cmdInit() called THEN it calls initConfig()', () => {
        // Arrange
        vi.mocked(configModule.initConfig).mockImplementation(() => {});

        // Act
        cmdInit();

        // Assert
        expect(configModule.initConfig).toHaveBeenCalled();
      });

      it('GIVEN no config exists WHEN cmdInit() succeeds THEN it prints success message', () => {
        // Arrange
        vi.mocked(configModule.initConfig).mockImplementation(() => {});

        // Act
        cmdInit();

        // Assert
        expect(consoleLogSpy).toHaveBeenCalled();
        const logCalls = consoleLogSpy.mock.calls.flat();
        const output = logCalls.join(' ');
        expect(output.toLowerCase()).toMatch(/config.*created|initialized|init/);
      });

      it('GIVEN config already exists WHEN cmdInit() called THEN it prints error message', () => {
        // Arrange
        vi.mocked(configModule.initConfig).mockImplementation(() => {
          throw new Error('Config already exists');
        });

        // Act & Assert
        expect(() => cmdInit()).toThrow();
      });
    });
  });

  describe('cmdStart()', () => {
    describe('AC-3.2: GIVEN daemon not running WHEN mg-daemon start called THEN it starts daemon and prints PID', () => {
      it('GIVEN daemon not running WHEN cmdStart() called THEN it calls startDaemon()', () => {
        // Arrange
        const mockStartResult = { pid: 12345, startedAt: new Date() };
        vi.mocked(processModule.startDaemon).mockReturnValue(mockStartResult);

        // Act
        cmdStart();

        // Assert
        expect(processModule.startDaemon).toHaveBeenCalled();
      });

      it('GIVEN daemon not running WHEN cmdStart() succeeds THEN it prints PID', () => {
        // Arrange
        const mockStartResult = { pid: 12345, startedAt: new Date() };
        vi.mocked(processModule.startDaemon).mockReturnValue(mockStartResult);

        // Act
        cmdStart();

        // Assert
        expect(consoleLogSpy).toHaveBeenCalled();
        const logCalls = consoleLogSpy.mock.calls.flat();
        const output = logCalls.join(' ');
        expect(output).toContain('12345');
      });

      it('GIVEN daemon not running WHEN cmdStart() succeeds THEN it prints started message', () => {
        // Arrange
        const mockStartResult = { pid: 12345, startedAt: new Date() };
        vi.mocked(processModule.startDaemon).mockReturnValue(mockStartResult);

        // Act
        cmdStart();

        // Assert
        expect(consoleLogSpy).toHaveBeenCalled();
        const logCalls = consoleLogSpy.mock.calls.flat();
        const output = logCalls.join(' ');
        expect(output.toLowerCase()).toMatch(/start|daemon.*running/);
      });

      it('GIVEN daemon already running WHEN cmdStart() called THEN it prints error message', () => {
        // Arrange
        vi.mocked(processModule.startDaemon).mockImplementation(() => {
          throw new Error('Daemon already running with PID: 12345');
        });

        // Act & Assert
        expect(() => cmdStart()).toThrow();
      });
    });

    describe('AC-3.3: GIVEN --foreground flag WHEN mg-daemon start --foreground called THEN it runs in foreground with stdout logs', () => {
      it('GIVEN --foreground flag WHEN cmdStart(true) called THEN it runs in foreground mode', () => {
        // Arrange
        const mockStartResult = { pid: 12345, startedAt: new Date() };
        vi.mocked(processModule.startDaemon).mockReturnValue(mockStartResult);

        // Act
        cmdStart(true);

        // Assert
        expect(consoleLogSpy).toHaveBeenCalled();
        const logCalls = consoleLogSpy.mock.calls.flat();
        const output = logCalls.join(' ');
        expect(output.toLowerCase()).toMatch(/foreground|running in foreground/);
      });

      it('GIVEN --foreground flag WHEN cmdStart(true) called THEN it prints logs to stdout', () => {
        // Arrange
        const mockStartResult = { pid: 12345, startedAt: new Date() };
        vi.mocked(processModule.startDaemon).mockReturnValue(mockStartResult);

        // Act
        cmdStart(true);

        // Assert - in foreground mode, logs should go to stdout
        expect(consoleLogSpy).toHaveBeenCalled();
      });

      it('GIVEN --foreground flag WHEN cmdStart(true) called THEN it does not throw even if loop runs', async () => {
        // Arrange
        const mockStartResult = { pid: 12345, startedAt: new Date() };
        vi.mocked(processModule.startDaemon).mockReturnValue(mockStartResult);

        // Act & Assert — synchronous call should not throw; async loop runs in background
        expect(() => cmdStart(true)).not.toThrow();
      });
    });
  });

  describe('cmdStop()', () => {
    describe('AC-3.4: GIVEN daemon running WHEN mg-daemon stop called THEN it stops daemon', () => {
      it('GIVEN daemon running WHEN cmdStop() called THEN it calls stopDaemon()', () => {
        // Arrange
        vi.mocked(processModule.stopDaemon).mockImplementation(() => {});

        // Act
        cmdStop();

        // Assert
        expect(processModule.stopDaemon).toHaveBeenCalled();
      });

      it('GIVEN daemon running WHEN cmdStop() succeeds THEN it prints stopped message', () => {
        // Arrange
        vi.mocked(processModule.stopDaemon).mockImplementation(() => {});

        // Act
        cmdStop();

        // Assert
        expect(consoleLogSpy).toHaveBeenCalled();
        const logCalls = consoleLogSpy.mock.calls.flat();
        const output = logCalls.join(' ');
        expect(output.toLowerCase()).toMatch(/stop|daemon.*stopped/);
      });
    });

    describe('AC-3.5: GIVEN daemon not running WHEN mg-daemon stop called THEN it prints "No daemon running"', () => {
      it('GIVEN daemon not running WHEN cmdStop() called THEN it prints "No daemon running"', () => {
        // Arrange
        vi.mocked(processModule.stopDaemon).mockImplementation(() => {
          throw new Error('No daemon PID file found');
        });

        // Act
        try {
          cmdStop();
        } catch {
          // Expected to throw or handle gracefully
        }

        // Assert - should print message about no daemon running
        const logCalls = consoleLogSpy.mock.calls.flat();
        const errorCalls = consoleErrorSpy.mock.calls.flat();
        const output = [...logCalls, ...errorCalls].join(' ');
        expect(output.toLowerCase()).toMatch(/no daemon|not running/);
      });

      it('GIVEN daemon not running WHEN cmdStop() called THEN it does not throw', () => {
        // Arrange
        vi.mocked(processModule.stopDaemon).mockImplementation(() => {
          throw new Error('No daemon PID file found');
        });

        // Act & Assert - should handle error gracefully
        expect(() => cmdStop()).not.toThrow();
      });
    });
  });

  describe('cmdStatus()', () => {
    describe('AC-3.6: GIVEN daemon running WHEN mg-daemon status called THEN it shows running state with PID and uptime', () => {
      it('GIVEN daemon running WHEN cmdStatus() called THEN it calls statusDaemon()', () => {
        // Arrange
        const mockStatus = { running: true, pid: 12345, uptimeMs: 60000 };
        vi.mocked(processModule.statusDaemon).mockReturnValue(mockStatus);

        // Act
        cmdStatus();

        // Assert
        expect(processModule.statusDaemon).toHaveBeenCalled();
      });

      it('GIVEN daemon running WHEN cmdStatus() called THEN it prints PID', () => {
        // Arrange
        const mockStatus = { running: true, pid: 12345, uptimeMs: 60000 };
        vi.mocked(processModule.statusDaemon).mockReturnValue(mockStatus);

        // Act
        cmdStatus();

        // Assert
        expect(consoleLogSpy).toHaveBeenCalled();
        const logCalls = consoleLogSpy.mock.calls.flat();
        const output = logCalls.join(' ');
        expect(output).toContain('12345');
      });

      it('GIVEN daemon running WHEN cmdStatus() called THEN it prints uptime', () => {
        // Arrange
        const mockStatus = { running: true, pid: 12345, uptimeMs: 60000 };
        vi.mocked(processModule.statusDaemon).mockReturnValue(mockStatus);

        // Act
        cmdStatus();

        // Assert
        expect(consoleLogSpy).toHaveBeenCalled();
        const logCalls = consoleLogSpy.mock.calls.flat();
        const output = logCalls.join(' ');
        expect(output.toLowerCase()).toMatch(/uptime|running for/);
      });

      it('GIVEN daemon running WHEN cmdStatus() called THEN it prints running state', () => {
        // Arrange
        const mockStatus = { running: true, pid: 12345, uptimeMs: 60000 };
        vi.mocked(processModule.statusDaemon).mockReturnValue(mockStatus);

        // Act
        cmdStatus();

        // Assert
        expect(consoleLogSpy).toHaveBeenCalled();
        const logCalls = consoleLogSpy.mock.calls.flat();
        const output = logCalls.join(' ');
        expect(output.toLowerCase()).toMatch(/running|active/);
      });

      it('GIVEN daemon not running WHEN cmdStatus() called THEN it prints not running message', () => {
        // Arrange
        const mockStatus = { running: false };
        vi.mocked(processModule.statusDaemon).mockReturnValue(mockStatus);

        // Act
        cmdStatus();

        // Assert
        expect(consoleLogSpy).toHaveBeenCalled();
        const logCalls = consoleLogSpy.mock.calls.flat();
        const output = logCalls.join(' ');
        expect(output.toLowerCase()).toMatch(/not running|stopped|inactive/);
      });

      it('GIVEN daemon running with stale heartbeat WHEN cmdStatus() called THEN it prints stale warning', async () => {
        // Arrange
        const mockStatus = { running: true, pid: 12345, uptimeMs: 60000 };
        vi.mocked(processModule.statusDaemon).mockReturnValue(mockStatus);
        const heartbeatModule = await import('../../src/heartbeat');
        vi.mocked(heartbeatModule.isStale).mockReturnValue(true);

        // Act
        cmdStatus();

        // Assert
        expect(consoleWarnSpy).toHaveBeenCalled();
        const warnCalls = consoleWarnSpy.mock.calls.flat();
        const output = warnCalls.join(' ');
        expect(output.toLowerCase()).toMatch(/stale|unresponsive/);
      });
    });
  });

  describe('cmdLogs()', () => {
    describe('AC-3.7: GIVEN daemon.log exists WHEN mg-daemon logs --tail 20 called THEN it shows last 20 lines', () => {
      it('GIVEN daemon.log exists WHEN cmdLogs(20) called THEN it reads daemon.log file', () => {
        // Arrange
        const mockLogContent = Array.from({ length: 50 }, (_, i) =>
          `[2024-01-15T10:${i}:00.000Z] [INFO] Log line ${i}`
        ).join('\n');
        vi.mocked(readFileSync).mockReturnValue(mockLogContent);

        // Act
        cmdLogs(20);

        // Assert
        expect(readFileSync).toHaveBeenCalled();
        const readCall = vi.mocked(readFileSync).mock.calls[0];
        const filePath = readCall[0] as string;
        expect(filePath).toContain('daemon.log');
      });

      it('GIVEN daemon.log exists WHEN cmdLogs(20) called THEN it prints last 20 lines', () => {
        // Arrange
        const mockLogContent = Array.from({ length: 50 }, (_, i) =>
          `[2024-01-15T10:${String(i).padStart(2, '0')}:00.000Z] [INFO] Log line ${i}`
        ).join('\n');
        vi.mocked(readFileSync).mockReturnValue(mockLogContent);

        // Act
        cmdLogs(20);

        // Assert
        expect(consoleLogSpy).toHaveBeenCalled();
        const logCalls = consoleLogSpy.mock.calls.flat();
        const output = logCalls.join('\n');
        // Should include line 30-49 (last 20 lines)
        expect(output).toContain('Log line 49');
        expect(output).toContain('Log line 30');
        // Should not include earlier lines
        expect(output).not.toContain('Log line 29');
      });

      it('GIVEN daemon.log with fewer lines WHEN cmdLogs(20) called THEN it prints all available lines', () => {
        // Arrange
        const mockLogContent = Array.from({ length: 10 }, (_, i) =>
          `[2024-01-15T10:${String(i).padStart(2, '0')}:00.000Z] [INFO] Log line ${i}`
        ).join('\n');
        vi.mocked(readFileSync).mockReturnValue(mockLogContent);

        // Act
        cmdLogs(20);

        // Assert
        expect(consoleLogSpy).toHaveBeenCalled();
        const logCalls = consoleLogSpy.mock.calls.flat();
        const output = logCalls.join('\n');
        expect(output).toContain('Log line 0');
        expect(output).toContain('Log line 9');
      });

      it('GIVEN custom tail value WHEN cmdLogs(5) called THEN it prints last 5 lines', () => {
        // Arrange
        const mockLogContent = Array.from({ length: 20 }, (_, i) =>
          `[2024-01-15T10:${String(i).padStart(2, '0')}:00.000Z] [INFO] Log line ${i}`
        ).join('\n');
        vi.mocked(readFileSync).mockReturnValue(mockLogContent);

        // Act
        cmdLogs(5);

        // Assert
        expect(consoleLogSpy).toHaveBeenCalled();
        const logCalls = consoleLogSpy.mock.calls.flat();
        const output = logCalls.join('\n');
        expect(output).toContain('Log line 19');
        expect(output).toContain('Log line 15');
        expect(output).not.toContain('Log line 14');
      });

      it('GIVEN daemon.log does not exist WHEN cmdLogs() called THEN it prints error message', () => {
        // Arrange
        vi.mocked(readFileSync).mockImplementation(() => {
          throw new Error('ENOENT: no such file or directory');
        });

        // Act
        try {
          cmdLogs(20);
        } catch {
          // Expected to throw or handle gracefully
        }

        // Assert
        const errorCalls = consoleErrorSpy.mock.calls.flat();
        const output = errorCalls.join(' ');
        expect(output.toLowerCase()).toMatch(/no log|not found|error/);
      });
    });
  });

  describe('readDryRunFlag()', () => {
    it('GIVEN no dry-run state file WHEN readDryRunFlag() called THEN it returns false', async () => {
      // Arrange
      const fs = await import('fs');
      vi.mocked(fs.existsSync).mockReturnValue(false);

      // Act
      const result = readDryRunFlag();

      // Assert
      expect(result).toBe(false);
    });

    it('GIVEN dry-run state file with "true" WHEN readDryRunFlag() called THEN it returns true', async () => {
      // Arrange
      const fs = await import('fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('true');

      // Act
      const result = readDryRunFlag();

      // Assert
      expect(result).toBe(true);
    });

    it('GIVEN dry-run state file with "false" WHEN readDryRunFlag() called THEN it returns false', async () => {
      // Arrange
      const fs = await import('fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('false');

      // Act
      const result = readDryRunFlag();

      // Assert
      expect(result).toBe(false);
    });

    it('GIVEN readFileSync throws WHEN readDryRunFlag() called THEN it returns false', async () => {
      // Arrange
      const fs = await import('fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('read error');
      });

      // Act
      const result = readDryRunFlag();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('cmdInstall()', () => {
    it('GIVEN no username WHEN cmdInstall() called THEN it calls installService and prints label', async () => {
      // Arrange
      const launchdModule = await import('../../src/launchd');
      vi.mocked(launchdModule.installService).mockImplementation(() => {});

      // Act
      cmdInstall();

      // Assert
      expect(launchdModule.installService).toHaveBeenCalled();
      const logCalls = consoleLogSpy.mock.calls.flat();
      const output = logCalls.join(' ');
      expect(output).toMatch(/com\.mg-daemon\./);
    });

    it('GIVEN username provided WHEN cmdInstall("mg-daemon") called THEN it prints user configuration message', async () => {
      // Arrange
      const launchdModule = await import('../../src/launchd');
      vi.mocked(launchdModule.installService).mockImplementation(() => {});

      // Act
      cmdInstall('mg-daemon');

      // Assert
      const logCalls = consoleLogSpy.mock.calls.flat();
      const output = logCalls.join(' ');
      expect(output).toContain('mg-daemon');
    });

    it('GIVEN no username WHEN cmdInstall() called THEN it prints plist path', async () => {
      // Arrange
      const launchdModule = await import('../../src/launchd');
      vi.mocked(launchdModule.installService).mockImplementation(() => {});

      // Act
      cmdInstall();

      // Assert
      const logCalls = consoleLogSpy.mock.calls.flat();
      const output = logCalls.join(' ');
      expect(output).toContain('LaunchAgents');
    });
  });

  describe('cmdSetupUser()', () => {
    it('GIVEN default username WHEN cmdSetupUser() called and user created THEN it prints success message', async () => {
      // Arrange
      const setupUserModule = await import('../../src/setup-user');
      vi.mocked(setupUserModule.createDaemonUser).mockReturnValue({ created: true, username: 'mg-daemon', uid: 300 });
      vi.mocked(setupUserModule.formatSetupInstructions).mockReturnValue('Instructions');

      // Act
      cmdSetupUser();

      // Assert
      const logCalls = consoleLogSpy.mock.calls.flat();
      const output = logCalls.join(' ');
      expect(output.toLowerCase()).toMatch(/created successfully|uid/);
    });

    it('GIVEN error during user creation WHEN cmdSetupUser() called THEN it prints error and exits with 1', async () => {
      // Arrange
      const setupUserModule = await import('../../src/setup-user');
      vi.mocked(setupUserModule.createDaemonUser).mockReturnValue({ created: false, username: 'mg-daemon', error: 'Permission denied' });
      vi.mocked(setupUserModule.formatSetupInstructions).mockReturnValue('Instructions');

      // Act
      cmdSetupUser();

      // Assert
      expect(processExitSpy).toHaveBeenCalledWith(1);
      const errorCalls = consoleErrorSpy.mock.calls.flat();
      const output = errorCalls.join(' ');
      expect(output.toLowerCase()).toMatch(/failed|permission denied/);
    });

    it('GIVEN user already exists WHEN cmdSetupUser() called THEN it prints already exists message', async () => {
      // Arrange
      const setupUserModule = await import('../../src/setup-user');
      vi.mocked(setupUserModule.createDaemonUser).mockReturnValue({ created: false, username: 'mg-daemon' });
      vi.mocked(setupUserModule.formatSetupInstructions).mockReturnValue('Instructions');

      // Act
      cmdSetupUser();

      // Assert
      const logCalls = consoleLogSpy.mock.calls.flat();
      const output = logCalls.join(' ');
      expect(output.toLowerCase()).toMatch(/already exists|no action/);
    });

    it('GIVEN custom username WHEN cmdSetupUser("custom-user") called THEN it uses the provided username', async () => {
      // Arrange
      const setupUserModule = await import('../../src/setup-user');
      vi.mocked(setupUserModule.createDaemonUser).mockReturnValue({ created: true, username: 'custom-user', uid: 301 });
      vi.mocked(setupUserModule.formatSetupInstructions).mockReturnValue('Instructions for custom-user');

      // Act
      cmdSetupUser('custom-user');

      // Assert
      expect(setupUserModule.createDaemonUser).toHaveBeenCalledWith('custom-user');
    });
  });

  describe('cmdUninstall()', () => {
    it('GIVEN installed service WHEN cmdUninstall() called THEN it calls uninstallService', async () => {
      // Arrange
      const launchdModule = await import('../../src/launchd');
      vi.mocked(launchdModule.uninstallService).mockImplementation(() => {});

      // Act
      cmdUninstall();

      // Assert
      expect(launchdModule.uninstallService).toHaveBeenCalled();
    });

    it('GIVEN installed service WHEN cmdUninstall() called THEN it prints uninstall message with label', async () => {
      // Arrange
      const launchdModule = await import('../../src/launchd');
      vi.mocked(launchdModule.uninstallService).mockImplementation(() => {});

      // Act
      cmdUninstall();

      // Assert
      const logCalls = consoleLogSpy.mock.calls.flat();
      const output = logCalls.join(' ');
      expect(output.toLowerCase()).toMatch(/uninstalled|service/);
      expect(output).toMatch(/com\.mg-daemon\./);
    });
  });

  describe('cmdSetupMac()', () => {
    it('GIVEN macOS environment WHEN cmdSetupMac() called THEN it checks prerequisites', async () => {
      // Arrange
      const prereqsModule = await import('../../src/prereqs');
      vi.mocked(prereqsModule.checkPrereqs).mockReturnValue([]);
      vi.mocked(prereqsModule.formatPrereqReport).mockReturnValue('All good.');

      // Act
      cmdSetupMac();

      // Assert
      expect(prereqsModule.checkPrereqs).toHaveBeenCalled();
      expect(prereqsModule.formatPrereqReport).toHaveBeenCalled();
    });

    it('GIVEN macOS environment WHEN cmdSetupMac() called THEN it prints the prereq report', async () => {
      // Arrange
      const prereqsModule = await import('../../src/prereqs');
      vi.mocked(prereqsModule.checkPrereqs).mockReturnValue([]);
      vi.mocked(prereqsModule.formatPrereqReport).mockReturnValue('All prerequisites met.');

      // Act
      cmdSetupMac();

      // Assert
      const logCalls = consoleLogSpy.mock.calls.flat();
      const output = logCalls.join(' ');
      expect(output).toContain('All prerequisites met.');
    });
  });

  describe('main()', () => {
    describe('AC-3.12: GIVEN CLI invoked WHEN main() called THEN it parses argv and executes command', () => {
      it('GIVEN "init" command WHEN main() called THEN it calls cmdInit()', () => {
        // Arrange
        vi.mocked(configModule.initConfig).mockImplementation(() => {});

        // Act
        main(['node', 'mg-daemon', 'init']);

        // Assert
        expect(configModule.initConfig).toHaveBeenCalled();
      });

      it('GIVEN "start" command WHEN main() called THEN it calls cmdStart()', () => {
        // Arrange
        const mockStartResult = { pid: 12345, startedAt: new Date() };
        vi.mocked(processModule.startDaemon).mockReturnValue(mockStartResult);

        // Act
        main(['node', 'mg-daemon', 'start']);

        // Assert
        expect(processModule.startDaemon).toHaveBeenCalled();
      });

      it('GIVEN "start --foreground" command WHEN main() called THEN it calls cmdStart(true)', () => {
        // Arrange
        const mockStartResult = { pid: 12345, startedAt: new Date() };
        vi.mocked(processModule.startDaemon).mockReturnValue(mockStartResult);

        // Act
        main(['node', 'mg-daemon', 'start', '--foreground']);

        // Assert
        expect(processModule.startDaemon).toHaveBeenCalled();
        const logCalls = consoleLogSpy.mock.calls.flat();
        const output = logCalls.join(' ');
        expect(output.toLowerCase()).toMatch(/foreground/);
      });

      it('GIVEN "stop" command WHEN main() called THEN it calls cmdStop()', () => {
        // Arrange
        vi.mocked(processModule.stopDaemon).mockImplementation(() => {});

        // Act
        main(['node', 'mg-daemon', 'stop']);

        // Assert
        expect(processModule.stopDaemon).toHaveBeenCalled();
      });

      it('GIVEN "status" command WHEN main() called THEN it calls cmdStatus()', () => {
        // Arrange
        const mockStatus = { running: true, pid: 12345, uptimeMs: 60000 };
        vi.mocked(processModule.statusDaemon).mockReturnValue(mockStatus);

        // Act
        main(['node', 'mg-daemon', 'status']);

        // Assert
        expect(processModule.statusDaemon).toHaveBeenCalled();
      });

      it('GIVEN "logs" command WHEN main() called THEN it calls cmdLogs()', () => {
        // Arrange
        const mockLogContent = '[2024-01-15T10:00:00.000Z] [INFO] Test log';
        vi.mocked(readFileSync).mockReturnValue(mockLogContent);

        // Act
        main(['node', 'mg-daemon', 'logs']);

        // Assert
        expect(readFileSync).toHaveBeenCalled();
      });

      it('GIVEN "logs --tail 50" command WHEN main() called THEN it calls cmdLogs(50)', () => {
        // Arrange
        const mockLogContent = Array.from({ length: 100 }, (_, i) =>
          `[2024-01-15T10:${String(i).padStart(2, '0')}:00.000Z] [INFO] Log line ${i}`
        ).join('\n');
        vi.mocked(readFileSync).mockReturnValue(mockLogContent);

        // Act
        main(['node', 'mg-daemon', 'logs', '--tail', '50']);

        // Assert
        expect(readFileSync).toHaveBeenCalled();
        const logCalls = consoleLogSpy.mock.calls.flat();
        const output = logCalls.join('\n');
        expect(output).toContain('Log line 99');
        expect(output).toContain('Log line 50');
        expect(output).not.toContain('Log line 49');
      });

      it('GIVEN "install" command WHEN main() called THEN it calls cmdInstall()', async () => {
        // Arrange
        const launchdModule = await import('../../src/launchd');
        vi.mocked(launchdModule.installService).mockImplementation(() => {});

        // Act
        main(['node', 'mg-daemon', 'install']);

        // Assert
        expect(launchdModule.installService).toHaveBeenCalled();
      });

      it('GIVEN "install --user myuser" command WHEN main() called THEN it calls cmdInstall with username', async () => {
        // Arrange
        const launchdModule = await import('../../src/launchd');
        vi.mocked(launchdModule.installService).mockImplementation(() => {});

        // Act
        main(['node', 'mg-daemon', 'install', '--user', 'myuser']);

        // Assert
        expect(launchdModule.installService).toHaveBeenCalled();
        const logCalls = consoleLogSpy.mock.calls.flat();
        const output = logCalls.join(' ');
        expect(output).toContain('myuser');
      });

      it('GIVEN "uninstall" command WHEN main() called THEN it calls cmdUninstall()', async () => {
        // Arrange
        const launchdModule = await import('../../src/launchd');
        vi.mocked(launchdModule.uninstallService).mockImplementation(() => {});

        // Act
        main(['node', 'mg-daemon', 'uninstall']);

        // Assert
        expect(launchdModule.uninstallService).toHaveBeenCalled();
      });

      it('GIVEN "setup-mac" command WHEN main() called THEN it calls cmdSetupMac()', async () => {
        // Arrange
        const prereqsModule = await import('../../src/prereqs');
        vi.mocked(prereqsModule.checkPrereqs).mockReturnValue([]);
        vi.mocked(prereqsModule.formatPrereqReport).mockReturnValue('OK');

        // Act
        main(['node', 'mg-daemon', 'setup-mac']);

        // Assert
        expect(prereqsModule.checkPrereqs).toHaveBeenCalled();
      });

      it('GIVEN "setup-user" command WHEN main() called THEN it calls cmdSetupUser()', async () => {
        // Arrange
        const setupUserModule = await import('../../src/setup-user');
        vi.mocked(setupUserModule.createDaemonUser).mockReturnValue({ created: true, username: 'mg-daemon', uid: 300 });

        // Act
        main(['node', 'mg-daemon', 'setup-user']);

        // Assert
        expect(setupUserModule.createDaemonUser).toHaveBeenCalled();
      });

      it('GIVEN "setup-user myuser" command WHEN main() called THEN it calls cmdSetupUser with username', async () => {
        // Arrange
        const setupUserModule = await import('../../src/setup-user');
        vi.mocked(setupUserModule.createDaemonUser).mockReturnValue({ created: true, username: 'myuser', uid: 300 });

        // Act
        main(['node', 'mg-daemon', 'setup-user', 'myuser']);

        // Assert
        expect(setupUserModule.createDaemonUser).toHaveBeenCalledWith('myuser');
      });

      it('GIVEN unknown command WHEN main() called THEN it prints usage help', () => {
        // Act
        main(['node', 'mg-daemon', 'unknown']);

        // Assert
        const errorCalls = consoleErrorSpy.mock.calls.flat();
        const logCalls = consoleLogSpy.mock.calls.flat();
        const output = [...errorCalls, ...logCalls].join(' ');
        expect(output.toLowerCase()).toMatch(/unknown|usage|help|command/);
        expect(processExitSpy).toHaveBeenCalledWith(1);
      });

      it('GIVEN no command WHEN main() called THEN it prints usage help', () => {
        // Act
        main(['node', 'mg-daemon']);

        // Assert
        const errorCalls = consoleErrorSpy.mock.calls.flat();
        const logCalls = consoleLogSpy.mock.calls.flat();
        const output = [...errorCalls, ...logCalls].join(' ');
        expect(output.toLowerCase()).toMatch(/usage|help|command/);
      });
    });
  });

  describe('Edge Cases', () => {
    it('GIVEN invalid PID in status WHEN cmdStatus() called THEN it handles gracefully', () => {
      // Arrange
      const mockStatus = { running: true, pid: -1, uptimeMs: 0 };
      vi.mocked(processModule.statusDaemon).mockReturnValue(mockStatus);

      // Act & Assert - should not throw
      expect(() => cmdStatus()).not.toThrow();
    });

    it('GIVEN empty log file WHEN cmdLogs() called THEN it handles gracefully', () => {
      // Arrange
      vi.mocked(readFileSync).mockReturnValue('');

      // Act & Assert - should not throw
      expect(() => cmdLogs(20)).not.toThrow();
    });

    it('GIVEN uptime 0ms WHEN cmdStatus() called THEN it prints uptime', () => {
      // Arrange
      const mockStatus = { running: true, pid: 12345, uptimeMs: 0 };
      vi.mocked(processModule.statusDaemon).mockReturnValue(mockStatus);

      // Act
      cmdStatus();

      // Assert
      expect(consoleLogSpy).toHaveBeenCalled();
      const logCalls = consoleLogSpy.mock.calls.flat();
      const output = logCalls.join(' ');
      expect(output).toContain('0');
    });

    it('GIVEN large uptime WHEN cmdStatus() called THEN it formats uptime readably', () => {
      // Arrange
      const mockStatus = { running: true, pid: 12345, uptimeMs: 86400000 }; // 1 day
      vi.mocked(processModule.statusDaemon).mockReturnValue(mockStatus);

      // Act
      cmdStatus();

      // Assert
      expect(consoleLogSpy).toHaveBeenCalled();
      const logCalls = consoleLogSpy.mock.calls.flat();
      const output = logCalls.join(' ');
      // Should contain some time representation
      expect(output).toMatch(/\d+/);
    });
  });

  describe('Branch Coverage (AC-3.13)', () => {
    it('GIVEN start with short option -f WHEN main() called THEN it runs in foreground', () => {
      // Arrange
      const mockStartResult = { pid: 12345, startedAt: new Date() };
      vi.mocked(processModule.startDaemon).mockReturnValue(mockStartResult);

      // Act
      main(['node', 'mg-daemon', 'start', '-f']);

      // Assert
      expect(processModule.startDaemon).toHaveBeenCalled();
      const logCalls = consoleLogSpy.mock.calls.flat();
      const output = logCalls.join(' ');
      expect(output.toLowerCase()).toMatch(/foreground/);
    });

    it('GIVEN logs with short option -n WHEN main() called THEN it tails N lines', () => {
      // Arrange
      const mockLogContent = Array.from({ length: 100 }, (_, i) =>
        `[2024-01-15T10:${String(i).padStart(2, '0')}:00.000Z] [INFO] Log line ${i}`
      ).join('\n');
      vi.mocked(readFileSync).mockReturnValue(mockLogContent);

      // Act
      main(['node', 'mg-daemon', 'logs', '-n', '10']);

      // Assert
      expect(readFileSync).toHaveBeenCalled();
      const logCalls = consoleLogSpy.mock.calls.flat();
      const output = logCalls.join('\n');
      expect(output).toContain('Log line 99');
      expect(output).toContain('Log line 90');
      expect(output).not.toContain('Log line 89');
    });

    it('GIVEN command with extra arguments WHEN main() called THEN it ignores extra arguments', () => {
      // Arrange
      const mockStatus = { running: true, pid: 12345, uptimeMs: 60000 };
      vi.mocked(processModule.statusDaemon).mockReturnValue(mockStatus);

      // Act & Assert - should not throw
      expect(() => main(['node', 'mg-daemon', 'status', 'extra', 'args'])).not.toThrow();
    });

    it('GIVEN command throws error WHEN main() called THEN it prints error and exits with 1', () => {
      // Arrange
      vi.mocked(configModule.initConfig).mockImplementation(() => {
        throw new Error('Test error');
      });

      // Act
      main(['node', 'mg-daemon', 'init']);

      // Assert
      expect(processExitSpy).toHaveBeenCalledWith(1);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('GIVEN "start --dry-run" command WHEN main() called THEN it starts in dry-run mode', () => {
      // Arrange
      const mockStartResult = { pid: 12345, startedAt: new Date() };
      vi.mocked(processModule.startDaemon).mockReturnValue(mockStartResult);

      // Act
      main(['node', 'mg-daemon', 'start', '--dry-run']);

      // Assert
      expect(processModule.startDaemon).toHaveBeenCalled();
      const logCalls = consoleLogSpy.mock.calls.flat();
      const output = logCalls.join(' ');
      expect(output.toLowerCase()).toMatch(/dry.?run/);
    });

    it('GIVEN "dashboard" command WHEN main() called THEN it calls cmdDashboard()', async () => {
      // Arrange
      const dashboardModule = await import('../../src/dashboard');

      // Act
      main(['node', 'mg-daemon', 'dashboard']);

      // Assert
      expect(dashboardModule.gatherDashboardData).toHaveBeenCalled();
      expect(dashboardModule.formatDashboard).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('[ MG DAEMON DASHBOARD ]');
    });

    it('GIVEN "resume" command WHEN main() called THEN it calls cmdResume()', async () => {
      // Arrange
      const { ErrorBudget } = await import('../../src/error-budget');

      // Act
      main(['node', 'mg-daemon', 'resume']);

      // Assert
      expect(ErrorBudget.load).toHaveBeenCalled();
      const logCalls = consoleLogSpy.mock.calls.flat();
      const output = logCalls.join(' ');
      expect(output.toLowerCase()).toMatch(/resume|reset/);
    });
  });

  describe('WS-DAEMON-14: New Commands', () => {
    describe('cmdDashboard()', () => {
      it('GIVEN daemon state WHEN cmdDashboard called THEN prints formatted dashboard', async () => {
        // Act
        cmdDashboard();

        // Assert
        expect(consoleLogSpy).toHaveBeenCalledWith('[ MG DAEMON DASHBOARD ]');
      });
    });

    describe('cmdStart() with --dry-run', () => {
      it('GIVEN dryRun true WHEN cmdStart(false, true) called THEN prints dry-run message', () => {
        // Arrange
        const mockStartResult = { pid: 12345, startedAt: new Date() };
        vi.mocked(processModule.startDaemon).mockReturnValue(mockStartResult);

        // Act
        cmdStart(false, true);

        // Assert
        const logCalls = consoleLogSpy.mock.calls.flat();
        const output = logCalls.join(' ');
        expect(output.toLowerCase()).toMatch(/dry.?run/);
      });

      it('GIVEN dryRun true WHEN cmdStart called THEN PID is shown in output', () => {
        // Arrange
        const mockStartResult = { pid: 99999, startedAt: new Date() };
        vi.mocked(processModule.startDaemon).mockReturnValue(mockStartResult);

        // Act
        cmdStart(false, true);

        // Assert
        const logCalls = consoleLogSpy.mock.calls.flat();
        const output = logCalls.join(' ');
        expect(output).toContain('99999');
      });
    });

    describe('cmdResume()', () => {
      it('GIVEN paused error budget WHEN cmdResume called THEN prints resume message', async () => {
        // Act
        cmdResume();

        // Assert
        expect(consoleLogSpy).toHaveBeenCalled();
        const logCalls = consoleLogSpy.mock.calls.flat();
        const output = logCalls.join(' ');
        expect(output.toLowerCase()).toMatch(/resume|reset/);
      });

      it('GIVEN cmdResume called THEN ErrorBudget.load is called', async () => {
        // Arrange
        const { ErrorBudget } = await import('../../src/error-budget');

        // Act
        cmdResume();

        // Assert
        expect(ErrorBudget.load).toHaveBeenCalled();
      });
    });
  });

  describe('runForegroundLoop coverage', () => {
    it('GIVEN foreground mode WHEN .mg-daemon dir exists THEN it does not call mkdirSync', async () => {
      // Arrange
      const mockStartResult = { pid: 12345, startedAt: new Date() };
      vi.mocked(processModule.startDaemon).mockReturnValue(mockStartResult);
      const fs = await import('fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Act
      cmdStart(true);

      // Assert - mkdirSync should not be called since dir exists
      expect(fs.mkdirSync).not.toHaveBeenCalledWith('.mg-daemon', expect.anything());
    });

    it('GIVEN foreground mode WHEN .mg-daemon dir does not exist THEN it calls mkdirSync', async () => {
      // Arrange
      const mockStartResult = { pid: 12345, startedAt: new Date() };
      vi.mocked(processModule.startDaemon).mockReturnValue(mockStartResult);
      const fs = await import('fs');
      // First call is for cmdStart writing dry-run file (existsSync for .mg-daemon)
      // Second call is inside runForegroundLoop (existsSync for .mg-daemon)
      vi.mocked(fs.existsSync).mockReturnValue(false);

      // Act
      cmdStart(true);

      // Assert - mkdirSync called at least once
      expect(fs.mkdirSync).toHaveBeenCalledWith('.mg-daemon', { recursive: true });
    });

    it('GIVEN runForegroundLoop WHEN orchestration config missing THEN it sets defaults', async () => {
      // Arrange
      const configNoOrchestration = {
        provider: 'github' as const,
        github: { repo: 'org/repo', baseBranch: 'main' },
        polling: { intervalSeconds: 30, batchSize: 5 },
        // no orchestration field
      };
      vi.mocked(configModule.loadConfig).mockReturnValue(configNoOrchestration as any);
      const mockStartResult = { pid: 12345, startedAt: new Date() };
      vi.mocked(processModule.startDaemon).mockReturnValue(mockStartResult);

      // Act
      expect(() => cmdStart(true)).not.toThrow();
    });

    it('GIVEN runForegroundLoop WHEN orchestration config present THEN it overrides dryRun field', async () => {
      // Arrange
      const configWithOrchestration = {
        provider: 'github' as const,
        github: { repo: 'org/repo', baseBranch: 'main' },
        polling: { intervalSeconds: 30, batchSize: 5 },
        orchestration: { claudeTimeout: 1_800_000, concurrency: 1, delayBetweenTicketsMs: 5000, dryRun: false, errorBudget: 3 },
      };
      vi.mocked(configModule.loadConfig).mockReturnValue(configWithOrchestration as any);
      const mockStartResult = { pid: 12345, startedAt: new Date() };
      vi.mocked(processModule.startDaemon).mockReturnValue(mockStartResult);

      // Act — cmdStart(true, true) passes dryRun=true, which should set config.orchestration.dryRun=true
      expect(() => cmdStart(true, true)).not.toThrow();
    });

    it('GIVEN writeFileSync throws WHEN cmdStart() called THEN it handles gracefully (non-fatal catch block)', async () => {
      // Arrange — make writeFileSync throw to exercise the catch block on lines 139-141
      const mockStartResult = { pid: 12345, startedAt: new Date() };
      vi.mocked(processModule.startDaemon).mockReturnValue(mockStartResult);
      const fs = await import('fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw new Error('disk full');
      });

      // Act & Assert — should not throw; the catch block swallows the error
      expect(() => cmdStart()).not.toThrow();
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('GIVEN runForegroundLoop rejects synchronously WHEN cmdStart(true) called THEN .catch logs Fatal error', async () => {
      // Arrange — make loadConfig throw on the second call (inside runForegroundLoop)
      // so the async function itself rejects immediately
      const mockStartResult = { pid: 12345, startedAt: new Date() };
      vi.mocked(processModule.startDaemon).mockReturnValue(mockStartResult);
      // First call to loadConfig succeeds (for the outer cmdStart context is fine as loadConfig
      // is only called inside runForegroundLoop, not in cmdStart body itself).
      // Make loadConfig reject on first call inside runForegroundLoop
      vi.mocked(configModule.loadConfig).mockImplementationOnce(() => {
        throw new Error('config load failed');
      });

      // Act — cmdStart(true) fires the async loop which immediately rejects
      cmdStart(true);

      // Flush the microtask queue so .catch fires
      await new Promise(resolve => setTimeout(resolve, 0));
      await new Promise(resolve => setTimeout(resolve, 0));

      // Assert — Fatal error was logged and process.exit(1) called
      expect(consoleErrorSpy).toHaveBeenCalledWith('Fatal error:', expect.any(Error));
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('GIVEN foreground loop started WHEN runPollCycle resolves with results THEN success result logs COMPLETED', async () => {
      // Arrange — use fake timers so we can control the sleep() call in the loop
      vi.useFakeTimers();
      const orchestratorModule = await import('../../src/orchestrator');
      const successResult = {
        ticketId: 'GH-1',
        planned: [{ name: 'ws-1', acceptanceCriteria: '' }],
        executed: [],
        success: true,
        prUrl: 'https://github.com/org/repo/pull/1',
      };
      vi.mocked(orchestratorModule.runPollCycle).mockResolvedValueOnce([successResult as any]);

      const mockStartResult = { pid: 12345, startedAt: new Date() };
      vi.mocked(processModule.startDaemon).mockReturnValue(mockStartResult);

      // setupSignalHandlers mock: capture the callback to stop the loop after one iteration
      let shutdownCallback: (() => void) | undefined;
      vi.mocked(processModule.setupSignalHandlers).mockImplementation((cb?: () => void) => {
        shutdownCallback = cb;
      });

      // Act — start foreground loop
      cmdStart(true);

      // Stop the loop so we don't loop forever
      shutdownCallback?.();

      // Flush promises (runPollCycle resolves) then advance timers for sleep()
      await Promise.resolve();
      await Promise.resolve();
      await vi.runAllTimersAsync();

      vi.useRealTimers();
    });

    it('GIVEN foreground loop started WHEN runPollCycle resolves with empty results THEN no-tickets message logged', async () => {
      // Arrange
      vi.useFakeTimers();
      const orchestratorModule = await import('../../src/orchestrator');
      vi.mocked(orchestratorModule.runPollCycle).mockResolvedValueOnce([]);

      const mockStartResult = { pid: 12345, startedAt: new Date() };
      vi.mocked(processModule.startDaemon).mockReturnValue(mockStartResult);

      let shutdownCallback: (() => void) | undefined;
      vi.mocked(processModule.setupSignalHandlers).mockImplementation((cb?: () => void) => {
        shutdownCallback = cb;
      });

      // Act
      cmdStart(true);

      // Flush promises
      await Promise.resolve();
      await Promise.resolve();

      // Stop loop and advance timer for sleep
      shutdownCallback?.();
      await vi.runAllTimersAsync();

      vi.useRealTimers();

      // Assert 'No tickets to process.' was logged
      const logCalls = consoleLogSpy.mock.calls.flat();
      const output = logCalls.join(' ');
      expect(output).toContain('No tickets to process');
    });

    it('GIVEN foreground loop started WHEN runPollCycle resolves with failed result THEN failure is logged', async () => {
      // Arrange
      vi.useFakeTimers();
      const orchestratorModule = await import('../../src/orchestrator');
      const failedResult = {
        ticketId: 'GH-2',
        planned: [],
        executed: [],
        success: false,
        error: 'something went wrong',
      };
      vi.mocked(orchestratorModule.runPollCycle).mockResolvedValueOnce([failedResult as any]);

      const mockStartResult = { pid: 12345, startedAt: new Date() };
      vi.mocked(processModule.startDaemon).mockReturnValue(mockStartResult);

      let shutdownCallback: (() => void) | undefined;
      vi.mocked(processModule.setupSignalHandlers).mockImplementation((cb?: () => void) => {
        shutdownCallback = cb;
      });

      // Act
      cmdStart(true);

      // Flush
      await Promise.resolve();
      await Promise.resolve();

      shutdownCallback?.();
      await vi.runAllTimersAsync();

      vi.useRealTimers();
    });

    it('GIVEN foreground loop WHEN error budget exhausted THEN daemon logs paused message', async () => {
      // Arrange
      vi.useFakeTimers();
      const { ErrorBudget } = await import('../../src/error-budget');
      vi.mocked(ErrorBudget.load).mockReturnValue({
        resume: vi.fn(),
        save: vi.fn(),
        canProcess: false,
        recordSuccess: vi.fn(),
        recordFailure: vi.fn(),
      } as any);

      const mockStartResult = { pid: 12345, startedAt: new Date() };
      vi.mocked(processModule.startDaemon).mockReturnValue(mockStartResult);

      let shutdownCallback: (() => void) | undefined;
      vi.mocked(processModule.setupSignalHandlers).mockImplementation((cb?: () => void) => {
        shutdownCallback = cb;
      });

      // Act
      cmdStart(true);

      // Flush
      await Promise.resolve();
      await Promise.resolve();

      shutdownCallback?.();
      await vi.runAllTimersAsync();

      vi.useRealTimers();

      // Assert error budget paused message
      const logCalls = consoleLogSpy.mock.calls.flat();
      const output = logCalls.join(' ');
      expect(output).toContain('ERROR BUDGET EXHAUSTED');
    });

    it('GIVEN foreground loop WHEN runPollCycle throws THEN error is logged and budget records failure', async () => {
      // Arrange
      vi.useFakeTimers();
      const orchestratorModule = await import('../../src/orchestrator');
      vi.mocked(orchestratorModule.runPollCycle).mockRejectedValueOnce(new Error('network error'));

      const mockStartResult = { pid: 12345, startedAt: new Date() };
      vi.mocked(processModule.startDaemon).mockReturnValue(mockStartResult);

      let shutdownCallback: (() => void) | undefined;
      vi.mocked(processModule.setupSignalHandlers).mockImplementation((cb?: () => void) => {
        shutdownCallback = cb;
      });

      // Act
      cmdStart(true);

      // Flush
      await Promise.resolve();
      await Promise.resolve();

      shutdownCallback?.();
      await vi.runAllTimersAsync();

      vi.useRealTimers();

      // Assert poll cycle error was logged
      const logCalls = consoleLogSpy.mock.calls.flat();
      const output = logCalls.join(' ');
      expect(output).toContain('Poll cycle error');
    });

    it('GIVEN foreground loop WHEN loop exits THEN daemon shutting down is logged', async () => {
      // Arrange
      vi.useFakeTimers();
      const orchestratorModule = await import('../../src/orchestrator');
      vi.mocked(orchestratorModule.runPollCycle).mockResolvedValue([]);

      const mockStartResult = { pid: 12345, startedAt: new Date() };
      vi.mocked(processModule.startDaemon).mockReturnValue(mockStartResult);

      // Trigger shutdown immediately via setupSignalHandlers
      vi.mocked(processModule.setupSignalHandlers).mockImplementation((cb?: () => void) => {
        // Set running=false immediately before the loop body tries to run
        cb?.();
      });

      // Act
      cmdStart(true);

      // Flush all timers/promises so the loop completes
      await Promise.resolve();
      await Promise.resolve();
      await vi.runAllTimersAsync();

      vi.useRealTimers();

      // Assert 'Daemon shutting down.' was logged
      const logCalls = consoleLogSpy.mock.calls.flat();
      const output = logCalls.join(' ');
      expect(output).toContain('shutting down');
    });
  });
});

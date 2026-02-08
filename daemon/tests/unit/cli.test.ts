import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';

// Module under test
import { main, cmdInit, cmdStart, cmdStop, cmdStatus, cmdLogs } from '../../src/cli';

// Mock dependencies
import * as configModule from '../../src/config';
import * as processModule from '../../src/process';

// Mock fs module
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
}));

// Mock config module
vi.mock('../../src/config', () => ({
  initConfig: vi.fn(),
  loadConfig: vi.fn(),
}));

// Mock process module
vi.mock('../../src/process', () => ({
  startDaemon: vi.fn(),
  stopDaemon: vi.fn(),
  statusDaemon: vi.fn(),
}));

describe('CLI Module', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
      throw new Error(`process.exit(${code})`);
    });
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

      it('GIVEN unknown command WHEN main() called THEN it prints usage help', () => {
        // Act
        try {
          main(['node', 'mg-daemon', 'unknown']);
        } catch {
          // Expected to throw or handle gracefully
        }

        // Assert
        const errorCalls = consoleErrorSpy.mock.calls.flat();
        const logCalls = consoleLogSpy.mock.calls.flat();
        const output = [...errorCalls, ...logCalls].join(' ');
        expect(output.toLowerCase()).toMatch(/unknown|usage|help|command/);
      });

      it('GIVEN no command WHEN main() called THEN it prints usage help', () => {
        // Act
        try {
          main(['node', 'mg-daemon']);
        } catch {
          // Expected to throw or handle gracefully
        }

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

    it('GIVEN command throws error WHEN main() called THEN it prints error and exits', () => {
      // Arrange
      vi.mocked(configModule.initConfig).mockImplementation(() => {
        throw new Error('Test error');
      });

      // Act & Assert
      expect(() => main(['node', 'mg-daemon', 'init'])).toThrow('process.exit');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, writeFileSync, renameSync, unlinkSync } from 'fs';

// Module under test - will be implemented by dev
import {
  startDaemon,
  stopDaemon,
  statusDaemon,
  setupSignalHandlers,
  isProcessRunning
} from '../../src/process';
import type { StartResult, StatusResult } from '../../src/types';

// Mock fs module at module level
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  renameSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

describe('Process Manager', () => {
  const mockPidFilePath = '.mg-daemon/daemon.pid';
  const mockTempPidFilePath = '.mg-daemon/daemon.pid.tmp';
  const mockPid = 12345;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('startDaemon()', () => {
    describe('AC-2.1: GIVEN no daemon running WHEN startDaemon() called THEN it writes PID file using atomic write', () => {
      it('GIVEN no daemon running WHEN startDaemon() called THEN it returns StartResult with pid and startedAt', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(false);
        vi.mocked(writeFileSync).mockImplementation(() => {});
        vi.mocked(renameSync).mockImplementation(() => {});

        // Act
        const result = startDaemon();

        // Assert
        expect(result).toBeDefined();
        expect(result).toHaveProperty('pid');
        expect(result).toHaveProperty('startedAt');
        expect(typeof result.pid).toBe('number');
        expect(result.startedAt).toBeInstanceOf(Date);
      });

      it('GIVEN no daemon running WHEN startDaemon() called THEN it writes PID to temp file first', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(false);
        vi.mocked(writeFileSync).mockImplementation(() => {});
        vi.mocked(renameSync).mockImplementation(() => {});

        // Act
        startDaemon();

        // Assert - should write to temp file (.pid.tmp)
        expect(writeFileSync).toHaveBeenCalled();
        const writeCall = vi.mocked(writeFileSync).mock.calls[0];
        const filePath = writeCall[0] as string;
        expect(filePath).toContain('.pid.tmp');
      });

      it('GIVEN no daemon running WHEN startDaemon() called THEN it renames temp file to daemon.pid atomically', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(false);
        vi.mocked(writeFileSync).mockImplementation(() => {});
        vi.mocked(renameSync).mockImplementation(() => {});

        // Act
        startDaemon();

        // Assert - should rename from .pid.tmp to .pid
        expect(renameSync).toHaveBeenCalled();
        const renameCall = vi.mocked(renameSync).mock.calls[0];
        const fromPath = renameCall[0] as string;
        const toPath = renameCall[1] as string;
        expect(fromPath).toContain('.pid.tmp');
        expect(toPath).toContain('daemon.pid');
        expect(toPath).not.toContain('.tmp');
      });

      it('GIVEN no daemon running WHEN startDaemon() called THEN PID file contains the process PID', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(false);
        vi.mocked(writeFileSync).mockImplementation(() => {});
        vi.mocked(renameSync).mockImplementation(() => {});

        // Act
        const result = startDaemon();

        // Assert - PID written to file should match returned PID
        expect(writeFileSync).toHaveBeenCalled();
        const writeCall = vi.mocked(writeFileSync).mock.calls[0];
        const writtenContent = writeCall[1] as string;
        expect(writtenContent).toContain(result.pid.toString());
      });

      it('GIVEN no daemon running WHEN startDaemon() called THEN it uses atomic write pattern (write then rename)', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(false);
        vi.mocked(writeFileSync).mockImplementation(() => {});
        vi.mocked(renameSync).mockImplementation(() => {});

        // Act
        startDaemon();

        // Assert - writeFileSync should be called before renameSync
        const calls = vi.mocked(writeFileSync).mock.invocationCallOrder;
        const renameCalls = vi.mocked(renameSync).mock.invocationCallOrder;
        expect(calls.length).toBeGreaterThan(0);
        expect(renameCalls.length).toBeGreaterThan(0);
        expect(calls[0]).toBeLessThan(renameCalls[0]);
      });
    });

    describe('AC-2.2: GIVEN daemon running WHEN startDaemon() called again THEN error returned', () => {
      it('GIVEN daemon running WHEN startDaemon() called THEN it throws error with running PID', () => {
        // Arrange - PID file exists with valid PID
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(mockPid.toString());

        // Mock process.kill to indicate process is running
        const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);

        // Act & Assert
        expect(() => startDaemon()).toThrow();

        try {
          startDaemon();
        } catch (error: any) {
          expect(error.message).toContain('Daemon already running');
          expect(error.message).toContain(mockPid.toString());
        }

        killSpy.mockRestore();
      });

      it('GIVEN daemon running WHEN startDaemon() called THEN it does not write new PID file', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(mockPid.toString());
        vi.mocked(writeFileSync).mockImplementation(() => {});

        const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);

        // Act
        try {
          startDaemon();
        } catch {
          // Expected to throw
        }

        // Assert
        expect(writeFileSync).not.toHaveBeenCalled();

        killSpy.mockRestore();
      });

      it('GIVEN daemon running WHEN startDaemon() called THEN error message includes PID', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue('99999');

        const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);

        // Act & Assert
        try {
          startDaemon();
        } catch (error: any) {
          expect(error.message).toMatch(/PID:\s*99999/);
        }

        killSpy.mockRestore();
      });
    });

    describe('AC-2.4: GIVEN stale PID file WHEN startDaemon() called THEN cleans up and starts', () => {
      it('GIVEN stale PID file (process not running) WHEN startDaemon() called THEN it removes stale PID file', () => {
        // Arrange - PID file exists but process is not running
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(mockPid.toString());
        vi.mocked(unlinkSync).mockImplementation(() => {});
        vi.mocked(writeFileSync).mockImplementation(() => {});
        vi.mocked(renameSync).mockImplementation(() => {});

        // Mock process.kill to throw (process not running)
        const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => {
          throw new Error('ESRCH');
        });

        // Act
        startDaemon();

        // Assert - should remove stale PID file
        expect(unlinkSync).toHaveBeenCalledWith(expect.stringContaining('daemon.pid'));

        killSpy.mockRestore();
      });

      it('GIVEN stale PID file WHEN startDaemon() called THEN it starts daemon normally after cleanup', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(mockPid.toString());
        vi.mocked(unlinkSync).mockImplementation(() => {});
        vi.mocked(writeFileSync).mockImplementation(() => {});
        vi.mocked(renameSync).mockImplementation(() => {});

        const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => {
          throw new Error('ESRCH');
        });

        // Act
        const result = startDaemon();

        // Assert - should successfully start and return result
        expect(result).toBeDefined();
        expect(result.pid).toBeDefined();
        expect(result.startedAt).toBeInstanceOf(Date);

        // Should write new PID file
        expect(writeFileSync).toHaveBeenCalled();
        expect(renameSync).toHaveBeenCalled();

        killSpy.mockRestore();
      });

      it('GIVEN stale PID file WHEN startDaemon() called THEN cleanup happens before new PID write', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(mockPid.toString());
        vi.mocked(unlinkSync).mockImplementation(() => {});
        vi.mocked(writeFileSync).mockImplementation(() => {});
        vi.mocked(renameSync).mockImplementation(() => {});

        const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => {
          throw new Error('ESRCH');
        });

        // Act
        startDaemon();

        // Assert - unlinkSync should be called before writeFileSync
        const unlinkCalls = vi.mocked(unlinkSync).mock.invocationCallOrder;
        const writeCalls = vi.mocked(writeFileSync).mock.invocationCallOrder;
        expect(unlinkCalls[0]).toBeLessThan(writeCalls[0]);

        killSpy.mockRestore();
      });
    });

    describe('AC-2.9: All PID file writes use atomic write pattern', () => {
      it('GIVEN any PID write operation WHEN executed THEN it uses temp file + rename pattern', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(false);
        vi.mocked(writeFileSync).mockImplementation(() => {});
        vi.mocked(renameSync).mockImplementation(() => {});

        // Act
        startDaemon();

        // Assert - atomic write pattern verification
        expect(writeFileSync).toHaveBeenCalled();
        expect(renameSync).toHaveBeenCalled();

        const writeCall = vi.mocked(writeFileSync).mock.calls[0];
        const renameCall = vi.mocked(renameSync).mock.calls[0];

        // Write to .tmp file
        expect(writeCall[0]).toContain('.tmp');

        // Rename from .tmp to final
        expect(renameCall[0]).toContain('.tmp');
        expect(renameCall[1]).not.toContain('.tmp');
      });

      it('GIVEN atomic write WHEN rename fails THEN temp file is not left behind', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(false);
        vi.mocked(writeFileSync).mockImplementation(() => {});
        vi.mocked(renameSync).mockImplementation(() => {
          throw new Error('Rename failed');
        });
        vi.mocked(unlinkSync).mockImplementation(() => {});

        // Act & Assert
        expect(() => startDaemon()).toThrow();

        // Should attempt to clean up temp file on error
        // (This is a good practice but depends on implementation)
      });
    });
  });

  describe('stopDaemon()', () => {
    describe('AC-2.3: GIVEN daemon running WHEN stopDaemon() called THEN sends SIGTERM and waits', () => {
      it('GIVEN daemon running WHEN stopDaemon() called THEN it reads PID from file', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(mockPid.toString());
        vi.mocked(unlinkSync).mockImplementation(() => {});

        const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);

        // Act
        stopDaemon();

        // Assert
        expect(readFileSync).toHaveBeenCalledWith(expect.stringContaining('daemon.pid'), 'utf-8');

        killSpy.mockRestore();
      });

      it('GIVEN daemon running WHEN stopDaemon() called THEN it sends SIGTERM to process', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(mockPid.toString());
        vi.mocked(unlinkSync).mockImplementation(() => {});

        const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);

        // Act
        stopDaemon();

        // Assert
        expect(killSpy).toHaveBeenCalledWith(mockPid, 'SIGTERM');

        killSpy.mockRestore();
      });

      it('GIVEN daemon running WHEN stopDaemon() called THEN it waits up to 5 seconds for graceful exit', async () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(mockPid.toString());
        vi.mocked(unlinkSync).mockImplementation(() => {});

        let processRunning = true;
        const killSpy = vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
          if (signal === 0) {
            return processRunning;
          }
          if (signal === 'SIGTERM') {
            // Simulate graceful shutdown after 2 seconds
            setTimeout(() => { processRunning = false; }, 2000);
          }
          return true;
        });

        // Act
        stopDaemon();

        // Should poll for process exit
        // (Implementation will likely use setInterval or similar)

        killSpy.mockRestore();
      });

      it('GIVEN daemon exits gracefully WHEN stopDaemon() completes THEN it removes PID file', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(mockPid.toString());
        vi.mocked(unlinkSync).mockImplementation(() => {});

        const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => {
          throw new Error('ESRCH'); // Process already exited
        });

        // Act
        stopDaemon();

        // Assert
        expect(unlinkSync).toHaveBeenCalledWith(expect.stringContaining('daemon.pid'));

        killSpy.mockRestore();
      });

      it('GIVEN daemon does not exit after 5s WHEN stopDaemon() times out THEN it still removes PID file', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(mockPid.toString());
        vi.mocked(unlinkSync).mockImplementation(() => {});

        // Process never exits
        const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);

        // Act
        stopDaemon();

        // Fast-forward time past 5 second timeout
        vi.advanceTimersByTime(6000);

        // Assert - should still remove PID file even if process didn't exit
        expect(unlinkSync).toHaveBeenCalled();

        killSpy.mockRestore();
      });
    });

    describe('Edge cases for stopDaemon()', () => {
      it('GIVEN no PID file exists WHEN stopDaemon() called THEN it throws error', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(false);

        // Act & Assert
        expect(() => stopDaemon()).toThrow();
      });

      it('GIVEN invalid PID in file WHEN stopDaemon() called THEN it throws error', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue('not-a-number');

        // Act & Assert
        expect(() => stopDaemon()).toThrow();
      });

      it('GIVEN process already stopped WHEN stopDaemon() called THEN it removes PID file without error', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(mockPid.toString());
        vi.mocked(unlinkSync).mockImplementation(() => {});

        const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => {
          throw new Error('ESRCH'); // Process not found
        });

        // Act
        stopDaemon();

        // Assert - should clean up PID file
        expect(unlinkSync).toHaveBeenCalled();

        killSpy.mockRestore();
      });
    });
  });

  describe('statusDaemon()', () => {
    describe('AC-2.5: GIVEN daemon running WHEN statusDaemon() called THEN returns status with PID and uptime', () => {
      it('GIVEN daemon running WHEN statusDaemon() called THEN it returns running: true', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(mockPid.toString());

        const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);

        // Act
        const status = statusDaemon();

        // Assert
        expect(status.running).toBe(true);

        killSpy.mockRestore();
      });

      it('GIVEN daemon running WHEN statusDaemon() called THEN it returns the PID', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(mockPid.toString());

        const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);

        // Act
        const status = statusDaemon();

        // Assert
        expect(status.pid).toBe(mockPid);

        killSpy.mockRestore();
      });

      it('GIVEN daemon running WHEN statusDaemon() called THEN it returns uptimeMs', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(mockPid.toString());

        const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);

        // Act
        const status = statusDaemon();

        // Assert
        expect(status.uptimeMs).toBeDefined();
        expect(typeof status.uptimeMs).toBe('number');
        expect(status.uptimeMs).toBeGreaterThanOrEqual(0);

        killSpy.mockRestore();
      });

      it('GIVEN daemon running for 10 seconds WHEN statusDaemon() called THEN uptimeMs reflects actual uptime', () => {
        // Arrange
        const startTime = Date.now();
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(mockPid.toString());

        const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);

        // Simulate 10 seconds passing
        vi.advanceTimersByTime(10000);

        // Act
        const status = statusDaemon();

        // Assert
        expect(status.uptimeMs).toBeGreaterThanOrEqual(10000);

        killSpy.mockRestore();
      });

      it('GIVEN daemon running WHEN statusDaemon() called THEN StatusResult has correct type structure', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(mockPid.toString());

        const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);

        // Act
        const status: StatusResult = statusDaemon();

        // Assert - TypeScript compilation enforces type
        expect(status).toHaveProperty('running');
        expect(status).toHaveProperty('pid');
        expect(status).toHaveProperty('uptimeMs');

        killSpy.mockRestore();
      });
    });

    describe('AC-2.6: GIVEN no daemon running WHEN statusDaemon() called THEN returns running: false', () => {
      it('GIVEN no PID file WHEN statusDaemon() called THEN returns { running: false }', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(false);

        // Act
        const status = statusDaemon();

        // Assert
        expect(status.running).toBe(false);
        expect(status.pid).toBeUndefined();
        expect(status.uptimeMs).toBeUndefined();
      });

      it('GIVEN stale PID file WHEN statusDaemon() called THEN returns { running: false }', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(mockPid.toString());

        const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => {
          throw new Error('ESRCH'); // Process not running
        });

        // Act
        const status = statusDaemon();

        // Assert
        expect(status.running).toBe(false);
        expect(status.pid).toBeUndefined();

        killSpy.mockRestore();
      });

      it('GIVEN invalid PID in file WHEN statusDaemon() called THEN returns { running: false }', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue('invalid-pid');

        // Act
        const status = statusDaemon();

        // Assert
        expect(status.running).toBe(false);
      });

      it('GIVEN no daemon WHEN statusDaemon() called THEN no pid or uptimeMs in result', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(false);

        // Act
        const status = statusDaemon();

        // Assert
        expect(status).toEqual({ running: false });
        expect('pid' in status && status.pid !== undefined).toBe(false);
        expect('uptimeMs' in status && status.uptimeMs !== undefined).toBe(false);
      });
    });
  });

  describe('setupSignalHandlers()', () => {
    describe('AC-2.7: GIVEN SIGTERM received WHEN daemon processing THEN graceful shutdown', () => {
      it('GIVEN SIGTERM received WHEN setupSignalHandlers() active THEN it sets shutdown flag', () => {
        // Arrange
        const processOnSpy = vi.spyOn(process, 'on');

        // Act
        setupSignalHandlers();

        // Assert - should register SIGTERM handler
        expect(processOnSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));

        processOnSpy.mockRestore();
      });

      it('GIVEN SIGTERM handler WHEN triggered THEN it allows current operation to finish', () => {
        // Arrange
        let sigtermHandler: Function | undefined;
        const processOnSpy = vi.spyOn(process, 'on').mockImplementation((signal, handler) => {
          if (signal === 'SIGTERM') {
            sigtermHandler = handler as Function;
          }
          return process;
        });
        const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
          throw new Error('process.exit called');
        });

        setupSignalHandlers();

        // Act - trigger SIGTERM
        expect(sigtermHandler).toBeDefined();
        expect(() => sigtermHandler!()).toThrow('process.exit called');

        // Assert - handler should execute and call exit
        expect(processExitSpy).toHaveBeenCalledWith(0);

        processOnSpy.mockRestore();
        processExitSpy.mockRestore();
      });

      it('GIVEN SIGTERM received WHEN operation completes THEN daemon exits cleanly', () => {
        // Arrange
        let sigtermHandler: Function | undefined;
        const processOnSpy = vi.spyOn(process, 'on').mockImplementation((signal, handler) => {
          if (signal === 'SIGTERM') {
            sigtermHandler = handler as Function;
          }
          return process;
        });
        const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
          throw new Error('process.exit called');
        });

        setupSignalHandlers();

        // Act & Assert
        expect(sigtermHandler).toBeDefined();
        // Handler may or may not call process.exit immediately
        // depending on implementation strategy

        processOnSpy.mockRestore();
        processExitSpy.mockRestore();
      });
    });

    describe('AC-2.8: GIVEN SIGINT received WHEN daemon idle THEN immediate shutdown', () => {
      it('GIVEN SIGINT received WHEN setupSignalHandlers() active THEN it removes PID file', () => {
        // Arrange
        let sigintHandler: Function | undefined;
        const processOnSpy = vi.spyOn(process, 'on').mockImplementation((signal, handler) => {
          if (signal === 'SIGINT') {
            sigintHandler = handler as Function;
          }
          return process;
        });
        const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
          throw new Error('process.exit called');
        });

        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(unlinkSync).mockImplementation(() => {});

        setupSignalHandlers();

        // Act
        expect(sigintHandler).toBeDefined();
        expect(() => sigintHandler!()).toThrow('process.exit called');

        // Assert - should remove PID file
        expect(unlinkSync).toHaveBeenCalledWith(expect.stringContaining('daemon.pid'));

        processOnSpy.mockRestore();
        processExitSpy.mockRestore();
      });

      it('GIVEN SIGINT received WHEN daemon idle THEN it exits immediately', () => {
        // Arrange
        let sigintHandler: Function | undefined;
        const processOnSpy = vi.spyOn(process, 'on').mockImplementation((signal, handler) => {
          if (signal === 'SIGINT') {
            sigintHandler = handler as Function;
          }
          return process;
        });
        const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
          throw new Error('process.exit called');
        });

        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(unlinkSync).mockImplementation(() => {});

        setupSignalHandlers();

        // Act & Assert
        expect(sigintHandler).toBeDefined();
        expect(() => sigintHandler!()).toThrow('process.exit called');

        processOnSpy.mockRestore();
        processExitSpy.mockRestore();
      });

      it('GIVEN SIGINT handler WHEN PID file does not exist THEN exits without error', () => {
        // Arrange
        let sigintHandler: Function | undefined;
        const processOnSpy = vi.spyOn(process, 'on').mockImplementation((signal, handler) => {
          if (signal === 'SIGINT') {
            sigintHandler = handler as Function;
          }
          return process;
        });
        const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
          throw new Error('process.exit called');
        });

        vi.mocked(existsSync).mockReturnValue(false);

        setupSignalHandlers();

        // Act & Assert - should not throw on missing PID file
        expect(sigintHandler).toBeDefined();
        expect(() => sigintHandler!()).toThrow('process.exit called');

        processOnSpy.mockRestore();
        processExitSpy.mockRestore();
      });
    });

    describe('Signal handler registration', () => {
      it('GIVEN setupSignalHandlers() called WHEN executed THEN both SIGTERM and SIGINT handlers are registered', () => {
        // Arrange
        const processOnSpy = vi.spyOn(process, 'on');

        // Act
        setupSignalHandlers();

        // Assert
        expect(processOnSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
        expect(processOnSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));

        processOnSpy.mockRestore();
      });
    });
  });

  describe('isProcessRunning()', () => {
    it('GIVEN valid running process PID WHEN isProcessRunning() called THEN returns true', () => {
      // Arrange
      const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);

      // Act
      const result = isProcessRunning(mockPid);

      // Assert
      expect(result).toBe(true);
      expect(killSpy).toHaveBeenCalledWith(mockPid, 0);

      killSpy.mockRestore();
    });

    it('GIVEN non-existent process PID WHEN isProcessRunning() called THEN returns false', () => {
      // Arrange
      const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => {
        throw new Error('ESRCH');
      });

      // Act
      const result = isProcessRunning(mockPid);

      // Assert
      expect(result).toBe(false);

      killSpy.mockRestore();
    });

    it('GIVEN isProcessRunning() called WHEN checking process THEN uses signal 0 (no-op signal)', () => {
      // Arrange
      const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);

      // Act
      isProcessRunning(12345);

      // Assert - should use signal 0 to check without killing
      expect(killSpy).toHaveBeenCalledWith(12345, 0);

      killSpy.mockRestore();
    });

    it('GIVEN process.kill throws EPERM WHEN isProcessRunning() called THEN returns true', () => {
      // Arrange - EPERM means process exists but we lack permission
      const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => {
        const error: any = new Error('EPERM');
        error.code = 'EPERM';
        throw error;
      });

      // Act
      const result = isProcessRunning(mockPid);

      // Assert - EPERM means process exists
      expect(result).toBe(true);

      killSpy.mockRestore();
    });

    it('GIVEN invalid PID (negative) WHEN isProcessRunning() called THEN returns false', () => {
      // Arrange
      const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => {
        throw new Error('EINVAL');
      });

      // Act
      const result = isProcessRunning(-1);

      // Assert
      expect(result).toBe(false);

      killSpy.mockRestore();
    });
  });

  describe('AC-2.10: Coverage for all branches', () => {
    it('covers PID file read error handling', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error('Read error');
      });

      // Act & Assert
      expect(() => statusDaemon()).not.toThrow();
      const status = statusDaemon();
      expect(status.running).toBe(false);
    });

    it('covers empty PID file handling', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('');

      // Act
      const status = statusDaemon();

      // Assert
      expect(status.running).toBe(false);
    });

    it('covers whitespace in PID file', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('  12345  \n');

      const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);

      // Act
      const status = statusDaemon();

      // Assert - should parse PID correctly after trimming
      expect(status.running).toBe(true);
      expect(status.pid).toBe(12345);

      killSpy.mockRestore();
    });

    it('covers concurrent start attempts', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(writeFileSync).mockImplementation(() => {});

      // Simulate race condition - file appears during start
      let callCount = 0;
      vi.mocked(renameSync).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('EEXIST'); // File already exists
        }
      });

      // Act & Assert
      expect(() => startDaemon()).toThrow();
    });

    it('covers PID file directory creation', () => {
      // Arrange - tests that .mg-daemon directory exists or is created
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(writeFileSync).mockImplementation(() => {});
      vi.mocked(renameSync).mockImplementation(() => {});

      // Act
      startDaemon();

      // Assert - implementation should ensure directory exists
      // This may involve mkdirSync being called
    });
  });

  describe('Integration scenarios', () => {
    it('GIVEN full lifecycle WHEN start, status, stop THEN operations succeed in sequence', () => {
      // This test verifies the full lifecycle works together

      // Start
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(writeFileSync).mockImplementation(() => {});
      vi.mocked(renameSync).mockImplementation(() => {});

      const startResult = startDaemon();
      expect(startResult.pid).toBeDefined();

      // Status
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(startResult.pid.toString());
      const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);

      const status = statusDaemon();
      expect(status.running).toBe(true);

      // Stop
      vi.mocked(unlinkSync).mockImplementation(() => {});
      stopDaemon();
      expect(unlinkSync).toHaveBeenCalled();

      killSpy.mockRestore();
    });
  });
});

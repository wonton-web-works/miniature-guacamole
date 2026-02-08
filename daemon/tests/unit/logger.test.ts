import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, appendFileSync } from 'fs';

// Module under test
import { createLogger, log, info, warn, error } from '../../src/logger';
import type { LogLevel, Logger } from '../../src/logger';

// Mock fs module at module level
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  appendFileSync: vi.fn(),
}));

describe('Logger Module', () => {
  const logDir = '.mg-daemon';
  const logFile = '.mg-daemon/daemon.log';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('createLogger()', () => {
    describe('AC-3.11: GIVEN .mg-daemon/ directory missing WHEN createLogger() called THEN it creates directory', () => {
      it('GIVEN .mg-daemon/ directory missing WHEN createLogger() called THEN it creates directory with recursive option', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(false);
        vi.mocked(mkdirSync).mockImplementation(() => undefined);
        vi.mocked(appendFileSync).mockImplementation(() => {});

        // Act
        createLogger();

        // Assert
        expect(mkdirSync).toHaveBeenCalledWith(logDir, { recursive: true });
      });

      it('GIVEN .mg-daemon/ directory exists WHEN createLogger() called THEN it does not create directory', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(appendFileSync).mockImplementation(() => {});

        // Act
        createLogger();

        // Assert
        expect(mkdirSync).not.toHaveBeenCalled();
      });
    });

    it('GIVEN valid setup WHEN createLogger() called THEN it returns Logger instance with all methods', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(appendFileSync).mockImplementation(() => {});

      // Act
      const logger = createLogger();

      // Assert
      expect(logger).toBeDefined();
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('error');
      expect(logger).toHaveProperty('log');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.log).toBe('function');
    });
  });

  describe('log()', () => {
    describe('AC-3.8: GIVEN a log message WHEN log() called THEN it writes with format [ISO-TIMESTAMP] [LEVEL] message', () => {
      it('GIVEN info level message WHEN log() called THEN it formats with [ISO-TIMESTAMP] [INFO] prefix', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(appendFileSync).mockImplementation(() => {});
        const testDate = new Date('2024-01-15T10:30:45.123Z');
        vi.setSystemTime(testDate);

        // Act
        log('info', 'test message');

        // Assert
        expect(appendFileSync).toHaveBeenCalled();
        const writeCall = vi.mocked(appendFileSync).mock.calls[0];
        const content = writeCall[1] as string;
        expect(content).toContain('[2024-01-15T10:30:45.123Z]');
        expect(content).toContain('[INFO]');
        expect(content).toContain('test message');
      });

      it('GIVEN warn level message WHEN log() called THEN it formats with [WARN] prefix', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(appendFileSync).mockImplementation(() => {});
        const testDate = new Date('2024-01-15T10:30:45.123Z');
        vi.setSystemTime(testDate);

        // Act
        log('warn', 'warning message');

        // Assert
        expect(appendFileSync).toHaveBeenCalled();
        const writeCall = vi.mocked(appendFileSync).mock.calls[0];
        const content = writeCall[1] as string;
        expect(content).toContain('[WARN]');
        expect(content).toContain('warning message');
      });

      it('GIVEN error level message WHEN log() called THEN it formats with [ERROR] prefix', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(appendFileSync).mockImplementation(() => {});
        const testDate = new Date('2024-01-15T10:30:45.123Z');
        vi.setSystemTime(testDate);

        // Act
        log('error', 'error message');

        // Assert
        expect(appendFileSync).toHaveBeenCalled();
        const writeCall = vi.mocked(appendFileSync).mock.calls[0];
        const content = writeCall[1] as string;
        expect(content).toContain('[ERROR]');
        expect(content).toContain('error message');
      });

      it('GIVEN a log message WHEN log() called THEN it includes newline at end', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(appendFileSync).mockImplementation(() => {});

        // Act
        log('info', 'test message');

        // Assert
        const writeCall = vi.mocked(appendFileSync).mock.calls[0];
        const content = writeCall[1] as string;
        expect(content).toMatch(/\n$/);
      });
    });

    describe('AC-3.10: GIVEN existing daemon.log WHEN log() called THEN it appends without truncating', () => {
      it('GIVEN existing daemon.log WHEN log() called THEN it uses appendFileSync not writeFileSync', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(appendFileSync).mockImplementation(() => {});

        // Act
        log('info', 'new message');

        // Assert
        expect(appendFileSync).toHaveBeenCalled();
        const writeCall = vi.mocked(appendFileSync).mock.calls[0];
        expect(writeCall[0]).toContain('daemon.log');
      });

      it('GIVEN multiple log calls WHEN log() called THEN each call appends separately', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(appendFileSync).mockImplementation(() => {});

        // Act
        log('info', 'message 1');
        log('warn', 'message 2');
        log('error', 'message 3');

        // Assert
        expect(appendFileSync).toHaveBeenCalledTimes(3);
      });
    });

    it('GIVEN .mg-daemon/ directory missing WHEN log() called THEN it creates directory first', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockImplementation(() => undefined);
      vi.mocked(appendFileSync).mockImplementation(() => {});

      // Act
      log('info', 'test message');

      // Assert
      expect(mkdirSync).toHaveBeenCalledWith(logDir, { recursive: true });
      expect(appendFileSync).toHaveBeenCalled();
    });
  });

  describe('info()', () => {
    describe('AC-3.9: GIVEN info message WHEN info() called THEN it logs at info level', () => {
      it('GIVEN info message WHEN info() called THEN it writes with [INFO] level', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(appendFileSync).mockImplementation(() => {});

        // Act
        info('info message');

        // Assert
        expect(appendFileSync).toHaveBeenCalled();
        const writeCall = vi.mocked(appendFileSync).mock.calls[0];
        const content = writeCall[1] as string;
        expect(content).toContain('[INFO]');
        expect(content).toContain('info message');
      });
    });
  });

  describe('warn()', () => {
    describe('AC-3.9: GIVEN warn message WHEN warn() called THEN it logs at warn level', () => {
      it('GIVEN warn message WHEN warn() called THEN it writes with [WARN] level', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(appendFileSync).mockImplementation(() => {});

        // Act
        warn('warning message');

        // Assert
        expect(appendFileSync).toHaveBeenCalled();
        const writeCall = vi.mocked(appendFileSync).mock.calls[0];
        const content = writeCall[1] as string;
        expect(content).toContain('[WARN]');
        expect(content).toContain('warning message');
      });
    });
  });

  describe('error()', () => {
    describe('AC-3.9: GIVEN error message WHEN error() called THEN it logs at error level', () => {
      it('GIVEN error message WHEN error() called THEN it writes with [ERROR] level', () => {
        // Arrange
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(appendFileSync).mockImplementation(() => {});

        // Act
        error('error message');

        // Assert
        expect(appendFileSync).toHaveBeenCalled();
        const writeCall = vi.mocked(appendFileSync).mock.calls[0];
        const content = writeCall[1] as string;
        expect(content).toContain('[ERROR]');
        expect(content).toContain('error message');
      });
    });
  });

  describe('Logger instance methods', () => {
    it('GIVEN logger instance WHEN logger.info() called THEN it logs at info level', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(appendFileSync).mockImplementation(() => {});
      const logger = createLogger();

      // Act
      logger.info('instance info message');

      // Assert
      expect(appendFileSync).toHaveBeenCalled();
      const calls = vi.mocked(appendFileSync).mock.calls;
      const lastCall = calls[calls.length - 1];
      const content = lastCall[1] as string;
      expect(content).toContain('[INFO]');
      expect(content).toContain('instance info message');
    });

    it('GIVEN logger instance WHEN logger.warn() called THEN it logs at warn level', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(appendFileSync).mockImplementation(() => {});
      const logger = createLogger();

      // Act
      logger.warn('instance warn message');

      // Assert
      expect(appendFileSync).toHaveBeenCalled();
      const calls = vi.mocked(appendFileSync).mock.calls;
      const lastCall = calls[calls.length - 1];
      const content = lastCall[1] as string;
      expect(content).toContain('[WARN]');
      expect(content).toContain('instance warn message');
    });

    it('GIVEN logger instance WHEN logger.error() called THEN it logs at error level', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(appendFileSync).mockImplementation(() => {});
      const logger = createLogger();

      // Act
      logger.error('instance error message');

      // Assert
      expect(appendFileSync).toHaveBeenCalled();
      const calls = vi.mocked(appendFileSync).mock.calls;
      const lastCall = calls[calls.length - 1];
      const content = lastCall[1] as string;
      expect(content).toContain('[ERROR]');
      expect(content).toContain('instance error message');
    });

    it('GIVEN logger instance WHEN logger.log() called THEN it logs at specified level', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(appendFileSync).mockImplementation(() => {});
      const logger = createLogger();

      // Act
      logger.log('warn', 'custom level message');

      // Assert
      expect(appendFileSync).toHaveBeenCalled();
      const calls = vi.mocked(appendFileSync).mock.calls;
      const lastCall = calls[calls.length - 1];
      const content = lastCall[1] as string;
      expect(content).toContain('[WARN]');
      expect(content).toContain('custom level message');
    });
  });

  describe('Edge Cases', () => {
    it('GIVEN empty message WHEN log() called THEN it logs empty message with format', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(appendFileSync).mockImplementation(() => {});

      // Act
      log('info', '');

      // Assert
      expect(appendFileSync).toHaveBeenCalled();
      const writeCall = vi.mocked(appendFileSync).mock.calls[0];
      const content = writeCall[1] as string;
      expect(content).toContain('[INFO]');
      expect(content).toMatch(/\[INFO\]\s*\n/);
    });

    it('GIVEN message with newlines WHEN log() called THEN it preserves newlines in message', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(appendFileSync).mockImplementation(() => {});

      // Act
      log('info', 'line1\nline2\nline3');

      // Assert
      expect(appendFileSync).toHaveBeenCalled();
      const writeCall = vi.mocked(appendFileSync).mock.calls[0];
      const content = writeCall[1] as string;
      expect(content).toContain('line1\nline2\nline3');
    });

    it('GIVEN message with special characters WHEN log() called THEN it preserves special characters', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(appendFileSync).mockImplementation(() => {});

      // Act
      log('info', 'Special: !@#$%^&*(){}[]<>?/\\|');

      // Assert
      expect(appendFileSync).toHaveBeenCalled();
      const writeCall = vi.mocked(appendFileSync).mock.calls[0];
      const content = writeCall[1] as string;
      expect(content).toContain('Special: !@#$%^&*(){}[]<>?/\\|');
    });
  });

  describe('Branch Coverage (AC-3.13)', () => {
    it('GIVEN mkdirSync throws WHEN log() called THEN it handles error gracefully', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });
      vi.mocked(appendFileSync).mockImplementation(() => {});

      // Act & Assert - should either throw or handle gracefully
      // If implementation chooses to throw, test should expect throw
      // If implementation chooses to continue, test should verify appendFileSync still called
      expect(() => log('info', 'test')).toThrow();
    });

    it('GIVEN appendFileSync throws WHEN log() called THEN it throws error', () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(appendFileSync).mockImplementation(() => {
        throw new Error('ENOSPC: no space left on device');
      });

      // Act & Assert
      expect(() => log('info', 'test')).toThrow();
    });
  });
});

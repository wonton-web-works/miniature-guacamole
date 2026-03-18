import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, statSync, renameSync, writeFileSync, unlinkSync, appendFileSync } from 'fs';

import {
  shouldRotate,
  rotate,
  appendLog,
} from '../../src/log-rotation';
import type { LogRotationConfig } from '../../src/log-rotation';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  statSync: vi.fn(),
  renameSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  appendFileSync: vi.fn(),
}));

const mockConfig: LogRotationConfig = {
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  maxRotations: 5,
  logPath: '/project/.mg-daemon/daemon.log',
};

describe('log-rotation module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('shouldRotate()', () => {
    it('GIVEN log file exceeds maxSizeBytes WHEN shouldRotate() called THEN returns true', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(statSync).mockReturnValue({ size: 11 * 1024 * 1024 } as any);

      const result = shouldRotate(mockConfig);

      expect(result).toBe(true);
    });

    it('GIVEN log file equals maxSizeBytes WHEN shouldRotate() called THEN returns true', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(statSync).mockReturnValue({ size: 10 * 1024 * 1024 } as any);

      const result = shouldRotate(mockConfig);

      expect(result).toBe(true);
    });

    it('GIVEN log file is under maxSizeBytes WHEN shouldRotate() called THEN returns false', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(statSync).mockReturnValue({ size: 1 * 1024 * 1024 } as any);

      const result = shouldRotate(mockConfig);

      expect(result).toBe(false);
    });

    it('GIVEN log file does not exist WHEN shouldRotate() called THEN returns false', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = shouldRotate(mockConfig);

      expect(result).toBe(false);
    });

    it('GIVEN statSync throws WHEN shouldRotate() called THEN returns false', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(statSync).mockImplementation(() => {
        throw new Error('stat failed');
      });

      const result = shouldRotate(mockConfig);

      expect(result).toBe(false);
    });

    it('GIVEN custom maxSizeBytes WHEN shouldRotate() called THEN uses correct threshold', () => {
      const customConfig: LogRotationConfig = {
        ...mockConfig,
        maxSizeBytes: 1024, // 1KB
      };
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(statSync).mockReturnValue({ size: 2048 } as any);

      const result = shouldRotate(customConfig);

      expect(result).toBe(true);
    });
  });

  describe('rotate()', () => {
    it('GIVEN log file exists WHEN rotate() called THEN renames daemon.log to daemon.log.1', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(renameSync).mockImplementation(() => {});
      vi.mocked(unlinkSync).mockImplementation(() => {});
      vi.mocked(writeFileSync).mockImplementation(() => {});

      rotate(mockConfig);

      const renameCalls = vi.mocked(renameSync).mock.calls;
      const logToLog1 = renameCalls.find(
        ([from, to]) =>
          (from as string).endsWith('daemon.log') &&
          !(from as string).endsWith('.log.') &&
          (to as string).endsWith('daemon.log.1')
      );
      expect(logToLog1).toBeDefined();
    });

    it('GIVEN log.1 exists WHEN rotate() called THEN renames daemon.log.1 to daemon.log.2', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(renameSync).mockImplementation(() => {});
      vi.mocked(unlinkSync).mockImplementation(() => {});
      vi.mocked(writeFileSync).mockImplementation(() => {});

      rotate(mockConfig);

      const renameCalls = vi.mocked(renameSync).mock.calls;
      const log1ToLog2 = renameCalls.find(
        ([from, to]) =>
          (from as string).endsWith('daemon.log.1') &&
          (to as string).endsWith('daemon.log.2')
      );
      expect(log1ToLog2).toBeDefined();
    });

    it('GIVEN all rotations filled WHEN rotate() called THEN deletes oldest rotation (daemon.log.5)', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(renameSync).mockImplementation(() => {});
      vi.mocked(unlinkSync).mockImplementation(() => {});
      vi.mocked(writeFileSync).mockImplementation(() => {});

      rotate(mockConfig);

      const unlinkCalls = vi.mocked(unlinkSync).mock.calls;
      const deletedOldest = unlinkCalls.find(([path]) =>
        (path as string).endsWith(`daemon.log.${mockConfig.maxRotations}`)
      );
      expect(deletedOldest).toBeDefined();
    });

    it('GIVEN rotation complete WHEN rotate() called THEN creates fresh empty daemon.log', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(renameSync).mockImplementation(() => {});
      vi.mocked(unlinkSync).mockImplementation(() => {});
      vi.mocked(writeFileSync).mockImplementation(() => {});

      rotate(mockConfig);

      const writeCalls = vi.mocked(writeFileSync).mock.calls;
      const freshLog = writeCalls.find(([path]) =>
        (path as string).endsWith('daemon.log') &&
        !(path as string).endsWith('.log.')
      );
      expect(freshLog).toBeDefined();
    });

    it('GIVEN some intermediate files missing WHEN rotate() called THEN skips missing files gracefully', () => {
      // Only daemon.log and daemon.log.5 exist, others are missing
      vi.mocked(existsSync).mockImplementation((p) => {
        const path = p as string;
        return path.endsWith('daemon.log') || path.endsWith('daemon.log.5');
      });
      vi.mocked(renameSync).mockImplementation(() => {});
      vi.mocked(unlinkSync).mockImplementation(() => {});
      vi.mocked(writeFileSync).mockImplementation(() => {});

      expect(() => rotate(mockConfig)).not.toThrow();
    });

    it('GIVEN daemon.log does not exist WHEN rotate() called THEN still creates fresh log', () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(renameSync).mockImplementation(() => {});
      vi.mocked(unlinkSync).mockImplementation(() => {});
      vi.mocked(writeFileSync).mockImplementation(() => {});

      expect(() => rotate(mockConfig)).not.toThrow();

      const writeCalls = vi.mocked(writeFileSync).mock.calls;
      const freshLog = writeCalls.find(([path]) =>
        (path as string).endsWith('daemon.log') &&
        !(path as string).endsWith('.log.')
      );
      expect(freshLog).toBeDefined();
    });

    it('GIVEN maxRotations is 3 WHEN rotate() called THEN only processes 3 rotation slots', () => {
      const smallConfig: LogRotationConfig = {
        ...mockConfig,
        maxRotations: 3,
      };
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(renameSync).mockImplementation(() => {});
      vi.mocked(unlinkSync).mockImplementation(() => {});
      vi.mocked(writeFileSync).mockImplementation(() => {});

      rotate(smallConfig);

      // Should not rename/delete log.4 or higher
      const unlinkCalls = vi.mocked(unlinkSync).mock.calls;
      const deletedLog4 = unlinkCalls.find(([path]) =>
        (path as string).endsWith('daemon.log.4')
      );
      // log.4 should only be deleted if config allows it
      // With maxRotations=3, daemon.log.3 is oldest
      const deletedLog3 = unlinkCalls.find(([path]) =>
        (path as string).endsWith('daemon.log.3')
      );
      expect(deletedLog3).toBeDefined();
      expect(deletedLog4).toBeUndefined();
    });
  });

  describe('appendLog()', () => {
    it('GIVEN log under size WHEN appendLog() called THEN appends message without rotating', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(statSync).mockReturnValue({ size: 1024 } as any); // Under 10MB
      vi.mocked(appendFileSync).mockImplementation(() => {});

      appendLog(mockConfig, 'Test message');

      expect(appendFileSync).toHaveBeenCalled();
      expect(renameSync).not.toHaveBeenCalled();
    });

    it('GIVEN log over size WHEN appendLog() called THEN rotates before appending', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(statSync).mockReturnValue({ size: 11 * 1024 * 1024 } as any); // Over 10MB
      vi.mocked(renameSync).mockImplementation(() => {});
      vi.mocked(unlinkSync).mockImplementation(() => {});
      vi.mocked(writeFileSync).mockImplementation(() => {});
      vi.mocked(appendFileSync).mockImplementation(() => {});

      appendLog(mockConfig, 'Test message after rotation');

      // Rotation should have happened
      expect(renameSync).toHaveBeenCalled();
      // Then message was appended
      expect(appendFileSync).toHaveBeenCalled();
    });

    it('GIVEN appendLog called WHEN writing THEN message includes timestamp', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(statSync).mockReturnValue({ size: 1024 } as any);
      vi.mocked(appendFileSync).mockImplementation(() => {});

      const testMessage = 'Hello daemon log';
      appendLog(mockConfig, testMessage);

      const appendCall = vi.mocked(appendFileSync).mock.calls[0];
      const content = appendCall[1] as string;
      expect(content).toContain(testMessage);
      // Should have a timestamp prefix
      expect(content).toMatch(/\d{4}-\d{2}-\d{2}/); // ISO date pattern
    });

    it('GIVEN appendLog called WHEN writing THEN message ends with newline', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(statSync).mockReturnValue({ size: 1024 } as any);
      vi.mocked(appendFileSync).mockImplementation(() => {});

      appendLog(mockConfig, 'Test message');

      const appendCall = vi.mocked(appendFileSync).mock.calls[0];
      const content = appendCall[1] as string;
      expect(content).toMatch(/\n$/);
    });

    it('GIVEN appendLog called WHEN writing THEN appends to the correct log path', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(statSync).mockReturnValue({ size: 1024 } as any);
      vi.mocked(appendFileSync).mockImplementation(() => {});

      appendLog(mockConfig, 'Test message');

      const appendCall = vi.mocked(appendFileSync).mock.calls[0];
      const filePath = appendCall[0] as string;
      expect(filePath).toBe(mockConfig.logPath);
    });
  });
});

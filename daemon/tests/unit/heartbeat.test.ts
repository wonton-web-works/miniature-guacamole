import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, writeFileSync, renameSync, readFileSync } from 'fs';

import {
  writeHeartbeat,
  readHeartbeat,
  isStale,
} from '../../src/heartbeat';
import type { HeartbeatConfig } from '../../src/heartbeat';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  writeFileSync: vi.fn(),
  renameSync: vi.fn(),
  readFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

const mockConfig: HeartbeatConfig = {
  heartbeatPath: '/project/.mg-daemon/heartbeat',
  intervalMs: 60000, // 1 minute
};

describe('heartbeat module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('writeHeartbeat()', () => {
    it('GIVEN valid config WHEN writeHeartbeat() called THEN writes to a temp file first (atomic)', () => {
      vi.mocked(writeFileSync).mockImplementation(() => {});
      vi.mocked(renameSync).mockImplementation(() => {});

      writeHeartbeat(mockConfig);

      expect(writeFileSync).toHaveBeenCalled();
      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const tempPath = writeCall[0] as string;
      expect(tempPath).toContain('.tmp');
    });

    it('GIVEN valid config WHEN writeHeartbeat() called THEN renames temp file to heartbeat path (atomic)', () => {
      vi.mocked(writeFileSync).mockImplementation(() => {});
      vi.mocked(renameSync).mockImplementation(() => {});

      writeHeartbeat(mockConfig);

      expect(renameSync).toHaveBeenCalled();
      const renameCall = vi.mocked(renameSync).mock.calls[0];
      const [from, to] = renameCall;
      expect((from as string)).toContain('.tmp');
      expect(to as string).toBe(mockConfig.heartbeatPath);
    });

    it('GIVEN valid config WHEN writeHeartbeat() called THEN heartbeat contains current timestamp', () => {
      vi.mocked(writeFileSync).mockImplementation(() => {});
      vi.mocked(renameSync).mockImplementation(() => {});

      const now = new Date('2026-03-18T12:00:00.000Z');
      vi.setSystemTime(now);

      writeHeartbeat(mockConfig);

      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const content = writeCall[1] as string;
      const data = JSON.parse(content);
      expect(data.timestamp).toBe(now.toISOString());
    });

    it('GIVEN valid config WHEN writeHeartbeat() called THEN heartbeat contains current PID', () => {
      vi.mocked(writeFileSync).mockImplementation(() => {});
      vi.mocked(renameSync).mockImplementation(() => {});

      writeHeartbeat(mockConfig);

      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const content = writeCall[1] as string;
      const data = JSON.parse(content);
      expect(data.pid).toBe(process.pid);
    });

    it('GIVEN atomic write WHEN rename fails THEN write error propagates', () => {
      vi.mocked(writeFileSync).mockImplementation(() => {});
      vi.mocked(renameSync).mockImplementation(() => {
        throw new Error('rename failed');
      });

      expect(() => writeHeartbeat(mockConfig)).toThrow('rename failed');
    });
  });

  describe('readHeartbeat()', () => {
    it('GIVEN heartbeat file exists WHEN readHeartbeat() called THEN returns parsed data', () => {
      const heartbeatData = {
        timestamp: '2026-03-18T12:00:00.000Z',
        pid: 12345,
      };
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(heartbeatData));

      const result = readHeartbeat(mockConfig);

      expect(result).not.toBeNull();
      expect(result!.pid).toBe(12345);
    });

    it('GIVEN heartbeat file exists WHEN readHeartbeat() called THEN returns timestamp as Date', () => {
      const heartbeatData = {
        timestamp: '2026-03-18T12:00:00.000Z',
        pid: 12345,
      };
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(heartbeatData));

      const result = readHeartbeat(mockConfig);

      expect(result).not.toBeNull();
      expect(result!.timestamp).toBeInstanceOf(Date);
      expect(result!.timestamp.toISOString()).toBe('2026-03-18T12:00:00.000Z');
    });

    it('GIVEN heartbeat file does not exist WHEN readHeartbeat() called THEN returns null', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = readHeartbeat(mockConfig);

      expect(result).toBeNull();
    });

    it('GIVEN heartbeat file contains invalid JSON WHEN readHeartbeat() called THEN returns null', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('not valid json');

      const result = readHeartbeat(mockConfig);

      expect(result).toBeNull();
    });

    it('GIVEN readFileSync throws WHEN readHeartbeat() called THEN returns null', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error('read error');
      });

      const result = readHeartbeat(mockConfig);

      expect(result).toBeNull();
    });
  });

  describe('isStale()', () => {
    it('GIVEN heartbeat is recent WHEN isStale() called THEN returns false', () => {
      const now = new Date('2026-03-18T12:00:00.000Z');
      vi.setSystemTime(now);

      // Heartbeat written 30 seconds ago (well within 1x interval)
      const recentTime = new Date(now.getTime() - 30000).toISOString();
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({ timestamp: recentTime, pid: 12345 })
      );

      const result = isStale(mockConfig);

      expect(result).toBe(false);
    });

    it('GIVEN heartbeat is older than 3x interval WHEN isStale() called THEN returns true', () => {
      const now = new Date('2026-03-18T12:00:00.000Z');
      vi.setSystemTime(now);

      // Heartbeat written 4 minutes ago (over 3x 1-minute interval)
      const staleTime = new Date(now.getTime() - 4 * 60 * 1000).toISOString();
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({ timestamp: staleTime, pid: 12345 })
      );

      const result = isStale(mockConfig);

      expect(result).toBe(true);
    });

    it('GIVEN heartbeat is exactly 3x interval old WHEN isStale() called THEN returns true', () => {
      const now = new Date('2026-03-18T12:00:00.000Z');
      vi.setSystemTime(now);

      const exactThreshold = new Date(now.getTime() - 3 * mockConfig.intervalMs).toISOString();
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({ timestamp: exactThreshold, pid: 12345 })
      );

      const result = isStale(mockConfig);

      expect(result).toBe(true);
    });

    it('GIVEN heartbeat file does not exist WHEN isStale() called THEN returns true', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = isStale(mockConfig);

      expect(result).toBe(true);
    });

    it('GIVEN custom thresholdMultiplier of 5 WHEN isStale() called THEN uses custom multiplier', () => {
      const now = new Date('2026-03-18T12:00:00.000Z');
      vi.setSystemTime(now);

      // 4 minutes old — stale with default multiplier (3) but not with multiplier 5
      const moderatelyOldTime = new Date(now.getTime() - 4 * 60 * 1000).toISOString();
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({ timestamp: moderatelyOldTime, pid: 12345 })
      );

      const result = isStale(mockConfig, 5);

      expect(result).toBe(false);
    });

    it('GIVEN heartbeat is unreadable WHEN isStale() called THEN returns true', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('corrupt data');

      const result = isStale(mockConfig);

      expect(result).toBe(true);
    });
  });
});

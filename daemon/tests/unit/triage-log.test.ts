import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from 'fs';
import { dirname } from 'path';

import { appendTriageLog, readTriageLog } from '../../src/triage-log';
import type { TriageLogEntry } from '../../src/triage-log';

// Mock fs module at module level
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  renameSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

vi.mock('path', async () => {
  const actual = await vi.importActual('path');
  return {
    ...actual,
    dirname: vi.fn(),
  };
});

describe('Triage Log Module', () => {
  const MOCK_DIR = '/mock/.mg-daemon';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dirname).mockReturnValue(MOCK_DIR);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── MISUSE-FIRST ──────────────────────────────────────────

  describe('MISUSE-FIRST: appendTriageLog never throws', () => {
    it('GIVEN writeFileSync throws WHEN appendTriageLog called THEN does not throw', () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(writeFileSync).mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      expect(() =>
        appendTriageLog({ ticketId: 'GH-1', outcome: 'GO', reason: 'ok', timestamp: '2026-03-19T00:00:00Z' })
      ).not.toThrow();
    });

    it('GIVEN renameSync throws WHEN appendTriageLog called THEN does not throw', () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(renameSync).mockImplementation(() => {
        throw new Error('ENOENT');
      });

      expect(() =>
        appendTriageLog({ ticketId: 'GH-1', outcome: 'REJECT', reason: 'bad', timestamp: '2026-03-19T00:00:00Z' })
      ).not.toThrow();
    });

    it('GIVEN mkdirSync throws WHEN appendTriageLog called THEN does not throw', () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockImplementation(() => {
        throw new Error('EPERM');
      });

      expect(() =>
        appendTriageLog({ ticketId: 'GH-1', outcome: 'GO', reason: 'ok', timestamp: '2026-03-19T00:00:00Z' })
      ).not.toThrow();
    });

    it('GIVEN readFileSync throws during load WHEN appendTriageLog called THEN does not throw and still writes', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error('EIO');
      });

      expect(() =>
        appendTriageLog({ ticketId: 'GH-1', outcome: 'GO', reason: 'ok', timestamp: '2026-03-19T00:00:00Z' })
      ).not.toThrow();

      // Should still attempt to write (starting fresh)
      expect(writeFileSync).toHaveBeenCalled();
    });
  });

  describe('MISUSE-FIRST: readTriageLog resilience', () => {
    it('GIVEN triage-log.json does not exist WHEN readTriageLog called THEN returns empty array', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      expect(readTriageLog()).toEqual([]);
    });

    it('GIVEN triage-log.json contains invalid JSON WHEN readTriageLog called THEN returns empty array', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('not valid json{[');

      expect(readTriageLog()).toEqual([]);
    });

    it('GIVEN readFileSync throws WHEN readTriageLog called THEN returns empty array', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error('EACCES');
      });

      expect(readTriageLog()).toEqual([]);
    });

    it('GIVEN triage-log.json contains non-array JSON WHEN readTriageLog called THEN returns empty array', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('{"key": "value"}');

      expect(readTriageLog()).toEqual([]);
    });
  });

  // ── HAPPY PATH ────────────────────────────────────────────

  describe('appendTriageLog: happy path', () => {
    it('GIVEN no existing log WHEN appendTriageLog called THEN creates new array with one entry', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const entry: TriageLogEntry = {
        ticketId: 'GH-42',
        outcome: 'GO',
        reason: 'All criteria pass',
        timestamp: '2026-03-19T10:00:00Z',
      };

      appendTriageLog(entry);

      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const written = JSON.parse(writeCall[1] as string);
      expect(written).toEqual([entry]);
    });

    it('GIVEN existing log with entries WHEN appendTriageLog called THEN appends to array', () => {
      const existing: TriageLogEntry[] = [
        { ticketId: 'GH-1', outcome: 'GO', reason: 'ok', timestamp: '2026-03-19T09:00:00Z' },
      ];
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(existing));

      const newEntry: TriageLogEntry = {
        ticketId: 'GH-2',
        outcome: 'REJECT',
        reason: 'Out of scope',
        timestamp: '2026-03-19T10:00:00Z',
      };

      appendTriageLog(newEntry);

      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const written = JSON.parse(writeCall[1] as string);
      expect(written).toHaveLength(2);
      expect(written[0]).toEqual(existing[0]);
      expect(written[1]).toEqual(newEntry);
    });

    it('GIVEN entry with NEEDS_CLARIFICATION outcome WHEN appendTriageLog called THEN persists correctly', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const entry: TriageLogEntry = {
        ticketId: 'GH-7',
        outcome: 'NEEDS_CLARIFICATION',
        reason: 'Missing acceptance criteria',
        timestamp: '2026-03-19T11:00:00Z',
      };

      appendTriageLog(entry);

      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const written = JSON.parse(writeCall[1] as string);
      expect(written[0].outcome).toBe('NEEDS_CLARIFICATION');
    });
  });

  describe('appendTriageLog: entry fields', () => {
    it('GIVEN entry WHEN persisted THEN contains ticketId, outcome, reason, timestamp', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      appendTriageLog({
        ticketId: 'GH-99',
        outcome: 'GO',
        reason: 'Looks good',
        timestamp: '2026-03-19T12:00:00Z',
      });

      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const written = JSON.parse(writeCall[1] as string);
      const entry = written[0];
      expect(entry).toHaveProperty('ticketId', 'GH-99');
      expect(entry).toHaveProperty('outcome', 'GO');
      expect(entry).toHaveProperty('reason', 'Looks good');
      expect(entry).toHaveProperty('timestamp', '2026-03-19T12:00:00Z');
    });

    it('GIVEN ISO timestamp WHEN persisted THEN timestamp format preserved', () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const ts = '2026-03-19T23:59:59.999Z';

      appendTriageLog({ ticketId: 'GH-1', outcome: 'GO', reason: 'ok', timestamp: ts });

      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const written = JSON.parse(writeCall[1] as string);
      expect(written[0].timestamp).toBe(ts);
    });
  });

  // ── ATOMIC WRITE PATTERN ──────────────────────────────────

  describe('Atomic write-tmp-then-rename pattern', () => {
    it('GIVEN appendTriageLog called THEN writes to .tmp file first', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      appendTriageLog({ ticketId: 'GH-1', outcome: 'GO', reason: 'ok', timestamp: '2026-03-19T00:00:00Z' });

      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.tmp'),
        expect.any(String),
        'utf-8'
      );
    });

    it('GIVEN appendTriageLog called THEN renames .tmp to triage-log.json', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      appendTriageLog({ ticketId: 'GH-1', outcome: 'GO', reason: 'ok', timestamp: '2026-03-19T00:00:00Z' });

      expect(renameSync).toHaveBeenCalledWith(
        expect.stringContaining('.tmp'),
        expect.stringContaining('triage-log.json')
      );
    });

    it('GIVEN directory does not exist WHEN appendTriageLog called THEN creates directory recursively', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      appendTriageLog({ ticketId: 'GH-1', outcome: 'GO', reason: 'ok', timestamp: '2026-03-19T00:00:00Z' });

      expect(mkdirSync).toHaveBeenCalledWith(MOCK_DIR, { recursive: true });
    });

    it('GIVEN directory exists WHEN appendTriageLog called THEN skips mkdir', () => {
      // First call: file doesn't exist (loadEntries), second call: dir exists (save)
      vi.mocked(existsSync)
        .mockReturnValueOnce(false) // triage-log.json
        .mockReturnValueOnce(true); // directory

      appendTriageLog({ ticketId: 'GH-1', outcome: 'GO', reason: 'ok', timestamp: '2026-03-19T00:00:00Z' });

      expect(mkdirSync).not.toHaveBeenCalled();
    });

    it('GIVEN writeFileSync called THEN uses pretty-print JSON with 2-space indent', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      appendTriageLog({ ticketId: 'GH-1', outcome: 'GO', reason: 'ok', timestamp: '2026-03-19T00:00:00Z' });

      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const content = writeCall[1] as string;
      expect(content).toContain('\n');
      expect(content).toContain('  ');
    });
  });

  // ── readTriageLog: happy path ─────────────────────────────

  describe('readTriageLog: happy path', () => {
    it('GIVEN valid log with entries WHEN readTriageLog called THEN returns all entries', () => {
      const entries: TriageLogEntry[] = [
        { ticketId: 'GH-1', outcome: 'GO', reason: 'ok', timestamp: '2026-03-19T09:00:00Z' },
        { ticketId: 'GH-2', outcome: 'REJECT', reason: 'bad', timestamp: '2026-03-19T10:00:00Z' },
        { ticketId: 'GH-3', outcome: 'NEEDS_CLARIFICATION', reason: 'unclear', timestamp: '2026-03-19T11:00:00Z' },
      ];
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(entries));

      const result = readTriageLog();
      expect(result).toEqual(entries);
      expect(result).toHaveLength(3);
    });

    it('GIVEN empty array log WHEN readTriageLog called THEN returns empty array', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('[]');

      expect(readTriageLog()).toEqual([]);
    });
  });

  // ── EDGE CASES ────────────────────────────────────────────

  describe('Edge cases', () => {
    it('GIVEN corrupted existing log WHEN appendTriageLog called THEN starts fresh and writes new entry', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('corrupted{json]');

      appendTriageLog({ ticketId: 'GH-1', outcome: 'GO', reason: 'ok', timestamp: '2026-03-19T00:00:00Z' });

      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const written = JSON.parse(writeCall[1] as string);
      expect(written).toHaveLength(1);
      expect(written[0].ticketId).toBe('GH-1');
    });

    it('GIVEN non-array JSON in log WHEN appendTriageLog called THEN starts fresh', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('{"not": "an array"}');

      appendTriageLog({ ticketId: 'GH-1', outcome: 'GO', reason: 'ok', timestamp: '2026-03-19T00:00:00Z' });

      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const written = JSON.parse(writeCall[1] as string);
      expect(written).toHaveLength(1);
    });

    it('GIVEN empty reason WHEN appendTriageLog called THEN persists empty reason', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      appendTriageLog({ ticketId: 'GH-1', outcome: 'GO', reason: '', timestamp: '2026-03-19T00:00:00Z' });

      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const written = JSON.parse(writeCall[1] as string);
      expect(written[0].reason).toBe('');
    });

    it('GIVEN multiple sequential appends WHEN called THEN each uses atomic write', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      appendTriageLog({ ticketId: 'GH-1', outcome: 'GO', reason: 'a', timestamp: '2026-03-19T00:00:00Z' });
      appendTriageLog({ ticketId: 'GH-2', outcome: 'REJECT', reason: 'b', timestamp: '2026-03-19T01:00:00Z' });

      expect(writeFileSync).toHaveBeenCalledTimes(2);
      expect(renameSync).toHaveBeenCalledTimes(2);
    });
  });
});

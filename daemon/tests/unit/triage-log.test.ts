import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from 'fs';

// Mock fs module at module level
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  renameSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

import { appendTriageLog, loadTriageLog } from '../../src/triage-log';
import type { TriageLogEntry } from '../../src/triage-log';

describe('triage-log module (GH-81)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── loadTriageLog ────────────────────────────────────────────────────────

  describe('loadTriageLog()', () => {
    it('GIVEN no triage-log.json WHEN loadTriageLog called THEN returns empty array', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const log = loadTriageLog();
      expect(log).toEqual([]);
    });

    it('GIVEN valid triage-log.json WHEN loadTriageLog called THEN returns entries', () => {
      const entries: TriageLogEntry[] = [
        { ticketId: 'PROJ-100', outcome: 'GO', reason: 'Pass', timestamp: '2026-03-19T10:00:00.000Z' },
        { ticketId: 'PROJ-101', outcome: 'REJECT', reason: 'No', timestamp: '2026-03-19T10:01:00.000Z' },
      ];
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(entries));

      const log = loadTriageLog();
      expect(log).toHaveLength(2);
      expect(log[0].ticketId).toBe('PROJ-100');
      expect(log[1].outcome).toBe('REJECT');
    });

    it('GIVEN corrupted triage-log.json WHEN loadTriageLog called THEN returns empty array', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('corrupted!!!');

      const log = loadTriageLog();
      expect(log).toEqual([]);
    });

    it('GIVEN triage-log.json contains non-array WHEN loadTriageLog called THEN returns empty array', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ not: 'an array' }));

      const log = loadTriageLog();
      expect(log).toEqual([]);
    });

    it('GIVEN readFileSync throws WHEN loadTriageLog called THEN returns empty array', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockImplementation(() => { throw new Error('EACCES'); });

      const log = loadTriageLog();
      expect(log).toEqual([]);
    });
  });

  // ─── appendTriageLog ──────────────────────────────────────────────────────

  describe('appendTriageLog()', () => {
    describe('AC: Appends triage entry with ticketId, outcome, reason, and ISO timestamp', () => {
      it('GIVEN empty log WHEN appendTriageLog called with GO THEN writes JSON with entry', () => {
        vi.mocked(existsSync).mockReturnValue(true); // dir exists
        vi.mocked(readFileSync).mockImplementation(() => { throw new Error('ENOENT'); }); // no existing file

        const entry: TriageLogEntry = {
          ticketId: 'PROJ-100',
          outcome: 'GO',
          reason: 'All checks pass',
          timestamp: '2026-03-19T10:00:00.000Z',
        };

        appendTriageLog(entry);

        // Should write to tmp file
        expect(writeFileSync).toHaveBeenCalledWith(
          expect.stringContaining('.tmp'),
          expect.stringContaining('"PROJ-100"'),
          'utf-8'
        );
        // Should rename tmp to final
        expect(renameSync).toHaveBeenCalled();
      });

      it('GIVEN empty log WHEN appendTriageLog called with NEEDS_CLARIFICATION THEN writes entry', () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockImplementation(() => { throw new Error('ENOENT'); });

        appendTriageLog({
          ticketId: 'PROJ-101',
          outcome: 'NEEDS_CLARIFICATION',
          reason: 'Missing acceptance criteria',
          timestamp: '2026-03-19T10:01:00.000Z',
        });

        expect(writeFileSync).toHaveBeenCalledWith(
          expect.stringContaining('.tmp'),
          expect.stringContaining('"NEEDS_CLARIFICATION"'),
          'utf-8'
        );
      });

      it('GIVEN empty log WHEN appendTriageLog called with REJECT THEN writes entry', () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockImplementation(() => { throw new Error('ENOENT'); });

        appendTriageLog({
          ticketId: 'PROJ-102',
          outcome: 'REJECT',
          reason: 'Out of scope',
          timestamp: '2026-03-19T10:02:00.000Z',
        });

        expect(writeFileSync).toHaveBeenCalledWith(
          expect.stringContaining('.tmp'),
          expect.stringContaining('"REJECT"'),
          'utf-8'
        );
      });

      it('GIVEN any entry WHEN appendTriageLog called THEN written JSON includes all four fields', () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockImplementation(() => { throw new Error('ENOENT'); });

        appendTriageLog({
          ticketId: 'PROJ-100',
          outcome: 'GO',
          reason: 'Pass',
          timestamp: '2026-03-19T10:00:00.000Z',
        });

        const writtenContent = vi.mocked(writeFileSync).mock.calls[0][1] as string;
        const parsed = JSON.parse(writtenContent);
        expect(parsed).toHaveLength(1);
        expect(parsed[0]).toEqual({
          ticketId: 'PROJ-100',
          outcome: 'GO',
          reason: 'Pass',
          timestamp: '2026-03-19T10:00:00.000Z',
        });
      });
    });

    describe('AC: Entries are appended (not overwritten)', () => {
      it('GIVEN log with existing entry WHEN appendTriageLog called THEN new entry is appended', () => {
        const existing: TriageLogEntry[] = [
          { ticketId: 'PROJ-100', outcome: 'GO', reason: 'Pass', timestamp: '2026-03-19T10:00:00.000Z' },
        ];
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify(existing));

        appendTriageLog({
          ticketId: 'PROJ-101',
          outcome: 'REJECT',
          reason: 'Out of scope',
          timestamp: '2026-03-19T10:01:00.000Z',
        });

        const writtenContent = vi.mocked(writeFileSync).mock.calls[0][1] as string;
        const parsed = JSON.parse(writtenContent);
        expect(parsed).toHaveLength(2);
        expect(parsed[0].ticketId).toBe('PROJ-100');
        expect(parsed[1].ticketId).toBe('PROJ-101');
      });
    });

    describe('AC: Atomic write-tmp-then-rename pattern used', () => {
      it('GIVEN appendTriageLog called THEN writes to .tmp file first then renames', () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockImplementation(() => { throw new Error('ENOENT'); });

        appendTriageLog({
          ticketId: 'PROJ-100',
          outcome: 'GO',
          reason: 'Pass',
          timestamp: '2026-03-19T10:00:00.000Z',
        });

        // Step 1: Write to .tmp
        const tmpPath = vi.mocked(writeFileSync).mock.calls[0][0] as string;
        expect(tmpPath).toMatch(/\.tmp$/);

        // Step 2: Rename .tmp to final
        const renameArgs = vi.mocked(renameSync).mock.calls[0];
        expect(renameArgs[0]).toBe(tmpPath);
        expect(String(renameArgs[1])).not.toMatch(/\.tmp$/);
      });
    });

    describe('AC: appendTriageLog failures do not throw', () => {
      it('GIVEN directory does not exist WHEN appendTriageLog called THEN creates directory', () => {
        // First existsSync call (dir check) returns false, triggers mkdirSync
        vi.mocked(existsSync).mockReturnValueOnce(false).mockReturnValue(false);
        vi.mocked(readFileSync).mockImplementation(() => { throw new Error('ENOENT'); });

        expect(() => {
          appendTriageLog({
            ticketId: 'PROJ-100',
            outcome: 'GO',
            reason: 'Pass',
            timestamp: '2026-03-19T10:00:00.000Z',
          });
        }).not.toThrow();

        expect(mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
      });

      it('GIVEN writeFileSync throws WHEN appendTriageLog called THEN does not throw', () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockImplementation(() => { throw new Error('ENOENT'); });
        vi.mocked(writeFileSync).mockImplementation(() => { throw new Error('ENOSPC'); });

        expect(() => {
          appendTriageLog({
            ticketId: 'PROJ-100',
            outcome: 'GO',
            reason: 'Pass',
            timestamp: '2026-03-19T10:00:00.000Z',
          });
        }).not.toThrow();
      });

      it('GIVEN renameSync throws WHEN appendTriageLog called THEN does not throw', () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockImplementation(() => { throw new Error('ENOENT'); });
        vi.mocked(renameSync).mockImplementation(() => { throw new Error('EXDEV'); });

        expect(() => {
          appendTriageLog({
            ticketId: 'PROJ-100',
            outcome: 'GO',
            reason: 'Pass',
            timestamp: '2026-03-19T10:00:00.000Z',
          });
        }).not.toThrow();
      });

      it('GIVEN corrupted triage-log.json WHEN appendTriageLog called THEN starts fresh with new entry', () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue('not-valid-json{{{');

        appendTriageLog({
          ticketId: 'PROJ-100',
          outcome: 'GO',
          reason: 'Pass',
          timestamp: '2026-03-19T10:00:00.000Z',
        });

        const writtenContent = vi.mocked(writeFileSync).mock.calls[0][1] as string;
        const parsed = JSON.parse(writtenContent);
        expect(parsed).toHaveLength(1);
        expect(parsed[0].ticketId).toBe('PROJ-100');
      });
    });
  });
});

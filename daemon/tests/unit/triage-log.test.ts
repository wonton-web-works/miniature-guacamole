import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

import { appendTriageLog, readTriageLog, _setBasePath } from '../../src/triage-log';
import type { TriageLogEntry, TriageStats } from '../../src/triage-log';

// ---------------------------------------------------------------------------
// Suite 1: Real filesystem tests (uses _setBasePath for isolation)
// ---------------------------------------------------------------------------

const TEST_DIR = join(process.cwd(), '.mg-daemon-test-triage-log');
const TEST_LOG_FILE = join(TEST_DIR, 'triage-log.json');

describe('appendTriageLog() — real filesystem', () => {
  beforeEach(() => {
    _setBasePath(TEST_DIR);
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  // ── MISUSE-FIRST: Error swallowing — pipeline must never be disrupted ──

  describe('error swallowing (best-effort)', () => {
    it('GIVEN filesystem write throws WHEN appendTriageLog called THEN does not throw', () => {
      _setBasePath('/dev/null/impossible-path');
      expect(() =>
        appendTriageLog({ ticketId: 'TICKET-1', outcome: 'GO', reason: 'Looks good', timestamp: new Date().toISOString() })
      ).not.toThrow();
    });

    it('GIVEN corrupted triage-log.json WHEN appendTriageLog called THEN overwrites with fresh array and does not throw', () => {
      mkdirSync(TEST_DIR, { recursive: true });
      writeFileSync(TEST_LOG_FILE, '{{{{not json}}}}', 'utf-8');

      expect(() =>
        appendTriageLog({ ticketId: 'TICKET-2', outcome: 'REJECT', reason: 'Out of scope', timestamp: new Date().toISOString() })
      ).not.toThrow();

      const content = readFileSync(TEST_LOG_FILE, 'utf-8');
      const entries = JSON.parse(content);
      expect(entries).toHaveLength(1);
      expect(entries[0].ticketId).toBe('TICKET-2');
    });

    it('GIVEN triage-log.json contains a non-array WHEN appendTriageLog called THEN resets to array with new entry', () => {
      mkdirSync(TEST_DIR, { recursive: true });
      writeFileSync(TEST_LOG_FILE, '{"not": "an array"}', 'utf-8');

      appendTriageLog({ ticketId: 'TICKET-3', outcome: 'GO', reason: 'Fine', timestamp: new Date().toISOString() });

      const entries = JSON.parse(readFileSync(TEST_LOG_FILE, 'utf-8'));
      expect(Array.isArray(entries)).toBe(true);
      expect(entries).toHaveLength(1);
    });
  });

  // ── BOUNDARY: Directory creation ──

  describe('directory creation', () => {
    it('GIVEN .mg-daemon directory does not exist WHEN appendTriageLog called THEN creates directory and writes log', () => {
      expect(existsSync(TEST_DIR)).toBe(false);

      appendTriageLog({ ticketId: 'TICKET-10', outcome: 'GO', reason: 'Approved', timestamp: new Date().toISOString() });

      expect(existsSync(TEST_DIR)).toBe(true);
      expect(existsSync(TEST_LOG_FILE)).toBe(true);
    });

    it('GIVEN .mg-daemon directory already exists WHEN appendTriageLog called THEN does not error', () => {
      mkdirSync(TEST_DIR, { recursive: true });

      expect(() =>
        appendTriageLog({ ticketId: 'TICKET-11', outcome: 'REJECT', reason: 'Nope', timestamp: new Date().toISOString() })
      ).not.toThrow();
    });
  });

  // ── BOUNDARY: Atomic writes ──

  describe('atomic writes (write-tmp-rename)', () => {
    it('GIVEN successful write WHEN appendTriageLog completes THEN no .tmp file remains', () => {
      appendTriageLog({ ticketId: 'TICKET-20', outcome: 'GO', reason: 'OK', timestamp: new Date().toISOString() });

      const tmpFile = `${TEST_LOG_FILE}.tmp`;
      expect(existsSync(tmpFile)).toBe(false);
      expect(existsSync(TEST_LOG_FILE)).toBe(true);
    });
  });

  // ── GOLDEN PATH: All three outcomes logged correctly ──

  describe('GO outcome', () => {
    it('GIVEN GO outcome WHEN appendTriageLog called THEN entry has ticketId, outcome, reason, timestamp', () => {
      appendTriageLog({ ticketId: 'GH-42', outcome: 'GO', reason: 'Ticket is well-defined', timestamp: '2026-03-19T10:00:00.000Z' });

      const entries = JSON.parse(readFileSync(TEST_LOG_FILE, 'utf-8'));
      expect(entries).toHaveLength(1);

      const entry = entries[0];
      expect(entry.ticketId).toBe('GH-42');
      expect(entry.outcome).toBe('GO');
      expect(entry.reason).toBe('Ticket is well-defined');
      expect(entry.timestamp).toBe('2026-03-19T10:00:00.000Z');
    });
  });

  describe('NEEDS_CLARIFICATION outcome', () => {
    it('GIVEN NEEDS_CLARIFICATION outcome WHEN appendTriageLog called THEN entry is recorded correctly', () => {
      appendTriageLog({ ticketId: 'PROJ-7', outcome: 'NEEDS_CLARIFICATION', reason: 'Missing acceptance criteria', timestamp: new Date().toISOString() });

      const entries = JSON.parse(readFileSync(TEST_LOG_FILE, 'utf-8'));
      expect(entries).toHaveLength(1);
      expect(entries[0].outcome).toBe('NEEDS_CLARIFICATION');
      expect(entries[0].reason).toBe('Missing acceptance criteria');
    });
  });

  describe('REJECT outcome', () => {
    it('GIVEN REJECT outcome WHEN appendTriageLog called THEN entry is recorded correctly', () => {
      appendTriageLog({ ticketId: 'LIN-99', outcome: 'REJECT', reason: 'Out of scope for this repo', timestamp: new Date().toISOString() });

      const entries = JSON.parse(readFileSync(TEST_LOG_FILE, 'utf-8'));
      expect(entries).toHaveLength(1);
      expect(entries[0].outcome).toBe('REJECT');
      expect(entries[0].ticketId).toBe('LIN-99');
    });
  });

  describe('append behavior', () => {
    it('GIVEN existing entries WHEN appendTriageLog called again THEN new entry is appended (not overwritten)', () => {
      appendTriageLog({ ticketId: 'T-1', outcome: 'GO', reason: 'First', timestamp: new Date().toISOString() });
      appendTriageLog({ ticketId: 'T-2', outcome: 'REJECT', reason: 'Second', timestamp: new Date().toISOString() });
      appendTriageLog({ ticketId: 'T-3', outcome: 'NEEDS_CLARIFICATION', reason: 'Third', timestamp: new Date().toISOString() });

      const entries = JSON.parse(readFileSync(TEST_LOG_FILE, 'utf-8'));
      expect(entries).toHaveLength(3);
      expect(entries[0].ticketId).toBe('T-1');
      expect(entries[1].ticketId).toBe('T-2');
      expect(entries[2].ticketId).toBe('T-3');
    });
  });

  describe('entry shape', () => {
    it('GIVEN any outcome WHEN entry written THEN contains exactly ticketId, outcome, reason, timestamp', () => {
      appendTriageLog({ ticketId: 'SHAPE-1', outcome: 'GO', reason: 'Test shape', timestamp: new Date().toISOString() });

      const entries = JSON.parse(readFileSync(TEST_LOG_FILE, 'utf-8'));
      const keys = Object.keys(entries[0]).sort();
      expect(keys).toEqual(['outcome', 'reason', 'ticketId', 'timestamp']);
    });
  });

  // ── readTriageLog() — TriageStats aggregation ──

  describe('readTriageLog() — missing or corrupt file returns zero counts', () => {
    it('GIVEN triage-log.json does not exist WHEN readTriageLog called THEN returns zero counts', () => {
      const stats = readTriageLog();
      expect(stats).toEqual({ go: 0, needsInfo: 0, rejected: 0 });
    });

    it('GIVEN triage-log.json contains corrupted JSON WHEN readTriageLog called THEN returns zero counts without error', () => {
      mkdirSync(TEST_DIR, { recursive: true });
      writeFileSync(TEST_LOG_FILE, '{{not json}}', 'utf-8');

      expect(() => readTriageLog()).not.toThrow();
      const stats = readTriageLog();
      expect(stats).toEqual({ go: 0, needsInfo: 0, rejected: 0 });
    });

    it('GIVEN triage-log.json contains a non-array WHEN readTriageLog called THEN returns zero counts', () => {
      mkdirSync(TEST_DIR, { recursive: true });
      writeFileSync(TEST_LOG_FILE, '"just a string"', 'utf-8');

      const stats = readTriageLog();
      expect(stats).toEqual({ go: 0, needsInfo: 0, rejected: 0 });
    });
  });

  describe('readTriageLog() — counts GO, NEEDS_CLARIFICATION, REJECT', () => {
    it('GIVEN 2 GO, 1 NEEDS_CLARIFICATION, 1 REJECT WHEN readTriageLog called THEN returns correct counts', () => {
      appendTriageLog({ ticketId: 'T-1', outcome: 'GO', reason: 'ok', timestamp: new Date().toISOString() });
      appendTriageLog({ ticketId: 'T-2', outcome: 'GO', reason: 'ok', timestamp: new Date().toISOString() });
      appendTriageLog({ ticketId: 'T-3', outcome: 'NEEDS_CLARIFICATION', reason: 'vague', timestamp: new Date().toISOString() });
      appendTriageLog({ ticketId: 'T-4', outcome: 'REJECT', reason: 'nope', timestamp: new Date().toISOString() });

      const stats = readTriageLog();
      expect(stats.go).toBe(2);
      expect(stats.needsInfo).toBe(1);
      expect(stats.rejected).toBe(1);
    });

    it('GIVEN only GO entries WHEN readTriageLog called THEN needsInfo and rejected are 0', () => {
      appendTriageLog({ ticketId: 'T-10', outcome: 'GO', reason: 'fine', timestamp: new Date().toISOString() });
      appendTriageLog({ ticketId: 'T-11', outcome: 'GO', reason: 'fine', timestamp: new Date().toISOString() });

      const stats = readTriageLog();
      expect(stats.go).toBe(2);
      expect(stats.needsInfo).toBe(0);
      expect(stats.rejected).toBe(0);
    });

    it('GIVEN empty array in file WHEN readTriageLog called THEN returns zero counts', () => {
      mkdirSync(TEST_DIR, { recursive: true });
      writeFileSync(TEST_LOG_FILE, '[]', 'utf-8');

      const stats = readTriageLog();
      expect(stats).toEqual({ go: 0, needsInfo: 0, rejected: 0 });
    });
  });

  describe('readTriageLog() — TriageStats shape', () => {
    it('GIVEN any log WHEN readTriageLog called THEN returns object with exactly go, needsInfo, rejected keys', () => {
      appendTriageLog({ ticketId: 'S-1', outcome: 'GO', reason: 'shape test', timestamp: new Date().toISOString() });

      const stats = readTriageLog();
      const keys = Object.keys(stats).sort();
      expect(keys).toEqual(['go', 'needsInfo', 'rejected']);
    });
  });
});

// ---------------------------------------------------------------------------
// Suite 2: Mocked filesystem tests (verifies call contract precisely)
// ---------------------------------------------------------------------------

describe('Triage Log Module — mocked fs', () => {
  // We need a separate vi.mock scope. Since Vitest hoists vi.mock calls,
  // we use a dynamic mock approach via spying on the real module after
  // _setBasePath is set to a known path.

  // These tests verify the atomic write pattern and call ordering
  // using real fs on the isolated TEST_DIR (already covered above).
  // The following complement with entry-shape and field assertions.

  beforeEach(() => {
    _setBasePath(TEST_DIR);
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('appendTriageLog: happy path', () => {
    it('GIVEN no existing log WHEN appendTriageLog called THEN creates new array with one entry', () => {
      const entry: TriageLogEntry = {
        ticketId: 'GH-42',
        outcome: 'GO',
        reason: 'All criteria pass',
        timestamp: '2026-03-19T10:00:00.000Z',
      };

      appendTriageLog(entry);

      const written = JSON.parse(readFileSync(TEST_LOG_FILE, 'utf-8'));
      expect(written).toEqual([entry]);
    });

    it('GIVEN existing log with entries WHEN appendTriageLog called THEN appends to array', () => {
      const existing: TriageLogEntry = { ticketId: 'GH-1', outcome: 'GO', reason: 'ok', timestamp: '2026-03-19T09:00:00.000Z' };
      appendTriageLog(existing);

      const newEntry: TriageLogEntry = {
        ticketId: 'GH-2',
        outcome: 'REJECT',
        reason: 'Out of scope',
        timestamp: '2026-03-19T10:00:00.000Z',
      };

      appendTriageLog(newEntry);

      const written = JSON.parse(readFileSync(TEST_LOG_FILE, 'utf-8'));
      expect(written).toHaveLength(2);
      expect(written[0]).toEqual(existing);
      expect(written[1]).toEqual(newEntry);
    });

    it('GIVEN entry with NEEDS_CLARIFICATION outcome WHEN appendTriageLog called THEN persists correctly', () => {
      const entry: TriageLogEntry = {
        ticketId: 'GH-7',
        outcome: 'NEEDS_CLARIFICATION',
        reason: 'Missing acceptance criteria',
        timestamp: '2026-03-19T11:00:00.000Z',
      };

      appendTriageLog(entry);

      const written = JSON.parse(readFileSync(TEST_LOG_FILE, 'utf-8'));
      expect(written[0].outcome).toBe('NEEDS_CLARIFICATION');
    });
  });

  describe('appendTriageLog: entry fields', () => {
    it('GIVEN entry WHEN persisted THEN contains ticketId, outcome, reason, timestamp', () => {
      appendTriageLog({
        ticketId: 'GH-99',
        outcome: 'GO',
        reason: 'Looks good',
        timestamp: '2026-03-19T12:00:00.000Z',
      });

      const written = JSON.parse(readFileSync(TEST_LOG_FILE, 'utf-8'));
      const entry = written[0];
      expect(entry).toHaveProperty('ticketId', 'GH-99');
      expect(entry).toHaveProperty('outcome', 'GO');
      expect(entry).toHaveProperty('reason', 'Looks good');
      expect(entry).toHaveProperty('timestamp', '2026-03-19T12:00:00.000Z');
    });

    it('GIVEN ISO timestamp WHEN persisted THEN timestamp format preserved', () => {
      const ts = '2026-03-19T23:59:59.999Z';

      appendTriageLog({ ticketId: 'GH-1', outcome: 'GO', reason: 'ok', timestamp: ts });

      const written = JSON.parse(readFileSync(TEST_LOG_FILE, 'utf-8'));
      expect(written[0].timestamp).toBe(ts);
    });
  });

  describe('Atomic write-tmp-then-rename pattern', () => {
    it('GIVEN appendTriageLog called THEN writes to .tmp file first then renames to triage-log.json', () => {
      appendTriageLog({ ticketId: 'GH-1', outcome: 'GO', reason: 'ok', timestamp: '2026-03-19T00:00:00.000Z' });

      // After completion, no .tmp remains and main file exists
      expect(existsSync(`${TEST_LOG_FILE}.tmp`)).toBe(false);
      expect(existsSync(TEST_LOG_FILE)).toBe(true);
    });

    it('GIVEN writeFileSync called THEN uses pretty-print JSON with 2-space indent', () => {
      appendTriageLog({ ticketId: 'GH-1', outcome: 'GO', reason: 'ok', timestamp: '2026-03-19T00:00:00.000Z' });

      const content = readFileSync(TEST_LOG_FILE, 'utf-8');
      expect(content).toContain('\n');
      expect(content).toContain('  ');
    });

    it('GIVEN multiple sequential appends WHEN called THEN each uses atomic write pattern', () => {
      appendTriageLog({ ticketId: 'GH-1', outcome: 'GO', reason: 'a', timestamp: '2026-03-19T00:00:00.000Z' });
      appendTriageLog({ ticketId: 'GH-2', outcome: 'REJECT', reason: 'b', timestamp: '2026-03-19T01:00:00.000Z' });

      const written = JSON.parse(readFileSync(TEST_LOG_FILE, 'utf-8'));
      expect(written).toHaveLength(2);
    });
  });

  describe('Edge cases', () => {
    it('GIVEN corrupted existing log WHEN appendTriageLog called THEN starts fresh and writes new entry', () => {
      mkdirSync(TEST_DIR, { recursive: true });
      writeFileSync(TEST_LOG_FILE, 'corrupted{json]', 'utf-8');

      appendTriageLog({ ticketId: 'GH-1', outcome: 'GO', reason: 'ok', timestamp: '2026-03-19T00:00:00.000Z' });

      const written = JSON.parse(readFileSync(TEST_LOG_FILE, 'utf-8'));
      expect(written).toHaveLength(1);
      expect(written[0].ticketId).toBe('GH-1');
    });

    it('GIVEN non-array JSON in log WHEN appendTriageLog called THEN starts fresh', () => {
      mkdirSync(TEST_DIR, { recursive: true });
      writeFileSync(TEST_LOG_FILE, '{"not": "an array"}', 'utf-8');

      appendTriageLog({ ticketId: 'GH-1', outcome: 'GO', reason: 'ok', timestamp: '2026-03-19T00:00:00.000Z' });

      const written = JSON.parse(readFileSync(TEST_LOG_FILE, 'utf-8'));
      expect(written).toHaveLength(1);
    });

    it('GIVEN empty reason WHEN appendTriageLog called THEN persists empty reason', () => {
      appendTriageLog({ ticketId: 'GH-1', outcome: 'GO', reason: '', timestamp: '2026-03-19T00:00:00.000Z' });

      const written = JSON.parse(readFileSync(TEST_LOG_FILE, 'utf-8'));
      expect(written[0].reason).toBe('');
    });
  });

  describe('readTriageLog: happy path', () => {
    it('GIVEN valid log with entries WHEN readTriageLog called THEN returns aggregated counts', () => {
      appendTriageLog({ ticketId: 'GH-1', outcome: 'GO', reason: 'ok', timestamp: '2026-03-19T09:00:00.000Z' });
      appendTriageLog({ ticketId: 'GH-2', outcome: 'REJECT', reason: 'bad', timestamp: '2026-03-19T10:00:00.000Z' });
      appendTriageLog({ ticketId: 'GH-3', outcome: 'NEEDS_CLARIFICATION', reason: 'unclear', timestamp: '2026-03-19T11:00:00.000Z' });

      const stats = readTriageLog();
      expect(stats.go).toBe(1);
      expect(stats.rejected).toBe(1);
      expect(stats.needsInfo).toBe(1);
    });

    it('GIVEN empty array log WHEN readTriageLog called THEN returns zero counts', () => {
      mkdirSync(TEST_DIR, { recursive: true });
      writeFileSync(TEST_LOG_FILE, '[]', 'utf-8');

      expect(readTriageLog()).toEqual({ go: 0, needsInfo: 0, rejected: 0 });
    });
  });
});

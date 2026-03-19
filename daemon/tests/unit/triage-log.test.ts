import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// Module under test — imported after mocks are not needed (real fs for integration-style unit tests)
import { readTriageLog, appendTriageLog, TRIAGE_LOG_PATH } from '../../src/triage-log';
import type { TriageLogEntry } from '../../src/triage-log';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tmpDir: string;

function logPath(): string {
  return path.join(tmpDir, '.mg-daemon', 'triage-log.json');
}

function daemonDir(): string {
  return path.join(tmpDir, '.mg-daemon');
}

function makeEntry(overrides: Partial<TriageLogEntry> = {}): TriageLogEntry {
  return {
    ticketId: 'PROJ-1',
    outcome: 'GO',
    reason: 'Looks good',
    timestamp: '2026-03-19T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'triage-log-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// MISUSE-FIRST: Corrupted JSON
// ---------------------------------------------------------------------------

describe('readTriageLog() — corrupted JSON', () => {
  it('GIVEN triage-log.json contains invalid JSON WHEN read THEN returns empty array', async () => {
    fs.mkdirSync(daemonDir(), { recursive: true });
    fs.writeFileSync(logPath(), '{not valid json!!!');
    const result = await readTriageLog(tmpDir);
    expect(result).toEqual([]);
  });

  it('GIVEN triage-log.json contains a JSON string instead of array WHEN read THEN returns empty array', async () => {
    fs.mkdirSync(daemonDir(), { recursive: true });
    fs.writeFileSync(logPath(), '"just a string"');
    const result = await readTriageLog(tmpDir);
    expect(result).toEqual([]);
  });

  it('GIVEN triage-log.json contains a JSON object instead of array WHEN read THEN returns empty array', async () => {
    fs.mkdirSync(daemonDir(), { recursive: true });
    fs.writeFileSync(logPath(), '{"key": "value"}');
    const result = await readTriageLog(tmpDir);
    expect(result).toEqual([]);
  });

  it('GIVEN triage-log.json contains empty string WHEN read THEN returns empty array', async () => {
    fs.mkdirSync(daemonDir(), { recursive: true });
    fs.writeFileSync(logPath(), '');
    const result = await readTriageLog(tmpDir);
    expect(result).toEqual([]);
  });

  it('GIVEN triage-log.json contains truncated JSON WHEN read THEN returns empty array', async () => {
    fs.mkdirSync(daemonDir(), { recursive: true });
    fs.writeFileSync(logPath(), '[{"ticketId":"PROJ-1","outcome":"GO"');
    const result = await readTriageLog(tmpDir);
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// MISUSE-FIRST: File system errors
// ---------------------------------------------------------------------------

describe('readTriageLog() — file system errors', () => {
  it('GIVEN triage-log.json does not exist WHEN read THEN returns empty array', async () => {
    const result = await readTriageLog(tmpDir);
    expect(result).toEqual([]);
  });

  it('GIVEN .mg-daemon directory does not exist WHEN read THEN returns empty array', async () => {
    const result = await readTriageLog(path.join(tmpDir, 'nonexistent'));
    expect(result).toEqual([]);
  });
});

describe('appendTriageLog() — error handling', () => {
  it('GIVEN appendTriageLog is called WHEN it encounters any error THEN it does not throw', async () => {
    // Use a path that can't be created (file where directory expected)
    const blockingFile = path.join(tmpDir, 'blocked');
    fs.writeFileSync(blockingFile, 'I am a file');
    // Try to use the file as if it were a directory — .mg-daemon can't be created inside a file
    await expect(
      appendTriageLog(makeEntry(), blockingFile)
    ).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// MISUSE-FIRST: Concurrent access patterns
// ---------------------------------------------------------------------------

describe('appendTriageLog() — concurrent access', () => {
  it('GIVEN multiple concurrent appends WHEN all complete THEN all entries are persisted', async () => {
    const entries = Array.from({ length: 10 }, (_, i) =>
      makeEntry({ ticketId: `PROJ-${i}`, timestamp: `2026-03-19T00:00:0${i}.000Z` })
    );

    // Run all appends concurrently
    await Promise.all(entries.map((e) => appendTriageLog(e, tmpDir)));

    const log = await readTriageLog(tmpDir);
    // All 10 entries should be present (atomic write-tmp-rename prevents corruption)
    expect(log).toHaveLength(10);
    const ids = log.map((e) => e.ticketId).sort();
    const expected = entries.map((e) => e.ticketId).sort();
    expect(ids).toEqual(expected);
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY: appendTriageLog creates .mg-daemon directory
// ---------------------------------------------------------------------------

describe('appendTriageLog() — directory creation', () => {
  it('GIVEN .mg-daemon directory does not exist WHEN entry appended THEN directory is created', async () => {
    await appendTriageLog(makeEntry(), tmpDir);
    expect(fs.existsSync(daemonDir())).toBe(true);
  });

  it('GIVEN .mg-daemon directory already exists WHEN entry appended THEN no error', async () => {
    fs.mkdirSync(daemonDir(), { recursive: true });
    await appendTriageLog(makeEntry(), tmpDir);
    const log = await readTriageLog(tmpDir);
    expect(log).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY: Atomic write durability
// ---------------------------------------------------------------------------

describe('appendTriageLog() — atomic write', () => {
  it('GIVEN an entry is appended WHEN file is read THEN it contains valid JSON', async () => {
    await appendTriageLog(makeEntry(), tmpDir);
    const raw = fs.readFileSync(logPath(), 'utf-8');
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('GIVEN an entry is appended WHEN checked THEN no .tmp file remains', async () => {
    await appendTriageLog(makeEntry(), tmpDir);
    const files = fs.readdirSync(daemonDir());
    const tmpFiles = files.filter((f) => f.endsWith('.tmp'));
    expect(tmpFiles).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH: readTriageLog
// ---------------------------------------------------------------------------

describe('readTriageLog() — golden path', () => {
  it('GIVEN log with one entry WHEN read THEN returns array with that entry', async () => {
    const entry = makeEntry();
    fs.mkdirSync(daemonDir(), { recursive: true });
    fs.writeFileSync(logPath(), JSON.stringify([entry]));
    const result = await readTriageLog(tmpDir);
    expect(result).toEqual([entry]);
  });

  it('GIVEN log with multiple entries WHEN read THEN returns all entries in order', async () => {
    const entries = [
      makeEntry({ ticketId: 'PROJ-1' }),
      makeEntry({ ticketId: 'PROJ-2', outcome: 'REJECT' }),
      makeEntry({ ticketId: 'PROJ-3', outcome: 'NEEDS_CLARIFICATION' }),
    ];
    fs.mkdirSync(daemonDir(), { recursive: true });
    fs.writeFileSync(logPath(), JSON.stringify(entries));
    const result = await readTriageLog(tmpDir);
    expect(result).toHaveLength(3);
    expect(result[0].ticketId).toBe('PROJ-1');
    expect(result[2].ticketId).toBe('PROJ-3');
  });

  it('GIVEN empty JSON array in log WHEN read THEN returns empty array', async () => {
    fs.mkdirSync(daemonDir(), { recursive: true });
    fs.writeFileSync(logPath(), '[]');
    const result = await readTriageLog(tmpDir);
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH: appendTriageLog
// ---------------------------------------------------------------------------

describe('appendTriageLog() — golden path', () => {
  it('GIVEN empty log WHEN entry appended THEN log contains one entry', async () => {
    const entry = makeEntry();
    await appendTriageLog(entry, tmpDir);
    const log = await readTriageLog(tmpDir);
    expect(log).toHaveLength(1);
    expect(log[0]).toEqual(entry);
  });

  it('GIVEN log with existing entries WHEN new entry appended THEN entry is added at end', async () => {
    const first = makeEntry({ ticketId: 'PROJ-1' });
    const second = makeEntry({ ticketId: 'PROJ-2' });
    await appendTriageLog(first, tmpDir);
    await appendTriageLog(second, tmpDir);
    const log = await readTriageLog(tmpDir);
    expect(log).toHaveLength(2);
    expect(log[0].ticketId).toBe('PROJ-1');
    expect(log[1].ticketId).toBe('PROJ-2');
  });

  it('GIVEN entry with all fields WHEN appended and read THEN all fields preserved', async () => {
    const entry: TriageLogEntry = {
      ticketId: 'GH-99',
      outcome: 'NEEDS_CLARIFICATION',
      reason: 'Missing acceptance criteria',
      timestamp: '2026-03-19T12:34:56.789Z',
    };
    await appendTriageLog(entry, tmpDir);
    const log = await readTriageLog(tmpDir);
    expect(log[0]).toEqual(entry);
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH: TriageLogEntry type shape
// ---------------------------------------------------------------------------

describe('TriageLogEntry — type shape', () => {
  it('GIVEN a TriageLogEntry WHEN inspected THEN has required fields', () => {
    const entry = makeEntry();
    expect(entry).toHaveProperty('ticketId');
    expect(entry).toHaveProperty('outcome');
    expect(entry).toHaveProperty('reason');
    expect(entry).toHaveProperty('timestamp');
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH: TRIAGE_LOG_PATH export
// ---------------------------------------------------------------------------

describe('TRIAGE_LOG_PATH — export', () => {
  it('GIVEN TRIAGE_LOG_PATH WHEN inspected THEN is a string ending with triage-log.json', () => {
    expect(typeof TRIAGE_LOG_PATH).toBe('string');
    expect(TRIAGE_LOG_PATH).toMatch(/triage-log\.json$/);
  });
});

// ---------------------------------------------------------------------------
// RECOVERY: appendTriageLog recovers from corrupted existing file
// ---------------------------------------------------------------------------

describe('appendTriageLog() — recovery from corruption', () => {
  it('GIVEN triage-log.json is corrupted WHEN entry appended THEN starts fresh with just new entry', async () => {
    fs.mkdirSync(daemonDir(), { recursive: true });
    fs.writeFileSync(logPath(), 'CORRUPTED!!!');
    await appendTriageLog(makeEntry({ ticketId: 'RECOVERY-1' }), tmpDir);
    const log = await readTriageLog(tmpDir);
    expect(log).toHaveLength(1);
    expect(log[0].ticketId).toBe('RECOVERY-1');
  });
});

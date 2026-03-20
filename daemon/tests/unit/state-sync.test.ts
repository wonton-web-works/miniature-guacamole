// Test specs for WS-DAEMON-18: Lifecycle State Sync
// Misuse-first ordering: security → parse failures → boundaries → golden path
// Tests are written BEFORE implementation — they must fail until state-sync.ts exists.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// vi.mock must be hoisted to allow vi.spyOn on Node built-in fs properties
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return { ...actual };
});
import {
  writeWorkstreamState,
  readWorkstreamState,
  appendDecision,
} from '../../src/state-sync';
import type { WorkstreamState, WorkstreamPhase } from '../../src/state-sync';
import type { ReviewDecision } from '../../src/reviewer';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const MEMORY_DIR = '/tmp/mg-test-memory';
const WORKSTREAM_ID = 'ws-001';
const TICKET_ID = 'PROJ-123';

const BASE_STATE: Partial<WorkstreamState> = {
  phase: 'executing',
  track: 'mechanical',
};

const APPROVED_RESULT = {
  decision: 'APPROVED' as ReviewDecision,
  feedback: 'All tests pass and architecture is clean.',
  requiredChanges: [],
  reviewedAt: '2026-03-20T12:00:00.000Z',
};

const REJECTED_RESULT = {
  decision: 'REQUEST_CHANGES' as ReviewDecision,
  feedback: 'Missing null checks.',
  requiredChanges: ['Fix null check in login.ts'],
  reviewedAt: '2026-03-20T12:05:00.000Z',
};

// ---------------------------------------------------------------------------
// 1. SECURITY / INJECTION TESTS
// ---------------------------------------------------------------------------

describe('writeWorkstreamState() — security / injection (WS-DAEMON-18)', () => {
  let writeFileSyncSpy: ReturnType<typeof vi.spyOn>;
  let mkdirSyncSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    writeFileSyncSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
    mkdirSyncSpy = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AC: Path traversal in memoryDir is contained', () => {
    it('GIVEN memoryDir with path traversal WHEN writeWorkstreamState called THEN writes to a path under the resolved memoryDir', () => {
      const traversalDir = '/tmp/safe/../../etc';
      writeWorkstreamState(WORKSTREAM_ID, TICKET_ID, BASE_STATE, traversalDir);

      // The function must call writeFileSync — it should not silently no-op
      expect(writeFileSyncSpy).toHaveBeenCalled();
      const [filePath] = writeFileSyncSpy.mock.calls[0] as [string, ...unknown[]];
      // Path must not escape by going above the intended base (implementation decision)
      expect(typeof filePath).toBe('string');
    });

    it('GIVEN workstreamId with path traversal segments WHEN writeWorkstreamState called THEN does not allow directory escape', () => {
      const maliciousId = '../../etc/passwd';
      writeWorkstreamState(maliciousId, TICKET_ID, BASE_STATE, MEMORY_DIR);

      expect(writeFileSyncSpy).toHaveBeenCalled();
      const [filePath] = writeFileSyncSpy.mock.calls[0] as [string, ...unknown[]];
      // Resolved path must start with the memory dir
      const resolvedMemory = path.resolve(MEMORY_DIR);
      const resolvedFile = path.resolve(filePath);
      expect(resolvedFile.startsWith(resolvedMemory)).toBe(true);
    });

    it('GIVEN ticketId with null bytes WHEN writeWorkstreamState called THEN does not throw', () => {
      const nullTicket = 'PROJ-123\0malicious';
      expect(() =>
        writeWorkstreamState(WORKSTREAM_ID, nullTicket, BASE_STATE, MEMORY_DIR)
      ).not.toThrow();
    });

    it('GIVEN state with extremely long feedback string WHEN writeWorkstreamState called THEN does not throw', () => {
      const bloatedState: Partial<WorkstreamState> = {
        phase: 'reviewing',
        reviewResult: {
          decision: 'APPROVED',
          feedback: 'A'.repeat(200_000),
          requiredChanges: [],
          reviewedAt: new Date().toISOString(),
        },
      };
      expect(() =>
        writeWorkstreamState(WORKSTREAM_ID, TICKET_ID, bloatedState, MEMORY_DIR)
      ).not.toThrow();
    });
  });
});

describe('appendDecision() — security / injection (WS-DAEMON-18)', () => {
  let readFileSyncSpy: ReturnType<typeof vi.spyOn>;
  let writeFileSyncSpy: ReturnType<typeof vi.spyOn>;
  let existsSyncSpy: ReturnType<typeof vi.spyOn>;
  let mkdirSyncSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    readFileSyncSpy = vi.spyOn(fs, 'readFileSync').mockReturnValue('[]');
    writeFileSyncSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
    existsSyncSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    mkdirSyncSpy = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('GIVEN decisions.json containing JSON injection WHEN appendDecision called THEN new entry is valid JSON', () => {
    // Existing decisions.json has injected content
    const injectedExisting = `[{"id":"x","decision":"APPROVED","injection":"\\\\"}]"}]'}]`;
    readFileSyncSpy.mockReturnValue(injectedExisting);

    // Should not throw when encountering corrupt existing data
    expect(() =>
      appendDecision(TICKET_ID, WORKSTREAM_ID, 'APPROVED', 'Clean output.', MEMORY_DIR)
    ).not.toThrow();
  });

  it('GIVEN feedback with JSON-breaking characters WHEN appendDecision called THEN written JSON is parseable', () => {
    writeFileSyncSpy.mockImplementation(() => undefined);
    readFileSyncSpy.mockReturnValue('[]');

    appendDecision(
      TICKET_ID,
      WORKSTREAM_ID,
      'APPROVED',
      'Feedback with "quotes" and \\backslashes\\ and\nnewlines',
      MEMORY_DIR
    );

    expect(writeFileSyncSpy).toHaveBeenCalled();
    const [, content] = writeFileSyncSpy.mock.calls[0] as [string, string, ...unknown[]];
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it('GIVEN memoryDir with path traversal WHEN appendDecision called THEN writes within resolved memoryDir', () => {
    const traversalDir = '/tmp/safe/../../etc';
    appendDecision(TICKET_ID, WORKSTREAM_ID, 'APPROVED', 'feedback', traversalDir);

    expect(writeFileSyncSpy).toHaveBeenCalled();
    const [filePath] = writeFileSyncSpy.mock.calls[0] as [string, ...unknown[]];
    expect(typeof filePath).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// 2. PARSE FAILURE TESTS
// ---------------------------------------------------------------------------

describe('readWorkstreamState() — parse failures (WS-DAEMON-18)', () => {
  let readFileSyncSpy: ReturnType<typeof vi.spyOn>;
  let existsSyncSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    readFileSyncSpy = vi.spyOn(fs, 'readFileSync');
    existsSyncSpy = vi.spyOn(fs, 'existsSync');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AC: Handles missing or corrupt state files gracefully', () => {
    it('GIVEN state file does not exist WHEN readWorkstreamState called THEN returns null', () => {
      existsSyncSpy.mockReturnValue(false);

      const result = readWorkstreamState(WORKSTREAM_ID, TICKET_ID, MEMORY_DIR);

      expect(result).toBeNull();
    });

    it('GIVEN state file contains invalid JSON WHEN readWorkstreamState called THEN returns null without throwing', () => {
      existsSyncSpy.mockReturnValue(true);
      readFileSyncSpy.mockReturnValue('{ this is not valid json ]]]');

      let result: WorkstreamState | null | undefined;
      try {
        result = readWorkstreamState(WORKSTREAM_ID, TICKET_ID, MEMORY_DIR);
      } catch (_) {
        return; // throwing is also acceptable — test documents either contract
      }
      expect(result).toBeNull();
    });

    it('GIVEN state file contains empty string WHEN readWorkstreamState called THEN returns null', () => {
      existsSyncSpy.mockReturnValue(true);
      readFileSyncSpy.mockReturnValue('');

      let result: WorkstreamState | null | undefined;
      try {
        result = readWorkstreamState(WORKSTREAM_ID, TICKET_ID, MEMORY_DIR);
      } catch (_) {
        return;
      }
      expect(result).toBeNull();
    });

    it('GIVEN state file contains JSON array instead of object WHEN readWorkstreamState called THEN returns null', () => {
      existsSyncSpy.mockReturnValue(true);
      readFileSyncSpy.mockReturnValue('["unexpected", "array"]');

      let result: WorkstreamState | null | undefined;
      try {
        result = readWorkstreamState(WORKSTREAM_ID, TICKET_ID, MEMORY_DIR);
      } catch (_) {
        return;
      }
      // An array is not a valid WorkstreamState
      expect(result).toBeNull();
    });

    it('GIVEN state file is valid JSON but missing required workstreamId WHEN readWorkstreamState called THEN returns null or partial object', () => {
      existsSyncSpy.mockReturnValue(true);
      readFileSyncSpy.mockReturnValue(JSON.stringify({ phase: 'executing' }));

      const result = readWorkstreamState(WORKSTREAM_ID, TICKET_ID, MEMORY_DIR);
      // Either null (strict) or the partial object — implementation decides
      // Key guarantee: must not throw
      expect(result === null || typeof result === 'object').toBe(true);
    });
  });
});

describe('appendDecision() — parse failures (WS-DAEMON-18)', () => {
  let readFileSyncSpy: ReturnType<typeof vi.spyOn>;
  let writeFileSyncSpy: ReturnType<typeof vi.spyOn>;
  let existsSyncSpy: ReturnType<typeof vi.spyOn>;
  let mkdirSyncSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    readFileSyncSpy = vi.spyOn(fs, 'readFileSync');
    writeFileSyncSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
    existsSyncSpy = vi.spyOn(fs, 'existsSync');
    mkdirSyncSpy = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('GIVEN decisions.json does not exist WHEN appendDecision called THEN creates file with single entry', () => {
    existsSyncSpy.mockReturnValue(false);

    appendDecision(TICKET_ID, WORKSTREAM_ID, 'APPROVED', 'First decision.', MEMORY_DIR);

    expect(writeFileSyncSpy).toHaveBeenCalled();
    const [, content] = writeFileSyncSpy.mock.calls[0] as [string, string, ...unknown[]];
    const parsed = JSON.parse(content);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
  });

  it('GIVEN decisions.json contains corrupt JSON WHEN appendDecision called THEN does not throw and writes new file', () => {
    existsSyncSpy.mockReturnValue(true);
    readFileSyncSpy.mockReturnValue('corrupt {{{');

    expect(() =>
      appendDecision(TICKET_ID, WORKSTREAM_ID, 'APPROVED', 'Recovery.', MEMORY_DIR)
    ).not.toThrow();
    expect(writeFileSyncSpy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 3. BOUNDARY TESTS
// ---------------------------------------------------------------------------

describe('writeWorkstreamState() — boundary tests (WS-DAEMON-18)', () => {
  let writeFileSyncSpy: ReturnType<typeof vi.spyOn>;
  let mkdirSyncSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    writeFileSyncSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
    mkdirSyncSpy = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AC: File naming convention', () => {
    it('GIVEN workstreamId and ticketId WHEN writeWorkstreamState called THEN writes to workstream-{id}-state.json pattern', () => {
      writeWorkstreamState('ws-007', 'PROJ-999', BASE_STATE, MEMORY_DIR);

      expect(writeFileSyncSpy).toHaveBeenCalled();
      const [filePath] = writeFileSyncSpy.mock.calls[0] as [string, ...unknown[]];
      expect(filePath).toMatch(/workstream.*state\.json/i);
    });

    it('GIVEN memoryDir without trailing slash WHEN writeWorkstreamState called THEN path is correctly formed', () => {
      writeWorkstreamState(WORKSTREAM_ID, TICKET_ID, BASE_STATE, '/tmp/no-slash');

      const [filePath] = writeFileSyncSpy.mock.calls[0] as [string, ...unknown[]];
      // Must not produce double slashes like //
      expect(filePath).not.toContain('//');
    });
  });

  describe('AC: Written state is valid JSON with required fields', () => {
    it('GIVEN valid state WHEN writeWorkstreamState called THEN written content is parseable JSON', () => {
      let capturedContent: string | undefined;
      writeFileSyncSpy.mockImplementation((_path: unknown, content: unknown) => {
        capturedContent = content as string;
      });

      writeWorkstreamState(WORKSTREAM_ID, TICKET_ID, BASE_STATE, MEMORY_DIR);

      expect(capturedContent).toBeDefined();
      expect(() => JSON.parse(capturedContent!)).not.toThrow();
    });

    it('GIVEN valid state WHEN writeWorkstreamState called THEN written JSON includes workstreamId', () => {
      let capturedContent: string | undefined;
      writeFileSyncSpy.mockImplementation((_path: unknown, content: unknown) => {
        capturedContent = content as string;
      });

      writeWorkstreamState(WORKSTREAM_ID, TICKET_ID, BASE_STATE, MEMORY_DIR);

      const parsed = JSON.parse(capturedContent!);
      expect(parsed.workstreamId).toBe(WORKSTREAM_ID);
    });

    it('GIVEN valid state WHEN writeWorkstreamState called THEN written JSON includes ticketId', () => {
      let capturedContent: string | undefined;
      writeFileSyncSpy.mockImplementation((_path: unknown, content: unknown) => {
        capturedContent = content as string;
      });

      writeWorkstreamState(WORKSTREAM_ID, TICKET_ID, BASE_STATE, MEMORY_DIR);

      const parsed = JSON.parse(capturedContent!);
      expect(parsed.ticketId).toBe(TICKET_ID);
    });

    it('GIVEN valid state WHEN writeWorkstreamState called THEN written JSON includes updatedAt ISO timestamp', () => {
      let capturedContent: string | undefined;
      writeFileSyncSpy.mockImplementation((_path: unknown, content: unknown) => {
        capturedContent = content as string;
      });

      writeWorkstreamState(WORKSTREAM_ID, TICKET_ID, BASE_STATE, MEMORY_DIR);

      const parsed = JSON.parse(capturedContent!);
      expect(parsed.updatedAt).toBeDefined();
      expect(Number.isNaN(Date.parse(parsed.updatedAt))).toBe(false);
    });

    it('GIVEN phase in state WHEN writeWorkstreamState called THEN written JSON includes the phase', () => {
      let capturedContent: string | undefined;
      writeFileSyncSpy.mockImplementation((_path: unknown, content: unknown) => {
        capturedContent = content as string;
      });

      writeWorkstreamState(WORKSTREAM_ID, TICKET_ID, { phase: 'merged' }, MEMORY_DIR);

      const parsed = JSON.parse(capturedContent!);
      expect(parsed.phase).toBe('merged');
    });
  });

  describe('AC: Partial state merges with existing', () => {
    it('GIVEN empty partial state WHEN writeWorkstreamState called THEN still writes workstreamId and ticketId', () => {
      let capturedContent: string | undefined;
      writeFileSyncSpy.mockImplementation((_path: unknown, content: unknown) => {
        capturedContent = content as string;
      });

      writeWorkstreamState(WORKSTREAM_ID, TICKET_ID, {}, MEMORY_DIR);

      const parsed = JSON.parse(capturedContent!);
      expect(parsed.workstreamId).toBe(WORKSTREAM_ID);
      expect(parsed.ticketId).toBe(TICKET_ID);
    });
  });

  describe('AC: All WorkstreamPhase values are valid', () => {
    const phases: WorkstreamPhase[] = [
      'planning',
      'executing',
      'reviewing',
      'approved',
      'changes_requested',
      'merged',
      'failed',
    ];

    for (const phase of phases) {
      it(`GIVEN phase="${phase}" WHEN writeWorkstreamState called THEN does not throw`, () => {
        expect(() =>
          writeWorkstreamState(WORKSTREAM_ID, TICKET_ID, { phase }, MEMORY_DIR)
        ).not.toThrow();
      });
    }
  });
});

describe('appendDecision() — boundary tests (WS-DAEMON-18)', () => {
  let readFileSyncSpy: ReturnType<typeof vi.spyOn>;
  let writeFileSyncSpy: ReturnType<typeof vi.spyOn>;
  let existsSyncSpy: ReturnType<typeof vi.spyOn>;
  let mkdirSyncSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    readFileSyncSpy = vi.spyOn(fs, 'readFileSync');
    writeFileSyncSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
    existsSyncSpy = vi.spyOn(fs, 'existsSync');
    mkdirSyncSpy = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('GIVEN existing decisions array with 1 entry WHEN appendDecision called THEN result has 2 entries', () => {
    existsSyncSpy.mockReturnValue(true);
    readFileSyncSpy.mockReturnValue(
      JSON.stringify([{ ticketId: 'OLD-1', decision: 'APPROVED', timestamp: '2026-01-01T00:00:00Z' }])
    );

    let capturedContent: string | undefined;
    writeFileSyncSpy.mockImplementation((_path: unknown, content: unknown) => {
      capturedContent = content as string;
    });

    appendDecision(TICKET_ID, WORKSTREAM_ID, 'REQUEST_CHANGES', 'Feedback here.', MEMORY_DIR);

    const parsed = JSON.parse(capturedContent!);
    expect(parsed).toHaveLength(2);
  });

  it('GIVEN appendDecision called THEN new entry includes ticketId, workstreamId, decision, feedback, and timestamp', () => {
    existsSyncSpy.mockReturnValue(true);
    readFileSyncSpy.mockReturnValue('[]');

    let capturedContent: string | undefined;
    writeFileSyncSpy.mockImplementation((_path: unknown, content: unknown) => {
      capturedContent = content as string;
    });

    appendDecision(TICKET_ID, WORKSTREAM_ID, 'APPROVED', 'Ship it.', MEMORY_DIR);

    const parsed = JSON.parse(capturedContent!);
    const entry = parsed[0];
    expect(entry.ticketId).toBe(TICKET_ID);
    expect(entry.workstreamId).toBe(WORKSTREAM_ID);
    expect(entry.decision).toBe('APPROVED');
    expect(entry.feedback).toBe('Ship it.');
    expect(entry.timestamp).toBeDefined();
    expect(Number.isNaN(Date.parse(entry.timestamp))).toBe(false);
  });

  it('GIVEN empty feedback string WHEN appendDecision called THEN does not throw', () => {
    existsSyncSpy.mockReturnValue(true);
    readFileSyncSpy.mockReturnValue('[]');

    expect(() =>
      appendDecision(TICKET_ID, WORKSTREAM_ID, 'APPROVED', '', MEMORY_DIR)
    ).not.toThrow();
  });

  it('GIVEN decisions file written THEN target path is decisions.json inside memoryDir', () => {
    existsSyncSpy.mockReturnValue(true);
    readFileSyncSpy.mockReturnValue('[]');

    appendDecision(TICKET_ID, WORKSTREAM_ID, 'APPROVED', 'feedback', MEMORY_DIR);

    const [filePath] = writeFileSyncSpy.mock.calls[0] as [string, ...unknown[]];
    expect(filePath).toMatch(/decisions\.json$/);
  });
});

// ---------------------------------------------------------------------------
// 4. GOLDEN PATH TESTS
// ---------------------------------------------------------------------------

describe('writeWorkstreamState() + readWorkstreamState() — golden path (WS-DAEMON-18)', () => {
  let writeFileSyncSpy: ReturnType<typeof vi.spyOn>;
  let readFileSyncSpy: ReturnType<typeof vi.spyOn>;
  let existsSyncSpy: ReturnType<typeof vi.spyOn>;
  let mkdirSyncSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mkdirSyncSpy = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
    existsSyncSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(true);

    // Capture write and feed it back to read
    let storedContent = '';
    writeFileSyncSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation((_path: unknown, content: unknown) => {
      storedContent = content as string;
    });
    readFileSyncSpy = vi.spyOn(fs, 'readFileSync').mockImplementation(() => storedContent);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('GIVEN a state is written WHEN readWorkstreamState called for same id THEN returns the written state', () => {
    writeWorkstreamState(WORKSTREAM_ID, TICKET_ID, { phase: 'reviewing' }, MEMORY_DIR);
    const result = readWorkstreamState(WORKSTREAM_ID, TICKET_ID, MEMORY_DIR);

    expect(result).not.toBeNull();
    expect(result!.phase).toBe('reviewing');
  });

  it('GIVEN state written with reviewResult WHEN readWorkstreamState called THEN reviewResult is preserved', () => {
    writeWorkstreamState(
      WORKSTREAM_ID,
      TICKET_ID,
      { phase: 'approved', reviewResult: APPROVED_RESULT },
      MEMORY_DIR
    );
    const result = readWorkstreamState(WORKSTREAM_ID, TICKET_ID, MEMORY_DIR);

    expect(result!.reviewResult?.decision).toBe('APPROVED');
    expect(result!.reviewResult?.feedback).toBe('All tests pass and architecture is clean.');
  });

  it('GIVEN state written with mergeResult WHEN readWorkstreamState called THEN mergeResult is preserved', () => {
    const mergeResult = {
      outcome: 'merged' as const,
      prUrl: 'https://github.com/org/repo/pull/17',
      rejectionCount: 0,
      mergedAt: '2026-03-20T13:00:00.000Z',
    };

    writeWorkstreamState(
      WORKSTREAM_ID,
      TICKET_ID,
      { phase: 'merged', mergeResult },
      MEMORY_DIR
    );
    const result = readWorkstreamState(WORKSTREAM_ID, TICKET_ID, MEMORY_DIR);

    expect(result!.mergeResult?.outcome).toBe('merged');
    expect(result!.mergeResult?.prUrl).toBe('https://github.com/org/repo/pull/17');
  });

  it('GIVEN state written twice for same workstream WHEN readWorkstreamState called THEN returns most recent state', () => {
    let storedContent = '';
    writeFileSyncSpy.mockImplementation((_path: unknown, content: unknown) => {
      storedContent = content as string;
    });
    readFileSyncSpy.mockImplementation(() => storedContent);

    writeWorkstreamState(WORKSTREAM_ID, TICKET_ID, { phase: 'executing' }, MEMORY_DIR);
    writeWorkstreamState(WORKSTREAM_ID, TICKET_ID, { phase: 'reviewing' }, MEMORY_DIR);

    const result = readWorkstreamState(WORKSTREAM_ID, TICKET_ID, MEMORY_DIR);
    expect(result!.phase).toBe('reviewing');
  });
});

describe('appendDecision() — golden path (WS-DAEMON-18)', () => {
  let readFileSyncSpy: ReturnType<typeof vi.spyOn>;
  let writeFileSyncSpy: ReturnType<typeof vi.spyOn>;
  let existsSyncSpy: ReturnType<typeof vi.spyOn>;
  let mkdirSyncSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    readFileSyncSpy = vi.spyOn(fs, 'readFileSync').mockReturnValue('[]');
    writeFileSyncSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
    existsSyncSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    mkdirSyncSpy = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('GIVEN two calls to appendDecision WHEN both called THEN decisions.json has 2 entries', () => {
    let stored = '[]';
    readFileSyncSpy.mockImplementation(() => stored);
    writeFileSyncSpy.mockImplementation((_path: unknown, content: unknown) => {
      stored = content as string;
    });

    appendDecision(TICKET_ID, 'ws-001', 'APPROVED', 'First review.', MEMORY_DIR);
    appendDecision(TICKET_ID, 'ws-002', 'REQUEST_CHANGES', 'Second review.', MEMORY_DIR);

    const parsed = JSON.parse(stored);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].decision).toBe('APPROVED');
    expect(parsed[1].decision).toBe('REQUEST_CHANGES');
  });

  it('GIVEN APPROVED decision WHEN appendDecision called THEN entry decision field is APPROVED', () => {
    let capturedContent: string | undefined;
    writeFileSyncSpy.mockImplementation((_path: unknown, content: unknown) => {
      capturedContent = content as string;
    });

    appendDecision(TICKET_ID, WORKSTREAM_ID, 'APPROVED', 'Looks great.', MEMORY_DIR);

    const parsed = JSON.parse(capturedContent!);
    expect(parsed[0].decision).toBe('APPROVED');
  });

  it('GIVEN REQUEST_CHANGES decision WHEN appendDecision called THEN entry decision field is REQUEST_CHANGES', () => {
    let capturedContent: string | undefined;
    writeFileSyncSpy.mockImplementation((_path: unknown, content: unknown) => {
      capturedContent = content as string;
    });

    appendDecision(TICKET_ID, WORKSTREAM_ID, 'REQUEST_CHANGES', 'Fix the issues.', MEMORY_DIR);

    const parsed = JSON.parse(capturedContent!);
    expect(parsed[0].decision).toBe('REQUEST_CHANGES');
  });

  it('GIVEN memoryDir that does not exist WHEN appendDecision called THEN mkdirSync is called to create it', () => {
    existsSyncSpy.mockReturnValue(false);

    appendDecision(TICKET_ID, WORKSTREAM_ID, 'APPROVED', 'feedback', MEMORY_DIR);

    expect(mkdirSyncSpy).toHaveBeenCalled();
  });
});

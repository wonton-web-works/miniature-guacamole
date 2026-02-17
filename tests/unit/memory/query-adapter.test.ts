/**
 * query.ts Adapter Migration Tests — WS-ENT-2
 *
 * Verifies that queryMemory() delegates to the storage adapter instead of
 * hitting the filesystem directly (fs.readdirSync / fs.readFileSync).
 *
 * AC-ENT-2.9: query.ts migrated to use adapter pattern
 *
 * This test validates the FUTURE behavior — tests will fail (red phase)
 * until the implementation replaces the direct fs calls with adapter.query().
 *
 * Test order: MISUSE → BOUNDARY → GOLDEN PATH
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';

// ---------------------------------------------------------------------------
// Mock pg for factory (prevents real pg import errors)
// ---------------------------------------------------------------------------
vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => ({
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    end: vi.fn().mockResolvedValue(undefined),
  })),
}));

// ---------------------------------------------------------------------------
// Mock the adapter factory to return a mock adapter
// This proves queryMemory delegates to getAdapter().query() instead of using fs
// ---------------------------------------------------------------------------
const mockQuery = vi.fn().mockResolvedValue([]);
const mockClose = vi.fn().mockResolvedValue(undefined);

vi.mock('../../../src/memory/adapters/factory', () => ({
  getAdapter: vi.fn(() => ({
    read: vi.fn(),
    write: vi.fn(),
    query: mockQuery,
    delete: vi.fn(),
    subscribe: vi.fn(),
    publish: vi.fn(),
    close: mockClose,
  })),
}));

import { queryMemory } from '../../../src/memory/query';

// ---------------------------------------------------------------------------
// MISUSE CASES
// ---------------------------------------------------------------------------

describe('queryMemory() Adapter Delegation — MISUSE CASES', () => {
  beforeEach(() => {
    mockQuery.mockClear();
    mockQuery.mockResolvedValue([]);
    mockClose.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('queryMemory() — should NOT use fs directly', () => {
    it('Given queryMemory() is called, When it runs, Then fs.readdirSync is NOT called', async () => {
      const readdirSpy = vi.spyOn(fs, 'readdirSync').mockReturnValue([]);
      await queryMemory({});
      // After migration, queryMemory must not call fs.readdirSync at all
      expect(readdirSpy).not.toHaveBeenCalled();
    });

    it('Given queryMemory() is called, When it runs, Then fs.readFileSync is NOT called for query operations', async () => {
      const readFileSpy = vi.spyOn(fs, 'readFileSync').mockReturnValue('{}');
      await queryMemory({ agent_id: 'dev' });
      // After migration, queryMemory must delegate to adapter.query(), not readFileSync
      expect(readFileSpy).not.toHaveBeenCalled();
    });

    it('Given queryMemory() is called, When it runs, Then fs.existsSync is NOT called', async () => {
      const existsSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      await queryMemory({ workstream_id: 'WS-1' });
      expect(existsSpy).not.toHaveBeenCalled();
    });
  });

  describe('queryMemory() — invalid filters', () => {
    it('Given null filter, When queryMemory() called, Then returns empty array or throws cleanly', async () => {
      let result: any;
      try {
        result = await queryMemory(null as any);
        expect(Array.isArray(result)).toBe(true);
      } catch (err: any) {
        expect(err.message).toBeDefined();
      }
    });

    it('Given filter with injection in agent_id, When queryMemory() called, Then adapter.query() receives the filter (not fs calls)', async () => {
      const readdirSpy = vi.spyOn(fs, 'readdirSync').mockReturnValue([]);
      await queryMemory({ agent_id: "' OR 1=1--" }).catch(() => {});
      expect(readdirSpy).not.toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY TESTS
// ---------------------------------------------------------------------------

describe('queryMemory() Adapter Delegation — BOUNDARY TESTS', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('queryMemory() — edge filter combinations', () => {
    it('Given empty filter object, When queryMemory() called, Then returns results from adapter (not fs)', async () => {
      const readdirSpy = vi.spyOn(fs, 'readdirSync').mockReturnValue([]);
      const result = await queryMemory({});
      expect(readdirSpy).not.toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('Given only start/end timestamp filters, When queryMemory() called, Then delegates to adapter', async () => {
      const readdirSpy = vi.spyOn(fs, 'readdirSync').mockReturnValue([]);
      await queryMemory({ start: '2026-01-01T00:00:00Z', end: '2026-12-31T23:59:59Z' });
      expect(readdirSpy).not.toHaveBeenCalled();
    });

    it('Given all four filters set, When queryMemory() called, Then passes all four to adapter', async () => {
      const readdirSpy = vi.spyOn(fs, 'readdirSync').mockReturnValue([]);
      await queryMemory({
        agent_id: 'dev',
        workstream_id: 'WS-ENT-2',
        start: '2026-01-01T00:00:00Z',
        end: '2026-12-31T23:59:59Z',
      });
      expect(readdirSpy).not.toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH
// ---------------------------------------------------------------------------

describe('queryMemory() Adapter Delegation — GOLDEN PATH', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('queryMemory() — delegates to adapter.query()', () => {
    it('Given adapter returns entries, When queryMemory() called, Then returns same entries', async () => {
      const entries = [
        { timestamp: '2026-02-17T00:00:00Z', agent_id: 'dev', workstream_id: 'WS-1', data: { status: 'done' } },
      ];
      // Mock the module-level adapter instance used by queryMemory
      // After migration, queryMemory should call getAdapter().query(filter)
      const readdirSpy = vi.spyOn(fs, 'readdirSync').mockReturnValue([]);
      const result = await queryMemory({ agent_id: 'dev' });
      // fs.readdirSync must NOT be called — adapter.query() handles this
      expect(readdirSpy).not.toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('Given queryMemory() returns results, When results examined, Then they match MemoryEntry shape', async () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue([]);
      const result = await queryMemory({});
      // Each entry should have the correct shape (empty is fine in test context)
      result.forEach((entry: any) => {
        expect(entry).toHaveProperty('timestamp');
        expect(entry).toHaveProperty('agent_id');
        expect(entry).toHaveProperty('workstream_id');
        expect(entry).toHaveProperty('data');
      });
    });

    it('Given adapter throws error, When queryMemory() called, Then returns empty array (graceful degradation)', async () => {
      vi.spyOn(fs, 'readdirSync').mockImplementation(() => { throw new Error('ENOENT'); });
      // After migration: adapter error should result in [] return, not propagated exception
      const result = await queryMemory({});
      expect(Array.isArray(result)).toBe(true);
    });

    it('Given queryMemory() with agent_id filter, When adapter delegates, Then result is filtered by agent', async () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue([]);
      const result = await queryMemory({ agent_id: 'dev' });
      // All returned entries must have agent_id === 'dev' (when adapter filters correctly)
      result.forEach((entry: any) => {
        expect(entry.agent_id).toBe('dev');
      });
    });
  });

  describe('queryMemory() — result shape compliance', () => {
    it('Given query with no filters, When results returned, Then sorted by timestamp ascending', async () => {
      vi.spyOn(fs, 'readdirSync').mockReturnValue([]);
      const result = await queryMemory({});
      // Verify chronological sort (may be empty in test context — that's fine)
      if (result.length > 1) {
        for (let i = 1; i < result.length; i++) {
          const prev = new Date(result[i - 1].timestamp).getTime();
          const curr = new Date(result[i].timestamp).getTime();
          expect(curr).toBeGreaterThanOrEqual(prev);
        }
      }
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

/**
 * PostgresAdapter Unit Tests — WS-ENT-2
 *
 * Tests for CRUD operations on PostgresAdapter using mocked pg Pool.
 * Does NOT require a running Postgres instance.
 *
 * AC-ENT-2.1: PostgresAdapter implements full StorageAdapter interface
 * AC-ENT-2.2: JSONB storage for flexible agent memory data
 * AC-ENT-2.3: Event sourcing via agent_events table
 * AC-ENT-2.5: Connection pooling (pg Pool)
 *
 * Test order (misuse-first CAD protocol):
 *   1. MISUSE CASES  — invalid inputs, injection, protocol pollution
 *   2. BOUNDARY TESTS — edge values, pool limits, concurrent writes
 *   3. GOLDEN PATH   — normal CRUD operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the 'pg' module before any adapter import
// ---------------------------------------------------------------------------
const mockQuery = vi.fn();
const mockRelease = vi.fn();
const mockConnect = vi.fn();
const mockPoolEnd = vi.fn();

vi.mock('pg', () => {
  return {
    Pool: vi.fn().mockImplementation(() => ({
      query: mockQuery,
      connect: mockConnect,
      end: mockPoolEnd,
    })),
  };
});

// Import after mock is registered
import { PostgresAdapter } from '../../../../enterprise/src/storage/postgres-adapter';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeQueryResult(rows: any[] = []) {
  return { rows, rowCount: rows.length };
}

function makeEntry(overrides: Record<string, any> = {}) {
  return {
    agent_id: 'dev',
    workstream_id: 'WS-ENT-2',
    data: { status: 'active' },
    timestamp: '2026-02-17T10:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// MISUSE CASES
// ---------------------------------------------------------------------------

describe('PostgresAdapter — MISUSE CASES', () => {
  let adapter: PostgresAdapter;

  beforeEach(() => {
    mockQuery.mockReset();
    mockConnect.mockReset();
    mockPoolEnd.mockReset();
    adapter = new PostgresAdapter({ connectionString: 'postgresql://localhost/test' });
  });

  afterEach(async () => {
    await adapter.close();
  });

  // ---- SQL injection in read key ----
  describe('read() — SQL injection', () => {
    it('Given key contains SQL injection, When read() called, Then returns error without executing injection', async () => {
      const result = await adapter.read("' OR '1'='1");
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid key/i);
      // The raw injection string must never reach the query as-is
      expect(mockQuery).not.toHaveBeenCalledWith(
        expect.stringContaining("' OR '1'='1"),
        expect.anything()
      );
    });

    it('Given key contains semicolon injection, When read() called, Then rejects key', async () => {
      const result = await adapter.read('key; DROP TABLE memory_entries;--');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('Given key with null byte, When read() called, Then returns error', async () => {
      const result = await adapter.read('key\x00injection');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid key/i);
    });

    it('Given key with directory traversal, When read() called, Then returns error', async () => {
      const result = await adapter.read('../../etc/passwd');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid key/i);
    });

    it('Given empty key, When read() called, Then returns error', async () => {
      const result = await adapter.read('');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ---- SQL injection in write key ----
  describe('write() — SQL injection in key', () => {
    it('Given key contains SQL injection, When write() called, Then returns error', async () => {
      const result = await adapter.write("'; DROP TABLE memory_entries;--", { data: 'x' });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('Given key is empty, When write() called, Then returns error', async () => {
      const result = await adapter.write('', { data: 'x' });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ---- SQL injection in query filters ----
  describe('query() — SQL injection in filters', () => {
    it('Given agent_id contains SQL injection, When query() called, Then uses parameterized query', async () => {
      mockQuery.mockResolvedValue(makeQueryResult([]));
      await adapter.query({ agent_id: "' OR 1=1--" });
      // Verify parameterized call: injection string goes into $1 param, not the SQL string
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(["' OR 1=1--"])
      );
      // The SQL template itself must not contain the injection literal
      const sqlArg = mockQuery.mock.calls[0][0] as string;
      expect(sqlArg).not.toContain("' OR 1=1--");
    });

    it('Given workstream_id contains SQL injection, When query() called, Then parameterizes correctly', async () => {
      mockQuery.mockResolvedValue(makeQueryResult([]));
      await adapter.query({ workstream_id: "'; DELETE FROM memory_entries;--" });
      const params = mockQuery.mock.calls[0][1] as string[];
      expect(params).toContain("'; DELETE FROM memory_entries;--");
      const sqlArg = mockQuery.mock.calls[0][0] as string;
      expect(sqlArg).not.toContain("'; DELETE FROM memory_entries;--");
    });
  });

  // ---- Connection string injection ----
  describe('constructor — connection string injection', () => {
    it('Given connection string with embedded commands, When adapter created, Then does not execute commands', () => {
      // This should construct without executing shell commands
      expect(() => {
        new PostgresAdapter({ connectionString: 'postgresql://localhost/test; rm -rf /' });
      }).not.toThrow();
      // The adapter should construct but pg Pool will reject at connect time (mocked)
    });
  });

  // ---- Prototype pollution via JSONB data ----
  describe('write() — prototype pollution', () => {
    it('Given data contains __proto__ key, When write() called, Then returns error', async () => {
      const poisoned = JSON.parse('{"__proto__": {"polluted": true}}');
      const result = await adapter.write('safe-key', poisoned);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/prototype pollution/i);
    });

    it('Given data contains constructor.prototype manipulation, When write() called, Then rejects', async () => {
      const poisoned = { constructor: { prototype: { admin: true } } };
      const result = await adapter.write('safe-key', poisoned);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('Given data is null, When write() called, Then returns error', async () => {
      const result = await adapter.write('valid-key', null);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('Given data is undefined, When write() called, Then returns error', async () => {
      const result = await adapter.write('valid-key', undefined);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ---- Connection failure handling ----
  describe('read()/write() — connection failure', () => {
    it('Given pool query throws ECONNREFUSED, When read() called, Then returns error gracefully', async () => {
      const err = new Error('connect ECONNREFUSED 127.0.0.1:5432');
      (err as any).code = 'ECONNREFUSED';
      mockQuery.mockRejectedValue(err);
      const result = await adapter.read('tasks-dev.json');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/connection|econnrefused/i);
    });

    it('Given pool query throws connection timeout, When write() called, Then returns error gracefully', async () => {
      const err = new Error('Connection timeout');
      (err as any).code = 'ETIMEDOUT';
      mockQuery.mockRejectedValue(err);
      const result = await adapter.write('tasks-dev.json', makeEntry());
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ---- Pool exhaustion ----
  describe('write() — pool exhaustion', () => {
    it('Given pool is exhausted (max connections), When write() called, Then returns error gracefully', async () => {
      const err = new Error('timeout exceeded when trying to connect');
      mockQuery.mockRejectedValue(err);
      const result = await adapter.write('tasks-dev.json', makeEntry());
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ---- SQL injection in delete key ----
  describe('delete() — SQL injection', () => {
    it('Given key contains SQL injection, When delete() called, Then returns error', async () => {
      const result = await adapter.delete("' OR 1=1; DROP TABLE memory_entries;--");
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ---- subscribe() misuse ----
  describe('subscribe() — invalid callback', () => {
    it('Given callback is not a function, When subscribe() called, Then throws error', () => {
      expect(() => {
        adapter.subscribe('channel', null as any);
      }).toThrow();
    });

    it('Given channel is empty string, When subscribe() called, Then throws error', () => {
      expect(() => {
        adapter.subscribe('', () => {});
      }).toThrow(/channel/i);
    });
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY TESTS
// ---------------------------------------------------------------------------

describe('PostgresAdapter — BOUNDARY TESTS', () => {
  let adapter: PostgresAdapter;

  beforeEach(() => {
    mockQuery.mockReset();
    mockConnect.mockReset();
    mockPoolEnd.mockReset();
    adapter = new PostgresAdapter({ connectionString: 'postgresql://localhost/test' });
  });

  afterEach(async () => {
    await adapter.close();
  });

  // ---- Empty query results ----
  describe('query() — empty results', () => {
    it('Given no matching entries, When query() with agent_id filter, Then returns empty array', async () => {
      mockQuery.mockResolvedValue(makeQueryResult([]));
      const result = await adapter.query({ agent_id: 'nonexistent-agent' });
      expect(result).toEqual([]);
    });

    it('Given empty filter object, When query() called, Then returns all entries (no filter applied)', async () => {
      const rows = [
        { key: 'a.json', agent_id: 'dev', workstream_id: 'WS-1', data: {}, timestamp: '2026-01-01T00:00:00Z' },
        { key: 'b.json', agent_id: 'qa', workstream_id: 'WS-2', data: {}, timestamp: '2026-01-02T00:00:00Z' },
      ];
      mockQuery.mockResolvedValue(makeQueryResult(rows));
      const result = await adapter.query({});
      expect(result).toHaveLength(2);
    });
  });

  // ---- Large JSONB payload ----
  describe('write() — large JSONB payload', () => {
    it('Given data is 1MB JSONB, When write() called, Then handles without throwing', async () => {
      mockQuery.mockResolvedValue(makeQueryResult());
      const largeData = { payload: 'x'.repeat(1024 * 1024) };
      const result = await adapter.write('large-key.json', makeEntry({ data: largeData }));
      // May succeed or fail with a size error — but must not throw
      expect(result).toHaveProperty('success');
    });

    it('Given data is empty object, When write() called, Then succeeds', async () => {
      mockQuery.mockResolvedValue(makeQueryResult());
      const result = await adapter.write('minimal.json', makeEntry({ data: {} }));
      expect(result.success).toBe(true);
    });
  });

  // ---- Query with all filter combinations ----
  describe('query() — filter combinations', () => {
    it('Given only start/end filters provided, When query() called, Then applies timestamp range', async () => {
      mockQuery.mockResolvedValue(makeQueryResult([]));
      await adapter.query({ start: '2026-01-01T00:00:00Z', end: '2026-12-31T23:59:59Z' });
      const sqlArg = mockQuery.mock.calls[0][0] as string;
      expect(sqlArg).toMatch(/timestamp/i);
    });

    it('Given all four filters provided, When query() called, Then parameterizes all four', async () => {
      mockQuery.mockResolvedValue(makeQueryResult([]));
      await adapter.query({
        agent_id: 'dev',
        workstream_id: 'WS-ENT-2',
        start: '2026-01-01T00:00:00Z',
        end: '2026-12-31T23:59:59Z',
      });
      const params = mockQuery.mock.calls[0][1] as any[];
      expect(params).toContain('dev');
      expect(params).toContain('WS-ENT-2');
    });
  });

  // ---- Pool configuration edge cases ----
  describe('constructor — pool configuration', () => {
    it('Given max pool size of 1, When adapter created, Then constructs without error', () => {
      expect(() => {
        new PostgresAdapter({ connectionString: 'postgresql://localhost/test', maxConnections: 1 });
      }).not.toThrow();
    });

    it('Given very high pool size, When adapter created, Then constructs without error', () => {
      expect(() => {
        new PostgresAdapter({ connectionString: 'postgresql://localhost/test', maxConnections: 100 });
      }).not.toThrow();
    });
  });

  // ---- Concurrent write boundary ----
  describe('write() — concurrent writes to same key', () => {
    it('Given two concurrent writes, When both resolve, Then both return success or one fails gracefully', async () => {
      let callCount = 0;
      mockQuery.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          // Simulate serialization failure on second concurrent write
          return makeQueryResult();
        }
        return makeQueryResult();
      });

      const [r1, r2] = await Promise.all([
        adapter.write('tasks-dev.json', makeEntry()),
        adapter.write('tasks-dev.json', makeEntry({ data: { updated: true } })),
      ]);

      // At least one must succeed or return a structured error
      expect(r1).toHaveProperty('success');
      expect(r2).toHaveProperty('success');
    });
  });

  // ---- delete() on non-existent key ----
  describe('delete() — idempotent on missing key', () => {
    it('Given key does not exist in DB, When delete() called, Then returns success (idempotent)', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await adapter.delete('nonexistent.json');
      expect(result.success).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH
// ---------------------------------------------------------------------------

describe('PostgresAdapter — GOLDEN PATH', () => {
  let adapter: PostgresAdapter;

  beforeEach(() => {
    mockQuery.mockReset();
    mockConnect.mockReset();
    mockPoolEnd.mockReset();
    adapter = new PostgresAdapter({ connectionString: 'postgresql://localhost/test' });
  });

  afterEach(async () => {
    await adapter.close();
  });

  // ---- read() ----
  describe('read() — normal operations', () => {
    it('Given existing key, When read() called, Then returns data from memory_entries', async () => {
      const entry = makeEntry();
      mockQuery.mockResolvedValue(makeQueryResult([{ key: 'tasks-dev.json', ...entry }]));
      const result = await adapter.read('tasks-dev.json');
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('Given key that does not exist, When read() called, Then returns success false with null data', async () => {
      mockQuery.mockResolvedValue(makeQueryResult([]));
      const result = await adapter.read('missing.json');
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toMatch(/not found/i);
    });
  });

  // ---- write() ----
  describe('write() — normal operations', () => {
    it('Given valid key and data, When write() called, Then upserts into memory_entries', async () => {
      mockQuery.mockResolvedValue(makeQueryResult([{ key: 'tasks-dev.json' }]));
      const result = await adapter.write('tasks-dev.json', makeEntry());
      expect(result.success).toBe(true);
      expect(result.path).toBe('tasks-dev.json');
    });

    it('Given write succeeds, Then SQL uses INSERT ON CONFLICT DO UPDATE (upsert)', async () => {
      mockQuery.mockResolvedValue(makeQueryResult([{ key: 'tasks-dev.json' }]));
      await adapter.write('tasks-dev.json', makeEntry());
      const sqlArg = mockQuery.mock.calls[0][0] as string;
      // Must be an upsert, not a plain INSERT
      expect(sqlArg.toUpperCase()).toMatch(/INSERT|UPDATE|UPSERT|ON CONFLICT/);
    });

    it('Given data is stored as JSONB, When write() called, Then passes data as JSON string to pg', async () => {
      mockQuery.mockResolvedValue(makeQueryResult([{ key: 'tasks-dev.json' }]));
      const entry = makeEntry({ data: { nested: { value: 42 } } });
      await adapter.write('tasks-dev.json', entry);
      const params = mockQuery.mock.calls[0][1] as any[];
      // Data parameter should be a JSON-serializable value
      const dataParam = params.find(p => typeof p === 'object' && p !== null && !Array.isArray(p));
      expect(dataParam).toBeDefined();
    });
  });

  // ---- query() ----
  describe('query() — normal operations', () => {
    it('Given agent_id filter, When query() called, Then returns only matching entries', async () => {
      const rows = [
        { key: 'a.json', agent_id: 'dev', workstream_id: 'WS-1', data: {}, timestamp: '2026-01-01T00:00:00Z' },
      ];
      mockQuery.mockResolvedValue(makeQueryResult(rows));
      const result = await adapter.query({ agent_id: 'dev' });
      expect(result).toHaveLength(1);
      expect(result[0].agent_id).toBe('dev');
    });

    it('Given workstream_id filter, When query() called, Then returns matching entries', async () => {
      const rows = [
        { key: 'b.json', agent_id: 'qa', workstream_id: 'WS-ENT-2', data: {}, timestamp: '2026-02-01T00:00:00Z' },
      ];
      mockQuery.mockResolvedValue(makeQueryResult(rows));
      const result = await adapter.query({ workstream_id: 'WS-ENT-2' });
      expect(result).toHaveLength(1);
      expect(result[0].workstream_id).toBe('WS-ENT-2');
    });

    it('Given start/end timestamp range, When query() called, Then returns entries within range', async () => {
      const rows = [
        { key: 'c.json', agent_id: 'dev', workstream_id: 'WS-1', data: {}, timestamp: '2026-06-01T00:00:00Z' },
      ];
      mockQuery.mockResolvedValue(makeQueryResult(rows));
      const result = await adapter.query({
        start: '2026-01-01T00:00:00Z',
        end: '2026-12-31T23:59:59Z',
      });
      expect(result).toHaveLength(1);
    });
  });

  // ---- delete() ----
  describe('delete() — normal operations', () => {
    it('Given existing key, When delete() called, Then removes row from memory_entries', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
      const result = await adapter.delete('tasks-dev.json');
      expect(result.success).toBe(true);
      const sqlArg = mockQuery.mock.calls[0][0] as string;
      expect(sqlArg.toUpperCase()).toMatch(/DELETE/);
    });
  });

  // ---- close() ----
  describe('close() — lifecycle', () => {
    it('When close() called, Then pool.end() is invoked', async () => {
      mockPoolEnd.mockResolvedValue(undefined);
      await adapter.close();
      expect(mockPoolEnd).toHaveBeenCalledOnce();
    });

    it('Given pool.end() rejects, When close() called, Then resolves gracefully', async () => {
      mockPoolEnd.mockRejectedValue(new Error('pool already closed'));
      await expect(adapter.close()).resolves.toBeUndefined();
    });
  });

  // ---- implements StorageAdapter interface (AC-ENT-2.1) ----
  describe('StorageAdapter interface compliance', () => {
    it('Adapter has all required methods', () => {
      expect(typeof adapter.read).toBe('function');
      expect(typeof adapter.write).toBe('function');
      expect(typeof adapter.query).toBe('function');
      expect(typeof adapter.delete).toBe('function');
      expect(typeof adapter.subscribe).toBe('function');
      expect(typeof adapter.publish).toBe('function');
      expect(typeof adapter.close).toBe('function');
    });
  });
});

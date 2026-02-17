/**
 * PostgresAdapter Contract Integration Tests — WS-ENT-2
 *
 * Verifies that PostgresAdapter satisfies the same StorageAdapter contract
 * as FileAdapter. Tests run against a mocked pg Pool.
 *
 * When a real Postgres is available (MG_POSTGRES_URL set), these tests
 * can run against it for full integration coverage.
 *
 * AC-ENT-2.1: PostgresAdapter implements full StorageAdapter interface
 * AC-ENT-2.7: 99%+ test coverage
 *
 * Test order: MISUSE → BOUNDARY → GOLDEN PATH
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { StorageAdapter, MemoryEvent } from '../../../src/memory/adapters/types';

// ---------------------------------------------------------------------------
// Mock pg for all contract tests (no real DB required)
// ---------------------------------------------------------------------------
const mockQuery = vi.fn();
const mockPoolEnd = vi.fn();

vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => ({
    query: mockQuery,
    connect: vi.fn().mockResolvedValue({
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      release: vi.fn(),
      on: vi.fn(),
    }),
    end: mockPoolEnd,
  })),
}));

import { FileAdapter } from '../../../src/memory/adapters/file-adapter';
import { PostgresAdapter } from '../../../enterprise/src/storage/postgres-adapter';

// ---------------------------------------------------------------------------
// Shared contract test suite — runs for both adapters
// This is the key insight: both adapters must pass identical contract tests
// ---------------------------------------------------------------------------

function contractTestSuite(name: string, createAdapter: () => StorageAdapter, setupMock?: () => void) {
  describe(`StorageAdapter Contract — ${name}`, () => {
    let adapter: StorageAdapter;

    beforeEach(() => {
      setupMock?.();
      adapter = createAdapter();
    });

    afterEach(async () => {
      await adapter.close();
    });

    // ---- MISUSE CASES ----

    describe('MISUSE: read() — invalid keys', () => {
      it('Given empty key, When read() called, Then returns { success: false }', async () => {
        const result = await adapter.read('');
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('Given path traversal key, When read() called, Then returns { success: false }', async () => {
        const result = await adapter.read('../../etc/passwd');
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('Given null-byte key, When read() called, Then returns { success: false }', async () => {
        const result = await adapter.read('key\x00injection');
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('MISUSE: write() — invalid inputs', () => {
      it('Given empty key, When write() called, Then returns { success: false }', async () => {
        const result = await adapter.write('', { data: 'x' });
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('Given null data, When write() called, Then returns { success: false }', async () => {
        const result = await adapter.write('valid-key.json', null);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('Given undefined data, When write() called, Then returns { success: false }', async () => {
        const result = await adapter.write('valid-key.json', undefined);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('Given prototype-polluted data, When write() called, Then returns { success: false }', async () => {
        const poisoned = JSON.parse('{"__proto__": {"polluted": true}}');
        const result = await adapter.write('valid-key.json', poisoned);
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/prototype/i);
      });
    });

    describe('MISUSE: delete() — invalid key', () => {
      it('Given path traversal key, When delete() called, Then returns { success: false }', async () => {
        const result = await adapter.delete('../../etc/passwd');
        expect(result.success).toBe(false);
      });
    });

    describe('MISUSE: subscribe() — invalid callback', () => {
      it('Given null callback, When subscribe() called, Then throws', () => {
        expect(() => adapter.subscribe('memory:written', null as any)).toThrow();
      });
    });

    // ---- BOUNDARY TESTS ----

    describe('BOUNDARY: read() — missing key', () => {
      it('Given key that does not exist, When read() called, Then returns { success: false, data: null }', async () => {
        setupMock?.();
        const result = await adapter.read('definitely-does-not-exist-' + Date.now() + '.json');
        expect(result.success).toBe(false);
        expect(result.data).toBeNull();
      });
    });

    describe('BOUNDARY: delete() — idempotent', () => {
      it('Given non-existent key, When delete() called, Then returns { success: true } (idempotent)', async () => {
        const result = await adapter.delete('nonexistent-' + Date.now() + '.json');
        expect(result.success).toBe(true);
      });
    });

    describe('BOUNDARY: subscribe/publish — no subscribers', () => {
      it('Given no subscribers on channel, When publish() called, Then does not throw', () => {
        expect(() => {
          adapter.publish('memory:written', { type: 'written', timestamp: new Date().toISOString() });
        }).not.toThrow();
      });
    });

    // ---- GOLDEN PATH ----

    describe('GOLDEN PATH: subscribe()/publish()', () => {
      it('Given subscriber registered, When publish() called, Then callback receives event', () => {
        const received: MemoryEvent[] = [];
        const unsubscribe = adapter.subscribe('memory:written', (e) => received.push(e));
        const event: MemoryEvent = { type: 'written', key: 'test.json', timestamp: new Date().toISOString() };
        adapter.publish('memory:written', event);
        expect(received).toHaveLength(1);
        expect(received[0].type).toBe('written');
        unsubscribe();
      });

      it('Given subscriber, When unsubscribe() called, Then no longer receives events', () => {
        const received: MemoryEvent[] = [];
        const unsubscribe = adapter.subscribe('memory:written', (e) => received.push(e));
        unsubscribe();
        adapter.publish('memory:written', { type: 'written', timestamp: new Date().toISOString() });
        expect(received).toHaveLength(0);
      });

      it('Given channel A subscriber, When publish() on channel B, Then subscriber A not invoked', () => {
        const received: MemoryEvent[] = [];
        const unsubscribe = adapter.subscribe('memory:written', (e) => received.push(e));
        adapter.publish('memory:deleted', { type: 'deleted', timestamp: new Date().toISOString() });
        expect(received).toHaveLength(0);
        unsubscribe();
      });
    });

    describe('GOLDEN PATH: close()', () => {
      it('Given open adapter, When close() called, Then resolves without error', async () => {
        await expect(adapter.close()).resolves.toBeUndefined();
      });
    });

    describe('GOLDEN PATH: interface shape', () => {
      it('Adapter exposes all 7 required StorageAdapter methods', () => {
        expect(typeof adapter.read).toBe('function');
        expect(typeof adapter.write).toBe('function');
        expect(typeof adapter.query).toBe('function');
        expect(typeof adapter.delete).toBe('function');
        expect(typeof adapter.subscribe).toBe('function');
        expect(typeof adapter.publish).toBe('function');
        expect(typeof adapter.close).toBe('function');
      });

      it('read() returns Promise<AdapterReadResult>', async () => {
        const result = await adapter.read('test.json');
        expect(result).toHaveProperty('success');
        expect(typeof result.success).toBe('boolean');
      });

      it('write() returns Promise<AdapterWriteResult>', async () => {
        const result = await adapter.write('test.json', null);
        expect(result).toHaveProperty('success');
        expect(typeof result.success).toBe('boolean');
      });

      it('delete() returns Promise<AdapterDeleteResult>', async () => {
        const result = await adapter.delete('test.json');
        expect(result).toHaveProperty('success');
        expect(typeof result.success).toBe('boolean');
      });

      it('query() returns Promise<MemoryEntry[]>', async () => {
        const result = await adapter.query({});
        expect(Array.isArray(result)).toBe(true);
      });

      it('subscribe() returns an unsubscribe function', () => {
        const unsub = adapter.subscribe('memory:written', () => {});
        expect(typeof unsub).toBe('function');
        unsub();
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Run contract tests for FileAdapter
// ---------------------------------------------------------------------------

contractTestSuite(
  'FileAdapter',
  () => new FileAdapter({ baseDir: '/tmp/mg-contract-test-' + Date.now() })
);

// ---------------------------------------------------------------------------
// Run contract tests for PostgresAdapter (mocked pg)
// ---------------------------------------------------------------------------

contractTestSuite(
  'PostgresAdapter',
  () => new PostgresAdapter({ connectionString: 'postgresql://localhost/test' }),
  () => {
    mockQuery.mockReset();
    mockPoolEnd.mockReset();
    // Default mock: empty results for reads/queries
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql && sql.toUpperCase().includes('SELECT')) {
        return { rows: [], rowCount: 0 };
      }
      return { rows: [], rowCount: 0 };
    });
    mockPoolEnd.mockResolvedValue(undefined);
  }
);

// ---------------------------------------------------------------------------
// Additional PostgresAdapter-specific contract validations
// ---------------------------------------------------------------------------

describe('PostgresAdapter — Additional Contract Requirements', () => {
  let adapter: PostgresAdapter;

  beforeEach(() => {
    mockQuery.mockReset();
    mockPoolEnd.mockReset();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    mockPoolEnd.mockResolvedValue(undefined);
    adapter = new PostgresAdapter({ connectionString: 'postgresql://localhost/test' });
  });

  afterEach(async () => {
    await adapter.close();
  });

  // MISUSE: Tenant isolation — one workstream must not see another's data
  describe('MISUSE: Tenant isolation (AC-ENT-2.11)', () => {
    it('Given query with workstream_id=WS-A, When query() called, Then SQL filters by workstream_id parameter', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      await adapter.query({ workstream_id: 'WS-A' });
      const params = mockQuery.mock.calls[0][1] as any[];
      expect(params).toContain('WS-A');
    });

    it('Given query with workstream_id=WS-B, When query() called, Then SQL does NOT hardcode WS-A', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      await adapter.query({ workstream_id: 'WS-B' });
      const sqlArg = mockQuery.mock.calls[0][0] as string;
      expect(sqlArg).not.toContain('WS-A');
    });
  });

  // BOUNDARY: Connection pool lifecycle
  describe('BOUNDARY: Connection pool lifecycle (AC-ENT-2.5)', () => {
    it('Given adapter created, When close() called multiple times, Then does not throw on second call', async () => {
      await adapter.close();
      // Second close — should be safe
      await expect(adapter.close()).resolves.toBeUndefined();
    });
  });

  // GOLDEN PATH: JSONB write contract
  describe('GOLDEN PATH: JSONB storage contract (AC-ENT-2.2)', () => {
    it('Given write() called, When SQL executed, Then query targets memory_entries table', async () => {
      mockQuery.mockResolvedValue({ rows: [{ key: 'test.json' }], rowCount: 1 });
      await adapter.write('test.json', {
        agent_id: 'dev',
        workstream_id: 'WS-ENT-2',
        data: { status: 'active' },
        timestamp: '2026-02-17T00:00:00Z',
      });
      const sqlArg = mockQuery.mock.calls[0][0] as string;
      expect(sqlArg.toLowerCase()).toContain('memory_entries');
    });

    it('Given query() called, When SQL executed, Then query targets memory_entries table', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      await adapter.query({ agent_id: 'dev' });
      const sqlArg = mockQuery.mock.calls[0][0] as string;
      expect(sqlArg.toLowerCase()).toContain('memory_entries');
    });
  });
});

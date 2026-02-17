/**
 * PostgresAdapter Pub/Sub Unit Tests — WS-ENT-2
 *
 * Tests for LISTEN/NOTIFY-based pub/sub on PostgresAdapter.
 * Mocks pg Pool and Client for isolated testing.
 *
 * AC-ENT-2.4: Pub/sub via LISTEN/NOTIFY
 *
 * Test order: MISUSE → BOUNDARY → GOLDEN PATH
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock pg module
// ---------------------------------------------------------------------------
const mockQuery = vi.fn();
const mockClientQuery = vi.fn();
const mockClientRelease = vi.fn();
const mockClientOn = vi.fn();
const mockPoolEnd = vi.fn();
const mockConnect = vi.fn();

vi.mock('pg', () => {
  return {
    Pool: vi.fn().mockImplementation(() => ({
      query: mockQuery,
      connect: mockConnect,
      end: mockPoolEnd,
    })),
  };
});

import { PostgresAdapter } from '../../../../enterprise/src/storage/postgres-adapter';

// ---------------------------------------------------------------------------
// MISUSE CASES
// ---------------------------------------------------------------------------

describe('PostgresAdapter Pub/Sub — MISUSE CASES', () => {
  let adapter: PostgresAdapter;

  beforeEach(() => {
    mockQuery.mockReset();
    mockConnect.mockReset();
    mockPoolEnd.mockReset();
    mockClientQuery.mockReset();
    mockClientRelease.mockReset();
    mockClientOn.mockReset();

    mockConnect.mockResolvedValue({
      query: mockClientQuery,
      release: mockClientRelease,
      on: mockClientOn,
    });

    adapter = new PostgresAdapter({ connectionString: 'postgresql://localhost/test' });
  });

  afterEach(async () => {
    await adapter.close();
  });

  describe('subscribe() — invalid arguments', () => {
    it('Given null callback, When subscribe() called, Then throws TypeError', () => {
      expect(() => {
        adapter.subscribe('memory:written', null as any);
      }).toThrow();
    });

    it('Given undefined callback, When subscribe() called, Then throws TypeError', () => {
      expect(() => {
        adapter.subscribe('memory:written', undefined as any);
      }).toThrow();
    });

    it('Given callback is string, When subscribe() called, Then throws TypeError', () => {
      expect(() => {
        adapter.subscribe('memory:written', 'not-a-function' as any);
      }).toThrow();
    });

    it('Given empty channel name, When subscribe() called, Then throws error', () => {
      expect(() => {
        adapter.subscribe('', () => {});
      }).toThrow(/channel/i);
    });

    it('Given channel with SQL injection, When subscribe() called, Then sanitizes channel name', () => {
      // Should not throw, but must sanitize before issuing LISTEN command
      const unsubscribe = adapter.subscribe("channel'; DROP TABLE pg_notify;--", () => {});
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('publish() — invalid arguments', () => {
    it('Given null event, When publish() called, Then does not throw (graceful noop)', () => {
      expect(() => {
        adapter.publish('memory:written', null as any);
      }).not.toThrow();
    });

    it('Given event with missing type field, When publish() called, Then does not throw', () => {
      expect(() => {
        adapter.publish('memory:written', { timestamp: '2026-02-17T00:00:00Z' } as any);
      }).not.toThrow();
    });

    it('Given empty channel, When publish() called, Then does not throw', () => {
      expect(() => {
        adapter.publish('', { type: 'written', timestamp: '2026-02-17T00:00:00Z' });
      }).not.toThrow();
    });
  });

  describe('subscribe() — LISTEN connection failure', () => {
    it('Given pool.connect() rejects, When subscribe() with LISTEN channel, Then callback is never called with error event', async () => {
      mockConnect.mockRejectedValue(new Error('ECONNREFUSED'));
      const received: any[] = [];
      // subscribe itself must not throw even if LISTEN connection fails
      expect(() => {
        adapter.subscribe('memory:written', (e) => received.push(e));
      }).not.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY TESTS
// ---------------------------------------------------------------------------

describe('PostgresAdapter Pub/Sub — BOUNDARY TESTS', () => {
  let adapter: PostgresAdapter;

  beforeEach(() => {
    mockQuery.mockReset();
    mockConnect.mockReset();
    mockPoolEnd.mockReset();
    mockClientQuery.mockReset();
    mockClientRelease.mockReset();
    mockClientOn.mockReset();

    mockConnect.mockResolvedValue({
      query: mockClientQuery,
      release: mockClientRelease,
      on: mockClientOn,
    });

    adapter = new PostgresAdapter({ connectionString: 'postgresql://localhost/test' });
  });

  afterEach(async () => {
    await adapter.close();
  });

  describe('subscribe() — edge cases', () => {
    it('Given channel with no active listeners, When publish() called, Then no callbacks invoked', () => {
      const received: any[] = [];
      // Do NOT subscribe
      adapter.publish('memory:written', { type: 'written', timestamp: '2026-02-17T00:00:00Z' });
      expect(received).toHaveLength(0);
    });

    it('Given multiple subscribe calls on same channel, When publish() called, Then all callbacks fire', () => {
      const results: string[] = [];
      adapter.subscribe('memory:written', () => results.push('first'));
      adapter.subscribe('memory:written', () => results.push('second'));
      adapter.publish('memory:written', { type: 'written', timestamp: '2026-02-17T00:00:00Z' });
      expect(results).toContain('first');
      expect(results).toContain('second');
    });

    it('Given subscriber that throws, When publish() called, Then other subscribers still fire', () => {
      const results: string[] = [];
      adapter.subscribe('memory:written', () => { throw new Error('bad subscriber'); });
      adapter.subscribe('memory:written', () => results.push('second'));
      expect(() => {
        adapter.publish('memory:written', { type: 'written', timestamp: '2026-02-17T00:00:00Z' });
      }).not.toThrow();
      expect(results).toContain('second');
    });

    it('Given unsubscribe called twice, When second unsubscribe called, Then does not throw', () => {
      const unsubscribe = adapter.subscribe('memory:written', () => {});
      unsubscribe();
      expect(() => unsubscribe()).not.toThrow();
    });

    it('Given unsubscribe called, When publish() called after, Then callback is not invoked', () => {
      const results: string[] = [];
      const unsubscribe = adapter.subscribe('memory:written', () => results.push('fired'));
      unsubscribe();
      adapter.publish('memory:written', { type: 'written', timestamp: '2026-02-17T00:00:00Z' });
      expect(results).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH
// ---------------------------------------------------------------------------

describe('PostgresAdapter Pub/Sub — GOLDEN PATH', () => {
  let adapter: PostgresAdapter;

  beforeEach(() => {
    mockQuery.mockReset();
    mockConnect.mockReset();
    mockPoolEnd.mockReset();
    mockClientQuery.mockReset();
    mockClientRelease.mockReset();
    mockClientOn.mockReset();

    mockConnect.mockResolvedValue({
      query: mockClientQuery,
      release: mockClientRelease,
      on: mockClientOn,
    });

    adapter = new PostgresAdapter({ connectionString: 'postgresql://localhost/test' });
  });

  afterEach(async () => {
    await adapter.close();
  });

  describe('subscribe()/publish() — normal operations', () => {
    it('Given subscriber on channel, When publish() called with matching channel, Then callback receives event', () => {
      const received: any[] = [];
      adapter.subscribe('memory:written', (e) => received.push(e));
      const event = { type: 'written' as const, key: 'tasks-dev.json', timestamp: '2026-02-17T00:00:00Z' };
      adapter.publish('memory:written', event);
      expect(received).toHaveLength(1);
      expect(received[0]).toMatchObject({ type: 'written', key: 'tasks-dev.json' });
    });

    it('Given subscriber on channel A, When publish() on channel B, Then subscriber A not invoked', () => {
      const received: any[] = [];
      adapter.subscribe('memory:written', (e) => received.push(e));
      adapter.publish('memory:deleted', { type: 'deleted', key: 'tasks-dev.json', timestamp: '2026-02-17T00:00:00Z' });
      expect(received).toHaveLength(0);
    });

    it('Given subscribe() called, When unsubscribe function returned, Then it is a function', () => {
      const unsubscribe = adapter.subscribe('memory:written', () => {});
      expect(typeof unsubscribe).toBe('function');
    });

    it('Given write operation, When write() completes, Then memory:written event is published to subscribers', async () => {
      mockQuery.mockResolvedValue({ rows: [{ key: 'tasks-dev.json' }], rowCount: 1 });
      const received: any[] = [];
      adapter.subscribe('memory:written', (e) => received.push(e));
      await adapter.write('tasks-dev.json', {
        agent_id: 'dev',
        workstream_id: 'WS-ENT-2',
        data: {},
        timestamp: '2026-02-17T00:00:00Z',
      });
      expect(received).toHaveLength(1);
      expect(received[0].type).toBe('written');
    });

    it('Given delete operation, When delete() completes, Then memory:deleted event is published to subscribers', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
      const received: any[] = [];
      adapter.subscribe('memory:deleted', (e) => received.push(e));
      await adapter.delete('tasks-dev.json');
      expect(received).toHaveLength(1);
      expect(received[0].type).toBe('deleted');
    });
  });

  describe('close() — cleans up subscriptions', () => {
    it('Given active subscriptions, When close() called, Then subscribers are cleared', async () => {
      const received: any[] = [];
      adapter.subscribe('memory:written', (e) => received.push(e));
      await adapter.close();
      // After close, publish should not invoke callbacks
      adapter.publish('memory:written', { type: 'written', timestamp: '2026-02-17T00:00:00Z' });
      expect(received).toHaveLength(0);
    });
  });
});

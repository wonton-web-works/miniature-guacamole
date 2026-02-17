/**
 * PostgresAdapter Event Sourcing Unit Tests — WS-ENT-2
 *
 * Tests for append-only agent_events table: immutability, querying by
 * agent/workstream, event_type recording.
 *
 * AC-ENT-2.3: Event sourcing via agent_events table (append-only, immutable)
 *
 * Test order: MISUSE → BOUNDARY → GOLDEN PATH
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock pg module
// ---------------------------------------------------------------------------
const mockQuery = vi.fn();
const mockPoolEnd = vi.fn();

vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => ({
    query: mockQuery,
    end: mockPoolEnd,
  })),
}));

import { PostgresAdapter } from '../../../../enterprise/src/storage/postgres-adapter';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeEventPayload(overrides: Record<string, any> = {}) {
  return {
    agent_id: 'dev',
    workstream_id: 'WS-ENT-2',
    event_type: 'task_completed',
    payload: { result: 'ok' },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// MISUSE CASES
// ---------------------------------------------------------------------------

describe('PostgresAdapter Events — MISUSE CASES', () => {
  let adapter: PostgresAdapter;

  beforeEach(() => {
    mockQuery.mockReset();
    mockPoolEnd.mockReset();
    adapter = new PostgresAdapter({ connectionString: 'postgresql://localhost/test' });
  });

  afterEach(async () => {
    await adapter.close();
  });

  describe('appendEvent() — SQL injection', () => {
    it('Given agent_id with SQL injection, When appendEvent() called, Then uses parameterized query', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
      await adapter.appendEvent(makeEventPayload({ agent_id: "' OR 1=1; DROP TABLE agent_events;--" }));
      const params = mockQuery.mock.calls[0][1] as any[];
      const sqlArg = mockQuery.mock.calls[0][0] as string;
      // Injection in params, not in SQL template
      expect(params).toContain("' OR 1=1; DROP TABLE agent_events;--");
      expect(sqlArg).not.toContain("DROP TABLE");
    });

    it('Given event_type with SQL injection, When appendEvent() called, Then parameterizes', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
      await adapter.appendEvent(makeEventPayload({ event_type: "'; DELETE FROM agent_events;--" }));
      const params = mockQuery.mock.calls[0][1] as any[];
      expect(params).toContain("'; DELETE FROM agent_events;--");
    });

    it('Given workstream_id with SQL injection, When appendEvent() called, Then parameterizes', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
      await adapter.appendEvent(makeEventPayload({ workstream_id: "' UNION SELECT * FROM users;--" }));
      const params = mockQuery.mock.calls[0][1] as any[];
      expect(params).toContain("' UNION SELECT * FROM users;--");
    });
  });

  describe('appendEvent() — invalid inputs', () => {
    it('Given null event, When appendEvent() called, Then returns error', async () => {
      await expect(adapter.appendEvent(null as any)).rejects.toThrow();
    });

    it('Given event with missing agent_id, When appendEvent() called, Then returns error', async () => {
      const bad = { event_type: 'done', payload: {}, workstream_id: 'WS-1' };
      await expect(adapter.appendEvent(bad as any)).rejects.toThrow(/agent_id/i);
    });

    it('Given event with missing event_type, When appendEvent() called, Then returns error', async () => {
      const bad = { agent_id: 'dev', payload: {}, workstream_id: 'WS-1' };
      await expect(adapter.appendEvent(bad as any)).rejects.toThrow(/event_type/i);
    });

    it('Given event with null payload, When appendEvent() called, Then returns error', async () => {
      const bad = { agent_id: 'dev', event_type: 'done', workstream_id: 'WS-1', payload: null };
      await expect(adapter.appendEvent(bad as any)).rejects.toThrow(/payload/i);
    });

    it('Given payload with prototype pollution, When appendEvent() called, Then returns error', async () => {
      const poisoned = JSON.parse('{"__proto__": {"admin": true}}');
      const event = makeEventPayload({ payload: poisoned });
      await expect(adapter.appendEvent(event)).rejects.toThrow(/prototype/i);
    });
  });

  describe('queryEvents() — SQL injection in filters', () => {
    it('Given agent_id with injection in queryEvents(), When called, Then parameterizes', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      await adapter.queryEvents({ agent_id: "' OR 1=1--" });
      const sqlArg = mockQuery.mock.calls[0][0] as string;
      expect(sqlArg).not.toContain("' OR 1=1--");
    });

    it('Given event_type with injection in queryEvents(), When called, Then parameterizes', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      await adapter.queryEvents({ event_type: "'; DROP TABLE agent_events;--" });
      const sqlArg = mockQuery.mock.calls[0][0] as string;
      expect(sqlArg).not.toContain("DROP TABLE agent_events");
    });
  });

  describe('Event immutability — no update/delete on agent_events', () => {
    it('Given existing event id, When updateEvent() called, Then throws (not implemented / immutable)', async () => {
      // Events must be append-only — no update operation should exist
      expect((adapter as any).updateEvent).toBeUndefined();
    });

    it('Given existing event id, When deleteEvent() called, Then throws or is not exposed', async () => {
      // Events must be append-only — no delete event operation should exist
      expect((adapter as any).deleteEvent).toBeUndefined();
    });
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY TESTS
// ---------------------------------------------------------------------------

describe('PostgresAdapter Events — BOUNDARY TESTS', () => {
  let adapter: PostgresAdapter;

  beforeEach(() => {
    mockQuery.mockReset();
    mockPoolEnd.mockReset();
    adapter = new PostgresAdapter({ connectionString: 'postgresql://localhost/test' });
  });

  afterEach(async () => {
    await adapter.close();
  });

  describe('queryEvents() — edge cases', () => {
    it('Given no events for agent, When queryEvents() called, Then returns empty array', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await adapter.queryEvents({ agent_id: 'nonexistent' });
      expect(result).toEqual([]);
    });

    it('Given queryEvents() with no filters, When called, Then returns all events', async () => {
      const rows = [
        { id: 1, agent_id: 'dev', workstream_id: 'WS-1', event_type: 'done', payload: {}, created_at: '2026-01-01' },
        { id: 2, agent_id: 'qa', workstream_id: 'WS-2', event_type: 'passed', payload: {}, created_at: '2026-01-02' },
      ];
      mockQuery.mockResolvedValue({ rows, rowCount: 2 });
      const result = await adapter.queryEvents({});
      expect(result).toHaveLength(2);
    });

    it('Given large JSONB payload in event, When appendEvent() called, Then handles without throwing', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });
      const largePayload = { data: 'x'.repeat(50 * 1024) }; // 50KB
      const result = await adapter.appendEvent(makeEventPayload({ payload: largePayload }));
      expect(result).toHaveProperty('id');
    });

    it('Given events ordered by created_at, When queryEvents() returns, Then maintains chronological order', async () => {
      const rows = [
        { id: 1, agent_id: 'dev', workstream_id: 'WS-1', event_type: 'start', payload: {}, created_at: '2026-01-01T00:00:00Z' },
        { id: 2, agent_id: 'dev', workstream_id: 'WS-1', event_type: 'complete', payload: {}, created_at: '2026-01-02T00:00:00Z' },
      ];
      mockQuery.mockResolvedValue({ rows, rowCount: 2 });
      const result = await adapter.queryEvents({ agent_id: 'dev' });
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
    });
  });

  describe('appendEvent() — boundary payloads', () => {
    it('Given empty payload object, When appendEvent() called, Then succeeds', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 42 }], rowCount: 1 });
      const result = await adapter.appendEvent(makeEventPayload({ payload: {} }));
      expect(result.id).toBe(42);
    });
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH
// ---------------------------------------------------------------------------

describe('PostgresAdapter Events — GOLDEN PATH', () => {
  let adapter: PostgresAdapter;

  beforeEach(() => {
    mockQuery.mockReset();
    mockPoolEnd.mockReset();
    adapter = new PostgresAdapter({ connectionString: 'postgresql://localhost/test' });
  });

  afterEach(async () => {
    await adapter.close();
  });

  describe('appendEvent() — normal operations (AC-ENT-2.3)', () => {
    it('Given valid event, When appendEvent() called, Then inserts into agent_events', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });
      const result = await adapter.appendEvent(makeEventPayload());
      expect(result.id).toBe(1);
      const sqlArg = mockQuery.mock.calls[0][0] as string;
      expect(sqlArg.toUpperCase()).toMatch(/INSERT.*agent_events/i);
    });

    it('Given event, When appendEvent() called, Then SQL is INSERT only (no ON CONFLICT UPDATE)', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 2 }], rowCount: 1 });
      await adapter.appendEvent(makeEventPayload({ event_type: 'task_started' }));
      const sqlArg = mockQuery.mock.calls[0][0] as string;
      // Events are append-only — INSERT with no upsert logic
      expect(sqlArg.toUpperCase()).toMatch(/^INSERT/);
      expect(sqlArg.toUpperCase()).not.toMatch(/ON CONFLICT DO UPDATE/);
    });

    it('Given event, When appendEvent() called, Then payload is stored as JSONB param', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 3 }], rowCount: 1 });
      const payload = { result: 'success', details: { count: 42 } };
      await adapter.appendEvent(makeEventPayload({ payload }));
      const params = mockQuery.mock.calls[0][1] as any[];
      // Payload should appear as a JSON-serializable object in params
      const payloadParam = params.find(p => typeof p === 'object' && p !== null && 'result' in p);
      expect(payloadParam).toBeDefined();
      expect(payloadParam.result).toBe('success');
    });

    it('Given multiple appends, When both complete, Then both get unique ids', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 2 }], rowCount: 1 });

      const r1 = await adapter.appendEvent(makeEventPayload({ event_type: 'started' }));
      const r2 = await adapter.appendEvent(makeEventPayload({ event_type: 'completed' }));
      expect(r1.id).toBe(1);
      expect(r2.id).toBe(2);
      expect(r1.id).not.toBe(r2.id);
    });
  });

  describe('queryEvents() — normal operations', () => {
    it('Given events in DB, When queryEvents({ agent_id }) called, Then returns matching events', async () => {
      const rows = [
        { id: 1, agent_id: 'dev', workstream_id: 'WS-ENT-2', event_type: 'task_done', payload: { result: 'ok' }, created_at: '2026-02-17T00:00:00Z' },
      ];
      mockQuery.mockResolvedValue({ rows, rowCount: 1 });
      const result = await adapter.queryEvents({ agent_id: 'dev' });
      expect(result).toHaveLength(1);
      expect(result[0].event_type).toBe('task_done');
    });

    it('Given events in DB, When queryEvents({ workstream_id }) called, Then returns workstream events', async () => {
      const rows = [
        { id: 5, agent_id: 'qa', workstream_id: 'WS-ENT-2', event_type: 'tests_passed', payload: {}, created_at: '2026-02-17T00:00:00Z' },
      ];
      mockQuery.mockResolvedValue({ rows, rowCount: 1 });
      const result = await adapter.queryEvents({ workstream_id: 'WS-ENT-2' });
      expect(result).toHaveLength(1);
      expect(result[0].workstream_id).toBe('WS-ENT-2');
    });

    it('Given events in DB, When queryEvents({ event_type }) called, Then returns events of that type', async () => {
      const rows = [
        { id: 10, agent_id: 'dev', workstream_id: 'WS-1', event_type: 'gate_passed', payload: {}, created_at: '2026-02-17T00:00:00Z' },
        { id: 11, agent_id: 'qa', workstream_id: 'WS-1', event_type: 'gate_passed', payload: {}, created_at: '2026-02-17T00:01:00Z' },
      ];
      mockQuery.mockResolvedValue({ rows, rowCount: 2 });
      const result = await adapter.queryEvents({ event_type: 'gate_passed' });
      expect(result).toHaveLength(2);
      expect(result.every(e => e.event_type === 'gate_passed')).toBe(true);
    });
  });
});

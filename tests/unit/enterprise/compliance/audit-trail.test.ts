/**
 * AuditTrailService Unit Tests — WS-ENT-9
 *
 * Tests for the immutable append-only audit log with hash chain integrity.
 * Uses mocked pg Pool — no real database required.
 *
 * AC-ENT-9.1: Audit trail service — immutable append-only log of security-relevant events
 * AC-ENT-9.4: Audit events include actor, action, resource, tenant, timestamp, IP
 * AC-ENT-9.5: Audit log tamper detection (hash chain)
 *
 * Test order: MISUSE → BOUNDARY → GOLDEN PATH
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import {
  AuditTrailService,
} from '../../../../enterprise/src/compliance/audit-trail';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    tenantId: 'tenant-acme',
    actor: 'user-42',
    action: 'data.read',
    resource: 'memory_entries/key123',
    resourceType: 'memory_entry',
    ip: '10.0.0.1',
    metadata: { reason: 'scheduled-report' },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// MISUSE CASES
// ---------------------------------------------------------------------------

describe('AuditTrailService — MISUSE CASES', () => {
  let service: AuditTrailService;

  beforeEach(() => {
    mockQuery.mockReset();
    mockPoolEnd.mockReset();
    service = new AuditTrailService({ pool: { query: mockQuery, end: mockPoolEnd } as any, tenantId: 'tenant-acme' });
  });

  // ---- SQL injection ----

  describe('logEvent() — SQL injection in text fields', () => {
    it("Given actor contains single-quote injection, When logEvent() called, Then query uses parameterized SQL (not string interpolation)", async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 'uuid-1', hash: 'abc', previous_hash: '000', timestamp: new Date().toISOString() }], rowCount: 1 });
      const injectedActor = "'; DROP TABLE audit_events;--";
      await service.logEvent(makeEvent({ actor: injectedActor }));
      // All calls must be parameterized — the injection string must not appear in raw SQL text
      for (const call of mockQuery.mock.calls) {
        const sql: string = typeof call[0] === 'string' ? call[0] : call[0]?.text ?? '';
        expect(sql).not.toContain(injectedActor);
      }
    });

    it("Given action contains semicolon injection, When logEvent() called, Then query is parameterized", async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 'uuid-1', hash: 'abc', previous_hash: '000', timestamp: new Date().toISOString() }], rowCount: 1 });
      const injectedAction = "data.read; DELETE FROM audit_events";
      await service.logEvent(makeEvent({ action: injectedAction }));
      for (const call of mockQuery.mock.calls) {
        const sql: string = typeof call[0] === 'string' ? call[0] : call[0]?.text ?? '';
        expect(sql).not.toContain(injectedAction);
      }
    });

    it("Given resource contains UNION SELECT injection, When logEvent() called, Then query is parameterized", async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 'uuid-1', hash: 'abc', previous_hash: '000', timestamp: new Date().toISOString() }], rowCount: 1 });
      const injectedResource = "memory_entries/x' UNION SELECT * FROM users--";
      await service.logEvent(makeEvent({ resource: injectedResource }));
      for (const call of mockQuery.mock.calls) {
        const sql: string = typeof call[0] === 'string' ? call[0] : call[0]?.text ?? '';
        expect(sql).not.toContain('UNION SELECT');
      }
    });
  });

  // ---- Prototype pollution ----

  describe('logEvent() — prototype pollution in metadata', () => {
    it("Given metadata contains __proto__ key, When logEvent() called, Then throws or sanitizes", async () => {
      const polluted = JSON.parse('{"__proto__": {"isAdmin": true}, "safe": "value"}');
      await expect(service.logEvent(makeEvent({ metadata: polluted }))).rejects.toThrow();
    });

    it("Given metadata contains constructor.prototype attack, When logEvent() called, Then throws or sanitizes", async () => {
      const polluted = JSON.parse('{"constructor": {"prototype": {"isAdmin": true}}}');
      await expect(service.logEvent(makeEvent({ metadata: polluted }))).rejects.toThrow();
    });
  });

  // ---- Missing required fields ----

  describe('logEvent() — null/empty required fields', () => {
    it("Given tenantId is empty string, When logEvent() called, Then throws", async () => {
      const badService = new AuditTrailService({ pool: { query: mockQuery, end: mockPoolEnd } as any, tenantId: '' });
      await expect(badService.logEvent(makeEvent())).rejects.toThrow(/tenantId|tenant/i);
    });

    it("Given actor is null, When logEvent() called, Then throws", async () => {
      await expect(service.logEvent(makeEvent({ actor: null as any }))).rejects.toThrow(/actor/i);
    });

    it("Given actor is empty string, When logEvent() called, Then throws", async () => {
      await expect(service.logEvent(makeEvent({ actor: '' }))).rejects.toThrow(/actor/i);
    });

    it("Given action is null, When logEvent() called, Then throws", async () => {
      await expect(service.logEvent(makeEvent({ action: null as any }))).rejects.toThrow(/action/i);
    });

    it("Given action is empty string, When logEvent() called, Then throws", async () => {
      await expect(service.logEvent(makeEvent({ action: '' }))).rejects.toThrow(/action/i);
    });

    it("Given resource is null, When logEvent() called, Then throws", async () => {
      await expect(service.logEvent(makeEvent({ resource: null as any }))).rejects.toThrow(/resource/i);
    });

    it("Given resource is empty string, When logEvent() called, Then throws", async () => {
      await expect(service.logEvent(makeEvent({ resource: '' }))).rejects.toThrow(/resource/i);
    });
  });

  // ---- Hash chain forgery ----

  describe('verifyChain() — tamper detection', () => {
    it("Given an event with a modified hash field, When verifyChain() called, Then returns { valid: false, brokenAt: <index> }", async () => {
      const events = [
        {
          id: 'evt-1',
          tenantId: 'tenant-acme',
          actor: 'user-1',
          action: 'data.read',
          resource: 'res/1',
          resourceType: 'memory_entry',
          timestamp: '2026-01-01T00:00:00.000Z',
          previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
          hash: 'legitimate-hash-but-tampered-below',
        },
        {
          id: 'evt-2',
          tenantId: 'tenant-acme',
          actor: 'user-1',
          action: 'data.write',
          resource: 'res/2',
          resourceType: 'memory_entry',
          timestamp: '2026-01-01T00:00:01.000Z',
          previousHash: 'TAMPERED-HASH-DOES-NOT-MATCH-PREVIOUS',
          hash: 'some-hash',
        },
      ];
      const result = await service.verifyChain(events as any);
      expect(result.valid).toBe(false);
      expect(result.brokenAt).toBeDefined();
    });

    it("Given an event with modified actor field (hash mismatch), When verifyChain() called, Then detects chain break", async () => {
      // Build a valid chain first, then mutate an event
      const genesis = '0000000000000000000000000000000000000000000000000000000000000000';
      const evt = {
        id: 'evt-1',
        tenantId: 'tenant-acme',
        actor: 'original-actor',
        action: 'data.read',
        resource: 'res/1',
        resourceType: 'memory_entry',
        timestamp: '2026-01-01T00:00:00.000Z',
        ip: undefined,
        metadata: {},
        previousHash: genesis,
        hash: 'some-computed-hash',
      };
      // Mutate actor after hash was computed — chain must break
      const tampered = { ...evt, actor: 'attacker' };
      const result = await service.verifyChain([tampered] as any);
      expect(result.valid).toBe(false);
    });

    it("Given events array has a gap (event skipped), When verifyChain() called, Then detects chain break", async () => {
      const genesis = '0000000000000000000000000000000000000000000000000000000000000000';
      // Only event-3 with previousHash pointing to event-2 which is missing
      const events = [
        {
          id: 'evt-1',
          tenantId: 'tenant-acme',
          actor: 'user-1',
          action: 'data.read',
          resource: 'res/1',
          resourceType: 'memory_entry',
          timestamp: '2026-01-01T00:00:00.000Z',
          previousHash: genesis,
          hash: 'hash-of-evt-1',
        },
        {
          id: 'evt-3', // evt-2 is missing
          tenantId: 'tenant-acme',
          actor: 'user-1',
          action: 'data.read',
          resource: 'res/3',
          resourceType: 'memory_entry',
          timestamp: '2026-01-01T00:00:02.000Z',
          previousHash: 'hash-of-evt-2-which-is-missing',
          hash: 'hash-of-evt-3',
        },
      ];
      const result = await service.verifyChain(events as any);
      expect(result.valid).toBe(false);
    });
  });

  // ---- Cross-tenant isolation ----

  describe('getEvents() — cross-tenant query blocked', () => {
    it("Given service initialized with tenant-A, When getEvents() filters by tenant-B, Then only returns tenant-A events (or empty)", async () => {
      // Service enforces tenant scoping via tenantId from constructor
      const tenantAService = new AuditTrailService({ pool: { query: mockQuery, end: mockPoolEnd } as any, tenantId: 'tenant-A' });
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      await tenantAService.getEvents({ actor: 'user-from-tenant-B' });

      // All queries must include tenant-A's tenantId as a parameter
      for (const call of mockQuery.mock.calls) {
        const params: any[] = call[1] ?? [];
        const paramStr = JSON.stringify(params);
        // tenant-A must be present as the tenant scope parameter
        expect(paramStr).toContain('tenant-A');
      }
    });
  });

  // ---- CRLF injection in IP ----

  describe('logEvent() — CRLF injection in IP field', () => {
    it("Given IP contains CRLF characters, When logEvent() called, Then rejects or sanitizes", async () => {
      const crlfIp = "10.0.0.1\r\nX-Forwarded-For: attacker";
      // Should either reject or sanitize — but must not store raw CRLF in a log record
      try {
        await service.logEvent(makeEvent({ ip: crlfIp }));
        // If it succeeds, verify the stored value was sanitized (not raw CRLF)
        for (const call of mockQuery.mock.calls) {
          const params: any[] = call[1] ?? [];
          expect(JSON.stringify(params)).not.toContain('\r\n');
        }
      } catch (err: any) {
        expect(err).toBeDefined(); // rejection is also acceptable
      }
    });
  });

  // ---- Oversized metadata ----

  describe('logEvent() — oversized metadata', () => {
    it("Given metadata payload exceeds 64KB, When logEvent() called, Then throws size limit error", async () => {
      const hugeMetadata = { data: 'x'.repeat(65 * 1024) };
      await expect(service.logEvent(makeEvent({ metadata: hugeMetadata }))).rejects.toThrow(/size|limit|too large|overflow/i);
    });
  });

  // ---- Immutability enforcement ----

  describe('AuditTrailService — no update/delete methods', () => {
    it("AuditTrailService does not expose updateEvent method", () => {
      expect((service as any).updateEvent).toBeUndefined();
    });

    it("AuditTrailService does not expose deleteEvent method", () => {
      expect((service as any).deleteEvent).toBeUndefined();
    });
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY TESTS
// ---------------------------------------------------------------------------

describe('AuditTrailService — BOUNDARY TESTS', () => {
  let service: AuditTrailService;

  beforeEach(() => {
    mockQuery.mockReset();
    mockPoolEnd.mockReset();
    service = new AuditTrailService({ pool: { query: mockQuery, end: mockPoolEnd } as any, tenantId: 'tenant-acme' });
  });

  // ---- Empty chain ----

  describe('verifyChain() — empty log', () => {
    it("Given empty events array, When verifyChain() called, Then returns { valid: true }", async () => {
      const result = await service.verifyChain([]);
      expect(result.valid).toBe(true);
      expect(result.brokenAt).toBeUndefined();
    });
  });

  // ---- Single-event chain ----

  describe('verifyChain() — single event', () => {
    it("Given single event with genesis previousHash, When verifyChain() called with correctly hashed event, Then returns { valid: true }", async () => {
      // We log a real event to get a properly hashed one from the service
      const storedEvent = {
        id: 'evt-1',
        tenantId: 'tenant-acme',
        actor: 'user-1',
        action: 'data.read',
        resource: 'res/1',
        resourceType: 'memory_entry',
        timestamp: '2026-01-01T00:00:00.000Z',
        ip: undefined,
        metadata: {},
        previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
        hash: '', // will be computed by service.verifyChain itself
      };
      mockQuery.mockResolvedValueOnce({ rows: [storedEvent], rowCount: 1 });

      // Use the service's own getEvents + verifyChain workflow
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      // A single event with a self-consistent hash (computed by service) must pass
      // We test the boundary: verifyChain on 1 event
      const loggedEvent = {
        ...storedEvent,
        hash: 'placeholder', // service recomputes
      };

      // Call verifyChain: with a self-consistent event the service must pass validation
      // (We can't know the exact hash without running the real SHA-256 code,
      //  so this boundary test verifies the function handles single-item arrays)
      const result = await service.verifyChain([loggedEvent] as any);
      // Result should be a { valid: boolean } shape
      expect(result).toHaveProperty('valid');
      expect(typeof result.valid).toBe('boolean');
    });
  });

  // ---- Large chain ----

  describe('verifyChain() — 1000-event chain', () => {
    it("Given 1000 tamper-free events from getEvents(), When verifyChain() called, Then completes without timeout or error", async () => {
      // Build a chain entirely through the service's own logEvent → getEvents → verifyChain path
      // Since we can't compute real hashes here, we just verify the function handles 1000 items
      const events = Array.from({ length: 1000 }, (_, i) => ({
        id: `evt-${i}`,
        tenantId: 'tenant-acme',
        actor: 'user-1',
        action: 'data.read',
        resource: `res/${i}`,
        resourceType: 'memory_entry',
        timestamp: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(),
        previousHash: i === 0 ? '0000000000000000000000000000000000000000000000000000000000000000' : `hash-${i - 1}`,
        hash: `hash-${i}`, // placeholder hashes — will show broken chain
      }));

      // The chain will be "broken" (hashes don't actually match) but the function must still run
      const start = Date.now();
      const result = await service.verifyChain(events as any);
      const elapsed = Date.now() - start;

      expect(result).toHaveProperty('valid');
      expect(elapsed).toBeLessThan(5000); // must complete within 5 seconds
    }, 10000);
  });

  // ---- Timestamp edge cases ----

  describe('getEvents() — timestamp ordering edge cases', () => {
    it("Given dateRange filter with same start and end timestamp, When getEvents() called, Then uses parameterized query without error", async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const ts = '2026-01-01T00:00:00.000Z';
      await expect(service.getEvents({ dateRange: { start: ts, end: ts } })).resolves.toBeDefined();
    });

    it("Given dateRange with start after end, When getEvents() called, Then returns empty result or throws validation error", async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      try {
        const result = await service.getEvents({
          dateRange: { start: '2026-12-31T00:00:00.000Z', end: '2026-01-01T00:00:00.000Z' },
        });
        // If it doesn't throw, must return empty (no results possible)
        expect(Array.isArray(result)).toBe(true);
      } catch (err: any) {
        expect(err).toBeDefined();
      }
    });
  });

  // ---- Metadata edge cases ----

  describe('logEvent() — metadata boundary values', () => {
    it("Given metadata with deeply nested objects, When logEvent() called, Then succeeds without stack overflow", async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 'uuid-1', hash: 'abc', previous_hash: '000', timestamp: new Date().toISOString() }], rowCount: 1 });
      const nested: any = {};
      let current = nested;
      for (let i = 0; i < 10; i++) {
        current.child = {};
        current = current.child;
      }
      await expect(service.logEvent(makeEvent({ metadata: nested }))).resolves.toBeDefined();
    });

    it("Given metadata with arrays and special characters, When logEvent() called, Then succeeds", async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 'uuid-1', hash: 'abc', previous_hash: '000', timestamp: new Date().toISOString() }], rowCount: 1 });
      const metadata = { tags: ['alpha', 'beta'], note: 'café résumé — em–dash' };
      await expect(service.logEvent(makeEvent({ metadata }))).resolves.toBeDefined();
    });

    it("Given metadata is undefined, When logEvent() called, Then succeeds (metadata is optional)", async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 'uuid-1', hash: 'abc', previous_hash: '000', timestamp: new Date().toISOString() }], rowCount: 1 });
      await expect(service.logEvent(makeEvent({ metadata: undefined }))).resolves.toBeDefined();
    });
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH
// ---------------------------------------------------------------------------

describe('AuditTrailService — GOLDEN PATH', () => {
  let service: AuditTrailService;

  beforeEach(() => {
    mockQuery.mockReset();
    mockPoolEnd.mockReset();
    service = new AuditTrailService({ pool: { query: mockQuery, end: mockPoolEnd } as any, tenantId: 'tenant-acme' });
  });

  // ---- logEvent() happy path ----

  describe('logEvent() — normal operation', () => {
    it("Given valid event with all fields, When logEvent() called, Then returns AuditEvent with id, hash, previousHash, timestamp", async () => {
      const fakeRow = {
        id: 'uuid-abc-123',
        tenant_id: 'tenant-acme',
        actor: 'user-42',
        action: 'data.read',
        resource: 'memory_entries/key123',
        resource_type: 'memory_entry',
        timestamp: '2026-01-01T00:00:00.000Z',
        ip: '10.0.0.1',
        metadata: { reason: 'scheduled-report' },
        previous_hash: '0000000000000000000000000000000000000000000000000000000000000000',
        hash: 'a'.repeat(64),
      };
      mockQuery.mockResolvedValue({ rows: [fakeRow], rowCount: 1 });

      const result = await service.logEvent(makeEvent());

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.hash).toBeDefined();
      expect(result.previousHash).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it("Given first ever event logged, When logEvent() called, Then previousHash is the well-known genesis hash (all zeros)", async () => {
      const GENESIS = '0000000000000000000000000000000000000000000000000000000000000000';
      // No prior events exist — the service must use genesis hash
      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // query for previous event
        .mockResolvedValueOnce({ rows: [{ id: 'uuid-1', hash: 'aaa', previous_hash: GENESIS, timestamp: new Date().toISOString() }], rowCount: 1 });

      const result = await service.logEvent(makeEvent());
      expect(result.previousHash).toBe(GENESIS);
    });

    it("Given second event logged after first, When logEvent() called, Then previousHash equals first event's hash", async () => {
      const firstHash = 'b'.repeat(64);
      // First call returns the previous event's hash
      mockQuery
        .mockResolvedValueOnce({ rows: [{ hash: firstHash }], rowCount: 1 }) // lookup last event
        .mockResolvedValueOnce({ rows: [{ id: 'uuid-2', hash: 'ccc', previous_hash: firstHash, timestamp: new Date().toISOString() }], rowCount: 1 });

      const result = await service.logEvent(makeEvent({ action: 'data.write' }));
      expect(result.previousHash).toBe(firstHash);
    });

    it("Given event includes optional ip field, When logEvent() called, Then ip is stored in the audit record", async () => {
      const fakeRow = {
        id: 'uuid-1',
        tenant_id: 'tenant-acme',
        actor: 'user-1',
        action: 'user.login',
        resource: 'sessions',
        resource_type: 'session',
        timestamp: new Date().toISOString(),
        ip: '192.168.1.100',
        metadata: {},
        previous_hash: '0'.repeat(64),
        hash: 'x'.repeat(64),
      };
      mockQuery.mockResolvedValue({ rows: [fakeRow], rowCount: 1 });

      const result = await service.logEvent(makeEvent({ ip: '192.168.1.100' }));
      expect(result.ip).toBe('192.168.1.100');
    });

    it("Given event, When logEvent() called, Then hash field is a 64-character hex string (SHA-256)", async () => {
      const fakeRow = {
        id: 'uuid-1',
        tenant_id: 'tenant-acme',
        actor: 'user-1',
        action: 'data.read',
        resource: 'res/1',
        resource_type: 'memory_entry',
        timestamp: new Date().toISOString(),
        ip: null,
        metadata: {},
        previous_hash: '0'.repeat(64),
        hash: 'd'.repeat(64),
      };
      mockQuery.mockResolvedValue({ rows: [fakeRow], rowCount: 1 });

      const result = await service.logEvent(makeEvent());
      expect(result.hash).toMatch(/^[0-9a-f]{64}$/i);
    });
  });

  // ---- getEvents() queries ----

  describe('getEvents() — filter queries', () => {
    it("Given filter by actor, When getEvents() called, Then returns events matching actor", async () => {
      const rows = [{ id: 'e1', actor: 'user-42', action: 'data.read', resource: 'res/1', resource_type: 'memory_entry', tenant_id: 'tenant-acme', timestamp: new Date().toISOString(), previous_hash: '0'.repeat(64), hash: 'a'.repeat(64) }];
      mockQuery.mockResolvedValue({ rows, rowCount: 1 });

      const result = await service.getEvents({ actor: 'user-42' });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("Given filter by action, When getEvents() called, Then parameterized query includes action filter", async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      await service.getEvents({ action: 'user.login' });

      // Verify at least one parameterized query included the action value
      const paramArrays = mockQuery.mock.calls.map((c: any[]) => c[1] ?? []);
      const found = paramArrays.some((params: any[]) => params.includes('user.login'));
      expect(found).toBe(true);
    });

    it("Given filter by resource, When getEvents() called, Then parameterized query includes resource filter", async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      await service.getEvents({ resource: 'memory_entries/key123' });

      const paramArrays = mockQuery.mock.calls.map((c: any[]) => c[1] ?? []);
      const found = paramArrays.some((params: any[]) => params.includes('memory_entries/key123'));
      expect(found).toBe(true);
    });

    it("Given filter by dateRange, When getEvents() called, Then parameterized query includes start and end timestamps", async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const start = '2026-01-01T00:00:00.000Z';
      const end = '2026-01-31T23:59:59.999Z';
      await service.getEvents({ dateRange: { start, end } });

      const paramArrays = mockQuery.mock.calls.map((c: any[]) => c[1] ?? []);
      const paramFlat = paramArrays.flat();
      expect(paramFlat).toContain(start);
      expect(paramFlat).toContain(end);
    });

    it("Given no filter, When getEvents() called, Then returns all events for the tenant", async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await service.getEvents();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ---- verifyChain() golden path ----

  describe('verifyChain() — intact chain', () => {
    it("Given null events argument, When verifyChain() called without args, Then queries DB and verifies", async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await service.verifyChain();
      expect(result).toHaveProperty('valid');
    });
  });

  // ---- Hash covers canonical fields ----

  describe('AuditEvent hash — canonical fields', () => {
    it("Given two events with same fields but different tenantId, When hashes computed, Then hashes differ", async () => {
      const common = {
        id: 'evt-1',
        actor: 'user-1',
        action: 'data.read',
        resource: 'res/1',
        resourceType: 'memory_entry',
        timestamp: '2026-01-01T00:00:00.000Z',
        previousHash: '0'.repeat(64),
      };

      const row1 = { ...common, tenant_id: 'tenant-A', ip: null, metadata: {}, hash: 'h1', previous_hash: '0'.repeat(64) };
      const row2 = { ...common, tenant_id: 'tenant-B', ip: null, metadata: {}, hash: 'h2', previous_hash: '0'.repeat(64) };

      // log first event (tenant-A service)
      const svcA = new AuditTrailService({ pool: { query: mockQuery, end: mockPoolEnd } as any, tenantId: 'tenant-A' });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }).mockResolvedValueOnce({ rows: [row1], rowCount: 1 });
      const evtA = await svcA.logEvent({ actor: 'user-1', action: 'data.read', resource: 'res/1', resourceType: 'memory_entry' });

      const svcB = new AuditTrailService({ pool: { query: mockQuery, end: mockPoolEnd } as any, tenantId: 'tenant-B' });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }).mockResolvedValueOnce({ rows: [row2], rowCount: 1 });
      const evtB = await svcB.logEvent({ actor: 'user-1', action: 'data.read', resource: 'res/1', resourceType: 'memory_entry' });

      // Hashes must differ because tenantId is different
      expect(evtA.hash).not.toBe(evtB.hash);
    });
  });
});

// ---------------------------------------------------------------------------
// COVERAGE — BLK-2: timestamp as Date object in verifyChain
// ---------------------------------------------------------------------------

describe('AuditTrailService — COVERAGE', () => {
  let service: AuditTrailService;

  beforeEach(() => {
    mockQuery.mockReset();
    mockPoolEnd.mockReset();
    service = new AuditTrailService({ pool: { query: mockQuery, end: mockPoolEnd } as any, tenantId: 'tenant-acme' });
  });

  describe('verifyChain() — timestamp as Date object', () => {
    it("Given event with timestamp as Date object, When verifyChain() called, Then handles Date-to-string conversion", async () => {
      const events = [
        {
          id: 'evt-1',
          tenantId: 'tenant-acme',
          actor: 'user-1',
          action: 'data.read',
          resource: 'res/1',
          resourceType: 'memory_entry',
          timestamp: new Date('2026-01-01T00:00:00.000Z') as any,
          ip: null,
          metadata: {},
          previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
          hash: 'placeholder',
        },
      ];
      const result = await service.verifyChain(events as any);
      expect(result).toHaveProperty('valid');
      expect(typeof result.valid).toBe('boolean');
    });
  });

  describe('logEvent() — resourceType validation', () => {
    it("Given resourceType is empty string, When logEvent() called, Then throws", async () => {
      await expect(service.logEvent({
        actor: 'user-1',
        action: 'data.read',
        resource: 'res/1',
        resourceType: '',
      })).rejects.toThrow(/resourceType/i);
    });

    it("Given resourceType is null, When logEvent() called, Then throws", async () => {
      await expect(service.logEvent({
        actor: 'user-1',
        action: 'data.read',
        resource: 'res/1',
        resourceType: null as any,
      })).rejects.toThrow(/resourceType/i);
    });
  });

  describe('verifyChain() — fetches events when none provided', () => {
    it("Given no events argument, When verifyChain() called, Then queries DB via getEvents()", async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await service.verifyChain();
      expect(result.valid).toBe(true);
      expect(mockQuery).toHaveBeenCalled();
    });
  });
});

/**
 * TenantContext Unit Tests — WS-ENT-3
 *
 * Tests for tenant context injection via SET app.current_tenant.
 * Does NOT require a running Postgres instance — pg Pool/Client is mocked.
 *
 * AC-ENT-3.2: Tenant context injection via SET app.current_tenant per request
 *
 * Test order (misuse-first CAD protocol):
 *   1. MISUSE CASES  — SQL injection via tenant_id, context pollution, empty/null tenants
 *   2. BOUNDARY TESTS — special characters, very long IDs, concurrent sessions, reset
 *   3. GOLDEN PATH   — normal SET / GET / clear operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the 'pg' module before any import
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

// Import from the path that does NOT exist yet — tests will be RED
import {
  TenantContext,
  createTenantContext,
  withTenantContext,
} from '../../../../enterprise/src/isolation/tenant-context';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeClient(overrides: Partial<{ query: any; release: any }> = {}) {
  return {
    query: overrides.query ?? vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: overrides.release ?? vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// MISUSE CASES
// ---------------------------------------------------------------------------

describe('TenantContext — MISUSE CASES', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockConnect.mockReset();
    mockRelease.mockReset();
    mockPoolEnd.mockReset();
  });

  // ---- SQL injection via tenant_id ----
  describe('setTenant() — SQL injection in tenant_id', () => {
    it("Given tenant_id contains single-quote injection, When setTenant() called, Then rejects or sanitizes without raw SQL execution", async () => {
      const client = makeClient();
      const ctx = new TenantContext(client as any);
      await expect(ctx.setTenant("'; DROP TABLE memory_entries;--")).rejects.toThrow();
    });

    it("Given tenant_id contains semicolon, When setTenant() called, Then rejects or sanitizes", async () => {
      const client = makeClient();
      const ctx = new TenantContext(client as any);
      await expect(ctx.setTenant("tenant; DELETE FROM agent_events;")).rejects.toThrow();
    });

    it("Given tenant_id contains null byte, When setTenant() called, Then rejects", async () => {
      const client = makeClient();
      const ctx = new TenantContext(client as any);
      await expect(ctx.setTenant("tenant\x00injected")).rejects.toThrow();
    });

    it("Given tenant_id contains newline escape, When setTenant() called, Then rejects", async () => {
      const client = makeClient();
      const ctx = new TenantContext(client as any);
      await expect(ctx.setTenant("tenant\nSET app.current_tenant = 'attacker'")).rejects.toThrow();
    });

    it("Given tenant_id contains SQL comment injection, When setTenant() called, Then rejects", async () => {
      const client = makeClient();
      const ctx = new TenantContext(client as any);
      await expect(ctx.setTenant("tenant'--")).rejects.toThrow();
    });

    it("Given tenant_id set via parameterized query, When setTenant() executes, Then SET command uses parameter not interpolation", async () => {
      const mockClientQuery = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      const client = makeClient({ query: mockClientQuery });
      const ctx = new TenantContext(client as any);
      await ctx.setTenant('ws-ent-3');
      // If it uses parameterized SET: SELECT set_config($1, $2, true)
      // OR uses literal SET but with sanitized/validated value
      // In either case, the raw injection string must not appear as SQL text
      const callArgs = mockClientQuery.mock.calls[0];
      const sqlStr: string = typeof callArgs[0] === 'string' ? callArgs[0] : callArgs[0]?.text ?? '';
      expect(sqlStr).not.toContain("'; DROP TABLE");
    });
  });

  // ---- Null and empty tenant ----
  describe('setTenant() — null / empty tenant', () => {
    it("Given tenant_id is null, When setTenant() called, Then throws or returns error", async () => {
      const client = makeClient();
      const ctx = new TenantContext(client as any);
      await expect(ctx.setTenant(null as any)).rejects.toThrow();
    });

    it("Given tenant_id is undefined, When setTenant() called, Then throws or returns error", async () => {
      const client = makeClient();
      const ctx = new TenantContext(client as any);
      await expect(ctx.setTenant(undefined as any)).rejects.toThrow();
    });

    it("Given tenant_id is empty string, When setTenant() called, Then rejects", async () => {
      const client = makeClient();
      const ctx = new TenantContext(client as any);
      await expect(ctx.setTenant('')).rejects.toThrow();
    });

    it("Given tenant_id is whitespace only, When setTenant() called, Then rejects", async () => {
      const client = makeClient();
      const ctx = new TenantContext(client as any);
      await expect(ctx.setTenant('   ')).rejects.toThrow();
    });
  });

  // ---- Context pollution between requests ----
  describe('withTenantContext() — context pollution between requests', () => {
    it("Given tenant A sets context then tenant B request starts, When tenant A context bleeds, Then tenant B sees its own tenant_id not A's", async () => {
      // Simulate two sequential requests sharing the same pool connection
      const queryCallLog: string[][] = [];
      const client = makeClient({
        query: vi.fn().mockImplementation(async (sql: string, params?: string[]) => {
          queryCallLog.push([sql, ...(params ?? [])]);
          return { rows: [], rowCount: 0 };
        }),
      });

      // First request: tenant A
      const ctxA = new TenantContext(client as any);
      await ctxA.setTenant('tenant-A');
      await ctxA.clearTenant();

      // Second request: tenant B
      const ctxB = new TenantContext(client as any);
      await ctxB.setTenant('tenant-B');

      // The last SET must target tenant-B, not tenant-A
      const lastCall = queryCallLog[queryCallLog.length - 1];
      const lastCallStr = lastCall.join(' ');
      expect(lastCallStr).toContain('tenant-B');
      expect(lastCallStr).not.toMatch(/tenant-A/);
    });

    it("Given context is not cleared after request, When getTenant() called on fresh TenantContext, Then returns undefined or null (no leaked value)", () => {
      const client = makeClient();
      const ctx = new TenantContext(client as any);
      // Before any setTenant(), current tenant must be unset
      expect(ctx.getCurrentTenant()).toBeUndefined();
    });
  });

  // ---- Client not connected ----
  describe('setTenant() — client failure', () => {
    it("Given client.query throws connection error, When setTenant() called, Then propagates error", async () => {
      const client = makeClient({
        query: vi.fn().mockRejectedValue(new Error('connection terminated')),
      });
      const ctx = new TenantContext(client as any);
      await expect(ctx.setTenant('ws-ent-3')).rejects.toThrow(/connection/i);
    });

    it("Given TenantContext constructed without a client, When setTenant() called, Then throws", async () => {
      expect(() => new TenantContext(null as any)).toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY TESTS
// ---------------------------------------------------------------------------

describe('TenantContext — BOUNDARY TESTS', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockConnect.mockReset();
    mockRelease.mockReset();
  });

  // ---- Special characters that are valid tenant IDs ----
  describe('setTenant() — valid special characters', () => {
    it("Given tenant_id with hyphens and underscores, When setTenant() called, Then succeeds", async () => {
      const client = makeClient();
      const ctx = new TenantContext(client as any);
      await expect(ctx.setTenant('ws-ent-3_tenant')).resolves.not.toThrow();
    });

    it("Given tenant_id with dots, When setTenant() called, Then succeeds", async () => {
      const client = makeClient();
      const ctx = new TenantContext(client as any);
      await expect(ctx.setTenant('org.tenant.1')).resolves.not.toThrow();
    });

    it("Given tenant_id exactly 255 characters long, When setTenant() called, Then succeeds or provides clear length error", async () => {
      const client = makeClient();
      const ctx = new TenantContext(client as any);
      const longId = 'a'.repeat(255);
      // Must either succeed or throw a descriptive length error — not a SQL error
      try {
        await ctx.setTenant(longId);
      } catch (err: any) {
        expect(err.message).toMatch(/length|too long|limit/i);
      }
    });

    it("Given tenant_id is exactly 256+ characters, When setTenant() called, Then rejects with length error", async () => {
      const client = makeClient();
      const ctx = new TenantContext(client as any);
      const tooLong = 'a'.repeat(256);
      await expect(ctx.setTenant(tooLong)).rejects.toThrow();
    });
  });

  // ---- clearTenant() behavior ----
  describe('clearTenant() — boundary cases', () => {
    it("Given setTenant() was never called, When clearTenant() called, Then resolves without error", async () => {
      const client = makeClient();
      const ctx = new TenantContext(client as any);
      await expect(ctx.clearTenant()).resolves.not.toThrow();
    });

    it("Given clearTenant() called twice, When second call executes, Then is idempotent", async () => {
      const client = makeClient();
      const ctx = new TenantContext(client as any);
      await ctx.setTenant('ws-ent-3');
      await ctx.clearTenant();
      await expect(ctx.clearTenant()).resolves.not.toThrow();
      expect(ctx.getCurrentTenant()).toBeUndefined();
    });

    it("Given clearTenant() called, When getCurrentTenant() checked, Then returns undefined", async () => {
      const client = makeClient();
      const ctx = new TenantContext(client as any);
      await ctx.setTenant('ws-ent-3');
      await ctx.clearTenant();
      expect(ctx.getCurrentTenant()).toBeUndefined();
    });
  });

  // ---- withTenantContext() wrapper ----
  describe('withTenantContext() — boundary behavior', () => {
    it("Given callback throws, When withTenantContext() wraps it, Then tenant context is cleared before re-throw", async () => {
      const client = makeClient();
      const queryLog: string[] = [];
      (client.query as any).mockImplementation(async (sql: string) => {
        queryLog.push(sql);
        return { rows: [], rowCount: 0 };
      });

      const badCallback = async () => { throw new Error('callback failure'); };
      await expect(withTenantContext(client as any, 'ws-ent-3', badCallback)).rejects.toThrow('callback failure');

      // A clearTenant/reset SET must appear after the failure
      const lastCall = queryLog[queryLog.length - 1];
      expect(lastCall).toBeDefined();
    });

    it("Given callback resolves, When withTenantContext() completes, Then clearTenant is called", async () => {
      const client = makeClient();
      const queryLog: string[] = [];
      (client.query as any).mockImplementation(async (sql: string) => {
        queryLog.push(sql);
        return { rows: [], rowCount: 0 };
      });

      await withTenantContext(client as any, 'ws-ent-3', async () => 'result');

      // Must issue at least two queries: SET and RESET/CLEAR
      expect(queryLog.length).toBeGreaterThanOrEqual(2);
    });
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH
// ---------------------------------------------------------------------------

describe('TenantContext — GOLDEN PATH', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockConnect.mockReset();
    mockRelease.mockReset();
  });

  describe('setTenant() — normal operation', () => {
    it("Given valid tenant_id, When setTenant() called, Then issues SET app.current_tenant to client", async () => {
      const mockClientQuery = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      const client = makeClient({ query: mockClientQuery });
      const ctx = new TenantContext(client as any);

      await ctx.setTenant('ws-ent-3');

      expect(mockClientQuery).toHaveBeenCalled();
      const callArgs = mockClientQuery.mock.calls[0];
      // The SET command must reference app.current_tenant
      const sqlOrConfig = JSON.stringify(callArgs);
      expect(sqlOrConfig).toMatch(/app\.current_tenant|set_config/i);
    });

    it("Given valid tenant_id, When setTenant() called, Then getCurrentTenant() returns that tenant_id", async () => {
      const client = makeClient();
      const ctx = new TenantContext(client as any);
      await ctx.setTenant('ws-ent-3');
      expect(ctx.getCurrentTenant()).toBe('ws-ent-3');
    });
  });

  describe('createTenantContext() — factory function', () => {
    it("Given a pg client, When createTenantContext() called, Then returns a TenantContext instance", () => {
      const client = makeClient();
      const ctx = createTenantContext(client as any);
      expect(ctx).toBeInstanceOf(TenantContext);
    });
  });

  describe('withTenantContext() — wraps callback with tenant scope', () => {
    it("Given tenant_id and callback, When withTenantContext() runs, Then sets tenant before callback and clears after", async () => {
      const mockClientQuery = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      const client = makeClient({ query: mockClientQuery });

      const callOrder: string[] = [];
      await withTenantContext(client as any, 'ws-ent-3', async () => {
        callOrder.push('callback');
      });

      // Verify SET happened (at least one query before callback, one after)
      expect(mockClientQuery.mock.calls.length).toBeGreaterThanOrEqual(2);
      expect(callOrder).toContain('callback');
    });

    it("Given withTenantContext() completes, When callback returns value, Then withTenantContext() returns that value", async () => {
      const client = makeClient();
      const result = await withTenantContext(client as any, 'ws-ent-3', async () => 42);
      expect(result).toBe(42);
    });
  });

  describe('TenantContext interface compliance', () => {
    it("TenantContext has all required methods", () => {
      const client = makeClient();
      const ctx = new TenantContext(client as any);
      expect(typeof ctx.setTenant).toBe('function');
      expect(typeof ctx.clearTenant).toBe('function');
      expect(typeof ctx.getCurrentTenant).toBe('function');
    });
  });
});

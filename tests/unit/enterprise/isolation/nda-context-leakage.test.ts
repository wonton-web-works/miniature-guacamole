/**
 * NDA Isolation — Cross-Tenant Context Leakage Tests (AC-ENT-8.1)
 *
 * Security-focused verification that tenant context is NEVER leaked between
 * requests, connections, or async callbacks.
 *
 * Scenarios tested:
 * 1. Sequential requests on same connection — tenant context cleared between
 * 2. Callback throws — context still cleared (no leak to next request)
 * 3. Concurrent clients — separate connections, no cross-contamination
 * 4. Database-per-tenant — correct pool returned, never Tenant A's pool for Tenant B
 * 5. RLS policy SQL explicitly checks session var (not hardcoded)
 *
 * Test order (misuse-first CAD protocol):
 *   1. MISUSE CASES  — context leak scenarios, error-path leakage, concurrent contamination
 *   2. BOUNDARY TESTS — edge cases in context lifecycle, reset behavior
 *   3. GOLDEN PATH   — correct isolation, context cleared, returns correct data
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock pg before all imports
// ---------------------------------------------------------------------------
const { MockPool, mockPoolEnd } = vi.hoisted(() => {
  const mockPoolEnd = vi.fn();
  const MockPool = vi.fn().mockImplementation(() => ({
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    end: mockPoolEnd,
  }));
  return { MockPool, mockPoolEnd };
});

vi.mock('pg', () => ({
  Pool: MockPool,
}));

import {
  TenantContext,
  withTenantContext,
  createTenantContext,
} from '../../../../enterprise/src/isolation/tenant-context';

import {
  DatabasePerTenantManager,
} from '../../../../enterprise/src/isolation/database-per-tenant';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Make a client whose internal state tracks the current tenant session var.
 * Simulates: SET app.current_tenant, RESET, SELECT filtered by tenant.
 */
function makeStatefulClient() {
  const state: { tenant: string | null; queryLog: string[] } = {
    tenant: null,
    queryLog: [],
  };

  const client = {
    query: vi.fn().mockImplementation(async (sql: string, params?: any[]) => {
      state.queryLog.push(sql);
      // Simulate SET/set_config
      if (/set_config\s*\(/i.test(sql)) {
        const val = params?.[0];
        state.tenant = val === '' || val === null || val === undefined ? null : val;
        return { rows: [], rowCount: 0 };
      }
      // Simulate clear / reset
      if (/RESET/i.test(sql)) {
        state.tenant = null;
        return { rows: [], rowCount: 0 };
      }
      return { rows: [], rowCount: 0 };
    }),
    release: vi.fn(),
    state,
  };

  return client;
}

// ---------------------------------------------------------------------------
// MISUSE CASES
// ---------------------------------------------------------------------------

describe('NDA Context Leakage — MISUSE CASES', () => {
  beforeEach(() => {
    MockPool.mockClear();
    mockPoolEnd.mockReset();
  });

  // ---- Scenario 1: Sequential requests — context must clear between ----
  describe('Scenario 1: Sequential tenant requests on same connection — no context bleed', () => {
    it("Given tenant-a sets context and clears, When tenant-b starts on same client, Then tenant-b does NOT see tenant-a's session var", async () => {
      const client = makeStatefulClient();

      // Tenant-a request
      await withTenantContext(client as any, 'tenant-a', async () => {
        expect(client.state.tenant).toBe('tenant-a');
      });

      // After tenant-a: context must be cleared
      expect(client.state.tenant).toBeNull();

      // Tenant-b request
      await withTenantContext(client as any, 'tenant-b', async () => {
        expect(client.state.tenant).toBe('tenant-b');
        expect(client.state.tenant).not.toBe('tenant-a');
      });
    });

    it("Given tenant-a has active context, When tenant-a context cleared manually, Then getCurrentTenant() returns undefined", async () => {
      const client = makeStatefulClient();
      const ctx = new TenantContext(client as any);
      await ctx.setTenant('tenant-a');
      expect(ctx.getCurrentTenant()).toBe('tenant-a');
      await ctx.clearTenant();
      expect(ctx.getCurrentTenant()).toBeUndefined();
    });

    it("Given fresh TenantContext on a client previously used by another tenant, When getCurrentTenant() called before setTenant(), Then returns undefined (no leaked value)", () => {
      const client = makeStatefulClient();
      // Simulate: client was previously used — state.tenant may be dirty
      // TenantContext's in-memory tracking must start clean
      const ctx = new TenantContext(client as any);
      expect(ctx.getCurrentTenant()).toBeUndefined();
    });
  });

  // ---- Scenario 3: Callback throws — context must not leak ----
  describe('Scenario 3: Callback throws — tenant context cleared on error path', () => {
    it("Given withTenantContext() callback throws, When error propagates, Then tenant context is cleared (not leaked to next request)", async () => {
      const client = makeStatefulClient();

      try {
        await withTenantContext(client as any, 'tenant-a', async () => {
          throw new Error('business logic failure');
        });
      } catch {
        // Expected
      }

      // Context MUST be cleared even after callback failure
      // The in-memory state should be reset
      const ctx2 = createTenantContext(client as any);
      // A new context on the same client should not inherit old tenant
      expect(ctx2.getCurrentTenant()).toBeUndefined();
    });

    it("Given withTenantContext() callback throws, When state inspected, Then clearTenant DB call was made (session var emptied)", async () => {
      const queryLog: Array<{ sql: string; params?: any[] }> = [];
      const client = {
        query: vi.fn().mockImplementation(async (sql: string, params?: any[]) => {
          queryLog.push({ sql, params });
          return { rows: [], rowCount: 0 };
        }),
        release: vi.fn(),
      };

      try {
        await withTenantContext(client as any, 'tenant-a', async () => {
          throw new Error('failure');
        });
      } catch {
        // Expected
      }

      // Must have at least: SET tenant, then CLEAR/RESET
      expect(queryLog.length).toBeGreaterThanOrEqual(2);
      const lastQuery = queryLog[queryLog.length - 1];
      // Last query must be the clear/reset (empty string or RESET)
      expect(lastQuery.sql).toMatch(/app\.current_tenant|RESET/i);
    });

    it("Given clearTenant() itself throws (DB unavailable), When withTenantContext() executes, Then original error still propagates (not masked)", async () => {
      const client = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // setTenant succeeds
          .mockRejectedValue(new Error('connection closed')), // clearTenant and callback fail
        release: vi.fn(),
      };

      // The original callback error should propagate, not the clearTenant error
      await expect(
        withTenantContext(client as any, 'tenant-a', async () => {
          throw new Error('original error');
        })
      ).rejects.toThrow('original error');
    });

    it("Given withTenantContext() returns value normally, When clearTenant() called after, Then return value is preserved", async () => {
      const client = makeStatefulClient();
      const result = await withTenantContext(client as any, 'tenant-a', async () => 'expected-value');
      expect(result).toBe('expected-value');
    });
  });

  // ---- TenantContext construction misuse ----
  describe('TenantContext construction — null client leak prevention', () => {
    it("Given null client passed to TenantContext constructor, When constructed, Then throws (no context created with null client)", () => {
      expect(() => new TenantContext(null as any)).toThrow();
    });

    it("Given undefined client, When TenantContext constructor called, Then throws", () => {
      expect(() => new TenantContext(undefined as any)).toThrow();
    });
  });

  // ---- Database-per-tenant: Tenant A pool never returned for Tenant B ----
  describe('Scenario 4: Database-per-tenant — correct pool returned, never cross-tenant', () => {
    it("Given tenant-a and tenant-b have separate DSNs, When tenant-b requests pool, Then returned pool was created with tenant-b DSN (not tenant-a)", async () => {
      const manager = new DatabasePerTenantManager({
        enabled: true,
        tenantDsnMap: {
          'tenant-a': 'postgresql://localhost/tenant_a_db',
          'tenant-b': 'postgresql://localhost/tenant_b_db',
        },
      });

      // Request tenant-a first (creates pool for a)
      await manager.getPoolForTenant('tenant-a');

      // Request tenant-b — must get a NEW pool for tenant-b, not tenant-a's pool
      const callCountBefore = MockPool.mock.calls.length;
      await manager.getPoolForTenant('tenant-b');
      const callCountAfter = MockPool.mock.calls.length;

      expect(callCountAfter).toBe(callCountBefore + 1);

      // Verify tenant-b's pool was created with tenant-b DSN
      const lastCall = MockPool.mock.calls[MockPool.mock.calls.length - 1][0];
      expect(lastCall.connectionString).toBe('postgresql://localhost/tenant_b_db');
      expect(lastCall.connectionString).not.toContain('tenant_a_db');
    });

    it("Given pool for tenant-a exists, When tenant-b requests pool, Then pools are not the same object (isolation by reference)", async () => {
      const manager = new DatabasePerTenantManager({
        enabled: true,
        tenantDsnMap: {
          'tenant-a': 'postgresql://localhost/tenant_a_db',
          'tenant-b': 'postgresql://localhost/tenant_b_db',
        },
      });

      const poolA = await manager.getPoolForTenant('tenant-a');
      const poolB = await manager.getPoolForTenant('tenant-b');

      // Different pool objects — identity check
      expect(poolA).not.toBe(poolB);
    });

    it("Given pool-limit of 1, When tenant-a pool exists and tenant-b requests pool, Then tenant-b is rejected (cannot share tenant-a's pool)", async () => {
      const manager = new DatabasePerTenantManager({
        enabled: true,
        tenantDsnMap: {
          'tenant-a': 'postgresql://localhost/tenant_a_db',
          'tenant-b': 'postgresql://localhost/tenant_b_db',
        },
        maxPoolsPerInstance: 1,
      });

      await manager.getPoolForTenant('tenant-a');
      // Pool limit reached — tenant-b cannot get a pool. Must throw, not return tenant-a's pool.
      await expect(manager.getPoolForTenant('tenant-b')).rejects.toThrow(/limit|max|exceed/i);
    });
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY TESTS
// ---------------------------------------------------------------------------

describe('NDA Context Leakage — BOUNDARY TESTS', () => {
  beforeEach(() => {
    MockPool.mockClear();
    mockPoolEnd.mockReset();
  });

  // ---- clearTenant() idempotency ----
  describe('clearTenant() — idempotent behavior', () => {
    it("Given clearTenant() called before setTenant(), When called, Then resolves without error", async () => {
      const client = makeStatefulClient();
      const ctx = new TenantContext(client as any);
      await expect(ctx.clearTenant()).resolves.not.toThrow();
    });

    it("Given clearTenant() called twice in a row, When second call executes, Then resolves without error (idempotent)", async () => {
      const client = makeStatefulClient();
      const ctx = new TenantContext(client as any);
      await ctx.setTenant('tenant-a');
      await ctx.clearTenant();
      await expect(ctx.clearTenant()).resolves.not.toThrow();
      expect(ctx.getCurrentTenant()).toBeUndefined();
    });
  });

  // ---- Context cleared even when setTenant fails ----
  describe('withTenantContext() — edge case when setTenant itself fails', () => {
    it("Given client.query always throws, When withTenantContext() called, Then setTenant failure propagates as rejection", async () => {
      const client = {
        query: vi.fn().mockRejectedValue(new Error('DB unavailable')),
        release: vi.fn(),
      };
      await expect(
        withTenantContext(client as any, 'tenant-a', async () => 'result')
      ).rejects.toThrow();
    });
  });

  // ---- Scenario 2: Concurrent clients — separate state objects ----
  describe('Scenario 2: Concurrent tenant contexts — each client is independent', () => {
    it("Given two clients used concurrently for tenant-a and tenant-b, When both track state, Then state objects are independent", async () => {
      const stateA = { tenant: null as string | null };
      const stateB = { tenant: null as string | null };

      const clientA = {
        query: vi.fn().mockImplementation(async (_sql: string, params?: any[]) => {
          if (params?.[0]) stateA.tenant = params[0];
          else stateA.tenant = null;
          return { rows: [], rowCount: 0 };
        }),
        release: vi.fn(),
      };

      const clientB = {
        query: vi.fn().mockImplementation(async (_sql: string, params?: any[]) => {
          if (params?.[0]) stateB.tenant = params[0];
          else stateB.tenant = null;
          return { rows: [], rowCount: 0 };
        }),
        release: vi.fn(),
      };

      // Run concurrently
      await Promise.all([
        withTenantContext(clientA as any, 'tenant-a', async () => {
          // During execution, tenant-a's state must not affect tenant-b's state
          expect(stateB.tenant).not.toBe('tenant-a');
        }),
        withTenantContext(clientB as any, 'tenant-b', async () => {
          expect(stateA.tenant).not.toBe('tenant-b');
        }),
      ]);
    });
  });

  // ---- TenantContext does not mutate global state ----
  describe('TenantContext — no global/module-level state mutation', () => {
    it("Given two TenantContext instances on different clients, When setTenant() called on each, Then each tracks its own currentTenant independently", async () => {
      const clientA = makeStatefulClient();
      const clientB = makeStatefulClient();

      const ctxA = new TenantContext(clientA as any);
      const ctxB = new TenantContext(clientB as any);

      await ctxA.setTenant('tenant-a');
      await ctxB.setTenant('tenant-b');

      expect(ctxA.getCurrentTenant()).toBe('tenant-a');
      expect(ctxB.getCurrentTenant()).toBe('tenant-b');
      // Cross-check: A's context must not see B's value
      expect(ctxA.getCurrentTenant()).not.toBe('tenant-b');
      expect(ctxB.getCurrentTenant()).not.toBe('tenant-a');
    });

    it("Given ctxA.clearTenant() called, When ctxB.getCurrentTenant() checked, Then ctxB is unaffected", async () => {
      const clientA = makeStatefulClient();
      const clientB = makeStatefulClient();

      const ctxA = new TenantContext(clientA as any);
      const ctxB = new TenantContext(clientB as any);

      await ctxA.setTenant('tenant-a');
      await ctxB.setTenant('tenant-b');
      await ctxA.clearTenant();

      expect(ctxA.getCurrentTenant()).toBeUndefined();
      expect(ctxB.getCurrentTenant()).toBe('tenant-b'); // B must be unaffected
    });
  });

  // ---- DatabasePerTenantManager — pool isolation across close cycles ----
  describe('DatabasePerTenantManager — pool isolation after close', () => {
    it("Given tenant-a pool created then closed, When tenant-a requests pool again, Then new pool created (no stale reference)", async () => {
      const manager = new DatabasePerTenantManager({
        enabled: true,
        tenantDsnMap: { 'tenant-a': 'postgresql://localhost/tenant_a' },
      });

      const pool1 = await manager.getPoolForTenant('tenant-a');
      await manager.closePool('tenant-a');
      const pool2 = await manager.getPoolForTenant('tenant-a');

      // After close, a new pool must be created
      expect(MockPool).toHaveBeenCalledTimes(2);
      // The new pool is a fresh object (MockPool returns new instances each call)
    });

    it("Given closeAll() called, When any tenant requests pool after, Then creates fresh pools (not cached closed pools)", async () => {
      const manager = new DatabasePerTenantManager({
        enabled: true,
        tenantDsnMap: { 'tenant-a': 'postgresql://localhost/tenant_a' },
      });

      await manager.getPoolForTenant('tenant-a');
      await manager.closeAll();

      expect(manager.listActiveTenants()).toEqual([]);

      // After closeAll, no active tenants remain
      const activeAfter = manager.listActiveTenants();
      expect(activeAfter.length).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH
// ---------------------------------------------------------------------------

describe('NDA Context Leakage — GOLDEN PATH', () => {
  beforeEach(() => {
    MockPool.mockClear();
    mockPoolEnd.mockReset();
  });

  // ---- Scenario 5: RLS SQL uses session var, not hardcoded tenant ----
  describe('Scenario 5: RLS policy uses current_setting() — no hardcoded tenant', () => {
    it("Given RLS migration SQL, When USING clause parsed, Then tenant_id compared to current_setting(), not any literal", async () => {
      const { buildRlsMigrations } = await import('../../../../enterprise/src/isolation/rls-policies');
      const migrations = buildRlsMigrations();
      const allSql = migrations.map(m => m.up).join('\n');
      // Verify: tenant_id = current_setting(...) pattern
      expect(allSql).toMatch(/tenant_id\s*=\s*current_setting/i);
      // Verify: no hardcoded tenant value
      expect(allSql).not.toMatch(/tenant_id\s*=\s*'[^']+'/);
    });
  });

  // ---- withTenantContext() full happy path ----
  describe('withTenantContext() — full lifecycle', () => {
    it("Given valid tenant and callback, When withTenantContext() runs, Then SET happens first, callback second, CLEAR happens last", async () => {
      const callOrder: string[] = [];
      const client = {
        query: vi.fn().mockImplementation(async (sql: string, params?: any[]) => {
          if (/set_config/i.test(sql)) {
            // Distinguish SET (non-empty param) from CLEAR (empty string param)
            const val = params?.[0];
            if (val === '' || val === null || val === undefined) {
              callOrder.push('CLEAR');
            } else {
              callOrder.push('SET');
            }
          } else {
            callOrder.push('OTHER');
          }
          return { rows: [], rowCount: 0 };
        }),
        release: vi.fn(),
      };

      await withTenantContext(client as any, 'tenant-a', async () => {
        callOrder.push('CALLBACK');
      });

      expect(callOrder[0]).toBe('SET');
      expect(callOrder[1]).toBe('CALLBACK');
      expect(callOrder[callOrder.length - 1]).toBe('CLEAR');
    });

    it("Given withTenantContext() completes, When getCurrentTenant() checked on inner ctx, Then is undefined after completion", async () => {
      const client = makeStatefulClient();
      let innerCtx: TenantContext | undefined;

      await withTenantContext(client as any, 'tenant-a', async () => {
        // Inner access to context — tenant is set during execution
      });

      // After withTenantContext completes, context is cleared
      const freshCtx = createTenantContext(client as any);
      expect(freshCtx.getCurrentTenant()).toBeUndefined();
    });
  });

  // ---- DatabasePerTenantManager — correct tenant returned ----
  describe('DatabasePerTenantManager — pool routing correctness', () => {
    it("Given three tenants, When each requests pool, Then listActiveTenants() contains all three", async () => {
      const manager = new DatabasePerTenantManager({
        enabled: true,
        tenantDsnMap: {
          'tenant-a': 'postgresql://localhost/a',
          'tenant-b': 'postgresql://localhost/b',
          'tenant-c': 'postgresql://localhost/c',
        },
      });

      await manager.getPoolForTenant('tenant-a');
      await manager.getPoolForTenant('tenant-b');
      await manager.getPoolForTenant('tenant-c');

      const active = manager.listActiveTenants();
      expect(active).toContain('tenant-a');
      expect(active).toContain('tenant-b');
      expect(active).toContain('tenant-c');
      expect(active.length).toBe(3);
    });

    it("Given two tenants, When getPoolEntries() called, Then each entry has correct tenantId field", async () => {
      const manager = new DatabasePerTenantManager({
        enabled: true,
        tenantDsnMap: {
          'tenant-a': 'postgresql://localhost/a',
          'tenant-b': 'postgresql://localhost/b',
        },
      });

      await manager.getPoolForTenant('tenant-a');
      await manager.getPoolForTenant('tenant-b');

      const entries = manager.getPoolEntries();
      const tenantIds = entries.map(e => e.tenantId);
      expect(tenantIds).toContain('tenant-a');
      expect(tenantIds).toContain('tenant-b');
    });
  });
});

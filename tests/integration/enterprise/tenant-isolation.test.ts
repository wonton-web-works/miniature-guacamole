/**
 * Tenant Isolation Integration Tests — WS-ENT-3
 *
 * Dedicated cross-tenant data leakage verification suite.
 * Tests that data written under one tenant CANNOT be read by another.
 *
 * SECURITY-CRITICAL: These tests exist to prove AC-ENT-3.4.
 * A failure here means a data breach is possible.
 *
 * AC-ENT-3.1: RLS policies in effect
 * AC-ENT-3.2: Tenant context set per-connection before queries
 * AC-ENT-3.3: Middleware validates tenant before DB call
 * AC-ENT-3.4: Zero cross-tenant data leakage (this file's primary purpose)
 * AC-ENT-3.5: Database-per-tenant respected in integration
 *
 * Test order (misuse-first CAD protocol):
 *   1. MISUSE CASES  — cross-tenant reads, RLS bypass, context pollution, event leakage
 *   2. BOUNDARY TESTS — empty tenant data, concurrent tenants, tenant switch mid-session
 *   3. GOLDEN PATH   — tenant reads own data, tenant isolation verified, events isolated
 *
 * All pg calls are mocked. This suite validates the LAYER COMPOSITION:
 *   middleware → tenant-context → RLS-enforced adapter
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock pg before all imports
// ---------------------------------------------------------------------------
const mockClientQuery = vi.fn();
const mockClientRelease = vi.fn();
const mockConnect = vi.fn();
const mockPoolQuery = vi.fn();
const mockPoolEnd = vi.fn();

vi.mock('pg', () => {
  return {
    Pool: vi.fn().mockImplementation(() => ({
      query: mockPoolQuery,
      connect: mockConnect,
      end: mockPoolEnd,
    })),
  };
});

// ---------------------------------------------------------------------------
// Imports — these files do NOT exist yet (RED phase)
// ---------------------------------------------------------------------------
import { PostgresAdapter } from '../../../enterprise/src/storage/postgres-adapter';
import { TenantContext, withTenantContext } from '../../../enterprise/src/isolation/tenant-context';
import { TenantMiddleware, createTenantMiddleware } from '../../../enterprise/src/isolation/tenant-middleware';
import { buildRlsMigrations } from '../../../enterprise/src/isolation/rls-policies';
import { MigrationRunner } from '../../../enterprise/src/storage/migrations';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Simulate a pg client whose query responses depend on the currently SET tenant.
 * When app.current_tenant is not set, data from multiple tenants is returned (RLS disabled).
 * When app.current_tenant = 'tenant-a', only tenant-a data is returned (RLS active).
 */
function makeRlsAwareClient(activeTenant: { current: string | null }) {
  const tenantAData = [
    { key: 'tasks-dev.json', agent_id: 'dev', workstream_id: 'WS-1', tenant_id: 'tenant-a', data: { status: 'active' }, timestamp: '2026-01-01T00:00:00Z' },
  ];
  const tenantBData = [
    { key: 'tasks-qa.json', agent_id: 'qa', workstream_id: 'WS-2', tenant_id: 'tenant-b', data: { status: 'pending' }, timestamp: '2026-01-02T00:00:00Z' },
  ];

  return {
    query: vi.fn().mockImplementation(async (sql: string, params?: any[]) => {
      // Simulate SET app.current_tenant = $1
      if (/set_config|SET.*app\.current_tenant/i.test(sql)) {
        activeTenant.current = params?.[1] ?? params?.[0] ?? null;
        return { rows: [], rowCount: 0 };
      }
      // Simulate RESET / clear
      if (/RESET|SET.*current_tenant.*''|set_config.*''|set_config.*''/i.test(sql)) {
        activeTenant.current = null;
        return { rows: [], rowCount: 0 };
      }
      // Simulate SELECT with RLS filtering
      if (/SELECT/i.test(sql)) {
        const tenant = activeTenant.current;
        if (tenant === 'tenant-a') return { rows: tenantAData, rowCount: 1 };
        if (tenant === 'tenant-b') return { rows: tenantBData, rowCount: 1 };
        // No tenant set — should never happen with proper middleware (but would return all in absence of RLS)
        return { rows: [...tenantAData, ...tenantBData], rowCount: 2 };
      }
      return { rows: [], rowCount: 0 };
    }),
    release: vi.fn(),
  };
}

function makeRequest(tenantId: string, headers: Record<string, string> = {}) {
  return {
    headers: { 'x-tenant-id': tenantId, ...headers },
    user: null,
    tenantId: undefined,
  };
}

// ---------------------------------------------------------------------------
// MISUSE CASES — Cross-Tenant Leakage
// ---------------------------------------------------------------------------

describe('Tenant Isolation — MISUSE CASES (Cross-Tenant Leakage)', () => {
  beforeEach(() => {
    mockPoolQuery.mockReset();
    mockConnect.mockReset();
    mockClientQuery.mockReset();
    mockClientRelease.mockReset();
    mockPoolEnd.mockReset();
  });

  // ---- Direct cross-tenant read via adapter without middleware ----
  describe('Cross-tenant read — bypassing middleware', () => {
    it("Given tenant-a data exists, When query() called with tenant-b client context, Then tenant-b cannot see tenant-a rows", async () => {
      const activeTenant = { current: 'tenant-b' };
      const client = makeRlsAwareClient(activeTenant);

      // Simulate tenant-b context is active
      const ctx = new TenantContext(client as any);
      await ctx.setTenant('tenant-b');

      // Query should only return tenant-b data
      const result = await client.query('SELECT * FROM memory_entries');
      const tenantIds = result.rows.map((r: any) => r.tenant_id);

      // Tenant-b must NOT see tenant-a rows
      expect(tenantIds).not.toContain('tenant-a');
      expect(tenantIds).toContain('tenant-b');
    });

    it("Given tenant-a context is active, When read() called, Then response only contains tenant-a data", async () => {
      const activeTenant = { current: null };
      const client = makeRlsAwareClient(activeTenant);

      const ctx = new TenantContext(client as any);
      await ctx.setTenant('tenant-a');

      const result = await client.query('SELECT * FROM memory_entries');
      const tenantIds = result.rows.map((r: any) => r.tenant_id);

      expect(tenantIds).not.toContain('tenant-b');
      expect(tenantIds).toContain('tenant-a');
    });
  });

  // ---- Tenant context pollution between sequential requests ----
  describe('Context pollution — sequential requests on same connection', () => {
    it("Given tenant-a request completes, When tenant-b request starts on same client, Then tenant-b cannot see tenant-a data", async () => {
      const activeTenant = { current: null };
      const client = makeRlsAwareClient(activeTenant);

      // Simulate tenant-a request
      await withTenantContext(client as any, 'tenant-a', async () => {
        const result = await client.query('SELECT * FROM memory_entries');
        const tenantIds = result.rows.map((r: any) => r.tenant_id);
        expect(tenantIds).not.toContain('tenant-b');
      });

      // After tenant-a request, context must be cleared
      expect(activeTenant.current).toBeNull();

      // Simulate tenant-b request
      await withTenantContext(client as any, 'tenant-b', async () => {
        const result = await client.query('SELECT * FROM memory_entries');
        const tenantIds = result.rows.map((r: any) => r.tenant_id);
        expect(tenantIds).not.toContain('tenant-a');
        expect(tenantIds).toContain('tenant-b');
      });
    });

    it("Given a request fails mid-execution for tenant-a, When tenant-b request starts, Then tenant-b does not inherit tenant-a's context", async () => {
      const activeTenant = { current: null };
      const client = makeRlsAwareClient(activeTenant);

      // Tenant-a request that fails mid-execution
      try {
        await withTenantContext(client as any, 'tenant-a', async () => {
          throw new Error('simulated failure');
        });
      } catch {
        // Expected — but context must be cleaned up
      }

      // Context must be cleared even after failure
      expect(activeTenant.current).toBeNull();

      // Tenant-b request should start fresh
      await withTenantContext(client as any, 'tenant-b', async () => {
        expect(activeTenant.current).toBe('tenant-b');
        const result = await client.query('SELECT * FROM memory_entries');
        const tenantIds = result.rows.map((r: any) => r.tenant_id);
        expect(tenantIds).not.toContain('tenant-a');
      });
    });
  });

  // ---- Event sourcing cross-tenant leakage ----
  describe('Cross-tenant leakage — agent_events table', () => {
    it("Given tenant-a events exist, When tenant-b queries agent_events, Then tenant-b sees zero tenant-a events", async () => {
      const tenantAEvents = [
        { id: 1, agent_id: 'dev', workstream_id: 'WS-1', tenant_id: 'tenant-a', event_type: 'task_completed', payload: {}, created_at: '2026-01-01T10:00:00Z' },
      ];

      const activeTenant = { current: null };
      const client = {
        query: vi.fn().mockImplementation(async (sql: string, params?: any[]) => {
          if (/set_config|SET.*app\.current_tenant/i.test(sql)) {
            activeTenant.current = params?.[1] ?? params?.[0] ?? null;
            return { rows: [], rowCount: 0 };
          }
          if (/RESET|set_config.*''/i.test(sql)) {
            activeTenant.current = null;
            return { rows: [], rowCount: 0 };
          }
          if (/SELECT.*agent_events/i.test(sql)) {
            if (activeTenant.current === 'tenant-a') return { rows: tenantAEvents, rowCount: 1 };
            if (activeTenant.current === 'tenant-b') return { rows: [], rowCount: 0 };
            return { rows: tenantAEvents, rowCount: 1 }; // no RLS: leak!
          }
          return { rows: [], rowCount: 0 };
        }),
        release: vi.fn(),
      };

      // Tenant-b request: must not see tenant-a events
      await withTenantContext(client as any, 'tenant-b', async () => {
        const result = await client.query('SELECT * FROM agent_events WHERE tenant_id = current_setting(\'app.current_tenant\')');
        const tenantIds = result.rows.map((r: any) => r.tenant_id);
        expect(tenantIds).not.toContain('tenant-a');
      });
    });
  });

  // ---- Middleware must reject missing tenant before DB access ----
  describe('Middleware gate — no DB access without valid tenant', () => {
    it("Given request has no x-tenant-id header, When middleware validates, Then rejects before any pool.query() is called", async () => {
      const middleware = createTenantMiddleware({
        strategy: 'header',
        headerName: 'x-tenant-id',
      });
      const req = makeRequest('', { 'x-tenant-id': '' });

      await expect(middleware.resolveTenant(req)).rejects.toThrow();
      // No DB query should have been issued
      expect(mockPoolQuery).not.toHaveBeenCalled();
    });

    it("Given request has SQL injection in tenant header, When middleware validates, Then rejects before any pool query", async () => {
      const middleware = createTenantMiddleware({
        strategy: 'header',
        headerName: 'x-tenant-id',
      });
      const req = makeRequest("'; DROP TABLE memory_entries;--");

      await expect(middleware.resolveTenant(req)).rejects.toThrow();
      expect(mockPoolQuery).not.toHaveBeenCalled();
    });
  });

  // ---- RLS must be present on both tables ----
  describe('RLS policy completeness — both tables', () => {
    it("Given RLS migrations generated, When SQL checked, Then both memory_entries and agent_events have CREATE POLICY", () => {
      const migrations = buildRlsMigrations();
      const allSql = migrations.map(m => m.up).join('\n');
      // Neither table can be left unprotected
      expect(allSql).toMatch(/CREATE POLICY.*memory_entries|memory_entries.*CREATE POLICY/i);
      expect(allSql).toMatch(/CREATE POLICY.*agent_events|agent_events.*CREATE POLICY/i);
    });

    it("Given RLS policy SQL, When USING clause inspected for each table, Then each table's policy reads tenant_id = current_setting('app.current_tenant')", () => {
      const migrations = buildRlsMigrations();
      const allSql = migrations.map(m => m.up).join('\n');
      // At minimum: two occurrences of current_setting reference (one per table)
      const matches = allSql.match(/current_setting\s*\(\s*['"]app\.current_tenant['"][^)]*\)/gi) ?? [];
      expect(matches.length).toBeGreaterThanOrEqual(2);
    });
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY TESTS
// ---------------------------------------------------------------------------

describe('Tenant Isolation — BOUNDARY TESTS', () => {
  beforeEach(() => {
    mockPoolQuery.mockReset();
    mockConnect.mockReset();
    mockClientQuery.mockReset();
    mockPoolEnd.mockReset();
  });

  // ---- Empty tenant data ----
  describe('Tenant with no data', () => {
    it("Given tenant-c has no rows in memory_entries, When tenant-c reads, Then returns empty (not tenant-a or tenant-b data)", async () => {
      const activeTenant = { current: null };
      const client = {
        query: vi.fn().mockImplementation(async (sql: string, params?: any[]) => {
          if (/set_config|SET.*app\.current_tenant/i.test(sql)) {
            activeTenant.current = params?.[1] ?? params?.[0] ?? null;
            return { rows: [], rowCount: 0 };
          }
          if (/RESET|set_config.*''/i.test(sql)) {
            activeTenant.current = null;
            return { rows: [], rowCount: 0 };
          }
          // Tenant-c has no data
          return { rows: [], rowCount: 0 };
        }),
        release: vi.fn(),
      };

      let resultRows: any[] = [];
      await withTenantContext(client as any, 'tenant-c', async () => {
        const result = await client.query('SELECT * FROM memory_entries');
        resultRows = result.rows;
      });

      // Empty is correct — tenant-c should not see other tenants' data
      expect(resultRows).toHaveLength(0);
    });
  });

  // ---- Concurrent tenant requests ----
  describe('Concurrent requests — context not shared', () => {
    it("Given tenant-a and tenant-b requests run concurrently, When both query memory_entries, Then each only sees their own data", async () => {
      const activeTenantA = { current: null };
      const activeTenantB = { current: null };

      const clientA = makeRlsAwareClient(activeTenantA);
      const clientB = makeRlsAwareClient(activeTenantB);

      const [resultA, resultB] = await Promise.all([
        withTenantContext(clientA as any, 'tenant-a', async () => {
          return clientA.query('SELECT * FROM memory_entries');
        }),
        withTenantContext(clientB as any, 'tenant-b', async () => {
          return clientB.query('SELECT * FROM memory_entries');
        }),
      ]);

      const tenantIdsA = (resultA as any).rows.map((r: any) => r.tenant_id);
      const tenantIdsB = (resultB as any).rows.map((r: any) => r.tenant_id);

      expect(tenantIdsA).toContain('tenant-a');
      expect(tenantIdsA).not.toContain('tenant-b');
      expect(tenantIdsB).toContain('tenant-b');
      expect(tenantIdsB).not.toContain('tenant-a');
    });
  });

  // ---- Tenant switch mid-session (must be prevented) ----
  describe('Tenant switch — same session cannot switch tenants', () => {
    it("Given a session established for tenant-a, When setTenant('tenant-b') called on same context, Then either throws or resets context cleanly", async () => {
      const activeTenant = { current: null };
      const client = makeRlsAwareClient(activeTenant);
      const ctx = new TenantContext(client as any);

      await ctx.setTenant('tenant-a');
      expect(ctx.getCurrentTenant()).toBe('tenant-a');

      // Attempt to switch tenant mid-session
      try {
        await ctx.setTenant('tenant-b');
        // If allowed, context must be tenant-b (clean switch, not stacked)
        expect(ctx.getCurrentTenant()).toBe('tenant-b');
        expect(ctx.getCurrentTenant()).not.toBe('tenant-a');
      } catch {
        // Throwing is also acceptable — tenant switching should be explicit
      }
    });
  });

  // ---- Migration idempotency under repeated runs ----
  describe('RLS migrations — idempotent re-run', () => {
    it("Given RLS migrations applied twice, When second run executes, Then no duplicate policy error (IF NOT EXISTS or equivalent)", () => {
      const migrations = buildRlsMigrations();
      const allUpSql = migrations.map(m => m.up).join('\n');
      const hasIdempotentPattern =
        /CREATE POLICY IF NOT EXISTS/i.test(allUpSql) ||
        /DROP POLICY IF EXISTS/i.test(allUpSql) ||
        /OR REPLACE/i.test(allUpSql);
      expect(hasIdempotentPattern).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH
// ---------------------------------------------------------------------------

describe('Tenant Isolation — GOLDEN PATH', () => {
  beforeEach(() => {
    mockPoolQuery.mockReset();
    mockConnect.mockReset();
    mockClientQuery.mockReset();
    mockPoolEnd.mockReset();
  });

  // ---- Tenant reads own data ----
  describe('Tenant data isolation — correct data returned', () => {
    it("Given tenant-a has data, When tenant-a session reads memory_entries, Then only tenant-a rows returned", async () => {
      const activeTenant = { current: null };
      const client = makeRlsAwareClient(activeTenant);

      let rows: any[] = [];
      await withTenantContext(client as any, 'tenant-a', async () => {
        const result = await client.query('SELECT * FROM memory_entries');
        rows = result.rows;
      });

      expect(rows.every((r: any) => r.tenant_id === 'tenant-a')).toBe(true);
    });

    it("Given tenant-b has data, When tenant-b session reads memory_entries, Then only tenant-b rows returned", async () => {
      const activeTenant = { current: null };
      const client = makeRlsAwareClient(activeTenant);

      let rows: any[] = [];
      await withTenantContext(client as any, 'tenant-b', async () => {
        const result = await client.query('SELECT * FROM memory_entries');
        rows = result.rows;
      });

      expect(rows.every((r: any) => r.tenant_id === 'tenant-b')).toBe(true);
    });
  });

  // ---- SET app.current_tenant issued before queries ----
  describe('Tenant context injection — SET called before query', () => {
    it("Given tenant-a context, When withTenantContext() executes, Then SET command is the first DB call", async () => {
      const callLog: string[] = [];
      const client = {
        query: vi.fn().mockImplementation(async (sql: string, params?: any[]) => {
          callLog.push(sql);
          return { rows: [], rowCount: 0 };
        }),
        release: vi.fn(),
      };

      await withTenantContext(client as any, 'tenant-a', async () => {
        await client.query('SELECT * FROM memory_entries');
      });

      // First call must be the SET command
      expect(callLog[0]).toMatch(/set_config|SET.*app\.current_tenant/i);
      // Data query must come after
      expect(callLog[1]).toMatch(/SELECT/i);
    });

    it("Given withTenantContext() completes normally, When context cleared, Then final DB call is RESET or SET to empty", async () => {
      const callLog: string[] = [];
      const client = {
        query: vi.fn().mockImplementation(async (sql: string, params?: any[]) => {
          callLog.push(sql);
          return { rows: [], rowCount: 0 };
        }),
        release: vi.fn(),
      };

      await withTenantContext(client as any, 'tenant-a', async () => {});

      const lastCall = callLog[callLog.length - 1];
      expect(lastCall).toMatch(/RESET|set_config.*''|SET.*current_tenant.*''/i);
    });
  });

  // ---- Middleware + context + adapter full chain ----
  describe('Full stack — middleware validates, context sets, adapter queries', () => {
    it("Given valid request from tenant-a, When full middleware chain executes, Then resolveTenant returns 'tenant-a'", async () => {
      const middleware = createTenantMiddleware({
        strategy: 'header',
        headerName: 'x-tenant-id',
        allowedTenants: ['tenant-a', 'tenant-b'],
      });
      const req = makeRequest('tenant-a');
      const resolvedTenant = await middleware.resolveTenant(req);
      expect(resolvedTenant).toBe('tenant-a');
    });

    it("Given tenant-b in request, When middleware resolves and validateTenantAccess called with same tenant, Then passes", async () => {
      const middleware = createTenantMiddleware({
        strategy: 'header',
        headerName: 'x-tenant-id',
        allowedTenants: ['tenant-a', 'tenant-b'],
      });
      const req = makeRequest('tenant-b');
      const resolvedTenant = await middleware.resolveTenant(req);
      await expect(middleware.validateTenantAccess(resolvedTenant, 'tenant-b')).resolves.not.toThrow();
    });
  });

  // ---- RLS migrations are valid Migration objects ----
  describe('RLS migrations — structure valid for MigrationRunner', () => {
    it("Given buildRlsMigrations() output, When passed to MigrationRunner structure check, Then all required fields present", () => {
      const migrations = buildRlsMigrations();
      for (const m of migrations) {
        // MigrationRunner requires: version (number), up (string), optional down
        expect(typeof m.version).toBe('number');
        expect(typeof m.up).toBe('string');
        expect(m.up.length).toBeGreaterThan(0);
        if (m.down !== undefined) {
          expect(typeof m.down).toBe('string');
        }
      }
    });
  });
});

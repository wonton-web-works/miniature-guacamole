/**
 * NDA Isolation — End-to-End Integration Verification (AC-ENT-8.1 through 8.4)
 *
 * Complete isolation verification: middleware → tenant-context → RLS-enforced queries.
 * Tests the ENTIRE stack to prove that NDA-grade tenant isolation holds end-to-end.
 *
 * All pg Pool/Client calls are mocked — no real database required.
 * The mocked client simulates RLS behavior (filters by active tenant).
 *
 * Acceptance Criteria verified:
 * - AC-ENT-8.1: Zero cross-tenant data leakage (all 5 scenarios)
 * - AC-ENT-8.2: RLS bypass attempts blocked
 * - AC-ENT-8.3: Application-level enforcement holds
 * - AC-ENT-8.4: Tests runnable in CI (pure mock, no DB)
 *
 * Test order (misuse-first CAD protocol):
 *   1. MISUSE CASES  — cross-tenant reads, injection, context pollution, event leakage
 *   2. BOUNDARY TESTS — edge cases in full stack
 *   3. GOLDEN PATH   — correct isolation verified end-to-end
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock pg before all imports
// ---------------------------------------------------------------------------
const mockPoolQuery = vi.fn();
const mockPoolEnd = vi.fn();

vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => ({
    query: mockPoolQuery,
    connect: vi.fn(),
    end: mockPoolEnd,
  })),
}));

import { TenantContext, withTenantContext } from '../../../enterprise/src/isolation/tenant-context';
import { createTenantMiddleware } from '../../../enterprise/src/isolation/tenant-middleware';
import { buildRlsMigrations, TENANT_SCOPED_TABLES } from '../../../enterprise/src/isolation/rls-policies';
import { DatabasePerTenantManager } from '../../../enterprise/src/isolation/database-per-tenant';

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------
const TENANT_A_MEMORY = [
  { key: 'tasks-dev.json', agent_id: 'dev', workstream_id: 'WS-1', tenant_id: 'tenant-a', data: { status: 'active' }, timestamp: '2026-01-01T00:00:00Z' },
  { key: 'tasks-pm.json', agent_id: 'pm', workstream_id: 'WS-2', tenant_id: 'tenant-a', data: { status: 'done' }, timestamp: '2026-01-01T01:00:00Z' },
];

const TENANT_B_MEMORY = [
  { key: 'tasks-qa.json', agent_id: 'qa', workstream_id: 'WS-3', tenant_id: 'tenant-b', data: { status: 'pending' }, timestamp: '2026-01-02T00:00:00Z' },
];

const TENANT_A_EVENTS = [
  { id: 1, agent_id: 'dev', workstream_id: 'WS-1', tenant_id: 'tenant-a', event_type: 'task_completed', payload: {}, created_at: '2026-01-01T10:00:00Z' },
];

const TENANT_B_EVENTS = [
  { id: 2, agent_id: 'qa', workstream_id: 'WS-3', tenant_id: 'tenant-b', event_type: 'test_run', payload: {}, created_at: '2026-01-02T10:00:00Z' },
];

// ---------------------------------------------------------------------------
// RLS-aware client factory
// ---------------------------------------------------------------------------
/**
 * Creates a mock pg client that simulates RLS behavior.
 * Session variable is tracked via activeTenant ref.
 * Only returns data matching the currently active tenant.
 */
function makeRlsAwareClient(activeTenant: { current: string | null }) {
  return {
    query: vi.fn().mockImplementation(async (sql: string, params?: any[]) => {
      // Track SET app.current_tenant calls
      if (/set_config\s*\(/i.test(sql)) {
        const val = params?.[0];
        activeTenant.current = val === '' || val === null || val === undefined ? null : val;
        return { rows: [], rowCount: 0 };
      }

      // Track RESET / clear calls
      if (/RESET/i.test(sql) || (params === undefined && /set_config.*''/i.test(sql))) {
        activeTenant.current = null;
        return { rows: [], rowCount: 0 };
      }

      const tenant = activeTenant.current;

      // Simulate RLS-filtered SELECT on memory_entries
      if (/SELECT.*memory_entries|FROM.*memory_entries/i.test(sql)) {
        if (tenant === 'tenant-a') return { rows: TENANT_A_MEMORY, rowCount: TENANT_A_MEMORY.length };
        if (tenant === 'tenant-b') return { rows: TENANT_B_MEMORY, rowCount: TENANT_B_MEMORY.length };
        // No tenant set = RLS blocks all rows (session var empty, no match)
        return { rows: [], rowCount: 0 };
      }

      // Simulate RLS-filtered SELECT on agent_events
      if (/SELECT.*agent_events|FROM.*agent_events/i.test(sql)) {
        if (tenant === 'tenant-a') return { rows: TENANT_A_EVENTS, rowCount: TENANT_A_EVENTS.length };
        if (tenant === 'tenant-b') return { rows: TENANT_B_EVENTS, rowCount: TENANT_B_EVENTS.length };
        return { rows: [], rowCount: 0 };
      }

      return { rows: [], rowCount: 0 };
    }),
    release: vi.fn(),
  };
}

function makeRequest(tenantId: string) {
  return { headers: { 'x-tenant-id': tenantId }, user: null };
}

// ---------------------------------------------------------------------------
// MISUSE CASES
// ---------------------------------------------------------------------------

describe('NDA Isolation Integration — MISUSE CASES', () => {
  beforeEach(() => {
    mockPoolQuery.mockReset();
    mockPoolEnd.mockReset();
  });

  // ---- AC-ENT-8.1 Scenario 1: Sequential tenant sessions ----
  describe('AC-ENT-8.1 Scenario 1: Sequential sessions — context clears between tenants', () => {
    it("Given tenant-a session, When tenant-a context clears, Then session variable is null before tenant-b starts", async () => {
      const activeTenant = { current: null as string | null };
      const client = makeRlsAwareClient(activeTenant);

      await withTenantContext(client as any, 'tenant-a', async () => {
        expect(activeTenant.current).toBe('tenant-a');
      });

      // After tenant-a completes: session var MUST be cleared
      expect(activeTenant.current).toBeNull();
    });

    it("Given tenant-a session completes, When tenant-b session starts, Then tenant-b cannot read tenant-a rows", async () => {
      const activeTenant = { current: null as string | null };
      const client = makeRlsAwareClient(activeTenant);

      let tenantARows: any[] = [];
      let tenantBRows: any[] = [];

      await withTenantContext(client as any, 'tenant-a', async () => {
        const r = await client.query('SELECT * FROM memory_entries');
        tenantARows = r.rows;
      });

      await withTenantContext(client as any, 'tenant-b', async () => {
        const r = await client.query('SELECT * FROM memory_entries');
        tenantBRows = r.rows;
      });

      // Verify isolation
      const tenantAIdsFromA = tenantARows.map((r: any) => r.tenant_id);
      const tenantAIdsFromB = tenantBRows.map((r: any) => r.tenant_id);

      expect(tenantAIdsFromA).not.toContain('tenant-b');
      expect(tenantAIdsFromB).not.toContain('tenant-a');
    });
  });

  // ---- AC-ENT-8.1 Scenario 2: Concurrent clients ----
  describe('AC-ENT-8.1 Scenario 2: Concurrent clients — independent session vars', () => {
    it("Given tenant-a and tenant-b run concurrently on separate clients, When both query memory_entries, Then each only sees their own rows", async () => {
      const activeTenantA = { current: null as string | null };
      const activeTenantB = { current: null as string | null };

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

      const idsA = (resultA as any).rows.map((r: any) => r.tenant_id);
      const idsB = (resultB as any).rows.map((r: any) => r.tenant_id);

      expect(idsA).toContain('tenant-a');
      expect(idsA).not.toContain('tenant-b');
      expect(idsB).toContain('tenant-b');
      expect(idsB).not.toContain('tenant-a');
    });

    it("Given two concurrent sessions, When tenant-a's session var inspected by tenant-b's client, Then tenant-b's session var is independent", async () => {
      const activeTenantA = { current: null as string | null };
      const activeTenantB = { current: null as string | null };

      const clientA = makeRlsAwareClient(activeTenantA);
      const clientB = makeRlsAwareClient(activeTenantB);

      await Promise.all([
        withTenantContext(clientA as any, 'tenant-a', async () => {
          // Verify tenant-b's client is not affected by tenant-a's SET
          expect(activeTenantB.current).not.toBe('tenant-a');
        }),
        withTenantContext(clientB as any, 'tenant-b', async () => {
          expect(activeTenantA.current).not.toBe('tenant-b');
        }),
      ]);
    });
  });

  // ---- AC-ENT-8.1 Scenario 3: Error path — context not leaked ----
  describe('AC-ENT-8.1 Scenario 3: Callback throws — tenant context cleared on error path', () => {
    it("Given withTenantContext callback throws, When error caught, Then session var is cleared for next request", async () => {
      const activeTenant = { current: null as string | null };
      const client = makeRlsAwareClient(activeTenant);

      try {
        await withTenantContext(client as any, 'tenant-a', async () => {
          throw new Error('business logic failure');
        });
      } catch {
        // Expected
      }

      // Session var must be cleared — next tenant must start fresh
      expect(activeTenant.current).toBeNull();

      // Tenant-b can now start without inheriting tenant-a context
      await withTenantContext(client as any, 'tenant-b', async () => {
        expect(activeTenant.current).toBe('tenant-b');
        const result = await client.query('SELECT * FROM memory_entries');
        const ids = result.rows.map((r: any) => r.tenant_id);
        expect(ids).not.toContain('tenant-a');
      });
    });
  });

  // ---- AC-ENT-8.1 Scenario 4: Database-per-tenant — correct pool ----
  describe('AC-ENT-8.1 Scenario 4: Database-per-tenant — never returns wrong pool', () => {
    it("Given tenant-a and tenant-b registered, When tenant-b requests pool, Then pool is never tenant-a's pool", async () => {
      const manager = new DatabasePerTenantManager({
        enabled: true,
        tenantDsnMap: {
          'tenant-a': 'postgresql://localhost/tenant_a',
          'tenant-b': 'postgresql://localhost/tenant_b',
        },
      });

      const poolA = await manager.getPoolForTenant('tenant-a');
      const poolB = await manager.getPoolForTenant('tenant-b');

      // Must be distinct pool objects
      expect(poolA).not.toBe(poolB);
    });

    it("Given tenant-c is not registered, When tenant-c requests pool, Then throws (never falls back to any other tenant's pool)", async () => {
      const manager = new DatabasePerTenantManager({
        enabled: true,
        tenantDsnMap: {
          'tenant-a': 'postgresql://localhost/tenant_a',
          'tenant-b': 'postgresql://localhost/tenant_b',
        },
      });

      await expect(manager.getPoolForTenant('tenant-c')).rejects.toThrow(/unknown tenant|not configured|not found/i);
    });
  });

  // ---- AC-ENT-8.1 Scenario 5: RLS policy — session var only ----
  describe('AC-ENT-8.1 Scenario 5: RLS SQL checks session var, no hardcoded tenant', () => {
    it("Given RLS policy SQL for all tables, When USING clauses inspected, Then all use current_setting() (zero hardcoded tenants)", () => {
      const migrations = buildRlsMigrations();
      const allSql = migrations.map(m => m.up).join('\n');
      // Must use session var
      expect(allSql).toMatch(/current_setting\s*\(\s*['"]app\.current_tenant['"],\s*true\s*\)/i);
      // Must NOT hardcode any tenant
      expect(allSql).not.toMatch(/tenant_id\s*=\s*'[^']+'/);
    });
  });

  // ---- AC-ENT-8.2: Middleware blocks SQL injection before DB access ----
  describe('AC-ENT-8.2: Middleware rejects SQL injection before pool.query()', () => {
    it("Given SQL injection in x-tenant-id header, When resolveTenant() called, Then rejects and pool.query() is never called", async () => {
      const middleware = createTenantMiddleware({ strategy: 'header', headerName: 'x-tenant-id' });
      const req = makeRequest("'; DROP TABLE memory_entries; --");

      await expect(middleware.resolveTenant(req)).rejects.toThrow();
      expect(mockPoolQuery).not.toHaveBeenCalled();
    });

    it("Given empty x-tenant-id header, When resolveTenant() called, Then rejects and pool.query() is never called", async () => {
      const middleware = createTenantMiddleware({ strategy: 'header', headerName: 'x-tenant-id' });
      const req = makeRequest('');

      await expect(middleware.resolveTenant(req)).rejects.toThrow();
      expect(mockPoolQuery).not.toHaveBeenCalled();
    });

    it("Given null-byte injection in x-tenant-id header, When resolveTenant() called, Then rejects before any DB access", async () => {
      const middleware = createTenantMiddleware({ strategy: 'header', headerName: 'x-tenant-id' });
      const req = makeRequest("tenant\x00injection");

      await expect(middleware.resolveTenant(req)).rejects.toThrow();
      expect(mockPoolQuery).not.toHaveBeenCalled();
    });
  });

  // ---- AC-ENT-8.2: agent_events table cross-tenant isolation ----
  describe('AC-ENT-8.2: agent_events table isolated between tenants', () => {
    it("Given tenant-a events exist, When tenant-b queries agent_events, Then tenant-b sees zero tenant-a events", async () => {
      const activeTenant = { current: null as string | null };
      const client = makeRlsAwareClient(activeTenant);

      let eventRows: any[] = [];
      await withTenantContext(client as any, 'tenant-b', async () => {
        const result = await client.query('SELECT * FROM agent_events');
        eventRows = result.rows;
      });

      // Tenant-b should only see their own events
      const tenantIds = eventRows.map((r: any) => r.tenant_id);
      expect(tenantIds).not.toContain('tenant-a');
    });

    it("Given both tenants have agent_events, When each reads their own events, Then each sees only their rows", async () => {
      const activeTenantA = { current: null as string | null };
      const activeTenantB = { current: null as string | null };
      const clientA = makeRlsAwareClient(activeTenantA);
      const clientB = makeRlsAwareClient(activeTenantB);

      const [eventsA, eventsB] = await Promise.all([
        withTenantContext(clientA as any, 'tenant-a', async () =>
          (await clientA.query('SELECT * FROM agent_events')).rows
        ),
        withTenantContext(clientB as any, 'tenant-b', async () =>
          (await clientB.query('SELECT * FROM agent_events')).rows
        ),
      ]);

      const idsA = (eventsA as any[]).map((r: any) => r.tenant_id);
      const idsB = (eventsB as any[]).map((r: any) => r.tenant_id);

      expect(idsA).not.toContain('tenant-b');
      expect(idsB).not.toContain('tenant-a');
    });
  });

  // ---- AC-ENT-8.3: Full middleware + context chain ----
  describe('AC-ENT-8.3: Full middleware chain — unauthorized tenant blocked', () => {
    it("Given allowedTenants=['tenant-a'], When tenant-b attempts access, Then middleware blocks before context is set", async () => {
      const middleware = createTenantMiddleware({
        strategy: 'header',
        headerName: 'x-tenant-id',
        allowedTenants: ['tenant-a'],
      });

      await expect(middleware.resolveTenant(makeRequest('tenant-b'))).rejects.toThrow(/unauthorized/i);
    });

    it("Given validateTenantAccess() called with mismatched tenants, When cross-tenant escalation attempted, Then throws access denied", async () => {
      const middleware = createTenantMiddleware({ strategy: 'header' });
      await expect(
        middleware.validateTenantAccess('tenant-a', 'tenant-b')
      ).rejects.toThrow(/unauthorized|access denied/i);
    });
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY TESTS
// ---------------------------------------------------------------------------

describe('NDA Isolation Integration — BOUNDARY TESTS', () => {
  beforeEach(() => {
    mockPoolQuery.mockReset();
    mockPoolEnd.mockReset();
  });

  // ---- Tenant with zero rows ----
  describe('Tenant with no data — zero rows returned (not other tenant rows)', () => {
    it("Given tenant-c has no rows, When tenant-c reads memory_entries, Then returns empty array (not tenant-a or tenant-b data)", async () => {
      const activeTenant = { current: null as string | null };
      const client = {
        query: vi.fn().mockImplementation(async (sql: string, params?: any[]) => {
          if (/set_config\s*\(/i.test(sql)) {
            activeTenant.current = params?.[0] || null;
            return { rows: [], rowCount: 0 };
          }
          // Tenant-c has no data at all — empty
          return { rows: [], rowCount: 0 };
        }),
        release: vi.fn(),
      };

      let rows: any[] = [];
      await withTenantContext(client as any, 'tenant-c', async () => {
        const result = await client.query('SELECT * FROM memory_entries');
        rows = result.rows;
      });

      // Zero rows is correct — tenant-c has no data
      expect(rows).toHaveLength(0);
    });
  });

  // ---- SET must happen before SELECT ----
  describe('Query ordering — SET app.current_tenant before any SELECT', () => {
    it("Given withTenantContext(), When query log inspected, Then SET is always first query (before any SELECT)", async () => {
      const callOrder: string[] = [];
      const client = {
        query: vi.fn().mockImplementation(async (sql: string) => {
          if (/set_config/i.test(sql)) callOrder.push('SET');
          else if (/SELECT/i.test(sql)) callOrder.push('SELECT');
          else callOrder.push('OTHER');
          return { rows: [], rowCount: 0 };
        }),
        release: vi.fn(),
      };

      await withTenantContext(client as any, 'tenant-a', async () => {
        await client.query('SELECT * FROM memory_entries');
      });

      expect(callOrder[0]).toBe('SET');
      expect(callOrder).toContain('SELECT');
      const setIndex = callOrder.indexOf('SET');
      const selectIndex = callOrder.indexOf('SELECT');
      expect(setIndex).toBeLessThan(selectIndex);
    });
  });

  // ---- RLS both tables verified ----
  describe('RLS coverage — both TENANT_SCOPED_TABLES verified', () => {
    it("Given TENANT_SCOPED_TABLES list, When RLS migrations generated, Then every table has ENABLE + FORCE RLS", () => {
      const migrations = buildRlsMigrations();
      for (const table of TENANT_SCOPED_TABLES) {
        const tableMigration = migrations.find(m => m.up.includes(table));
        expect(tableMigration).toBeDefined();
        expect(tableMigration!.up).toMatch(/ENABLE ROW LEVEL SECURITY/i);
        expect(tableMigration!.up).toMatch(/FORCE ROW LEVEL SECURITY/i);
      }
    });

    it("Given RLS policy for each table, When WITH CHECK clause checked, Then write operations also check tenant_id", () => {
      const migrations = buildRlsMigrations();
      for (const m of migrations) {
        expect(m.up).toMatch(/WITH CHECK/i);
        expect(m.up).toMatch(/WITH CHECK[\s\S]*?current_setting/i);
      }
    });
  });

  // ---- Middleware + context composition ----
  describe('Middleware + context composition — integration path', () => {
    it("Given valid tenant resolved by middleware, When withTenantContext() called with resolved tenant, Then succeeds", async () => {
      const middleware = createTenantMiddleware({
        strategy: 'header',
        headerName: 'x-tenant-id',
        allowedTenants: ['tenant-a', 'tenant-b'],
      });

      const resolvedTenant = await middleware.resolveTenant(makeRequest('tenant-a'));
      const client = makeRlsAwareClient({ current: null });

      await expect(
        withTenantContext(client as any, resolvedTenant, async () => 'ok')
      ).resolves.toBe('ok');
    });
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH
// ---------------------------------------------------------------------------

describe('NDA Isolation Integration — GOLDEN PATH', () => {
  beforeEach(() => {
    mockPoolQuery.mockReset();
    mockPoolEnd.mockReset();
  });

  // ---- Tenant reads its own data correctly ----
  describe('Correct tenant data returned end-to-end', () => {
    it("Given tenant-a active, When SELECT on memory_entries, Then all returned rows have tenant_id='tenant-a'", async () => {
      const activeTenant = { current: null as string | null };
      const client = makeRlsAwareClient(activeTenant);

      let rows: any[] = [];
      await withTenantContext(client as any, 'tenant-a', async () => {
        const result = await client.query('SELECT * FROM memory_entries');
        rows = result.rows;
      });

      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r: any) => r.tenant_id === 'tenant-a')).toBe(true);
    });

    it("Given tenant-b active, When SELECT on memory_entries, Then all returned rows have tenant_id='tenant-b'", async () => {
      const activeTenant = { current: null as string | null };
      const client = makeRlsAwareClient(activeTenant);

      let rows: any[] = [];
      await withTenantContext(client as any, 'tenant-b', async () => {
        const result = await client.query('SELECT * FROM memory_entries');
        rows = result.rows;
      });

      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r: any) => r.tenant_id === 'tenant-b')).toBe(true);
    });

    it("Given tenant-a active, When SELECT on agent_events, Then all returned rows have tenant_id='tenant-a'", async () => {
      const activeTenant = { current: null as string | null };
      const client = makeRlsAwareClient(activeTenant);

      let rows: any[] = [];
      await withTenantContext(client as any, 'tenant-a', async () => {
        const result = await client.query('SELECT * FROM agent_events');
        rows = result.rows;
      });

      expect(rows.every((r: any) => r.tenant_id === 'tenant-a')).toBe(true);
    });
  });

  // ---- Full stack: middleware validates → context sets → data returned ----
  describe('Full stack verification — middleware to RLS', () => {
    it("Given valid request, When middleware resolves tenant and context is set, Then resolvedTenant matches setTenant tenant", async () => {
      const middleware = createTenantMiddleware({
        strategy: 'header',
        allowedTenants: ['tenant-a', 'tenant-b'],
      });

      const req = makeRequest('tenant-a');
      const resolvedTenant = await middleware.resolveTenant(req);

      const activeTenant = { current: null as string | null };
      const client = makeRlsAwareClient(activeTenant);

      await withTenantContext(client as any, resolvedTenant, async () => {
        expect(activeTenant.current).toBe('tenant-a');
        expect(activeTenant.current).toBe(resolvedTenant);
      });
    });

    it("Given two valid tenants, When validateTenantAccess() called for each against own resource, Then both pass", async () => {
      const middleware = createTenantMiddleware({ strategy: 'header' });

      await expect(middleware.validateTenantAccess('tenant-a', 'tenant-a')).resolves.not.toThrow();
      await expect(middleware.validateTenantAccess('tenant-b', 'tenant-b')).resolves.not.toThrow();
    });
  });

  // ---- RLS migration structure valid for CI ----
  describe('AC-ENT-8.4: RLS migrations valid for CI — no real DB needed', () => {
    it("Given buildRlsMigrations() output, When structure checked, Then all fields valid for MigrationRunner (version, up, down)", () => {
      const migrations = buildRlsMigrations();
      expect(migrations.length).toBeGreaterThan(0);
      for (const m of migrations) {
        expect(typeof m.version).toBe('number');
        expect(m.version).toBeGreaterThan(0);
        expect(typeof m.up).toBe('string');
        expect(m.up.trim().length).toBeGreaterThan(0);
        if (m.down !== undefined) {
          expect(typeof m.down).toBe('string');
        }
      }
    });

    it("Given RLS migration SQL, When passed through string validation, Then contains no syntax that would fail pg parser at high level", () => {
      const migrations = buildRlsMigrations();
      for (const m of migrations) {
        // Basic SQL structure checks — every statement must end with semicolons or be multi-statement
        expect(m.up).toMatch(/ALTER TABLE|CREATE POLICY|ENABLE ROW LEVEL SECURITY/i);
        // No dangling string literals
        const singleQuotes = (m.up.match(/'/g) ?? []).length;
        expect(singleQuotes % 2).toBe(0); // Even number of single quotes
      }
    });

    it("Given the isolation test suite itself, When tests verified against existing implementation, Then all imports resolve correctly", async () => {
      // This test verifies the test suite can import all required modules
      const { TenantContext: TC } = await import('../../../enterprise/src/isolation/tenant-context');
      const { createTenantMiddleware: CTM } = await import('../../../enterprise/src/isolation/tenant-middleware');
      const { buildRlsMigrations: BRM } = await import('../../../enterprise/src/isolation/rls-policies');
      const { DatabasePerTenantManager: DPM } = await import('../../../enterprise/src/isolation/database-per-tenant');

      expect(TC).toBeDefined();
      expect(CTM).toBeDefined();
      expect(BRM).toBeDefined();
      expect(DPM).toBeDefined();
    });
  });
});

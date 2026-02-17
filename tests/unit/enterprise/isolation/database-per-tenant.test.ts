/**
 * DatabasePerTenant Unit Tests — WS-ENT-3
 *
 * Tests for the database-per-tenant pool manager.
 * Does NOT require a running Postgres instance — pg Pool is mocked.
 *
 * AC-ENT-3.5: Database-per-tenant option available via config flag
 *
 * Test order (misuse-first CAD protocol):
 *   1. MISUSE CASES  — SQL injection in tenant DSN, pool isolation bypass, concurrent cross-tenant pools
 *   2. BOUNDARY TESTS — max pool count, unknown tenant, DSN format edge cases, close behavior
 *   3. GOLDEN PATH   — tenant pool creation, isolation, config flag, query routing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the 'pg' module before any import
// vi.hoisted() ensures these are available when vi.mock factory runs
// ---------------------------------------------------------------------------
const { mockQuery, mockPoolEnd, MockPool } = vi.hoisted(() => {
  const mockQuery = vi.fn();
  const mockPoolEnd = vi.fn();
  const MockPool = vi.fn().mockImplementation(() => ({
    query: mockQuery,
    end: mockPoolEnd,
  }));
  return { mockQuery, mockPoolEnd, MockPool };
});

vi.mock('pg', () => {
  return {
    Pool: MockPool,
  };
});

// Import from paths that do NOT exist yet — tests will be RED
import {
  DatabasePerTenantManager,
  DatabasePerTenantConfig,
  TenantPoolEntry,
} from '../../../../enterprise/src/isolation/database-per-tenant';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeConfig(overrides: Partial<DatabasePerTenantConfig> = {}): DatabasePerTenantConfig {
  return {
    enabled: true,
    tenantDsnMap: {
      'tenant-a': 'postgresql://localhost/tenant_a',
      'tenant-b': 'postgresql://localhost/tenant_b',
    },
    maxPoolsPerInstance: 10,
    maxConnectionsPerPool: 5,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// MISUSE CASES
// ---------------------------------------------------------------------------

describe('DatabasePerTenantManager — MISUSE CASES', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockPoolEnd.mockReset();
    MockPool.mockClear();
  });

  // ---- SQL injection via tenant ID when looking up pool ----
  describe('getPoolForTenant() — SQL injection in tenant ID', () => {
    it("Given tenant ID contains SQL injection, When getPoolForTenant() called, Then throws UnknownTenantError not SQL error", async () => {
      const manager = new DatabasePerTenantManager(makeConfig());
      await expect(manager.getPoolForTenant("'; DROP TABLE memory_entries;--")).rejects.toThrow(/unknown tenant|not configured|not found/i);
    });

    it("Given tenant ID contains semicolons, When getPoolForTenant() called, Then throws not executes SQL", async () => {
      const manager = new DatabasePerTenantManager(makeConfig());
      await expect(manager.getPoolForTenant('tenant; DELETE FROM pg_catalog.pg_authid')).rejects.toThrow();
    });

    it("Given tenant ID with null bytes, When getPoolForTenant() called, Then throws", async () => {
      const manager = new DatabasePerTenantManager(makeConfig());
      await expect(manager.getPoolForTenant("tenant\x00injection")).rejects.toThrow();
    });
  });

  // ---- Unknown tenant ----
  describe('getPoolForTenant() — unknown tenant', () => {
    it("Given tenant not in tenantDsnMap, When getPoolForTenant() called, Then throws UnknownTenantError", async () => {
      const manager = new DatabasePerTenantManager(makeConfig());
      await expect(manager.getPoolForTenant('unknown-tenant')).rejects.toThrow(/unknown tenant|not configured|not found/i);
    });

    it("Given empty tenantDsnMap, When getPoolForTenant() called with any tenant, Then throws", async () => {
      const manager = new DatabasePerTenantManager(makeConfig({ tenantDsnMap: {} }));
      await expect(manager.getPoolForTenant('tenant-a')).rejects.toThrow();
    });

    it("Given null tenant ID, When getPoolForTenant() called, Then throws", async () => {
      const manager = new DatabasePerTenantManager(makeConfig());
      await expect(manager.getPoolForTenant(null as any)).rejects.toThrow();
    });

    it("Given empty string tenant ID, When getPoolForTenant() called, Then throws", async () => {
      const manager = new DatabasePerTenantManager(makeConfig());
      await expect(manager.getPoolForTenant('')).rejects.toThrow();
    });
  });

  // ---- Malicious DSN in tenantDsnMap ----
  describe('constructor — malicious DSN validation', () => {
    it("Given tenantDsnMap contains a DSN with shell injection, When manager constructed, Then throws or sanitizes", () => {
      // A DSN containing shell metacharacters should be rejected at construction
      const badDsn = 'postgresql://localhost/db; rm -rf /';
      expect(() => {
        new DatabasePerTenantManager(makeConfig({
          tenantDsnMap: { 'tenant-a': badDsn },
        }));
      }).toThrow(/invalid.*dsn|dsn.*invalid|malformed/i);
    });

    it("Given tenantDsnMap contains an empty DSN, When manager constructed, Then throws", () => {
      expect(() => {
        new DatabasePerTenantManager(makeConfig({
          tenantDsnMap: { 'tenant-a': '' },
        }));
      }).toThrow();
    });

    it("Given tenantDsnMap is null, When manager constructed, Then throws", () => {
      expect(() => {
        new DatabasePerTenantManager(makeConfig({ tenantDsnMap: null as any }));
      }).toThrow();
    });
  });

  // ---- Disabled flag bypass attempt ----
  describe('getPoolForTenant() — disabled mode', () => {
    it("Given enabled is false, When getPoolForTenant() called, Then throws FeatureDisabledError", async () => {
      const manager = new DatabasePerTenantManager(makeConfig({ enabled: false }));
      await expect(manager.getPoolForTenant('tenant-a')).rejects.toThrow(/disabled|not enabled/i);
    });
  });

  // ---- Pool count exhaustion ----
  describe('getPoolForTenant() — max pools exceeded', () => {
    it("Given maxPoolsPerInstance is 1 and 2 different tenants requested, When second getPoolForTenant() called, Then throws PoolLimitError", async () => {
      const manager = new DatabasePerTenantManager(makeConfig({ maxPoolsPerInstance: 1 }));
      // First tenant should succeed
      await manager.getPoolForTenant('tenant-a');
      // Second different tenant should fail (pool limit)
      await expect(manager.getPoolForTenant('tenant-b')).rejects.toThrow(/pool.*limit|max.*pool|limit.*exceed/i);
    });

    it("Given maxPoolsPerInstance is 0, When getPoolForTenant() called, Then throws immediately", async () => {
      const manager = new DatabasePerTenantManager(makeConfig({ maxPoolsPerInstance: 0 }));
      await expect(manager.getPoolForTenant('tenant-a')).rejects.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY TESTS
// ---------------------------------------------------------------------------

describe('DatabasePerTenantManager — BOUNDARY TESTS', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockPoolEnd.mockReset();
    MockPool.mockClear();
  });

  // ---- Pool reuse for same tenant ----
  describe('getPoolForTenant() — pool reuse', () => {
    it("Given same tenant requested twice, When getPoolForTenant() called twice, Then returns same pool instance (no double-creation)", async () => {
      const manager = new DatabasePerTenantManager(makeConfig());
      const pool1 = await manager.getPoolForTenant('tenant-a');
      const pool2 = await manager.getPoolForTenant('tenant-a');
      expect(pool1).toBe(pool2);
      // pg Pool constructor should only be called once for this tenant
      expect(MockPool).toHaveBeenCalledTimes(1);
    });
  });

  // ---- MaxPoolsPerInstance at boundary ----
  describe('getPoolForTenant() — maxPoolsPerInstance boundary', () => {
    it("Given maxPoolsPerInstance is 2, When exactly 2 different tenants request pools, Then both succeed", async () => {
      const manager = new DatabasePerTenantManager(makeConfig({ maxPoolsPerInstance: 2 }));
      const poolA = await manager.getPoolForTenant('tenant-a');
      const poolB = await manager.getPoolForTenant('tenant-b');
      expect(poolA).toBeDefined();
      expect(poolB).toBeDefined();
      expect(poolA).not.toBe(poolB);
    });
  });

  // ---- closeAll() boundary ----
  describe('closeAll() — boundary', () => {
    it("Given no pools have been created, When closeAll() called, Then resolves without error", async () => {
      const manager = new DatabasePerTenantManager(makeConfig());
      await expect(manager.closeAll()).resolves.not.toThrow();
    });

    it("Given closeAll() called twice, When second call executes, Then is idempotent (no error)", async () => {
      const manager = new DatabasePerTenantManager(makeConfig());
      await manager.getPoolForTenant('tenant-a');
      await manager.closeAll();
      await expect(manager.closeAll()).resolves.not.toThrow();
    });

    it("Given a pool.end() rejects during closeAll(), When closeAll() executes, Then closes remaining pools gracefully", async () => {
      mockPoolEnd.mockRejectedValueOnce(new Error('pool already closed'));
      const manager = new DatabasePerTenantManager(makeConfig());
      await manager.getPoolForTenant('tenant-a');
      // Should not throw even if individual pool.end() fails
      await expect(manager.closeAll()).resolves.not.toThrow();
    });
  });

  // ---- Pool isolation between tenants ----
  describe('Pool isolation — different tenants get different pools', () => {
    it("Given tenant-a and tenant-b, When both request pools, Then each has its own pool with different DSN", async () => {
      const manager = new DatabasePerTenantManager(makeConfig());
      await manager.getPoolForTenant('tenant-a');
      await manager.getPoolForTenant('tenant-b');
      // Each tenant should cause a separate Pool construction with its own DSN
      expect(MockPool).toHaveBeenCalledTimes(2);
      const callA = MockPool.mock.calls[0][0];
      const callB = MockPool.mock.calls[1][0];
      expect(callA.connectionString).toBe('postgresql://localhost/tenant_a');
      expect(callB.connectionString).toBe('postgresql://localhost/tenant_b');
    });
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH
// ---------------------------------------------------------------------------

describe('DatabasePerTenantManager — GOLDEN PATH', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockPoolEnd.mockReset();
    MockPool.mockClear();
  });

  describe('constructor — valid config', () => {
    it("Given valid config with enabled=true, When manager constructed, Then no error is thrown", () => {
      expect(() => new DatabasePerTenantManager(makeConfig())).not.toThrow();
    });

    it("Given valid config with enabled=false, When manager constructed, Then no error is thrown", () => {
      expect(() => new DatabasePerTenantManager(makeConfig({ enabled: false }))).not.toThrow();
    });
  });

  describe('getPoolForTenant() — successful pool retrieval', () => {
    it("Given enabled=true and known tenant-a, When getPoolForTenant() called, Then returns a pg Pool instance", async () => {
      const manager = new DatabasePerTenantManager(makeConfig());
      const pool = await manager.getPoolForTenant('tenant-a');
      expect(pool).toBeDefined();
      expect(typeof pool.query).toBe('function');
    });

    it("Given pool returned, When query executed on it, Then pool.query() is callable", async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });
      const manager = new DatabasePerTenantManager(makeConfig());
      const pool = await manager.getPoolForTenant('tenant-a');
      const result = await pool.query('SELECT 1');
      expect(result.rows).toHaveLength(1);
    });
  });

  describe('listActiveTenants() — active pool listing', () => {
    it("Given one pool created, When listActiveTenants() called, Then returns array with that tenant ID", async () => {
      const manager = new DatabasePerTenantManager(makeConfig());
      await manager.getPoolForTenant('tenant-a');
      const active = manager.listActiveTenants();
      expect(active).toContain('tenant-a');
    });

    it("Given no pools created, When listActiveTenants() called, Then returns empty array", () => {
      const manager = new DatabasePerTenantManager(makeConfig());
      const active = manager.listActiveTenants();
      expect(active).toEqual([]);
    });
  });

  describe('closeAll() — lifecycle cleanup', () => {
    it("Given two pools created, When closeAll() called, Then pool.end() invoked for each", async () => {
      const manager = new DatabasePerTenantManager(makeConfig());
      await manager.getPoolForTenant('tenant-a');
      await manager.getPoolForTenant('tenant-b');
      await manager.closeAll();
      expect(mockPoolEnd).toHaveBeenCalledTimes(2);
    });

    it("Given closeAll() called, When listActiveTenants() checked afterwards, Then returns empty array", async () => {
      const manager = new DatabasePerTenantManager(makeConfig());
      await manager.getPoolForTenant('tenant-a');
      await manager.closeAll();
      expect(manager.listActiveTenants()).toEqual([]);
    });
  });

  describe('TenantPoolEntry — structural compliance', () => {
    it("Given TenantPoolEntry type, When checked, Then has tenantId and pool fields", async () => {
      const manager = new DatabasePerTenantManager(makeConfig());
      await manager.getPoolForTenant('tenant-a');
      const entries: TenantPoolEntry[] = manager.getPoolEntries();
      expect(entries.length).toBeGreaterThan(0);
      const entry = entries[0];
      expect(typeof entry.tenantId).toBe('string');
      expect(entry.pool).toBeDefined();
    });
  });
});

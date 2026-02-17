/**
 * RLS Policies Unit Tests — WS-ENT-3
 *
 * Tests for Row-Level Security policy definitions as migration SQL.
 * Does NOT require a running Postgres instance — pg Pool is mocked.
 *
 * AC-ENT-3.1: RLS policies on all tenant-scoped tables (memory_entries, agent_events)
 *
 * Test order (misuse-first CAD protocol):
 *   1. MISUSE CASES  — policy bypass SQL, missing tenant_id column, RLS disabled tables
 *   2. BOUNDARY TESTS — multiple policies per table, policy on non-existent table, idempotency
 *   3. GOLDEN PATH   — correct SQL structure, migration versioning, both tables covered
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the 'pg' module before any import
// ---------------------------------------------------------------------------
const mockQuery = vi.fn();
const mockPoolEnd = vi.fn();

vi.mock('pg', () => {
  return {
    Pool: vi.fn().mockImplementation(() => ({
      query: mockQuery,
      end: mockPoolEnd,
    })),
  };
});

// Import from paths that do NOT exist yet — tests will be RED
import {
  buildRlsMigrations,
  RlsPolicyDefinition,
  TENANT_SCOPED_TABLES,
  RLS_MIGRATION_VERSION_START,
} from '../../../../enterprise/src/isolation/rls-policies';

// ---------------------------------------------------------------------------
// MISUSE CASES
// ---------------------------------------------------------------------------

describe('RLS Policies — MISUSE CASES', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockPoolEnd.mockReset();
  });

  // ---- Policy bypass via malformed tenant context ----
  describe('RLS policy SQL — must use app.current_tenant', () => {
    it("Given RLS policy SQL, When inspected, Then USING clause references current_setting('app.current_tenant') not a hardcoded value", () => {
      const migrations = buildRlsMigrations();
      const allUpSql = migrations.map(m => m.up).join('\n');
      // Must not hardcode a tenant value — must read from session variable
      expect(allUpSql).not.toMatch(/current_tenant\s*=\s*'[a-z]/i);
      expect(allUpSql).toMatch(/current_setting\s*\(\s*['"]app\.current_tenant['"]/i);
    });

    it("Given RLS policy, When USING clause checked, Then it compares tenant_id to session variable not to literal string", () => {
      const migrations = buildRlsMigrations();
      const allUpSql = migrations.map(m => m.up).join('\n');
      // Policy must be: tenant_id = current_setting('app.current_tenant')
      // Not: tenant_id = 'hardcoded'
      expect(allUpSql).toMatch(/tenant_id\s*=\s*current_setting/i);
    });

    it("Given RLS policy, When FORCE ROW LEVEL SECURITY checked, Then table is FORCE ROW LEVEL SECURITY (superuser bypass blocked)", () => {
      const migrations = buildRlsMigrations();
      const allUpSql = migrations.map(m => m.up).join('\n');
      // Without FORCE, superusers bypass RLS — this must be present
      expect(allUpSql).toMatch(/FORCE ROW LEVEL SECURITY/i);
    });
  });

  // ---- Missing tenant_id column guard ----
  describe('buildRlsMigrations() — table validation', () => {
    it("Given a table name not in TENANT_SCOPED_TABLES, When passed to policy builder, Then throws or returns empty", () => {
      expect(() => {
        buildRlsMigrations(['nonexistent_table' as any]);
      }).toThrow();
    });

    it("Given empty table list, When buildRlsMigrations() called with empty array, Then returns empty migrations or throws", () => {
      // An empty list is either a misconfiguration (throw) or no-op (empty)
      const result = buildRlsMigrations([]);
      expect(Array.isArray(result)).toBe(true);
      // If it returns empty array, that's acceptable
    });

    it("Given null passed as tables, When buildRlsMigrations() called, Then throws", () => {
      expect(() => {
        buildRlsMigrations(null as any);
      }).toThrow();
    });
  });

  // ---- RLS disabled (ENABLE must be present) ----
  describe('Policy SQL — ENABLE ROW LEVEL SECURITY required', () => {
    it("Given policy migration SQL, When checked, Then ENABLE ROW LEVEL SECURITY is present for each table", () => {
      const migrations = buildRlsMigrations();
      const allUpSql = migrations.map(m => m.up).join('\n');
      expect(allUpSql).toMatch(/ENABLE ROW LEVEL SECURITY/i);
    });

    it("Given policy migration SQL, When checked for memory_entries, Then RLS is enabled on memory_entries", () => {
      const migrations = buildRlsMigrations();
      const allUpSql = migrations.map(m => m.up).join('\n');
      expect(allUpSql).toMatch(/memory_entries/i);
      // At least one occurrence of ENABLE ROW LEVEL SECURITY near memory_entries
      expect(allUpSql).toMatch(/ALTER TABLE\s+memory_entries.*ROW LEVEL SECURITY|ALTER TABLE.*memory_entries[\s\S]*?ENABLE ROW LEVEL SECURITY/i);
    });

    it("Given policy migration SQL, When checked for agent_events, Then RLS is enabled on agent_events", () => {
      const migrations = buildRlsMigrations();
      const allUpSql = migrations.map(m => m.up).join('\n');
      expect(allUpSql).toMatch(/agent_events/i);
      expect(allUpSql).toMatch(/ALTER TABLE\s+agent_events.*ROW LEVEL SECURITY|ALTER TABLE.*agent_events[\s\S]*?ENABLE ROW LEVEL SECURITY/i);
    });
  });

  // ---- Down migration must disable RLS ----
  describe('Rollback SQL — must disable RLS', () => {
    it("Given rollback SQL, When checked, Then DISABLE ROW LEVEL SECURITY is present", () => {
      const migrations = buildRlsMigrations();
      const allDownSql = migrations.filter(m => m.down).map(m => m.down!).join('\n');
      expect(allDownSql).toMatch(/DISABLE ROW LEVEL SECURITY/i);
    });

    it("Given rollback SQL, When checked, Then DROP POLICY is present for each table", () => {
      const migrations = buildRlsMigrations();
      const allDownSql = migrations.filter(m => m.down).map(m => m.down!).join('\n');
      expect(allDownSql).toMatch(/DROP POLICY/i);
    });
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY TESTS
// ---------------------------------------------------------------------------

describe('RLS Policies — BOUNDARY TESTS', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  // ---- Migration versioning ----
  describe('buildRlsMigrations() — version ordering', () => {
    it("Given RLS migrations, When versions checked, Then all versions are above RLS_MIGRATION_VERSION_START", () => {
      const migrations = buildRlsMigrations();
      for (const m of migrations) {
        expect(m.version).toBeGreaterThanOrEqual(RLS_MIGRATION_VERSION_START);
      }
    });

    it("Given RLS migrations, When versions checked, Then no duplicate versions exist", () => {
      const migrations = buildRlsMigrations();
      const versions = migrations.map(m => m.version);
      const unique = new Set(versions);
      expect(unique.size).toBe(versions.length);
    });

    it("Given RLS migrations, When sorted by version, Then they are already in ascending order", () => {
      const migrations = buildRlsMigrations();
      const versions = migrations.map(m => m.version);
      const sorted = [...versions].sort((a, b) => a - b);
      expect(versions).toEqual(sorted);
    });
  });

  // ---- TENANT_SCOPED_TABLES coverage ----
  describe('TENANT_SCOPED_TABLES — both tables present', () => {
    it("Given TENANT_SCOPED_TABLES constant, When checked, Then includes 'memory_entries'", () => {
      expect(TENANT_SCOPED_TABLES).toContain('memory_entries');
    });

    it("Given TENANT_SCOPED_TABLES constant, When checked, Then includes 'agent_events'", () => {
      expect(TENANT_SCOPED_TABLES).toContain('agent_events');
    });

    it("Given TENANT_SCOPED_TABLES, When length checked, Then has at least 2 tables", () => {
      expect(TENANT_SCOPED_TABLES.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ---- Policy idempotency ----
  describe('Policy SQL — IF NOT EXISTS / OR REPLACE pattern', () => {
    it("Given policy migration, When run twice, Then uses CREATE POLICY IF NOT EXISTS or equivalent guard", () => {
      const migrations = buildRlsMigrations();
      const allUpSql = migrations.map(m => m.up).join('\n');
      // Either IF NOT EXISTS or OR REPLACE or explicit DROP IF EXISTS before CREATE
      const hasIdempotentPattern =
        /CREATE POLICY IF NOT EXISTS/i.test(allUpSql) ||
        /OR REPLACE/i.test(allUpSql) ||
        /DROP POLICY IF EXISTS/i.test(allUpSql);
      expect(hasIdempotentPattern).toBe(true);
    });
  });

  // ---- Both SELECT and INSERT/UPDATE/DELETE policies ----
  describe('Policy coverage — all DML operations', () => {
    it("Given RLS policies, When checked, Then SELECT policy exists", () => {
      const migrations = buildRlsMigrations();
      const allUpSql = migrations.map(m => m.up).join('\n');
      expect(allUpSql).toMatch(/FOR SELECT/i);
    });

    it("Given RLS policies, When checked, Then write operations (INSERT/UPDATE/DELETE) are also covered", () => {
      const migrations = buildRlsMigrations();
      const allUpSql = migrations.map(m => m.up).join('\n');
      const hasWritePolicy =
        /FOR INSERT/i.test(allUpSql) ||
        /FOR ALL/i.test(allUpSql) ||
        /FOR UPDATE/i.test(allUpSql);
      expect(hasWritePolicy).toBe(true);
    });
  });

  // ---- tenant_id column migration ----
  describe('Tenant column migration — ADD COLUMN tenant_id', () => {
    it("Given tenant_id migration SQL, When checked, Then ALTER TABLE ... ADD COLUMN tenant_id is present", () => {
      const migrations = buildRlsMigrations();
      const allUpSql = migrations.map(m => m.up).join('\n');
      expect(allUpSql).toMatch(/ADD COLUMN.*tenant_id|ADD COLUMN IF NOT EXISTS.*tenant_id/i);
    });

    it("Given tenant_id column, When type checked in SQL, Then column is TEXT or VARCHAR", () => {
      const migrations = buildRlsMigrations();
      const allUpSql = migrations.map(m => m.up).join('\n');
      expect(allUpSql).toMatch(/tenant_id\s+(TEXT|VARCHAR)/i);
    });
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH
// ---------------------------------------------------------------------------

describe('RLS Policies — GOLDEN PATH', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  describe('buildRlsMigrations() — produces valid Migration objects', () => {
    it("Given default call, When buildRlsMigrations() returns, Then result is an array of Migration objects", () => {
      const migrations = buildRlsMigrations();
      expect(Array.isArray(migrations)).toBe(true);
      expect(migrations.length).toBeGreaterThan(0);
    });

    it("Given migrations returned, When each checked, Then each has version, up, and optional down", () => {
      const migrations = buildRlsMigrations();
      for (const m of migrations) {
        expect(typeof m.version).toBe('number');
        expect(typeof m.up).toBe('string');
        expect(m.up.trim().length).toBeGreaterThan(0);
      }
    });

    it("Given migrations, When up SQL checked, Then creates CREATE POLICY statements", () => {
      const migrations = buildRlsMigrations();
      const allUpSql = migrations.map(m => m.up).join('\n');
      expect(allUpSql).toMatch(/CREATE POLICY/i);
    });
  });

  describe('RlsPolicyDefinition type — structural compliance', () => {
    it("Given RlsPolicyDefinition, When constructed, Then has tableName, policyName, using, check fields", () => {
      const policy: RlsPolicyDefinition = {
        tableName: 'memory_entries',
        policyName: 'tenant_isolation_memory',
        using: "tenant_id = current_setting('app.current_tenant')",
        check: "tenant_id = current_setting('app.current_tenant')",
      };
      expect(policy.tableName).toBe('memory_entries');
      expect(policy.policyName).toBe('tenant_isolation_memory');
      expect(policy.using).toMatch(/current_setting/);
    });
  });

  describe('Migration covers both required tables', () => {
    it("Given full migration SQL, When both table names searched, Then both memory_entries and agent_events appear", () => {
      const migrations = buildRlsMigrations();
      const allSql = migrations.map(m => m.up + (m.down ?? '')).join('\n');
      expect(allSql).toMatch(/memory_entries/i);
      expect(allSql).toMatch(/agent_events/i);
    });

    it("Given migration, When each table has its own policy, Then at least 2 CREATE POLICY statements exist", () => {
      const migrations = buildRlsMigrations();
      const allUpSql = migrations.map(m => m.up).join('\n');
      const policyMatches = allUpSql.match(/CREATE POLICY/gi) ?? [];
      expect(policyMatches.length).toBeGreaterThanOrEqual(2);
    });
  });
});

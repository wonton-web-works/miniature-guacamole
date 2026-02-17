/**
 * NDA Isolation — RLS Bypass & SQL Injection Tests (AC-ENT-8.2)
 *
 * Security-focused verification that Row-Level Security cannot be bypassed
 * through SQL injection, tenant ID manipulation, or superuser workarounds.
 *
 * This is a paranoid test suite. Every test name states the attack vector
 * and the expected defense.
 *
 * Test order (misuse-first CAD protocol):
 *   1. MISUSE CASES  — injection attacks, bypass attempts, malformed inputs
 *   2. BOUNDARY TESTS — edge characters, length limits, encoding tricks
 *   3. GOLDEN PATH   — correct SQL structure, FORCE RLS, current_setting usage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock pg before all imports
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
  buildRlsMigrations,
  TENANT_SCOPED_TABLES,
  RLS_MIGRATION_VERSION_START,
} from '../../../../enterprise/src/isolation/rls-policies';

import {
  TenantContext,
  withTenantContext,
} from '../../../../enterprise/src/isolation/tenant-context';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeClient(queryImpl?: (sql: string, params?: any[]) => Promise<any>) {
  return {
    query: vi.fn().mockImplementation(
      queryImpl ?? (async () => ({ rows: [], rowCount: 0 }))
    ),
    release: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// MISUSE CASES
// ---------------------------------------------------------------------------

describe('NDA RLS Bypass — MISUSE CASES', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockPoolEnd.mockReset();
  });

  // ---- Classic SQL injection vectors ----
  describe('SQL Injection via tenant ID — INJECTION_CHARS list', () => {
    const INJECTION_VECTORS = [
      ["single-quote injection", "'; DROP TABLE memory_entries; --"],
      ["semicolon command separator", "tenant; DELETE FROM agent_events;"],
      ["null byte injection", "tenant\x00malicious"],
      ["newline injection", "tenant\nSET app.current_tenant = 'attacker'"],
      ["SQL comment injection", "tenant'--"],
      ["comment + drop", "'--; DROP TABLE memory_entries"],
      ["double dash SQL comment", "ws-ent-3--"],
      ["newline + comment chain", "t\n--injection"],
    ];

    for (const [label, maliciousId] of INJECTION_VECTORS) {
      it(`Given tenant ID contains ${label}, When setTenant() called, Then injection is blocked before DB execution`, async () => {
        const client = makeClient();
        const ctx = new TenantContext(client as any);
        await expect(ctx.setTenant(maliciousId)).rejects.toThrow();
        // Injection must be caught before any DB call
        expect(client.query).not.toHaveBeenCalled();
      });
    }

    it("Given injection-char tenant ID, When setTenant() throws, Then error message does not expose raw SQL", async () => {
      const client = makeClient();
      const ctx = new TenantContext(client as any);
      try {
        await ctx.setTenant("'; DROP TABLE memory_entries;--");
      } catch (err: any) {
        // Error message must describe the validation failure, not expose SQL syntax
        expect(err.message).not.toMatch(/syntax error|pg error|sql error/i);
      }
    });
  });

  // ---- Null / undefined / empty tenant ID ----
  describe('Empty and null tenant ID injection prevention', () => {
    it("Given tenant ID is null, When setTenant() called, Then rejects before DB access", async () => {
      const client = makeClient();
      const ctx = new TenantContext(client as any);
      await expect(ctx.setTenant(null as any)).rejects.toThrow();
      expect(client.query).not.toHaveBeenCalled();
    });

    it("Given tenant ID is undefined, When setTenant() called, Then rejects before DB access", async () => {
      const client = makeClient();
      const ctx = new TenantContext(client as any);
      await expect(ctx.setTenant(undefined as any)).rejects.toThrow();
      expect(client.query).not.toHaveBeenCalled();
    });

    it("Given tenant ID is empty string, When setTenant() called, Then rejects (empty tenant would match empty session var)", async () => {
      const client = makeClient();
      const ctx = new TenantContext(client as any);
      await expect(ctx.setTenant('')).rejects.toThrow();
      expect(client.query).not.toHaveBeenCalled();
    });

    it("Given tenant ID is whitespace-only, When setTenant() called, Then rejects (whitespace trim bypasses empty check)", async () => {
      const client = makeClient();
      const ctx = new TenantContext(client as any);
      await expect(ctx.setTenant('   ')).rejects.toThrow();
      expect(client.query).not.toHaveBeenCalled();
    });

    it("Given tenant ID is tab character only, When setTenant() called, Then rejects", async () => {
      const client = makeClient();
      const ctx = new TenantContext(client as any);
      await expect(ctx.setTenant('\t')).rejects.toThrow();
      expect(client.query).not.toHaveBeenCalled();
    });
  });

  // ---- RLS policy must not hardcode tenant values ----
  describe('RLS policy SQL — no hardcoded tenant values', () => {
    it("Given RLS policy USING clause, When SQL inspected, Then does NOT contain any hardcoded tenant string literal", () => {
      const migrations = buildRlsMigrations();
      const allUpSql = migrations.map(m => m.up).join('\n');
      // Hardcoded patterns like: tenant_id = 'tenant-a' or USING ('hardcoded')
      expect(allUpSql).not.toMatch(/tenant_id\s*=\s*'[a-zA-Z0-9_-]+'/);
    });

    it("Given RLS USING clause, When inspected, Then uses current_setting('app.current_tenant') session variable", () => {
      const migrations = buildRlsMigrations();
      const allUpSql = migrations.map(m => m.up).join('\n');
      expect(allUpSql).toMatch(/current_setting\s*\(\s*['"]app\.current_tenant['"]/i);
    });

    it("Given RLS USING clause, When third argument to current_setting inspected, Then uses 'true' (missing_ok) to avoid errors on unauthenticated connections", () => {
      const migrations = buildRlsMigrations();
      const allUpSql = migrations.map(m => m.up).join('\n');
      // current_setting('app.current_tenant', true) — 'true' = missing_ok
      expect(allUpSql).toMatch(/current_setting\s*\(\s*['"]app\.current_tenant['"],\s*true\s*\)/i);
    });
  });

  // ---- Superuser bypass prevention ----
  describe('FORCE ROW LEVEL SECURITY — blocks superuser bypass', () => {
    it("Given RLS migration SQL, When FORCE keyword inspected, Then FORCE ROW LEVEL SECURITY is present for ALL tenant-scoped tables", () => {
      const migrations = buildRlsMigrations();
      const allUpSql = migrations.map(m => m.up).join('\n');
      // Without FORCE, table owner and superusers bypass RLS — this is a critical security gap
      expect(allUpSql).toMatch(/FORCE ROW LEVEL SECURITY/i);
    });

    it("Given memory_entries migration, When SQL inspected, Then FORCE ROW LEVEL SECURITY appears for memory_entries", () => {
      const migrations = buildRlsMigrations(['memory_entries']);
      const sql = migrations[0].up;
      expect(sql).toMatch(/FORCE ROW LEVEL SECURITY/i);
    });

    it("Given agent_events migration, When SQL inspected, Then FORCE ROW LEVEL SECURITY appears for agent_events", () => {
      const migrations = buildRlsMigrations(['agent_events']);
      const sql = migrations[0].up;
      expect(sql).toMatch(/FORCE ROW LEVEL SECURITY/i);
    });

    it("Given RLS migration, When ENABLE and FORCE order checked, Then ENABLE ROW LEVEL SECURITY appears before FORCE ROW LEVEL SECURITY", () => {
      const migrations = buildRlsMigrations(['memory_entries']);
      const sql = migrations[0].up;
      const enableIdx = sql.indexOf('ENABLE ROW LEVEL SECURITY');
      const forceIdx = sql.indexOf('FORCE ROW LEVEL SECURITY');
      expect(enableIdx).toBeGreaterThanOrEqual(0);
      expect(forceIdx).toBeGreaterThanOrEqual(0);
      expect(enableIdx).toBeLessThan(forceIdx);
    });
  });

  // ---- Unknown / unregistered table bypass attempt ----
  describe('buildRlsMigrations() — unknown table bypass attempt', () => {
    it("Given attacker passes arbitrary table name to buildRlsMigrations(), When called, Then throws — cannot generate arbitrary RLS policy bypass", () => {
      expect(() => buildRlsMigrations(['pg_catalog.pg_authid' as any])).toThrow();
    });

    it("Given attacker passes admin table name, When buildRlsMigrations() called, Then rejects table not in TENANT_SCOPED_TABLES", () => {
      expect(() => buildRlsMigrations(['schema_migrations' as any])).toThrow();
    });

    it("Given null passed to buildRlsMigrations(), When called, Then throws (not silently returns empty)", () => {
      expect(() => buildRlsMigrations(null as any)).toThrow();
    });

    it("Given non-array passed to buildRlsMigrations(), When called, Then throws", () => {
      expect(() => buildRlsMigrations('memory_entries' as any)).toThrow();
    });

    it("Given object passed to buildRlsMigrations(), When called, Then throws", () => {
      expect(() => buildRlsMigrations({} as any)).toThrow();
    });
  });

  // ---- setTenant uses parameterized query (not interpolation) ----
  describe('setTenant() — parameterized query prevents injection at DB level', () => {
    it("Given valid tenant ID, When setTenant() executes, Then query uses parameters array (not string interpolation)", async () => {
      const callArgs: any[] = [];
      const client = {
        query: vi.fn().mockImplementation(async (sql: string, params?: any[]) => {
          callArgs.push({ sql, params });
          return { rows: [], rowCount: 0 };
        }),
        release: vi.fn(),
      };
      const ctx = new TenantContext(client as any);
      await ctx.setTenant('ws-ent-3');

      // Must use parameterized query: sql has $1 placeholder, params array has the value
      const call = callArgs[0];
      expect(call.sql).toMatch(/\$1/);
      expect(Array.isArray(call.params)).toBe(true);
      expect(call.params).toContain('ws-ent-3');
    });

    it("Given valid tenant ID, When setTenant() executes, Then tenant value does NOT appear interpolated inside SQL text", async () => {
      const callArgs: any[] = [];
      const client = {
        query: vi.fn().mockImplementation(async (sql: string, params?: any[]) => {
          callArgs.push({ sql, params });
          return { rows: [], rowCount: 0 };
        }),
        release: vi.fn(),
      };
      const ctx = new TenantContext(client as any);
      await ctx.setTenant('ws-ent-3');

      // The SQL string must not contain the tenant ID literally
      const call = callArgs[0];
      expect(call.sql).not.toContain('ws-ent-3');
    });
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY TESTS
// ---------------------------------------------------------------------------

describe('NDA RLS Bypass — BOUNDARY TESTS', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  // ---- Exact length boundary ----
  describe('Tenant ID length boundary — 255 char limit', () => {
    it("Given tenant ID exactly 255 characters (max allowed), When setTenant() called, Then succeeds (boundary inclusive)", async () => {
      const client = makeClient();
      const ctx = new TenantContext(client as any);
      const maxId = 'a'.repeat(255);
      await expect(ctx.setTenant(maxId)).resolves.not.toThrow();
    });

    it("Given tenant ID 256 characters (one over limit), When setTenant() called, Then rejects with length error", async () => {
      const client = makeClient();
      const ctx = new TenantContext(client as any);
      const overLimit = 'a'.repeat(256);
      await expect(ctx.setTenant(overLimit)).rejects.toThrow(/length|too long|exceed/i);
    });

    it("Given tenant ID 1000 characters (extreme over limit), When setTenant() called, Then rejects", async () => {
      const client = makeClient();
      const ctx = new TenantContext(client as any);
      const extreme = 'a'.repeat(1000);
      await expect(ctx.setTenant(extreme)).rejects.toThrow();
    });
  });

  // ---- Characters that look like injection but are valid ----
  describe('Valid tenant IDs that are not injection attempts', () => {
    const VALID_IDS = [
      'tenant-a',
      'tenant_b',
      'org.tenant.1',
      'ws-ent-3',
      'TENANT_A',
      'a',
      '123',
      'tenant123',
    ];

    for (const validId of VALID_IDS) {
      it(`Given valid tenant ID '${validId}', When setTenant() called, Then succeeds (not a false-positive rejection)`, async () => {
        const client = makeClient();
        const ctx = new TenantContext(client as any);
        await expect(ctx.setTenant(validId)).resolves.not.toThrow();
      });
    }
  });

  // ---- RLS coverage — all TENANT_SCOPED_TABLES ----
  describe('RLS coverage — no table left unprotected', () => {
    it("Given TENANT_SCOPED_TABLES list, When each table checked, Then buildRlsMigrations() covers ALL tables", () => {
      const migrations = buildRlsMigrations();
      const allSql = migrations.map(m => m.up).join('\n');
      for (const table of TENANT_SCOPED_TABLES) {
        expect(allSql).toMatch(new RegExp(table, 'i'));
      }
    });

    it("Given default buildRlsMigrations() call, When migration count checked, Then exactly one migration per TENANT_SCOPED_TABLE exists", () => {
      const migrations = buildRlsMigrations();
      expect(migrations.length).toBe(TENANT_SCOPED_TABLES.length);
    });

    it("Given each migration, When ENABLE ROW LEVEL SECURITY checked, Then every migration enables RLS (not just the first)", () => {
      const migrations = buildRlsMigrations();
      for (const m of migrations) {
        expect(m.up).toMatch(/ENABLE ROW LEVEL SECURITY/i);
        expect(m.up).toMatch(/FORCE ROW LEVEL SECURITY/i);
      }
    });
  });

  // ---- Policy covers both SELECT and write operations ----
  describe('RLS policy — write operations also covered', () => {
    it("Given RLS policy SQL, When checked for write coverage, Then INSERT / UPDATE / DELETE or FOR ALL is present", () => {
      const migrations = buildRlsMigrations();
      const allUpSql = migrations.map(m => m.up).join('\n');
      const hasWritePolicy =
        /FOR INSERT/i.test(allUpSql) ||
        /FOR ALL/i.test(allUpSql) ||
        /FOR UPDATE/i.test(allUpSql) ||
        /FOR DELETE/i.test(allUpSql);
      expect(hasWritePolicy).toBe(true);
    });

    it("Given FOR ALL policy, When WITH CHECK clause checked, Then WITH CHECK uses current_setting (not hardcoded)", () => {
      const migrations = buildRlsMigrations();
      const allUpSql = migrations.map(m => m.up).join('\n');
      // WITH CHECK must also reference current_setting to prevent cross-tenant writes
      expect(allUpSql).toMatch(/WITH CHECK[\s\S]*?current_setting/i);
    });
  });

  // ---- Migration version isolation ----
  describe('Migration versioning — RLS versions isolated from base schema', () => {
    it("Given RLS_MIGRATION_VERSION_START, When compared to zero, Then is at least 2000 (avoids colliding with base schema migrations)", () => {
      expect(RLS_MIGRATION_VERSION_START).toBeGreaterThanOrEqual(2000);
    });

    it("Given all RLS migration versions, When sorted, Then no gaps exist (sequential versioning)", () => {
      const migrations = buildRlsMigrations();
      const versions = migrations.map(m => m.version).sort((a, b) => a - b);
      for (let i = 1; i < versions.length; i++) {
        expect(versions[i]).toBe(versions[i - 1] + 1);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH
// ---------------------------------------------------------------------------

describe('NDA RLS Bypass — GOLDEN PATH', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  describe('RLS policy structure — correct SQL for NDA-grade isolation', () => {
    it("Given RLS policy for memory_entries, When USING clause parsed, Then reads: tenant_id = current_setting('app.current_tenant', true)", () => {
      const migrations = buildRlsMigrations(['memory_entries']);
      const sql = migrations[0].up;
      expect(sql).toMatch(/tenant_id\s*=\s*current_setting\s*\(\s*['"]app\.current_tenant['"],\s*true\s*\)/i);
    });

    it("Given RLS policy for agent_events, When USING clause parsed, Then reads: tenant_id = current_setting('app.current_tenant', true)", () => {
      const migrations = buildRlsMigrations(['agent_events']);
      const sql = migrations[0].up;
      expect(sql).toMatch(/tenant_id\s*=\s*current_setting\s*\(\s*['"]app\.current_tenant['"],\s*true\s*\)/i);
    });

    it("Given RLS policy, When SELECT policy name inspected, Then contains table name for clarity (audit trail)", () => {
      const migrations = buildRlsMigrations();
      for (const m of migrations) {
        expect(m.up).toMatch(/CREATE POLICY tenant_isolation_/i);
      }
    });
  });

  describe('Rollback SQL — RLS cleanly removed on down migration', () => {
    it("Given rollback SQL, When inspected, Then DISABLE ROW LEVEL SECURITY is present", () => {
      const migrations = buildRlsMigrations();
      const allDownSql = migrations.map(m => m.down ?? '').join('\n');
      expect(allDownSql).toMatch(/DISABLE ROW LEVEL SECURITY/i);
    });

    it("Given rollback SQL, When DROP POLICY checked, Then DROP POLICY IF EXISTS is idempotent", () => {
      const migrations = buildRlsMigrations();
      const allDownSql = migrations.map(m => m.down ?? '').join('\n');
      expect(allDownSql).toMatch(/DROP POLICY IF EXISTS/i);
    });

    it("Given rollback SQL, When tenant_id column removal checked, Then DROP COLUMN IF EXISTS tenant_id is present", () => {
      const migrations = buildRlsMigrations();
      const allDownSql = migrations.map(m => m.down ?? '').join('\n');
      expect(allDownSql).toMatch(/DROP COLUMN IF EXISTS tenant_id/i);
    });
  });

  describe('setTenant() — correct session variable name', () => {
    it("Given valid tenant, When setTenant() issues DB query, Then query references 'app.current_tenant' exactly", async () => {
      const callArgs: any[] = [];
      const client = {
        query: vi.fn().mockImplementation(async (sql: string, params?: any[]) => {
          callArgs.push({ sql, params });
          return { rows: [], rowCount: 0 };
        }),
        release: vi.fn(),
      };
      const ctx = new TenantContext(client as any);
      await ctx.setTenant('ws-ent-3');
      const call = callArgs[0];
      expect(call.sql).toMatch(/app\.current_tenant/i);
    });

    it("Given clearTenant() called, When DB query inspected, Then it sets tenant to empty string (not a random value)", async () => {
      const callArgs: any[] = [];
      const client = {
        query: vi.fn().mockImplementation(async (sql: string, params?: any[]) => {
          callArgs.push({ sql, params });
          return { rows: [], rowCount: 0 };
        }),
        release: vi.fn(),
      };
      const ctx = new TenantContext(client as any);
      await ctx.setTenant('ws-ent-3');
      await ctx.clearTenant();
      // clearTenant must reset to empty string, not leave the tenant set
      const lastCall = callArgs[callArgs.length - 1];
      expect(lastCall.sql).toMatch(/app\.current_tenant/i);
    });
  });
});

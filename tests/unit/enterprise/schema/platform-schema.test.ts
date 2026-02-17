/**
 * Platform Schema Unit Tests — WS-ENT-4
 *
 * Tests migration SQL definitions for the shared platform schema.
 * Does NOT require a running Postgres instance.
 *
 * AC-ENT-4.1: projects, users, roles, permissions tables with proper constraints
 * AC-ENT-4.2: assets table with S3/R2 reference pattern
 * AC-ENT-4.3: agent_events extended with project_id FK
 * AC-ENT-4.4: Cross-app project references via UUID foreign keys
 * AC-ENT-4.5: RBAC permission model (role_permissions, user_roles join tables)
 *
 * Test order (misuse-first CAD protocol):
 *   1. MISUSE CASES  — SQL injection in migration SQL, missing constraints, unsafe patterns
 *   2. BOUNDARY TESTS — empty migration sets, idempotency guards, version conflicts
 *   3. GOLDEN PATH   — correct SQL structure, constraints, version ordering
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
  PLATFORM_SCHEMA_MIGRATIONS,
  PLATFORM_SCHEMA_VERSION_START,
  buildPlatformSchemaMigrations,
} from '../../../../enterprise/src/schema/platform-schema';

// ---------------------------------------------------------------------------
// MISUSE CASES
// ---------------------------------------------------------------------------

describe('Platform Schema — MISUSE CASES', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockPoolEnd.mockReset();
  });

  // ---- SQL injection risk: no string interpolation in migration SQL ----
  describe('Migration SQL — no dynamic string interpolation', () => {
    it('Given all migration up SQL, When inspected, Then no string concatenation with variable placeholders appears', () => {
      const migrations = PLATFORM_SCHEMA_MIGRATIONS;
      const allUpSql = migrations.map(m => m.up).join('\n');
      // No ${ template literals (these are static SQL strings)
      expect(allUpSql).not.toMatch(/\$\{/);
    });

    it('Given all migration down SQL, When inspected, Then no dynamic string interpolation appears', () => {
      const migrations = PLATFORM_SCHEMA_MIGRATIONS;
      const allDownSql = migrations.filter(m => m.down).map(m => m.down!).join('\n');
      expect(allDownSql).not.toMatch(/\$\{/);
    });

    it('Given projects table migration, When SQL inspected, Then tenant_id is TEXT NOT NULL (cannot be omitted)', () => {
      const migrations = PLATFORM_SCHEMA_MIGRATIONS;
      const allUpSql = migrations.map(m => m.up).join('\n');
      // tenant_id must be NOT NULL — no row without a tenant allowed
      expect(allUpSql).toMatch(/tenant_id\s+TEXT\s+NOT\s+NULL/i);
    });
  });

  // ---- Missing constraint: UUID primary keys required (no serial/integer PKs) ----
  describe('Schema constraints — UUID PKs required', () => {
    it('Given projects table SQL, When inspected, Then id column is UUID type', () => {
      const migrations = PLATFORM_SCHEMA_MIGRATIONS;
      const allUpSql = migrations.map(m => m.up).join('\n');
      expect(allUpSql).toMatch(/id\s+UUID\s+PRIMARY\s+KEY/i);
    });

    it('Given users table SQL, When inspected, Then primary key is UUID not SERIAL', () => {
      const migrations = PLATFORM_SCHEMA_MIGRATIONS;
      const allUpSql = migrations.map(m => m.up).join('\n');
      // Must not use SERIAL or BIGSERIAL as PK type for entity tables
      expect(allUpSql).not.toMatch(/id\s+(?:BIG)?SERIAL\s+PRIMARY\s+KEY/i);
    });
  });

  // ---- Missing constraint: FK violations must be caught ----
  describe('Schema constraints — FK references defined', () => {
    it('Given assets table SQL, When inspected, Then project_id references projects(id)', () => {
      const migrations = PLATFORM_SCHEMA_MIGRATIONS;
      const allUpSql = migrations.map(m => m.up).join('\n');
      expect(allUpSql).toMatch(/project_id\s+UUID\s+REFERENCES\s+projects\s*\(\s*id\s*\)/i);
    });

    it('Given role_permissions table SQL, When inspected, Then role_id references roles(id) ON DELETE CASCADE', () => {
      const migrations = PLATFORM_SCHEMA_MIGRATIONS;
      const allUpSql = migrations.map(m => m.up).join('\n');
      expect(allUpSql).toMatch(/role_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+roles\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/i);
    });

    it('Given user_roles table SQL, When inspected, Then user_id references users(id) ON DELETE CASCADE', () => {
      const migrations = PLATFORM_SCHEMA_MIGRATIONS;
      const allUpSql = migrations.map(m => m.up).join('\n');
      expect(allUpSql).toMatch(/user_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+users\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/i);
    });

    it('Given role_permissions table SQL, When inspected, Then permission_id references permissions(id) ON DELETE CASCADE', () => {
      const migrations = PLATFORM_SCHEMA_MIGRATIONS;
      const allUpSql = migrations.map(m => m.up).join('\n');
      expect(allUpSql).toMatch(/permission_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+permissions\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/i);
    });
  });

  // ---- Unsafe pattern: hardcoded tenant values in SQL ----
  describe('Schema SQL — no hardcoded tenant values', () => {
    it('Given all migration SQL, When inspected, Then no hardcoded tenant_id literal values appear', () => {
      const migrations = PLATFORM_SCHEMA_MIGRATIONS;
      const allSql = migrations.map(m => m.up).join('\n');
      // Should not contain tenant_id = 'some-hardcoded-value' anywhere in DDL
      expect(allSql).not.toMatch(/tenant_id\s*=\s*'[^']+'/);
    });
  });

  // ---- buildPlatformSchemaMigrations — invalid inputs ----
  describe('buildPlatformSchemaMigrations() — invalid inputs', () => {
    it('Given null passed, When buildPlatformSchemaMigrations() called, Then throws', () => {
      expect(() => buildPlatformSchemaMigrations(null as any)).toThrow();
    });

    it('Given non-array passed, When buildPlatformSchemaMigrations() called, Then throws', () => {
      expect(() => buildPlatformSchemaMigrations('projects' as any)).toThrow();
    });

    it('Given unknown table name in array, When buildPlatformSchemaMigrations() called, Then throws', () => {
      expect(() => buildPlatformSchemaMigrations(['unknown_table' as any])).toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY TESTS
// ---------------------------------------------------------------------------

describe('Platform Schema — BOUNDARY TESTS', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockPoolEnd.mockReset();
  });

  // ---- Empty migration array ----
  describe('buildPlatformSchemaMigrations() — empty input', () => {
    it('Given empty array, When buildPlatformSchemaMigrations() called, Then returns empty array', () => {
      const result = buildPlatformSchemaMigrations([]);
      expect(result).toEqual([]);
    });
  });

  // ---- Idempotency guards in SQL ----
  describe('Migration SQL — idempotency', () => {
    it('Given all table creation SQL, When inspected, Then each uses CREATE TABLE IF NOT EXISTS', () => {
      const migrations = PLATFORM_SCHEMA_MIGRATIONS;
      const allUpSql = migrations.map(m => m.up).join('\n');
      expect(allUpSql).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS/i);
    });

    it('Given agent_events ALTER statement, When inspected, Then uses ADD COLUMN IF NOT EXISTS', () => {
      const migrations = PLATFORM_SCHEMA_MIGRATIONS;
      const allUpSql = migrations.map(m => m.up).join('\n');
      expect(allUpSql).toMatch(/ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+project_id/i);
    });
  });

  // ---- Version ordering ----
  describe('Migration versions — ordering and uniqueness', () => {
    it('Given all platform schema migrations, When versions checked, Then all are unique', () => {
      const versions = PLATFORM_SCHEMA_MIGRATIONS.map(m => m.version);
      const unique = new Set(versions);
      expect(unique.size).toBe(versions.length);
    });

    it('Given all platform schema migrations, When versions checked, Then all are >= PLATFORM_SCHEMA_VERSION_START', () => {
      const migrations = PLATFORM_SCHEMA_MIGRATIONS;
      for (const m of migrations) {
        expect(m.version).toBeGreaterThanOrEqual(PLATFORM_SCHEMA_VERSION_START);
      }
    });

    it('Given platform schema version start, When compared to RLS version start (2000), Then is in a different range', () => {
      // Platform schema migrations (WS-ENT-4) must not collide with RLS migrations (WS-ENT-3, starts at 2000)
      expect(PLATFORM_SCHEMA_VERSION_START).not.toBe(2000);
    });
  });

  // ---- Single-table migration ----
  describe('buildPlatformSchemaMigrations() — single table', () => {
    it('Given array with one valid table name, When buildPlatformSchemaMigrations() called, Then returns one migration', () => {
      const result = buildPlatformSchemaMigrations(['projects']);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('version');
      expect(result[0]).toHaveProperty('up');
    });
  });

  // ---- Down SQL defined ----
  describe('Migration down SQL — rollback defined', () => {
    it('Given platform schema migrations, When down SQL checked, Then each migration has a down rollback', () => {
      const migrations = PLATFORM_SCHEMA_MIGRATIONS;
      for (const m of migrations) {
        expect(m.down).toBeDefined();
        expect(m.down!.length).toBeGreaterThan(0);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH
// ---------------------------------------------------------------------------

describe('Platform Schema — GOLDEN PATH', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockPoolEnd.mockReset();
  });

  // ---- All required tables present ----
  describe('Platform schema — all tables defined', () => {
    it('Given platform schema migrations, When all up SQL joined, Then projects table is created', () => {
      const allUpSql = PLATFORM_SCHEMA_MIGRATIONS.map(m => m.up).join('\n');
      expect(allUpSql).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+projects/i);
    });

    it('Given platform schema migrations, When all up SQL joined, Then users table is created', () => {
      const allUpSql = PLATFORM_SCHEMA_MIGRATIONS.map(m => m.up).join('\n');
      expect(allUpSql).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+users/i);
    });

    it('Given platform schema migrations, When all up SQL joined, Then roles table is created', () => {
      const allUpSql = PLATFORM_SCHEMA_MIGRATIONS.map(m => m.up).join('\n');
      expect(allUpSql).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+roles/i);
    });

    it('Given platform schema migrations, When all up SQL joined, Then permissions table is created', () => {
      const allUpSql = PLATFORM_SCHEMA_MIGRATIONS.map(m => m.up).join('\n');
      expect(allUpSql).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+permissions/i);
    });

    it('Given platform schema migrations, When all up SQL joined, Then role_permissions table is created', () => {
      const allUpSql = PLATFORM_SCHEMA_MIGRATIONS.map(m => m.up).join('\n');
      expect(allUpSql).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+role_permissions/i);
    });

    it('Given platform schema migrations, When all up SQL joined, Then user_roles table is created', () => {
      const allUpSql = PLATFORM_SCHEMA_MIGRATIONS.map(m => m.up).join('\n');
      expect(allUpSql).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+user_roles/i);
    });

    it('Given platform schema migrations, When all up SQL joined, Then assets table is created', () => {
      const allUpSql = PLATFORM_SCHEMA_MIGRATIONS.map(m => m.up).join('\n');
      expect(allUpSql).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+assets/i);
    });

    it('Given platform schema migrations, When all up SQL joined, Then agent_events is altered with project_id', () => {
      const allUpSql = PLATFORM_SCHEMA_MIGRATIONS.map(m => m.up).join('\n');
      expect(allUpSql).toMatch(/ALTER\s+TABLE\s+agent_events/i);
      expect(allUpSql).toMatch(/project_id/i);
    });
  });

  // ---- Assets table: S3/R2 reference pattern (AC-ENT-4.2) ----
  describe('Assets table — S3/R2 reference pattern', () => {
    it('Given assets table SQL, When inspected, Then storage_key column exists', () => {
      const allUpSql = PLATFORM_SCHEMA_MIGRATIONS.map(m => m.up).join('\n');
      expect(allUpSql).toMatch(/storage_key\s+TEXT\s+NOT\s+NULL/i);
    });

    it('Given assets table SQL, When inspected, Then bucket column exists', () => {
      const allUpSql = PLATFORM_SCHEMA_MIGRATIONS.map(m => m.up).join('\n');
      expect(allUpSql).toMatch(/bucket\s+TEXT\s+NOT\s+NULL/i);
    });

    it('Given assets table SQL, When inspected, Then content_type column exists', () => {
      const allUpSql = PLATFORM_SCHEMA_MIGRATIONS.map(m => m.up).join('\n');
      expect(allUpSql).toMatch(/content_type\s+TEXT\s+NOT\s+NULL/i);
    });

    it('Given assets table SQL, When inspected, Then size_bytes column exists as BIGINT', () => {
      const allUpSql = PLATFORM_SCHEMA_MIGRATIONS.map(m => m.up).join('\n');
      expect(allUpSql).toMatch(/size_bytes\s+BIGINT\s+NOT\s+NULL/i);
    });
  });

  // ---- RBAC join tables: composite PKs ----
  describe('RBAC tables — composite primary keys', () => {
    it('Given role_permissions table SQL, When inspected, Then composite PK on (role_id, permission_id)', () => {
      const allUpSql = PLATFORM_SCHEMA_MIGRATIONS.map(m => m.up).join('\n');
      expect(allUpSql).toMatch(/PRIMARY\s+KEY\s*\(\s*role_id\s*,\s*permission_id\s*\)/i);
    });

    it('Given user_roles table SQL, When inspected, Then composite PK on (user_id, role_id)', () => {
      const allUpSql = PLATFORM_SCHEMA_MIGRATIONS.map(m => m.up).join('\n');
      expect(allUpSql).toMatch(/PRIMARY\s+KEY\s*\(\s*user_id\s*,\s*role_id\s*\)/i);
    });
  });

  // ---- UNIQUE constraints ----
  describe('Schema constraints — UNIQUE constraints', () => {
    it('Given users table SQL, When inspected, Then UNIQUE(tenant_id, email) constraint exists', () => {
      const allUpSql = PLATFORM_SCHEMA_MIGRATIONS.map(m => m.up).join('\n');
      expect(allUpSql).toMatch(/UNIQUE\s*\(\s*tenant_id\s*,\s*email\s*\)/i);
    });

    it('Given roles table SQL, When inspected, Then UNIQUE(tenant_id, name) constraint exists', () => {
      const allUpSql = PLATFORM_SCHEMA_MIGRATIONS.map(m => m.up).join('\n');
      expect(allUpSql).toMatch(/UNIQUE\s*\(\s*tenant_id\s*,\s*name\s*\)/i);
    });

    it('Given permissions table SQL, When inspected, Then UNIQUE(resource, action) constraint exists', () => {
      const allUpSql = PLATFORM_SCHEMA_MIGRATIONS.map(m => m.up).join('\n');
      expect(allUpSql).toMatch(/UNIQUE\s*\(\s*resource\s*,\s*action\s*\)/i);
    });
  });

  // ---- gen_random_uuid() default ----
  describe('UUID defaults — gen_random_uuid()', () => {
    it('Given all table DDL, When inspected, Then UUID PKs use gen_random_uuid() as default', () => {
      const allUpSql = PLATFORM_SCHEMA_MIGRATIONS.map(m => m.up).join('\n');
      expect(allUpSql).toMatch(/DEFAULT\s+gen_random_uuid\(\)/i);
    });
  });

  // ---- Timestamps ----
  describe('Schema — timestamp fields', () => {
    it('Given all entity tables, When SQL inspected, Then created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() exists', () => {
      const allUpSql = PLATFORM_SCHEMA_MIGRATIONS.map(m => m.up).join('\n');
      expect(allUpSql).toMatch(/created_at\s+TIMESTAMPTZ\s+NOT\s+NULL\s+DEFAULT\s+NOW\(\)/i);
    });

    it('Given mutable tables (projects, users, assets), When SQL inspected, Then updated_at TIMESTAMPTZ exists', () => {
      const allUpSql = PLATFORM_SCHEMA_MIGRATIONS.map(m => m.up).join('\n');
      expect(allUpSql).toMatch(/updated_at\s+TIMESTAMPTZ\s+NOT\s+NULL\s+DEFAULT\s+NOW\(\)/i);
    });
  });

  // ---- buildPlatformSchemaMigrations with explicit table list ----
  describe('buildPlatformSchemaMigrations() — explicit table selection', () => {
    it('Given valid table names array, When called, Then returns migrations in version order', () => {
      const result = buildPlatformSchemaMigrations(['projects', 'users']);
      expect(result.length).toBeGreaterThanOrEqual(1);
      // Verify ascending version order
      for (let i = 1; i < result.length; i++) {
        expect(result[i].version).toBeGreaterThan(result[i - 1].version);
      }
    });
  });
});

/**
 * AuditMigrations Unit Tests — WS-ENT-9
 *
 * Tests for the audit_events table migration definitions.
 * Validates version range, SQL structure, and no dynamic interpolation.
 *
 * AC-ENT-9.1: Audit trail service — immutable append-only log
 *   (migration creates the table backing the service)
 *
 * Version requirement: 5000+ (above vector migrations at 4000+)
 *
 * Test order: MISUSE → BOUNDARY → GOLDEN PATH
 */

import { describe, it, expect } from 'vitest';

import {
  buildAuditMigrations,
  AUDIT_SCHEMA_VERSION_START,
} from '../../../../enterprise/src/compliance/audit-trail';

// ---------------------------------------------------------------------------
// MISUSE CASES
// ---------------------------------------------------------------------------

describe('AuditMigrations — MISUSE CASES', () => {
  // ---- Version collision with vector migrations ----

  describe('Version range — no collision with vector (4000+)', () => {
    it("Given audit migration versions, When compared to VECTOR_SCHEMA_VERSION_START (4000), Then all audit versions are >= 5000", () => {
      const VECTOR_VERSION_START = 4000;
      const migrations = buildAuditMigrations();

      for (const m of migrations) {
        expect(m.version).toBeGreaterThanOrEqual(5000);
        expect(m.version).toBeGreaterThan(VECTOR_VERSION_START);
      }
    });

    it("AUDIT_SCHEMA_VERSION_START constant is >= 5000", () => {
      expect(AUDIT_SCHEMA_VERSION_START).toBeGreaterThanOrEqual(5000);
    });

    it("Given audit migrations, When versions listed, Then no version falls in 1000-4999 range (reserved for other modules)", () => {
      const migrations = buildAuditMigrations();
      for (const m of migrations) {
        expect(m.version < 1000 || m.version >= 5000).toBe(true);
      }
    });
  });

  // ---- No dynamic SQL interpolation ----

  describe('Migration SQL — no dynamic string interpolation', () => {
    it("Given audit migration SQL strings, When inspected, Then no template literal placeholders (${...}) appear in SQL", () => {
      const migrations = buildAuditMigrations();
      for (const m of migrations) {
        expect(m.up).not.toMatch(/\$\{/);
        if (m.down) {
          expect(m.down).not.toMatch(/\$\{/);
        }
      }
    });

    it("Given audit migration SQL strings, When inspected, Then no string concatenation artifacts (loose quotes or semicolons mid-SQL)", () => {
      const migrations = buildAuditMigrations();
      for (const m of migrations) {
        // No unmatched single quotes outside of valid SQL string literals
        // Simple heuristic: count of single-quotes should be even (balanced pairs)
        const singleQuoteCount = (m.up.match(/'/g) || []).length;
        expect(singleQuoteCount % 2).toBe(0);
      }
    });
  });

  // ---- Duplicate version detection ----

  describe('Migration versions — uniqueness', () => {
    it("Given audit migrations array, When versions listed, Then all versions are unique (no duplicates)", () => {
      const migrations = buildAuditMigrations();
      const versions = migrations.map(m => m.version);
      const unique = new Set(versions);
      expect(unique.size).toBe(versions.length);
    });
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY TESTS
// ---------------------------------------------------------------------------

describe('AuditMigrations — BOUNDARY TESTS', () => {
  // ---- Minimum migration count ----

  describe('buildAuditMigrations() — at least 2 migrations', () => {
    it("Given buildAuditMigrations() called, When count checked, Then returns at least 2 migrations (table + indexes)", () => {
      const migrations = buildAuditMigrations();
      expect(migrations.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ---- up and down SQL present ----

  describe('Migration structure — up and down SQL', () => {
    it("Given audit migrations, When each migration inspected, Then all have non-empty up SQL", () => {
      const migrations = buildAuditMigrations();
      for (const m of migrations) {
        expect(m.up).toBeDefined();
        expect(m.up.trim().length).toBeGreaterThan(0);
      }
    });

    it("Given audit migrations, When each migration inspected, Then all have down SQL (reversible)", () => {
      const migrations = buildAuditMigrations();
      for (const m of migrations) {
        expect(m.down).toBeDefined();
        expect((m.down ?? '').trim().length).toBeGreaterThan(0);
      }
    });
  });

  // ---- Version ordering ----

  describe('Migration version ordering', () => {
    it("Given audit migrations, When sorted by version, Then versions are already in ascending order", () => {
      const migrations = buildAuditMigrations();
      const versions = migrations.map(m => m.version);
      const sorted = [...versions].sort((a, b) => a - b);
      expect(versions).toEqual(sorted);
    });
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH
// ---------------------------------------------------------------------------

describe('AuditMigrations — GOLDEN PATH', () => {
  // ---- audit_events table creation ----

  describe('Migration creates audit_events table', () => {
    it("Given buildAuditMigrations(), When up SQL inspected, Then at least one migration creates audit_events table", () => {
      const migrations = buildAuditMigrations();
      const createsSql = migrations.some(m =>
        m.up.toUpperCase().includes('CREATE TABLE') &&
        m.up.toLowerCase().includes('audit_events')
      );
      expect(createsSql).toBe(true);
    });

    it("Given audit_events CREATE TABLE SQL, When columns inspected, Then includes id column", () => {
      const migrations = buildAuditMigrations();
      const tableMigration = migrations.find(m =>
        m.up.toLowerCase().includes('create table') && m.up.toLowerCase().includes('audit_events')
      );
      expect(tableMigration).toBeDefined();
      expect(tableMigration!.up.toLowerCase()).toMatch(/\bid\b/);
    });

    it("Given audit_events CREATE TABLE SQL, When columns inspected, Then includes tenant_id column", () => {
      const migrations = buildAuditMigrations();
      const tableMigration = migrations.find(m =>
        m.up.toLowerCase().includes('create table') && m.up.toLowerCase().includes('audit_events')
      );
      expect(tableMigration).toBeDefined();
      expect(tableMigration!.up.toLowerCase()).toMatch(/tenant_id/);
    });

    it("Given audit_events CREATE TABLE SQL, When columns inspected, Then includes actor column", () => {
      const migrations = buildAuditMigrations();
      const tableMigration = migrations.find(m =>
        m.up.toLowerCase().includes('create table') && m.up.toLowerCase().includes('audit_events')
      );
      expect(tableMigration!.up.toLowerCase()).toMatch(/\bactor\b/);
    });

    it("Given audit_events CREATE TABLE SQL, When columns inspected, Then includes action column", () => {
      const migrations = buildAuditMigrations();
      const tableMigration = migrations.find(m =>
        m.up.toLowerCase().includes('create table') && m.up.toLowerCase().includes('audit_events')
      );
      expect(tableMigration!.up.toLowerCase()).toMatch(/\baction\b/);
    });

    it("Given audit_events CREATE TABLE SQL, When columns inspected, Then includes resource and resource_type columns", () => {
      const migrations = buildAuditMigrations();
      const tableMigration = migrations.find(m =>
        m.up.toLowerCase().includes('create table') && m.up.toLowerCase().includes('audit_events')
      );
      expect(tableMigration!.up.toLowerCase()).toMatch(/resource/);
    });

    it("Given audit_events CREATE TABLE SQL, When columns inspected, Then includes timestamp column", () => {
      const migrations = buildAuditMigrations();
      const tableMigration = migrations.find(m =>
        m.up.toLowerCase().includes('create table') && m.up.toLowerCase().includes('audit_events')
      );
      expect(tableMigration!.up.toLowerCase()).toMatch(/timestamp/);
    });

    it("Given audit_events CREATE TABLE SQL, When columns inspected, Then includes metadata JSONB column", () => {
      const migrations = buildAuditMigrations();
      const tableMigration = migrations.find(m =>
        m.up.toLowerCase().includes('create table') && m.up.toLowerCase().includes('audit_events')
      );
      expect(tableMigration!.up.toUpperCase()).toMatch(/JSONB/);
    });

    it("Given audit_events CREATE TABLE SQL, When columns inspected, Then includes previous_hash and hash columns", () => {
      const migrations = buildAuditMigrations();
      const tableMigration = migrations.find(m =>
        m.up.toLowerCase().includes('create table') && m.up.toLowerCase().includes('audit_events')
      );
      expect(tableMigration!.up.toLowerCase()).toMatch(/previous_hash/);
      expect(tableMigration!.up.toLowerCase()).toMatch(/\bhash\b/);
    });
  });

  // ---- Index creation ----

  describe('Migration creates indexes on tenant_id and timestamp', () => {
    it("Given buildAuditMigrations(), When up SQL inspected, Then at least one migration creates index on tenant_id", () => {
      const migrations = buildAuditMigrations();
      const hasIndex = migrations.some(m =>
        m.up.toUpperCase().includes('CREATE INDEX') &&
        m.up.toLowerCase().includes('tenant_id')
      );
      expect(hasIndex).toBe(true);
    });

    it("Given buildAuditMigrations(), When up SQL inspected, Then at least one migration creates index on timestamp", () => {
      const migrations = buildAuditMigrations();
      const hasIndex = migrations.some(m =>
        m.up.toUpperCase().includes('CREATE INDEX') &&
        m.up.toLowerCase().includes('timestamp')
      );
      expect(hasIndex).toBe(true);
    });
  });

  // ---- Down migration drops table and indexes ----

  describe('Down migration — drops table and indexes', () => {
    it("Given audit migrations with down SQL, When down SQL inspected, Then includes DROP TABLE audit_events", () => {
      const migrations = buildAuditMigrations();
      const hasDropTable = migrations.some(m =>
        m.down?.toUpperCase().includes('DROP TABLE') &&
        m.down?.toLowerCase().includes('audit_events')
      );
      expect(hasDropTable).toBe(true);
    });

    it("Given audit migrations with down SQL, When index migration down SQL inspected, Then includes DROP INDEX", () => {
      const migrations = buildAuditMigrations();
      const indexMigration = migrations.find(m =>
        m.up.toUpperCase().includes('CREATE INDEX')
      );
      if (indexMigration) {
        expect(indexMigration.down?.toUpperCase()).toMatch(/DROP INDEX/);
      }
    });
  });
});

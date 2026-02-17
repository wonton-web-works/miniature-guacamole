/**
 * VectorSearchMigrations Unit Tests — WS-ENT-6
 *
 * Tests the migration SQL definitions for pgvector extension and embedding column.
 * Does NOT require a running Postgres instance.
 *
 * AC-ENT-6.1: pgvector extension configured in migrations
 *
 * Test order (misuse-first CAD protocol):
 *   1. MISUSE CASES  — version collisions with platform schema (3000+), SQL injection
 *                      in migration strings, missing down migrations, invalid builders
 *   2. BOUNDARY TESTS — version range edges, empty migration subsets, idempotency guards
 *   3. GOLDEN PATH   — correct SQL content, version ordering, up/down completeness
 */

import { describe, it, expect } from 'vitest';

// Import from paths that do NOT exist yet — tests will be RED until implementation
import {
  buildVectorMigrations,
  VECTOR_SCHEMA_VERSION_START,
} from '../../../../enterprise/src/vector/vector-migrations';

// Also import Migration type for type assertions
import type { Migration } from '../../../../enterprise/src/storage/migrations';

// ===========================================================================
// MISUSE CASES
// ===========================================================================

describe('VectorSearchMigrations — MISUSE CASES', () => {
  // ---- Version collision safety ----

  describe('Version range — must not collide with platform schema', () => {
    it('Given vector migrations, When version start checked, Then all versions are >= 4000', () => {
      // AC-ENT-6.1: Must use 4000+ range to avoid collision with platform schema (3000+)
      const migrations = buildVectorMigrations();
      migrations.forEach((m: Migration) => {
        expect(m.version).toBeGreaterThanOrEqual(4000);
      });
    });

    it('Given VECTOR_SCHEMA_VERSION_START constant, Then it is >= 4000', () => {
      expect(VECTOR_SCHEMA_VERSION_START).toBeGreaterThanOrEqual(4000);
    });

    it('Given vector migrations, When versions listed, Then no version is in the 3000-3999 range (platform schema)', () => {
      const migrations = buildVectorMigrations();
      const hasCollision = migrations.some((m: Migration) => m.version >= 3000 && m.version < 4000);
      expect(hasCollision).toBe(false);
    });

    it('Given vector migrations, When versions listed, Then no version is in 1000-2999 range (postgres adapter + RLS migrations)', () => {
      const migrations = buildVectorMigrations();
      const hasCollision = migrations.some((m: Migration) => m.version >= 1000 && m.version < 3000);
      expect(hasCollision).toBe(false);
    });
  });

  // ---- No SQL injection in migration strings ----

  describe('Migration SQL — no dynamic interpolation or injection risk', () => {
    it('Given all migration up SQL, When inspected, Then no template literal placeholders (${}) appear', () => {
      const migrations = buildVectorMigrations();
      const allUpSql = migrations.map((m: Migration) => m.up).join('\n');
      expect(allUpSql).not.toMatch(/\$\{/);
    });

    it('Given all migration down SQL, When inspected, Then no template literal placeholders appear', () => {
      const migrations = buildVectorMigrations();
      const allDownSql = migrations
        .filter((m: Migration) => m.down)
        .map((m: Migration) => m.down!)
        .join('\n');
      if (allDownSql.length > 0) {
        expect(allDownSql).not.toMatch(/\$\{/);
      }
    });

    it('Given all migration SQL, When inspected, Then no string concatenation with user-controlled data', () => {
      const migrations = buildVectorMigrations();
      const allSql = migrations.map((m: Migration) => m.up + (m.down || '')).join('\n');
      // No eval-like patterns
      expect(allSql).not.toMatch(/eval\s*\(/);
    });
  });

  // ---- Duplicate version prevention ----

  describe('Duplicate version detection', () => {
    it('Given buildVectorMigrations(), When called multiple times, Then returns same versions (no random generation)', () => {
      const m1 = buildVectorMigrations();
      const m2 = buildVectorMigrations();
      expect(m1.map((m: Migration) => m.version)).toEqual(m2.map((m: Migration) => m.version));
    });

    it('Given vector migrations, When versions counted, Then no duplicate version numbers', () => {
      const migrations = buildVectorMigrations();
      const versions = migrations.map((m: Migration) => m.version);
      const uniqueVersions = new Set(versions);
      expect(uniqueVersions.size).toBe(versions.length);
    });
  });
});

// ===========================================================================
// BOUNDARY TESTS
// ===========================================================================

describe('VectorSearchMigrations — BOUNDARY TESTS', () => {
  describe('Migration count and completeness', () => {
    it('Given buildVectorMigrations(), When called, Then returns at least 3 migrations (extension + column + index)', () => {
      const migrations = buildVectorMigrations();
      expect(migrations.length).toBeGreaterThanOrEqual(3);
    });

    it('Given all migrations, When each checked, Then every migration has a non-empty up SQL', () => {
      const migrations = buildVectorMigrations();
      migrations.forEach((m: Migration) => {
        expect(m.up).toBeTruthy();
        expect(m.up.trim().length).toBeGreaterThan(0);
      });
    });

    it('Given all migrations, When each checked, Then every migration has a down SQL for reversibility', () => {
      // AC-ENT-6.1: down migrations must reverse each step
      const migrations = buildVectorMigrations();
      migrations.forEach((m: Migration) => {
        expect(m.down).toBeTruthy();
        expect(m.down!.trim().length).toBeGreaterThan(0);
      });
    });
  });

  describe('Version ordering', () => {
    it('Given vector migrations, When sorted by version, Then already in ascending order', () => {
      const migrations = buildVectorMigrations();
      const versions = migrations.map((m: Migration) => m.version);
      const sorted = [...versions].sort((a, b) => a - b);
      expect(versions).toEqual(sorted);
    });

    it('Given first migration, When version checked, Then equals VECTOR_SCHEMA_VERSION_START (4000)', () => {
      const migrations = buildVectorMigrations();
      expect(migrations[0].version).toBe(VECTOR_SCHEMA_VERSION_START);
      expect(migrations[0].version).toBe(4000);
    });
  });

  describe('Idempotency SQL guards', () => {
    it('Given extension migration up SQL, When checked, Then uses CREATE EXTENSION IF NOT EXISTS (idempotent)', () => {
      const migrations = buildVectorMigrations();
      // Migration 4000: CREATE EXTENSION
      const extensionMigration = migrations.find((m: Migration) => m.version === 4000);
      expect(extensionMigration).toBeDefined();
      expect(extensionMigration!.up).toMatch(/CREATE EXTENSION IF NOT EXISTS/i);
    });

    it('Given column migration up SQL, When checked, Then uses ADD COLUMN IF NOT EXISTS (idempotent)', () => {
      const migrations = buildVectorMigrations();
      // Migration 4001: ADD COLUMN for embedding
      const columnMigration = migrations.find((m: Migration) => m.version === 4001);
      expect(columnMigration).toBeDefined();
      expect(columnMigration!.up).toMatch(/ADD COLUMN IF NOT EXISTS/i);
    });

    it('Given extension down SQL, When checked, Then uses DROP EXTENSION IF EXISTS (safe rollback)', () => {
      const migrations = buildVectorMigrations();
      const extensionMigration = migrations.find((m: Migration) => m.version === 4000);
      expect(extensionMigration?.down).toMatch(/DROP EXTENSION IF EXISTS/i);
    });
  });
});

// ===========================================================================
// GOLDEN PATH
// ===========================================================================

describe('VectorSearchMigrations — GOLDEN PATH', () => {
  describe('Migration 4000: pgvector extension', () => {
    it('Given migration 4000, When up SQL checked, Then installs pgvector extension', () => {
      const migrations = buildVectorMigrations();
      const m = migrations.find((m: Migration) => m.version === 4000)!;
      expect(m.up).toMatch(/vector/i);
      expect(m.up).toMatch(/CREATE EXTENSION/i);
    });

    it('Given migration 4000 down SQL, When checked, Then drops vector extension', () => {
      const migrations = buildVectorMigrations();
      const m = migrations.find((m: Migration) => m.version === 4000)!;
      expect(m.down).toMatch(/DROP EXTENSION/i);
      expect(m.down).toMatch(/vector/i);
    });
  });

  describe('Migration 4001: embedding column on memory_entries', () => {
    it('Given migration 4001, When up SQL checked, Then alters memory_entries table', () => {
      const migrations = buildVectorMigrations();
      const m = migrations.find((m: Migration) => m.version === 4001)!;
      expect(m.up).toMatch(/ALTER TABLE/i);
      expect(m.up).toMatch(/memory_entries/i);
    });

    it('Given migration 4001, When up SQL checked, Then adds embedding column of vector type', () => {
      const migrations = buildVectorMigrations();
      const m = migrations.find((m: Migration) => m.version === 4001)!;
      expect(m.up).toMatch(/embedding/i);
      expect(m.up).toMatch(/vector\s*\(/i);
    });

    it('Given migration 4001, When up SQL checked, Then vector dimension is 768 (nomic default)', () => {
      const migrations = buildVectorMigrations();
      const m = migrations.find((m: Migration) => m.version === 4001)!;
      expect(m.up).toMatch(/vector\s*\(\s*768\s*\)/i);
    });

    it('Given migration 4001 down SQL, When checked, Then drops embedding column', () => {
      const migrations = buildVectorMigrations();
      const m = migrations.find((m: Migration) => m.version === 4001)!;
      expect(m.down).toMatch(/DROP COLUMN/i);
      expect(m.down).toMatch(/embedding/i);
    });
  });

  describe('Migration 4002: HNSW index on embedding column', () => {
    it('Given migration 4002, When up SQL checked, Then creates index on embedding column', () => {
      const migrations = buildVectorMigrations();
      const m = migrations.find((m: Migration) => m.version === 4002)!;
      expect(m.up).toMatch(/CREATE INDEX/i);
      expect(m.up).toMatch(/embedding/i);
    });

    it('Given migration 4002, When up SQL checked, Then uses HNSW index type for fast similarity search', () => {
      const migrations = buildVectorMigrations();
      const m = migrations.find((m: Migration) => m.version === 4002)!;
      // HNSW = hierarchical navigable small world, pgvector's fastest index
      expect(m.up).toMatch(/hnsw/i);
    });

    it('Given migration 4002, When up SQL checked, Then specifies vector_cosine_ops for cosine similarity', () => {
      const migrations = buildVectorMigrations();
      const m = migrations.find((m: Migration) => m.version === 4002)!;
      expect(m.up).toMatch(/vector_cosine_ops/i);
    });

    it('Given migration 4002 down SQL, When checked, Then drops the HNSW index', () => {
      const migrations = buildVectorMigrations();
      const m = migrations.find((m: Migration) => m.version === 4002)!;
      expect(m.down).toMatch(/DROP INDEX/i);
    });
  });

  describe('Overall structure', () => {
    it('Given all migrations, When returned as array, Then they conform to Migration interface', () => {
      const migrations = buildVectorMigrations();
      migrations.forEach((m: Migration) => {
        expect(typeof m.version).toBe('number');
        expect(typeof m.up).toBe('string');
        if (m.down !== undefined) {
          expect(typeof m.down).toBe('string');
        }
      });
    });

    it('Given buildVectorMigrations(), When called, Then returns a plain array (not undefined/null)', () => {
      const migrations = buildVectorMigrations();
      expect(Array.isArray(migrations)).toBe(true);
    });
  });
});

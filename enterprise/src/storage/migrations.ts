/**
 * MigrationRunner — WS-ENT-2
 *
 * Schema migration system for PostgreSQL.
 * AC-ENT-2.6: Migration system for schema versioning
 *
 * Features:
 * - Versioned migrations with up/down SQL
 * - Idempotent — safe to re-run
 * - Tracks applied versions in schema_migrations table
 * - Runs in ascending version order
 */

import { Pool } from 'pg';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Migration {
  version: number;
  up: string;
  down?: string;
}

export interface MigrationResult {
  success: boolean;
  applied: number[];
  error?: string;
}

export interface RollbackResult {
  success: boolean;
  error?: string;
}

export interface MigrationRunnerConfig {
  connectionString: string;
  maxConnections?: number;
}

// ---------------------------------------------------------------------------
// MigrationRunner
// ---------------------------------------------------------------------------

export class MigrationRunner {
  private pool: Pool;

  constructor(config: MigrationRunnerConfig) {
    this.pool = new Pool({
      connectionString: config.connectionString,
      max: config.maxConnections,
    });
  }

  /**
   * Ensure the schema_migrations tracking table exists.
   */
  private async ensureMigrationsTable(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version BIGINT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  }

  /**
   * Get list of already-applied migration versions.
   */
  private async getAppliedVersions(): Promise<number[]> {
    const result = await this.pool.query(
      'SELECT version FROM schema_migrations ORDER BY version ASC'
    );
    return result.rows.map((r: any) => Number(r.version));
  }

  /**
   * Run all pending migrations in ascending version order.
   */
  async runMigrations(migrations: Migration[]): Promise<MigrationResult> {
    if (!migrations || !Array.isArray(migrations)) {
      throw new Error('migrations must be an array');
    }

    // Empty array is a valid no-op
    if (migrations.length === 0) {
      return { success: true, applied: [] };
    }

    // Validate each migration
    for (const m of migrations) {
      if (m.version === undefined || m.version === null) {
        throw new Error('Migration must have a version');
      }
      if (!m.up) {
        throw new Error('Migration must have up SQL');
      }
    }

    // Check for duplicate versions
    const versions = migrations.map(m => m.version);
    const uniqueVersions = new Set(versions);
    if (uniqueVersions.size !== versions.length) {
      throw new Error('Duplicate migration versions detected — conflict');
    }

    // Sort by version ascending
    const sorted = [...migrations].sort((a, b) => a.version - b.version);

    // Ensure schema_migrations table exists
    await this.ensureMigrationsTable();

    // Get already-applied versions
    const applied = await this.getAppliedVersions();
    const appliedSet = new Set(applied);

    const newlyApplied: number[] = [];

    for (const migration of sorted) {
      if (appliedSet.has(migration.version)) {
        // Already applied — skip
        continue;
      }

      // Run up migration
      await this.pool.query(migration.up);

      // Record as applied
      await this.pool.query(
        'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING',
        [migration.version]
      );

      newlyApplied.push(migration.version);
    }

    return { success: true, applied: newlyApplied };
  }

  /**
   * Roll back a specific migration version.
   * Requires the migration definition (with down SQL) to execute.
   */
  async rollback(version: number, migrations?: Migration[]): Promise<RollbackResult> {
    if (version < 0) {
      return { success: false, error: 'Version must be a non-negative number' };
    }

    // Check if the version was applied
    const result = await this.pool.query(
      'SELECT version FROM schema_migrations WHERE version = $1',
      [version]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Migration version not found or not applied' };
    }

    // Find the migration definition
    const migration = migrations?.find(m => m.version === version);

    if (migration?.down) {
      await this.pool.query(migration.down);
    }

    // Remove from schema_migrations
    await this.pool.query('DELETE FROM schema_migrations WHERE version = $1', [version]);

    return { success: true };
  }

  /**
   * Clean up the pool.
   */
  async close(): Promise<void> {
    try {
      await this.pool.end();
    } catch {
      // Graceful degradation
    }
  }
}

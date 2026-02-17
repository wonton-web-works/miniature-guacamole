/**
 * RLS Policies — WS-ENT-3
 *
 * Defines Row-Level Security policy migrations for tenant-scoped tables.
 * Each table gets:
 *   - An ALTER TABLE ... ADD COLUMN IF NOT EXISTS tenant_id TEXT
 *   - ENABLE ROW LEVEL SECURITY (regular users can't bypass)
 *   - FORCE ROW LEVEL SECURITY (table owner / superuser can't bypass)
 *   - DROP POLICY IF EXISTS (idempotency guard)
 *   - CREATE POLICY for SELECT: USING (tenant_id = current_setting('app.current_tenant', true))
 *   - CREATE POLICY for ALL: USING + WITH CHECK
 *
 * Rollback (down) SQL:
 *   - DROP POLICY IF EXISTS
 *   - DISABLE ROW LEVEL SECURITY
 *   - ALTER TABLE ... DROP COLUMN IF EXISTS tenant_id
 *
 * AC-ENT-3.1: RLS policies on all tenant-scoped tables
 */

import type { Migration } from '../storage/migrations';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * All tables that must have tenant-scoped RLS policies.
 * Any table NOT in this list will be rejected by buildRlsMigrations().
 */
export const TENANT_SCOPED_TABLES = ['memory_entries', 'agent_events'] as const;
export type TenantScopedTable = typeof TENANT_SCOPED_TABLES[number];

/**
 * Migration versions for RLS policies start at this number.
 * Chosen to be above WS-ENT-2 migrations (which end in the 1000s range).
 */
export const RLS_MIGRATION_VERSION_START = 2000;

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------

export interface RlsPolicyDefinition {
  tableName: string;
  policyName: string;
  using: string;
  check?: string;
}

// ---------------------------------------------------------------------------
// SQL builder helpers
// ---------------------------------------------------------------------------

function buildUpSqlForTable(table: string, version: number): string {
  const selectPolicyName = `tenant_isolation_${table}_select`;
  const allPolicyName = `tenant_isolation_${table}_all`;
  const tenantExpr = `current_setting('app.current_tenant', true)`;

  return `
-- Migration ${version}: Add tenant_id column and RLS policies to ${table}
ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS tenant_id TEXT;

ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ${selectPolicyName} ON ${table};
DROP POLICY IF EXISTS ${allPolicyName} ON ${table};

CREATE POLICY ${selectPolicyName} ON ${table}
  FOR SELECT
  USING (tenant_id = ${tenantExpr});

CREATE POLICY ${allPolicyName} ON ${table}
  FOR ALL
  USING (tenant_id = ${tenantExpr})
  WITH CHECK (tenant_id = ${tenantExpr});
`.trim();
}

function buildDownSqlForTable(table: string): string {
  const selectPolicyName = `tenant_isolation_${table}_select`;
  const allPolicyName = `tenant_isolation_${table}_all`;

  return `
-- Rollback: Remove tenant_id column and RLS policies from ${table}
DROP POLICY IF EXISTS ${selectPolicyName} ON ${table};
DROP POLICY IF EXISTS ${allPolicyName} ON ${table};

ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;
ALTER TABLE ${table} DROP COLUMN IF EXISTS tenant_id;
`.trim();
}

// ---------------------------------------------------------------------------
// buildRlsMigrations
// ---------------------------------------------------------------------------

/**
 * Build an array of Migration objects for RLS policies.
 *
 * @param tables - Which tables to build policies for (default: all TENANT_SCOPED_TABLES)
 *                 Throws if any table name is not in TENANT_SCOPED_TABLES.
 *                 Throws if null is passed.
 *                 Returns empty array if empty array is passed.
 */
export function buildRlsMigrations(
  tables: readonly string[] = TENANT_SCOPED_TABLES
): Migration[] {
  if (tables === null || tables === undefined) {
    throw new Error('tables argument cannot be null');
  }

  if (!Array.isArray(tables)) {
    throw new Error('tables argument must be an array');
  }

  // Empty array is a valid no-op
  if (tables.length === 0) {
    return [];
  }

  // Validate all table names against the allowed list
  for (const table of tables) {
    if (!(TENANT_SCOPED_TABLES as readonly string[]).includes(table)) {
      throw new Error(
        `Table '${table}' is not in TENANT_SCOPED_TABLES. Only the following tables are allowed: ${TENANT_SCOPED_TABLES.join(', ')}`
      );
    }
  }

  // Build one migration per table, with ascending version numbers
  const migrations: Migration[] = tables.map((table, index) => ({
    version: RLS_MIGRATION_VERSION_START + index,
    up: buildUpSqlForTable(table, RLS_MIGRATION_VERSION_START + index),
    down: buildDownSqlForTable(table),
  }));

  return migrations;
}

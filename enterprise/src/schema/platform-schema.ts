/**
 * Platform Schema Migrations — WS-ENT-4
 *
 * Defines migration SQL for the shared platform tables:
 * projects, users, roles, permissions, role_permissions, user_roles, assets
 * and extends agent_events with project_id FK.
 *
 * AC-ENT-4.1: projects, users, roles, permissions with proper constraints
 * AC-ENT-4.2: assets table with S3/R2 reference pattern
 * AC-ENT-4.3: agent_events extended with project_id FK
 * AC-ENT-4.4: Cross-app project references via UUID foreign keys
 * AC-ENT-4.5: RBAC permission model (role_permissions, user_roles join tables)
 */

import type { Migration } from '../storage/migrations';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Platform schema migration versions start here.
 * Must not collide with RLS migrations (WS-ENT-3) which start at 2000.
 * Using 3000+ range to be safely above both WS-ENT-2 (1000s) and WS-ENT-3 (2000s).
 */
export const PLATFORM_SCHEMA_VERSION_START = 3000;

/**
 * All platform tables supported by buildPlatformSchemaMigrations().
 */
export const PLATFORM_TABLES = [
  'projects',
  'users',
  'roles',
  'permissions',
  'role_permissions',
  'user_roles',
  'assets',
  'agent_events',
] as const;

export type PlatformTable = typeof PLATFORM_TABLES[number];

// ---------------------------------------------------------------------------
// SQL builders
// ---------------------------------------------------------------------------

function buildUpSql(table: PlatformTable, version: number): string {
  switch (table) {
    case 'projects':
      return `
-- Migration ${version}: Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);
`.trim();

    case 'users':
      return `
-- Migration ${version}: Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, email)
);
`.trim();

    case 'roles':
      return `
-- Migration ${version}: Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);
`.trim();

    case 'permissions':
      return `
-- Migration ${version}: Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (resource, action)
);
`.trim();

    case 'role_permissions':
      return `
-- Migration ${version}: Create role_permissions join table
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);
`.trim();

    case 'user_roles':
      return `
-- Migration ${version}: Create user_roles join table
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);
`.trim();

    case 'assets':
      return `
-- Migration ${version}: Create assets table
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  project_id UUID REFERENCES projects (id) ON DELETE SET NULL,
  storage_key TEXT NOT NULL,
  bucket TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  filename TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`.trim();

    case 'agent_events':
      return `
-- Migration ${version}: Extend agent_events with project_id FK
ALTER TABLE agent_events ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects (id) ON DELETE SET NULL;
`.trim();
  }
}

function buildDownSql(table: PlatformTable): string {
  switch (table) {
    case 'projects':
      return `
-- Rollback: Drop projects table
DROP TABLE IF EXISTS projects;
`.trim();

    case 'users':
      return `
-- Rollback: Drop users table
DROP TABLE IF EXISTS users;
`.trim();

    case 'roles':
      return `
-- Rollback: Drop roles table
DROP TABLE IF EXISTS roles;
`.trim();

    case 'permissions':
      return `
-- Rollback: Drop permissions table
DROP TABLE IF EXISTS permissions;
`.trim();

    case 'role_permissions':
      return `
-- Rollback: Drop role_permissions table
DROP TABLE IF EXISTS role_permissions;
`.trim();

    case 'user_roles':
      return `
-- Rollback: Drop user_roles table
DROP TABLE IF EXISTS user_roles;
`.trim();

    case 'assets':
      return `
-- Rollback: Drop assets table
DROP TABLE IF EXISTS assets;
`.trim();

    case 'agent_events':
      return `
-- Rollback: Remove project_id column from agent_events
ALTER TABLE agent_events DROP COLUMN IF EXISTS project_id;
`.trim();
  }
}

// ---------------------------------------------------------------------------
// buildPlatformSchemaMigrations
// ---------------------------------------------------------------------------

/**
 * Build an array of Migration objects for the platform schema.
 *
 * @param tables - Which tables to build (default: all PLATFORM_TABLES).
 *                 Throws if null is passed.
 *                 Throws if non-array is passed.
 *                 Throws if unknown table name is in array.
 *                 Returns empty array if empty array is passed.
 */
export function buildPlatformSchemaMigrations(
  tables: readonly string[] = PLATFORM_TABLES
): Migration[] {
  if (tables === null || tables === undefined) {
    throw new Error('tables argument cannot be null');
  }

  if (!Array.isArray(tables)) {
    throw new Error('tables argument must be an array');
  }

  if (tables.length === 0) {
    return [];
  }

  for (const table of tables) {
    if (!(PLATFORM_TABLES as readonly string[]).includes(table)) {
      throw new Error(
        `Table '${table}' is not a valid platform table. Allowed: ${PLATFORM_TABLES.join(', ')}`
      );
    }
  }

  return tables.map((table, index) => {
    const t = table as PlatformTable;
    const version = PLATFORM_SCHEMA_VERSION_START + index;
    return {
      version,
      up: buildUpSql(t, version),
      down: buildDownSql(t),
    };
  });
}

// ---------------------------------------------------------------------------
// Default export: all platform schema migrations
// ---------------------------------------------------------------------------

export const PLATFORM_SCHEMA_MIGRATIONS: Migration[] = buildPlatformSchemaMigrations();

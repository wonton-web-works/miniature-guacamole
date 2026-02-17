/**
 * RBAC Helper Functions — WS-ENT-4
 *
 * Permission checking, role assignment/revocation, and permission aggregation.
 * All queries use parameterized SQL — never string interpolation.
 *
 * AC-ENT-4.5: RBAC permission model (role -> permission mapping, user -> role assignment)
 */

import { Pool } from 'pg';
import type { Permission, Role } from './models';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RbacConfig {
  connectionString: string;
}

export interface PermissionCheckInput extends RbacConfig {
  userId: string;
  tenantId: string;
  resource: string;
  action: string;
}

export interface RoleAssignInput extends RbacConfig {
  userId: string;
  roleId: string;
  tenantId: string;
}

export interface UserPermissionsInput extends RbacConfig {
  userId: string;
  tenantId: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validatePermissionCheckInput(input: PermissionCheckInput): void {
  if (!input.userId) throw new Error('userId is required');
  if (!input.tenantId) throw new Error('tenantId is required');
  if (!input.resource) throw new Error('resource is required');
  if (!input.action) throw new Error('action is required');
}

function validateUserPermissionsInput(input: UserPermissionsInput): void {
  if (!input.userId) throw new Error('userId is required');
  if (!input.tenantId) throw new Error('tenantId is required');
}

// ---------------------------------------------------------------------------
// hasPermission
// ---------------------------------------------------------------------------

/**
 * Check whether a user has a specific permission in a given tenant context.
 *
 * Flow:
 *   1. Query user's roles for this tenant (user_roles JOIN roles, scoped by tenant_id)
 *   2. If no roles, return false
 *   3. Query permissions for those roles
 *   4. If exact resource+action match found, return true; else false
 */
export async function hasPermission(input: PermissionCheckInput): Promise<boolean> {
  validatePermissionCheckInput(input);

  const pool = new Pool({ connectionString: input.connectionString });

  try {
    // Step 1: get user's roles for this tenant
    const rolesResult = await pool.query(
      `SELECT r.id, r.name FROM roles r
       INNER JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = $1 AND ur.tenant_id = $2`,
      [input.userId, input.tenantId]
    );

    if (rolesResult.rows.length === 0) {
      return false;
    }

    // Step 2: get permissions for those roles
    const roleIds = rolesResult.rows.map((r: any) => r.id);
    // Use unnest to pass array safely — no interpolation
    const permsResult = await pool.query(
      `SELECT p.resource, p.action FROM permissions p
       INNER JOIN role_permissions rp ON rp.permission_id = p.id
       WHERE rp.role_id = ANY($1)`,
      [roleIds]
    );

    // Step 3: exact match
    return permsResult.rows.some(
      (p: any) => p.resource === input.resource && p.action === input.action
    );
  } finally {
    try { await pool.end(); } catch { /* graceful */ }
  }
}

// ---------------------------------------------------------------------------
// checkPermissionOrThrow
// ---------------------------------------------------------------------------

/**
 * Same as hasPermission but throws an error if permission is denied.
 */
export async function checkPermissionOrThrow(input: PermissionCheckInput): Promise<void> {
  const allowed = await hasPermission(input);
  if (!allowed) {
    throw new Error(`Unauthorized: permission denied for ${input.resource}:${input.action}`);
  }
}

// ---------------------------------------------------------------------------
// assignRole
// ---------------------------------------------------------------------------

/**
 * Assign a role to a user in a tenant context.
 * Idempotent — uses ON CONFLICT DO NOTHING.
 */
export async function assignRole(input: RoleAssignInput): Promise<void> {
  if (!input.userId) throw new Error('userId is required');
  if (!input.roleId) throw new Error('roleId is required');
  if (!input.tenantId) throw new Error('tenantId is required');

  const pool = new Pool({ connectionString: input.connectionString });

  try {
    await pool.query(
      `INSERT INTO user_roles (user_id, role_id, tenant_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      [input.userId, input.roleId, input.tenantId]
    );
  } finally {
    try { await pool.end(); } catch { /* graceful */ }
  }
}

// ---------------------------------------------------------------------------
// revokeRole
// ---------------------------------------------------------------------------

/**
 * Revoke a role from a user. Idempotent — no error if role not assigned.
 */
export async function revokeRole(input: RoleAssignInput): Promise<void> {
  if (!input.userId) throw new Error('userId is required');
  if (!input.roleId) throw new Error('roleId is required');

  const pool = new Pool({ connectionString: input.connectionString });

  try {
    await pool.query(
      `DELETE FROM user_roles
       WHERE user_id = $1 AND role_id = $2`,
      [input.userId, input.roleId]
    );
  } finally {
    try { await pool.end(); } catch { /* graceful */ }
  }
}

// ---------------------------------------------------------------------------
// getUserPermissions
// ---------------------------------------------------------------------------

/**
 * Get all permissions for a user in a tenant context, aggregated across all roles.
 * Results are deduplicated by permission id.
 */
export async function getUserPermissions(input: UserPermissionsInput): Promise<Permission[]> {
  validateUserPermissionsInput(input);

  const pool = new Pool({ connectionString: input.connectionString });

  try {
    // Step 1: get user's roles for this tenant
    const rolesResult = await pool.query(
      `SELECT r.id FROM roles r
       INNER JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = $1 AND ur.tenant_id = $2`,
      [input.userId, input.tenantId]
    );

    if (rolesResult.rows.length === 0) {
      return [];
    }

    // Step 2: get permissions for those roles
    const roleIds = rolesResult.rows.map((r: any) => r.id);
    const permsResult = await pool.query(
      `SELECT p.* FROM permissions p
       INNER JOIN role_permissions rp ON rp.permission_id = p.id
       WHERE rp.role_id = ANY($1)`,
      [roleIds]
    );

    // Step 3: deduplicate by id
    const seen = new Set<string>();
    const permissions: Permission[] = [];
    for (const row of permsResult.rows) {
      if (!seen.has(row.id)) {
        seen.add(row.id);
        permissions.push(row as Permission);
      }
    }

    return permissions;
  } finally {
    try { await pool.end(); } catch { /* graceful */ }
  }
}

// ---------------------------------------------------------------------------
// getUserRoles
// ---------------------------------------------------------------------------

/**
 * Get all roles for a user in a tenant context.
 */
export async function getUserRoles(input: UserPermissionsInput): Promise<Role[]> {
  validateUserPermissionsInput(input);

  const pool = new Pool({ connectionString: input.connectionString });

  try {
    const result = await pool.query(
      `SELECT r.* FROM roles r
       INNER JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = $1 AND ur.tenant_id = $2`,
      [input.userId, input.tenantId]
    );
    return result.rows as Role[];
  } finally {
    try { await pool.end(); } catch { /* graceful */ }
  }
}

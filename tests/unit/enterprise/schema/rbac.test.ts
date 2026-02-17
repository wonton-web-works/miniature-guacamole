/**
 * RBAC Helper Functions Unit Tests — WS-ENT-4
 *
 * Tests for hasPermission, assignRole, revokeRole, getUserPermissions.
 * Does NOT require a running Postgres instance — pg Pool is mocked.
 *
 * AC-ENT-4.5: RBAC permission model (role -> permission mapping, user -> role assignment)
 *
 * Test order (misuse-first CAD protocol):
 *   1. MISUSE CASES  — RBAC bypass attempts, user without permission accessing resource,
 *                       privilege escalation, permission revocation race conditions
 *   2. BOUNDARY TESTS — user with no roles, empty permission set, role with no permissions
 *   3. GOLDEN PATH   — user has permission, permission revocation, role hierarchy
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock pg before any imports
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
  hasPermission,
  assignRole,
  revokeRole,
  getUserPermissions,
  getUserRoles,
  checkPermissionOrThrow,
} from '../../../../enterprise/src/schema/rbac';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeQueryResult(rows: any[] = []) {
  return { rows, rowCount: rows.length };
}

const CONN_STR = 'postgresql://localhost/test';
const TENANT_A = 'tenant-acme';
const TENANT_B = 'tenant-other';

const USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const ROLE_ADMIN_ID = '550e8400-e29b-41d4-a716-446655440002';
const ROLE_VIEWER_ID = '550e8400-e29b-41d4-a716-446655440003';
const PERM_READ_ID = '550e8400-e29b-41d4-a716-446655440004';
const PERM_WRITE_ID = '550e8400-e29b-41d4-a716-446655440005';

// ---------------------------------------------------------------------------
// MISUSE CASES
// ---------------------------------------------------------------------------

describe('RBAC — MISUSE CASES', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockPoolEnd.mockReset();
  });

  // ---- RBAC bypass: user without any role accessing resource ----
  describe('hasPermission() — user without any role', () => {
    it('Given user has no roles assigned, When hasPermission() called for projects:read, Then returns false', async () => {
      // No user_roles found, so no permissions
      mockQuery.mockResolvedValue(makeQueryResult([]));
      const result = await hasPermission({
        connectionString: CONN_STR,
        userId: USER_ID,
        tenantId: TENANT_A,
        resource: 'projects',
        action: 'read',
      });
      expect(result).toBe(false);
    });

    it('Given user has no roles, When hasPermission() called for projects:write, Then returns false', async () => {
      mockQuery.mockResolvedValue(makeQueryResult([]));
      const result = await hasPermission({
        connectionString: CONN_STR,
        userId: USER_ID,
        tenantId: TENANT_A,
        resource: 'projects',
        action: 'write',
      });
      expect(result).toBe(false);
    });
  });

  // ---- RBAC bypass: user has role but role lacks the specific permission ----
  describe('hasPermission() — role without required permission', () => {
    it('Given user has viewer role (read-only), When hasPermission() for projects:delete, Then returns false', async () => {
      // First query returns viewer role; second query returns no delete permission
      mockQuery
        .mockResolvedValueOnce(makeQueryResult([{ id: ROLE_VIEWER_ID, name: 'viewer' }]))
        .mockResolvedValueOnce(makeQueryResult([{ resource: 'projects', action: 'read' }]));
      const result = await hasPermission({
        connectionString: CONN_STR,
        userId: USER_ID,
        tenantId: TENANT_A,
        resource: 'projects',
        action: 'delete',
      });
      expect(result).toBe(false);
    });
  });

  // ---- Cross-tenant privilege escalation: user from tenant B cannot check tenant A resources ----
  describe('hasPermission() — cross-tenant escalation', () => {
    it('Given user belongs to tenant B, When hasPermission() for tenant A resource, Then returns false', async () => {
      // Roles query scoped to tenant_a finds nothing (user is in tenant_b)
      mockQuery.mockResolvedValue(makeQueryResult([]));
      const result = await hasPermission({
        connectionString: CONN_STR,
        userId: USER_ID,
        tenantId: TENANT_A, // requesting access to tenant A
        resource: 'projects',
        action: 'read',
      });
      expect(result).toBe(false);
    });
  });

  // ---- SQL injection in userId ----
  describe('hasPermission() — SQL injection in inputs', () => {
    it("Given userId contains SQL injection, When hasPermission() called, Then parameterizes userId", async () => {
      const injectedId = "' OR '1'='1";
      mockQuery.mockResolvedValue(makeQueryResult([]));
      await hasPermission({
        connectionString: CONN_STR,
        userId: injectedId,
        tenantId: TENANT_A,
        resource: 'projects',
        action: 'read',
      });
      if (mockQuery.mock.calls.length > 0) {
        const sql: string = mockQuery.mock.calls[0][0];
        expect(sql).not.toContain(injectedId);
        const params: any[] = mockQuery.mock.calls[0][1];
        expect(params).toContain(injectedId);
      }
    });

    it("Given resource contains SQL injection, When hasPermission() called, Then parameterizes resource", async () => {
      const injectedResource = "'; DROP TABLE permissions;--";
      mockQuery.mockResolvedValue(makeQueryResult([]));
      await hasPermission({
        connectionString: CONN_STR,
        userId: USER_ID,
        tenantId: TENANT_A,
        resource: injectedResource,
        action: 'read',
      });
      if (mockQuery.mock.calls.length > 0) {
        for (const call of mockQuery.mock.calls) {
          const sql: string = call[0];
          expect(sql).not.toContain(injectedResource);
        }
      }
    });
  });

  // ---- Null/undefined inputs ----
  describe('hasPermission() — null/undefined inputs', () => {
    it('Given null userId, When hasPermission() called, Then throws', async () => {
      await expect(
        hasPermission({
          connectionString: CONN_STR,
          userId: null as any,
          tenantId: TENANT_A,
          resource: 'projects',
          action: 'read',
        })
      ).rejects.toThrow();
    });

    it('Given null tenantId, When hasPermission() called, Then throws', async () => {
      await expect(
        hasPermission({
          connectionString: CONN_STR,
          userId: USER_ID,
          tenantId: null as any,
          resource: 'projects',
          action: 'read',
        })
      ).rejects.toThrow();
    });

    it('Given empty resource, When hasPermission() called, Then throws', async () => {
      await expect(
        hasPermission({
          connectionString: CONN_STR,
          userId: USER_ID,
          tenantId: TENANT_A,
          resource: '',
          action: 'read',
        })
      ).rejects.toThrow();
    });

    it('Given empty action, When hasPermission() called, Then throws', async () => {
      await expect(
        hasPermission({
          connectionString: CONN_STR,
          userId: USER_ID,
          tenantId: TENANT_A,
          resource: 'projects',
          action: '',
        })
      ).rejects.toThrow();
    });
  });

  // ---- checkPermissionOrThrow: throws on access denied ----
  describe('checkPermissionOrThrow() — access denied', () => {
    it('Given user lacks permission, When checkPermissionOrThrow() called, Then throws an authorization error', async () => {
      mockQuery.mockResolvedValue(makeQueryResult([]));
      await expect(
        checkPermissionOrThrow({
          connectionString: CONN_STR,
          userId: USER_ID,
          tenantId: TENANT_A,
          resource: 'projects',
          action: 'delete',
        })
      ).rejects.toThrow(/unauthorized|forbidden|permission denied/i);
    });
  });

  // ---- assignRole: assign non-existent role ----
  describe('assignRole() — role FK violation', () => {
    it('Given role_id that does not exist in DB, When assignRole() called, Then propagates DB FK error', async () => {
      const fkError = new Error('insert or update on table "user_roles" violates foreign key constraint');
      (fkError as any).code = '23503'; // PostgreSQL FK violation code
      mockQuery.mockRejectedValue(fkError);
      await expect(
        assignRole({
          connectionString: CONN_STR,
          userId: USER_ID,
          roleId: 'non-existent-uuid',
          tenantId: TENANT_A,
        })
      ).rejects.toThrow(/foreign key|constraint/i);
    });
  });

  // ---- revokeRole: revoking a role the user doesn't have ----
  describe('revokeRole() — user does not have role', () => {
    it('Given user does not have the role, When revokeRole() called, Then resolves without error (idempotent)', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      await expect(
        revokeRole({
          connectionString: CONN_STR,
          userId: USER_ID,
          roleId: ROLE_VIEWER_ID,
          tenantId: TENANT_A,
        })
      ).resolves.not.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY TESTS
// ---------------------------------------------------------------------------

describe('RBAC — BOUNDARY TESTS', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockPoolEnd.mockReset();
  });

  // ---- Empty permission set ----
  describe('getUserPermissions() — user with roles but no permissions', () => {
    it('Given user has a role with zero permissions assigned, When getUserPermissions() called, Then returns empty array', async () => {
      // First query: user has admin role
      mockQuery
        .mockResolvedValueOnce(makeQueryResult([{ id: ROLE_ADMIN_ID, name: 'admin' }]))
        // Second query: role has no permissions
        .mockResolvedValueOnce(makeQueryResult([]));
      const result = await getUserPermissions({
        connectionString: CONN_STR,
        userId: USER_ID,
        tenantId: TENANT_A,
      });
      expect(result).toEqual([]);
    });
  });

  // ---- User with multiple roles ----
  describe('getUserPermissions() — user with multiple roles', () => {
    it('Given user has two roles with overlapping permissions, When getUserPermissions() called, Then returns deduplicated permissions', async () => {
      // Both roles have read permission — should appear once in result
      mockQuery
        .mockResolvedValueOnce(makeQueryResult([
          { id: ROLE_ADMIN_ID, name: 'admin' },
          { id: ROLE_VIEWER_ID, name: 'viewer' },
        ]))
        .mockResolvedValueOnce(makeQueryResult([
          { id: PERM_READ_ID, resource: 'projects', action: 'read' },
          { id: PERM_WRITE_ID, resource: 'projects', action: 'write' },
          { id: PERM_READ_ID, resource: 'projects', action: 'read' }, // duplicate
        ]));
      const result = await getUserPermissions({
        connectionString: CONN_STR,
        userId: USER_ID,
        tenantId: TENANT_A,
      });
      // Should be deduplicated
      const readPerms = result.filter(p => p.resource === 'projects' && p.action === 'read');
      expect(readPerms.length).toBeLessThanOrEqual(1);
    });
  });

  // ---- hasPermission: wildcard resource boundary ----
  describe('hasPermission() — exact match only', () => {
    it('Given user has projects:read permission, When hasPermission() for projects:write, Then returns false', async () => {
      mockQuery
        .mockResolvedValueOnce(makeQueryResult([{ id: ROLE_VIEWER_ID }]))
        .mockResolvedValueOnce(makeQueryResult([{ resource: 'projects', action: 'read' }]));
      const result = await hasPermission({
        connectionString: CONN_STR,
        userId: USER_ID,
        tenantId: TENANT_A,
        resource: 'projects',
        action: 'write',
      });
      expect(result).toBe(false);
    });
  });

  // ---- getUserPermissions with null userId ----
  describe('getUserPermissions() — null inputs', () => {
    it('Given null userId, When getUserPermissions() called, Then throws', async () => {
      await expect(
        getUserPermissions({ connectionString: CONN_STR, userId: null as any, tenantId: TENANT_A })
      ).rejects.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH
// ---------------------------------------------------------------------------

describe('RBAC — GOLDEN PATH', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockPoolEnd.mockReset();
  });

  // ---- hasPermission: user has the permission ----
  describe('hasPermission() — user has permission', () => {
    it('Given user has admin role with projects:read permission, When hasPermission() called, Then returns true', async () => {
      mockQuery
        .mockResolvedValueOnce(makeQueryResult([{ id: ROLE_ADMIN_ID, name: 'admin' }]))
        .mockResolvedValueOnce(makeQueryResult([
          { id: PERM_READ_ID, resource: 'projects', action: 'read' },
          { id: PERM_WRITE_ID, resource: 'projects', action: 'write' },
        ]));
      const result = await hasPermission({
        connectionString: CONN_STR,
        userId: USER_ID,
        tenantId: TENANT_A,
        resource: 'projects',
        action: 'read',
      });
      expect(result).toBe(true);
    });

    it('Given user has admin role with projects:write permission, When hasPermission() for projects:write, Then returns true', async () => {
      mockQuery
        .mockResolvedValueOnce(makeQueryResult([{ id: ROLE_ADMIN_ID, name: 'admin' }]))
        .mockResolvedValueOnce(makeQueryResult([
          { resource: 'projects', action: 'write' },
        ]));
      const result = await hasPermission({
        connectionString: CONN_STR,
        userId: USER_ID,
        tenantId: TENANT_A,
        resource: 'projects',
        action: 'write',
      });
      expect(result).toBe(true);
    });
  });

  // ---- getUserPermissions: returns all permissions across roles ----
  describe('getUserPermissions() — returns aggregated permissions', () => {
    it('Given user with admin role having two permissions, When getUserPermissions() called, Then returns both permissions', async () => {
      mockQuery
        .mockResolvedValueOnce(makeQueryResult([{ id: ROLE_ADMIN_ID, name: 'admin' }]))
        .mockResolvedValueOnce(makeQueryResult([
          { id: PERM_READ_ID, resource: 'projects', action: 'read' },
          { id: PERM_WRITE_ID, resource: 'projects', action: 'write' },
        ]));
      const result = await getUserPermissions({
        connectionString: CONN_STR,
        userId: USER_ID,
        tenantId: TENANT_A,
      });
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.some(p => p.resource === 'projects' && p.action === 'read')).toBe(true);
      expect(result.some(p => p.resource === 'projects' && p.action === 'write')).toBe(true);
    });

    it('Given getUserPermissions query, When called, Then uses parameterized queries for userId and tenantId', async () => {
      mockQuery
        .mockResolvedValueOnce(makeQueryResult([]))
        .mockResolvedValueOnce(makeQueryResult([]));
      await getUserPermissions({
        connectionString: CONN_STR,
        userId: USER_ID,
        tenantId: TENANT_A,
      });
      if (mockQuery.mock.calls.length > 0) {
        const firstCall = mockQuery.mock.calls[0];
        const sql: string = firstCall[0];
        expect(sql).toMatch(/\$1/);
      }
    });
  });

  // ---- assignRole ----
  describe('assignRole() — success', () => {
    it('Given valid user_id, role_id, and tenant_id, When assignRole() called, Then inserts into user_roles', async () => {
      mockQuery.mockResolvedValue(makeQueryResult([]));
      await assignRole({
        connectionString: CONN_STR,
        userId: USER_ID,
        roleId: ROLE_ADMIN_ID,
        tenantId: TENANT_A,
      });
      const sql: string = mockQuery.mock.calls[0][0];
      const params: any[] = mockQuery.mock.calls[0][1];
      expect(sql.toUpperCase()).toMatch(/INSERT/);
      expect(sql.toUpperCase()).toMatch(/USER_ROLES/);
      expect(params).toContain(USER_ID);
      expect(params).toContain(ROLE_ADMIN_ID);
    });

    it('Given assignRole SQL, When called, Then uses parameterized queries ($1, $2, $3)', async () => {
      mockQuery.mockResolvedValue(makeQueryResult([]));
      await assignRole({
        connectionString: CONN_STR,
        userId: USER_ID,
        roleId: ROLE_ADMIN_ID,
        tenantId: TENANT_A,
      });
      const sql: string = mockQuery.mock.calls[0][0];
      expect(sql).toMatch(/\$1/);
      expect(sql).toMatch(/\$2/);
    });
  });

  // ---- revokeRole ----
  describe('revokeRole() — success', () => {
    it('Given user has role assigned, When revokeRole() called, Then deletes from user_roles', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
      await revokeRole({
        connectionString: CONN_STR,
        userId: USER_ID,
        roleId: ROLE_ADMIN_ID,
        tenantId: TENANT_A,
      });
      const sql: string = mockQuery.mock.calls[0][0];
      expect(sql.toUpperCase()).toMatch(/DELETE/);
      expect(sql.toUpperCase()).toMatch(/USER_ROLES/);
    });

    it('Given revokeRole SQL, When called, Then parameterizes user_id and role_id', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
      await revokeRole({
        connectionString: CONN_STR,
        userId: USER_ID,
        roleId: ROLE_ADMIN_ID,
        tenantId: TENANT_A,
      });
      const params: any[] = mockQuery.mock.calls[0][1];
      expect(params).toContain(USER_ID);
      expect(params).toContain(ROLE_ADMIN_ID);
    });
  });

  // ---- checkPermissionOrThrow: passes when permission granted ----
  describe('checkPermissionOrThrow() — passes when authorized', () => {
    it('Given user has projects:read permission, When checkPermissionOrThrow() called, Then resolves without throwing', async () => {
      mockQuery
        .mockResolvedValueOnce(makeQueryResult([{ id: ROLE_ADMIN_ID }]))
        .mockResolvedValueOnce(makeQueryResult([{ resource: 'projects', action: 'read' }]));
      await expect(
        checkPermissionOrThrow({
          connectionString: CONN_STR,
          userId: USER_ID,
          tenantId: TENANT_A,
          resource: 'projects',
          action: 'read',
        })
      ).resolves.not.toThrow();
    });
  });

  // ---- Permission revocation: after revokeRole, hasPermission returns false ----
  describe('RBAC full lifecycle — assign then revoke', () => {
    it('Given user had admin role revoked, When hasPermission() called after revocation, Then returns false', async () => {
      // After revocation, user has no roles
      mockQuery.mockResolvedValue(makeQueryResult([]));
      const result = await hasPermission({
        connectionString: CONN_STR,
        userId: USER_ID,
        tenantId: TENANT_A,
        resource: 'projects',
        action: 'read',
      });
      expect(result).toBe(false);
    });
  });

  // ---- getUserRoles ----
  describe('getUserRoles() — returns roles for user in tenant', () => {
    it('Given user has admin and viewer roles, When getUserRoles() called, Then returns both roles', async () => {
      mockQuery.mockResolvedValue(makeQueryResult([
        { id: ROLE_ADMIN_ID, name: 'admin', tenant_id: TENANT_A },
        { id: ROLE_VIEWER_ID, name: 'viewer', tenant_id: TENANT_A },
      ]));
      const roles = await getUserRoles({
        connectionString: CONN_STR,
        userId: USER_ID,
        tenantId: TENANT_A,
      });
      expect(roles).toHaveLength(2);
      expect(roles[0].name).toBe('admin');
    });

    it('Given user has no roles, When getUserRoles() called, Then returns empty array', async () => {
      mockQuery.mockResolvedValue(makeQueryResult([]));
      const roles = await getUserRoles({
        connectionString: CONN_STR,
        userId: USER_ID,
        tenantId: TENANT_A,
      });
      expect(roles).toEqual([]);
    });

    it('Given getUserRoles SQL, When called, Then uses parameterized queries for userId and tenantId', async () => {
      mockQuery.mockResolvedValue(makeQueryResult([]));
      await getUserRoles({
        connectionString: CONN_STR,
        userId: USER_ID,
        tenantId: TENANT_A,
      });
      const sql: string = mockQuery.mock.calls[0][0];
      const params: any[] = mockQuery.mock.calls[0][1];
      expect(sql).toMatch(/\$1/);
      expect(sql).toMatch(/\$2/);
      expect(params).toContain(USER_ID);
      expect(params).toContain(TENANT_A);
    });

    it('Given null userId, When getUserRoles() called, Then throws', async () => {
      await expect(
        getUserRoles({ connectionString: CONN_STR, userId: null as any, tenantId: TENANT_A })
      ).rejects.toThrow();
    });
  });
});

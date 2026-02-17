/**
 * Platform Schema Integration Tests — WS-ENT-4
 *
 * Cross-entity operations: project creation with assets, RBAC through full
 * user -> role -> permission chain, agent_events with project_id FK,
 * and cross-app project references.
 *
 * All pg calls are mocked. This suite validates the LAYER COMPOSITION:
 *   repositories -> RBAC helpers -> platform schema migrations
 *
 * AC-ENT-4.1: projects, users, roles, permissions round-trip
 * AC-ENT-4.2: assets linked to projects
 * AC-ENT-4.3: agent_events queried by project_id FK
 * AC-ENT-4.4: Cross-app project references (UUID FKs)
 * AC-ENT-4.5: Full RBAC chain (user -> role -> permission)
 *
 * Test order (misuse-first CAD protocol):
 *   1. MISUSE CASES  — cross-tenant access, FK violations, RBAC bypass in composed flow
 *   2. BOUNDARY TESTS — orphaned assets, events with no project, empty RBAC chain
 *   3. GOLDEN PATH   — full project + user + role + asset + event lifecycle
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock pg before all imports
// ---------------------------------------------------------------------------
const mockQuery = vi.fn();
const mockConnect = vi.fn();
const mockPoolEnd = vi.fn();

vi.mock('pg', () => {
  return {
    Pool: vi.fn().mockImplementation(() => ({
      query: mockQuery,
      connect: mockConnect,
      end: mockPoolEnd,
    })),
  };
});

// ---------------------------------------------------------------------------
// Imports — these files do NOT exist yet (RED phase)
// ---------------------------------------------------------------------------
import { PLATFORM_SCHEMA_MIGRATIONS } from '../../../enterprise/src/schema/platform-schema';
import {
  ProjectRepository,
  UserRepository,
  RoleRepository,
  PermissionRepository,
  AssetRepository,
  UserRoleRepository,
  RolePermissionRepository,
  AgentEventRepository,
} from '../../../enterprise/src/schema/repositories';
import {
  hasPermission,
  assignRole,
  revokeRole,
  getUserPermissions,
} from '../../../enterprise/src/schema/rbac';
import { MigrationRunner } from '../../../enterprise/src/storage/migrations';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeQueryResult(rows: any[] = []) {
  return { rows, rowCount: rows.length };
}

const CONN_STR = 'postgresql://localhost/test';
const TENANT_A = 'tenant-acme';
const TENANT_B = 'tenant-rival';

const PROJECT_UUID = '550e8400-e29b-41d4-a716-446655440000';
const USER_UUID = '550e8400-e29b-41d4-a716-446655440001';
const ROLE_ADMIN_UUID = '550e8400-e29b-41d4-a716-446655440002';
const ROLE_VIEWER_UUID = '550e8400-e29b-41d4-a716-446655440003';
const PERM_READ_UUID = '550e8400-e29b-41d4-a716-446655440004';
const PERM_WRITE_UUID = '550e8400-e29b-41d4-a716-446655440005';
const ASSET_UUID = '550e8400-e29b-41d4-a716-446655440006';
const EVENT_ID = 99;

// ---------------------------------------------------------------------------
// MISUSE CASES
// ---------------------------------------------------------------------------

describe('Schema Integration — MISUSE CASES', () => {
  let projectRepo: ProjectRepository;
  let userRepo: UserRepository;
  let assetRepo: AssetRepository;
  let userRoleRepo: UserRoleRepository;

  beforeEach(() => {
    mockQuery.mockReset();
    mockConnect.mockReset();
    mockPoolEnd.mockReset();
    projectRepo = new ProjectRepository({ connectionString: CONN_STR });
    userRepo = new UserRepository({ connectionString: CONN_STR });
    assetRepo = new AssetRepository({ connectionString: CONN_STR });
    userRoleRepo = new UserRoleRepository({ connectionString: CONN_STR });
  });

  // ---- Cross-tenant RBAC bypass: tenant B user trying to access tenant A resource ----
  describe('RBAC — cross-tenant bypass attempt', () => {
    it('Given user belongs to tenant B, When hasPermission() checked for tenant A resource, Then returns false', async () => {
      // Roles query scoped to tenant_a returns empty (user is in tenant_b)
      mockQuery.mockResolvedValue(makeQueryResult([]));
      const result = await hasPermission({
        connectionString: CONN_STR,
        userId: USER_UUID,
        tenantId: TENANT_A, // tenant A resource
        resource: 'projects',
        action: 'read',
      });
      expect(result).toBe(false);
    });

    it('Given tenant B user, When getUserPermissions() called with tenant A id, Then returns empty permissions', async () => {
      mockQuery.mockResolvedValue(makeQueryResult([]));
      const result = await getUserPermissions({
        connectionString: CONN_STR,
        userId: USER_UUID,
        tenantId: TENANT_A,
      });
      expect(result).toEqual([]);
    });
  });

  // ---- FK violation: asset referencing non-existent project ----
  describe('AssetRepository — FK violation on project_id', () => {
    it('Given project_id that does not exist, When asset created with that project_id, Then propagates FK constraint error', async () => {
      const fkError = new Error('insert or update on table "assets" violates foreign key constraint "assets_project_id_fkey"');
      (fkError as any).code = '23503';
      mockQuery.mockRejectedValue(fkError);
      await expect(
        assetRepo.create({
          tenant_id: TENANT_A,
          project_id: 'non-existent-uuid',
          storage_key: 'tenant-a/file.pdf',
          bucket: 'my-bucket',
          content_type: 'application/pdf',
          size_bytes: 1024,
        })
      ).rejects.toThrow(/foreign key|constraint/i);
    });
  });

  // ---- FK violation: user_roles referencing non-existent user ----
  describe('UserRoleRepository — FK violation on user_id', () => {
    it('Given user_id that does not exist, When assignRole() called, Then propagates FK error', async () => {
      const fkError = new Error('insert or update on table "user_roles" violates foreign key constraint "user_roles_user_id_fkey"');
      (fkError as any).code = '23503';
      mockQuery.mockRejectedValue(fkError);
      await expect(
        assignRole({
          connectionString: CONN_STR,
          userId: 'non-existent-user',
          roleId: ROLE_ADMIN_UUID,
          tenantId: TENANT_A,
        })
      ).rejects.toThrow(/foreign key|constraint/i);
    });
  });

  // ---- Schema migration SQL: no user data interpolated ----
  describe('Platform schema migrations — no user data in SQL', () => {
    it('Given PLATFORM_SCHEMA_MIGRATIONS, When all up SQL inspected, Then no tenant_id values are hardcoded', () => {
      const allSql = PLATFORM_SCHEMA_MIGRATIONS.map(m => m.up).join('\n');
      // Must not embed literal tenant values
      expect(allSql).not.toMatch(/tenant_id\s*=\s*'[^']+'/);
    });

    it('Given PLATFORM_SCHEMA_MIGRATIONS, When SQL inspected, Then no UNION-based injection patterns', () => {
      const allSql = PLATFORM_SCHEMA_MIGRATIONS.map(m => m.up).join('\n');
      // DDL should not contain UNION SELECT patterns
      expect(allSql.toUpperCase()).not.toMatch(/UNION\s+SELECT/);
    });
  });

  // ---- RBAC bypass: role assignment without tenant check ----
  describe('assignRole() — cross-tenant role assignment', () => {
    it('Given role from tenant B assigned to user in tenant A context, When hasPermission() checked, Then returns false for tenant A', async () => {
      // After assigning a role that doesn't belong to tenant A, the permission check for tenant A finds nothing
      mockQuery.mockResolvedValue(makeQueryResult([]));
      const result = await hasPermission({
        connectionString: CONN_STR,
        userId: USER_UUID,
        tenantId: TENANT_A,
        resource: 'projects',
        action: 'read',
      });
      expect(result).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY TESTS
// ---------------------------------------------------------------------------

describe('Schema Integration — BOUNDARY TESTS', () => {
  let projectRepo: ProjectRepository;
  let assetRepo: AssetRepository;
  let agentEventRepo: AgentEventRepository;
  let userRoleRepo: UserRoleRepository;
  let rolePermissionRepo: RolePermissionRepository;

  beforeEach(() => {
    mockQuery.mockReset();
    mockConnect.mockReset();
    mockPoolEnd.mockReset();
    projectRepo = new ProjectRepository({ connectionString: CONN_STR });
    assetRepo = new AssetRepository({ connectionString: CONN_STR });
    agentEventRepo = new AgentEventRepository({ connectionString: CONN_STR });
    userRoleRepo = new UserRoleRepository({ connectionString: CONN_STR });
    rolePermissionRepo = new RolePermissionRepository({ connectionString: CONN_STR });
  });

  // ---- Project with no assets ----
  describe('Project + Assets — project with no assets', () => {
    it('Given project exists but has no assets, When findByProject() called, Then returns empty array', async () => {
      mockQuery.mockResolvedValue(makeQueryResult([]));
      const assets = await assetRepo.findByProject(PROJECT_UUID);
      expect(assets).toEqual([]);
    });
  });

  // ---- Agent events with no project_id ----
  describe('AgentEventRepository — events without project_id', () => {
    it('Given agent events have null project_id, When findByProjectId() called with a UUID, Then returns empty array', async () => {
      mockQuery.mockResolvedValue(makeQueryResult([]));
      const events = await agentEventRepo.findByProjectId(PROJECT_UUID);
      expect(events).toEqual([]);
    });
  });

  // ---- RBAC: user has roles but role has no permissions ----
  describe('RBAC chain — role with no permissions', () => {
    it('Given user has a role, but role has no permissions, When hasPermission() called, Then returns false', async () => {
      mockQuery
        .mockResolvedValueOnce(makeQueryResult([{ id: ROLE_ADMIN_UUID, name: 'admin' }]))
        .mockResolvedValueOnce(makeQueryResult([])); // no permissions for role
      const result = await hasPermission({
        connectionString: CONN_STR,
        userId: USER_UUID,
        tenantId: TENANT_A,
        resource: 'projects',
        action: 'read',
      });
      expect(result).toBe(false);
    });
  });

  // ---- Migration runner with platform schema: empty table list ----
  describe('Platform schema migrations — empty list', () => {
    it('Given empty migrations array passed to MigrationRunner, When runMigrations() called, Then returns success with no applied', async () => {
      mockQuery.mockResolvedValue(makeQueryResult([]));
      const runner = new MigrationRunner({ connectionString: CONN_STR });
      const result = await runner.runMigrations([]);
      expect(result.success).toBe(true);
      expect(result.applied).toEqual([]);
    });
  });

  // ---- getUserPermissions: user with no roles ----
  describe('getUserPermissions() — no roles assigned', () => {
    it('Given user has no roles, When getUserPermissions() called, Then returns empty array', async () => {
      mockQuery.mockResolvedValue(makeQueryResult([]));
      const result = await getUserPermissions({
        connectionString: CONN_STR,
        userId: USER_UUID,
        tenantId: TENANT_A,
      });
      expect(result).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH
// ---------------------------------------------------------------------------

describe('Schema Integration — GOLDEN PATH', () => {
  let projectRepo: ProjectRepository;
  let userRepo: UserRepository;
  let roleRepo: RoleRepository;
  let permissionRepo: PermissionRepository;
  let assetRepo: AssetRepository;
  let userRoleRepo: UserRoleRepository;
  let rolePermissionRepo: RolePermissionRepository;
  let agentEventRepo: AgentEventRepository;

  beforeEach(() => {
    mockQuery.mockReset();
    mockConnect.mockReset();
    mockPoolEnd.mockReset();
    projectRepo = new ProjectRepository({ connectionString: CONN_STR });
    userRepo = new UserRepository({ connectionString: CONN_STR });
    roleRepo = new RoleRepository({ connectionString: CONN_STR });
    permissionRepo = new PermissionRepository({ connectionString: CONN_STR });
    assetRepo = new AssetRepository({ connectionString: CONN_STR });
    userRoleRepo = new UserRoleRepository({ connectionString: CONN_STR });
    rolePermissionRepo = new RolePermissionRepository({ connectionString: CONN_STR });
    agentEventRepo = new AgentEventRepository({ connectionString: CONN_STR });
  });

  // ---- Full RBAC chain: user -> role -> permission ----
  describe('Full RBAC chain — user gets permission via role', () => {
    it('Given user assigned admin role with projects:read permission, When hasPermission() checked, Then returns true', async () => {
      // Step 1: assign role (user_roles insert)
      mockQuery.mockResolvedValueOnce(makeQueryResult([]));
      await assignRole({ connectionString: CONN_STR, userId: USER_UUID, roleId: ROLE_ADMIN_UUID, tenantId: TENANT_A });

      // Step 2: check permission
      mockQuery
        .mockResolvedValueOnce(makeQueryResult([{ id: ROLE_ADMIN_UUID, name: 'admin' }]))
        .mockResolvedValueOnce(makeQueryResult([{ resource: 'projects', action: 'read' }]));
      const result = await hasPermission({
        connectionString: CONN_STR,
        userId: USER_UUID,
        tenantId: TENANT_A,
        resource: 'projects',
        action: 'read',
      });
      expect(result).toBe(true);
    });

    it('Given user had admin role then it was revoked, When hasPermission() called after revocation, Then returns false', async () => {
      // Revoke: delete from user_roles
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      await revokeRole({ connectionString: CONN_STR, userId: USER_UUID, roleId: ROLE_ADMIN_UUID, tenantId: TENANT_A });

      // Permission check: user has no roles anymore
      mockQuery.mockResolvedValueOnce(makeQueryResult([]));
      const result = await hasPermission({
        connectionString: CONN_STR,
        userId: USER_UUID,
        tenantId: TENANT_A,
        resource: 'projects',
        action: 'read',
      });
      expect(result).toBe(false);
    });
  });

  // ---- Project + Asset lifecycle ----
  describe('Project + Asset lifecycle', () => {
    it('Given a project is created, When asset linked to it via project_id FK, Then asset can be queried by project', async () => {
      // Create project
      const projectRow = { id: PROJECT_UUID, tenant_id: TENANT_A, name: 'ACME App', status: 'active', created_at: '2026-02-17T00:00:00Z', updated_at: '2026-02-17T00:00:00Z' };
      mockQuery.mockResolvedValueOnce(makeQueryResult([projectRow]));
      const project = await projectRepo.create({ tenant_id: TENANT_A, name: 'ACME App', status: 'active' });
      expect(project.id).toBe(PROJECT_UUID);

      // Create asset linked to project
      const assetRow = { id: ASSET_UUID, tenant_id: TENANT_A, project_id: PROJECT_UUID, storage_key: 'tenant-acme/report.pdf', bucket: 'mg-assets', content_type: 'application/pdf', size_bytes: 204800, created_at: '2026-02-17T00:00:00Z', updated_at: '2026-02-17T00:00:00Z' };
      mockQuery.mockResolvedValueOnce(makeQueryResult([assetRow]));
      const asset = await assetRepo.create({
        tenant_id: TENANT_A,
        project_id: PROJECT_UUID,
        storage_key: 'tenant-acme/report.pdf',
        bucket: 'mg-assets',
        content_type: 'application/pdf',
        size_bytes: 204800,
      });
      expect(asset.project_id).toBe(PROJECT_UUID);

      // Query assets by project
      mockQuery.mockResolvedValueOnce(makeQueryResult([assetRow]));
      const assets = await assetRepo.findByProject(PROJECT_UUID);
      expect(assets).toHaveLength(1);
      expect(assets[0].storage_key).toBe('tenant-acme/report.pdf');
    });
  });

  // ---- Agent events cross-app reference via project_id ----
  describe('AgentEventRepository — cross-app project reference', () => {
    it('Given agent events with project_id FK, When findByProjectId() called, Then returns events for that project', async () => {
      const rows = [
        { id: EVENT_ID, agent_id: 'dev', workstream_id: 'WS-ENT-4', event_type: 'schema.created', payload: { tables: ['projects'] }, created_at: '2026-02-17T00:00:00Z', project_id: PROJECT_UUID },
        { id: EVENT_ID + 1, agent_id: 'qa', workstream_id: 'WS-ENT-4', event_type: 'tests.written', payload: { count: 120 }, created_at: '2026-02-17T01:00:00Z', project_id: PROJECT_UUID },
      ];
      mockQuery.mockResolvedValue(makeQueryResult(rows));
      const events = await agentEventRepo.findByProjectId(PROJECT_UUID);
      expect(events).toHaveLength(2);
      expect(events[0].project_id).toBe(PROJECT_UUID);
      expect(events[1].project_id).toBe(PROJECT_UUID);
    });
  });

  // ---- Platform schema migrations run via MigrationRunner ----
  describe('Platform schema migrations — run via MigrationRunner', () => {
    it('Given PLATFORM_SCHEMA_MIGRATIONS, When runMigrations() called, Then all migrations applied in order', async () => {
      // ensureMigrationsTable
      mockQuery.mockResolvedValueOnce(makeQueryResult());
      // getAppliedVersions
      mockQuery.mockResolvedValueOnce(makeQueryResult([]));
      // For each migration: run up SQL + record applied
      const migrationCount = PLATFORM_SCHEMA_MIGRATIONS.length;
      for (let i = 0; i < migrationCount * 2; i++) {
        mockQuery.mockResolvedValueOnce(makeQueryResult());
      }

      const runner = new MigrationRunner({ connectionString: CONN_STR });
      const result = await runner.runMigrations(PLATFORM_SCHEMA_MIGRATIONS);
      expect(result.success).toBe(true);
      expect(result.applied.length).toBe(migrationCount);
    });

    it('Given platform schema already applied, When runMigrations() called again, Then returns success with empty applied (idempotent)', async () => {
      const appliedVersions = PLATFORM_SCHEMA_MIGRATIONS.map(m => ({ version: m.version }));
      mockQuery.mockResolvedValueOnce(makeQueryResult()); // ensureMigrationsTable
      mockQuery.mockResolvedValueOnce(makeQueryResult(appliedVersions)); // getAppliedVersions (all already applied)

      const runner = new MigrationRunner({ connectionString: CONN_STR });
      const result = await runner.runMigrations(PLATFORM_SCHEMA_MIGRATIONS);
      expect(result.success).toBe(true);
      expect(result.applied).toEqual([]);
    });
  });

  // ---- getUserPermissions across full chain ----
  describe('getUserPermissions() — full chain result', () => {
    it('Given user has admin role with read+write permissions, When getUserPermissions() called, Then returns both permissions', async () => {
      mockQuery
        .mockResolvedValueOnce(makeQueryResult([{ id: ROLE_ADMIN_UUID, name: 'admin' }]))
        .mockResolvedValueOnce(makeQueryResult([
          { id: PERM_READ_UUID, resource: 'projects', action: 'read' },
          { id: PERM_WRITE_UUID, resource: 'projects', action: 'write' },
        ]));
      const permissions = await getUserPermissions({
        connectionString: CONN_STR,
        userId: USER_UUID,
        tenantId: TENANT_A,
      });
      expect(permissions.some(p => p.action === 'read')).toBe(true);
      expect(permissions.some(p => p.action === 'write')).toBe(true);
    });
  });

  // ---- Multi-entity: user, project, role, permission, asset all linked ----
  describe('Full entity lifecycle — user, project, role, permission, asset', () => {
    it('Given all entities created and linked, When each is queried by FK, Then returns correct cross-references', async () => {
      // Create project
      mockQuery.mockResolvedValueOnce(makeQueryResult([{ id: PROJECT_UUID, tenant_id: TENANT_A, name: 'Flagship', status: 'active', created_at: '2026-02-17T00:00:00Z', updated_at: '2026-02-17T00:00:00Z' }]));
      const project = await projectRepo.create({ tenant_id: TENANT_A, name: 'Flagship', status: 'active' });

      // Create user
      mockQuery.mockResolvedValueOnce(makeQueryResult([{ id: USER_UUID, tenant_id: TENANT_A, email: 'alice@acme.com', status: 'active', created_at: '2026-02-17T00:00:00Z', updated_at: '2026-02-17T00:00:00Z' }]));
      const user = await userRepo.create({ tenant_id: TENANT_A, email: 'alice@acme.com', status: 'active' });

      // Create role
      mockQuery.mockResolvedValueOnce(makeQueryResult([{ id: ROLE_ADMIN_UUID, tenant_id: TENANT_A, name: 'admin', created_at: '2026-02-17T00:00:00Z' }]));
      const role = await roleRepo.create({ tenant_id: TENANT_A, name: 'admin' });

      // Create permission
      mockQuery.mockResolvedValueOnce(makeQueryResult([{ id: PERM_READ_UUID, resource: 'projects', action: 'read', created_at: '2026-02-17T00:00:00Z' }]));
      const permission = await permissionRepo.create({ resource: 'projects', action: 'read' });

      // Assign role to user
      mockQuery.mockResolvedValueOnce(makeQueryResult([]));
      await assignRole({ connectionString: CONN_STR, userId: user.id, roleId: role.id, tenantId: TENANT_A });

      // Assign permission to role
      mockQuery.mockResolvedValueOnce(makeQueryResult([]));
      await rolePermissionRepo.assign(role.id, permission.id);

      // Verify permission check
      mockQuery
        .mockResolvedValueOnce(makeQueryResult([{ id: ROLE_ADMIN_UUID }]))
        .mockResolvedValueOnce(makeQueryResult([{ resource: 'projects', action: 'read' }]));
      const canRead = await hasPermission({
        connectionString: CONN_STR,
        userId: user.id,
        tenantId: TENANT_A,
        resource: 'projects',
        action: 'read',
      });
      expect(canRead).toBe(true);

      // All IDs should be UUIDs (non-null strings)
      expect(project.id).toBeDefined();
      expect(user.id).toBeDefined();
      expect(role.id).toBeDefined();
      expect(permission.id).toBeDefined();
    });
  });
});

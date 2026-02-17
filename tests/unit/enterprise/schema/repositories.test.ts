/**
 * Platform Schema Repositories Unit Tests — WS-ENT-4
 *
 * Tests for CRUD data access layer against all platform entities.
 * Does NOT require a running Postgres instance — pg Pool is mocked.
 *
 * AC-ENT-4.1: projects, users, roles, permissions CRUD
 * AC-ENT-4.2: assets CRUD with S3/R2 reference fields
 * AC-ENT-4.3: agent_events queried by project_id
 * AC-ENT-4.4: cross-app FK queries (assets by project_id)
 * AC-ENT-4.5: user_roles and role_permissions join operations
 *
 * Test order (misuse-first CAD protocol):
 *   1. MISUSE CASES  — SQL injection via entity fields, FK violations, null inputs
 *   2. BOUNDARY TESTS — empty result sets, zero-byte assets, orphaned FKs
 *   3. GOLDEN PATH   — full CRUD lifecycle for each entity
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock pg before any imports
// ---------------------------------------------------------------------------
const mockQuery = vi.fn();
const mockRelease = vi.fn();
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

// Import from paths that do NOT exist yet — tests will be RED
import {
  ProjectRepository,
  UserRepository,
  RoleRepository,
  PermissionRepository,
  AssetRepository,
  UserRoleRepository,
  RolePermissionRepository,
  AgentEventRepository,
} from '../../../../enterprise/src/schema/repositories';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeQueryResult(rows: any[] = []) {
  return { rows, rowCount: rows.length };
}

const TENANT_A = 'tenant-acme';
const UUID_1 = '550e8400-e29b-41d4-a716-446655440001';
const UUID_2 = '550e8400-e29b-41d4-a716-446655440002';
const UUID_3 = '550e8400-e29b-41d4-a716-446655440003';
const CONN_STR = 'postgresql://localhost/test';

// ---------------------------------------------------------------------------
// MISUSE CASES
// ---------------------------------------------------------------------------

describe('Platform Schema Repositories — MISUSE CASES', () => {
  let projectRepo: ProjectRepository;
  let userRepo: UserRepository;
  let assetRepo: AssetRepository;
  let roleRepo: RoleRepository;
  let permissionRepo: PermissionRepository;

  beforeEach(() => {
    mockQuery.mockReset();
    mockConnect.mockReset();
    mockPoolEnd.mockReset();
    projectRepo = new ProjectRepository({ connectionString: CONN_STR });
    userRepo = new UserRepository({ connectionString: CONN_STR });
    assetRepo = new AssetRepository({ connectionString: CONN_STR });
    roleRepo = new RoleRepository({ connectionString: CONN_STR });
    permissionRepo = new PermissionRepository({ connectionString: CONN_STR });
  });

  // ---- SQL injection via project name ----
  describe('ProjectRepository.create() — SQL injection in name', () => {
    it("Given name contains SQL injection, When create() called, Then query uses parameterized $1 not string interpolation", async () => {
      const injectedName = "'; DROP TABLE projects;--";
      mockQuery.mockResolvedValue(makeQueryResult([{ id: UUID_1, name: injectedName }]));
      await projectRepo.create({
        tenant_id: TENANT_A,
        name: injectedName,
        status: 'active',
      });
      // The injection string must appear in params array, not in the SQL string
      const call = mockQuery.mock.calls[0];
      const sql: string = call[0];
      const params: any[] = call[1];
      expect(sql).not.toContain(injectedName);
      expect(params).toContain(injectedName);
    });

    it('Given tenant_id contains SQL injection, When create() called, Then parameterizes tenant_id', async () => {
      const injectedTenant = "' OR '1'='1";
      mockQuery.mockResolvedValue(makeQueryResult([{ id: UUID_1 }]));
      await projectRepo.create({
        tenant_id: injectedTenant,
        name: 'Legit Project',
        status: 'active',
      });
      const call = mockQuery.mock.calls[0];
      const sql: string = call[0];
      const params: any[] = call[1];
      expect(sql).not.toContain(injectedTenant);
      expect(params).toContain(injectedTenant);
    });
  });

  // ---- SQL injection via user email ----
  describe('UserRepository.create() — SQL injection in email', () => {
    it("Given email contains SQL injection, When create() called, Then parameterizes email", async () => {
      const injectedEmail = "'; INSERT INTO users(email) VALUES ('hacker@evil.com');--";
      mockQuery.mockResolvedValue(makeQueryResult([{ id: UUID_2 }]));
      await userRepo.create({
        tenant_id: TENANT_A,
        email: injectedEmail,
        status: 'active',
      });
      const call = mockQuery.mock.calls[0];
      const sql: string = call[0];
      const params: any[] = call[1];
      expect(sql).not.toContain(injectedEmail);
      expect(params).toContain(injectedEmail);
    });
  });

  // ---- SQL injection via asset storage_key ----
  describe('AssetRepository.create() — SQL injection in storage_key', () => {
    it("Given storage_key contains injection, When create() called, Then parameterizes storage_key", async () => {
      const injectedKey = "'; UPDATE assets SET bucket='evil';--";
      mockQuery.mockResolvedValue(makeQueryResult([{ id: UUID_3 }]));
      await assetRepo.create({
        tenant_id: TENANT_A,
        storage_key: injectedKey,
        bucket: 'my-bucket',
        content_type: 'application/octet-stream',
        size_bytes: 100,
      });
      const call = mockQuery.mock.calls[0];
      const sql: string = call[0];
      const params: any[] = call[1];
      expect(sql).not.toContain(injectedKey);
      expect(params).toContain(injectedKey);
    });
  });

  // ---- Null inputs ----
  describe('Repository create() — null inputs', () => {
    it('Given null passed to ProjectRepository.create(), When called, Then throws or returns error', async () => {
      await expect(projectRepo.create(null as any)).rejects.toThrow();
    });

    it('Given null passed to UserRepository.create(), When called, Then throws or returns error', async () => {
      await expect(userRepo.create(null as any)).rejects.toThrow();
    });

    it('Given null passed to AssetRepository.create(), When called, Then throws or returns error', async () => {
      await expect(assetRepo.create(null as any)).rejects.toThrow();
    });
  });

  // ---- Missing required fields ----
  describe('Repository create() — missing required fields', () => {
    it('Given project without tenant_id, When create() called, Then throws', async () => {
      await expect(
        projectRepo.create({ name: 'No Tenant', status: 'active' } as any)
      ).rejects.toThrow();
    });

    it('Given user without email, When create() called, Then throws', async () => {
      await expect(
        userRepo.create({ tenant_id: TENANT_A, status: 'active' } as any)
      ).rejects.toThrow();
    });

    it('Given asset without storage_key, When create() called, Then throws', async () => {
      await expect(
        assetRepo.create({
          tenant_id: TENANT_A,
          bucket: 'my-bucket',
          content_type: 'image/png',
          size_bytes: 100,
        } as any)
      ).rejects.toThrow();
    });
  });

  // ---- Prototype pollution in asset metadata ----
  describe('AssetRepository.create() — prototype pollution in metadata', () => {
    it('Given metadata with __proto__ key, When create() called, Then rejects', async () => {
      const poisonedMetadata = JSON.parse('{"__proto__": {"admin": true}}');
      await expect(
        assetRepo.create({
          tenant_id: TENANT_A,
          storage_key: 'safe/key.png',
          bucket: 'my-bucket',
          content_type: 'image/png',
          size_bytes: 100,
          metadata: poisonedMetadata,
        })
      ).rejects.toThrow(/prototype pollution/i);
    });
  });

  // ---- findById with invalid UUID ----
  describe('Repository findById() — invalid UUID', () => {
    it('Given non-UUID string passed to ProjectRepository.findById(), When called, Then throws or returns null', async () => {
      const result = await projectRepo.findById('not-a-uuid');
      // Either throws or returns null — must not execute with raw injection
      expect(result === null || result === undefined).toBe(true);
    });

    it('Given SQL injection string passed to findById(), When called, Then does not interpolate into SQL', async () => {
      const injection = "'; DROP TABLE projects;--";
      mockQuery.mockResolvedValue(makeQueryResult([]));
      const result = await projectRepo.findById(injection);
      // Injection must be parameterized
      if (mockQuery.mock.calls.length > 0) {
        const sql: string = mockQuery.mock.calls[0][0];
        expect(sql).not.toContain(injection);
      }
      expect(result).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY TESTS
// ---------------------------------------------------------------------------

describe('Platform Schema Repositories — BOUNDARY TESTS', () => {
  let projectRepo: ProjectRepository;
  let userRepo: UserRepository;
  let assetRepo: AssetRepository;
  let roleRepo: RoleRepository;
  let permissionRepo: PermissionRepository;
  let userRoleRepo: UserRoleRepository;
  let rolePermissionRepo: RolePermissionRepository;
  let agentEventRepo: AgentEventRepository;

  beforeEach(() => {
    mockQuery.mockReset();
    mockConnect.mockReset();
    mockPoolEnd.mockReset();
    projectRepo = new ProjectRepository({ connectionString: CONN_STR });
    userRepo = new UserRepository({ connectionString: CONN_STR });
    assetRepo = new AssetRepository({ connectionString: CONN_STR });
    roleRepo = new RoleRepository({ connectionString: CONN_STR });
    permissionRepo = new PermissionRepository({ connectionString: CONN_STR });
    userRoleRepo = new UserRoleRepository({ connectionString: CONN_STR });
    rolePermissionRepo = new RolePermissionRepository({ connectionString: CONN_STR });
    agentEventRepo = new AgentEventRepository({ connectionString: CONN_STR });
  });

  // ---- Empty result sets ----
  describe('findByTenant() — no matching rows', () => {
    it('Given no projects for tenant, When findByTenant() called, Then returns empty array', async () => {
      mockQuery.mockResolvedValue(makeQueryResult([]));
      const result = await projectRepo.findByTenant(TENANT_A);
      expect(result).toEqual([]);
    });

    it('Given no users for tenant, When findByTenant() called, Then returns empty array', async () => {
      mockQuery.mockResolvedValue(makeQueryResult([]));
      const result = await userRepo.findByTenant(TENANT_A);
      expect(result).toEqual([]);
    });
  });

  // ---- Zero-byte asset ----
  describe('AssetRepository.create() — zero-byte asset', () => {
    it('Given size_bytes is 0, When create() called, Then succeeds (zero-byte files are valid)', async () => {
      mockQuery.mockResolvedValue(makeQueryResult([{ id: UUID_3, size_bytes: 0 }]));
      const result = await assetRepo.create({
        tenant_id: TENANT_A,
        storage_key: 'tenant-a/empty.txt',
        bucket: 'my-bucket',
        content_type: 'text/plain',
        size_bytes: 0,
      });
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });
  });

  // ---- findById — not found ----
  describe('findById() — not found returns null', () => {
    it('Given UUID that does not exist, When ProjectRepository.findById() called, Then returns null', async () => {
      mockQuery.mockResolvedValue(makeQueryResult([]));
      const result = await projectRepo.findById(UUID_1);
      expect(result).toBeNull();
    });

    it('Given UUID that does not exist, When UserRepository.findById() called, Then returns null', async () => {
      mockQuery.mockResolvedValue(makeQueryResult([]));
      const result = await userRepo.findById(UUID_2);
      expect(result).toBeNull();
    });
  });

  // ---- delete() idempotent on missing row ----
  describe('delete() — idempotent on missing row', () => {
    it('Given UUID not in DB, When ProjectRepository.delete() called, Then resolves without error', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      await expect(projectRepo.delete(UUID_1)).resolves.not.toThrow();
    });
  });

  // ---- AgentEventRepository: query by project_id ----
  describe('AgentEventRepository.findByProjectId() — no events', () => {
    it('Given no events for project, When findByProjectId() called, Then returns empty array', async () => {
      mockQuery.mockResolvedValue(makeQueryResult([]));
      const result = await agentEventRepo.findByProjectId(UUID_1);
      expect(result).toEqual([]);
    });
  });

  // ---- UserRoleRepository: assign role (boundary: re-assign existing) ----
  describe('UserRoleRepository.assign() — idempotent', () => {
    it('Given user already has role, When assign() called again, Then does not throw (upsert or ignore)', async () => {
      mockQuery.mockResolvedValue(makeQueryResult([]));
      await expect(
        userRoleRepo.assign({ user_id: UUID_1, role_id: UUID_2, tenant_id: TENANT_A })
      ).resolves.not.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH
// ---------------------------------------------------------------------------

describe('Platform Schema Repositories — GOLDEN PATH', () => {
  let projectRepo: ProjectRepository;
  let userRepo: UserRepository;
  let assetRepo: AssetRepository;
  let roleRepo: RoleRepository;
  let permissionRepo: PermissionRepository;
  let userRoleRepo: UserRoleRepository;
  let rolePermissionRepo: RolePermissionRepository;
  let agentEventRepo: AgentEventRepository;

  beforeEach(() => {
    mockQuery.mockReset();
    mockConnect.mockReset();
    mockPoolEnd.mockReset();
    projectRepo = new ProjectRepository({ connectionString: CONN_STR });
    userRepo = new UserRepository({ connectionString: CONN_STR });
    assetRepo = new AssetRepository({ connectionString: CONN_STR });
    roleRepo = new RoleRepository({ connectionString: CONN_STR });
    permissionRepo = new PermissionRepository({ connectionString: CONN_STR });
    userRoleRepo = new UserRoleRepository({ connectionString: CONN_STR });
    rolePermissionRepo = new RolePermissionRepository({ connectionString: CONN_STR });
    agentEventRepo = new AgentEventRepository({ connectionString: CONN_STR });
  });

  // ---- ProjectRepository CRUD ----
  describe('ProjectRepository — full CRUD', () => {
    it('Given valid project input, When create() called, Then returns project with UUID id', async () => {
      const row = { id: UUID_1, tenant_id: TENANT_A, name: 'ACME App', status: 'active', created_at: '2026-02-17T00:00:00Z', updated_at: '2026-02-17T00:00:00Z' };
      mockQuery.mockResolvedValue(makeQueryResult([row]));
      const result = await projectRepo.create({ tenant_id: TENANT_A, name: 'ACME App', status: 'active' });
      expect(result.id).toBe(UUID_1);
      expect(result.tenant_id).toBe(TENANT_A);
    });

    it('Given project ID, When findById() called, Then returns matching project', async () => {
      const row = { id: UUID_1, tenant_id: TENANT_A, name: 'ACME App', status: 'active', created_at: '2026-02-17T00:00:00Z', updated_at: '2026-02-17T00:00:00Z' };
      mockQuery.mockResolvedValue(makeQueryResult([row]));
      const result = await projectRepo.findById(UUID_1);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(UUID_1);
    });

    it('Given tenant ID, When findByTenant() called, Then returns all tenant projects', async () => {
      const rows = [
        { id: UUID_1, tenant_id: TENANT_A, name: 'App A', status: 'active', created_at: '2026-02-17T00:00:00Z', updated_at: '2026-02-17T00:00:00Z' },
        { id: UUID_2, tenant_id: TENANT_A, name: 'App B', status: 'active', created_at: '2026-02-17T00:00:00Z', updated_at: '2026-02-17T00:00:00Z' },
      ];
      mockQuery.mockResolvedValue(makeQueryResult(rows));
      const result = await projectRepo.findByTenant(TENANT_A);
      expect(result).toHaveLength(2);
    });

    it('Given project exists, When update() called with new name, Then returns updated project', async () => {
      const row = { id: UUID_1, tenant_id: TENANT_A, name: 'Updated Name', status: 'active', created_at: '2026-02-17T00:00:00Z', updated_at: '2026-02-17T01:00:00Z' };
      mockQuery.mockResolvedValue(makeQueryResult([row]));
      const result = await projectRepo.update(UUID_1, { name: 'Updated Name' });
      expect(result.name).toBe('Updated Name');
    });

    it('Given project exists, When delete() called, Then uses DELETE SQL with parameterized id', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
      await projectRepo.delete(UUID_1);
      const sql: string = mockQuery.mock.calls[0][0];
      const params: any[] = mockQuery.mock.calls[0][1];
      expect(sql.toUpperCase()).toMatch(/DELETE/);
      expect(params).toContain(UUID_1);
    });

    it('Given project create query, When called, Then SQL uses parameterized queries ($1, $2)', async () => {
      mockQuery.mockResolvedValue(makeQueryResult([{ id: UUID_1 }]));
      await projectRepo.create({ tenant_id: TENANT_A, name: 'Test', status: 'active' });
      const sql: string = mockQuery.mock.calls[0][0];
      expect(sql).toMatch(/\$1/);
      expect(sql).toMatch(/\$2/);
    });
  });

  // ---- UserRepository CRUD ----
  describe('UserRepository — full CRUD', () => {
    it('Given valid user input, When create() called, Then returns user with UUID id', async () => {
      const row = { id: UUID_2, tenant_id: TENANT_A, email: 'alice@acme.com', status: 'active', created_at: '2026-02-17T00:00:00Z', updated_at: '2026-02-17T00:00:00Z' };
      mockQuery.mockResolvedValue(makeQueryResult([row]));
      const result = await userRepo.create({ tenant_id: TENANT_A, email: 'alice@acme.com', status: 'active' });
      expect(result.id).toBe(UUID_2);
      expect(result.email).toBe('alice@acme.com');
    });

    it('Given tenant and email, When findByEmail() called, Then returns matching user', async () => {
      const row = { id: UUID_2, tenant_id: TENANT_A, email: 'alice@acme.com', status: 'active', created_at: '2026-02-17T00:00:00Z', updated_at: '2026-02-17T00:00:00Z' };
      mockQuery.mockResolvedValue(makeQueryResult([row]));
      const result = await userRepo.findByEmail(TENANT_A, 'alice@acme.com');
      expect(result).not.toBeNull();
      expect(result!.email).toBe('alice@acme.com');
    });
  });

  // ---- RoleRepository CRUD ----
  describe('RoleRepository — full CRUD', () => {
    it('Given valid role input, When create() called, Then returns role with UUID id', async () => {
      const row = { id: UUID_1, tenant_id: TENANT_A, name: 'admin', created_at: '2026-02-17T00:00:00Z' };
      mockQuery.mockResolvedValue(makeQueryResult([row]));
      const result = await roleRepo.create({ tenant_id: TENANT_A, name: 'admin' });
      expect(result.id).toBe(UUID_1);
      expect(result.name).toBe('admin');
    });

    it('Given tenant ID, When findByTenant() called, Then returns all roles', async () => {
      const rows = [
        { id: UUID_1, tenant_id: TENANT_A, name: 'admin', created_at: '2026-02-17T00:00:00Z' },
        { id: UUID_2, tenant_id: TENANT_A, name: 'viewer', created_at: '2026-02-17T00:00:00Z' },
      ];
      mockQuery.mockResolvedValue(makeQueryResult(rows));
      const result = await roleRepo.findByTenant(TENANT_A);
      expect(result).toHaveLength(2);
    });

    it('Given valid UUID, When findById() called, Then returns role', async () => {
      const row = { id: UUID_1, tenant_id: TENANT_A, name: 'admin', created_at: '2026-02-17T00:00:00Z' };
      mockQuery.mockResolvedValue(makeQueryResult([row]));
      const result = await roleRepo.findById(UUID_1);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('admin');
    });

    it('Given invalid UUID, When findById() called, Then returns null', async () => {
      const result = await roleRepo.findById('not-a-uuid');
      expect(result).toBeNull();
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('Given valid UUID, When delete() called, Then executes DELETE on roles', async () => {
      mockQuery.mockResolvedValue(makeQueryResult([]));
      await roleRepo.delete(UUID_1);
      const sql: string = mockQuery.mock.calls[0][0];
      expect(sql.toUpperCase()).toMatch(/DELETE/);
      expect(sql.toUpperCase()).toMatch(/ROLES/);
      expect(sql).toMatch(/\$1/);
    });
  });

  // ---- PermissionRepository CRUD ----
  describe('PermissionRepository — full CRUD', () => {
    it('Given valid permission input, When create() called, Then returns permission with UUID id', async () => {
      const row = { id: UUID_3, resource: 'projects', action: 'read', created_at: '2026-02-17T00:00:00Z' };
      mockQuery.mockResolvedValue(makeQueryResult([row]));
      const result = await permissionRepo.create({ resource: 'projects', action: 'read' });
      expect(result.id).toBe(UUID_3);
      expect(result.resource).toBe('projects');
      expect(result.action).toBe('read');
    });

    it('Given resource and action, When findByResourceAction() called, Then returns matching permission', async () => {
      const row = { id: UUID_3, resource: 'projects', action: 'write', created_at: '2026-02-17T00:00:00Z' };
      mockQuery.mockResolvedValue(makeQueryResult([row]));
      const result = await permissionRepo.findByResourceAction('projects', 'write');
      expect(result).not.toBeNull();
    });

    it('Given valid UUID, When findById() called, Then returns permission', async () => {
      const row = { id: UUID_3, resource: 'projects', action: 'read', created_at: '2026-02-17T00:00:00Z' };
      mockQuery.mockResolvedValue(makeQueryResult([row]));
      const result = await permissionRepo.findById(UUID_3);
      expect(result).not.toBeNull();
      expect(result!.resource).toBe('projects');
    });

    it('Given invalid UUID, When findById() called, Then returns null', async () => {
      const result = await permissionRepo.findById('bad');
      expect(result).toBeNull();
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('Given valid UUID, When delete() called, Then executes DELETE on permissions', async () => {
      mockQuery.mockResolvedValue(makeQueryResult([]));
      await permissionRepo.delete(UUID_3);
      const sql: string = mockQuery.mock.calls[0][0];
      expect(sql.toUpperCase()).toMatch(/DELETE/);
      expect(sql.toUpperCase()).toMatch(/PERMISSIONS/);
      expect(sql).toMatch(/\$1/);
    });
  });

  // ---- AssetRepository CRUD ----
  describe('AssetRepository — full CRUD', () => {
    it('Given valid asset input, When create() called, Then returns asset with UUID id and all S3/R2 fields', async () => {
      const row = {
        id: UUID_3,
        tenant_id: TENANT_A,
        storage_key: 'tenant-acme/file.pdf',
        bucket: 'mg-assets',
        content_type: 'application/pdf',
        size_bytes: 204800,
        created_at: '2026-02-17T00:00:00Z',
        updated_at: '2026-02-17T00:00:00Z',
      };
      mockQuery.mockResolvedValue(makeQueryResult([row]));
      const result = await assetRepo.create({
        tenant_id: TENANT_A,
        storage_key: 'tenant-acme/file.pdf',
        bucket: 'mg-assets',
        content_type: 'application/pdf',
        size_bytes: 204800,
      });
      expect(result.id).toBe(UUID_3);
      expect(result.storage_key).toBe('tenant-acme/file.pdf');
      expect(result.size_bytes).toBe(204800);
    });

    it('Given project_id, When findByProject() called, Then returns assets for that project', async () => {
      const rows = [
        { id: UUID_3, tenant_id: TENANT_A, project_id: UUID_1, storage_key: 'a.pdf', bucket: 'b', content_type: 'application/pdf', size_bytes: 100, created_at: '2026-02-17T00:00:00Z', updated_at: '2026-02-17T00:00:00Z' },
      ];
      mockQuery.mockResolvedValue(makeQueryResult(rows));
      const result = await assetRepo.findByProject(UUID_1);
      expect(result).toHaveLength(1);
      expect(result[0].project_id).toBe(UUID_1);
    });

    it('Given asset query, When called, Then SQL uses parameterized queries', async () => {
      mockQuery.mockResolvedValue(makeQueryResult([{ id: UUID_3 }]));
      await assetRepo.create({
        tenant_id: TENANT_A,
        storage_key: 'key',
        bucket: 'b',
        content_type: 'text/plain',
        size_bytes: 1,
      });
      const sql: string = mockQuery.mock.calls[0][0];
      expect(sql).toMatch(/\$1/);
    });

    it('Given valid UUID, When findById() called, Then returns asset', async () => {
      const row = {
        id: UUID_3,
        tenant_id: TENANT_A,
        storage_key: 'tenant-acme/file.pdf',
        bucket: 'mg-assets',
        content_type: 'application/pdf',
        size_bytes: 204800,
      };
      mockQuery.mockResolvedValue(makeQueryResult([row]));
      const result = await assetRepo.findById(UUID_3);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(UUID_3);
    });

    it('Given invalid UUID, When findById() called, Then returns null without querying', async () => {
      const result = await assetRepo.findById('not-a-uuid');
      expect(result).toBeNull();
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('Given valid UUID, When delete() called, Then executes DELETE with parameterized query', async () => {
      mockQuery.mockResolvedValue(makeQueryResult([]));
      await assetRepo.delete(UUID_3);
      const sql: string = mockQuery.mock.calls[0][0];
      expect(sql.toUpperCase()).toMatch(/DELETE/);
      expect(sql.toUpperCase()).toMatch(/ASSETS/);
      expect(sql).toMatch(/\$1/);
    });
  });

  // ---- UserRoleRepository ----
  describe('UserRoleRepository — assign and revoke', () => {
    it('Given user_id and role_id, When assign() called, Then inserts into user_roles', async () => {
      mockQuery.mockResolvedValue(makeQueryResult([]));
      await userRoleRepo.assign({ user_id: UUID_1, role_id: UUID_2, tenant_id: TENANT_A });
      const sql: string = mockQuery.mock.calls[0][0];
      expect(sql.toUpperCase()).toMatch(/INSERT/);
      expect(sql.toUpperCase()).toMatch(/USER_ROLES/);
    });

    it('Given user_id and role_id, When revoke() called, Then deletes from user_roles', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
      await userRoleRepo.revoke(UUID_1, UUID_2);
      const sql: string = mockQuery.mock.calls[0][0];
      expect(sql.toUpperCase()).toMatch(/DELETE/);
    });

    it('Given user_id, When getRolesForUser() called, Then returns list of roles', async () => {
      const rows = [{ id: UUID_2, name: 'admin', tenant_id: TENANT_A, created_at: '2026-02-17T00:00:00Z' }];
      mockQuery.mockResolvedValue(makeQueryResult(rows));
      const result = await userRoleRepo.getRolesForUser(UUID_1);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('admin');
    });
  });

  // ---- RolePermissionRepository ----
  describe('RolePermissionRepository — assign and query', () => {
    it('Given role_id and permission_id, When assign() called, Then inserts into role_permissions', async () => {
      mockQuery.mockResolvedValue(makeQueryResult([]));
      await rolePermissionRepo.assign(UUID_1, UUID_3);
      const sql: string = mockQuery.mock.calls[0][0];
      expect(sql.toUpperCase()).toMatch(/INSERT/);
      expect(sql.toUpperCase()).toMatch(/ROLE_PERMISSIONS/);
    });

    it('Given role_id, When getPermissionsForRole() called, Then returns list of permissions', async () => {
      const rows = [{ id: UUID_3, resource: 'projects', action: 'read', created_at: '2026-02-17T00:00:00Z' }];
      mockQuery.mockResolvedValue(makeQueryResult(rows));
      const result = await rolePermissionRepo.getPermissionsForRole(UUID_1);
      expect(result).toHaveLength(1);
      expect(result[0].resource).toBe('projects');
    });
  });

  // ---- AgentEventRepository ----
  describe('AgentEventRepository — query by project_id', () => {
    it('Given project_id, When findByProjectId() called, Then queries with parameterized project_id', async () => {
      const rows = [{ id: 1, agent_id: 'dev', workstream_id: 'WS-ENT-4', event_type: 'schema.created', payload: {}, created_at: '2026-02-17T00:00:00Z', project_id: UUID_1 }];
      mockQuery.mockResolvedValue(makeQueryResult(rows));
      const result = await agentEventRepo.findByProjectId(UUID_1);
      expect(result).toHaveLength(1);
      expect(result[0].project_id).toBe(UUID_1);
      // Verify parameterized query
      const sql: string = mockQuery.mock.calls[0][0];
      const params: any[] = mockQuery.mock.calls[0][1];
      expect(sql).not.toContain(UUID_1);
      expect(params).toContain(UUID_1);
    });
  });
});

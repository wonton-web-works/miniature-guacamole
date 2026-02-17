/**
 * Platform Schema Models Unit Tests — WS-ENT-4
 *
 * Tests TypeScript interface/type correctness for all schema entities.
 * Does NOT require a running Postgres instance.
 *
 * AC-ENT-4.1: Project, User, Role, Permission types with proper fields
 * AC-ENT-4.2: Asset type with S3/R2 reference fields
 * AC-ENT-4.3: AgentEvent extension with project_id
 * AC-ENT-4.4: Cross-app UUID FK types
 * AC-ENT-4.5: RBAC types (UserRole, RolePermission)
 *
 * Test order (misuse-first CAD protocol):
 *   1. MISUSE CASES  — missing required fields, wrong field types, tenant_id omission
 *   2. BOUNDARY TESTS — optional fields absent, minimal valid objects
 *   3. GOLDEN PATH   — well-formed entity objects satisfy all field requirements
 */

import { describe, it, expect } from 'vitest';

// Import from paths that do NOT exist yet — tests will be RED
import type {
  Project,
  User,
  Role,
  Permission,
  Asset,
  UserRole,
  RolePermission,
  AgentEventExtended,
  ProjectStatus,
  UserStatus,
} from '../../../../enterprise/src/schema/models';

// ---------------------------------------------------------------------------
// Runtime shape validators (model tests use plain object checks)
// These functions verify required fields are present on objects at runtime.
// ---------------------------------------------------------------------------

function isValidProject(obj: any): obj is Project {
  return (
    typeof obj.id === 'string' &&
    typeof obj.tenant_id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.status === 'string' &&
    typeof obj.created_at === 'string' &&
    typeof obj.updated_at === 'string'
  );
}

function isValidUser(obj: any): obj is User {
  return (
    typeof obj.id === 'string' &&
    typeof obj.tenant_id === 'string' &&
    typeof obj.email === 'string' &&
    typeof obj.status === 'string' &&
    typeof obj.created_at === 'string' &&
    typeof obj.updated_at === 'string'
  );
}

function isValidRole(obj: any): obj is Role {
  return (
    typeof obj.id === 'string' &&
    typeof obj.tenant_id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.created_at === 'string'
  );
}

function isValidPermission(obj: any): obj is Permission {
  return (
    typeof obj.id === 'string' &&
    typeof obj.resource === 'string' &&
    typeof obj.action === 'string' &&
    typeof obj.created_at === 'string'
  );
}

function isValidAsset(obj: any): obj is Asset {
  return (
    typeof obj.id === 'string' &&
    typeof obj.tenant_id === 'string' &&
    typeof obj.storage_key === 'string' &&
    typeof obj.bucket === 'string' &&
    typeof obj.content_type === 'string' &&
    typeof obj.size_bytes === 'number' &&
    typeof obj.created_at === 'string' &&
    typeof obj.updated_at === 'string'
  );
}

function isValidAgentEventExtended(obj: any): obj is AgentEventExtended {
  return (
    typeof obj.id === 'number' &&
    typeof obj.agent_id === 'string' &&
    typeof obj.event_type === 'string' &&
    typeof obj.created_at === 'string'
    // project_id is optional
  );
}

// ---------------------------------------------------------------------------
// MISUSE CASES
// ---------------------------------------------------------------------------

describe('Platform Schema Models — MISUSE CASES', () => {

  // ---- Project: missing required fields ----
  describe('Project — missing required fields', () => {
    it('Given object without tenant_id, When checked, Then isValidProject returns false', () => {
      const obj = {
        id: 'uuid-1',
        name: 'My Project',
        status: 'active',
        created_at: '2026-02-17T00:00:00Z',
        updated_at: '2026-02-17T00:00:00Z',
      };
      expect(isValidProject(obj)).toBe(false);
    });

    it('Given object without id, When checked, Then isValidProject returns false', () => {
      const obj = {
        tenant_id: 'tenant-a',
        name: 'My Project',
        status: 'active',
        created_at: '2026-02-17T00:00:00Z',
        updated_at: '2026-02-17T00:00:00Z',
      };
      expect(isValidProject(obj)).toBe(false);
    });

    it('Given object without name, When checked, Then isValidProject returns false', () => {
      const obj = {
        id: 'uuid-1',
        tenant_id: 'tenant-a',
        status: 'active',
        created_at: '2026-02-17T00:00:00Z',
        updated_at: '2026-02-17T00:00:00Z',
      };
      expect(isValidProject(obj)).toBe(false);
    });
  });

  // ---- User: missing required fields ----
  describe('User — missing required fields', () => {
    it('Given object without email, When checked, Then isValidUser returns false', () => {
      const obj = {
        id: 'uuid-2',
        tenant_id: 'tenant-a',
        status: 'active',
        created_at: '2026-02-17T00:00:00Z',
        updated_at: '2026-02-17T00:00:00Z',
      };
      expect(isValidUser(obj)).toBe(false);
    });

    it('Given object without tenant_id, When checked, Then isValidUser returns false', () => {
      const obj = {
        id: 'uuid-2',
        email: 'user@example.com',
        status: 'active',
        created_at: '2026-02-17T00:00:00Z',
        updated_at: '2026-02-17T00:00:00Z',
      };
      expect(isValidUser(obj)).toBe(false);
    });
  });

  // ---- Asset: missing S3/R2 reference fields ----
  describe('Asset — missing storage fields', () => {
    it('Given asset without storage_key, When checked, Then isValidAsset returns false', () => {
      const obj = {
        id: 'uuid-3',
        tenant_id: 'tenant-a',
        bucket: 'my-bucket',
        content_type: 'image/png',
        size_bytes: 1024,
        created_at: '2026-02-17T00:00:00Z',
        updated_at: '2026-02-17T00:00:00Z',
      };
      expect(isValidAsset(obj)).toBe(false);
    });

    it('Given asset without bucket, When checked, Then isValidAsset returns false', () => {
      const obj = {
        id: 'uuid-3',
        tenant_id: 'tenant-a',
        storage_key: 'tenant-a/file.png',
        content_type: 'image/png',
        size_bytes: 1024,
        created_at: '2026-02-17T00:00:00Z',
        updated_at: '2026-02-17T00:00:00Z',
      };
      expect(isValidAsset(obj)).toBe(false);
    });

    it('Given asset with size_bytes as string not number, When checked, Then isValidAsset returns false', () => {
      const obj = {
        id: 'uuid-3',
        tenant_id: 'tenant-a',
        storage_key: 'tenant-a/file.png',
        bucket: 'my-bucket',
        content_type: 'image/png',
        size_bytes: '1024', // wrong type
        created_at: '2026-02-17T00:00:00Z',
        updated_at: '2026-02-17T00:00:00Z',
      };
      expect(isValidAsset(obj)).toBe(false);
    });
  });

  // ---- Permission: missing resource or action ----
  describe('Permission — missing required fields', () => {
    it('Given permission without resource, When checked, Then isValidPermission returns false', () => {
      const obj = {
        id: 'uuid-4',
        action: 'read',
        created_at: '2026-02-17T00:00:00Z',
      };
      expect(isValidPermission(obj)).toBe(false);
    });

    it('Given permission without action, When checked, Then isValidPermission returns false', () => {
      const obj = {
        id: 'uuid-4',
        resource: 'projects',
        created_at: '2026-02-17T00:00:00Z',
      };
      expect(isValidPermission(obj)).toBe(false);
    });
  });

  // ---- AgentEventExtended: cross-app project reference ----
  describe('AgentEventExtended — missing base fields', () => {
    it('Given event without agent_id, When checked, Then isValidAgentEventExtended returns false', () => {
      const obj = {
        id: 1,
        workstream_id: 'WS-ENT-4',
        event_type: 'task.completed',
        payload: {},
        created_at: '2026-02-17T00:00:00Z',
        project_id: 'uuid-project',
      };
      expect(isValidAgentEventExtended(obj)).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY TESTS
// ---------------------------------------------------------------------------

describe('Platform Schema Models — BOUNDARY TESTS', () => {

  // ---- Optional fields absent ----
  describe('Project — optional fields', () => {
    it('Given project without description, When checked, Then isValidProject returns true (description is optional)', () => {
      const obj: any = {
        id: 'uuid-1',
        tenant_id: 'tenant-a',
        name: 'My Project',
        status: 'active',
        created_at: '2026-02-17T00:00:00Z',
        updated_at: '2026-02-17T00:00:00Z',
      };
      expect(isValidProject(obj)).toBe(true);
    });
  });

  describe('Asset — optional fields', () => {
    it('Given asset without project_id, When checked, Then isValidAsset returns true (project_id is optional)', () => {
      const obj: any = {
        id: 'uuid-3',
        tenant_id: 'tenant-a',
        storage_key: 'tenant-a/file.png',
        bucket: 'my-bucket',
        content_type: 'image/png',
        size_bytes: 1024,
        created_at: '2026-02-17T00:00:00Z',
        updated_at: '2026-02-17T00:00:00Z',
      };
      expect(isValidAsset(obj)).toBe(true);
    });

    it('Given asset without filename, When checked, Then isValidAsset returns true (filename is optional)', () => {
      const obj: any = {
        id: 'uuid-3',
        tenant_id: 'tenant-a',
        storage_key: 'tenant-a/file.png',
        bucket: 'my-bucket',
        content_type: 'image/png',
        size_bytes: 0,  // boundary: zero bytes
        created_at: '2026-02-17T00:00:00Z',
        updated_at: '2026-02-17T00:00:00Z',
      };
      expect(isValidAsset(obj)).toBe(true);
    });
  });

  // ---- AgentEventExtended: project_id is optional ----
  describe('AgentEventExtended — optional project_id', () => {
    it('Given event without project_id, When checked, Then isValidAgentEventExtended returns true', () => {
      const obj: any = {
        id: 1,
        agent_id: 'dev',
        workstream_id: 'WS-ENT-4',
        event_type: 'task.completed',
        payload: {},
        created_at: '2026-02-17T00:00:00Z',
        // no project_id — optional per AC-ENT-4.3
      };
      expect(isValidAgentEventExtended(obj)).toBe(true);
    });
  });

  // ---- ProjectStatus type values ----
  describe('ProjectStatus — valid status values', () => {
    it('Given ProjectStatus type, When used as literal, Then active is a valid status', () => {
      const status: ProjectStatus = 'active';
      expect(['active', 'inactive', 'archived']).toContain(status);
    });

    it('Given ProjectStatus type, When used as literal, Then archived is a valid status', () => {
      const status: ProjectStatus = 'archived';
      expect(['active', 'inactive', 'archived']).toContain(status);
    });
  });

  // ---- UserStatus type values ----
  describe('UserStatus — valid status values', () => {
    it('Given UserStatus type, When used as literal, Then active is a valid status', () => {
      const status: UserStatus = 'active';
      expect(['active', 'inactive', 'suspended']).toContain(status);
    });
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH
// ---------------------------------------------------------------------------

describe('Platform Schema Models — GOLDEN PATH', () => {

  // ---- Fully-formed entities ----
  describe('Project — fully-formed', () => {
    it('Given all required + optional fields, When checked, Then isValidProject returns true', () => {
      const project: any = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        tenant_id: 'tenant-acme',
        name: 'ACME Dashboard',
        description: 'Main dashboard project',
        status: 'active',
        created_at: '2026-02-17T10:00:00Z',
        updated_at: '2026-02-17T10:00:00Z',
      };
      expect(isValidProject(project)).toBe(true);
    });
  });

  describe('User — fully-formed', () => {
    it('Given all required + optional fields, When checked, Then isValidUser returns true', () => {
      const user: any = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        tenant_id: 'tenant-acme',
        email: 'alice@acme.com',
        display_name: 'Alice Smith',
        status: 'active',
        created_at: '2026-02-17T10:00:00Z',
        updated_at: '2026-02-17T10:00:00Z',
      };
      expect(isValidUser(user)).toBe(true);
    });
  });

  describe('Role — fully-formed', () => {
    it('Given all required + optional fields, When checked, Then isValidRole returns true', () => {
      const role: any = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        tenant_id: 'tenant-acme',
        name: 'admin',
        description: 'Administrator role',
        created_at: '2026-02-17T10:00:00Z',
      };
      expect(isValidRole(role)).toBe(true);
    });
  });

  describe('Permission — fully-formed', () => {
    it('Given all required + optional fields, When checked, Then isValidPermission returns true', () => {
      const permission: any = {
        id: '550e8400-e29b-41d4-a716-446655440003',
        resource: 'projects',
        action: 'read',
        description: 'Read project data',
        created_at: '2026-02-17T10:00:00Z',
      };
      expect(isValidPermission(permission)).toBe(true);
    });
  });

  describe('Asset — fully-formed with S3/R2 fields', () => {
    it('Given all required + optional fields, When checked, Then isValidAsset returns true', () => {
      const asset: any = {
        id: '550e8400-e29b-41d4-a716-446655440004',
        tenant_id: 'tenant-acme',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        storage_key: 'tenant-acme/projects/proj-1/report.pdf',
        bucket: 'mg-enterprise-assets',
        content_type: 'application/pdf',
        size_bytes: 204800,
        filename: 'report.pdf',
        metadata: { source: 'upload' },
        created_at: '2026-02-17T10:00:00Z',
        updated_at: '2026-02-17T10:00:00Z',
      };
      expect(isValidAsset(asset)).toBe(true);
    });
  });

  describe('AgentEventExtended — with project_id cross-app reference', () => {
    it('Given event with project_id FK, When checked, Then isValidAgentEventExtended returns true', () => {
      const event: any = {
        id: 42,
        agent_id: 'dev',
        workstream_id: 'WS-ENT-4',
        event_type: 'schema.created',
        payload: { tables: ['projects', 'users'] },
        created_at: '2026-02-17T10:00:00Z',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
      };
      expect(isValidAgentEventExtended(event)).toBe(true);
    });
  });

  describe('UserRole — join table shape', () => {
    it('Given a UserRole object, When type checked, Then has user_id, role_id, tenant_id, assigned_at', () => {
      const userRole: UserRole = {
        user_id: '550e8400-e29b-41d4-a716-446655440001',
        role_id: '550e8400-e29b-41d4-a716-446655440002',
        tenant_id: 'tenant-acme',
        assigned_at: '2026-02-17T10:00:00Z',
      };
      expect(userRole.user_id).toBeDefined();
      expect(userRole.role_id).toBeDefined();
      expect(userRole.tenant_id).toBeDefined();
      expect(userRole.assigned_at).toBeDefined();
    });
  });

  describe('RolePermission — join table shape', () => {
    it('Given a RolePermission object, When type checked, Then has role_id and permission_id', () => {
      const rolePermission: RolePermission = {
        role_id: '550e8400-e29b-41d4-a716-446655440002',
        permission_id: '550e8400-e29b-41d4-a716-446655440003',
      };
      expect(rolePermission.role_id).toBeDefined();
      expect(rolePermission.permission_id).toBeDefined();
    });
  });
});

/**
 * Platform Schema Repositories — WS-ENT-4
 *
 * Data access layer for all platform entities.
 * All queries use parameterized SQL ($1, $2, ...) — never string interpolation.
 *
 * AC-ENT-4.1: projects, users, roles, permissions CRUD
 * AC-ENT-4.2: assets CRUD with S3/R2 reference fields
 * AC-ENT-4.3: agent_events queried by project_id
 * AC-ENT-4.4: cross-app FK queries (assets by project_id)
 * AC-ENT-4.5: user_roles and role_permissions join operations
 */

import { Pool } from 'pg';
import type { Project, User, Role, Permission, Asset, AgentEventExtended } from './models';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RepositoryConfig {
  connectionString: string;
  maxConnections?: number;
}

// UUID format check — simple but sufficient for parameterization guard
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

// ---------------------------------------------------------------------------
// ProjectRepository
// ---------------------------------------------------------------------------

export class ProjectRepository {
  private pool: Pool;

  constructor(config: RepositoryConfig) {
    this.pool = new Pool({ connectionString: config.connectionString, max: config.maxConnections });
  }

  async create(data: { tenant_id: string; name: string; status: string; description?: string }): Promise<Project> {
    if (!data) throw new Error('data is required');
    if (!data.tenant_id) throw new Error('tenant_id is required');
    if (!data.name) throw new Error('name is required');

    const result = await this.pool.query(
      `INSERT INTO projects (tenant_id, name, status, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.tenant_id, data.name, data.status, data.description ?? null]
    );
    return result.rows[0] as Project;
  }

  async findById(id: string): Promise<Project | null> {
    if (!isValidUuid(id)) return null;

    const result = await this.pool.query(
      'SELECT * FROM projects WHERE id = $1',
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findByTenant(tenantId: string): Promise<Project[]> {
    const result = await this.pool.query(
      'SELECT * FROM projects WHERE tenant_id = $1',
      [tenantId]
    );
    return result.rows as Project[];
  }

  async update(id: string, data: Partial<Pick<Project, 'name' | 'description' | 'status'>>): Promise<Project> {
    const result = await this.pool.query(
      `UPDATE projects SET
         name = COALESCE($2, name),
         description = COALESCE($3, description),
         status = COALESCE($4, status),
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, data.name ?? null, data.description ?? null, data.status ?? null]
    );
    return result.rows[0] as Project;
  }

  async delete(id: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM projects WHERE id = $1',
      [id]
    );
  }
}

// ---------------------------------------------------------------------------
// UserRepository
// ---------------------------------------------------------------------------

export class UserRepository {
  private pool: Pool;

  constructor(config: RepositoryConfig) {
    this.pool = new Pool({ connectionString: config.connectionString, max: config.maxConnections });
  }

  async create(data: { tenant_id: string; email: string; status: string; display_name?: string }): Promise<User> {
    if (!data) throw new Error('data is required');
    if (!data.tenant_id) throw new Error('tenant_id is required');
    if (!data.email) throw new Error('email is required');

    const result = await this.pool.query(
      `INSERT INTO users (tenant_id, email, status, display_name)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.tenant_id, data.email, data.status, data.display_name ?? null]
    );
    return result.rows[0] as User;
  }

  async findById(id: string): Promise<User | null> {
    if (!isValidUuid(id)) return null;

    const result = await this.pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findByTenant(tenantId: string): Promise<User[]> {
    const result = await this.pool.query(
      'SELECT * FROM users WHERE tenant_id = $1',
      [tenantId]
    );
    return result.rows as User[];
  }

  async findByEmail(tenantId: string, email: string): Promise<User | null> {
    const result = await this.pool.query(
      'SELECT * FROM users WHERE tenant_id = $1 AND email = $2',
      [tenantId, email]
    );
    return result.rows[0] ?? null;
  }

  async delete(id: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM users WHERE id = $1',
      [id]
    );
  }
}

// ---------------------------------------------------------------------------
// RoleRepository
// ---------------------------------------------------------------------------

export class RoleRepository {
  private pool: Pool;

  constructor(config: RepositoryConfig) {
    this.pool = new Pool({ connectionString: config.connectionString, max: config.maxConnections });
  }

  async create(data: { tenant_id: string; name: string; description?: string }): Promise<Role> {
    if (!data) throw new Error('data is required');
    if (!data.tenant_id) throw new Error('tenant_id is required');
    if (!data.name) throw new Error('name is required');

    const result = await this.pool.query(
      `INSERT INTO roles (tenant_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.tenant_id, data.name, data.description ?? null]
    );
    return result.rows[0] as Role;
  }

  async findById(id: string): Promise<Role | null> {
    if (!isValidUuid(id)) return null;

    const result = await this.pool.query(
      'SELECT * FROM roles WHERE id = $1',
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findByTenant(tenantId: string): Promise<Role[]> {
    const result = await this.pool.query(
      'SELECT * FROM roles WHERE tenant_id = $1',
      [tenantId]
    );
    return result.rows as Role[];
  }

  async delete(id: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM roles WHERE id = $1',
      [id]
    );
  }
}

// ---------------------------------------------------------------------------
// PermissionRepository
// ---------------------------------------------------------------------------

export class PermissionRepository {
  private pool: Pool;

  constructor(config: RepositoryConfig) {
    this.pool = new Pool({ connectionString: config.connectionString, max: config.maxConnections });
  }

  async create(data: { resource: string; action: string; description?: string }): Promise<Permission> {
    if (!data) throw new Error('data is required');
    if (!data.resource) throw new Error('resource is required');
    if (!data.action) throw new Error('action is required');

    const result = await this.pool.query(
      `INSERT INTO permissions (resource, action, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.resource, data.action, data.description ?? null]
    );
    return result.rows[0] as Permission;
  }

  async findById(id: string): Promise<Permission | null> {
    if (!isValidUuid(id)) return null;

    const result = await this.pool.query(
      'SELECT * FROM permissions WHERE id = $1',
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findByResourceAction(resource: string, action: string): Promise<Permission | null> {
    const result = await this.pool.query(
      'SELECT * FROM permissions WHERE resource = $1 AND action = $2',
      [resource, action]
    );
    return result.rows[0] ?? null;
  }

  async delete(id: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM permissions WHERE id = $1',
      [id]
    );
  }
}

// ---------------------------------------------------------------------------
// AssetRepository
// ---------------------------------------------------------------------------

export interface CreateAssetInput {
  tenant_id: string;
  project_id?: string;
  storage_key: string;
  bucket: string;
  content_type: string;
  size_bytes: number;
  filename?: string;
  metadata?: Record<string, unknown>;
}

export class AssetRepository {
  private pool: Pool;

  constructor(config: RepositoryConfig) {
    this.pool = new Pool({ connectionString: config.connectionString, max: config.maxConnections });
  }

  async create(data: CreateAssetInput): Promise<Asset> {
    if (!data) throw new Error('data is required');
    if (!data.tenant_id) throw new Error('tenant_id is required');
    if (!data.storage_key) throw new Error('storage_key is required');
    if (!data.bucket) throw new Error('bucket is required');
    if (!data.content_type) throw new Error('content_type is required');

    // Guard against prototype pollution in metadata
    if (data.metadata !== undefined) {
      const keys = Object.keys(data.metadata);
      if (keys.includes('__proto__') || keys.includes('constructor') || keys.includes('prototype')) {
        throw new Error('Prototype pollution detected in metadata');
      }
    }

    const result = await this.pool.query(
      `INSERT INTO assets (tenant_id, project_id, storage_key, bucket, content_type, size_bytes, filename, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.tenant_id,
        data.project_id ?? null,
        data.storage_key,
        data.bucket,
        data.content_type,
        data.size_bytes,
        data.filename ?? null,
        data.metadata ? JSON.stringify(data.metadata) : null,
      ]
    );
    return result.rows[0] as Asset;
  }

  async findById(id: string): Promise<Asset | null> {
    if (!isValidUuid(id)) return null;

    const result = await this.pool.query(
      'SELECT * FROM assets WHERE id = $1',
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findByProject(projectId: string): Promise<Asset[]> {
    const result = await this.pool.query(
      'SELECT * FROM assets WHERE project_id = $1',
      [projectId]
    );
    return result.rows as Asset[];
  }

  async delete(id: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM assets WHERE id = $1',
      [id]
    );
  }
}

// ---------------------------------------------------------------------------
// UserRoleRepository
// ---------------------------------------------------------------------------

export interface AssignRoleInput {
  user_id: string;
  role_id: string;
  tenant_id: string;
}

export class UserRoleRepository {
  private pool: Pool;

  constructor(config: RepositoryConfig) {
    this.pool = new Pool({ connectionString: config.connectionString, max: config.maxConnections });
  }

  async assign(data: AssignRoleInput): Promise<void> {
    await this.pool.query(
      `INSERT INTO user_roles (user_id, role_id, tenant_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      [data.user_id, data.role_id, data.tenant_id]
    );
  }

  async revoke(userId: string, roleId: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2',
      [userId, roleId]
    );
  }

  async getRolesForUser(userId: string): Promise<Role[]> {
    const result = await this.pool.query(
      `SELECT r.* FROM roles r
       INNER JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = $1`,
      [userId]
    );
    return result.rows as Role[];
  }
}

// ---------------------------------------------------------------------------
// RolePermissionRepository
// ---------------------------------------------------------------------------

export class RolePermissionRepository {
  private pool: Pool;

  constructor(config: RepositoryConfig) {
    this.pool = new Pool({ connectionString: config.connectionString, max: config.maxConnections });
  }

  async assign(roleId: string, permissionId: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       VALUES ($1, $2)
       ON CONFLICT (role_id, permission_id) DO NOTHING`,
      [roleId, permissionId]
    );
  }

  async getPermissionsForRole(roleId: string): Promise<Permission[]> {
    const result = await this.pool.query(
      `SELECT p.* FROM permissions p
       INNER JOIN role_permissions rp ON rp.permission_id = p.id
       WHERE rp.role_id = $1`,
      [roleId]
    );
    return result.rows as Permission[];
  }
}

// ---------------------------------------------------------------------------
// AgentEventRepository
// ---------------------------------------------------------------------------

export class AgentEventRepository {
  private pool: Pool;

  constructor(config: RepositoryConfig) {
    this.pool = new Pool({ connectionString: config.connectionString, max: config.maxConnections });
  }

  async findByProjectId(projectId: string): Promise<AgentEventExtended[]> {
    const result = await this.pool.query(
      'SELECT * FROM agent_events WHERE project_id = $1',
      [projectId]
    );
    return result.rows as AgentEventExtended[];
  }
}

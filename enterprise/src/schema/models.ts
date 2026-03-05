/**
 * Platform Schema Models — WS-ENT-4
 *
 * TypeScript interfaces for all shared platform entities.
 * AC-ENT-4.1: Project, User, Role, Permission types
 * AC-ENT-4.2: Asset type with S3/R2 reference fields
 * AC-ENT-4.3: AgentEventExtended with optional project_id
 * AC-ENT-4.4: UUID foreign key cross-references
 * AC-ENT-4.5: RBAC join types (UserRole, RolePermission)
 */

// ---------------------------------------------------------------------------
// Status types
// ---------------------------------------------------------------------------

export type ProjectStatus = 'active' | 'inactive' | 'archived';
export type UserStatus = 'active' | 'inactive' | 'suspended';

// ---------------------------------------------------------------------------
// Entity interfaces
// ---------------------------------------------------------------------------

export interface Project {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  display_name?: string;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  description?: string;
  created_at: string;
}

export interface Asset {
  id: string;
  tenant_id: string;
  project_id?: string;
  storage_key: string;
  bucket: string;
  content_type: string;
  size_bytes: number;
  filename?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Join table types
// ---------------------------------------------------------------------------

export interface UserRole {
  user_id: string;
  role_id: string;
  tenant_id: string;
  assigned_at: string;
}

export interface RolePermission {
  role_id: string;
  permission_id: string;
}

// ---------------------------------------------------------------------------
// Extended types (cross-app references)
// ---------------------------------------------------------------------------

export interface AgentEventExtended {
  id: number;
  agent_id: string;
  workstream_id?: string;
  event_type: string;
  payload?: Record<string, unknown>;
  created_at: string;
  project_id?: string;
}

// ---------------------------------------------------------------------------
// Dashboard types (WS-DB-2)
// ---------------------------------------------------------------------------

export interface Workstream {
  workstream_id: string;
  name?: string;
  phase: string;
  gate_status?: string;
  blocker?: string;
  agent_id?: string;
  data?: Record<string, unknown>;
  synced_at?: string;
  created_at: string;
  updated_at: string;
}

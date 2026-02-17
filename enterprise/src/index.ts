// Enterprise edition entry point
// Provides PostgreSQL storage, multi-tenant isolation, and data export connectors

export const ENTERPRISE_VERSION = "1.0.0";

export { PostgresAdapter } from "./storage/postgres-adapter";
export type { PostgresAdapterConfig, AppendEventInput, AgentEvent, EventQueryFilter } from "./storage/postgres-adapter";
export { MigrationRunner } from "./storage/migrations";
export type { Migration, MigrationResult, RollbackResult } from "./storage/migrations";

// Isolation — WS-ENT-3
export { TenantContext, createTenantContext, withTenantContext } from "./isolation/tenant-context";
export { buildRlsMigrations, TENANT_SCOPED_TABLES, RLS_MIGRATION_VERSION_START } from "./isolation/rls-policies";
export type { RlsPolicyDefinition } from "./isolation/rls-policies";
export { TenantMiddleware, createTenantMiddleware } from "./isolation/tenant-middleware";
export type { TenantMiddlewareConfig, TenantResolutionStrategy, TenantContext as MiddlewareTenantContext } from "./isolation/tenant-middleware";
export { DatabasePerTenantManager } from "./isolation/database-per-tenant";
export type { DatabasePerTenantConfig, TenantPoolEntry } from "./isolation/database-per-tenant";

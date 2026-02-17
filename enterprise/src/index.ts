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

// Platform Schema — WS-ENT-4
export { PLATFORM_SCHEMA_MIGRATIONS, PLATFORM_SCHEMA_VERSION_START, PLATFORM_TABLES, buildPlatformSchemaMigrations } from "./schema/platform-schema";
export type { PlatformTable } from "./schema/platform-schema";
export type { Project, User, Role, Permission, Asset, UserRole, RolePermission, AgentEventExtended, ProjectStatus, UserStatus } from "./schema/models";
export { ProjectRepository, UserRepository, RoleRepository, PermissionRepository, AssetRepository, UserRoleRepository, RolePermissionRepository, AgentEventRepository } from "./schema/repositories";
export type { RepositoryConfig, CreateAssetInput, AssignRoleInput } from "./schema/repositories";
export { hasPermission, checkPermissionOrThrow, assignRole, revokeRole, getUserPermissions, getUserRoles } from "./schema/rbac";
export type { RbacConfig, PermissionCheckInput, RoleAssignInput, UserPermissionsInput } from "./schema/rbac";

// Asset Storage — WS-ENT-5
export { S3ObjectStorageClient, AssetStorageService } from "./assets/asset-storage-service";
export type { ObjectStorageClient, S3ObjectStorageClientConfig, AssetStorageServiceConfig, UploadInput, GetUploadUrlInput } from "./assets/asset-storage-service";
export { processMcpToolOutput } from "./assets/mcp-asset-pipeline";
export type { ProcessMcpToolOutputInput } from "./assets/mcp-asset-pipeline";

// Vector Search — WS-ENT-6
export { VectorSearchService } from "./vector/vector-search";
export type { VectorSearchResult } from "./vector/vector-search";
export { MockEmbeddingProvider, NomicEmbeddingProvider, OpenAIEmbeddingProvider } from "./vector/embedding-provider";
export type { EmbeddingProvider } from "./vector/embedding-provider";
export { buildVectorMigrations, VECTOR_SCHEMA_VERSION_START, VECTOR_COLUMN_DIMENSIONS } from "./vector/vector-migrations";
export type { SearchFilters, SearchOptions, HybridSearchOptions, ReindexResult } from "./vector/vector-search";

// Compliance / SOC 2 — WS-ENT-9
export { AuditTrailService, buildAuditMigrations, AUDIT_SCHEMA_VERSION_START } from "./compliance/audit-trail";
export { FieldEncryption, MockKeyProvider } from "./compliance/field-encryption";
export type { KeyProvider, EncryptedField } from "./compliance/field-encryption";

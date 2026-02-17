// Enterprise edition entry point
// Provides PostgreSQL storage, multi-tenant isolation, and data export connectors

export const ENTERPRISE_VERSION = "1.0.0";

export { PostgresAdapter } from "./storage/postgres-adapter";
export type { PostgresAdapterConfig, AppendEventInput, AgentEvent, EventQueryFilter } from "./storage/postgres-adapter";
export { MigrationRunner } from "./storage/migrations";
export type { Migration, MigrationResult, RollbackResult } from "./storage/migrations";

/**
 * DatabasePerTenantManager — WS-ENT-3
 *
 * Manages a pool-per-tenant model where each tenant gets its own
 * PostgreSQL connection pool pointed at a separate database.
 *
 * Features:
 * - Pool creation on first request per tenant (lazy)
 * - Pool reuse for subsequent requests to the same tenant
 * - Pool limit enforcement (maxPoolsPerInstance)
 * - Graceful closeAll() — errors in individual pool.end() are swallowed
 * - Validation: tenant ID, DSN, and disabled-mode checks before any pool creation
 *
 * AC-ENT-3.5: Database-per-tenant option available via config flag
 *
 * AC-ENT-3.5: Database-per-tenant option available via config flag
 */

import { Pool } from 'pg';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DatabasePerTenantConfig {
  enabled: boolean;
  tenantDsnMap: Record<string, string>;
  maxPoolsPerInstance?: number;
  maxConnectionsPerPool?: number;
}

export interface TenantPoolEntry {
  tenantId: string;
  pool: any;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Validate a PostgreSQL DSN.
 * Rejects empty strings and strings containing shell metacharacters.
 */
function validateDsn(dsn: string, tenantId: string): void {
  if (!dsn || dsn.trim() === '') {
    throw new Error(`Invalid DSN for tenant '${tenantId}': DSN cannot be empty`);
  }

  // Reject obvious shell injection / OS command chars in the DSN
  const shellMetaChars = [';', '|', '&', '`', '$', '(', ')', '{', '}', '<', '>'];
  for (const ch of shellMetaChars) {
    if (dsn.includes(ch)) {
      throw new Error(
        `Invalid DSN for tenant '${tenantId}': DSN contains malformed or dangerous characters (${JSON.stringify(ch)}). Invalid or malformed DSN.`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// DatabasePerTenantManager
// ---------------------------------------------------------------------------

export class DatabasePerTenantManager {
  private config: DatabasePerTenantConfig;
  private pools: Map<string, any>;

  constructor(config: DatabasePerTenantConfig) {
    if (!config) {
      throw new Error('DatabasePerTenantConfig is required');
    }

    if (!config.tenantDsnMap || typeof config.tenantDsnMap !== 'object' || Array.isArray(config.tenantDsnMap)) {
      throw new Error('tenantDsnMap is required and must be a non-null object');
    }

    // Validate all DSNs at construction time (fail fast)
    for (const [tenantId, dsn] of Object.entries(config.tenantDsnMap)) {
      validateDsn(dsn, tenantId);
    }

    this.config = config;
    this.pools = new Map();
  }

  /**
   * Get or create a pg.Pool for the given tenant.
   *
   * Throws:
   * - If the feature is disabled (enabled: false)
   * - If tenantId is null or empty
   * - If tenantId is not in tenantDsnMap (unknown tenant)
   * - If maxPoolsPerInstance limit would be exceeded
   */
  async getPoolForTenant(tenantId: string): Promise<any> {
    // Check feature flag first
    if (!this.config.enabled) {
      throw new Error(
        'Database-per-tenant feature is disabled. Set enabled: true in DatabasePerTenantConfig.'
      );
    }

    // Reject null/undefined/empty
    if (tenantId === null || tenantId === undefined) {
      throw new Error('Tenant ID is required');
    }

    if (typeof tenantId !== 'string' || tenantId.trim() === '') {
      throw new Error('Tenant ID cannot be empty');
    }

    // Return existing pool if already created
    const existing = this.pools.get(tenantId);
    if (existing) {
      return existing;
    }

    // Validate tenant is in the DSN map.
    // Note: injection chars in tenant ID are harmless here since the tenant ID
    // is only used as a Map key (no SQL involved). An unknown tenant (including
    // injection-char-containing tenants not in the map) gets "Unknown tenant" error.
    const dsn = this.config.tenantDsnMap[tenantId];
    if (dsn === undefined || dsn === null) {
      throw new Error(
        `Unknown tenant: '${tenantId}' is not configured in tenantDsnMap. Not found.`
      );
    }

    // Check maxPoolsPerInstance before creating a new one
    const maxPools = this.config.maxPoolsPerInstance ?? Infinity;
    if (this.pools.size >= maxPools) {
      throw new Error(
        `Pool limit exceeded: cannot create pool for tenant '${tenantId}'. ` +
        `Maximum pools per instance (${maxPools}) already reached.`
      );
    }

    // Create the pool
    const pool = new Pool({
      connectionString: dsn,
      max: this.config.maxConnectionsPerPool,
    });

    this.pools.set(tenantId, pool);
    return pool;
  }

  /**
   * Close a specific tenant's pool and remove it from the active pool map.
   */
  async closePool(tenantId: string): Promise<void> {
    const pool = this.pools.get(tenantId);
    if (!pool) {
      return;
    }
    this.pools.delete(tenantId);
    try {
      await pool.end();
    } catch {
      // Graceful degradation
    }
  }

  /**
   * Close all active tenant pools. Errors from individual pool.end() calls
   * are swallowed to ensure all pools are attempted.
   */
  async closeAll(): Promise<void> {
    const entries = Array.from(this.pools.entries());
    this.pools.clear();

    await Promise.all(
      entries.map(async ([, pool]) => {
        try {
          await pool.end();
        } catch {
          // Graceful degradation — don't block remaining closes
        }
      })
    );
  }

  /**
   * Returns an array of tenant IDs that currently have active pools.
   */
  listActiveTenants(): string[] {
    return Array.from(this.pools.keys());
  }

  /**
   * Returns an array of TenantPoolEntry objects for all active pools.
   */
  getPoolEntries(): TenantPoolEntry[] {
    return Array.from(this.pools.entries()).map(([tenantId, pool]) => ({
      tenantId,
      pool,
    }));
  }
}

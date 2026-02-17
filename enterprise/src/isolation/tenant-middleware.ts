/**
 * TenantMiddleware — WS-ENT-3
 *
 * Application-level tenant validation (defense in depth).
 * Runs BEFORE the database layer to validate that every request has a
 * legitimate, non-injected tenant ID.
 *
 * Responsibilities:
 * - Extract tenant ID from a configurable request header (default: x-tenant-id)
 * - Validate the tenant ID (no injection chars, length limit)
 * - Optionally validate against an allowlist (allowedTenants)
 * - Reject requests with missing, empty, or malformed tenant headers
 * - Reject cross-tenant access attempts via validateTenantAccess()
 *
 * AC-ENT-3.3: Application-level tenant middleware (defense in depth)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * How the middleware extracts the tenant ID from a request.
 * - 'header'      — reads from a request header (default strategy)
 * - 'jwt-claim'   — extracts from a JWT claim (future: requires jwt library)
 * - 'user-lookup' — looks up tenant from an authenticated user object
 */
export type TenantResolutionStrategy = 'header' | 'jwt-claim' | 'user-lookup';

const VALID_STRATEGIES: TenantResolutionStrategy[] = ['header', 'jwt-claim', 'user-lookup'];

export interface TenantMiddlewareConfig {
  strategy: TenantResolutionStrategy;
  headerName?: string;
  allowedTenants?: string[];
}

/**
 * The context object returned after successful tenant resolution.
 */
export interface TenantContext {
  tenantId: string;
  resolvedAt: string;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const INJECTION_CHARS = ["'", ';', '\x00', '\n', '--'];
const MAX_TENANT_ID_LENGTH = 255;

function validateTenantId(tenantId: string): void {
  if (!tenantId || tenantId.trim() === '') {
    throw new Error('Tenant ID is required and cannot be empty');
  }

  if (tenantId.length > MAX_TENANT_ID_LENGTH) {
    throw new Error(`Tenant ID exceeds maximum length of ${MAX_TENANT_ID_LENGTH}`);
  }

  for (const ch of INJECTION_CHARS) {
    if (tenantId.includes(ch)) {
      throw new Error(`Tenant ID contains disallowed characters`);
    }
  }
}

// ---------------------------------------------------------------------------
// TenantMiddleware
// ---------------------------------------------------------------------------

export class TenantMiddleware {
  private config: TenantMiddlewareConfig;
  private allowedTenantsSet: Set<string> | undefined;

  constructor(config: TenantMiddlewareConfig) {
    this.config = config;
    this.allowedTenantsSet =
      config.allowedTenants !== undefined
        ? new Set(config.allowedTenants)
        : undefined;
  }

  /**
   * Resolve the tenant ID from a request object.
   * Throws on any validation failure — never returns a bad tenant ID.
   */
  async resolveTenant(req: any): Promise<string> {
    const strategy = this.config.strategy;

    if (strategy === 'header') {
      return this._resolveFromHeader(req);
    }

    if (strategy === 'jwt-claim') {
      // Future: extract from JWT. For now, throw if not implemented.
      const token = req?.headers?.authorization || req?.headers?.['authorization'];
      if (!token) {
        throw new Error('JWT token is required for jwt-claim strategy');
      }
      throw new Error('jwt-claim strategy is not yet implemented');
    }

    if (strategy === 'user-lookup') {
      if (!req?.user) {
        throw new Error('Authenticated user is required for user-lookup strategy');
      }
      throw new Error('user-lookup strategy is not yet implemented');
    }

    throw new Error(`Unknown tenant resolution strategy: ${strategy}`);
  }

  private async _resolveFromHeader(req: any): Promise<string> {
    const headerName = this.config.headerName ?? 'x-tenant-id';
    const headerValue = req?.headers?.[headerName];

    // Handle array values (multiple headers with same name) — take first value
    let tenantId: string;
    if (Array.isArray(headerValue)) {
      // Take first canonical value; still validate it
      tenantId = headerValue[0];
    } else {
      tenantId = headerValue;
    }

    // Missing header
    if (tenantId === undefined || tenantId === null) {
      throw new Error(`Tenant header '${headerName}' is missing or required`);
    }

    // Validate the tenant ID (injection chars, length, emptiness)
    validateTenantId(tenantId);

    // Check against allowlist if configured
    if (this.allowedTenantsSet !== undefined) {
      if (!this.allowedTenantsSet.has(tenantId)) {
        throw new Error(
          `Unauthorized tenant: '${tenantId}' is not in the allowed tenants list`
        );
      }
    }

    return tenantId;
  }

  /**
   * Validate that a request tenant matches the resource tenant.
   * Prevents cross-tenant data access (escalation).
   *
   * @param requestTenant  - The tenant extracted from the request
   * @param resourceTenant - The tenant that owns the resource being accessed
   */
  async validateTenantAccess(requestTenant: string, resourceTenant: string): Promise<void> {
    if (requestTenant !== resourceTenant) {
      throw new Error(
        `Unauthorized: tenant '${requestTenant}' cannot access resources of tenant '${resourceTenant}'. Access denied.`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a TenantMiddleware instance from configuration.
 * Validates config at construction time — throws on invalid config.
 */
export function createTenantMiddleware(config: TenantMiddlewareConfig): TenantMiddleware {
  if (!config) {
    throw new Error('TenantMiddlewareConfig is required');
  }

  if (!config.strategy) {
    throw new Error('TenantMiddlewareConfig.strategy is required');
  }

  if (!VALID_STRATEGIES.includes(config.strategy)) {
    throw new Error(
      `Invalid tenant resolution strategy: '${config.strategy}'. Must be one of: ${VALID_STRATEGIES.join(', ')}`
    );
  }

  return new TenantMiddleware(config);
}

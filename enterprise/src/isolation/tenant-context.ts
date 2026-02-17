/**
 * TenantContext — WS-ENT-3
 *
 * Manages per-request tenant isolation via PostgreSQL session variables.
 * Uses SELECT set_config('app.current_tenant', $1, true) to set the tenant
 * context on a pg Client, enabling RLS policies to filter by tenant.
 *
 * Security: validates tenantId before any DB call (no injection chars).
 * Cleanup: clearTenant() always runs, even if callback throws.
 *
 * AC-ENT-3.2: Tenant context injection via SET app.current_tenant per request
 */

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const INJECTION_CHARS = ["'", ';', '\x00', '\n', '--'];
const MAX_TENANT_ID_LENGTH = 255;

function validateTenantId(tenantId: string): void {
  if (tenantId === null || tenantId === undefined) {
    throw new Error('Tenant ID is required');
  }

  if (typeof tenantId !== 'string') {
    throw new Error('Tenant ID must be a string');
  }

  if (tenantId.trim() === '') {
    throw new Error('Tenant ID cannot be empty or whitespace');
  }

  if (tenantId.length > MAX_TENANT_ID_LENGTH) {
    throw new Error(`Tenant ID exceeds maximum length of ${MAX_TENANT_ID_LENGTH}`);
  }

  for (const ch of INJECTION_CHARS) {
    if (tenantId.includes(ch)) {
      throw new Error(`Tenant ID contains disallowed characters: ${JSON.stringify(ch)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// TenantContext
// ---------------------------------------------------------------------------

export class TenantContext {
  private client: any;
  private currentTenant: string | undefined;

  constructor(client: any) {
    if (!client) {
      throw new Error('A pg Client is required to create a TenantContext');
    }
    this.client = client;
    this.currentTenant = undefined;
  }

  /**
   * Set the tenant context on the underlying pg client.
   * Uses parameterized set_config to avoid SQL injection.
   */
  async setTenant(tenantId: string): Promise<void> {
    validateTenantId(tenantId);

    // Use set_config with parameterized call — the value is $2, not interpolated
    await this.client.query(
      "SELECT set_config('app.current_tenant', $1, true)",
      [tenantId]
    );

    this.currentTenant = tenantId;
  }

  /**
   * Clear the tenant context on the underlying pg client.
   * Safe to call even if setTenant was never called.
   */
  async clearTenant(): Promise<void> {
    await this.client.query(
      "SELECT set_config('app.current_tenant', '', true)"
    );
    this.currentTenant = undefined;
  }

  /**
   * Returns the in-memory tenant ID (does not query the DB).
   * Returns undefined if no tenant has been set or after clearTenant().
   */
  getCurrentTenant(): string | undefined {
    return this.currentTenant;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Factory function that creates a TenantContext for a given pg client.
 */
export function createTenantContext(client: any): TenantContext {
  return new TenantContext(client);
}

// ---------------------------------------------------------------------------
// withTenantContext
// ---------------------------------------------------------------------------

/**
 * Wraps a callback with tenant context: sets the tenant before running the
 * callback, then clears it afterwards — even if the callback throws.
 *
 * @param client  - A pg Client (already checked out from pool)
 * @param tenantId - The tenant to activate for this scope
 * @param callback - Async work to execute within the tenant context
 * @returns The return value of the callback
 */
export async function withTenantContext<T>(
  client: any,
  tenantId: string,
  callback: () => Promise<T>
): Promise<T> {
  const ctx = new TenantContext(client);
  await ctx.setTenant(tenantId);

  try {
    const result = await callback();
    return result;
  } finally {
    // Always clear — even if callback throws or clearTenant itself throws
    try {
      await ctx.clearTenant();
    } catch {
      // Graceful degradation — don't mask the original error
    }
  }
}

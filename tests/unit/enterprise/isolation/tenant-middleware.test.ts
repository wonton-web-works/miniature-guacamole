/**
 * TenantMiddleware Unit Tests — WS-ENT-3
 *
 * Tests for application-level tenant validation middleware.
 * This is the defense-in-depth layer that runs BEFORE RLS.
 * Does NOT require a running Postgres instance.
 *
 * AC-ENT-3.3: Application-level tenant middleware (defense in depth)
 *
 * Test order (misuse-first CAD protocol):
 *   1. MISUSE CASES  — bypass attempts, forged tenant headers, missing tenants, cross-tenant escalation
 *   2. BOUNDARY TESTS — tenant ID format edge cases, allowlist/blocklist, concurrent requests
 *   3. GOLDEN PATH   — valid tenant resolves, middleware chains, context propagation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import from paths that do NOT exist yet — tests will be RED
import {
  TenantMiddleware,
  createTenantMiddleware,
  TenantResolutionStrategy,
  TenantMiddlewareConfig,
  TenantContext as MiddlewareTenantContext,
} from '../../../../enterprise/src/isolation/tenant-middleware';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRequest(overrides: Record<string, any> = {}) {
  return {
    headers: {},
    user: null,
    tenantId: undefined,
    ...overrides,
  };
}

function makeConfig(overrides: Partial<TenantMiddlewareConfig> = {}): TenantMiddlewareConfig {
  return {
    strategy: 'header' as TenantResolutionStrategy,
    headerName: 'x-tenant-id',
    allowedTenants: undefined,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// MISUSE CASES
// ---------------------------------------------------------------------------

describe('TenantMiddleware — MISUSE CASES', () => {
  // ---- Missing tenant in request ----
  describe('resolveTenant() — missing tenant', () => {
    it("Given request has no tenant header, When middleware resolves tenant, Then throws TenantMissingError", async () => {
      const middleware = createTenantMiddleware(makeConfig());
      const req = makeRequest({ headers: {} });
      await expect(middleware.resolveTenant(req)).rejects.toThrow(/tenant.*missing|missing.*tenant|required/i);
    });

    it("Given request has empty tenant header, When middleware resolves tenant, Then throws", async () => {
      const middleware = createTenantMiddleware(makeConfig());
      const req = makeRequest({ headers: { 'x-tenant-id': '' } });
      await expect(middleware.resolveTenant(req)).rejects.toThrow();
    });

    it("Given request has whitespace-only tenant header, When middleware resolves tenant, Then throws", async () => {
      const middleware = createTenantMiddleware(makeConfig());
      const req = makeRequest({ headers: { 'x-tenant-id': '   ' } });
      await expect(middleware.resolveTenant(req)).rejects.toThrow();
    });
  });

  // ---- SQL injection via tenant header ----
  describe('resolveTenant() — SQL injection in tenant header', () => {
    it("Given x-tenant-id header contains SQL injection, When middleware resolves, Then rejects with validation error", async () => {
      const middleware = createTenantMiddleware(makeConfig());
      const req = makeRequest({ headers: { 'x-tenant-id': "'; DROP TABLE memory_entries;--" } });
      await expect(middleware.resolveTenant(req)).rejects.toThrow();
    });

    it("Given x-tenant-id header contains semicolons, When middleware resolves, Then rejects", async () => {
      const middleware = createTenantMiddleware(makeConfig());
      const req = makeRequest({ headers: { 'x-tenant-id': 'tenant; DELETE FROM agent_events' } });
      await expect(middleware.resolveTenant(req)).rejects.toThrow();
    });

    it("Given x-tenant-id header contains null bytes, When middleware resolves, Then rejects", async () => {
      const middleware = createTenantMiddleware(makeConfig());
      const req = makeRequest({ headers: { 'x-tenant-id': "tenant\x00injected" } });
      await expect(middleware.resolveTenant(req)).rejects.toThrow();
    });

    it("Given x-tenant-id header contains newline injection, When middleware resolves, Then rejects", async () => {
      const middleware = createTenantMiddleware(makeConfig());
      const req = makeRequest({ headers: { 'x-tenant-id': "tenant\nSET app.current_tenant='attacker'" } });
      await expect(middleware.resolveTenant(req)).rejects.toThrow();
    });
  });

  // ---- Cross-tenant escalation attempt ----
  describe('validateTenantAccess() — cross-tenant escalation', () => {
    it("Given request tenant is ws-ent-3, When validateTenantAccess() called with different tenant 'ws-ent-4', Then throws UnauthorizedTenantError", async () => {
      const middleware = createTenantMiddleware(makeConfig({ allowedTenants: ['ws-ent-3'] }));
      await expect(middleware.validateTenantAccess('ws-ent-4', 'ws-ent-3')).rejects.toThrow(/unauthorized|forbidden|access denied/i);
    });

    it("Given allowedTenants is ['ws-ent-3'], When tenant 'ws-ent-4' attempts access, Then rejects", async () => {
      const middleware = createTenantMiddleware(makeConfig({ allowedTenants: ['ws-ent-3'] }));
      const req = makeRequest({ headers: { 'x-tenant-id': 'ws-ent-4' } });
      await expect(middleware.resolveTenant(req)).rejects.toThrow();
    });

    it("Given attempt to override tenant by passing multiple tenant headers, When middleware resolves, Then uses only first/canonical header value", async () => {
      const middleware = createTenantMiddleware(makeConfig({ allowedTenants: ['ws-ent-3'] }));
      // Simulate header override attack with array value
      const req = makeRequest({ headers: { 'x-tenant-id': ['ws-ent-3', 'ws-ent-4'] } });
      // Must not silently accept an array that could bypass validation
      try {
        const result = await middleware.resolveTenant(req);
        // If it resolves, it must be a single canonical string value
        expect(typeof result).toBe('string');
      } catch {
        // Throwing is also acceptable
      }
    });
  });

  // ---- Invalid strategy configuration ----
  describe('createTenantMiddleware() — invalid config', () => {
    it("Given strategy is undefined, When createTenantMiddleware() called, Then throws config error", () => {
      expect(() => createTenantMiddleware({ strategy: undefined as any })).toThrow();
    });

    it("Given strategy is unknown string, When createTenantMiddleware() called, Then throws", () => {
      expect(() => createTenantMiddleware({ strategy: 'magic' as any })).toThrow();
    });

    it("Given null config, When createTenantMiddleware() called, Then throws", () => {
      expect(() => createTenantMiddleware(null as any)).toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY TESTS
// ---------------------------------------------------------------------------

describe('TenantMiddleware — BOUNDARY TESTS', () => {
  // ---- Tenant ID format validation ----
  describe('resolveTenant() — ID format boundary', () => {
    it("Given tenant_id with exactly 1 character, When resolveTenant() called, Then resolves or throws with format error (not SQL error)", async () => {
      const middleware = createTenantMiddleware(makeConfig({ allowedTenants: ['a'] }));
      const req = makeRequest({ headers: { 'x-tenant-id': 'a' } });
      try {
        const result = await middleware.resolveTenant(req);
        expect(typeof result).toBe('string');
      } catch (err: any) {
        // Must be a validation error, not a database error
        expect(err.message).not.toMatch(/sql|syntax|pg/i);
      }
    });

    it("Given tenant_id exactly 255 characters, When resolveTenant() called, Then resolves or provides length error", async () => {
      const longId = 'a'.repeat(255);
      const middleware = createTenantMiddleware(makeConfig({ allowedTenants: [longId] }));
      const req = makeRequest({ headers: { 'x-tenant-id': longId } });
      try {
        await middleware.resolveTenant(req);
      } catch (err: any) {
        expect(err.message).toMatch(/length|too long|limit/i);
      }
    });

    it("Given tenant_id exactly 256+ characters, When resolveTenant() called, Then rejects", async () => {
      const tooLong = 'a'.repeat(256);
      const middleware = createTenantMiddleware(makeConfig());
      const req = makeRequest({ headers: { 'x-tenant-id': tooLong } });
      await expect(middleware.resolveTenant(req)).rejects.toThrow();
    });
  });

  // ---- allowedTenants allowlist ----
  describe('allowedTenants — list boundary cases', () => {
    it("Given allowedTenants is empty array, When any tenant requests, Then rejects all", async () => {
      const middleware = createTenantMiddleware(makeConfig({ allowedTenants: [] }));
      const req = makeRequest({ headers: { 'x-tenant-id': 'ws-ent-3' } });
      await expect(middleware.resolveTenant(req)).rejects.toThrow();
    });

    it("Given allowedTenants contains 100 entries, When a tenant not in list requests, Then rejects efficiently", async () => {
      const tenants = Array.from({ length: 100 }, (_, i) => `tenant-${i}`);
      const middleware = createTenantMiddleware(makeConfig({ allowedTenants: tenants }));
      const req = makeRequest({ headers: { 'x-tenant-id': 'unauthorized-tenant' } });
      await expect(middleware.resolveTenant(req)).rejects.toThrow();
    });

    it("Given allowedTenants is undefined (open policy), When valid tenant requests, Then resolves", async () => {
      const middleware = createTenantMiddleware(makeConfig({ allowedTenants: undefined }));
      const req = makeRequest({ headers: { 'x-tenant-id': 'ws-ent-3' } });
      const result = await middleware.resolveTenant(req);
      expect(result).toBe('ws-ent-3');
    });
  });

  // ---- Alternative resolution strategies ----
  describe('resolveTenant() — multiple strategy boundary', () => {
    it("Given strategy is 'jwt-claim', When request has no JWT, Then throws", async () => {
      const middleware = createTenantMiddleware(makeConfig({ strategy: 'jwt-claim' as TenantResolutionStrategy }));
      const req = makeRequest({ headers: {} });
      await expect(middleware.resolveTenant(req)).rejects.toThrow();
    });

    it("Given strategy is 'user-lookup', When request has no user, Then throws", async () => {
      const middleware = createTenantMiddleware(makeConfig({ strategy: 'user-lookup' as TenantResolutionStrategy }));
      const req = makeRequest({ user: null });
      await expect(middleware.resolveTenant(req)).rejects.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH
// ---------------------------------------------------------------------------

describe('TenantMiddleware — GOLDEN PATH', () => {
  describe('createTenantMiddleware() — factory', () => {
    it("Given valid config, When createTenantMiddleware() called, Then returns TenantMiddleware instance", () => {
      const middleware = createTenantMiddleware(makeConfig());
      expect(middleware).toBeInstanceOf(TenantMiddleware);
    });
  });

  describe('resolveTenant() — header strategy', () => {
    it("Given valid x-tenant-id header, When resolveTenant() called, Then returns tenant_id string", async () => {
      const middleware = createTenantMiddleware(makeConfig({ allowedTenants: ['ws-ent-3'] }));
      const req = makeRequest({ headers: { 'x-tenant-id': 'ws-ent-3' } });
      const result = await middleware.resolveTenant(req);
      expect(result).toBe('ws-ent-3');
    });

    it("Given allowedTenants undefined (open policy), When valid tenant header, Then resolves to that tenant", async () => {
      const middleware = createTenantMiddleware(makeConfig({ allowedTenants: undefined }));
      const req = makeRequest({ headers: { 'x-tenant-id': 'any-tenant' } });
      const result = await middleware.resolveTenant(req);
      expect(result).toBe('any-tenant');
    });

    it("Given custom headerName config, When request has that header, Then resolves tenant from it", async () => {
      const middleware = createTenantMiddleware(makeConfig({ headerName: 'x-org-id', allowedTenants: undefined }));
      const req = makeRequest({ headers: { 'x-org-id': 'org-123' } });
      const result = await middleware.resolveTenant(req);
      expect(result).toBe('org-123');
    });
  });

  describe('validateTenantAccess() — same tenant', () => {
    it("Given requestTenant and resourceTenant are identical, When validateTenantAccess() called, Then resolves without error", async () => {
      const middleware = createTenantMiddleware(makeConfig());
      await expect(middleware.validateTenantAccess('ws-ent-3', 'ws-ent-3')).resolves.not.toThrow();
    });
  });

  describe('TenantMiddleware interface compliance', () => {
    it("TenantMiddleware has all required methods", () => {
      const middleware = createTenantMiddleware(makeConfig());
      expect(typeof middleware.resolveTenant).toBe('function');
      expect(typeof middleware.validateTenantAccess).toBe('function');
    });
  });

  describe('MiddlewareTenantContext — context object', () => {
    it("Given resolved tenant, When MiddlewareTenantContext created, Then has tenantId property", () => {
      const ctx: MiddlewareTenantContext = { tenantId: 'ws-ent-3', resolvedAt: new Date().toISOString() };
      expect(ctx.tenantId).toBe('ws-ent-3');
      expect(typeof ctx.resolvedAt).toBe('string');
    });
  });
});

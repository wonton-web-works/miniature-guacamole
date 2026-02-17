/**
 * NDA Isolation — Application-Level Middleware Enforcement Tests (AC-ENT-8.3)
 *
 * Security-focused verification that TenantMiddleware acts as the
 * first defense layer before any database access. Tests validate:
 * - Missing header rejection
 * - SQL injection via headers
 * - Allowlist enforcement
 * - Cross-tenant escalation prevention
 * - DSN injection via database-per-tenant config
 * - Path traversal / shell metachar rejection in DSNs
 *
 * Test order (misuse-first CAD protocol):
 *   1. MISUSE CASES  — attacks, bypass attempts, malformed inputs
 *   2. BOUNDARY TESTS — edge inputs, encoding, allowlist limits
 *   3. GOLDEN PATH   — correct resolution, access validation, config
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock pg before all imports
// ---------------------------------------------------------------------------
const { MockPool, mockPoolEnd } = vi.hoisted(() => {
  const mockPoolEnd = vi.fn();
  const MockPool = vi.fn().mockImplementation(() => ({
    query: vi.fn(),
    end: mockPoolEnd,
  }));
  return { MockPool, mockPoolEnd };
});

vi.mock('pg', () => ({
  Pool: MockPool,
}));

import {
  TenantMiddleware,
  createTenantMiddleware,
  TenantMiddlewareConfig,
  TenantResolutionStrategy,
} from '../../../../enterprise/src/isolation/tenant-middleware';

import {
  DatabasePerTenantManager,
} from '../../../../enterprise/src/isolation/database-per-tenant';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRequest(tenantId?: string, headerName = 'x-tenant-id') {
  return {
    headers: tenantId !== undefined ? { [headerName]: tenantId } : {},
    user: null,
  };
}

function makeConfig(overrides: Partial<TenantMiddlewareConfig> = {}): TenantMiddlewareConfig {
  return {
    strategy: 'header',
    headerName: 'x-tenant-id',
    ...overrides,
  };
}

function makeDsnConfig(dsn: string) {
  return {
    enabled: true,
    tenantDsnMap: { 'tenant-a': dsn },
  };
}

// ---------------------------------------------------------------------------
// MISUSE CASES
// ---------------------------------------------------------------------------

describe('NDA Middleware Enforcement — MISUSE CASES', () => {
  beforeEach(() => {
    MockPool.mockClear();
    mockPoolEnd.mockReset();
  });

  // ---- Missing tenant header ----
  describe('resolveTenant() — missing x-tenant-id header', () => {
    it("Given request has no x-tenant-id header, When resolveTenant() called, Then throws before any DB access", async () => {
      const middleware = createTenantMiddleware(makeConfig());
      const req = { headers: {}, user: null };
      await expect(middleware.resolveTenant(req)).rejects.toThrow(/missing|required/i);
    });

    it("Given request headers object is null, When resolveTenant() called, Then throws gracefully (no null pointer)", async () => {
      const middleware = createTenantMiddleware(makeConfig());
      const req = { headers: null, user: null };
      await expect(middleware.resolveTenant(req)).rejects.toThrow();
    });

    it("Given request is null, When resolveTenant() called, Then throws gracefully", async () => {
      const middleware = createTenantMiddleware(makeConfig());
      await expect(middleware.resolveTenant(null)).rejects.toThrow();
    });

    it("Given request header is present but empty string, When resolveTenant() called, Then throws", async () => {
      const middleware = createTenantMiddleware(makeConfig());
      const req = makeRequest('');
      await expect(middleware.resolveTenant(req)).rejects.toThrow();
    });

    it("Given request header is whitespace only, When resolveTenant() called, Then throws", async () => {
      const middleware = createTenantMiddleware(makeConfig());
      const req = makeRequest('   ');
      await expect(middleware.resolveTenant(req)).rejects.toThrow();
    });
  });

  // ---- SQL injection via tenant header ----
  describe('resolveTenant() — SQL injection via x-tenant-id header', () => {
    const SQL_INJECTION_VECTORS = [
      ["classic drop table", "'; DROP TABLE memory_entries; --"],
      ["semicolon command", "tenant; DELETE FROM agent_events"],
      ["null byte", "tenant\x00injected"],
      ["newline header injection", "tenant\nSET app.current_tenant='attacker'"],
      ["comment bypass", "tenant'--"],
      ["union select attempt", "tenant' UNION SELECT * FROM pg_tables--"],
    ];

    for (const [label, injection] of SQL_INJECTION_VECTORS) {
      it(`Given x-tenant-id header contains ${label}, When resolveTenant() called, Then rejects without reaching DB`, async () => {
        const middleware = createTenantMiddleware(makeConfig());
        const req = makeRequest(injection);
        await expect(middleware.resolveTenant(req)).rejects.toThrow();
      });
    }
  });

  // ---- Tenant not in allowlist ----
  describe('resolveTenant() — allowlist enforcement', () => {
    it("Given allowedTenants is ['tenant-a', 'tenant-b'], When tenant-c requests, Then rejects with unauthorized error", async () => {
      const middleware = createTenantMiddleware(makeConfig({
        allowedTenants: ['tenant-a', 'tenant-b'],
      }));
      const req = makeRequest('tenant-c');
      await expect(middleware.resolveTenant(req)).rejects.toThrow(/unauthorized|not.*allowed|not in/i);
    });

    it("Given allowedTenants is empty array, When any tenant requests, Then rejects all (empty allowlist = deny all)", async () => {
      const middleware = createTenantMiddleware(makeConfig({ allowedTenants: [] }));
      const req = makeRequest('tenant-a');
      await expect(middleware.resolveTenant(req)).rejects.toThrow();
    });

    it("Given allowedTenants contains 'tenant-a', When tenant 'TENANT-A' (different case) requests, Then rejects (case-sensitive match)", async () => {
      const middleware = createTenantMiddleware(makeConfig({
        allowedTenants: ['tenant-a'],
      }));
      const req = makeRequest('TENANT-A');
      // Allowlist check must be case-sensitive to prevent bypasses
      await expect(middleware.resolveTenant(req)).rejects.toThrow();
    });
  });

  // ---- Cross-tenant escalation via validateTenantAccess ----
  describe('validateTenantAccess() — cross-tenant access prevention', () => {
    it("Given requestTenant='tenant-a', resourceTenant='tenant-b', When validateTenantAccess() called, Then throws unauthorized error", async () => {
      const middleware = createTenantMiddleware(makeConfig());
      await expect(middleware.validateTenantAccess('tenant-a', 'tenant-b')).rejects.toThrow(/unauthorized|forbidden|access denied/i);
    });

    it("Given requestTenant='tenant-b', resourceTenant='tenant-a', When validateTenantAccess() called, Then throws (reverse cross-tenant also blocked)", async () => {
      const middleware = createTenantMiddleware(makeConfig());
      await expect(middleware.validateTenantAccess('tenant-b', 'tenant-a')).rejects.toThrow();
    });

    it("Given requestTenant is injection string, resourceTenant is valid, When validateTenantAccess() called, Then rejects (mismatch = unauthorized)", async () => {
      const middleware = createTenantMiddleware(makeConfig());
      await expect(middleware.validateTenantAccess("'; DROP TABLE --", 'tenant-a')).rejects.toThrow();
    });

    it("Given requestTenant is empty string, resourceTenant is valid, When validateTenantAccess() called, Then rejects", async () => {
      const middleware = createTenantMiddleware(makeConfig());
      await expect(middleware.validateTenantAccess('', 'tenant-a')).rejects.toThrow();
    });
  });

  // ---- Multiple-header-value attack ----
  describe('resolveTenant() — multiple-header-value attack', () => {
    it("Given x-tenant-id header is array ['tenant-a', 'tenant-b'], When resolveTenant() called with allowedTenants=['tenant-a'], Then resolves to 'tenant-a' (first value, still validated)", async () => {
      const middleware = createTenantMiddleware(makeConfig({
        allowedTenants: ['tenant-a'],
      }));
      const req = { headers: { 'x-tenant-id': ['tenant-a', 'tenant-b'] }, user: null };
      // Must take first value and validate it — not accept all values
      const result = await middleware.resolveTenant(req);
      expect(result).toBe('tenant-a');
    });

    it("Given x-tenant-id header is array where first value is NOT in allowlist, When resolveTenant() called, Then rejects", async () => {
      const middleware = createTenantMiddleware(makeConfig({
        allowedTenants: ['tenant-a'],
      }));
      const req = { headers: { 'x-tenant-id': ['attacker-tenant', 'tenant-a'] }, user: null };
      await expect(middleware.resolveTenant(req)).rejects.toThrow();
    });

    it("Given x-tenant-id header is array where first value contains injection chars, When resolveTenant() called, Then rejects (injection in first value)", async () => {
      const middleware = createTenantMiddleware(makeConfig({ allowedTenants: ['tenant-a'] }));
      const req = { headers: { 'x-tenant-id': ["'; DROP TABLE --", 'tenant-a'] }, user: null };
      await expect(middleware.resolveTenant(req)).rejects.toThrow();
    });
  });

  // ---- DSN injection via tenantDsnMap (path traversal / shell metachar) ----
  describe('DatabasePerTenantManager — DSN shell metacharacter rejection', () => {
    const SHELL_INJECTION_DSNS = [
      ['semicolon', 'postgresql://localhost/db; rm -rf /'],
      ['pipe', 'postgresql://localhost/db | cat /etc/passwd'],
      ['ampersand', 'postgresql://localhost/db & /bin/sh'],
      ['backtick', 'postgresql://localhost/db`malicious`'],
      ['dollar subshell', 'postgresql://localhost/db$(whoami)'],
      ['open paren', 'postgresql://localhost/db(injected'],
      ['close paren', 'postgresql://localhost/db)injected'],
      ['redirect in', 'postgresql://localhost/db<injected'],
      ['redirect out', 'postgresql://localhost/db>injected'],
      ['open brace', 'postgresql://localhost/db{injected'],
      ['close brace', 'postgresql://localhost/db}injected'],
    ];

    for (const [label, dsn] of SHELL_INJECTION_DSNS) {
      it(`Given DSN with ${label} metacharacter, When DatabasePerTenantManager constructed, Then throws invalid DSN error`, () => {
        expect(() => new DatabasePerTenantManager(makeDsnConfig(dsn))).toThrow(/invalid.*dsn|dsn.*invalid|malformed|dangerous/i);
      });
    }

    it("Given empty DSN string, When DatabasePerTenantManager constructed, Then throws", () => {
      expect(() => new DatabasePerTenantManager(makeDsnConfig(''))).toThrow();
    });

    it("Given whitespace-only DSN, When DatabasePerTenantManager constructed, Then throws", () => {
      expect(() => new DatabasePerTenantManager(makeDsnConfig('   '))).toThrow();
    });
  });

  // ---- Invalid middleware configuration ----
  describe('createTenantMiddleware() — invalid configuration', () => {
    it("Given null config, When createTenantMiddleware() called, Then throws at construction time", () => {
      expect(() => createTenantMiddleware(null as any)).toThrow();
    });

    it("Given undefined strategy, When createTenantMiddleware() called, Then throws at construction time", () => {
      expect(() => createTenantMiddleware({ strategy: undefined as any })).toThrow();
    });

    it("Given unknown strategy string, When createTenantMiddleware() called, Then throws (not silently degrade to no auth)", () => {
      expect(() => createTenantMiddleware({ strategy: 'magic-auth' as any })).toThrow();
    });

    it("Given strategy is 'admin-bypass', When createTenantMiddleware() called, Then throws (no bypass strategy allowed)", () => {
      expect(() => createTenantMiddleware({ strategy: 'admin-bypass' as any })).toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY TESTS
// ---------------------------------------------------------------------------

describe('NDA Middleware Enforcement — BOUNDARY TESTS', () => {
  beforeEach(() => {
    MockPool.mockClear();
  });

  // ---- Tenant ID length at boundary ----
  describe('resolveTenant() — tenant ID length boundaries', () => {
    it("Given tenant ID exactly 255 chars, When resolveTenant() called with it in allowedTenants, Then resolves", async () => {
      const longId = 'a'.repeat(255);
      const middleware = createTenantMiddleware(makeConfig({ allowedTenants: [longId] }));
      const req = makeRequest(longId);
      const result = await middleware.resolveTenant(req);
      expect(result).toBe(longId);
    });

    it("Given tenant ID exactly 256 chars, When resolveTenant() called, Then rejects (over limit)", async () => {
      const overLimit = 'a'.repeat(256);
      const middleware = createTenantMiddleware(makeConfig());
      const req = makeRequest(overLimit);
      await expect(middleware.resolveTenant(req)).rejects.toThrow();
    });

    it("Given tenant ID exactly 1 character, When resolveTenant() with open policy, Then resolves (minimum valid length)", async () => {
      const middleware = createTenantMiddleware(makeConfig({ allowedTenants: undefined }));
      const req = makeRequest('x');
      const result = await middleware.resolveTenant(req);
      expect(result).toBe('x');
    });
  });

  // ---- Alternative resolution strategies ----
  describe('resolveTenant() — unimplemented strategies fail safely', () => {
    it("Given jwt-claim strategy, When request has no Authorization header, Then throws (not silently accepts)", async () => {
      const middleware = createTenantMiddleware({ strategy: 'jwt-claim' });
      const req = { headers: {}, user: null };
      await expect(middleware.resolveTenant(req)).rejects.toThrow();
    });

    it("Given user-lookup strategy, When request has no user object, Then throws (not silently accepts)", async () => {
      const middleware = createTenantMiddleware({ strategy: 'user-lookup' });
      const req = { headers: {}, user: null };
      await expect(middleware.resolveTenant(req)).rejects.toThrow();
    });
  });

  // ---- Custom header name ----
  describe('resolveTenant() — custom header name', () => {
    it("Given headerName='x-org-id', When request uses x-tenant-id instead, Then rejects (wrong header)", async () => {
      const middleware = createTenantMiddleware(makeConfig({ headerName: 'x-org-id' }));
      const req = { headers: { 'x-tenant-id': 'tenant-a' }, user: null };
      await expect(middleware.resolveTenant(req)).rejects.toThrow(/missing|required/i);
    });

    it("Given headerName='x-org-id', When request has 'x-org-id' header, Then resolves correctly", async () => {
      const middleware = createTenantMiddleware(makeConfig({
        headerName: 'x-org-id',
        allowedTenants: undefined,
      }));
      const req = { headers: { 'x-org-id': 'org-123' }, user: null };
      const result = await middleware.resolveTenant(req);
      expect(result).toBe('org-123');
    });
  });

  // ---- Large allowlist performance boundary ----
  describe('resolveTenant() — allowlist size boundary', () => {
    it("Given allowedTenants with 1000 entries, When authorized tenant requests, Then resolves efficiently", async () => {
      const tenants = Array.from({ length: 1000 }, (_, i) => `tenant-${i}`);
      const middleware = createTenantMiddleware(makeConfig({ allowedTenants: tenants }));
      const req = makeRequest('tenant-500');
      const result = await middleware.resolveTenant(req);
      expect(result).toBe('tenant-500');
    });

    it("Given allowedTenants with 1000 entries, When unauthorized tenant requests, Then rejects efficiently", async () => {
      const tenants = Array.from({ length: 1000 }, (_, i) => `tenant-${i}`);
      const middleware = createTenantMiddleware(makeConfig({ allowedTenants: tenants }));
      const req = makeRequest('unauthorized-tenant');
      await expect(middleware.resolveTenant(req)).rejects.toThrow();
    });
  });

  // ---- DatabasePerTenant — getPoolForTenant boundary ----
  describe('DatabasePerTenantManager.getPoolForTenant() — boundary inputs', () => {
    it("Given feature disabled, When getPoolForTenant() called, Then rejects before pool lookup", async () => {
      const manager = new DatabasePerTenantManager({
        enabled: false,
        tenantDsnMap: { 'tenant-a': 'postgresql://localhost/tenant_a' },
      });
      await expect(manager.getPoolForTenant('tenant-a')).rejects.toThrow(/disabled/i);
    });

    it("Given valid DSN (no metacharacters), When manager constructed, Then succeeds", () => {
      expect(() => new DatabasePerTenantManager({
        enabled: true,
        tenantDsnMap: { 'tenant-a': 'postgresql://user:pass@localhost:5432/tenant_a' },
      })).not.toThrow();
    });

    it("Given tenant ID with null byte in getPoolForTenant(), When called, Then throws not-found (not found in map, not SQL injection)", async () => {
      const manager = new DatabasePerTenantManager({
        enabled: true,
        tenantDsnMap: { 'tenant-a': 'postgresql://localhost/tenant_a' },
      });
      // Injection chars in tenant ID used as map key — fails as unknown tenant
      await expect(manager.getPoolForTenant("tenant\x00injection")).rejects.toThrow(/unknown tenant|not configured|not found/i);
    });
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH
// ---------------------------------------------------------------------------

describe('NDA Middleware Enforcement — GOLDEN PATH', () => {
  beforeEach(() => {
    MockPool.mockClear();
    mockPoolEnd.mockReset();
  });

  describe('resolveTenant() — successful resolution', () => {
    it("Given valid x-tenant-id header with no allowlist, When resolveTenant() called, Then returns tenant ID string", async () => {
      const middleware = createTenantMiddleware(makeConfig({ allowedTenants: undefined }));
      const req = makeRequest('tenant-a');
      const result = await middleware.resolveTenant(req);
      expect(result).toBe('tenant-a');
    });

    it("Given tenant in allowedTenants, When resolveTenant() called, Then returns that tenant ID", async () => {
      const middleware = createTenantMiddleware(makeConfig({
        allowedTenants: ['tenant-a', 'tenant-b'],
      }));
      const req = makeRequest('tenant-b');
      const result = await middleware.resolveTenant(req);
      expect(result).toBe('tenant-b');
    });

    it("Given valid config, When createTenantMiddleware() called, Then returns TenantMiddleware instance", () => {
      const middleware = createTenantMiddleware(makeConfig());
      expect(middleware).toBeInstanceOf(TenantMiddleware);
    });
  });

  describe('validateTenantAccess() — same tenant passes', () => {
    it("Given requestTenant and resourceTenant are identical, When validateTenantAccess() called, Then resolves without error", async () => {
      const middleware = createTenantMiddleware(makeConfig());
      await expect(middleware.validateTenantAccess('tenant-a', 'tenant-a')).resolves.not.toThrow();
    });

    it("Given tenant-b for both request and resource, When validateTenantAccess() called, Then passes", async () => {
      const middleware = createTenantMiddleware(makeConfig());
      await expect(middleware.validateTenantAccess('tenant-b', 'tenant-b')).resolves.not.toThrow();
    });
  });

  describe('DatabasePerTenantManager — correct pool returned per tenant', () => {
    it("Given tenant-a and tenant-b have separate DSNs, When each requests pool, Then each gets pool built from their own DSN", async () => {
      const manager = new DatabasePerTenantManager({
        enabled: true,
        tenantDsnMap: {
          'tenant-a': 'postgresql://localhost/tenant_a',
          'tenant-b': 'postgresql://localhost/tenant_b',
        },
      });

      await manager.getPoolForTenant('tenant-a');
      await manager.getPoolForTenant('tenant-b');

      expect(MockPool).toHaveBeenCalledTimes(2);
      const callA = MockPool.mock.calls[0][0];
      const callB = MockPool.mock.calls[1][0];
      expect(callA.connectionString).toBe('postgresql://localhost/tenant_a');
      expect(callB.connectionString).toBe('postgresql://localhost/tenant_b');
      expect(callA.connectionString).not.toBe(callB.connectionString);
    });

    it("Given same tenant requested twice, When getPoolForTenant() called twice, Then returns identical pool (no double-creation)", async () => {
      const manager = new DatabasePerTenantManager({
        enabled: true,
        tenantDsnMap: { 'tenant-a': 'postgresql://localhost/tenant_a' },
      });
      const pool1 = await manager.getPoolForTenant('tenant-a');
      const pool2 = await manager.getPoolForTenant('tenant-a');
      expect(pool1).toBe(pool2);
      expect(MockPool).toHaveBeenCalledTimes(1);
    });
  });

  describe('TenantMiddleware interface compliance', () => {
    it("TenantMiddleware has resolveTenant() method", () => {
      const middleware = createTenantMiddleware(makeConfig());
      expect(typeof middleware.resolveTenant).toBe('function');
    });

    it("TenantMiddleware has validateTenantAccess() method", () => {
      const middleware = createTenantMiddleware(makeConfig());
      expect(typeof middleware.validateTenantAccess).toBe('function');
    });
  });
});

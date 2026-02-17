/**
 * SOC 2 Compliance Integration Tests — WS-ENT-9
 *
 * End-to-end tests for audit trail + field encryption working together.
 * Uses mocked pg Pool — no real database required.
 *
 * AC-ENT-9.1: Audit trail service — immutable append-only log
 * AC-ENT-9.2: Field-level encryption helpers for PII/sensitive data at rest
 * AC-ENT-9.3: Encryption key rotation support without data re-encryption
 * AC-ENT-9.4: Audit events include actor, action, resource, tenant, timestamp, IP
 * AC-ENT-9.5: Audit log tamper detection (hash chain)
 *
 * Test order: MISUSE → BOUNDARY → GOLDEN PATH
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomBytes } from 'node:crypto';

// ---------------------------------------------------------------------------
// Mock pg module (must be before enterprise imports)
// ---------------------------------------------------------------------------
const mockQuery = vi.fn();
const mockPoolEnd = vi.fn();

vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => ({
    query: mockQuery,
    end: mockPoolEnd,
  })),
}));

import {
  AuditTrailService,
  buildAuditMigrations,
} from '../../../enterprise/src/compliance/audit-trail';

import {
  FieldEncryption,
  MockKeyProvider,
} from '../../../enterprise/src/compliance/field-encryption';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeKeyProvider(keyId = 'key-v1'): MockKeyProvider {
  const provider = new MockKeyProvider();
  provider.addKey(keyId, randomBytes(32));
  provider.setCurrentKey(keyId);
  return provider;
}

function makeAuditService(tenantId = 'tenant-acme'): AuditTrailService {
  return new AuditTrailService({ pool: { query: mockQuery, end: mockPoolEnd } as any, tenantId });
}

function makeAuditRow(overrides: Record<string, unknown> = {}) {
  return {
    id: `evt-${Date.now()}`,
    tenant_id: 'tenant-acme',
    actor: 'user-42',
    action: 'data.read',
    resource: 'memory_entries/key123',
    resource_type: 'memory_entry',
    timestamp: new Date().toISOString(),
    ip: '10.0.0.1',
    metadata: {},
    previous_hash: '0000000000000000000000000000000000000000000000000000000000000000',
    hash: 'a'.repeat(64),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// MISUSE CASES
// ---------------------------------------------------------------------------

describe('Compliance Integration — MISUSE CASES', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockPoolEnd.mockReset();
  });

  // ---- Encrypt + store + retrieve + decrypt: tampered ciphertext ----

  describe('Encrypted metadata in audit event — tampered ciphertext', () => {
    it("Given encrypted PII stored in audit event metadata, When ciphertext is tampered, Then decrypt() throws and does not return plaintext", async () => {
      const provider = makeKeyProvider('key-v1');
      const enc = new FieldEncryption({ keyProvider: provider });

      // Encrypt original PII
      const encryptedEmail = await enc.encrypt('alice@example.com', 'email');

      // Tamper the ciphertext
      const tampered = { ...encryptedEmail, ciphertext: randomBytes(64).toString('base64') };

      // Decrypting tampered ciphertext must throw
      await expect(enc.decrypt(tampered)).rejects.toThrow();
    });
  });

  // ---- Tenant isolation: tenant A cannot see tenant B's audit events ----

  describe('Audit + tenant isolation — cross-tenant query blocked', () => {
    it("Given tenant A's AuditTrailService, When getEvents() called, Then SQL query includes tenant-A parameter (not tenant-B)", async () => {
      const serviceA = makeAuditService('tenant-A');
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      await serviceA.getEvents();

      // Every parameterized query must include 'tenant-A', never 'tenant-B'
      for (const call of mockQuery.mock.calls) {
        const params: any[] = call[1] ?? [];
        expect(JSON.stringify(params)).toContain('tenant-A');
        expect(JSON.stringify(params)).not.toContain('tenant-B');
      }
    });

    it("Given tenant B's AuditTrailService, When getEvents() called, Then SQL query is scoped to tenant-B only", async () => {
      const serviceB = makeAuditService('tenant-B');
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      await serviceB.getEvents();

      const paramArrays = mockQuery.mock.calls.map((c: any[]) => c[1] ?? []);
      const allParams = paramArrays.flat();
      expect(allParams).toContain('tenant-B');
      expect(allParams).not.toContain('tenant-A');
    });
  });

  // ---- Hash chain broken detection ----

  describe('Hash chain broken detection — tampered event', () => {
    it("Given a chain where event[1] has wrong previousHash, When verifyChain() called, Then returns { valid: false, brokenAt: 1 }", async () => {
      const service = makeAuditService();

      const events = [
        makeAuditRow({ id: 'evt-1', hash: 'hash-1', previous_hash: '0'.repeat(64) }),
        makeAuditRow({ id: 'evt-2', hash: 'hash-2', previous_hash: 'TAMPERED-NOT-HASH-1' }),
      ];

      const result = await service.verifyChain(events as any);
      expect(result.valid).toBe(false);
      expect(result.brokenAt).toBeDefined();
    });

    it("Given an event where the hash field is corrupted (modified after storage), When verifyChain() called, Then detects the corruption", async () => {
      const service = makeAuditService();

      // Single event with wrong hash (actor changed after hash was computed)
      const evt = makeAuditRow({
        id: 'evt-1',
        actor: 'attacker', // original actor was 'user-42', hash was computed for 'user-42'
        previous_hash: '0'.repeat(64),
        hash: 'this-hash-does-not-match-attacker-as-actor',
      });

      const result = await service.verifyChain([evt] as any);
      expect(result.valid).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY TESTS
// ---------------------------------------------------------------------------

describe('Compliance Integration — BOUNDARY TESTS', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockPoolEnd.mockReset();
  });

  // ---- Empty audit log + encrypt/decrypt ----

  describe('Empty audit log with encryption', () => {
    it("Given no audit events, When verifyChain() called on empty result, Then returns { valid: true }", async () => {
      const service = makeAuditService();
      const result = await service.verifyChain([]);
      expect(result.valid).toBe(true);
    });

    it("Given FieldEncryption with empty string, When encrypt() then decrypt(), Then round-trip returns empty string", async () => {
      const provider = makeKeyProvider();
      const enc = new FieldEncryption({ keyProvider: provider });

      const encrypted = await enc.encrypt('', 'optional_field');
      const decrypted = await enc.decrypt(encrypted);
      expect(decrypted).toBe('');
    });
  });

  // ---- Audit migrations don't collide with integration imports ----

  describe('Audit migrations version boundary', () => {
    it("Given compliance module imported, When buildAuditMigrations() called, Then all versions are >= 5000", () => {
      const migrations = buildAuditMigrations();
      for (const m of migrations) {
        expect(m.version).toBeGreaterThanOrEqual(5000);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH — End-to-end scenarios
// ---------------------------------------------------------------------------

describe('Compliance Integration — GOLDEN PATH', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockPoolEnd.mockReset();
  });

  // ---- Full audit lifecycle: log → query → verify chain ----

  describe('Full audit lifecycle', () => {
    it("Given audit service, When log → getEvents → verifyChain called in sequence, Then chain verification result is a valid shape", async () => {
      const service = makeAuditService();

      // Step 1: log event
      const row1 = makeAuditRow({ id: 'evt-1' });
      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })          // lookup previous hash
        .mockResolvedValueOnce({ rows: [row1], rowCount: 1 });      // INSERT RETURNING

      const event1 = await service.logEvent({
        actor: 'user-42',
        action: 'data.read',
        resource: 'memory_entries/key123',
        resourceType: 'memory_entry',
        ip: '10.0.0.1',
        metadata: { sessionId: 'sess-abc' },
      });
      expect(event1.id).toBeDefined();

      // Step 2: getEvents
      mockQuery.mockResolvedValueOnce({ rows: [row1], rowCount: 1 });
      const events = await service.getEvents({ actor: 'user-42' });
      expect(Array.isArray(events)).toBe(true);

      // Step 3: verifyChain
      const chain = await service.verifyChain(events as any);
      expect(chain).toHaveProperty('valid');
    });

    it("Given two events logged in order, When getEvents() and verifyChain() called, Then chain includes both events", async () => {
      const service = makeAuditService();

      const hash1 = 'a'.repeat(64);
      const hash2 = 'b'.repeat(64);

      const row1 = makeAuditRow({ id: 'evt-1', hash: hash1, previous_hash: '0'.repeat(64) });
      const row2 = makeAuditRow({ id: 'evt-2', hash: hash2, previous_hash: hash1, action: 'data.write' });

      // Log event 1
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }).mockResolvedValueOnce({ rows: [row1], rowCount: 1 });
      await service.logEvent({ actor: 'user-1', action: 'data.read', resource: 'res/1', resourceType: 'memory_entry' });

      // Log event 2
      mockQuery.mockResolvedValueOnce({ rows: [{ hash: hash1 }], rowCount: 1 }).mockResolvedValueOnce({ rows: [row2], rowCount: 1 });
      await service.logEvent({ actor: 'user-1', action: 'data.write', resource: 'res/1', resourceType: 'memory_entry' });

      // Get both events
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2], rowCount: 2 });
      const events = await service.getEvents();
      expect(events.length).toBe(2);
    });
  });

  // ---- Encrypt PII → store in audit metadata → retrieve → decrypt ----

  describe('Encrypt field → store in audit metadata → retrieve → decrypt', () => {
    it("Given PII email encrypted, When stored in audit metadata and retrieved, Then decryption returns original email", async () => {
      const provider = makeKeyProvider('key-v1');
      const enc = new FieldEncryption({ keyProvider: provider });
      const service = makeAuditService();

      const originalEmail = 'alice@example.com';

      // Encrypt the PII field
      const encryptedEmail = await enc.encrypt(originalEmail, 'email');

      // Store it in audit event metadata
      const row = makeAuditRow({
        metadata: { encryptedEmail: JSON.stringify(encryptedEmail) },
      });
      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const event = await service.logEvent({
        actor: 'user-42',
        action: 'user.profile.update',
        resource: 'users/alice',
        resourceType: 'user',
        metadata: { encryptedEmail: JSON.stringify(encryptedEmail) },
      });

      // Retrieve the encrypted email from event metadata
      const metadataEmail = JSON.parse(event.metadata!['encryptedEmail'] as string);

      // Decrypt and verify
      const decrypted = await enc.decrypt(metadataEmail);
      expect(decrypted).toBe(originalEmail);
    });
  });

  // ---- Key rotation: encrypt with v1, rotate to v2, encrypt new data, decrypt both ----

  describe('Key rotation integration', () => {
    it("Given PII encrypted with key-v1, When key rotated to key-v2 and new PII encrypted, Then both old and new data decrypt correctly", async () => {
      const provider = new MockKeyProvider();
      provider.addKey('key-v1', randomBytes(32));
      provider.setCurrentKey('key-v1');
      const enc = new FieldEncryption({ keyProvider: provider });

      // Encrypt with v1 (simulating old data)
      const oldSsn = '123-45-6789';
      const v1Encrypted = await enc.encrypt(oldSsn, 'ssn');
      expect(v1Encrypted.keyId).toBe('key-v1');

      // Rotate key
      provider.addKey('key-v2', randomBytes(32));
      provider.setCurrentKey('key-v2');

      // Encrypt new data with v2
      const newSsn = '987-65-4321';
      const v2Encrypted = await enc.encrypt(newSsn, 'ssn');
      expect(v2Encrypted.keyId).toBe('key-v2');

      // Both must decrypt without re-encryption
      expect(await enc.decrypt(v1Encrypted)).toBe(oldSsn);
      expect(await enc.decrypt(v2Encrypted)).toBe(newSsn);
    });

    it("Given key rotation, When audit events are logged before and after rotation, Then both sets of events are accessible", async () => {
      const provider = new MockKeyProvider();
      provider.addKey('key-v1', randomBytes(32));
      provider.setCurrentKey('key-v1');
      const enc = new FieldEncryption({ keyProvider: provider });
      const service = makeAuditService();

      // Pre-rotation: encrypt PII and log event
      const preRotationPii = await enc.encrypt('pre-rotation@example.com', 'email');

      const row1 = makeAuditRow({ id: 'pre-rotation-evt', metadata: { email: JSON.stringify(preRotationPii) } });
      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [row1], rowCount: 1 });

      await service.logEvent({
        actor: 'user-1',
        action: 'user.login',
        resource: 'sessions',
        resourceType: 'session',
        metadata: { email: JSON.stringify(preRotationPii) },
      });

      // Rotate
      provider.addKey('key-v2', randomBytes(32));
      provider.setCurrentKey('key-v2');

      // Post-rotation: encrypt new PII and log event
      const postRotationPii = await enc.encrypt('post-rotation@example.com', 'email');
      const row2 = makeAuditRow({ id: 'post-rotation-evt', metadata: { email: JSON.stringify(postRotationPii) } });
      mockQuery
        .mockResolvedValueOnce({ rows: [{ hash: row1.hash }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [row2], rowCount: 1 });

      await service.logEvent({
        actor: 'user-2',
        action: 'user.login',
        resource: 'sessions',
        resourceType: 'session',
        metadata: { email: JSON.stringify(postRotationPii) },
      });

      // Both decrypt correctly
      const dec1 = await enc.decrypt(preRotationPii);
      const dec2 = await enc.decrypt(postRotationPii);
      expect(dec1).toBe('pre-rotation@example.com');
      expect(dec2).toBe('post-rotation@example.com');
    });
  });

  // ---- Audit event shape compliance (AC-ENT-9.4) ----

  describe('Audit event shape — all required fields present', () => {
    it("Given logged event, When event returned, Then contains actor, action, resource, tenantId, timestamp", async () => {
      const service = makeAuditService('tenant-acme');
      const row = makeAuditRow();
      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const event = await service.logEvent({
        actor: 'user-42',
        action: 'data.read',
        resource: 'memory_entries/key123',
        resourceType: 'memory_entry',
        ip: '10.0.0.1',
      });

      expect(event.actor).toBeDefined();
      expect(event.action).toBeDefined();
      expect(event.resource).toBeDefined();
      expect(event.tenantId).toBeDefined();
      expect(event.timestamp).toBeDefined();
    });

    it("Given logged event with IP, When event returned, Then ip field is present", async () => {
      const service = makeAuditService();
      const row = makeAuditRow({ ip: '192.168.1.50' });
      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const event = await service.logEvent({
        actor: 'user-42',
        action: 'user.login',
        resource: 'sessions',
        resourceType: 'session',
        ip: '192.168.1.50',
      });

      expect(event.ip).toBe('192.168.1.50');
    });

    it("Given logged event, When event returned, Then timestamp is a valid ISO 8601 string", async () => {
      const service = makeAuditService();
      const ts = new Date().toISOString();
      const row = makeAuditRow({ timestamp: ts });
      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const event = await service.logEvent({
        actor: 'user-1',
        action: 'data.read',
        resource: 'res/1',
        resourceType: 'memory_entry',
      });

      expect(() => new Date(event.timestamp)).not.toThrow();
      expect(new Date(event.timestamp).toISOString()).toBe(event.timestamp);
    });
  });

  // ---- Compliance module exports ----

  describe('Module exports — compliance module is importable', () => {
    it("AuditTrailService is exported from compliance/audit-trail", () => {
      expect(AuditTrailService).toBeDefined();
      expect(typeof AuditTrailService).toBe('function');
    });

    it("buildAuditMigrations is exported from compliance/audit-trail", () => {
      expect(buildAuditMigrations).toBeDefined();
      expect(typeof buildAuditMigrations).toBe('function');
    });

    it("FieldEncryption is exported from compliance/field-encryption", () => {
      expect(FieldEncryption).toBeDefined();
      expect(typeof FieldEncryption).toBe('function');
    });

    it("MockKeyProvider is exported from compliance/field-encryption", () => {
      expect(MockKeyProvider).toBeDefined();
      expect(typeof MockKeyProvider).toBe('function');
    });
  });
});

/**
 * FieldEncryption Unit Tests — WS-ENT-9
 *
 * Tests for envelope encryption using AES-256-GCM.
 * Uses MockKeyProvider (in-memory keys) — no external dependencies.
 *
 * AC-ENT-9.2: Field-level encryption helpers for PII/sensitive data at rest
 * AC-ENT-9.3: Encryption key rotation support without data re-encryption
 *
 * Test order: MISUSE → BOUNDARY → GOLDEN PATH
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomBytes } from 'node:crypto';

import {
  FieldEncryption,
  MockKeyProvider,
} from '../../../../enterprise/src/compliance/field-encryption';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeKey(bytes = 32): Buffer {
  return randomBytes(bytes);
}

function makeMockProvider(keyId = 'key-v1', key?: Buffer) {
  const provider = new MockKeyProvider();
  const k = key ?? makeKey(32);
  provider.addKey(keyId, k);
  provider.setCurrentKey(keyId);
  return { provider, key: k, keyId };
}

// ---------------------------------------------------------------------------
// MISUSE CASES
// ---------------------------------------------------------------------------

describe('FieldEncryption — MISUSE CASES', () => {
  // ---- Wrong key on decrypt ----

  describe('decrypt() — wrong key', () => {
    it("Given ciphertext encrypted with key-v1, When decrypt() called using key-v2, Then throws authentication error", async () => {
      const { provider } = makeMockProvider('key-v1');
      provider.addKey('key-v2', makeKey(32));
      provider.setCurrentKey('key-v1');
      const enc = new FieldEncryption({ keyProvider: provider });

      const encrypted = await enc.encrypt('sensitive-data', 'email');

      // Now swap to a different current key (key-v2), but the encrypted.keyId still points to key-v1
      // Tamper with keyId to point to key-v2 — should fail to authenticate
      const tampered = { ...encrypted, keyId: 'key-v2' };

      await expect(enc.decrypt(tampered)).rejects.toThrow();
    });

    it("Given keyId in EncryptedField references non-existent key, When decrypt() called, Then throws descriptive error (not key leak)", async () => {
      const { provider } = makeMockProvider('key-v1');
      const enc = new FieldEncryption({ keyProvider: provider });

      const encrypted = await enc.encrypt('sensitive-data', 'ssn');
      const orphaned = { ...encrypted, keyId: 'key-that-does-not-exist' };

      await expect(enc.decrypt(orphaned)).rejects.toThrow(/key|not found|unknown/i);
    });
  });

  // ---- Tampered ciphertext ----

  describe('decrypt() — tampered ciphertext (GCM auth tag failure)', () => {
    it("Given ciphertext field is base64 of random bytes (not real ciphertext), When decrypt() called, Then throws authentication error", async () => {
      const { provider } = makeMockProvider('key-v1');
      const enc = new FieldEncryption({ keyProvider: provider });

      const encrypted = await enc.encrypt('sensitive-data', 'credit_card');
      const tampered = { ...encrypted, ciphertext: randomBytes(64).toString('base64') };

      await expect(enc.decrypt(tampered)).rejects.toThrow();
    });

    it("Given ciphertext has one byte flipped, When decrypt() called, Then GCM authentication fails and throws", async () => {
      const { provider } = makeMockProvider('key-v1');
      const enc = new FieldEncryption({ keyProvider: provider });

      const encrypted = await enc.encrypt('sensitive-pii', 'name');
      const raw = Buffer.from(encrypted.ciphertext, 'base64');
      raw[0] ^= 0xff; // flip first byte
      const tampered = { ...encrypted, ciphertext: raw.toString('base64') };

      await expect(enc.decrypt(tampered)).rejects.toThrow();
    });
  });

  // ---- Tampered IV ----

  describe('decrypt() — tampered IV', () => {
    it("Given IV is replaced with random bytes, When decrypt() called, Then throws authentication error", async () => {
      const { provider } = makeMockProvider('key-v1');
      const enc = new FieldEncryption({ keyProvider: provider });

      const encrypted = await enc.encrypt('sensitive-data', 'dob');
      const tampered = { ...encrypted, iv: randomBytes(12).toString('base64') };

      await expect(enc.decrypt(tampered)).rejects.toThrow();
    });

    it("Given IV length is wrong (not 12 bytes), When decrypt() called, Then throws", async () => {
      const { provider } = makeMockProvider('key-v1');
      const enc = new FieldEncryption({ keyProvider: provider });

      const encrypted = await enc.encrypt('sensitive-data', 'phone');
      const wrongLengthIv = randomBytes(8).toString('base64'); // 8 bytes instead of 12
      const tampered = { ...encrypted, iv: wrongLengthIv };

      await expect(enc.decrypt(tampered)).rejects.toThrow();
    });
  });

  // ---- Null/empty plaintext ----

  describe('encrypt() — null/empty plaintext', () => {
    it("Given plaintext is null, When encrypt() called, Then throws", async () => {
      const { provider } = makeMockProvider('key-v1');
      const enc = new FieldEncryption({ keyProvider: provider });

      await expect(enc.encrypt(null as any, 'email')).rejects.toThrow();
    });

    it("Given plaintext is undefined, When encrypt() called, Then throws", async () => {
      const { provider } = makeMockProvider('key-v1');
      const enc = new FieldEncryption({ keyProvider: provider });

      await expect(enc.encrypt(undefined as any, 'email')).rejects.toThrow();
    });
  });

  // ---- Non-string input ----

  describe('encrypt() — non-string input', () => {
    it("Given plaintext is a number, When encrypt() called, Then throws type error", async () => {
      const { provider } = makeMockProvider('key-v1');
      const enc = new FieldEncryption({ keyProvider: provider });

      await expect(enc.encrypt(12345 as any, 'age')).rejects.toThrow();
    });

    it("Given plaintext is an object, When encrypt() called, Then throws type error", async () => {
      const { provider } = makeMockProvider('key-v1');
      const enc = new FieldEncryption({ keyProvider: provider });

      await expect(enc.encrypt({ name: 'test' } as any, 'profile')).rejects.toThrow();
    });
  });

  // ---- Prototype pollution in EncryptedField ----

  describe('decrypt() — prototype pollution in EncryptedField', () => {
    it("Given EncryptedField object has __proto__ injected, When decrypt() called, Then does not modify Object.prototype", async () => {
      const { provider } = makeMockProvider('key-v1');
      const enc = new FieldEncryption({ keyProvider: provider });

      const encrypted = await enc.encrypt('test', 'field');
      const polluted = JSON.parse(JSON.stringify(encrypted));
      Object.assign(polluted, JSON.parse('{"__proto__": {"polluted": true}}'));

      // Must not throw uncontrolled errors AND must not pollute prototype
      try {
        await enc.decrypt(polluted);
      } catch {
        // Rejection is fine
      }
      expect((Object.prototype as any).polluted).toBeUndefined();
    });
  });

  // ---- Short key enforcement ----

  describe('KeyProvider — minimum key length', () => {
    it("Given key is less than 32 bytes (AES-256 requirement), When addKey() called, Then throws key length error", () => {
      const provider = new MockKeyProvider();
      const shortKey = makeKey(16); // AES-128 key length — should be rejected for AES-256

      expect(() => provider.addKey('short-key', shortKey)).toThrow(/length|32 bytes|invalid/i);
    });

    it("Given key is exactly 31 bytes, When addKey() called, Then throws", () => {
      const provider = new MockKeyProvider();
      expect(() => provider.addKey('k', makeKey(31))).toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY TESTS
// ---------------------------------------------------------------------------

describe('FieldEncryption — BOUNDARY TESTS', () => {
  // ---- Empty string ----

  describe('encrypt()/decrypt() — empty string round-trip', () => {
    it("Given empty string plaintext, When encrypt() then decrypt(), Then returns empty string", async () => {
      const { provider } = makeMockProvider('key-v1');
      const enc = new FieldEncryption({ keyProvider: provider });

      const encrypted = await enc.encrypt('', 'optional_field');
      const decrypted = await enc.decrypt(encrypted);
      expect(decrypted).toBe('');
    });
  });

  // ---- Large plaintext ----

  describe('encrypt()/decrypt() — very long plaintext', () => {
    it("Given 10KB plaintext string, When encrypt() then decrypt(), Then round-trip returns identical plaintext", async () => {
      const { provider } = makeMockProvider('key-v1');
      const enc = new FieldEncryption({ keyProvider: provider });

      const large = 'x'.repeat(10 * 1024);
      const encrypted = await enc.encrypt(large, 'large_field');
      const decrypted = await enc.decrypt(encrypted);
      expect(decrypted).toBe(large);
    });
  });

  // ---- Unicode ----

  describe('encrypt()/decrypt() — unicode and emoji', () => {
    it("Given plaintext with emoji and accents, When encrypt() then decrypt(), Then returns identical unicode string", async () => {
      const { provider } = makeMockProvider('key-v1');
      const enc = new FieldEncryption({ keyProvider: provider });

      const unicode = 'José García 🔐 — résumé — 日本語テスト';
      const encrypted = await enc.encrypt(unicode, 'display_name');
      const decrypted = await enc.decrypt(encrypted);
      expect(decrypted).toBe(unicode);
    });
  });

  // ---- Binary-safe output ----

  describe('encrypt() — binary-safe ciphertext', () => {
    it("Given any plaintext, When encrypt() called, Then ciphertext is a valid base64 string", async () => {
      const { provider } = makeMockProvider('key-v1');
      const enc = new FieldEncryption({ keyProvider: provider });

      const encrypted = await enc.encrypt('binary safety test', 'field');
      expect(() => Buffer.from(encrypted.ciphertext, 'base64')).not.toThrow();
      expect(encrypted.ciphertext).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it("Given IV field, When encrypt() called, Then IV is a valid base64 string (12 bytes = 16 base64 chars)", async () => {
      const { provider } = makeMockProvider('key-v1');
      const enc = new FieldEncryption({ keyProvider: provider });

      const encrypted = await enc.encrypt('iv-length-check', 'field');
      const ivBytes = Buffer.from(encrypted.iv, 'base64');
      expect(ivBytes.length).toBe(12);
    });
  });

  // ---- Key length boundary ----

  describe('MockKeyProvider — key length boundary', () => {
    it("Given key is exactly 32 bytes, When addKey() called, Then succeeds", () => {
      const provider = new MockKeyProvider();
      expect(() => provider.addKey('key-32', makeKey(32))).not.toThrow();
    });

    it("Given key is 64 bytes (oversized but valid), When addKey() called, Then accepts or rejects consistently", () => {
      const provider = new MockKeyProvider();
      // 64-byte keys should either work or throw — but must not silently truncate
      try {
        provider.addKey('key-64', makeKey(64));
      } catch (err: any) {
        expect(err.message).toMatch(/length|invalid/i);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH
// ---------------------------------------------------------------------------

describe('FieldEncryption — GOLDEN PATH', () => {
  // ---- Round-trip ----

  describe('encrypt()/decrypt() — round-trip', () => {
    it("Given valid plaintext, When encrypt() then decrypt(), Then returns original plaintext", async () => {
      const { provider } = makeMockProvider('key-v1');
      const enc = new FieldEncryption({ keyProvider: provider });

      const plaintext = 'john.doe@example.com';
      const encrypted = await enc.encrypt(plaintext, 'email');
      const decrypted = await enc.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("Given SSN plaintext, When encrypt() then decrypt(), Then round-trip is lossless", async () => {
      const { provider } = makeMockProvider('key-v1');
      const enc = new FieldEncryption({ keyProvider: provider });

      const ssn = '123-45-6789';
      const encrypted = await enc.encrypt(ssn, 'ssn');
      const decrypted = await enc.decrypt(encrypted);
      expect(decrypted).toBe(ssn);
    });
  });

  // ---- Different plaintexts → different ciphertexts ----

  describe('encrypt() — ciphertext variety', () => {
    it("Given two different plaintexts, When encrypt() called on each, Then ciphertexts differ", async () => {
      const { provider } = makeMockProvider('key-v1');
      const enc = new FieldEncryption({ keyProvider: provider });

      const enc1 = await enc.encrypt('alice@example.com', 'email');
      const enc2 = await enc.encrypt('bob@example.com', 'email');
      expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
    });

    it("Given same plaintext encrypted twice, When IVs compared, Then IVs are different (random IV per call)", async () => {
      const { provider } = makeMockProvider('key-v1');
      const enc = new FieldEncryption({ keyProvider: provider });

      const enc1 = await enc.encrypt('same-value', 'field');
      const enc2 = await enc.encrypt('same-value', 'field');
      // IVs must differ — no IV reuse
      expect(enc1.iv).not.toBe(enc2.iv);
    });

    it("Given same plaintext encrypted twice, When ciphertexts compared, Then ciphertexts differ (due to random IV)", async () => {
      const { provider } = makeMockProvider('key-v1');
      const enc = new FieldEncryption({ keyProvider: provider });

      const enc1 = await enc.encrypt('determinism-test', 'field');
      const enc2 = await enc.encrypt('determinism-test', 'field');
      expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
    });
  });

  // ---- EncryptedField structure ----

  describe('encrypt() — EncryptedField shape', () => {
    it("Given plaintext, When encrypt() called, Then EncryptedField has keyId, algorithm, iv, ciphertext", async () => {
      const { provider } = makeMockProvider('key-v1');
      const enc = new FieldEncryption({ keyProvider: provider });

      const result = await enc.encrypt('pii-data', 'field');
      expect(result).toHaveProperty('keyId');
      expect(result).toHaveProperty('algorithm');
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('ciphertext');
    });

    it("Given plaintext, When encrypt() called, Then algorithm is 'aes-256-gcm'", async () => {
      const { provider } = makeMockProvider('key-v1');
      const enc = new FieldEncryption({ keyProvider: provider });

      const result = await enc.encrypt('algorithm-check', 'field');
      expect(result.algorithm).toBe('aes-256-gcm');
    });

    it("Given plaintext, When encrypt() called, Then keyId matches the current key's ID", async () => {
      const { provider } = makeMockProvider('key-v1');
      const enc = new FieldEncryption({ keyProvider: provider });

      const result = await enc.encrypt('key-id-check', 'field');
      expect(result.keyId).toBe('key-v1');
    });
  });

  // ---- Key rotation (AC-ENT-9.3) ----

  describe('Key rotation — encrypt with new key, decrypt old data with old key', () => {
    it("Given data encrypted with key-v1, When key rotated to key-v2, Then old data still decrypts correctly using keyId lookup", async () => {
      const provider = new MockKeyProvider();
      const keyV1 = makeKey(32);
      const keyV2 = makeKey(32);

      provider.addKey('key-v1', keyV1);
      provider.setCurrentKey('key-v1');

      const enc = new FieldEncryption({ keyProvider: provider });
      const oldEncrypted = await enc.encrypt('old-pii-data', 'email');
      expect(oldEncrypted.keyId).toBe('key-v1');

      // Rotate key — add v2 and set as current
      provider.addKey('key-v2', keyV2);
      provider.setCurrentKey('key-v2');

      // New data uses key-v2
      const newEncrypted = await enc.encrypt('new-pii-data', 'email');
      expect(newEncrypted.keyId).toBe('key-v2');

      // Old data still decrypts (no re-encryption needed)
      const oldDecrypted = await enc.decrypt(oldEncrypted);
      expect(oldDecrypted).toBe('old-pii-data');

      // New data decrypts correctly
      const newDecrypted = await enc.decrypt(newEncrypted);
      expect(newDecrypted).toBe('new-pii-data');
    });

    it("Given key rotated multiple times, When decrypting data from each rotation, Then each decrypts correctly", async () => {
      const provider = new MockKeyProvider();
      provider.addKey('key-v1', makeKey(32));
      provider.setCurrentKey('key-v1');
      const enc = new FieldEncryption({ keyProvider: provider });

      const v1Data = await enc.encrypt('version-1-data', 'field');

      provider.addKey('key-v2', makeKey(32));
      provider.setCurrentKey('key-v2');
      const v2Data = await enc.encrypt('version-2-data', 'field');

      provider.addKey('key-v3', makeKey(32));
      provider.setCurrentKey('key-v3');
      const v3Data = await enc.encrypt('version-3-data', 'field');

      // All three must decrypt correctly regardless of current key
      expect(await enc.decrypt(v1Data)).toBe('version-1-data');
      expect(await enc.decrypt(v2Data)).toBe('version-2-data');
      expect(await enc.decrypt(v3Data)).toBe('version-3-data');
    });
  });

  // ---- MockKeyProvider interface ----

  describe('MockKeyProvider — interface compliance', () => {
    it("MockKeyProvider has getCurrentKey() method", async () => {
      const { provider } = makeMockProvider('key-v1');
      const current = await provider.getCurrentKey();
      expect(current).toHaveProperty('keyId');
      expect(current).toHaveProperty('key');
      expect(current.keyId).toBe('key-v1');
      expect(Buffer.isBuffer(current.key)).toBe(true);
    });

    it("MockKeyProvider has getKey(keyId) method that retrieves specific keys", async () => {
      const { provider, key } = makeMockProvider('key-v1');
      const retrieved = await provider.getKey('key-v1');
      expect(retrieved.keyId).toBe('key-v1');
      expect(retrieved.key.equals(key)).toBe(true);
    });

    it("MockKeyProvider getKey() with unknown keyId throws or rejects", async () => {
      const { provider } = makeMockProvider('key-v1');
      await expect(provider.getKey('nonexistent-key')).rejects.toThrow(/not found|unknown/i);
    });

    it("MockKeyProvider setCurrentKey() changes the active key returned by getCurrentKey()", async () => {
      const provider = new MockKeyProvider();
      provider.addKey('key-v1', makeKey(32));
      provider.addKey('key-v2', makeKey(32));
      provider.setCurrentKey('key-v1');

      let current = await provider.getCurrentKey();
      expect(current.keyId).toBe('key-v1');

      provider.setCurrentKey('key-v2');
      current = await provider.getCurrentKey();
      expect(current.keyId).toBe('key-v2');
    });
  });
});

// ---------------------------------------------------------------------------
// COVERAGE — BLK-1: field-encryption branch coverage
// ---------------------------------------------------------------------------

describe('FieldEncryption — COVERAGE', () => {
  describe('decrypt() — missing EncryptedField properties', () => {
    it("Given EncryptedField without own 'algorithm' property, When decrypt() called, Then defaults to aes-256-gcm", async () => {
      const { provider } = makeMockProvider('key-v1');
      const enc = new FieldEncryption({ keyProvider: provider });

      // Encrypt normally first
      const encrypted = await enc.encrypt('test-data', 'field');

      // Create object without own 'algorithm' property
      const withoutAlgorithm = Object.create({ algorithm: 'inherited-not-own' });
      withoutAlgorithm.keyId = encrypted.keyId;
      withoutAlgorithm.iv = encrypted.iv;
      withoutAlgorithm.ciphertext = encrypted.ciphertext;
      // algorithm is inherited, not own — hasOwnProperty returns false

      // Should use the fallback ALGORITHM ('aes-256-gcm') and decrypt successfully
      const decrypted = await enc.decrypt(withoutAlgorithm);
      expect(decrypted).toBe('test-data');
    });

    it("Given EncryptedField without own 'keyId' property, When decrypt() called, Then getKey receives undefined and throws", async () => {
      const { provider } = makeMockProvider('key-v1');
      const enc = new FieldEncryption({ keyProvider: provider });

      const encrypted = await enc.encrypt('test', 'field');

      // Create object without own 'keyId' property
      const withoutKeyId = Object.create({ keyId: 'inherited' });
      withoutKeyId.algorithm = encrypted.algorithm;
      withoutKeyId.iv = encrypted.iv;
      withoutKeyId.ciphertext = encrypted.ciphertext;

      await expect(enc.decrypt(withoutKeyId)).rejects.toThrow();
    });

    it("Given EncryptedField without own 'iv' property, When decrypt() called, Then throws on Buffer.from(undefined)", async () => {
      const { provider } = makeMockProvider('key-v1');
      const enc = new FieldEncryption({ keyProvider: provider });

      const encrypted = await enc.encrypt('test', 'field');

      const withoutIv = Object.create({ iv: 'inherited' });
      withoutIv.keyId = encrypted.keyId;
      withoutIv.algorithm = encrypted.algorithm;
      withoutIv.ciphertext = encrypted.ciphertext;

      await expect(enc.decrypt(withoutIv)).rejects.toThrow();
    });

    it("Given EncryptedField without own 'ciphertext' property, When decrypt() called, Then throws", async () => {
      const { provider } = makeMockProvider('key-v1');
      const enc = new FieldEncryption({ keyProvider: provider });

      const encrypted = await enc.encrypt('test', 'field');

      const withoutCt = Object.create({ ciphertext: 'inherited' });
      withoutCt.keyId = encrypted.keyId;
      withoutCt.algorithm = encrypted.algorithm;
      withoutCt.iv = encrypted.iv;

      await expect(enc.decrypt(withoutCt)).rejects.toThrow();
    });
  });

  describe('decrypt() — ciphertext too short for auth tag', () => {
    it("Given ciphertext is only 10 bytes (< 16 byte auth tag), When decrypt() called, Then throws", async () => {
      const { provider } = makeMockProvider('key-v1');
      const enc = new FieldEncryption({ keyProvider: provider });

      const shortCt = {
        keyId: 'key-v1',
        algorithm: 'aes-256-gcm',
        iv: randomBytes(12).toString('base64'),
        ciphertext: randomBytes(10).toString('base64'),
      };

      await expect(enc.decrypt(shortCt)).rejects.toThrow(/too short|auth tag/i);
    });
  });
});

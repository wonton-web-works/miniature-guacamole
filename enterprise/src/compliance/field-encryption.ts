/**
 * FieldEncryption — WS-ENT-9
 *
 * AES-256-GCM envelope encryption for sensitive fields (PII at rest).
 *
 * AC-ENT-9.2: Field-level encryption helpers for PII/sensitive data at rest
 * AC-ENT-9.3: Encryption key rotation support without data re-encryption
 *
 * SECURITY: Random 12-byte IV per encryption call. GCM auth tag appended to
 * ciphertext. Key lookup by keyId on decrypt — supports rotation without
 * re-encryption of existing data.
 */

import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface KeyProvider {
  getCurrentKey(): Promise<{ keyId: string; key: Buffer }>;
  getKey(keyId: string): Promise<{ keyId: string; key: Buffer }>;
}

export interface EncryptedField {
  keyId: string;
  algorithm: string; // always 'aes-256-gcm'
  iv: string;        // base64, 12 bytes
  ciphertext: string; // base64, ciphertext + 16-byte GCM auth tag
}

// ---------------------------------------------------------------------------
// MockKeyProvider
// ---------------------------------------------------------------------------

const MIN_KEY_BYTES = 32;

export class MockKeyProvider implements KeyProvider {
  private keys: Map<string, Buffer> = new Map();
  private currentKeyId: string | null = null;

  addKey(keyId: string, key: Buffer): void {
    if (!Buffer.isBuffer(key) || key.length < MIN_KEY_BYTES) {
      throw new Error(
        `Key length must be at least ${MIN_KEY_BYTES} bytes for AES-256. Received ${Buffer.isBuffer(key) ? key.length : 'non-Buffer'} bytes. Invalid key.`
      );
    }
    this.keys.set(keyId, key);
  }

  setCurrentKey(keyId: string): void {
    this.currentKeyId = keyId;
  }

  async getCurrentKey(): Promise<{ keyId: string; key: Buffer }> {
    const keyId = this.currentKeyId;
    if (!keyId) {
      throw new Error('No current key set');
    }
    const key = this.keys.get(keyId);
    if (!key) {
      throw new Error(`Current key '${keyId}' not found`);
    }
    return { keyId, key };
  }

  async getKey(keyId: string): Promise<{ keyId: string; key: Buffer }> {
    const key = this.keys.get(keyId);
    if (!key) {
      throw new Error(`Key not found: unknown keyId '${keyId}'`);
    }
    return { keyId, key };
  }
}

// ---------------------------------------------------------------------------
// FieldEncryption
// ---------------------------------------------------------------------------

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

export class FieldEncryption {
  private readonly keyProvider: KeyProvider;

  constructor(config: { keyProvider: KeyProvider }) {
    this.keyProvider = config.keyProvider;
  }

  async encrypt(plaintext: string, _fieldName: string): Promise<EncryptedField> {
    if (plaintext === null || plaintext === undefined || typeof plaintext !== 'string') {
      throw new Error(
        `encrypt() requires a string plaintext. Received: ${plaintext === null ? 'null' : plaintext === undefined ? 'undefined' : typeof plaintext}`
      );
    }

    const { keyId, key } = await this.keyProvider.getCurrentKey();

    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    const chunks: Buffer[] = [];
    chunks.push(cipher.update(plaintext, 'utf8'));
    chunks.push(cipher.final());
    const authTag = cipher.getAuthTag();

    // Append auth tag to ciphertext so decrypt can extract it
    const ciphertextWithTag = Buffer.concat([...chunks, authTag]);

    return {
      keyId,
      algorithm: ALGORITHM,
      iv: iv.toString('base64'),
      ciphertext: ciphertextWithTag.toString('base64'),
    };
  }

  async decrypt(encrypted: EncryptedField): Promise<string> {
    // Extract only known safe properties to prevent prototype pollution
    const keyId = Object.prototype.hasOwnProperty.call(encrypted, 'keyId')
      ? (encrypted as any).keyId
      : undefined;
    const algorithm = Object.prototype.hasOwnProperty.call(encrypted, 'algorithm')
      ? (encrypted as any).algorithm
      : undefined;
    const ivB64 = Object.prototype.hasOwnProperty.call(encrypted, 'iv')
      ? (encrypted as any).iv
      : undefined;
    const ciphertextB64 = Object.prototype.hasOwnProperty.call(encrypted, 'ciphertext')
      ? (encrypted as any).ciphertext
      : undefined;

    const { key } = await this.keyProvider.getKey(keyId);

    const iv = Buffer.from(ivB64, 'base64');
    if (iv.length !== IV_BYTES) {
      throw new Error(`IV must be ${IV_BYTES} bytes. Received ${iv.length} bytes.`);
    }

    const ciphertextWithTag = Buffer.from(ciphertextB64, 'base64');
    if (ciphertextWithTag.length < AUTH_TAG_BYTES) {
      throw new Error('Ciphertext too short — missing auth tag');
    }

    const authTag = ciphertextWithTag.slice(ciphertextWithTag.length - AUTH_TAG_BYTES);
    const ciphertext = ciphertextWithTag.slice(0, ciphertextWithTag.length - AUTH_TAG_BYTES);

    const decipher = createDecipheriv(algorithm ?? ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const chunks: Buffer[] = [];
    chunks.push(decipher.update(ciphertext));
    chunks.push(decipher.final());

    return Buffer.concat(chunks).toString('utf8');
  }
}

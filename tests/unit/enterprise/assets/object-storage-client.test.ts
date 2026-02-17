/**
 * S3ObjectStorageClient Unit Tests — WS-ENT-5
 *
 * Tests for the ObjectStorageClient abstraction and S3ObjectStorageClient implementation.
 * Mocks @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner — no real AWS calls.
 *
 * AC-ENT-5.1: S3/R2 client with tenant-prefixed key strategy
 * AC-ENT-5.3: Presigned URL generation (15-60 min TTL)
 *
 * Test order (misuse-first CAD protocol):
 *   1. MISUSE CASES  — path traversal, null bytes, injection, invalid TTL, oversized
 *   2. BOUNDARY TESTS — empty body, max TTL, min TTL, exact limits
 *   3. GOLDEN PATH   — upload, download, delete, presigned URLs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Readable } from 'node:stream';

// ---------------------------------------------------------------------------
// Mock AWS SDK modules before any imports
// ---------------------------------------------------------------------------
const mockSend = vi.fn();
const mockGetSignedUrl = vi.fn();

vi.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: vi.fn().mockImplementation(() => ({
      send: mockSend,
    })),
    PutObjectCommand: vi.fn().mockImplementation((input) => ({ input, _tag: 'PutObjectCommand' })),
    GetObjectCommand: vi.fn().mockImplementation((input) => ({ input, _tag: 'GetObjectCommand' })),
    DeleteObjectCommand: vi.fn().mockImplementation((input) => ({ input, _tag: 'DeleteObjectCommand' })),
    HeadObjectCommand: vi.fn().mockImplementation((input) => ({ input, _tag: 'HeadObjectCommand' })),
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => {
  return {
    getSignedUrl: mockGetSignedUrl,
  };
});

// Import from path that does NOT exist yet — tests will be RED
import { S3ObjectStorageClient } from '../../../../enterprise/src/assets/asset-storage-service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const BUCKET = 'test-bucket';
const REGION = 'us-east-1';

function makeClient(overrides: Record<string, unknown> = {}) {
  return new S3ObjectStorageClient({
    region: REGION,
    bucket: BUCKET,
    ...overrides,
  });
}

function makeReadable(content = 'hello'): Readable {
  return Readable.from([Buffer.from(content)]);
}

// ---------------------------------------------------------------------------
// MISUSE CASES
// ---------------------------------------------------------------------------

describe('S3ObjectStorageClient — MISUSE CASES', () => {
  beforeEach(() => {
    mockSend.mockReset();
    mockGetSignedUrl.mockReset();
  });

  // ---- Path traversal in storage keys ----
  describe('upload() — path traversal in key', () => {
    it('Given key contains ../ traversal, When upload() called, Then throws with path traversal error', async () => {
      const client = makeClient();
      await expect(
        client.upload('../../../etc/passwd', Buffer.from('evil'), 'text/plain', 6)
      ).rejects.toThrow(/path traversal/i);
    });

    it('Given key contains encoded traversal (%2e%2e), When upload() called, Then throws', async () => {
      const client = makeClient();
      await expect(
        client.upload('%2e%2e%2f%2e%2e%2fetc%2fpasswd', Buffer.from('evil'), 'text/plain', 6)
      ).rejects.toThrow(/path traversal|invalid key/i);
    });

    it('Given key starts with /, When upload() called, Then throws with invalid key error', async () => {
      const client = makeClient();
      await expect(
        client.upload('/absolute/path/file.txt', Buffer.from('data'), 'text/plain', 4)
      ).rejects.toThrow(/invalid key/i);
    });
  });

  // ---- Null bytes in storage keys ----
  describe('upload() — null bytes in key', () => {
    it('Given key contains null byte, When upload() called, Then throws', async () => {
      const client = makeClient();
      await expect(
        client.upload('tenant/file\0.txt', Buffer.from('data'), 'text/plain', 4)
      ).rejects.toThrow(/null byte|invalid key/i);
    });
  });

  // ---- Presigned URL TTL enforcement — reject < 15 min ----
  describe('getPresignedUploadUrl() — TTL below minimum', () => {
    it('Given ttlSeconds is 0, When getPresignedUploadUrl() called, Then throws TTL error', async () => {
      const client = makeClient();
      await expect(
        client.getPresignedUploadUrl('tenant/file.txt', 'text/plain', 0)
      ).rejects.toThrow(/ttl|minimum/i);
    });

    it('Given ttlSeconds is 899 (< 15 min = 900s), When getPresignedUploadUrl() called, Then throws', async () => {
      const client = makeClient();
      await expect(
        client.getPresignedUploadUrl('tenant/file.txt', 'text/plain', 899)
      ).rejects.toThrow(/ttl|minimum/i);
    });

    it('Given ttlSeconds is negative, When getPresignedUploadUrl() called, Then throws', async () => {
      const client = makeClient();
      await expect(
        client.getPresignedUploadUrl('tenant/file.txt', 'text/plain', -1)
      ).rejects.toThrow(/ttl|minimum/i);
    });
  });

  // ---- Presigned URL TTL enforcement — reject > 60 min ----
  describe('getPresignedDownloadUrl() — TTL above maximum', () => {
    it('Given ttlSeconds is 3601 (> 60 min = 3600s), When getPresignedDownloadUrl() called, Then throws TTL error', async () => {
      const client = makeClient();
      await expect(
        client.getPresignedDownloadUrl('tenant/file.txt', 3601)
      ).rejects.toThrow(/ttl|maximum/i);
    });

    it('Given ttlSeconds is 7200, When getPresignedDownloadUrl() called, Then throws', async () => {
      const client = makeClient();
      await expect(
        client.getPresignedDownloadUrl('tenant/file.txt', 7200)
      ).rejects.toThrow(/ttl|maximum/i);
    });
  });

  // ---- Constructor — missing required config ----
  describe('S3ObjectStorageClient constructor — missing config', () => {
    it('Given no region, When constructed, Then throws configuration error', () => {
      expect(() => new S3ObjectStorageClient({ bucket: BUCKET } as any)).toThrow(/region/i);
    });

    it('Given no bucket, When constructed, Then throws configuration error', () => {
      expect(() => new S3ObjectStorageClient({ region: REGION } as any)).toThrow(/bucket/i);
    });

    it('Given null config, When constructed, Then throws', () => {
      expect(() => new S3ObjectStorageClient(null as any)).toThrow();
    });
  });

  // ---- download() — S3 returns null body ----
  describe('download() — S3 returns null/empty body', () => {
    it('Given S3 returns no body, When download() called, Then throws with stream error', async () => {
      const client = makeClient();
      mockSend.mockResolvedValue({ Body: null });
      await expect(client.download('tenant/file.txt')).rejects.toThrow(/stream|body|not found/i);
    });
  });

  // ---- headObject() — key injection attempt ----
  describe('headObject() — injection in key', () => {
    it('Given key with SQL injection characters, When headObject() called, Then key is NOT interpolated into any URL string', async () => {
      const client = makeClient();
      mockSend.mockResolvedValue({
        ContentType: 'text/plain',
        ContentLength: 10,
      });
      // Should not throw — the SDK handles encoding — but key must pass through as param, not interpolated
      const injectedKey = "'; DROP TABLE assets;--/file.txt";
      await expect(client.headObject(injectedKey)).resolves.toBeDefined();
      // Verify send was called with the key as a structured param, not interpolated
      const sentCommand = mockSend.mock.calls[0][0];
      expect(sentCommand.input.Key).toBe(injectedKey);
    });
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY TESTS
// ---------------------------------------------------------------------------

describe('S3ObjectStorageClient — BOUNDARY TESTS', () => {
  beforeEach(() => {
    mockSend.mockReset();
    mockGetSignedUrl.mockReset();
  });

  // ---- Empty body upload ----
  describe('upload() — zero-length body', () => {
    it('Given empty Buffer (0 bytes), When upload() called with valid key, Then succeeds (zero-byte objects valid)', async () => {
      const client = makeClient();
      mockSend.mockResolvedValue({});
      await expect(
        client.upload('tenant/empty.txt', Buffer.alloc(0), 'text/plain', 0)
      ).resolves.not.toThrow();
    });
  });

  // ---- TTL at exact minimum boundary ----
  describe('getPresignedUploadUrl() — TTL at minimum boundary', () => {
    it('Given ttlSeconds is exactly 900 (15 min), When getPresignedUploadUrl() called, Then succeeds', async () => {
      const client = makeClient();
      mockGetSignedUrl.mockResolvedValue('https://bucket.s3.amazonaws.com/signed');
      const url = await client.getPresignedUploadUrl('tenant/file.txt', 'text/plain', 900);
      expect(url).toContain('https://');
    });
  });

  // ---- TTL at exact maximum boundary ----
  describe('getPresignedDownloadUrl() — TTL at maximum boundary', () => {
    it('Given ttlSeconds is exactly 3600 (60 min), When getPresignedDownloadUrl() called, Then succeeds', async () => {
      const client = makeClient();
      mockGetSignedUrl.mockResolvedValue('https://bucket.s3.amazonaws.com/signed');
      const url = await client.getPresignedDownloadUrl('tenant/file.txt', 3600);
      expect(url).toContain('https://');
    });
  });

  // ---- headObject() — key not found returns null ----
  describe('headObject() — object not found', () => {
    it('Given S3 throws NotFound, When headObject() called, Then returns null', async () => {
      const client = makeClient();
      const err = Object.assign(new Error('Not Found'), { name: 'NotFound', $metadata: { httpStatusCode: 404 } });
      mockSend.mockRejectedValue(err);
      const result = await client.headObject('tenant/nonexistent.txt');
      expect(result).toBeNull();
    });
  });

  // ---- Special characters in filenames (valid S3 keys) ----
  describe('upload() — special characters in valid keys', () => {
    it('Given key with spaces, When upload() called, Then passes key to S3 SDK as-is', async () => {
      const client = makeClient();
      mockSend.mockResolvedValue({});
      await client.upload('tenant-a/my file name.txt', Buffer.from('data'), 'text/plain', 4);
      const sentCommand = mockSend.mock.calls[0][0];
      expect(sentCommand.input.Key).toBe('tenant-a/my file name.txt');
    });

    it('Given key with unicode characters, When upload() called, Then passes through without corruption', async () => {
      const client = makeClient();
      mockSend.mockResolvedValue({});
      const unicodeKey = 'tenant-a/fiche-résumé.pdf';
      await client.upload(unicodeKey, Buffer.from('data'), 'application/pdf', 4);
      const sentCommand = mockSend.mock.calls[0][0];
      expect(sentCommand.input.Key).toBe(unicodeKey);
    });
  });

  // ---- Custom endpoint (R2 compatibility) ----
  describe('S3ObjectStorageClient — custom endpoint', () => {
    it('Given endpoint provided, When constructed, Then client is configured with that endpoint', () => {
      // Should not throw — endpoint is optional R2/MinIO config
      expect(() => new S3ObjectStorageClient({
        region: REGION,
        bucket: BUCKET,
        endpoint: 'https://account.r2.cloudflarestorage.com',
      })).not.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH
// ---------------------------------------------------------------------------

describe('S3ObjectStorageClient — GOLDEN PATH', () => {
  let client: S3ObjectStorageClient;

  beforeEach(() => {
    mockSend.mockReset();
    mockGetSignedUrl.mockReset();
    client = makeClient();
  });

  // ---- upload() ----
  describe('upload() — normal file', () => {
    it('Given valid key, body, contentType, When upload() called, Then sends PutObjectCommand to S3', async () => {
      mockSend.mockResolvedValue({});
      await client.upload('tenant-a/uuid/report.pdf', Buffer.from('PDF content'), 'application/pdf', 11);
      expect(mockSend).toHaveBeenCalledOnce();
      const sentCommand = mockSend.mock.calls[0][0];
      expect(sentCommand.input.Key).toBe('tenant-a/uuid/report.pdf');
      expect(sentCommand.input.ContentType).toBe('application/pdf');
      expect(sentCommand.input.ContentLength).toBe(11);
      expect(sentCommand.input.Bucket).toBe(BUCKET);
    });

    it('Given valid input, When upload() called with Readable stream, Then sends PutObjectCommand', async () => {
      mockSend.mockResolvedValue({});
      const stream = makeReadable('stream data');
      await client.upload('tenant-a/uuid/stream.txt', stream, 'text/plain', 11);
      expect(mockSend).toHaveBeenCalledOnce();
    });
  });

  // ---- download() ----
  describe('download() — normal file', () => {
    it('Given valid key, When download() called, Then returns Readable stream from S3', async () => {
      const fakeStream = makeReadable('file data from S3');
      mockSend.mockResolvedValue({ Body: fakeStream });
      const result = await client.download('tenant-a/uuid/file.txt');
      expect(result).toBeInstanceOf(Readable);
    });

    it('Given valid key, When download() called, Then sends GetObjectCommand with correct bucket and key', async () => {
      mockSend.mockResolvedValue({ Body: makeReadable() });
      await client.download('tenant-a/uuid/report.pdf');
      const sentCommand = mockSend.mock.calls[0][0];
      expect(sentCommand.input.Key).toBe('tenant-a/uuid/report.pdf');
      expect(sentCommand.input.Bucket).toBe(BUCKET);
    });
  });

  // ---- delete() ----
  describe('delete() — normal file', () => {
    it('Given valid key, When delete() called, Then sends DeleteObjectCommand to S3', async () => {
      mockSend.mockResolvedValue({});
      await client.delete('tenant-a/uuid/file.txt');
      expect(mockSend).toHaveBeenCalledOnce();
      const sentCommand = mockSend.mock.calls[0][0];
      expect(sentCommand.input.Key).toBe('tenant-a/uuid/file.txt');
      expect(sentCommand.input.Bucket).toBe(BUCKET);
    });
  });

  // ---- getPresignedUploadUrl() ----
  describe('getPresignedUploadUrl() — valid request', () => {
    it('Given valid key, contentType, TTL in range, When called, Then returns presigned URL string', async () => {
      mockGetSignedUrl.mockResolvedValue('https://bucket.s3.amazonaws.com/tenant-a/uuid/file.txt?X-Amz-Signature=abc');
      const url = await client.getPresignedUploadUrl('tenant-a/uuid/file.txt', 'image/png', 1800);
      expect(typeof url).toBe('string');
      expect(url).toContain('https://');
    });

    it('Given TTL of 30 min (1800s), When called, Then passes expiresIn to presigner', async () => {
      mockGetSignedUrl.mockResolvedValue('https://example.com/signed');
      await client.getPresignedUploadUrl('tenant-a/uuid/file.txt', 'text/plain', 1800);
      expect(mockGetSignedUrl).toHaveBeenCalledOnce();
      const [, , options] = mockGetSignedUrl.mock.calls[0];
      expect(options.expiresIn).toBe(1800);
    });
  });

  // ---- getPresignedDownloadUrl() ----
  describe('getPresignedDownloadUrl() — valid request', () => {
    it('Given valid key and TTL in range, When called, Then returns presigned URL string', async () => {
      mockGetSignedUrl.mockResolvedValue('https://bucket.s3.amazonaws.com/tenant-a/uuid/file.txt?X-Amz-Signature=xyz');
      const url = await client.getPresignedDownloadUrl('tenant-a/uuid/file.txt', 900);
      expect(typeof url).toBe('string');
      expect(url).toContain('https://');
    });

    it('Given TTL, When called, Then passes expiresIn to presigner', async () => {
      mockGetSignedUrl.mockResolvedValue('https://example.com/signed');
      await client.getPresignedDownloadUrl('tenant-a/uuid/file.txt', 3600);
      const [, , options] = mockGetSignedUrl.mock.calls[0];
      expect(options.expiresIn).toBe(3600);
    });
  });

  // ---- headObject() ----
  describe('headObject() — object exists', () => {
    it('Given object exists in S3, When headObject() called, Then returns contentType and contentLength', async () => {
      mockSend.mockResolvedValue({
        ContentType: 'application/pdf',
        ContentLength: 204800,
      });
      const result = await client.headObject('tenant-a/uuid/report.pdf');
      expect(result).not.toBeNull();
      expect(result!.contentType).toBe('application/pdf');
      expect(result!.contentLength).toBe(204800);
    });
  });

  // ---- Bucket name passed correctly ----
  describe('S3ObjectStorageClient — bucket isolation', () => {
    it('Given client configured with specific bucket, When any command sent, Then always uses that bucket', async () => {
      mockSend.mockResolvedValue({});
      await client.upload('key', Buffer.from('x'), 'text/plain', 1);
      await client.delete('key');
      for (const call of mockSend.mock.calls) {
        expect(call[0].input.Bucket).toBe(BUCKET);
      }
    });
  });
});

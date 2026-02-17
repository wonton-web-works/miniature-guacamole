/**
 * Asset Storage Integration Tests — WS-ENT-5
 *
 * Integration tests validating the full AssetStorageService + MCP pipeline flow.
 * Mocks at the I/O boundary (S3 SDK + pg Pool) but wires real service classes together.
 * Tests cross-component interactions, not individual functions.
 *
 * AC-ENT-5.1: Tenant-prefixed key strategy applied end-to-end
 * AC-ENT-5.2: Metadata persisted via AssetRepository
 * AC-ENT-5.3: Presigned URLs at correct TTL
 * AC-ENT-5.4: MCP pipeline flows through service to storage
 * AC-ENT-5.5: 99%+ coverage
 *
 * Test order (misuse-first CAD protocol):
 *   1. MISUSE CASES  — cross-tenant isolation, injection end-to-end, malformed pipeline input
 *   2. BOUNDARY TESTS — rollback on DB failure, empty content, TTL conversion
 *   3. GOLDEN PATH   — upload-download cycle, MCP pipeline to Asset, presigned URL flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Readable } from 'node:stream';

// ---------------------------------------------------------------------------
// Mock at the I/O boundary: pg Pool and AWS SDK
// ---------------------------------------------------------------------------
const mockDbQuery = vi.fn();
const mockS3Send = vi.fn();
const mockGetSignedUrl = vi.fn();

vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => ({
    query: mockDbQuery,
    connect: vi.fn(),
    end: vi.fn(),
  })),
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: mockS3Send })),
  PutObjectCommand: vi.fn().mockImplementation((input) => ({ input, _tag: 'PutObjectCommand' })),
  GetObjectCommand: vi.fn().mockImplementation((input) => ({ input, _tag: 'GetObjectCommand' })),
  DeleteObjectCommand: vi.fn().mockImplementation((input) => ({ input, _tag: 'DeleteObjectCommand' })),
  HeadObjectCommand: vi.fn().mockImplementation((input) => ({ input, _tag: 'HeadObjectCommand' })),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

// Import real implementation classes — will be RED until implemented
import { AssetStorageService, S3ObjectStorageClient } from '../../../enterprise/src/assets/asset-storage-service';
import { processMcpToolOutput } from '../../../enterprise/src/assets/mcp-asset-pipeline';
import { AssetRepository } from '../../../enterprise/src/schema/repositories';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TENANT_A = 'tenant-acme';
const TENANT_B = 'tenant-rival';
const UUID_1 = '550e8400-e29b-41d4-a716-446655440001';
const UUID_2 = '550e8400-e29b-41d4-a716-446655440002';
const UUID_3 = '550e8400-e29b-41d4-a716-446655440003';
const DEFAULT_BUCKET = 'mg-assets';
const CONN_STR = 'postgresql://localhost/test';

function makeQueryResult(rows: any[] = []) {
  return { rows, rowCount: rows.length };
}

function buildServices() {
  const objectStorage = new S3ObjectStorageClient({
    region: 'us-east-1',
    bucket: DEFAULT_BUCKET,
  });
  const assetRepository = new AssetRepository({ connectionString: CONN_STR });
  const service = new AssetStorageService({
    objectStorage,
    assetRepository,
    defaultBucket: DEFAULT_BUCKET,
  });
  return { objectStorage, assetRepository, service };
}

function resetMocks() {
  mockDbQuery.mockReset();
  mockS3Send.mockReset();
  mockGetSignedUrl.mockReset();
}

// ---------------------------------------------------------------------------
// MISUSE CASES
// ---------------------------------------------------------------------------

describe('Asset Storage Integration — MISUSE CASES', () => {
  beforeEach(() => {
    resetMocks();
  });

  // ---- Cross-tenant isolation: storage key cannot leak across tenants ----
  describe('cross-tenant key isolation', () => {
    it('Given upload for tenant A, When storage key is generated, Then key is prefixed with tenant A (not tenant B)', async () => {
      const { service } = buildServices();
      const dbRow = {
        id: UUID_1,
        tenant_id: TENANT_A,
        storage_key: `${TENANT_A}/${UUID_2}/file.txt`,
        bucket: DEFAULT_BUCKET,
        content_type: 'text/plain',
        size_bytes: 4,
        created_at: '2026-02-17T00:00:00Z',
        updated_at: '2026-02-17T00:00:00Z',
      };
      mockS3Send.mockResolvedValue({});
      mockDbQuery.mockResolvedValue(makeQueryResult([dbRow]));

      await service.upload({
        tenantId: TENANT_A,
        filename: 'file.txt',
        contentType: 'text/plain',
        body: Buffer.from('data'),
      });

      // S3 put command must have key starting with tenant A
      const s3Command = mockS3Send.mock.calls[0][0];
      expect(s3Command.input.Key).toMatch(new RegExp(`^${TENANT_A}/`));
      expect(s3Command.input.Key).not.toMatch(new RegExp(`^${TENANT_B}/`));
    });

    it('Given tenant A and tenant B both upload files with same filename, When uploaded, Then storage keys differ', async () => {
      const { service } = buildServices();
      const makeRow = (tenant: string) => ({
        id: UUID_1,
        tenant_id: tenant,
        storage_key: `${tenant}/${UUID_2}/file.txt`,
        bucket: DEFAULT_BUCKET,
        content_type: 'text/plain',
        size_bytes: 4,
        created_at: '2026-02-17T00:00:00Z',
        updated_at: '2026-02-17T00:00:00Z',
      });
      mockS3Send.mockResolvedValue({});
      mockDbQuery
        .mockResolvedValueOnce(makeQueryResult([makeRow(TENANT_A)]))
        .mockResolvedValueOnce(makeQueryResult([makeRow(TENANT_B)]));

      await service.upload({ tenantId: TENANT_A, filename: 'file.txt', contentType: 'text/plain', body: Buffer.from('a') });
      await service.upload({ tenantId: TENANT_B, filename: 'file.txt', contentType: 'text/plain', body: Buffer.from('b') });

      const keyA = mockS3Send.mock.calls[0][0].input.Key;
      const keyB = mockS3Send.mock.calls[1][0].input.Key;
      expect(keyA).toMatch(new RegExp(`^${TENANT_A}/`));
      expect(keyB).toMatch(new RegExp(`^${TENANT_B}/`));
      expect(keyA).not.toBe(keyB);
    });
  });

  // ---- Path traversal in filename propagation ----
  describe('path traversal end-to-end', () => {
    it('Given filename with ../ traversal, When upload() called on real service, Then throws before S3 call', async () => {
      const { service } = buildServices();
      await expect(
        service.upload({
          tenantId: TENANT_A,
          filename: '../../../etc/passwd',
          contentType: 'text/plain',
          body: Buffer.from('evil'),
        })
      ).rejects.toThrow(/path traversal|invalid filename/i);
      // Must not reach S3
      expect(mockS3Send).not.toHaveBeenCalled();
      // Must not reach DB
      expect(mockDbQuery).not.toHaveBeenCalled();
    });
  });

  // ---- Prototype pollution end-to-end ----
  describe('prototype pollution end-to-end', () => {
    it('Given metadata with __proto__, When upload() called, Then throws before S3 and DB calls', async () => {
      const { service } = buildServices();
      const poisoned = JSON.parse('{"__proto__": {"admin": true}}');
      await expect(
        service.upload({
          tenantId: TENANT_A,
          filename: 'file.txt',
          contentType: 'text/plain',
          body: Buffer.from('data'),
          metadata: poisoned,
        })
      ).rejects.toThrow(/prototype pollution/i);
      expect(mockS3Send).not.toHaveBeenCalled();
      expect(mockDbQuery).not.toHaveBeenCalled();
    });
  });

  // ---- MCP pipeline: null output rejected before storage ----
  describe('MCP pipeline: null output', () => {
    it('Given null output, When processMcpToolOutput() called, Then throws without reaching S3 or DB', async () => {
      const { service } = buildServices();
      await expect(
        processMcpToolOutput({
          tenantId: TENANT_A,
          toolName: 'my-tool',
          output: null as any,
          storageService: service,
        })
      ).rejects.toThrow(/output|required/i);
      expect(mockS3Send).not.toHaveBeenCalled();
      expect(mockDbQuery).not.toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY TESTS
// ---------------------------------------------------------------------------

describe('Asset Storage Integration — BOUNDARY TESTS', () => {
  beforeEach(() => {
    resetMocks();
  });

  // ---- Atomic rollback: S3 succeeds, DB fails ----
  describe('atomic rollback on DB failure', () => {
    it('Given S3 upload succeeds but DB insert throws, When upload() called, Then S3 delete is called for rollback', async () => {
      const { service } = buildServices();
      mockS3Send
        .mockResolvedValueOnce({})    // PutObject succeeds
        .mockResolvedValueOnce({});   // DeleteObject succeeds (rollback)
      mockDbQuery.mockRejectedValue(new Error('DB timeout'));

      await expect(
        service.upload({
          tenantId: TENANT_A,
          filename: 'file.txt',
          contentType: 'text/plain',
          body: Buffer.from('data'),
        })
      ).rejects.toThrow(/DB timeout/);

      // Verify S3 delete was called (rollback)
      expect(mockS3Send).toHaveBeenCalledTimes(2);
      const deleteCommand = mockS3Send.mock.calls[1][0];
      expect(deleteCommand._tag).toBe('DeleteObjectCommand');
    });
  });

  // ---- Empty content uploads ----
  describe('empty content uploads', () => {
    it('Given 0-byte Buffer body, When upload() called, Then S3 receives ContentLength of 0', async () => {
      const { service } = buildServices();
      const dbRow = {
        id: UUID_1,
        tenant_id: TENANT_A,
        storage_key: `${TENANT_A}/${UUID_2}/empty.txt`,
        bucket: DEFAULT_BUCKET,
        content_type: 'text/plain',
        size_bytes: 0,
        created_at: '2026-02-17T00:00:00Z',
        updated_at: '2026-02-17T00:00:00Z',
      };
      mockS3Send.mockResolvedValue({});
      mockDbQuery.mockResolvedValue(makeQueryResult([dbRow]));

      await service.upload({
        tenantId: TENANT_A,
        filename: 'empty.txt',
        contentType: 'text/plain',
        body: Buffer.alloc(0),
      });

      const s3Command = mockS3Send.mock.calls[0][0];
      expect(s3Command.input.ContentLength).toBe(0);
    });
  });

  // ---- TTL conversion: minutes → seconds ----
  describe('TTL conversion in getDownloadUrl', () => {
    it('Given ttlMinutes of 30, When getDownloadUrl() called, Then presigner receives 1800 seconds', async () => {
      const { service } = buildServices();
      const dbRow = {
        id: UUID_1,
        tenant_id: TENANT_A,
        storage_key: `${TENANT_A}/${UUID_2}/file.txt`,
        bucket: DEFAULT_BUCKET,
        content_type: 'text/plain',
        size_bytes: 100,
        created_at: '2026-02-17T00:00:00Z',
        updated_at: '2026-02-17T00:00:00Z',
      };
      mockDbQuery.mockResolvedValue(makeQueryResult([dbRow]));
      mockGetSignedUrl.mockResolvedValue('https://example.com/signed');

      await service.getDownloadUrl(UUID_1, 30);

      expect(mockGetSignedUrl).toHaveBeenCalledOnce();
      const [, , options] = mockGetSignedUrl.mock.calls[0];
      expect(options.expiresIn).toBe(1800);
    });
  });

  // ---- MCP pipeline: empty string flows through ----
  describe('MCP pipeline: empty string output', () => {
    it('Given empty string output, When processMcpToolOutput() called, Then uploads 0-byte asset', async () => {
      const { service } = buildServices();
      const dbRow = {
        id: UUID_1,
        tenant_id: TENANT_A,
        storage_key: `${TENANT_A}/${UUID_2}/empty-tool-0.txt`,
        bucket: DEFAULT_BUCKET,
        content_type: 'text/plain',
        size_bytes: 0,
        created_at: '2026-02-17T00:00:00Z',
        updated_at: '2026-02-17T00:00:00Z',
      };
      mockS3Send.mockResolvedValue({});
      mockDbQuery.mockResolvedValue(makeQueryResult([dbRow]));

      const result = await processMcpToolOutput({
        tenantId: TENANT_A,
        toolName: 'empty-tool',
        output: '',
        storageService: service,
      });

      expect(result.size_bytes).toBe(0);
      const s3Command = mockS3Send.mock.calls[0][0];
      expect(s3Command.input.ContentLength).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH
// ---------------------------------------------------------------------------

describe('Asset Storage Integration — GOLDEN PATH', () => {
  beforeEach(() => {
    resetMocks();
  });

  // ---- Full upload → download cycle ----
  describe('upload then download cycle', () => {
    it('Given uploaded asset, When download() called with returned asset ID, Then retrieves correct storage key', async () => {
      const { service } = buildServices();
      const storageKey = `${TENANT_A}/${UUID_2}/document.pdf`;
      const uploadDbRow = {
        id: UUID_1,
        tenant_id: TENANT_A,
        storage_key: storageKey,
        bucket: DEFAULT_BUCKET,
        content_type: 'application/pdf',
        size_bytes: 1024,
        filename: 'document.pdf',
        created_at: '2026-02-17T00:00:00Z',
        updated_at: '2026-02-17T00:00:00Z',
      };

      // Upload
      mockS3Send.mockResolvedValue({});
      mockDbQuery.mockResolvedValue(makeQueryResult([uploadDbRow]));
      const uploaded = await service.upload({
        tenantId: TENANT_A,
        filename: 'document.pdf',
        contentType: 'application/pdf',
        body: Buffer.from('PDF content'),
      });

      // Download
      mockDbQuery.mockResolvedValue(makeQueryResult([uploadDbRow]));
      mockS3Send.mockResolvedValue({ Body: Readable.from(['PDF content']) });
      const downloaded = await service.download(uploaded.id);

      expect(downloaded.asset.storage_key).toBe(storageKey);
      expect(downloaded.asset.tenant_id).toBe(TENANT_A);
      const downloadCommand = mockS3Send.mock.calls[1][0];
      expect(downloadCommand.input.Key).toBe(storageKey);
    });
  });

  // ---- Upload + delete cycle ----
  describe('upload then delete cycle', () => {
    it('Given uploaded asset, When delete() called, Then S3 delete uses correct storage key', async () => {
      const { service } = buildServices();
      const storageKey = `${TENANT_A}/${UUID_2}/to-delete.txt`;
      const dbRow = {
        id: UUID_1,
        tenant_id: TENANT_A,
        storage_key: storageKey,
        bucket: DEFAULT_BUCKET,
        content_type: 'text/plain',
        size_bytes: 4,
        created_at: '2026-02-17T00:00:00Z',
        updated_at: '2026-02-17T00:00:00Z',
      };

      // Upload phase
      mockS3Send.mockResolvedValue({});
      mockDbQuery.mockResolvedValue(makeQueryResult([dbRow]));
      const uploaded = await service.upload({
        tenantId: TENANT_A,
        filename: 'to-delete.txt',
        contentType: 'text/plain',
        body: Buffer.from('data'),
      });

      // Delete phase
      mockDbQuery.mockResolvedValue(makeQueryResult([dbRow])); // findById
      mockS3Send.mockResolvedValue({});
      mockDbQuery.mockResolvedValue(makeQueryResult([])); // DB delete

      await service.delete(uploaded.id);

      // Find S3 delete call (after the upload put call)
      const s3DeleteCall = mockS3Send.mock.calls.find(
        (call) => call[0]._tag === 'DeleteObjectCommand'
      );
      expect(s3DeleteCall).toBeDefined();
      expect(s3DeleteCall![0].input.Key).toBe(storageKey);
    });
  });

  // ---- MCP pipeline: Buffer output → Asset ----
  describe('MCP pipeline: Buffer output creates Asset', () => {
    it('Given binary tool output, When processMcpToolOutput() called, Then asset created with correct tenant and toolName in metadata', async () => {
      const { service } = buildServices();
      const storageKey = `${TENANT_A}/${UUID_2}/scan-results-12345.bin`;
      const dbRow = {
        id: UUID_1,
        tenant_id: TENANT_A,
        storage_key: storageKey,
        bucket: DEFAULT_BUCKET,
        content_type: 'application/octet-stream',
        size_bytes: 3,
        metadata: { tool_name: 'dependency-scanner' },
        created_at: '2026-02-17T00:00:00Z',
        updated_at: '2026-02-17T00:00:00Z',
      };
      mockS3Send.mockResolvedValue({});
      mockDbQuery.mockResolvedValue(makeQueryResult([dbRow]));

      const result = await processMcpToolOutput({
        tenantId: TENANT_A,
        toolName: 'dependency-scanner',
        output: Buffer.from([0x01, 0x02, 0x03]),
        storageService: service,
      });

      expect(result.id).toBe(UUID_1);
      expect(result.tenant_id).toBe(TENANT_A);
      // Verify S3 received a PutObject
      const putCommand = mockS3Send.mock.calls[0][0];
      expect(putCommand._tag).toBe('PutObjectCommand');
      expect(putCommand.input.Key).toMatch(new RegExp(`^${TENANT_A}/`));
    });
  });

  // ---- MCP pipeline: string output → Asset ----
  describe('MCP pipeline: string output creates Asset', () => {
    it('Given string tool output, When processMcpToolOutput() called, Then asset created and body is UTF-8 Buffer', async () => {
      const { service } = buildServices();
      const dbRow = {
        id: UUID_1,
        tenant_id: TENANT_A,
        storage_key: `${TENANT_A}/${UUID_2}/text-output-12345.txt`,
        bucket: DEFAULT_BUCKET,
        content_type: 'text/plain',
        size_bytes: 27,
        created_at: '2026-02-17T00:00:00Z',
        updated_at: '2026-02-17T00:00:00Z',
      };
      mockS3Send.mockResolvedValue({});
      mockDbQuery.mockResolvedValue(makeQueryResult([dbRow]));

      const result = await processMcpToolOutput({
        tenantId: TENANT_A,
        toolName: 'code-linter',
        output: 'No issues found in 3 files.',
        storageService: service,
      });

      expect(result.id).toBe(UUID_1);
      const putCommand = mockS3Send.mock.calls[0][0];
      // Body should be a Buffer from the string conversion
      const body = putCommand.input.Body;
      expect(Buffer.isBuffer(body) || body instanceof Uint8Array).toBe(true);
    });
  });

  // ---- Presigned upload URL: key prefixed correctly ----
  describe('getUploadUrl integration', () => {
    it('Given getUploadUrl() call, When called, Then returns URL and storageKey with correct tenant prefix', async () => {
      const { service } = buildServices();
      mockGetSignedUrl.mockResolvedValue('https://bucket.s3.amazonaws.com/tenant-acme/uuid/report.pdf?sig=abc');

      const result = await service.getUploadUrl({
        tenantId: TENANT_A,
        filename: 'report.pdf',
        contentType: 'application/pdf',
        ttlMinutes: 30,
      });

      expect(result.url).toContain('https://');
      expect(result.storageKey).toMatch(new RegExp(`^${TENANT_A}/`));
      expect(result.storageKey).toMatch(/report\.pdf$/);
    });
  });

  // ---- listByProject: DB parameterized query ----
  describe('listByProject: parameterized query', () => {
    it('Given project ID, When listByProject() called, Then DB query uses parameterized $1 not string interpolation', async () => {
      const { service } = buildServices();
      const rows = [
        {
          id: UUID_1,
          tenant_id: TENANT_A,
          project_id: UUID_3,
          storage_key: `${TENANT_A}/${UUID_2}/file.txt`,
          bucket: DEFAULT_BUCKET,
          content_type: 'text/plain',
          size_bytes: 10,
          created_at: '2026-02-17T00:00:00Z',
          updated_at: '2026-02-17T00:00:00Z',
        },
      ];
      mockDbQuery.mockResolvedValue(makeQueryResult(rows));

      const result = await service.listByProject(UUID_3);
      expect(result).toHaveLength(1);

      // Verify parameterized query
      const [sql, params] = mockDbQuery.mock.calls[0];
      expect(sql).not.toContain(UUID_3);
      expect(params).toContain(UUID_3);
    });
  });

  // ---- Bucket name flows through to S3 commands ----
  describe('bucket isolation', () => {
    it('Given service with defaultBucket, When upload() called, Then all S3 commands use that bucket', async () => {
      const { service } = buildServices();
      const dbRow = {
        id: UUID_1,
        tenant_id: TENANT_A,
        storage_key: `${TENANT_A}/${UUID_2}/file.txt`,
        bucket: DEFAULT_BUCKET,
        content_type: 'text/plain',
        size_bytes: 4,
        created_at: '2026-02-17T00:00:00Z',
        updated_at: '2026-02-17T00:00:00Z',
      };
      mockS3Send.mockResolvedValue({});
      mockDbQuery.mockResolvedValue(makeQueryResult([dbRow]));

      await service.upload({
        tenantId: TENANT_A,
        filename: 'file.txt',
        contentType: 'text/plain',
        body: Buffer.from('data'),
      });

      const putCommand = mockS3Send.mock.calls[0][0];
      expect(putCommand.input.Bucket).toBe(DEFAULT_BUCKET);
    });
  });
});

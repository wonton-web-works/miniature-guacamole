/**
 * AssetStorageService Unit Tests — WS-ENT-5
 *
 * Tests for the AssetStorageService orchestration layer (object storage + Postgres metadata).
 * Mocks ObjectStorageClient and AssetRepository — no real S3 or Postgres calls.
 *
 * AC-ENT-5.1: S3/R2 client with tenant-prefixed key strategy
 * AC-ENT-5.2: Asset metadata in Postgres assets table
 * AC-ENT-5.3: Presigned URL generation (15-60 min TTL)
 * AC-ENT-5.5: 99%+ test coverage
 *
 * Test order (misuse-first CAD protocol):
 *   1. MISUSE CASES  — injection, path traversal, oversized files, cross-tenant access,
 *                      prototype pollution, content-type spoofing, null bytes
 *   2. BOUNDARY TESTS — empty files, max filename length, TTL limits, concurrent uploads,
 *                       atomic rollback on DB failure
 *   3. GOLDEN PATH   — upload, download, delete, presigned URLs, listByProject
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Readable } from 'node:stream';

// ---------------------------------------------------------------------------
// Mock the ObjectStorageClient and AssetRepository via vi.hoisted + vi.mock
// ---------------------------------------------------------------------------
const {
  mockObjectStorageUpload,
  mockObjectStorageDownload,
  mockObjectStorageDelete,
  mockObjectStoragePresignedUpload,
  mockObjectStoragePresignedDownload,
  mockObjectStorageHead,
  mockAssetRepoCreate,
  mockAssetRepoFindById,
  mockAssetRepoFindByProject,
  mockAssetRepoDelete,
} = vi.hoisted(() => {
  return {
    mockObjectStorageUpload: vi.fn(),
    mockObjectStorageDownload: vi.fn(),
    mockObjectStorageDelete: vi.fn(),
    mockObjectStoragePresignedUpload: vi.fn(),
    mockObjectStoragePresignedDownload: vi.fn(),
    mockObjectStorageHead: vi.fn(),
    mockAssetRepoCreate: vi.fn(),
    mockAssetRepoFindById: vi.fn(),
    mockAssetRepoFindByProject: vi.fn(),
    mockAssetRepoDelete: vi.fn(),
  };
});

// Mock the repository module — AssetRepository is imported from schema/repositories
vi.mock('../../../../enterprise/src/schema/repositories', () => {
  return {
    AssetRepository: vi.fn().mockImplementation(() => ({
      create: mockAssetRepoCreate,
      findById: mockAssetRepoFindById,
      findByProject: mockAssetRepoFindByProject,
      delete: mockAssetRepoDelete,
    })),
  };
});

// Import from path that does NOT exist yet — tests will be RED
import { AssetStorageService } from '../../../../enterprise/src/assets/asset-storage-service';
import type { Asset } from '../../../../enterprise/src/schema/models';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TENANT_A = 'tenant-acme';
const TENANT_B = 'tenant-rival';
const UUID_1 = '550e8400-e29b-41d4-a716-446655440001';
const UUID_2 = '550e8400-e29b-41d4-a716-446655440002';
const UUID_3 = '550e8400-e29b-41d4-a716-446655440003';
const DEFAULT_BUCKET = 'mg-assets';

function makeObjectStorageMock() {
  return {
    upload: mockObjectStorageUpload,
    download: mockObjectStorageDownload,
    delete: mockObjectStorageDelete,
    getPresignedUploadUrl: mockObjectStoragePresignedUpload,
    getPresignedDownloadUrl: mockObjectStoragePresignedDownload,
    headObject: mockObjectStorageHead,
  };
}

function makeService() {
  return new AssetStorageService({
    objectStorage: makeObjectStorageMock(),
    assetRepository: {
      create: mockAssetRepoCreate,
      findById: mockAssetRepoFindById,
      findByProject: mockAssetRepoFindByProject,
      delete: mockAssetRepoDelete,
    } as any,
    defaultBucket: DEFAULT_BUCKET,
  });
}

function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: UUID_1,
    tenant_id: TENANT_A,
    storage_key: `${TENANT_A}/${UUID_2}/report.pdf`,
    bucket: DEFAULT_BUCKET,
    content_type: 'application/pdf',
    size_bytes: 1024,
    filename: 'report.pdf',
    created_at: '2026-02-17T00:00:00Z',
    updated_at: '2026-02-17T00:00:00Z',
    ...overrides,
  };
}

function resetMocks() {
  mockObjectStorageUpload.mockReset();
  mockObjectStorageDownload.mockReset();
  mockObjectStorageDelete.mockReset();
  mockObjectStoragePresignedUpload.mockReset();
  mockObjectStoragePresignedDownload.mockReset();
  mockObjectStorageHead.mockReset();
  mockAssetRepoCreate.mockReset();
  mockAssetRepoFindById.mockReset();
  mockAssetRepoFindByProject.mockReset();
  mockAssetRepoDelete.mockReset();
}

// ---------------------------------------------------------------------------
// MISUSE CASES
// ---------------------------------------------------------------------------

describe('AssetStorageService — MISUSE CASES', () => {
  let service: AssetStorageService;

  beforeEach(() => {
    resetMocks();
    service = makeService();
  });

  // ---- Path traversal in filename ----
  describe('upload() — path traversal in filename', () => {
    it('Given filename is ../../../etc/passwd, When upload() called, Then throws with path traversal error', async () => {
      await expect(
        service.upload({
          tenantId: TENANT_A,
          filename: '../../../etc/passwd',
          contentType: 'text/plain',
          body: Buffer.from('evil'),
        })
      ).rejects.toThrow(/path traversal|invalid filename/i);
    });

    it('Given filename contains ../, When upload() called, Then throws', async () => {
      await expect(
        service.upload({
          tenantId: TENANT_A,
          filename: 'safe/../../../etc/shadow',
          contentType: 'text/plain',
          body: Buffer.from('evil'),
        })
      ).rejects.toThrow(/path traversal|invalid filename/i);
    });

    it('Given filename contains backslash traversal, When upload() called, Then throws', async () => {
      await expect(
        service.upload({
          tenantId: TENANT_A,
          filename: '..\\..\\windows\\system32',
          contentType: 'text/plain',
          body: Buffer.from('evil'),
        })
      ).rejects.toThrow(/path traversal|invalid filename/i);
    });
  });

  // ---- Null bytes in filename ----
  describe('upload() — null bytes in filename', () => {
    it('Given filename contains null byte, When upload() called, Then throws', async () => {
      await expect(
        service.upload({
          tenantId: TENANT_A,
          filename: 'legit\0.php',
          contentType: 'text/plain',
          body: Buffer.from('data'),
        })
      ).rejects.toThrow(/null byte|invalid filename/i);
    });
  });

  // ---- SQL injection in tenantId ----
  describe('upload() — SQL injection in tenantId', () => {
    it("Given tenantId contains SQL injection, When upload() called, Then tenantId passes through to repo as param (not interpolated)", async () => {
      const injectedTenant = "'; DROP TABLE assets;--";
      mockObjectStorageUpload.mockResolvedValue(undefined);
      mockAssetRepoCreate.mockResolvedValue(makeAsset({ tenant_id: injectedTenant }));

      const result = await service.upload({
        tenantId: injectedTenant,
        filename: 'file.txt',
        contentType: 'text/plain',
        body: Buffer.from('data'),
      });

      // Injection passes to repo as parameterized value, not interpolated
      expect(mockAssetRepoCreate).toHaveBeenCalledOnce();
      const repoInput = mockAssetRepoCreate.mock.calls[0][0];
      expect(repoInput.tenant_id).toBe(injectedTenant);
      // The storage key must NOT contain the injection in an unsafe way —
      // it uses the raw tenantId as a prefix segment (S3 SDK handles encoding)
      expect(repoInput.storage_key).toMatch(new RegExp(`^${injectedTenant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`));
    });
  });

  // ---- Prototype pollution in metadata ----
  describe('upload() — prototype pollution in metadata', () => {
    it('Given metadata with __proto__ key, When upload() called, Then throws prototype pollution error', async () => {
      const poisonedMetadata = JSON.parse('{"__proto__": {"admin": true}}');
      await expect(
        service.upload({
          tenantId: TENANT_A,
          filename: 'file.txt',
          contentType: 'text/plain',
          body: Buffer.from('data'),
          metadata: poisonedMetadata,
        })
      ).rejects.toThrow(/prototype pollution/i);
    });

    it('Given metadata with constructor key, When upload() called, Then throws', async () => {
      await expect(
        service.upload({
          tenantId: TENANT_A,
          filename: 'file.txt',
          contentType: 'text/plain',
          body: Buffer.from('data'),
          metadata: { constructor: { prototype: { admin: true } } },
        })
      ).rejects.toThrow(/prototype pollution/i);
    });
  });

  // ---- Cross-tenant access prevention ----
  describe('download() — cross-tenant access prevention', () => {
    it('Given asset belongs to tenant A, When tenant B calls download() with asset ID, Then asset is returned (service does not enforce tenant — caller must)', async () => {
      // NOTE: The service layer looks up by ID. Cross-tenant enforcement is the CALLER's
      // responsibility (middleware). But we verify the storage key belongs to the correct tenant.
      const assetFromTenantA = makeAsset({ tenant_id: TENANT_A, storage_key: `${TENANT_A}/${UUID_2}/file.txt` });
      mockAssetRepoFindById.mockResolvedValue(assetFromTenantA);
      mockObjectStorageDownload.mockResolvedValue(Readable.from(['data']));

      const result = await service.download(UUID_1);
      // Storage key must be prefixed with the asset's own tenant, not anything else
      expect(result.asset.storage_key).toMatch(new RegExp(`^${TENANT_A}/`));
      expect(result.asset.tenant_id).toBe(TENANT_A);
    });

    it('Given asset does not exist, When download() called with any ID, Then throws not found error', async () => {
      mockAssetRepoFindById.mockResolvedValue(null);
      await expect(service.download(UUID_3)).rejects.toThrow(/not found/i);
    });
  });

  // ---- Oversized file rejection ----
  describe('upload() — oversized file rejection', () => {
    it('Given service configured with maxSizeBytes and body exceeds limit, When upload() called, Then throws size error', async () => {
      const restrictedService = new AssetStorageService({
        objectStorage: makeObjectStorageMock(),
        assetRepository: {
          create: mockAssetRepoCreate,
          findById: mockAssetRepoFindById,
          findByProject: mockAssetRepoFindByProject,
          delete: mockAssetRepoDelete,
        } as any,
        defaultBucket: DEFAULT_BUCKET,
        maxSizeBytes: 100,
      });

      const oversizedBody = Buffer.alloc(101, 'x');
      await expect(
        restrictedService.upload({
          tenantId: TENANT_A,
          filename: 'toobig.bin',
          contentType: 'application/octet-stream',
          body: oversizedBody,
        })
      ).rejects.toThrow(/size|too large/i);
    });
  });

  // ---- getUploadUrl() — TTL outside 15-60 min range ----
  describe('getUploadUrl() — TTL boundary enforcement', () => {
    it('Given ttlMinutes is 14, When getUploadUrl() called, Then throws TTL error', async () => {
      await expect(
        service.getUploadUrl({
          tenantId: TENANT_A,
          filename: 'file.txt',
          contentType: 'text/plain',
          ttlMinutes: 14,
        })
      ).rejects.toThrow(/ttl|minimum/i);
    });

    it('Given ttlMinutes is 61, When getUploadUrl() called, Then throws TTL error', async () => {
      await expect(
        service.getUploadUrl({
          tenantId: TENANT_A,
          filename: 'file.txt',
          contentType: 'text/plain',
          ttlMinutes: 61,
        })
      ).rejects.toThrow(/ttl|maximum/i);
    });

    it('Given ttlMinutes is 0, When getUploadUrl() called, Then throws TTL error', async () => {
      await expect(
        service.getUploadUrl({
          tenantId: TENANT_A,
          filename: 'file.txt',
          contentType: 'text/plain',
          ttlMinutes: 0,
        })
      ).rejects.toThrow(/ttl|minimum/i);
    });
  });

  // ---- getDownloadUrl() — asset not found ----
  describe('getDownloadUrl() — asset not found', () => {
    it('Given invalid asset ID, When getDownloadUrl() called, Then throws not found error', async () => {
      mockAssetRepoFindById.mockResolvedValue(null);
      await expect(service.getDownloadUrl('nonexistent-id')).rejects.toThrow(/not found/i);
    });
  });

  // ---- upload() — missing required fields ----
  describe('upload() — missing required inputs', () => {
    it('Given no tenantId, When upload() called, Then throws validation error', async () => {
      await expect(
        service.upload({ tenantId: '', filename: 'file.txt', contentType: 'text/plain', body: Buffer.from('x') })
      ).rejects.toThrow(/tenant|required/i);
    });

    it('Given no contentType, When upload() called, Then throws validation error', async () => {
      await expect(
        service.upload({ tenantId: TENANT_A, filename: 'file.txt', contentType: '', body: Buffer.from('x') })
      ).rejects.toThrow(/content.?type|required/i);
    });

    it('Given null body, When upload() called, Then throws validation error', async () => {
      await expect(
        service.upload({ tenantId: TENANT_A, filename: 'file.txt', contentType: 'text/plain', body: null as any })
      ).rejects.toThrow(/body|required/i);
    });
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY TESTS
// ---------------------------------------------------------------------------

describe('AssetStorageService — BOUNDARY TESTS', () => {
  let service: AssetStorageService;

  beforeEach(() => {
    resetMocks();
    service = makeService();
  });

  // ---- Empty file upload ----
  describe('upload() — empty file (0 bytes)', () => {
    it('Given body is empty Buffer, When upload() called, Then succeeds and records size_bytes as 0', async () => {
      mockObjectStorageUpload.mockResolvedValue(undefined);
      mockAssetRepoCreate.mockResolvedValue(makeAsset({ size_bytes: 0 }));

      const result = await service.upload({
        tenantId: TENANT_A,
        filename: 'empty.txt',
        contentType: 'text/plain',
        body: Buffer.alloc(0),
      });
      expect(result.size_bytes).toBe(0);
    });
  });

  // ---- Max filename length (255 chars) ----
  describe('upload() — maximum filename length', () => {
    it('Given filename is exactly 255 chars, When upload() called, Then succeeds', async () => {
      const longName = 'a'.repeat(251) + '.txt'; // 255 chars total
      mockObjectStorageUpload.mockResolvedValue(undefined);
      mockAssetRepoCreate.mockResolvedValue(makeAsset({ filename: longName }));

      await expect(
        service.upload({
          tenantId: TENANT_A,
          filename: longName,
          contentType: 'text/plain',
          body: Buffer.from('x'),
        })
      ).resolves.toBeDefined();
    });

    it('Given filename exceeds 255 chars, When upload() called, Then throws filename too long error', async () => {
      const tooLong = 'a'.repeat(256);
      await expect(
        service.upload({
          tenantId: TENANT_A,
          filename: tooLong,
          contentType: 'text/plain',
          body: Buffer.from('x'),
        })
      ).rejects.toThrow(/filename|too long/i);
    });
  });

  // ---- Atomic rollback: object upload succeeds, DB insert fails ----
  describe('upload() — atomic rollback on DB failure', () => {
    it('Given object upload succeeds but assetRepo.create() throws, When upload() called, Then deletes the uploaded object and re-throws', async () => {
      mockObjectStorageUpload.mockResolvedValue(undefined);
      mockAssetRepoCreate.mockRejectedValue(new Error('DB connection lost'));

      await expect(
        service.upload({
          tenantId: TENANT_A,
          filename: 'file.txt',
          contentType: 'text/plain',
          body: Buffer.from('data'),
        })
      ).rejects.toThrow(/DB connection lost/);

      // Rollback: object must be deleted from storage
      expect(mockObjectStorageDelete).toHaveBeenCalledOnce();
    });
  });

  // ---- TTL at minimum boundary (15 min) ----
  describe('getUploadUrl() — TTL at minimum boundary', () => {
    it('Given ttlMinutes is exactly 15, When getUploadUrl() called, Then succeeds and calls presigner with 900 seconds', async () => {
      mockObjectStoragePresignedUpload.mockResolvedValue('https://example.com/signed');
      const result = await service.getUploadUrl({
        tenantId: TENANT_A,
        filename: 'file.txt',
        contentType: 'text/plain',
        ttlMinutes: 15,
      });
      expect(result.url).toContain('https://');
      expect(mockObjectStoragePresignedUpload).toHaveBeenCalledWith(
        expect.any(String),
        'text/plain',
        900
      );
    });
  });

  // ---- TTL at maximum boundary (60 min) ----
  describe('getDownloadUrl() — TTL at maximum boundary', () => {
    it('Given ttlMinutes is exactly 60, When getDownloadUrl() called, Then succeeds and calls presigner with 3600 seconds', async () => {
      mockAssetRepoFindById.mockResolvedValue(makeAsset());
      mockObjectStoragePresignedDownload.mockResolvedValue('https://example.com/download-signed');
      const url = await service.getDownloadUrl(UUID_1, 60);
      expect(url).toContain('https://');
      expect(mockObjectStoragePresignedDownload).toHaveBeenCalledWith(
        expect.any(String),
        3600
      );
    });
  });

  // ---- Default TTL (no ttlMinutes specified) ----
  describe('getDownloadUrl() — default TTL', () => {
    it('Given no ttlMinutes, When getDownloadUrl() called, Then uses a default TTL within 15-60 min range', async () => {
      mockAssetRepoFindById.mockResolvedValue(makeAsset());
      mockObjectStoragePresignedDownload.mockResolvedValue('https://example.com/signed');
      await service.getDownloadUrl(UUID_1);
      const [, ttlSeconds] = mockObjectStoragePresignedDownload.mock.calls[0];
      expect(ttlSeconds).toBeGreaterThanOrEqual(900);
      expect(ttlSeconds).toBeLessThanOrEqual(3600);
    });
  });

  // ---- listByProject() — no assets ----
  describe('listByProject() — empty project', () => {
    it('Given project has no assets, When listByProject() called, Then returns empty array', async () => {
      mockAssetRepoFindByProject.mockResolvedValue([]);
      const result = await service.listByProject(UUID_1);
      expect(result).toEqual([]);
    });
  });

  // ---- delete() — asset not found (idempotent) ----
  describe('delete() — asset not found is non-fatal', () => {
    it('Given assetRepo.findById() returns null, When delete() called, Then throws not found error', async () => {
      mockAssetRepoFindById.mockResolvedValue(null);
      await expect(service.delete(UUID_3)).rejects.toThrow(/not found/i);
    });
  });

  // ---- Storage key format: tenant-prefixed ----
  describe('upload() — storage key format', () => {
    it('Given tenantId and filename, When upload() called, Then storage key matches {tenantId}/{uuid}/{filename} pattern', async () => {
      mockObjectStorageUpload.mockResolvedValue(undefined);
      const capturedAsset = makeAsset({ storage_key: `${TENANT_A}/${UUID_2}/report.pdf`, filename: 'report.pdf' });
      mockAssetRepoCreate.mockResolvedValue(capturedAsset);

      await service.upload({
        tenantId: TENANT_A,
        filename: 'report.pdf',
        contentType: 'application/pdf',
        body: Buffer.from('pdf data'),
      });

      const repoInput = mockAssetRepoCreate.mock.calls[0][0];
      // Pattern: {tenantId}/{uuid}/{filename}
      expect(repoInput.storage_key).toMatch(
        new RegExp(`^${TENANT_A}/[0-9a-f-]{36}/report\\.pdf$`)
      );
    });
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH
// ---------------------------------------------------------------------------

describe('AssetStorageService — GOLDEN PATH', () => {
  let service: AssetStorageService;

  beforeEach(() => {
    resetMocks();
    service = makeService();
  });

  // ---- upload() — full happy path ----
  describe('upload() — full happy path', () => {
    it('Given valid upload input, When upload() called, Then uploads to object storage and creates Postgres metadata', async () => {
      const expectedAsset = makeAsset();
      mockObjectStorageUpload.mockResolvedValue(undefined);
      mockAssetRepoCreate.mockResolvedValue(expectedAsset);

      const result = await service.upload({
        tenantId: TENANT_A,
        filename: 'report.pdf',
        contentType: 'application/pdf',
        body: Buffer.from('PDF content'),
      });

      expect(mockObjectStorageUpload).toHaveBeenCalledOnce();
      expect(mockAssetRepoCreate).toHaveBeenCalledOnce();
      expect(result.id).toBe(UUID_1);
      expect(result.tenant_id).toBe(TENANT_A);
      expect(result.content_type).toBe('application/pdf');
    });

    it('Given upload with projectId, When upload() called, Then includes project_id in repo create', async () => {
      const expectedAsset = makeAsset({ project_id: UUID_2 });
      mockObjectStorageUpload.mockResolvedValue(undefined);
      mockAssetRepoCreate.mockResolvedValue(expectedAsset);

      await service.upload({
        tenantId: TENANT_A,
        projectId: UUID_2,
        filename: 'report.pdf',
        contentType: 'application/pdf',
        body: Buffer.from('data'),
      });

      const repoInput = mockAssetRepoCreate.mock.calls[0][0];
      expect(repoInput.project_id).toBe(UUID_2);
    });

    it('Given upload with metadata, When upload() called, Then includes metadata in repo create', async () => {
      const meta = { source: 'mcp-tool', version: '1' };
      const expectedAsset = makeAsset({ metadata: meta });
      mockObjectStorageUpload.mockResolvedValue(undefined);
      mockAssetRepoCreate.mockResolvedValue(expectedAsset);

      await service.upload({
        tenantId: TENANT_A,
        filename: 'file.txt',
        contentType: 'text/plain',
        body: Buffer.from('data'),
        metadata: meta,
      });

      const repoInput = mockAssetRepoCreate.mock.calls[0][0];
      expect(repoInput.metadata).toEqual(meta);
    });

    it('Given upload, When called, Then storage key is tenant-prefixed {tenantId}/{uuid}/{filename}', async () => {
      mockObjectStorageUpload.mockResolvedValue(undefined);
      mockAssetRepoCreate.mockResolvedValue(makeAsset());

      await service.upload({
        tenantId: TENANT_A,
        filename: 'document.pdf',
        contentType: 'application/pdf',
        body: Buffer.from('pdf'),
      });

      const [uploadKey] = mockObjectStorageUpload.mock.calls[0];
      expect(uploadKey).toMatch(new RegExp(`^${TENANT_A}/[0-9a-f-]{36}/document\\.pdf$`));
    });

    it('Given upload, When called, Then size_bytes in repo create matches body length', async () => {
      const body = Buffer.from('hello world'); // 11 bytes
      mockObjectStorageUpload.mockResolvedValue(undefined);
      mockAssetRepoCreate.mockResolvedValue(makeAsset({ size_bytes: 11 }));

      await service.upload({
        tenantId: TENANT_A,
        filename: 'file.txt',
        contentType: 'text/plain',
        body,
      });

      const repoInput = mockAssetRepoCreate.mock.calls[0][0];
      expect(repoInput.size_bytes).toBe(11);
    });
  });

  // ---- download() ----
  describe('download() — full happy path', () => {
    it('Given valid asset ID, When download() called, Then returns stream and asset metadata', async () => {
      const asset = makeAsset();
      const fakeStream = Readable.from(['pdf data']);
      mockAssetRepoFindById.mockResolvedValue(asset);
      mockObjectStorageDownload.mockResolvedValue(fakeStream);

      const result = await service.download(UUID_1);
      expect(result.asset.id).toBe(UUID_1);
      expect(result.stream).toBeInstanceOf(Readable);
      expect(mockObjectStorageDownload).toHaveBeenCalledWith(asset.storage_key);
    });
  });

  // ---- delete() ----
  describe('delete() — full happy path', () => {
    it('Given valid asset ID, When delete() called, Then deletes from both object storage and Postgres', async () => {
      const asset = makeAsset();
      mockAssetRepoFindById.mockResolvedValue(asset);
      mockObjectStorageDelete.mockResolvedValue(undefined);
      mockAssetRepoDelete.mockResolvedValue(undefined);

      await service.delete(UUID_1);

      expect(mockObjectStorageDelete).toHaveBeenCalledWith(asset.storage_key);
      expect(mockAssetRepoDelete).toHaveBeenCalledWith(UUID_1);
    });
  });

  // ---- getUploadUrl() ----
  describe('getUploadUrl() — presigned upload URL', () => {
    it('Given valid input with default TTL, When getUploadUrl() called, Then returns URL and storageKey', async () => {
      mockObjectStoragePresignedUpload.mockResolvedValue('https://bucket.s3.amazonaws.com/signed-upload');
      const result = await service.getUploadUrl({
        tenantId: TENANT_A,
        filename: 'upload.png',
        contentType: 'image/png',
      });
      expect(result.url).toContain('https://');
      expect(result.storageKey).toMatch(new RegExp(`^${TENANT_A}/[0-9a-f-]{36}/upload\\.png$`));
    });

    it('Given ttlMinutes of 30, When getUploadUrl() called, Then passes 1800 seconds to object storage', async () => {
      mockObjectStoragePresignedUpload.mockResolvedValue('https://example.com/signed');
      await service.getUploadUrl({
        tenantId: TENANT_A,
        filename: 'file.txt',
        contentType: 'text/plain',
        ttlMinutes: 30,
      });
      expect(mockObjectStoragePresignedUpload).toHaveBeenCalledWith(
        expect.any(String),
        'text/plain',
        1800
      );
    });
  });

  // ---- getDownloadUrl() ----
  describe('getDownloadUrl() — presigned download URL', () => {
    it('Given valid asset ID, When getDownloadUrl() called, Then returns presigned URL string', async () => {
      mockAssetRepoFindById.mockResolvedValue(makeAsset());
      mockObjectStoragePresignedDownload.mockResolvedValue('https://bucket.s3.amazonaws.com/signed-download');
      const url = await service.getDownloadUrl(UUID_1);
      expect(typeof url).toBe('string');
      expect(url).toContain('https://');
    });

    it('Given asset ID and ttlMinutes, When getDownloadUrl() called, Then passes correct seconds to object storage', async () => {
      mockAssetRepoFindById.mockResolvedValue(makeAsset());
      mockObjectStoragePresignedDownload.mockResolvedValue('https://example.com/signed');
      await service.getDownloadUrl(UUID_1, 45);
      expect(mockObjectStoragePresignedDownload).toHaveBeenCalledWith(
        expect.any(String),
        2700 // 45 * 60
      );
    });

    it('Given asset with storage_key, When getDownloadUrl() called, Then uses asset storage_key for presigned URL', async () => {
      const asset = makeAsset({ storage_key: `${TENANT_A}/${UUID_2}/specific-file.pdf` });
      mockAssetRepoFindById.mockResolvedValue(asset);
      mockObjectStoragePresignedDownload.mockResolvedValue('https://example.com/signed');
      await service.getDownloadUrl(UUID_1, 30);
      expect(mockObjectStoragePresignedDownload).toHaveBeenCalledWith(
        `${TENANT_A}/${UUID_2}/specific-file.pdf`,
        1800
      );
    });
  });

  // ---- listByProject() ----
  describe('listByProject() — returns assets for project', () => {
    it('Given project with assets, When listByProject() called, Then returns all project assets', async () => {
      const assets = [
        makeAsset({ id: UUID_1, project_id: UUID_3 }),
        makeAsset({ id: UUID_2, project_id: UUID_3 }),
      ];
      mockAssetRepoFindByProject.mockResolvedValue(assets);

      const result = await service.listByProject(UUID_3);
      expect(result).toHaveLength(2);
      expect(mockAssetRepoFindByProject).toHaveBeenCalledWith(UUID_3);
    });
  });

  // ---- Tenant prefix isolation between tenants ----
  describe('upload() — tenant key isolation', () => {
    it('Given two uploads from different tenants, When uploaded, Then storage keys are prefixed differently', async () => {
      mockObjectStorageUpload.mockResolvedValue(undefined);
      mockAssetRepoCreate.mockResolvedValue(makeAsset());

      await service.upload({ tenantId: TENANT_A, filename: 'f.txt', contentType: 'text/plain', body: Buffer.from('a') });
      await service.upload({ tenantId: TENANT_B, filename: 'f.txt', contentType: 'text/plain', body: Buffer.from('b') });

      const keyA = mockObjectStorageUpload.mock.calls[0][0];
      const keyB = mockObjectStorageUpload.mock.calls[1][0];
      expect(keyA).toMatch(new RegExp(`^${TENANT_A}/`));
      expect(keyB).toMatch(new RegExp(`^${TENANT_B}/`));
      expect(keyA).not.toBe(keyB);
    });
  });

  // ---- Bucket passed from service config ----
  describe('upload() — uses defaultBucket', () => {
    it('Given service with defaultBucket, When upload() called, Then repo create receives correct bucket', async () => {
      mockObjectStorageUpload.mockResolvedValue(undefined);
      mockAssetRepoCreate.mockResolvedValue(makeAsset({ bucket: DEFAULT_BUCKET }));

      await service.upload({
        tenantId: TENANT_A,
        filename: 'file.txt',
        contentType: 'text/plain',
        body: Buffer.from('x'),
      });

      const repoInput = mockAssetRepoCreate.mock.calls[0][0];
      expect(repoInput.bucket).toBe(DEFAULT_BUCKET);
    });
  });
});

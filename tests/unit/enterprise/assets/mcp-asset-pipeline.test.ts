/**
 * MCP Asset Pipeline Unit Tests — WS-ENT-5
 *
 * Tests for the processMcpToolOutput function that receives MCP tool output
 * and pipes it through AssetStorageService.upload().
 *
 * AC-ENT-5.4: MCP tool output → asset storage pipeline
 * AC-ENT-5.5: 99%+ test coverage
 *
 * Test order (misuse-first CAD protocol):
 *   1. MISUSE CASES  — null output, injection in toolName, malicious contentType,
 *                      missing tenantId, oversized string output
 *   2. BOUNDARY TESTS — empty string output, binary vs string detection, auto
 *                       content-type detection, timestamp filename generation
 *   3. GOLDEN PATH   — Buffer output, string output, explicit contentType, with projectId
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock AssetStorageService so we don't need a real S3 or Postgres
// ---------------------------------------------------------------------------
const { mockUpload } = vi.hoisted(() => {
  return {
    mockUpload: vi.fn(),
  };
});

vi.mock('../../../../enterprise/src/assets/asset-storage-service', () => {
  return {
    AssetStorageService: vi.fn().mockImplementation(() => ({
      upload: mockUpload,
    })),
    S3ObjectStorageClient: vi.fn(),
  };
});

// Import from path that does NOT exist yet — tests will be RED
import { processMcpToolOutput } from '../../../../enterprise/src/assets/mcp-asset-pipeline';
import type { Asset } from '../../../../enterprise/src/schema/models';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TENANT_A = 'tenant-acme';
const UUID_1 = '550e8400-e29b-41d4-a716-446655440001';
const UUID_2 = '550e8400-e29b-41d4-a716-446655440002';

function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: UUID_1,
    tenant_id: TENANT_A,
    storage_key: `${TENANT_A}/${UUID_2}/tool-output.txt`,
    bucket: 'mg-assets',
    content_type: 'text/plain',
    size_bytes: 5,
    filename: 'tool-output.txt',
    created_at: '2026-02-17T00:00:00Z',
    updated_at: '2026-02-17T00:00:00Z',
    ...overrides,
  };
}

function makeStorageService() {
  return { upload: mockUpload } as any;
}

// ---------------------------------------------------------------------------
// MISUSE CASES
// ---------------------------------------------------------------------------

describe('processMcpToolOutput — MISUSE CASES', () => {
  beforeEach(() => {
    mockUpload.mockReset();
  });

  // ---- Null/undefined output ----
  describe('null or undefined output', () => {
    it('Given output is null, When processMcpToolOutput() called, Then throws validation error', async () => {
      await expect(
        processMcpToolOutput({
          tenantId: TENANT_A,
          toolName: 'my-tool',
          output: null as any,
          storageService: makeStorageService(),
        })
      ).rejects.toThrow(/output|required/i);
    });

    it('Given output is undefined, When processMcpToolOutput() called, Then throws validation error', async () => {
      await expect(
        processMcpToolOutput({
          tenantId: TENANT_A,
          toolName: 'my-tool',
          output: undefined as any,
          storageService: makeStorageService(),
        })
      ).rejects.toThrow(/output|required/i);
    });
  });

  // ---- Missing tenantId ----
  describe('missing tenantId', () => {
    it('Given tenantId is empty string, When processMcpToolOutput() called, Then throws validation error', async () => {
      await expect(
        processMcpToolOutput({
          tenantId: '',
          toolName: 'my-tool',
          output: Buffer.from('data'),
          storageService: makeStorageService(),
        })
      ).rejects.toThrow(/tenant|required/i);
    });

    it('Given tenantId is null, When processMcpToolOutput() called, Then throws validation error', async () => {
      await expect(
        processMcpToolOutput({
          tenantId: null as any,
          toolName: 'my-tool',
          output: Buffer.from('data'),
          storageService: makeStorageService(),
        })
      ).rejects.toThrow(/tenant|required/i);
    });
  });

  // ---- Injection in toolName ----
  describe('path traversal / injection in toolName', () => {
    it('Given toolName contains path traversal, When processMcpToolOutput() called, Then generated filename is sanitized', async () => {
      mockUpload.mockResolvedValue(makeAsset());
      await processMcpToolOutput({
        tenantId: TENANT_A,
        toolName: '../../../etc/passwd',
        output: Buffer.from('data'),
        storageService: makeStorageService(),
      });
      // The generated filename must not contain the traversal — toolName is sanitized
      const uploadInput = mockUpload.mock.calls[0][0];
      expect(uploadInput.filename).not.toContain('../');
      expect(uploadInput.filename).not.toContain('etc/passwd');
    });

    it('Given toolName contains null bytes, When processMcpToolOutput() called, Then generated filename is sanitized', async () => {
      mockUpload.mockResolvedValue(makeAsset());
      await processMcpToolOutput({
        tenantId: TENANT_A,
        toolName: 'tool\0name',
        output: Buffer.from('data'),
        storageService: makeStorageService(),
      });
      const uploadInput = mockUpload.mock.calls[0][0];
      expect(uploadInput.filename).not.toContain('\0');
    });

    it('Given toolName contains shell injection characters, When called, Then filename is sanitized', async () => {
      mockUpload.mockResolvedValue(makeAsset());
      await processMcpToolOutput({
        tenantId: TENANT_A,
        toolName: 'tool; rm -rf /',
        output: Buffer.from('data'),
        storageService: makeStorageService(),
      });
      const uploadInput = mockUpload.mock.calls[0][0];
      // Must not contain the raw injection string in filename
      expect(uploadInput.filename).not.toContain('; rm -rf /');
    });
  });

  // ---- Malicious content-type spoofing ----
  describe('contentType spoofing', () => {
    it('Given contentType contains CRLF injection, When processMcpToolOutput() called, Then contentType is sanitized or rejected', async () => {
      await expect(
        processMcpToolOutput({
          tenantId: TENANT_A,
          toolName: 'my-tool',
          output: Buffer.from('data'),
          contentType: 'text/plain\r\nX-Evil-Header: injected',
          storageService: makeStorageService(),
        })
      ).rejects.toThrow(/content.?type|invalid/i);
    });

    it('Given contentType is not a valid MIME type format, When called, Then throws validation error', async () => {
      await expect(
        processMcpToolOutput({
          tenantId: TENANT_A,
          toolName: 'my-tool',
          output: Buffer.from('data'),
          contentType: 'not-a-mime-type',
          storageService: makeStorageService(),
        })
      ).rejects.toThrow(/content.?type|invalid/i);
    });
  });

  // ---- Empty toolName ----
  describe('empty toolName', () => {
    it('Given toolName is empty string, When processMcpToolOutput() called, Then throws validation error', async () => {
      await expect(
        processMcpToolOutput({
          tenantId: TENANT_A,
          toolName: '',
          output: Buffer.from('data'),
          storageService: makeStorageService(),
        })
      ).rejects.toThrow(/toolName|tool.name|required/i);
    });
  });

  // ---- Upload failure propagates ----
  describe('upload failure propagation', () => {
    it('Given storageService.upload() throws, When processMcpToolOutput() called, Then error propagates', async () => {
      mockUpload.mockRejectedValue(new Error('S3 unreachable'));
      await expect(
        processMcpToolOutput({
          tenantId: TENANT_A,
          toolName: 'my-tool',
          output: Buffer.from('data'),
          storageService: makeStorageService(),
        })
      ).rejects.toThrow(/S3 unreachable/);
    });
  });
});

// ---------------------------------------------------------------------------
// BOUNDARY TESTS
// ---------------------------------------------------------------------------

describe('processMcpToolOutput — BOUNDARY TESTS', () => {
  beforeEach(() => {
    mockUpload.mockReset();
  });

  // ---- Empty string output ----
  describe('empty string output', () => {
    it('Given output is empty string, When processMcpToolOutput() called, Then uploads 0-byte asset', async () => {
      mockUpload.mockResolvedValue(makeAsset({ size_bytes: 0 }));
      const result = await processMcpToolOutput({
        tenantId: TENANT_A,
        toolName: 'empty-tool',
        output: '',
        storageService: makeStorageService(),
      });
      expect(mockUpload).toHaveBeenCalledOnce();
      const uploadInput = mockUpload.mock.calls[0][0];
      // Empty string becomes 0-byte Buffer
      expect(uploadInput.body.length).toBe(0);
    });
  });

  // ---- Auto content-type detection ----
  describe('auto content-type detection', () => {
    it('Given no contentType provided and output is string, When called, Then defaults to text/plain', async () => {
      mockUpload.mockResolvedValue(makeAsset({ content_type: 'text/plain' }));
      await processMcpToolOutput({
        tenantId: TENANT_A,
        toolName: 'text-tool',
        output: 'some text output',
        storageService: makeStorageService(),
      });
      const uploadInput = mockUpload.mock.calls[0][0];
      expect(uploadInput.contentType).toBe('text/plain');
    });

    it('Given no contentType provided and output is Buffer, When called, Then defaults to application/octet-stream', async () => {
      mockUpload.mockResolvedValue(makeAsset({ content_type: 'application/octet-stream' }));
      await processMcpToolOutput({
        tenantId: TENANT_A,
        toolName: 'binary-tool',
        output: Buffer.from([0x89, 0x50, 0x4e, 0x47]), // PNG magic bytes
        storageService: makeStorageService(),
      });
      const uploadInput = mockUpload.mock.calls[0][0];
      // Either detected as image/png or falls back to application/octet-stream
      expect(['application/octet-stream', 'image/png']).toContain(uploadInput.contentType);
    });

    it('Given contentType explicitly provided, When called, Then uses explicit contentType', async () => {
      mockUpload.mockResolvedValue(makeAsset({ content_type: 'application/json' }));
      await processMcpToolOutput({
        tenantId: TENANT_A,
        toolName: 'json-tool',
        output: '{"key": "value"}',
        contentType: 'application/json',
        storageService: makeStorageService(),
      });
      const uploadInput = mockUpload.mock.calls[0][0];
      expect(uploadInput.contentType).toBe('application/json');
    });
  });

  // ---- Filename generation from toolName + timestamp ----
  describe('filename generation', () => {
    it('Given toolName is "my-tool", When called, Then filename matches pattern my-tool-{timestamp}.{ext}', async () => {
      mockUpload.mockResolvedValue(makeAsset());
      await processMcpToolOutput({
        tenantId: TENANT_A,
        toolName: 'my-tool',
        output: 'output data',
        storageService: makeStorageService(),
      });
      const uploadInput = mockUpload.mock.calls[0][0];
      // Filename must start with sanitized toolName and include timestamp
      expect(uploadInput.filename).toMatch(/^my-tool/);
      expect(uploadInput.filename).toMatch(/\d{10,}/); // unix timestamp or millis
    });

    it('Given consecutive calls with same toolName, When called, Then filenames differ (timestamp ensures uniqueness)', async () => {
      mockUpload.mockResolvedValue(makeAsset());

      await processMcpToolOutput({
        tenantId: TENANT_A,
        toolName: 'analysis-tool',
        output: 'output 1',
        storageService: makeStorageService(),
      });

      // Inject small delay to ensure distinct timestamps
      await new Promise((resolve) => setTimeout(resolve, 2));

      await processMcpToolOutput({
        tenantId: TENANT_A,
        toolName: 'analysis-tool',
        output: 'output 2',
        storageService: makeStorageService(),
      });

      const filename1 = mockUpload.mock.calls[0][0].filename;
      const filename2 = mockUpload.mock.calls[1][0].filename;
      expect(filename1).not.toBe(filename2);
    });
  });

  // ---- String output converted to Buffer ----
  describe('string → Buffer conversion', () => {
    it('Given string output, When processMcpToolOutput() called, Then upload receives Buffer (not raw string)', async () => {
      mockUpload.mockResolvedValue(makeAsset());
      await processMcpToolOutput({
        tenantId: TENANT_A,
        toolName: 'text-tool',
        output: 'hello world',
        storageService: makeStorageService(),
      });
      const uploadInput = mockUpload.mock.calls[0][0];
      expect(Buffer.isBuffer(uploadInput.body)).toBe(true);
      expect(uploadInput.body.toString('utf8')).toBe('hello world');
    });
  });

  // ---- projectId is optional ----
  describe('projectId optional', () => {
    it('Given no projectId, When processMcpToolOutput() called, Then upload called without projectId (or undefined)', async () => {
      mockUpload.mockResolvedValue(makeAsset());
      await processMcpToolOutput({
        tenantId: TENANT_A,
        toolName: 'my-tool',
        output: 'data',
        storageService: makeStorageService(),
      });
      const uploadInput = mockUpload.mock.calls[0][0];
      expect(uploadInput.projectId == null).toBe(true);
    });

    it('Given projectId provided, When processMcpToolOutput() called, Then upload called with projectId', async () => {
      mockUpload.mockResolvedValue(makeAsset({ project_id: UUID_2 }));
      await processMcpToolOutput({
        tenantId: TENANT_A,
        projectId: UUID_2,
        toolName: 'my-tool',
        output: 'data',
        storageService: makeStorageService(),
      });
      const uploadInput = mockUpload.mock.calls[0][0];
      expect(uploadInput.projectId).toBe(UUID_2);
    });
  });
});

// ---------------------------------------------------------------------------
// GOLDEN PATH
// ---------------------------------------------------------------------------

describe('processMcpToolOutput — GOLDEN PATH', () => {
  beforeEach(() => {
    mockUpload.mockReset();
  });

  // ---- Buffer output ----
  describe('Buffer output — standard upload', () => {
    it('Given Buffer output, When processMcpToolOutput() called, Then returns Asset from storageService.upload()', async () => {
      const expectedAsset = makeAsset({ content_type: 'application/octet-stream' });
      mockUpload.mockResolvedValue(expectedAsset);

      const result = await processMcpToolOutput({
        tenantId: TENANT_A,
        toolName: 'binary-generator',
        output: Buffer.from([0x01, 0x02, 0x03]),
        storageService: makeStorageService(),
      });

      expect(result.id).toBe(UUID_1);
      expect(result.tenant_id).toBe(TENANT_A);
      expect(mockUpload).toHaveBeenCalledOnce();
    });

    it('Given Buffer output with explicit contentType, When called, Then upload uses explicit contentType', async () => {
      mockUpload.mockResolvedValue(makeAsset({ content_type: 'image/png' }));

      await processMcpToolOutput({
        tenantId: TENANT_A,
        toolName: 'image-generator',
        output: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
        contentType: 'image/png',
        storageService: makeStorageService(),
      });

      const uploadInput = mockUpload.mock.calls[0][0];
      expect(uploadInput.contentType).toBe('image/png');
      expect(uploadInput.tenantId).toBe(TENANT_A);
    });
  });

  // ---- String output ----
  describe('string output — text/plain', () => {
    it('Given string output without contentType, When processMcpToolOutput() called, Then returns Asset', async () => {
      const expectedAsset = makeAsset({ content_type: 'text/plain' });
      mockUpload.mockResolvedValue(expectedAsset);

      const result = await processMcpToolOutput({
        tenantId: TENANT_A,
        toolName: 'text-analyzer',
        output: 'Analysis complete: 42 issues found.',
        storageService: makeStorageService(),
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(UUID_1);
    });

    it('Given JSON string output with json contentType, When called, Then upload receives Buffer of JSON', async () => {
      mockUpload.mockResolvedValue(makeAsset({ content_type: 'application/json' }));
      const jsonOutput = JSON.stringify({ status: 'ok', count: 5 });

      await processMcpToolOutput({
        tenantId: TENANT_A,
        toolName: 'json-reporter',
        output: jsonOutput,
        contentType: 'application/json',
        storageService: makeStorageService(),
      });

      const uploadInput = mockUpload.mock.calls[0][0];
      expect(uploadInput.contentType).toBe('application/json');
      expect(JSON.parse(uploadInput.body.toString('utf8'))).toEqual({ status: 'ok', count: 5 });
    });
  });

  // ---- With projectId ----
  describe('full pipeline with projectId', () => {
    it('Given all inputs including projectId, When processMcpToolOutput() called, Then upload includes projectId and returns Asset', async () => {
      const expectedAsset = makeAsset({ project_id: UUID_2 });
      mockUpload.mockResolvedValue(expectedAsset);

      const result = await processMcpToolOutput({
        tenantId: TENANT_A,
        projectId: UUID_2,
        toolName: 'code-scanner',
        output: Buffer.from('scan results'),
        contentType: 'text/plain',
        storageService: makeStorageService(),
      });

      expect(result.project_id).toBe(UUID_2);
      const uploadInput = mockUpload.mock.calls[0][0];
      expect(uploadInput.tenantId).toBe(TENANT_A);
      expect(uploadInput.projectId).toBe(UUID_2);
    });
  });

  // ---- Metadata includes toolName ----
  describe('metadata includes pipeline context', () => {
    it('Given toolName, When processMcpToolOutput() called, Then upload metadata includes tool_name', async () => {
      mockUpload.mockResolvedValue(makeAsset());

      await processMcpToolOutput({
        tenantId: TENANT_A,
        toolName: 'dependency-scanner',
        output: 'scan output',
        storageService: makeStorageService(),
      });

      const uploadInput = mockUpload.mock.calls[0][0];
      expect(uploadInput.metadata).toBeDefined();
      expect(uploadInput.metadata.tool_name).toBe('dependency-scanner');
    });
  });

  // ---- Return value is the Asset from storageService.upload() ----
  describe('return value', () => {
    it('Given successful upload, When processMcpToolOutput() called, Then returns exact Asset returned by storageService.upload()', async () => {
      const expectedAsset = makeAsset({ id: UUID_2, filename: 'custom-output.txt' });
      mockUpload.mockResolvedValue(expectedAsset);

      const result = await processMcpToolOutput({
        tenantId: TENANT_A,
        toolName: 'my-tool',
        output: 'data',
        storageService: makeStorageService(),
      });

      expect(result).toBe(expectedAsset);
    });
  });
});

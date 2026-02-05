/**
 * WS-19: Metadata Tracking System - Queries Module Tests
 *
 * BDD Scenarios:
 * - AC-6: Query metadata by workstream_id
 * - Filter by status (pending, approved, rejected)
 * - Query by component name
 * - Get latest version of component
 * - Get all versions of component
 * - Complex filtering (workstream + status)
 * - Sorting and ordering results
 *
 * Target: 99% coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';

// Mock fs module at the top level
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

import {
  getMetadataByWorkstream,
  getMetadataByStatus,
  getMetadataByComponent,
  getLatestVersion,
  getAllVersions,
  filterMetadata,
  sortMetadata,
} from '@/visuals/metadata/queries';

describe('visuals/metadata/queries - getMetadataByWorkstream() (AC-6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given metadata for multiple workstreams', () => {
    it('When querying by workstream_id, Then returns all entries for that workstream', async () => {
      const existingMetadata = [
        {
          id: 'entry-1',
          workstream_id: 'WS-19',
          component: 'dashboard-card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T00:00:00Z',
          updated_at: '2026-02-04T00:00:00Z',
        },
        {
          id: 'entry-2',
          workstream_id: 'WS-19',
          component: 'banner',
          version: 1,
          spec_hash: 'def456',
          file_path: '.claude/visuals/WS-19/banner-v1.png',
          file_size: 8000,
          dimensions: { width: 1920, height: 400 },
          status: 'approved' as const,
          created_at: '2026-02-04T01:00:00Z',
          updated_at: '2026-02-04T01:00:00Z',
        },
        {
          id: 'entry-3',
          workstream_id: 'WS-20',
          component: 'modal',
          version: 1,
          spec_hash: 'ghi789',
          file_path: '.claude/visuals/WS-20/modal-v1.png',
          file_size: 15000,
          dimensions: { width: 600, height: 400 },
          status: 'pending' as const,
          created_at: '2026-02-04T02:00:00Z',
          updated_at: '2026-02-04T02:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMetadata));

      const result = await getMetadataByWorkstream('WS-19');

      expect(result).toHaveLength(2);
      expect(result.every((entry) => entry.workstream_id === 'WS-19')).toBe(true);
    });

    it('When querying workstream with no entries, Then returns empty array', async () => {
      const existingMetadata = [
        {
          id: 'entry-1',
          workstream_id: 'WS-19',
          component: 'dashboard-card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T00:00:00Z',
          updated_at: '2026-02-04T00:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMetadata));

      const result = await getMetadataByWorkstream('WS-99');

      expect(result).toEqual([]);
    });

    it('When querying workstream, Then returns entries in creation order', async () => {
      const existingMetadata = [
        {
          id: 'entry-3',
          workstream_id: 'WS-19',
          component: 'card-v3',
          version: 1,
          spec_hash: 'ghi789',
          file_path: '.claude/visuals/WS-19/card-v3-v1.png',
          file_size: 10000,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T02:00:00Z',
          updated_at: '2026-02-04T02:00:00Z',
        },
        {
          id: 'entry-1',
          workstream_id: 'WS-19',
          component: 'card-v1',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-19/card-v1-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T00:00:00Z',
          updated_at: '2026-02-04T00:00:00Z',
        },
        {
          id: 'entry-2',
          workstream_id: 'WS-19',
          component: 'card-v2',
          version: 1,
          spec_hash: 'def456',
          file_path: '.claude/visuals/WS-19/card-v2-v1.png',
          file_size: 8000,
          dimensions: { width: 800, height: 600 },
          status: 'approved' as const,
          created_at: '2026-02-04T01:00:00Z',
          updated_at: '2026-02-04T01:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMetadata));

      const result = await getMetadataByWorkstream('WS-19');

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('entry-1');
      expect(result[1].id).toBe('entry-2');
      expect(result[2].id).toBe('entry-3');
    });
  });

  describe('Given no metadata file', () => {
    it('When metadata file missing, Then returns empty array', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await getMetadataByWorkstream('WS-19');

      expect(result).toEqual([]);
    });
  });
});

describe('visuals/metadata/queries - getMetadataByStatus()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given metadata with different statuses', () => {
    it('When filtering by pending status, Then returns only pending entries', async () => {
      const existingMetadata = [
        {
          id: 'entry-1',
          workstream_id: 'WS-19',
          component: 'dashboard-card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T00:00:00Z',
          updated_at: '2026-02-04T00:00:00Z',
        },
        {
          id: 'entry-2',
          workstream_id: 'WS-19',
          component: 'banner',
          version: 1,
          spec_hash: 'def456',
          file_path: '.claude/visuals/WS-19/banner-v1.png',
          file_size: 8000,
          dimensions: { width: 1920, height: 400 },
          status: 'approved' as const,
          created_at: '2026-02-04T01:00:00Z',
          updated_at: '2026-02-04T01:00:00Z',
        },
        {
          id: 'entry-3',
          workstream_id: 'WS-19',
          component: 'modal',
          version: 1,
          spec_hash: 'ghi789',
          file_path: '.claude/visuals/WS-19/modal-v1.png',
          file_size: 15000,
          dimensions: { width: 600, height: 400 },
          status: 'rejected' as const,
          created_at: '2026-02-04T02:00:00Z',
          updated_at: '2026-02-04T02:00:00Z',
        },
        {
          id: 'entry-4',
          workstream_id: 'WS-19',
          component: 'button',
          version: 1,
          spec_hash: 'jkl012',
          file_path: '.claude/visuals/WS-19/button-v1.png',
          file_size: 5000,
          dimensions: { width: 200, height: 50 },
          status: 'pending' as const,
          created_at: '2026-02-04T03:00:00Z',
          updated_at: '2026-02-04T03:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMetadata));

      const result = await getMetadataByStatus('pending');

      expect(result).toHaveLength(2);
      expect(result.every((entry) => entry.status === 'pending')).toBe(true);
    });

    it('When filtering by approved status, Then returns only approved entries', async () => {
      const existingMetadata = [
        {
          id: 'entry-1',
          workstream_id: 'WS-19',
          component: 'dashboard-card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T00:00:00Z',
          updated_at: '2026-02-04T00:00:00Z',
        },
        {
          id: 'entry-2',
          workstream_id: 'WS-19',
          component: 'banner',
          version: 1,
          spec_hash: 'def456',
          file_path: '.claude/visuals/WS-19/banner-v1.png',
          file_size: 8000,
          dimensions: { width: 1920, height: 400 },
          status: 'approved' as const,
          created_at: '2026-02-04T01:00:00Z',
          updated_at: '2026-02-04T01:00:00Z',
        },
        {
          id: 'entry-3',
          workstream_id: 'WS-19',
          component: 'modal',
          version: 1,
          spec_hash: 'ghi789',
          file_path: '.claude/visuals/WS-19/modal-v1.png',
          file_size: 15000,
          dimensions: { width: 600, height: 400 },
          status: 'approved' as const,
          created_at: '2026-02-04T02:00:00Z',
          updated_at: '2026-02-04T02:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMetadata));

      const result = await getMetadataByStatus('approved');

      expect(result).toHaveLength(2);
      expect(result.every((entry) => entry.status === 'approved')).toBe(true);
    });

    it('When filtering by rejected status, Then returns only rejected entries', async () => {
      const existingMetadata = [
        {
          id: 'entry-1',
          workstream_id: 'WS-19',
          component: 'dashboard-card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T00:00:00Z',
          updated_at: '2026-02-04T00:00:00Z',
        },
        {
          id: 'entry-2',
          workstream_id: 'WS-19',
          component: 'banner',
          version: 1,
          spec_hash: 'def456',
          file_path: '.claude/visuals/WS-19/banner-v1.png',
          file_size: 8000,
          dimensions: { width: 1920, height: 400 },
          status: 'rejected' as const,
          created_at: '2026-02-04T01:00:00Z',
          updated_at: '2026-02-04T01:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMetadata));

      const result = await getMetadataByStatus('rejected');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('rejected');
    });

    it('When no entries match status, Then returns empty array', async () => {
      const existingMetadata = [
        {
          id: 'entry-1',
          workstream_id: 'WS-19',
          component: 'dashboard-card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T00:00:00Z',
          updated_at: '2026-02-04T00:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMetadata));

      const result = await getMetadataByStatus('approved');

      expect(result).toEqual([]);
    });
  });

  describe('Given invalid status value', () => {
    it('When querying with invalid status, Then throws validation error', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue('[]');

      await expect(getMetadataByStatus('invalid' as any)).rejects.toThrow(
        'Invalid status: must be pending, approved, or rejected'
      );
    });
  });
});

describe('visuals/metadata/queries - getMetadataByComponent()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given metadata for multiple components', () => {
    it('When querying by component name, Then returns all entries for that component', async () => {
      const existingMetadata = [
        {
          id: 'entry-1',
          workstream_id: 'WS-19',
          component: 'dashboard-card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T00:00:00Z',
          updated_at: '2026-02-04T00:00:00Z',
        },
        {
          id: 'entry-2',
          workstream_id: 'WS-19',
          component: 'dashboard-card',
          version: 2,
          spec_hash: 'def456',
          file_path: '.claude/visuals/WS-19/dashboard-card-v2.png',
          file_size: 13000,
          dimensions: { width: 800, height: 600 },
          status: 'approved' as const,
          created_at: '2026-02-04T01:00:00Z',
          updated_at: '2026-02-04T01:00:00Z',
        },
        {
          id: 'entry-3',
          workstream_id: 'WS-19',
          component: 'banner',
          version: 1,
          spec_hash: 'ghi789',
          file_path: '.claude/visuals/WS-19/banner-v1.png',
          file_size: 8000,
          dimensions: { width: 1920, height: 400 },
          status: 'pending' as const,
          created_at: '2026-02-04T02:00:00Z',
          updated_at: '2026-02-04T02:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMetadata));

      const result = await getMetadataByComponent('dashboard-card');

      expect(result).toHaveLength(2);
      expect(result.every((entry) => entry.component === 'dashboard-card')).toBe(true);
    });

    it('When querying component across workstreams, Then returns all matching entries', async () => {
      const existingMetadata = [
        {
          id: 'entry-1',
          workstream_id: 'WS-19',
          component: 'button',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-19/button-v1.png',
          file_size: 5000,
          dimensions: { width: 200, height: 50 },
          status: 'pending' as const,
          created_at: '2026-02-04T00:00:00Z',
          updated_at: '2026-02-04T00:00:00Z',
        },
        {
          id: 'entry-2',
          workstream_id: 'WS-20',
          component: 'button',
          version: 1,
          spec_hash: 'def456',
          file_path: '.claude/visuals/WS-20/button-v1.png',
          file_size: 5500,
          dimensions: { width: 200, height: 50 },
          status: 'approved' as const,
          created_at: '2026-02-04T01:00:00Z',
          updated_at: '2026-02-04T01:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMetadata));

      const result = await getMetadataByComponent('button');

      expect(result).toHaveLength(2);
      expect(result.every((entry) => entry.component === 'button')).toBe(true);
    });

    it('When querying non-existent component, Then returns empty array', async () => {
      const existingMetadata = [
        {
          id: 'entry-1',
          workstream_id: 'WS-19',
          component: 'dashboard-card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T00:00:00Z',
          updated_at: '2026-02-04T00:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMetadata));

      const result = await getMetadataByComponent('non-existent');

      expect(result).toEqual([]);
    });
  });
});

describe('visuals/metadata/queries - getLatestVersion()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given multiple versions of component', () => {
    it('When getting latest version, Then returns highest version number entry', async () => {
      const existingMetadata = [
        {
          id: 'entry-1',
          workstream_id: 'WS-19',
          component: 'dashboard-card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'approved' as const,
          created_at: '2026-02-04T00:00:00Z',
          updated_at: '2026-02-04T00:00:00Z',
        },
        {
          id: 'entry-2',
          workstream_id: 'WS-19',
          component: 'dashboard-card',
          version: 2,
          spec_hash: 'def456',
          file_path: '.claude/visuals/WS-19/dashboard-card-v2.png',
          file_size: 13000,
          dimensions: { width: 800, height: 600 },
          status: 'approved' as const,
          created_at: '2026-02-04T01:00:00Z',
          updated_at: '2026-02-04T01:00:00Z',
        },
        {
          id: 'entry-3',
          workstream_id: 'WS-19',
          component: 'dashboard-card',
          version: 3,
          spec_hash: 'ghi789',
          file_path: '.claude/visuals/WS-19/dashboard-card-v3.png',
          file_size: 14000,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T02:00:00Z',
          updated_at: '2026-02-04T02:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMetadata));

      const result = await getLatestVersion('WS-19', 'dashboard-card');

      expect(result).not.toBeNull();
      expect(result?.version).toBe(3);
      expect(result?.id).toBe('entry-3');
    });

    it('When getting latest version with single entry, Then returns that entry', async () => {
      const existingMetadata = [
        {
          id: 'entry-1',
          workstream_id: 'WS-19',
          component: 'dashboard-card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T00:00:00Z',
          updated_at: '2026-02-04T00:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMetadata));

      const result = await getLatestVersion('WS-19', 'dashboard-card');

      expect(result).not.toBeNull();
      expect(result?.version).toBe(1);
    });

    it('When component not found, Then returns null', async () => {
      const existingMetadata = [
        {
          id: 'entry-1',
          workstream_id: 'WS-19',
          component: 'dashboard-card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T00:00:00Z',
          updated_at: '2026-02-04T00:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMetadata));

      const result = await getLatestVersion('WS-19', 'non-existent');

      expect(result).toBeNull();
    });

    it('When workstream not found, Then returns null', async () => {
      const existingMetadata = [
        {
          id: 'entry-1',
          workstream_id: 'WS-19',
          component: 'dashboard-card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T00:00:00Z',
          updated_at: '2026-02-04T00:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMetadata));

      const result = await getLatestVersion('WS-99', 'dashboard-card');

      expect(result).toBeNull();
    });
  });
});

describe('visuals/metadata/queries - getAllVersions()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given multiple versions of component', () => {
    it('When getting all versions, Then returns all entries sorted by version', async () => {
      const existingMetadata = [
        {
          id: 'entry-3',
          workstream_id: 'WS-19',
          component: 'dashboard-card',
          version: 3,
          spec_hash: 'ghi789',
          file_path: '.claude/visuals/WS-19/dashboard-card-v3.png',
          file_size: 14000,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T02:00:00Z',
          updated_at: '2026-02-04T02:00:00Z',
        },
        {
          id: 'entry-1',
          workstream_id: 'WS-19',
          component: 'dashboard-card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'approved' as const,
          created_at: '2026-02-04T00:00:00Z',
          updated_at: '2026-02-04T00:00:00Z',
        },
        {
          id: 'entry-2',
          workstream_id: 'WS-19',
          component: 'dashboard-card',
          version: 2,
          spec_hash: 'def456',
          file_path: '.claude/visuals/WS-19/dashboard-card-v2.png',
          file_size: 13000,
          dimensions: { width: 800, height: 600 },
          status: 'approved' as const,
          created_at: '2026-02-04T01:00:00Z',
          updated_at: '2026-02-04T01:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMetadata));

      const result = await getAllVersions('WS-19', 'dashboard-card');

      expect(result).toHaveLength(3);
      expect(result[0].version).toBe(1);
      expect(result[1].version).toBe(2);
      expect(result[2].version).toBe(3);
    });

    it('When getting all versions with single entry, Then returns array with one entry', async () => {
      const existingMetadata = [
        {
          id: 'entry-1',
          workstream_id: 'WS-19',
          component: 'dashboard-card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T00:00:00Z',
          updated_at: '2026-02-04T00:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMetadata));

      const result = await getAllVersions('WS-19', 'dashboard-card');

      expect(result).toHaveLength(1);
      expect(result[0].version).toBe(1);
    });

    it('When component not found, Then returns empty array', async () => {
      const existingMetadata = [
        {
          id: 'entry-1',
          workstream_id: 'WS-19',
          component: 'dashboard-card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T00:00:00Z',
          updated_at: '2026-02-04T00:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMetadata));

      const result = await getAllVersions('WS-19', 'non-existent');

      expect(result).toEqual([]);
    });
  });
});

describe('visuals/metadata/queries - filterMetadata()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given complex filtering requirements', () => {
    it('When filtering by workstream and status, Then returns matching entries', async () => {
      const existingMetadata = [
        {
          id: 'entry-1',
          workstream_id: 'WS-19',
          component: 'dashboard-card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T00:00:00Z',
          updated_at: '2026-02-04T00:00:00Z',
        },
        {
          id: 'entry-2',
          workstream_id: 'WS-19',
          component: 'banner',
          version: 1,
          spec_hash: 'def456',
          file_path: '.claude/visuals/WS-19/banner-v1.png',
          file_size: 8000,
          dimensions: { width: 1920, height: 400 },
          status: 'approved' as const,
          created_at: '2026-02-04T01:00:00Z',
          updated_at: '2026-02-04T01:00:00Z',
        },
        {
          id: 'entry-3',
          workstream_id: 'WS-20',
          component: 'modal',
          version: 1,
          spec_hash: 'ghi789',
          file_path: '.claude/visuals/WS-20/modal-v1.png',
          file_size: 15000,
          dimensions: { width: 600, height: 400 },
          status: 'pending' as const,
          created_at: '2026-02-04T02:00:00Z',
          updated_at: '2026-02-04T02:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMetadata));

      const result = await filterMetadata({
        workstream_id: 'WS-19',
        status: 'pending',
      });

      expect(result).toHaveLength(1);
      expect(result[0].workstream_id).toBe('WS-19');
      expect(result[0].status).toBe('pending');
    });

    it('When filtering by workstream and component, Then returns matching entries', async () => {
      const existingMetadata = [
        {
          id: 'entry-1',
          workstream_id: 'WS-19',
          component: 'dashboard-card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T00:00:00Z',
          updated_at: '2026-02-04T00:00:00Z',
        },
        {
          id: 'entry-2',
          workstream_id: 'WS-19',
          component: 'dashboard-card',
          version: 2,
          spec_hash: 'def456',
          file_path: '.claude/visuals/WS-19/dashboard-card-v2.png',
          file_size: 13000,
          dimensions: { width: 800, height: 600 },
          status: 'approved' as const,
          created_at: '2026-02-04T01:00:00Z',
          updated_at: '2026-02-04T01:00:00Z',
        },
        {
          id: 'entry-3',
          workstream_id: 'WS-20',
          component: 'dashboard-card',
          version: 1,
          spec_hash: 'ghi789',
          file_path: '.claude/visuals/WS-20/dashboard-card-v1.png',
          file_size: 14000,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T02:00:00Z',
          updated_at: '2026-02-04T02:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMetadata));

      const result = await filterMetadata({
        workstream_id: 'WS-19',
        component: 'dashboard-card',
      });

      expect(result).toHaveLength(2);
      expect(result.every((entry) => entry.workstream_id === 'WS-19')).toBe(true);
      expect(result.every((entry) => entry.component === 'dashboard-card')).toBe(true);
    });

    it('When filtering with all criteria, Then returns matching entries', async () => {
      const existingMetadata = [
        {
          id: 'entry-1',
          workstream_id: 'WS-19',
          component: 'dashboard-card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'approved' as const,
          created_at: '2026-02-04T00:00:00Z',
          updated_at: '2026-02-04T00:00:00Z',
        },
        {
          id: 'entry-2',
          workstream_id: 'WS-19',
          component: 'dashboard-card',
          version: 2,
          spec_hash: 'def456',
          file_path: '.claude/visuals/WS-19/dashboard-card-v2.png',
          file_size: 13000,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T01:00:00Z',
          updated_at: '2026-02-04T01:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMetadata));

      const result = await filterMetadata({
        workstream_id: 'WS-19',
        component: 'dashboard-card',
        status: 'approved',
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('entry-1');
    });

    it('When no filters provided, Then returns all entries', async () => {
      const existingMetadata = [
        {
          id: 'entry-1',
          workstream_id: 'WS-19',
          component: 'dashboard-card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T00:00:00Z',
          updated_at: '2026-02-04T00:00:00Z',
        },
        {
          id: 'entry-2',
          workstream_id: 'WS-20',
          component: 'banner',
          version: 1,
          spec_hash: 'def456',
          file_path: '.claude/visuals/WS-20/banner-v1.png',
          file_size: 8000,
          dimensions: { width: 1920, height: 400 },
          status: 'approved' as const,
          created_at: '2026-02-04T01:00:00Z',
          updated_at: '2026-02-04T01:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMetadata));

      const result = await filterMetadata({});

      expect(result).toHaveLength(2);
    });

    it('When no entries match filters, Then returns empty array', async () => {
      const existingMetadata = [
        {
          id: 'entry-1',
          workstream_id: 'WS-19',
          component: 'dashboard-card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T00:00:00Z',
          updated_at: '2026-02-04T00:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMetadata));

      const result = await filterMetadata({
        workstream_id: 'WS-99',
        status: 'approved',
      });

      expect(result).toEqual([]);
    });
  });
});

describe('visuals/metadata/queries - sortMetadata()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given sorting requirements', () => {
    it('When sorting by created_at ascending, Then orders from oldest to newest', async () => {
      const existingMetadata = [
        {
          id: 'entry-3',
          workstream_id: 'WS-19',
          component: 'card-3',
          version: 1,
          spec_hash: 'ghi789',
          file_path: '.claude/visuals/WS-19/card-3-v1.png',
          file_size: 10000,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T02:00:00Z',
          updated_at: '2026-02-04T02:00:00Z',
        },
        {
          id: 'entry-1',
          workstream_id: 'WS-19',
          component: 'card-1',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-19/card-1-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T00:00:00Z',
          updated_at: '2026-02-04T00:00:00Z',
        },
        {
          id: 'entry-2',
          workstream_id: 'WS-19',
          component: 'card-2',
          version: 1,
          spec_hash: 'def456',
          file_path: '.claude/visuals/WS-19/card-2-v1.png',
          file_size: 8000,
          dimensions: { width: 800, height: 600 },
          status: 'approved' as const,
          created_at: '2026-02-04T01:00:00Z',
          updated_at: '2026-02-04T01:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMetadata));

      const result = await sortMetadata('created_at', 'asc');

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('entry-1');
      expect(result[1].id).toBe('entry-2');
      expect(result[2].id).toBe('entry-3');
    });

    it('When sorting by created_at descending, Then orders from newest to oldest', async () => {
      const existingMetadata = [
        {
          id: 'entry-1',
          workstream_id: 'WS-19',
          component: 'card-1',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-19/card-1-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T00:00:00Z',
          updated_at: '2026-02-04T00:00:00Z',
        },
        {
          id: 'entry-2',
          workstream_id: 'WS-19',
          component: 'card-2',
          version: 1,
          spec_hash: 'def456',
          file_path: '.claude/visuals/WS-19/card-2-v1.png',
          file_size: 8000,
          dimensions: { width: 800, height: 600 },
          status: 'approved' as const,
          created_at: '2026-02-04T01:00:00Z',
          updated_at: '2026-02-04T01:00:00Z',
        },
        {
          id: 'entry-3',
          workstream_id: 'WS-19',
          component: 'card-3',
          version: 1,
          spec_hash: 'ghi789',
          file_path: '.claude/visuals/WS-19/card-3-v1.png',
          file_size: 10000,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T02:00:00Z',
          updated_at: '2026-02-04T02:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMetadata));

      const result = await sortMetadata('created_at', 'desc');

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('entry-3');
      expect(result[1].id).toBe('entry-2');
      expect(result[2].id).toBe('entry-1');
    });

    it('When sorting by version ascending, Then orders from lowest to highest version', async () => {
      const existingMetadata = [
        {
          id: 'entry-3',
          workstream_id: 'WS-19',
          component: 'dashboard-card',
          version: 3,
          spec_hash: 'ghi789',
          file_path: '.claude/visuals/WS-19/dashboard-card-v3.png',
          file_size: 14000,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T02:00:00Z',
          updated_at: '2026-02-04T02:00:00Z',
        },
        {
          id: 'entry-1',
          workstream_id: 'WS-19',
          component: 'dashboard-card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'approved' as const,
          created_at: '2026-02-04T00:00:00Z',
          updated_at: '2026-02-04T00:00:00Z',
        },
        {
          id: 'entry-2',
          workstream_id: 'WS-19',
          component: 'dashboard-card',
          version: 2,
          spec_hash: 'def456',
          file_path: '.claude/visuals/WS-19/dashboard-card-v2.png',
          file_size: 13000,
          dimensions: { width: 800, height: 600 },
          status: 'approved' as const,
          created_at: '2026-02-04T01:00:00Z',
          updated_at: '2026-02-04T01:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMetadata));

      const result = await sortMetadata('version', 'asc');

      expect(result).toHaveLength(3);
      expect(result[0].version).toBe(1);
      expect(result[1].version).toBe(2);
      expect(result[2].version).toBe(3);
    });

    it('When sorting by version descending, Then orders from highest to lowest version', async () => {
      const existingMetadata = [
        {
          id: 'entry-1',
          workstream_id: 'WS-19',
          component: 'dashboard-card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'approved' as const,
          created_at: '2026-02-04T00:00:00Z',
          updated_at: '2026-02-04T00:00:00Z',
        },
        {
          id: 'entry-2',
          workstream_id: 'WS-19',
          component: 'dashboard-card',
          version: 2,
          spec_hash: 'def456',
          file_path: '.claude/visuals/WS-19/dashboard-card-v2.png',
          file_size: 13000,
          dimensions: { width: 800, height: 600 },
          status: 'approved' as const,
          created_at: '2026-02-04T01:00:00Z',
          updated_at: '2026-02-04T01:00:00Z',
        },
        {
          id: 'entry-3',
          workstream_id: 'WS-19',
          component: 'dashboard-card',
          version: 3,
          spec_hash: 'ghi789',
          file_path: '.claude/visuals/WS-19/dashboard-card-v3.png',
          file_size: 14000,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T02:00:00Z',
          updated_at: '2026-02-04T02:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMetadata));

      const result = await sortMetadata('version', 'desc');

      expect(result).toHaveLength(3);
      expect(result[0].version).toBe(3);
      expect(result[1].version).toBe(2);
      expect(result[2].version).toBe(1);
    });
  });
});

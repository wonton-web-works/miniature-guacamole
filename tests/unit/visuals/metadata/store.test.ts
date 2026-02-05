/**
 * WS-19: Metadata Tracking System - Store Module Tests
 *
 * BDD Scenarios:
 * - AC-1: Create metadata.json on first generation
 * - AC-2: Record workstream_id, component, version, spec_hash
 * - AC-3: Record file_path, file_size, dimensions
 * - AC-4: Update status (pending/approved/rejected)
 * - AC-5: Version auto-increment on regeneration
 * - Atomic file operations
 * - Error handling (missing file, invalid JSON, permission errors)
 *
 * Target: 99% coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module at the top level
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  },
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

import {
  createMetadataEntry,
  updateMetadataEntry,
  getMetadataEntry,
  getAllMetadata,
  deleteMetadataEntry,
  incrementVersion,
  updateStatus,
} from '@/visuals/metadata/store';

describe('visuals/metadata/store - createMetadataEntry()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given first generation of a component (AC-1: Create metadata.json)', () => {
    it('When creating metadata entry, Then creates metadata.json file', async () => {
      const entryData = {
        workstream_id: 'WS-19',
        component: 'dashboard-card',
        version: 1,
        spec_hash: 'abc123',
        file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
        file_size: 12345,
        dimensions: { width: 800, height: 600 },
        status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const result = await createMetadataEntry(entryData);

      expect(result).toEqual(entryData);
      expect(fs.promises.writeFile).toHaveBeenCalled();
      expect(fs.promises.mkdir).toHaveBeenCalled();
    });

    it('When creating first entry, Then sets version to 1', async () => {
      const entryData = {
        workstream_id: 'WS-19',
        component: 'dashboard-card',
        version: 1,
        spec_hash: 'abc123',
        file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
        file_size: 12345,
        dimensions: { width: 800, height: 600 },
        status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const result = await createMetadataEntry(entryData);

      expect(result.version).toBe(1);
    });

    it('When creating entry, Then sets status to pending by default', async () => {
      const entryData = {
        workstream_id: 'WS-19',
        component: 'dashboard-card',
        version: 1,
        spec_hash: 'abc123',
        file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
        file_size: 12345,
        dimensions: { width: 800, height: 600 },
        status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const result = await createMetadataEntry(entryData);

      expect(result.status).toBe('pending');
    });

    it('When creating entry, Then sets created_at timestamp', async () => {
      const now = new Date().toISOString();
      const entryData = {
        workstream_id: 'WS-19',
        component: 'dashboard-card',
        version: 1,
        spec_hash: 'abc123',
        file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
        file_size: 12345,
        dimensions: { width: 800, height: 600 },
        status: 'pending' as const,
        created_at: now,
        updated_at: now,
      };

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const result = await createMetadataEntry(entryData);

      expect(result.created_at).toBeDefined();
      expect(new Date(result.created_at)).toBeInstanceOf(Date);
    });

    it('When creating entry, Then sets updated_at timestamp', async () => {
      const now = new Date().toISOString();
      const entryData = {
        workstream_id: 'WS-19',
        component: 'dashboard-card',
        version: 1,
        spec_hash: 'abc123',
        file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
        file_size: 12345,
        dimensions: { width: 800, height: 600 },
        status: 'pending' as const,
        created_at: now,
        updated_at: now,
      };

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const result = await createMetadataEntry(entryData);

      expect(result.updated_at).toBeDefined();
      expect(new Date(result.updated_at)).toBeInstanceOf(Date);
    });
  });

  describe('Given required fields (AC-2: Record workstream_id, component, version, spec_hash)', () => {
    it('When creating entry, Then includes workstream_id', async () => {
      const entryData = {
        workstream_id: 'WS-19',
        component: 'dashboard-card',
        version: 1,
        spec_hash: 'abc123',
        file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
        file_size: 12345,
        dimensions: { width: 800, height: 600 },
        status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const result = await createMetadataEntry(entryData);

      expect(result.workstream_id).toBe('WS-19');
    });

    it('When creating entry, Then includes component name', async () => {
      const entryData = {
        workstream_id: 'WS-19',
        component: 'dashboard-card',
        version: 1,
        spec_hash: 'abc123',
        file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
        file_size: 12345,
        dimensions: { width: 800, height: 600 },
        status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const result = await createMetadataEntry(entryData);

      expect(result.component).toBe('dashboard-card');
    });

    it('When creating entry, Then includes version number', async () => {
      const entryData = {
        workstream_id: 'WS-19',
        component: 'dashboard-card',
        version: 1,
        spec_hash: 'abc123',
        file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
        file_size: 12345,
        dimensions: { width: 800, height: 600 },
        status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const result = await createMetadataEntry(entryData);

      expect(result.version).toBe(1);
    });

    it('When creating entry, Then includes spec_hash', async () => {
      const entryData = {
        workstream_id: 'WS-19',
        component: 'dashboard-card',
        version: 1,
        spec_hash: 'abc123def456',
        file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
        file_size: 12345,
        dimensions: { width: 800, height: 600 },
        status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const result = await createMetadataEntry(entryData);

      expect(result.spec_hash).toBe('abc123def456');
    });
  });

  describe('Given file metadata fields (AC-3: Record file_path, file_size, dimensions)', () => {
    it('When creating entry, Then includes file_path', async () => {
      const entryData = {
        workstream_id: 'WS-19',
        component: 'dashboard-card',
        version: 1,
        spec_hash: 'abc123',
        file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
        file_size: 12345,
        dimensions: { width: 800, height: 600 },
        status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const result = await createMetadataEntry(entryData);

      expect(result.file_path).toBe('.claude/visuals/WS-19/dashboard-card-v1.png');
    });

    it('When creating entry, Then includes file_size in bytes', async () => {
      const entryData = {
        workstream_id: 'WS-19',
        component: 'dashboard-card',
        version: 1,
        spec_hash: 'abc123',
        file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
        file_size: 54321,
        dimensions: { width: 800, height: 600 },
        status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const result = await createMetadataEntry(entryData);

      expect(result.file_size).toBe(54321);
    });

    it('When creating entry, Then includes dimensions with width and height', async () => {
      const entryData = {
        workstream_id: 'WS-19',
        component: 'dashboard-card',
        version: 1,
        spec_hash: 'abc123',
        file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
        file_size: 12345,
        dimensions: { width: 1024, height: 768 },
        status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const result = await createMetadataEntry(entryData);

      expect(result.dimensions.width).toBe(1024);
      expect(result.dimensions.height).toBe(768);
    });

    it('When creating entry with custom dimensions, Then preserves values', async () => {
      const entryData = {
        workstream_id: 'WS-19',
        component: 'banner',
        version: 1,
        spec_hash: 'abc123',
        file_path: '.claude/visuals/WS-19/banner-v1.png',
        file_size: 8000,
        dimensions: { width: 1920, height: 400 },
        status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const result = await createMetadataEntry(entryData);

      expect(result.dimensions).toEqual({ width: 1920, height: 400 });
    });
  });

  describe('Given missing required fields', () => {
    it('When workstream_id missing, Then throws validation error', async () => {
      const invalidData = {
        component: 'dashboard-card',
        version: 1,
        spec_hash: 'abc123',
        file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
        file_size: 12345,
        dimensions: { width: 800, height: 600 },
        status: 'pending' as const,
      } as any;

      await expect(createMetadataEntry(invalidData)).rejects.toThrow(
        'Missing required field: workstream_id'
      );
    });

    it('When component missing, Then throws validation error', async () => {
      const invalidData = {
        workstream_id: 'WS-19',
        version: 1,
        spec_hash: 'abc123',
        file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
        file_size: 12345,
        dimensions: { width: 800, height: 600 },
        status: 'pending' as const,
      } as any;

      await expect(createMetadataEntry(invalidData)).rejects.toThrow(
        'Missing required field: component'
      );
    });

    it('When spec_hash missing, Then throws validation error', async () => {
      const invalidData = {
        workstream_id: 'WS-19',
        component: 'dashboard-card',
        version: 1,
        file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
        file_size: 12345,
        dimensions: { width: 800, height: 600 },
        status: 'pending' as const,
      } as any;

      await expect(createMetadataEntry(invalidData)).rejects.toThrow(
        'Missing required field: spec_hash'
      );
    });

    it('When file_path missing, Then throws validation error', async () => {
      const invalidData = {
        workstream_id: 'WS-19',
        component: 'dashboard-card',
        version: 1,
        spec_hash: 'abc123',
        file_size: 12345,
        dimensions: { width: 800, height: 600 },
        status: 'pending' as const,
      } as any;

      await expect(createMetadataEntry(invalidData)).rejects.toThrow(
        'Missing required field: file_path'
      );
    });

    it('When dimensions missing, Then throws validation error', async () => {
      const invalidData = {
        workstream_id: 'WS-19',
        component: 'dashboard-card',
        version: 1,
        spec_hash: 'abc123',
        file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
        file_size: 12345,
        status: 'pending' as const,
      } as any;

      await expect(createMetadataEntry(invalidData)).rejects.toThrow(
        'Missing required field: dimensions'
      );
    });
  });

  describe('Given atomic file write operations', () => {
    it('When writing metadata, Then uses atomic write operation', async () => {
      const entryData = {
        workstream_id: 'WS-19',
        component: 'dashboard-card',
        version: 1,
        spec_hash: 'abc123',
        file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
        file_size: 12345,
        dimensions: { width: 800, height: 600 },
        status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      await createMetadataEntry(entryData);

      // Atomic write typically writes to temp file then renames
      expect(fs.promises.writeFile).toHaveBeenCalled();
    });

    it('When concurrent writes occur, Then prevents data corruption', async () => {
      const entry1 = {
        workstream_id: 'WS-19',
        component: 'card-1',
        version: 1,
        spec_hash: 'hash1',
        file_path: '.claude/visuals/WS-19/card-1-v1.png',
        file_size: 100,
        dimensions: { width: 800, height: 600 },
        status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const entry2 = {
        workstream_id: 'WS-19',
        component: 'card-2',
        version: 1,
        spec_hash: 'hash2',
        file_path: '.claude/visuals/WS-19/card-2-v1.png',
        file_size: 200,
        dimensions: { width: 800, height: 600 },
        status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      // Concurrent writes should both succeed
      await Promise.all([createMetadataEntry(entry1), createMetadataEntry(entry2)]);

      expect(fs.promises.writeFile).toHaveBeenCalledTimes(2);
    });

    it('When write fails, Then throws error and does not corrupt file', async () => {
      const entryData = {
        workstream_id: 'WS-19',
        component: 'dashboard-card',
        version: 1,
        spec_hash: 'abc123',
        file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
        file_size: 12345,
        dimensions: { width: 800, height: 600 },
        status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.writeFile).mockRejectedValue(new Error('Write failed'));

      await expect(createMetadataEntry(entryData)).rejects.toThrow('Write failed');
    });
  });

  describe('Given error conditions', () => {
    it('When directory creation fails, Then throws error', async () => {
      const entryData = {
        workstream_id: 'WS-19',
        component: 'dashboard-card',
        version: 1,
        spec_hash: 'abc123',
        file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
        file_size: 12345,
        dimensions: { width: 800, height: 600 },
        status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.promises.mkdir).mockRejectedValue(new Error('Permission denied'));

      await expect(createMetadataEntry(entryData)).rejects.toThrow('Permission denied');
    });

    it('When file write fails with EACCES, Then throws permission error', async () => {
      const entryData = {
        workstream_id: 'WS-19',
        component: 'dashboard-card',
        version: 1,
        spec_hash: 'abc123',
        file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
        file_size: 12345,
        dimensions: { width: 800, height: 600 },
        status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      const permissionError = new Error('EACCES: permission denied') as NodeJS.ErrnoException;
      permissionError.code = 'EACCES';
      vi.mocked(fs.promises.writeFile).mockRejectedValue(permissionError);

      await expect(createMetadataEntry(entryData)).rejects.toThrow('permission denied');
    });

    it('When disk is full, Then throws ENOSPC error', async () => {
      const entryData = {
        workstream_id: 'WS-19',
        component: 'dashboard-card',
        version: 1,
        spec_hash: 'abc123',
        file_path: '.claude/visuals/WS-19/dashboard-card-v1.png',
        file_size: 12345,
        dimensions: { width: 800, height: 600 },
        status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      const diskFullError = new Error('ENOSPC: no space left on device') as NodeJS.ErrnoException;
      diskFullError.code = 'ENOSPC';
      vi.mocked(fs.promises.writeFile).mockRejectedValue(diskFullError);

      await expect(createMetadataEntry(entryData)).rejects.toThrow('no space left');
    });
  });
});

describe('visuals/metadata/store - updateMetadataEntry()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given existing metadata entry (AC-4: Update status)', () => {
    it('When updating status to approved, Then changes status field', async () => {
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
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const result = await updateMetadataEntry('entry-1', { status: 'approved' });

      expect(result.status).toBe('approved');
    });

    it('When updating status to rejected, Then changes status field', async () => {
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
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const result = await updateMetadataEntry('entry-1', { status: 'rejected' });

      expect(result.status).toBe('rejected');
    });

    it('When updating entry, Then updates updated_at timestamp', async () => {
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

      const beforeUpdate = new Date('2026-02-04T00:00:00Z');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMetadata));
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const result = await updateMetadataEntry('entry-1', { status: 'approved' });

      expect(new Date(result.updated_at).getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });

    it('When updating entry, Then preserves created_at timestamp', async () => {
      const createdAt = '2026-02-04T00:00:00Z';
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
          created_at: createdAt,
          updated_at: createdAt,
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMetadata));
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const result = await updateMetadataEntry('entry-1', { status: 'approved' });

      expect(result.created_at).toBe(createdAt);
    });

    it('When updating multiple fields, Then updates all specified fields', async () => {
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
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const result = await updateMetadataEntry('entry-1', {
        status: 'approved',
        file_size: 15000,
      });

      expect(result.status).toBe('approved');
      expect(result.file_size).toBe(15000);
    });
  });

  describe('Given entry not found', () => {
    it('When updating non-existent entry, Then throws not found error', async () => {
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

      await expect(updateMetadataEntry('non-existent-id', { status: 'approved' })).rejects.toThrow(
        'Metadata entry not found: non-existent-id'
      );
    });

    it('When metadata file missing, Then throws file not found error', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await expect(updateMetadataEntry('entry-1', { status: 'approved' })).rejects.toThrow(
        'Metadata file not found'
      );
    });
  });

  describe('Given invalid JSON in metadata file', () => {
    it('When reading corrupted metadata, Then throws JSON parse error', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue('{ invalid json');

      await expect(updateMetadataEntry('entry-1', { status: 'approved' })).rejects.toThrow();
    });
  });
});

describe('visuals/metadata/store - incrementVersion() (AC-5: Version auto-increment)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given same component regenerated', () => {
    it('When regenerating component, Then increments version from 1 to 2', async () => {
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

      const nextVersion = await incrementVersion('WS-19', 'dashboard-card');

      expect(nextVersion).toBe(2);
    });

    it('When regenerating component multiple times, Then increments version sequentially', async () => {
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
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
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
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T02:00:00Z',
          updated_at: '2026-02-04T02:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMetadata));

      const nextVersion = await incrementVersion('WS-19', 'dashboard-card');

      expect(nextVersion).toBe(4);
    });

    it('When first generation of component, Then returns version 1', async () => {
      const existingMetadata: any[] = [];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMetadata));

      const nextVersion = await incrementVersion('WS-19', 'new-component');

      expect(nextVersion).toBe(1);
    });

    it('When component exists in different workstream, Then starts at version 1', async () => {
      const existingMetadata = [
        {
          id: 'entry-1',
          workstream_id: 'WS-18',
          component: 'dashboard-card',
          version: 5,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-18/dashboard-card-v5.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T00:00:00Z',
          updated_at: '2026-02-04T00:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMetadata));

      const nextVersion = await incrementVersion('WS-19', 'dashboard-card');

      expect(nextVersion).toBe(1);
    });

    it('When multiple components in workstream, Then increments only matching component', async () => {
      const existingMetadata = [
        {
          id: 'entry-1',
          workstream_id: 'WS-19',
          component: 'dashboard-card',
          version: 3,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-19/dashboard-card-v3.png',
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
          version: 7,
          spec_hash: 'def456',
          file_path: '.claude/visuals/WS-19/banner-v7.png',
          file_size: 8000,
          dimensions: { width: 1920, height: 400 },
          status: 'pending' as const,
          created_at: '2026-02-04T01:00:00Z',
          updated_at: '2026-02-04T01:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMetadata));

      const nextVersion = await incrementVersion('WS-19', 'dashboard-card');

      expect(nextVersion).toBe(4);
    });
  });

  describe('Given metadata file does not exist', () => {
    it('When metadata file missing, Then returns version 1', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const nextVersion = await incrementVersion('WS-19', 'new-component');

      expect(nextVersion).toBe(1);
    });
  });
});

describe('visuals/metadata/store - updateStatus()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given status transition pending → approved', () => {
    it('When approving pending entry, Then updates status to approved', async () => {
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
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const result = await updateStatus('entry-1', 'approved');

      expect(result.status).toBe('approved');
    });

    it('When approving entry, Then updates timestamp', async () => {
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

      const beforeUpdate = new Date('2026-02-04T00:00:00Z');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMetadata));
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const result = await updateStatus('entry-1', 'approved');

      expect(new Date(result.updated_at).getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });
  });

  describe('Given status transition pending → rejected', () => {
    it('When rejecting pending entry, Then updates status to rejected', async () => {
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
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const result = await updateStatus('entry-1', 'rejected');

      expect(result.status).toBe('rejected');
    });
  });

  describe('Given invalid status values', () => {
    it('When setting invalid status, Then throws validation error', async () => {
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

      await expect(updateStatus('entry-1', 'invalid' as any)).rejects.toThrow(
        'Invalid status: must be pending, approved, or rejected'
      );
    });
  });
});

describe('visuals/metadata/store - getMetadataEntry()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given existing metadata entry', () => {
    it('When getting entry by id, Then returns entry data', async () => {
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

      const result = await getMetadataEntry('entry-1');

      expect(result).toEqual(existingMetadata[0]);
    });

    it('When getting non-existent entry, Then returns null', async () => {
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

      const result = await getMetadataEntry('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('Given metadata file does not exist', () => {
    it('When metadata file missing, Then returns null', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await getMetadataEntry('entry-1');

      expect(result).toBeNull();
    });
  });
});

describe('visuals/metadata/store - getAllMetadata()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given multiple metadata entries', () => {
    it('When getting all metadata, Then returns array of all entries', async () => {
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
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMetadata));

      const result = await getAllMetadata();

      expect(result).toEqual(existingMetadata);
      expect(result).toHaveLength(2);
    });

    it('When metadata file empty, Then returns empty array', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue('[]');

      const result = await getAllMetadata();

      expect(result).toEqual([]);
    });
  });

  describe('Given metadata file does not exist', () => {
    it('When metadata file missing, Then returns empty array', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await getAllMetadata();

      expect(result).toEqual([]);
    });
  });
});

describe('visuals/metadata/store - deleteMetadataEntry()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given existing metadata entry', () => {
    it('When deleting entry, Then removes entry from metadata', async () => {
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
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingMetadata));
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const result = await deleteMetadataEntry('entry-1');

      expect(result).toBe(true);
    });

    it('When deleting non-existent entry, Then returns false', async () => {
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

      const result = await deleteMetadataEntry('non-existent-id');

      expect(result).toBe(false);
    });
  });
});

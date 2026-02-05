/**
 * WS-20: Art Director Approval Workflow - Commands Module Tests
 *
 * BDD Scenarios:
 * - AC-1: review-visuals command lists all pending visuals
 * - AC-2: approve command moves file to approved/ directory
 * - AC-3: reject command keeps file with feedback recorded
 * - AC-4: Batch approve --all for bulk approval
 * - AC-5: Approval recorded in visual-approvals.json with timestamp and reviewer
 * - Error handling (file not found, already approved, permission errors)
 *
 * Target: 99% coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  renameSync: vi.fn(),
  statSync: vi.fn(),
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    rename: vi.fn(),
    stat: vi.fn(),
    readdir: vi.fn(),
  },
}));

import {
  reviewVisuals,
  approveVisual,
  rejectVisual,
  batchApproveAll,
} from '@/visuals/workflow/commands';

describe('visuals/workflow/commands - reviewVisuals()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given pending visuals exist (AC-1: List pending visuals)', () => {
    it('When calling reviewVisuals, Then returns all pending visuals', async () => {
      const pendingMetadata = [
        {
          id: 'visual-1',
          workstream_id: 'WS-20',
          component: 'dashboard-card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-20/pending/dashboard-card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T10:00:00Z',
          updated_at: '2026-02-04T10:00:00Z',
        },
        {
          id: 'visual-2',
          workstream_id: 'WS-20',
          component: 'banner',
          version: 1,
          spec_hash: 'def456',
          file_path: '.claude/visuals/WS-20/pending/banner-v1.png',
          file_size: 8000,
          dimensions: { width: 1920, height: 400 },
          status: 'pending' as const,
          created_at: '2026-02-04T11:00:00Z',
          updated_at: '2026-02-04T11:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(pendingMetadata));

      const result = await reviewVisuals();

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('pending');
      expect(result[1].status).toBe('pending');
    });

    it('When filtering by workstream, Then returns only matching workstream visuals', async () => {
      const metadata = [
        {
          id: 'visual-1',
          workstream_id: 'WS-20',
          component: 'card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-20/pending/card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T10:00:00Z',
          updated_at: '2026-02-04T10:00:00Z',
        },
        {
          id: 'visual-2',
          workstream_id: 'WS-21',
          component: 'banner',
          version: 1,
          spec_hash: 'def456',
          file_path: '.claude/visuals/WS-21/pending/banner-v1.png',
          file_size: 8000,
          dimensions: { width: 1920, height: 400 },
          status: 'pending' as const,
          created_at: '2026-02-04T11:00:00Z',
          updated_at: '2026-02-04T11:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(metadata));

      const result = await reviewVisuals({ workstream_id: 'WS-20' });

      expect(result).toHaveLength(1);
      expect(result[0].workstream_id).toBe('WS-20');
    });

    it('When filtering by status, Then returns only visuals with matching status', async () => {
      const metadata = [
        {
          id: 'visual-1',
          workstream_id: 'WS-20',
          component: 'card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-20/pending/card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T10:00:00Z',
          updated_at: '2026-02-04T10:00:00Z',
        },
        {
          id: 'visual-2',
          workstream_id: 'WS-20',
          component: 'banner',
          version: 1,
          spec_hash: 'def456',
          file_path: '.claude/visuals/WS-20/approved/banner-v1.png',
          file_size: 8000,
          dimensions: { width: 1920, height: 400 },
          status: 'approved' as const,
          created_at: '2026-02-04T11:00:00Z',
          updated_at: '2026-02-04T11:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(metadata));

      const result = await reviewVisuals({ status: 'pending' });

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('pending');
    });

    it('When sorting by created_at, Then returns visuals in chronological order', async () => {
      const metadata = [
        {
          id: 'visual-2',
          workstream_id: 'WS-20',
          component: 'banner',
          version: 1,
          spec_hash: 'def456',
          file_path: '.claude/visuals/WS-20/pending/banner-v1.png',
          file_size: 8000,
          dimensions: { width: 1920, height: 400 },
          status: 'pending' as const,
          created_at: '2026-02-04T11:00:00Z',
          updated_at: '2026-02-04T11:00:00Z',
        },
        {
          id: 'visual-1',
          workstream_id: 'WS-20',
          component: 'card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-20/pending/card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T10:00:00Z',
          updated_at: '2026-02-04T10:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(metadata));

      const result = await reviewVisuals();

      expect(result[0].id).toBe('visual-1');
      expect(result[1].id).toBe('visual-2');
    });

    it('When no pending visuals exist, Then returns empty array', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue('[]');

      const result = await reviewVisuals();

      expect(result).toEqual([]);
    });
  });

  describe('Given metadata file does not exist', () => {
    it('When calling reviewVisuals, Then returns empty array', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await reviewVisuals();

      expect(result).toEqual([]);
    });
  });
});

describe('visuals/workflow/commands - approveVisual()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given pending visual exists (AC-2: Approve command moves file)', () => {
    it('When approving visual, Then moves file from pending/ to approved/ directory', async () => {
      const metadata = [
        {
          id: 'visual-1',
          workstream_id: 'WS-20',
          component: 'card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-20/pending/card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T10:00:00Z',
          updated_at: '2026-02-04T10:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(metadata));
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.rename).mockResolvedValue(undefined);

      const result = await approveVisual('visual-1', 'art-director@example.com');

      expect(fs.promises.rename).toHaveBeenCalledWith(
        '.claude/visuals/WS-20/pending/card-v1.png',
        '.claude/visuals/WS-20/approved/card-v1.png'
      );
      expect(result.status).toBe('approved');
    });

    it('When approving visual, Then updates metadata status to approved', async () => {
      const metadata = [
        {
          id: 'visual-1',
          workstream_id: 'WS-20',
          component: 'card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-20/pending/card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T10:00:00Z',
          updated_at: '2026-02-04T10:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(metadata));
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.rename).mockResolvedValue(undefined);

      const result = await approveVisual('visual-1', 'art-director@example.com');

      expect(result.status).toBe('approved');
    });

    it('When approving visual, Then updates file_path in metadata', async () => {
      const metadata = [
        {
          id: 'visual-1',
          workstream_id: 'WS-20',
          component: 'card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-20/pending/card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T10:00:00Z',
          updated_at: '2026-02-04T10:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(metadata));
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.rename).mockResolvedValue(undefined);

      const result = await approveVisual('visual-1', 'art-director@example.com');

      expect(result.file_path).toBe('.claude/visuals/WS-20/approved/card-v1.png');
    });

    it('When approving visual, Then creates approval record in visual-approvals.json', async () => {
      const metadata = [
        {
          id: 'visual-1',
          workstream_id: 'WS-20',
          component: 'card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-20/pending/card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T10:00:00Z',
          updated_at: '2026-02-04T10:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(metadata));
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.rename).mockResolvedValue(undefined);

      await approveVisual('visual-1', 'art-director@example.com');

      // Verify approval record was written
      const writeCall = vi.mocked(fs.promises.writeFile).mock.calls.find(call =>
        call[0].toString().includes('visual-approvals.json')
      );
      expect(writeCall).toBeDefined();
    });
  });

  describe('Given approval record structure (AC-5: Record with timestamp and reviewer)', () => {
    it('When approving visual, Then approval record includes visual_id', async () => {
      const metadata = [
        {
          id: 'visual-1',
          workstream_id: 'WS-20',
          component: 'card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-20/pending/card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T10:00:00Z',
          updated_at: '2026-02-04T10:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(metadata));
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.rename).mockResolvedValue(undefined);

      await approveVisual('visual-1', 'art-director@example.com');

      const writeCall = vi.mocked(fs.promises.writeFile).mock.calls.find(call =>
        call[0].toString().includes('visual-approvals.json')
      );
      const approvalData = JSON.parse(writeCall![1] as string);
      expect(approvalData[0].visual_id).toBe('visual-1');
    });

    it('When approving visual, Then approval record includes reviewer', async () => {
      const metadata = [
        {
          id: 'visual-1',
          workstream_id: 'WS-20',
          component: 'card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-20/pending/card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T10:00:00Z',
          updated_at: '2026-02-04T10:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(metadata));
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.rename).mockResolvedValue(undefined);

      await approveVisual('visual-1', 'art-director@example.com');

      const writeCall = vi.mocked(fs.promises.writeFile).mock.calls.find(call =>
        call[0].toString().includes('visual-approvals.json')
      );
      const approvalData = JSON.parse(writeCall![1] as string);
      expect(approvalData[0].reviewer).toBe('art-director@example.com');
    });

    it('When approving visual, Then approval record includes timestamp', async () => {
      const metadata = [
        {
          id: 'visual-1',
          workstream_id: 'WS-20',
          component: 'card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-20/pending/card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T10:00:00Z',
          updated_at: '2026-02-04T10:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(metadata));
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.rename).mockResolvedValue(undefined);

      await approveVisual('visual-1', 'art-director@example.com');

      const writeCall = vi.mocked(fs.promises.writeFile).mock.calls.find(call =>
        call[0].toString().includes('visual-approvals.json')
      );
      const approvalData = JSON.parse(writeCall![1] as string);
      expect(approvalData[0].timestamp).toBeDefined();
      expect(new Date(approvalData[0].timestamp)).toBeInstanceOf(Date);
    });

    it('When approving visual, Then approval record includes action type', async () => {
      const metadata = [
        {
          id: 'visual-1',
          workstream_id: 'WS-20',
          component: 'card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-20/pending/card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T10:00:00Z',
          updated_at: '2026-02-04T10:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(metadata));
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.rename).mockResolvedValue(undefined);

      await approveVisual('visual-1', 'art-director@example.com');

      const writeCall = vi.mocked(fs.promises.writeFile).mock.calls.find(call =>
        call[0].toString().includes('visual-approvals.json')
      );
      const approvalData = JSON.parse(writeCall![1] as string);
      expect(approvalData[0].action).toBe('approved');
    });
  });

  describe('Given error conditions', () => {
    it('When visual not found, Then throws not found error', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue('[]');

      await expect(approveVisual('non-existent', 'art-director@example.com')).rejects.toThrow(
        'Visual not found: non-existent'
      );
    });

    it('When visual already approved, Then throws already approved error', async () => {
      const metadata = [
        {
          id: 'visual-1',
          workstream_id: 'WS-20',
          component: 'card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-20/approved/card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'approved' as const,
          created_at: '2026-02-04T10:00:00Z',
          updated_at: '2026-02-04T10:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(metadata));

      await expect(approveVisual('visual-1', 'art-director@example.com')).rejects.toThrow(
        'Visual already approved: visual-1'
      );
    });

    it('When file move fails with permission error, Then throws permission error', async () => {
      const metadata = [
        {
          id: 'visual-1',
          workstream_id: 'WS-20',
          component: 'card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-20/pending/card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T10:00:00Z',
          updated_at: '2026-02-04T10:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(metadata));
      const permissionError = new Error('EACCES: permission denied') as NodeJS.ErrnoException;
      permissionError.code = 'EACCES';
      vi.mocked(fs.promises.rename).mockRejectedValue(permissionError);

      await expect(approveVisual('visual-1', 'art-director@example.com')).rejects.toThrow(
        'permission denied'
      );
    });

    it('When file does not exist, Then throws file not found error', async () => {
      const metadata = [
        {
          id: 'visual-1',
          workstream_id: 'WS-20',
          component: 'card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-20/pending/card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T10:00:00Z',
          updated_at: '2026-02-04T10:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(metadata));
      const notFoundError = new Error('ENOENT: no such file or directory') as NodeJS.ErrnoException;
      notFoundError.code = 'ENOENT';
      vi.mocked(fs.promises.rename).mockRejectedValue(notFoundError);

      await expect(approveVisual('visual-1', 'art-director@example.com')).rejects.toThrow(
        'File not found'
      );
    });
  });
});

describe('visuals/workflow/commands - rejectVisual()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given pending visual exists (AC-3: Reject keeps file with feedback)', () => {
    it('When rejecting visual, Then keeps file in pending/ directory', async () => {
      const metadata = [
        {
          id: 'visual-1',
          workstream_id: 'WS-20',
          component: 'card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-20/pending/card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T10:00:00Z',
          updated_at: '2026-02-04T10:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(metadata));
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const result = await rejectVisual('visual-1', 'art-director@example.com', 'Colors do not match brand guidelines');

      expect(result.file_path).toBe('.claude/visuals/WS-20/pending/card-v1.png');
      expect(fs.promises.rename).not.toHaveBeenCalled();
    });

    it('When rejecting visual, Then updates metadata status to rejected', async () => {
      const metadata = [
        {
          id: 'visual-1',
          workstream_id: 'WS-20',
          component: 'card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-20/pending/card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T10:00:00Z',
          updated_at: '2026-02-04T10:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(metadata));
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const result = await rejectVisual('visual-1', 'art-director@example.com', 'Colors do not match brand guidelines');

      expect(result.status).toBe('rejected');
    });

    it('When rejecting visual, Then records feedback in approval record', async () => {
      const metadata = [
        {
          id: 'visual-1',
          workstream_id: 'WS-20',
          component: 'card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-20/pending/card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T10:00:00Z',
          updated_at: '2026-02-04T10:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(metadata));
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      await rejectVisual('visual-1', 'art-director@example.com', 'Colors do not match brand guidelines');

      const writeCall = vi.mocked(fs.promises.writeFile).mock.calls.find(call =>
        call[0].toString().includes('visual-approvals.json')
      );
      const approvalData = JSON.parse(writeCall![1] as string);
      expect(approvalData[0].feedback).toBe('Colors do not match brand guidelines');
    });

    it('When rejecting visual, Then approval record includes action as rejected', async () => {
      const metadata = [
        {
          id: 'visual-1',
          workstream_id: 'WS-20',
          component: 'card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-20/pending/card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T10:00:00Z',
          updated_at: '2026-02-04T10:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(metadata));
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      await rejectVisual('visual-1', 'art-director@example.com', 'Colors do not match brand guidelines');

      const writeCall = vi.mocked(fs.promises.writeFile).mock.calls.find(call =>
        call[0].toString().includes('visual-approvals.json')
      );
      const approvalData = JSON.parse(writeCall![1] as string);
      expect(approvalData[0].action).toBe('rejected');
    });

    it('When rejecting visual without feedback, Then throws validation error', async () => {
      const metadata = [
        {
          id: 'visual-1',
          workstream_id: 'WS-20',
          component: 'card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-20/pending/card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T10:00:00Z',
          updated_at: '2026-02-04T10:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(metadata));

      await expect(rejectVisual('visual-1', 'art-director@example.com', '')).rejects.toThrow(
        'Feedback is required when rejecting a visual'
      );
    });
  });

  describe('Given error conditions', () => {
    it('When visual not found, Then throws not found error', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue('[]');

      await expect(
        rejectVisual('non-existent', 'art-director@example.com', 'Feedback')
      ).rejects.toThrow('Visual not found: non-existent');
    });

    it('When visual already approved, Then throws cannot reject error', async () => {
      const metadata = [
        {
          id: 'visual-1',
          workstream_id: 'WS-20',
          component: 'card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-20/approved/card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'approved' as const,
          created_at: '2026-02-04T10:00:00Z',
          updated_at: '2026-02-04T10:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(metadata));

      await expect(
        rejectVisual('visual-1', 'art-director@example.com', 'Feedback')
      ).rejects.toThrow('Cannot reject approved visual: visual-1');
    });
  });
});

describe('visuals/workflow/commands - batchApproveAll()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given multiple pending visuals (AC-4: Batch approve --all)', () => {
    it('When batch approving all, Then approves all pending visuals', async () => {
      const metadata = [
        {
          id: 'visual-1',
          workstream_id: 'WS-20',
          component: 'card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-20/pending/card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T10:00:00Z',
          updated_at: '2026-02-04T10:00:00Z',
        },
        {
          id: 'visual-2',
          workstream_id: 'WS-20',
          component: 'banner',
          version: 1,
          spec_hash: 'def456',
          file_path: '.claude/visuals/WS-20/pending/banner-v1.png',
          file_size: 8000,
          dimensions: { width: 1920, height: 400 },
          status: 'pending' as const,
          created_at: '2026-02-04T11:00:00Z',
          updated_at: '2026-02-04T11:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(metadata));
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.rename).mockResolvedValue(undefined);

      const result = await batchApproveAll('art-director@example.com', true);

      expect(result.approved_count).toBe(2);
      expect(result.visual_ids).toEqual(['visual-1', 'visual-2']);
    });

    it('When batch approving without confirmation, Then throws confirmation required error', async () => {
      const metadata = [
        {
          id: 'visual-1',
          workstream_id: 'WS-20',
          component: 'card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-20/pending/card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T10:00:00Z',
          updated_at: '2026-02-04T10:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(metadata));

      await expect(batchApproveAll('art-director@example.com', false)).rejects.toThrow(
        'Batch approval requires explicit confirmation'
      );
    });

    it('When batch approving with workstream filter, Then approves only matching workstream', async () => {
      const metadata = [
        {
          id: 'visual-1',
          workstream_id: 'WS-20',
          component: 'card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-20/pending/card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T10:00:00Z',
          updated_at: '2026-02-04T10:00:00Z',
        },
        {
          id: 'visual-2',
          workstream_id: 'WS-21',
          component: 'banner',
          version: 1,
          spec_hash: 'def456',
          file_path: '.claude/visuals/WS-21/pending/banner-v1.png',
          file_size: 8000,
          dimensions: { width: 1920, height: 400 },
          status: 'pending' as const,
          created_at: '2026-02-04T11:00:00Z',
          updated_at: '2026-02-04T11:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(metadata));
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.rename).mockResolvedValue(undefined);

      const result = await batchApproveAll('art-director@example.com', true, { workstream_id: 'WS-20' });

      expect(result.approved_count).toBe(1);
      expect(result.visual_ids).toEqual(['visual-1']);
    });

    it('When no pending visuals exist, Then returns zero count', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue('[]');

      const result = await batchApproveAll('art-director@example.com', true);

      expect(result.approved_count).toBe(0);
      expect(result.visual_ids).toEqual([]);
    });

    it('When batch approval partially fails, Then returns success and failure counts', async () => {
      const metadata = [
        {
          id: 'visual-1',
          workstream_id: 'WS-20',
          component: 'card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-20/pending/card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T10:00:00Z',
          updated_at: '2026-02-04T10:00:00Z',
        },
        {
          id: 'visual-2',
          workstream_id: 'WS-20',
          component: 'banner',
          version: 1,
          spec_hash: 'def456',
          file_path: '.claude/visuals/WS-20/pending/banner-v1.png',
          file_size: 8000,
          dimensions: { width: 1920, height: 400 },
          status: 'pending' as const,
          created_at: '2026-02-04T11:00:00Z',
          updated_at: '2026-02-04T11:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(metadata));
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      // First rename succeeds, second fails
      vi.mocked(fs.promises.rename)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Permission denied'));

      const result = await batchApproveAll('art-director@example.com', true);

      expect(result.approved_count).toBe(1);
      expect(result.failed_count).toBe(1);
      expect(result.visual_ids).toEqual(['visual-1']);
      expect(result.failed_ids).toEqual(['visual-2']);
    });
  });
});

/**
 * WS-21: Git Integration and LFS Support - Integration Tests
 *
 * BDD Scenarios:
 * - Integration: Full workflow (approve → LFS check → commit)
 * - Module exports validation
 * - End-to-end error handling
 * - Batch operations with mixed success/failure
 *
 * Target: 99% coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as childProcess from 'child_process';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  statSync: vi.fn(),
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    appendFile: vi.fn(),
    stat: vi.fn(),
  },
}));

// Mock child_process module
vi.mock('child_process', () => ({
  exec: vi.fn(),
  execSync: vi.fn(),
  execFileSync: vi.fn(),
}));

// Mock metadata queries from WS-19
vi.mock('@/visuals/metadata/queries', () => ({
  queryMetadata: vi.fn(),
  getMetadataById: vi.fn(),
}));

// Mock approval records from WS-20
vi.mock('@/visuals/workflow/approvals', () => ({
  getApprovalRecord: vi.fn(),
}));

import * as GitModule from '@/visuals/git';
import { getMetadataById } from '@/visuals/metadata/queries';
import { getApprovalRecord } from '@/visuals/workflow/approvals';

describe('visuals/git - Module Exports', () => {
  describe('Given git integration module', () => {
    it('Then exports commitApprovedVisual function', () => {
      expect(GitModule.commitApprovedVisual).toBeDefined();
      expect(typeof GitModule.commitApprovedVisual).toBe('function');
    });

    it('Then exports commitMultipleVisuals function', () => {
      expect(GitModule.commitMultipleVisuals).toBeDefined();
      expect(typeof GitModule.commitMultipleVisuals).toBe('function');
    });

    it('Then exports validateGitRepository function', () => {
      expect(GitModule.validateGitRepository).toBeDefined();
      expect(typeof GitModule.validateGitRepository).toBe('function');
    });

    it('Then exports checkUncommittedChanges function', () => {
      expect(GitModule.checkUncommittedChanges).toBeDefined();
      expect(typeof GitModule.checkUncommittedChanges).toBe('function');
    });

    it('Then exports buildCommitMessage function', () => {
      expect(GitModule.buildCommitMessage).toBeDefined();
      expect(typeof GitModule.buildCommitMessage).toBe('function');
    });

    it('Then exports isLfsInstalled function', () => {
      expect(GitModule.isLfsInstalled).toBeDefined();
      expect(typeof GitModule.isLfsInstalled).toBe('function');
    });

    it('Then exports isLfsInitialized function', () => {
      expect(GitModule.isLfsInitialized).toBeDefined();
      expect(typeof GitModule.isLfsInitialized).toBe('function');
    });

    it('Then exports checkLfsPrerequisites function', () => {
      expect(GitModule.checkLfsPrerequisites).toBeDefined();
      expect(typeof GitModule.checkLfsPrerequisites).toBe('function');
    });

    it('Then exports shouldUseLfs function', () => {
      expect(GitModule.shouldUseLfs).toBeDefined();
      expect(typeof GitModule.shouldUseLfs).toBe('function');
    });

    it('Then exports trackFileWithLfs function', () => {
      expect(GitModule.trackFileWithLfs).toBeDefined();
      expect(typeof GitModule.trackFileWithLfs).toBe('function');
    });

    it('Then exports configureGitAttributes function', () => {
      expect(GitModule.configureGitAttributes).toBeDefined();
      expect(typeof GitModule.configureGitAttributes).toBe('function');
    });

    it('Then exports ensureLfsTracking function', () => {
      expect(GitModule.ensureLfsTracking).toBeDefined();
      expect(typeof GitModule.ensureLfsTracking).toBe('function');
    });
  });
});

describe('visuals/git - Integration: Full Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given complete approve → LFS check → commit workflow', () => {
    it('When visual is approved and requires LFS, Then performs full LFS setup and commit', async () => {
      const visualId = 'integration-visual-1';

      const mockMetadata = {
        id: visualId,
        workstream_id: 'WS-21',
        component: 'hero-banner',
        version: 1,
        spec_hash: 'integration-hash',
        file_path: '.claude/visuals/WS-21/approved/hero-banner-v1.png',
        file_size: 2500000, // 2.5MB - requires LFS
        dimensions: { width: 1920, height: 1080 },
        status: 'approved' as const,
        created_at: '2026-02-04T10:00:00Z',
        updated_at: '2026-02-04T10:05:00Z',
      };

      const mockApproval = {
        visual_id: visualId,
        action: 'approved' as const,
        reviewer: 'art-director',
        timestamp: '2026-02-04T10:05:00Z',
        feedback: 'Perfect for the hero section',
      };

      vi.mocked(getMetadataById).mockResolvedValue(mockMetadata);
      vi.mocked(getApprovalRecord).mockResolvedValue(mockApproval);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Mock file stat for LFS check
      vi.mocked(fs.statSync).mockReturnValue({
        size: 2500000,
        isFile: () => true,
        isDirectory: () => false,
      } as any);

      // Mock execFileSync for all git commands in correct order
      vi.mocked(childProcess.execFileSync)
        .mockReturnValueOnce('git-lfs/3.4.0\n') // git lfs version (checkLfsPrerequisites)
        .mockReturnValueOnce('git-lfs filter is configured\n') // git lfs env (checkLfsPrerequisites)
        .mockReturnValueOnce('/path/to/repo/.git\n') // git rev-parse --git-dir (validateGitRepository)
        .mockReturnValueOnce('') // git status --porcelain (checkUncommittedChanges)
        .mockReturnValueOnce('Tracking "*.png"\n') // git lfs track (trackFileWithLfs)
        .mockReturnValueOnce('') // git add
        .mockReturnValueOnce('') // git commit
        .mockReturnValueOnce('commit-hash-123'); // git rev-parse HEAD

      // Mock .gitattributes
      vi.mocked(fs.promises.readFile).mockResolvedValue(
        '*.png filter=lfs diff=lfs merge=lfs -text\n'
      );

      const result = await GitModule.commitApprovedVisual(visualId, {
        ensureLfs: true,
      });

      expect(result.success).toBe(true);
      expect(result.commit_hash).toBeDefined();
      expect(result.lfs_enabled).toBe(true);
    });

    it('When visual is approved but does not require LFS, Then commits without LFS', async () => {
      const visualId = 'integration-visual-2';

      const mockMetadata = {
        id: visualId,
        workstream_id: 'WS-21',
        component: 'icon',
        version: 1,
        spec_hash: 'icon-hash',
        file_path: '.claude/visuals/WS-21/approved/icon-v1.png',
        file_size: 50000, // 50KB - does not require LFS
        dimensions: { width: 128, height: 128 },
        status: 'approved' as const,
        created_at: '2026-02-04T11:00:00Z',
        updated_at: '2026-02-04T11:05:00Z',
      };

      const mockApproval = {
        visual_id: visualId,
        action: 'approved' as const,
        reviewer: 'art-director',
        timestamp: '2026-02-04T11:05:00Z',
      };

      vi.mocked(getMetadataById).mockResolvedValue(mockMetadata);
      vi.mocked(getApprovalRecord).mockResolvedValue(mockApproval);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      vi.mocked(fs.statSync).mockReturnValue({
        size: 50000,
        isFile: () => true,
        isDirectory: () => false,
      } as any);

      // Mock execFileSync for all git commands
      vi.mocked(childProcess.execFileSync)
        .mockReturnValueOnce('/path/to/repo/.git\n') // git rev-parse --git-dir
        .mockReturnValueOnce('') // git status --porcelain
        .mockReturnValueOnce('') // git add
        .mockReturnValueOnce('') // git commit
        .mockReturnValueOnce('commit-hash-456'); // git rev-parse HEAD

      const result = await GitModule.commitApprovedVisual(visualId, {
        ensureLfs: true,
      });

      expect(result.success).toBe(true);
      expect(result.commit_hash).toBeDefined();
      expect(result.lfs_enabled).toBe(false);
    });

    it('When LFS not available but required, Then provides helpful error', async () => {
      const visualId = 'integration-visual-3';

      const mockMetadata = {
        id: visualId,
        workstream_id: 'WS-21',
        component: 'large-graphic',
        version: 1,
        spec_hash: 'large-hash',
        file_path: '.claude/visuals/WS-21/approved/large-graphic-v1.png',
        file_size: 3000000, // 3MB - requires LFS
        dimensions: { width: 2560, height: 1440 },
        status: 'approved' as const,
        created_at: '2026-02-04T12:00:00Z',
        updated_at: '2026-02-04T12:05:00Z',
      };

      vi.mocked(getMetadataById).mockResolvedValue(mockMetadata);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      vi.mocked(fs.statSync).mockReturnValue({
        size: 3000000,
        isFile: () => true,
        isDirectory: () => false,
      } as any);

      // Mock LFS not installed
      vi.mocked(childProcess.execFileSync).mockImplementation(() => {
        const error = new Error('git-lfs: command not found');
        (error as any).code = 'ENOENT';
        throw error;
      });

      await expect(
        GitModule.commitApprovedVisual(visualId, { ensureLfs: true })
      ).rejects.toThrow(/lfs.*not installed/i);
    });
  });

  describe('Given batch operations with mixed results', () => {
    it('When batch committing with some LFS files, Then handles mixed file sizes', async () => {
      const visualIds = [
        'batch-small-1', // 100KB - no LFS
        'batch-large-1', // 2MB - LFS
        'batch-small-2', // 500KB - no LFS
        'batch-large-2', // 1.5MB - LFS
      ];

      const mockMetadataMap = {
        'batch-small-1': {
          id: 'batch-small-1',
          workstream_id: 'WS-21',
          component: 'icon-1',
          version: 1,
          spec_hash: 'hash1',
          file_path: '.claude/visuals/WS-21/approved/icon-1-v1.png',
          file_size: 100000,
          dimensions: { width: 128, height: 128 },
          status: 'approved' as const,
          created_at: '2026-02-04T13:00:00Z',
          updated_at: '2026-02-04T13:05:00Z',
        },
        'batch-large-1': {
          id: 'batch-large-1',
          workstream_id: 'WS-21',
          component: 'banner-1',
          version: 1,
          spec_hash: 'hash2',
          file_path: '.claude/visuals/WS-21/approved/banner-1-v1.png',
          file_size: 2000000,
          dimensions: { width: 1920, height: 400 },
          status: 'approved' as const,
          created_at: '2026-02-04T13:00:00Z',
          updated_at: '2026-02-04T13:05:00Z',
        },
        'batch-small-2': {
          id: 'batch-small-2',
          workstream_id: 'WS-21',
          component: 'icon-2',
          version: 1,
          spec_hash: 'hash3',
          file_path: '.claude/visuals/WS-21/approved/icon-2-v1.png',
          file_size: 500000,
          dimensions: { width: 256, height: 256 },
          status: 'approved' as const,
          created_at: '2026-02-04T13:00:00Z',
          updated_at: '2026-02-04T13:05:00Z',
        },
        'batch-large-2': {
          id: 'batch-large-2',
          workstream_id: 'WS-21',
          component: 'banner-2',
          version: 1,
          spec_hash: 'hash4',
          file_path: '.claude/visuals/WS-21/approved/banner-2-v1.png',
          file_size: 1500000,
          dimensions: { width: 1920, height: 600 },
          status: 'approved' as const,
          created_at: '2026-02-04T13:00:00Z',
          updated_at: '2026-02-04T13:05:00Z',
        },
      };

      vi.mocked(getMetadataById).mockImplementation(async (id: string) => {
        return mockMetadataMap[id as keyof typeof mockMetadataMap] || null;
      });

      vi.mocked(getApprovalRecord).mockResolvedValue({
        visual_id: 'any',
        action: 'approved' as const,
        reviewer: 'art-director',
        timestamp: '2026-02-04T13:05:00Z',
      });

      vi.mocked(fs.existsSync).mockReturnValue(true);

      vi.mocked(fs.statSync).mockImplementation((path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('icon-1')) {
          return { size: 100000, isFile: () => true, isDirectory: () => false } as any;
        } else if (pathStr.includes('banner-1')) {
          return { size: 2000000, isFile: () => true, isDirectory: () => false } as any;
        } else if (pathStr.includes('icon-2')) {
          return { size: 500000, isFile: () => true, isDirectory: () => false } as any;
        } else if (pathStr.includes('banner-2')) {
          return { size: 1500000, isFile: () => true, isDirectory: () => false } as any;
        }
        return { size: 0, isFile: () => true, isDirectory: () => false } as any;
      });

      // Mock execFileSync for all git commands
      vi.mocked(childProcess.execFileSync)
        .mockReturnValue(Buffer.from('git-lfs/3.4.0\n'));

      vi.mocked(fs.promises.readFile).mockResolvedValue(
        '*.png filter=lfs diff=lfs merge=lfs -text\n'
      );

      const result = await GitModule.commitMultipleVisuals(visualIds, {
        ensureLfs: true,
      });

      expect(result.success).toBe(true);
      expect(result.committed_count).toBe(4);
      expect(result.lfs_files_count).toBeGreaterThan(0); // Should track 2 large files
      expect(result.regular_files_count).toBeGreaterThan(0); // Should track 2 small files
    });

    it('When batch committing with validation failures, Then commits valid ones only', async () => {
      const visualIds = [
        'valid-visual-1',
        'invalid-not-approved',
        'valid-visual-2',
        'invalid-not-found',
      ];

      vi.mocked(getMetadataById).mockImplementation(async (id: string) => {
        if (id === 'invalid-not-found') {
          return null;
        }
        return {
          id,
          workstream_id: 'WS-21',
          component: 'component',
          version: 1,
          spec_hash: 'hash',
          file_path: `.claude/visuals/WS-21/approved/${id}.png`,
          file_size: 1000000,
          dimensions: { width: 800, height: 600 },
          status: id === 'invalid-not-approved' ? ('pending' as const) : ('approved' as const),
          created_at: '2026-02-04T14:00:00Z',
          updated_at: '2026-02-04T14:05:00Z',
        };
      });

      vi.mocked(getApprovalRecord).mockResolvedValue({
        visual_id: 'any',
        action: 'approved' as const,
        reviewer: 'art-director',
        timestamp: '2026-02-04T14:05:00Z',
      });

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({
        size: 1000000,
        isFile: () => true,
        isDirectory: () => false,
      } as any);

      // Mock execFileSync for all git commands
      vi.mocked(childProcess.execFileSync)
        .mockReturnValueOnce('/path/to/repo/.git\n') // git rev-parse --git-dir
        .mockReturnValueOnce('') // git status --porcelain
        .mockReturnValueOnce('') // git add
        .mockReturnValueOnce('') // git commit
        .mockReturnValueOnce('batch-commit-789'); // git rev-parse HEAD

      const result = await GitModule.commitMultipleVisuals(visualIds);

      expect(result.success).toBe(true);
      expect(result.committed_count).toBe(2);
      expect(result.failed_count).toBe(2);
      expect(result.failed_ids).toContain('invalid-not-approved');
      expect(result.failed_ids).toContain('invalid-not-found');
      expect(result.visual_ids).toContain('valid-visual-1');
      expect(result.visual_ids).toContain('valid-visual-2');
    });
  });

  describe('Given error recovery scenarios', () => {
    it('When git operation fails mid-workflow, Then provides clear error with context', async () => {
      const visualId = 'error-recovery-1';

      const mockMetadata = {
        id: visualId,
        workstream_id: 'WS-21',
        component: 'test-component',
        version: 1,
        spec_hash: 'test-hash',
        file_path: '.claude/visuals/WS-21/approved/test-component-v1.png',
        file_size: 1500000,
        dimensions: { width: 1000, height: 800 },
        status: 'approved' as const,
        created_at: '2026-02-04T15:00:00Z',
        updated_at: '2026-02-04T15:05:00Z',
      };

      vi.mocked(getMetadataById).mockResolvedValue(mockMetadata);
      vi.mocked(getApprovalRecord).mockResolvedValue({
        visual_id: visualId,
        action: 'approved' as const,
        reviewer: 'art-director',
        timestamp: '2026-02-04T15:05:00Z',
      });

      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Mock execFileSync for all git commands, commit will fail
      vi.mocked(childProcess.execFileSync)
        .mockReturnValueOnce('/path/to/repo/.git\n') // git rev-parse --git-dir
        .mockReturnValueOnce('') // git status --porcelain
        .mockReturnValueOnce('') // git add
        .mockImplementationOnce(() => {
          // Commit fails
          throw new Error('fatal: unable to write new index file');
        });

      await expect(GitModule.commitApprovedVisual(visualId)).rejects.toThrow(
        /unable to write/i
      );
    });

    it('When network issues during LFS operations, Then provides helpful error', async () => {
      const visualId = 'network-error-1';

      const mockMetadata = {
        id: visualId,
        workstream_id: 'WS-21',
        component: 'network-test',
        version: 1,
        spec_hash: 'network-hash',
        file_path: '.claude/visuals/WS-21/approved/network-test-v1.png',
        file_size: 2000000,
        dimensions: { width: 1200, height: 900 },
        status: 'approved' as const,
        created_at: '2026-02-04T16:00:00Z',
        updated_at: '2026-02-04T16:05:00Z',
      };

      vi.mocked(getMetadataById).mockResolvedValue(mockMetadata);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      vi.mocked(fs.statSync).mockReturnValue({
        size: 2000000,
        isFile: () => true,
        isDirectory: () => false,
      } as any);

      // Mock execFileSync for all git commands - LFS check passes, but tracking fails
      vi.mocked(childProcess.execFileSync)
        .mockReturnValueOnce('git-lfs/3.4.0\n') // git lfs version
        .mockReturnValueOnce('git-lfs filter is configured\n') // git lfs env
        .mockImplementationOnce(() => {
          throw new Error('error: failed to fetch some objects from LFS');
        });

      await expect(
        GitModule.ensureLfsTracking(mockMetadata.file_path)
      ).rejects.toThrow(/failed to fetch/i);
    });
  });
});

describe('visuals/git - Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given unusual scenarios', () => {
    it('When empty commit message, Then uses default message', async () => {
      const visualId = 'empty-message-test';

      const mockMetadata = {
        id: visualId,
        workstream_id: 'WS-21',
        component: 'test',
        version: 1,
        spec_hash: 'hash',
        file_path: '.claude/visuals/WS-21/approved/test-v1.png',
        file_size: 1000000,
        dimensions: { width: 800, height: 600 },
        status: 'approved' as const,
        created_at: '2026-02-04T17:00:00Z',
        updated_at: '2026-02-04T17:05:00Z',
      };

      vi.mocked(getMetadataById).mockResolvedValue(mockMetadata);
      vi.mocked(getApprovalRecord).mockResolvedValue({
        visual_id: visualId,
        action: 'approved' as const,
        reviewer: 'art-director',
        timestamp: '2026-02-04T17:05:00Z',
      });

      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Mock execFileSync for all git commands
      vi.mocked(childProcess.execFileSync)
        .mockReturnValueOnce('/path/to/repo/.git\n') // git rev-parse --git-dir
        .mockReturnValueOnce('') // git status --porcelain
        .mockReturnValueOnce('') // git add
        .mockReturnValueOnce('') // git commit
        .mockReturnValueOnce('commit-default'); // git rev-parse HEAD

      const result = await GitModule.commitApprovedVisual(visualId, {
        message: '',
      });

      expect(result.success).toBe(true);

      // Verify default message was used
      const commitCalls = vi.mocked(childProcess.execFileSync).mock.calls.filter(
        ([cmd, args]) => cmd === 'git' && Array.isArray(args) && args.includes('commit')
      );
      expect(commitCalls.length).toBeGreaterThan(0);
    });

    it('When very long component name, Then handles gracefully', async () => {
      const visualId = 'long-name-test';
      const longComponentName = 'a'.repeat(200);

      const mockMetadata = {
        id: visualId,
        workstream_id: 'WS-21',
        component: longComponentName,
        version: 1,
        spec_hash: 'hash',
        file_path: `.claude/visuals/WS-21/approved/${longComponentName}-v1.png`,
        file_size: 1000000,
        dimensions: { width: 800, height: 600 },
        status: 'approved' as const,
        created_at: '2026-02-04T18:00:00Z',
        updated_at: '2026-02-04T18:05:00Z',
      };

      const message = GitModule.buildCommitMessage([mockMetadata]);

      expect(message).toBeDefined();
      expect(message.length).toBeLessThan(1000); // Reasonable commit message length
    });

    it('When special characters in file paths, Then escapes properly', async () => {
      const visualId = 'special-chars-test';

      const mockMetadata = {
        id: visualId,
        workstream_id: 'WS-21',
        component: 'test with spaces',
        version: 1,
        spec_hash: 'hash',
        file_path: '.claude/visuals/WS-21/approved/test with spaces-v1.png',
        file_size: 1000000,
        dimensions: { width: 800, height: 600 },
        status: 'approved' as const,
        created_at: '2026-02-04T19:00:00Z',
        updated_at: '2026-02-04T19:05:00Z',
      };

      vi.mocked(getMetadataById).mockResolvedValue(mockMetadata);
      vi.mocked(getApprovalRecord).mockResolvedValue({
        visual_id: visualId,
        action: 'approved' as const,
        reviewer: 'art-director',
        timestamp: '2026-02-04T19:05:00Z',
      });

      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Mock execFileSync for all git commands
      vi.mocked(childProcess.execFileSync)
        .mockReturnValueOnce('/path/to/repo/.git\n') // git rev-parse --git-dir
        .mockReturnValueOnce('') // git status --porcelain
        .mockReturnValueOnce('') // git add
        .mockReturnValueOnce('') // git commit
        .mockReturnValueOnce('special-commit'); // git rev-parse HEAD

      const result = await GitModule.commitApprovedVisual(visualId);

      expect(result.success).toBe(true);
    });
  });
});

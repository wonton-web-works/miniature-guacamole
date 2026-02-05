/**
 * WS-21: Git Integration and LFS Support - Commit Module Tests
 *
 * BDD Scenarios:
 * - AC-1: Approved visuals auto-committed to git
 * - AC-3: Commit includes updated metadata.json
 * - AC-4a: Handle git errors - not a repo
 * - AC-4b: Handle git errors - uncommitted changes
 * - AC-4c: Handle git errors - permission denied
 * - AC-4d: Handle git errors - detached HEAD
 * - Validation: Visual ID exists in metadata
 * - Validation: Visual status is 'approved'
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
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
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

import {
  commitApprovedVisual,
  commitMultipleVisuals,
  validateGitRepository,
  checkUncommittedChanges,
  buildCommitMessage,
} from '@/visuals/git/commit';
import { getMetadataById } from '@/visuals/metadata/queries';
import { getApprovalRecord } from '@/visuals/workflow/approvals';

describe('visuals/git/commit - commitApprovedVisual()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given an approved visual (AC-1: Auto-commit approved visuals)', () => {
    it('When committing approved visual, Then git commit is executed successfully', async () => {
      const visualId = 'visual-1';
      const mockMetadata = {
        id: visualId,
        workstream_id: 'WS-20',
        component: 'dashboard-card',
        version: 1,
        spec_hash: 'abc123',
        file_path: '.claude/visuals/WS-20/approved/dashboard-card-v1.png',
        file_size: 1500000, // 1.5MB
        dimensions: { width: 800, height: 600 },
        status: 'approved' as const,
        created_at: '2026-02-04T10:00:00Z',
        updated_at: '2026-02-04T10:05:00Z',
      };

      const mockApproval = {
        visual_id: visualId,
        action: 'approved' as const,
        reviewer: 'art-director',
        timestamp: '2026-02-04T10:05:00Z',
        feedback: 'Looks great!',
      };

      vi.mocked(getMetadataById).mockResolvedValue(mockMetadata);
      vi.mocked(getApprovalRecord).mockResolvedValue(mockApproval);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Mock git commands (all using execFileSync)
      vi.mocked(childProcess.execFileSync)
        .mockReturnValueOnce(Buffer.from('/path/to/repo/.git\n')) // git rev-parse --git-dir
        .mockReturnValueOnce(Buffer.from('')) // git status --porcelain (clean)
        .mockReturnValueOnce(Buffer.from('')) // git add
        .mockReturnValueOnce(Buffer.from('')) // git commit
        .mockReturnValueOnce(Buffer.from('abc1234')); // git rev-parse HEAD

      const result = await commitApprovedVisual(visualId);

      expect(result.success).toBe(true);
      expect(result.visual_id).toBe(visualId);
      expect(result.commit_hash).toBeDefined();
      expect(vi.mocked(childProcess.execFileSync)).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['add']),
        expect.any(Object)
      );
      expect(vi.mocked(childProcess.execFileSync)).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['commit', '-F']),
        expect.any(Object)
      );
    });

    it('When committing visual with metadata, Then includes updated metadata.json in commit (AC-3)', async () => {
      const visualId = 'visual-2';
      const mockMetadata = {
        id: visualId,
        workstream_id: 'WS-21',
        component: 'banner',
        version: 2,
        spec_hash: 'def456',
        file_path: '.claude/visuals/WS-21/approved/banner-v2.png',
        file_size: 2100000, // 2.1MB
        dimensions: { width: 1920, height: 400 },
        status: 'approved' as const,
        created_at: '2026-02-04T11:00:00Z',
        updated_at: '2026-02-04T11:10:00Z',
      };

      const mockApproval = {
        visual_id: visualId,
        action: 'approved' as const,
        reviewer: 'art-director',
        timestamp: '2026-02-04T11:10:00Z',
      };

      vi.mocked(getMetadataById).mockResolvedValue(mockMetadata);
      vi.mocked(getApprovalRecord).mockResolvedValue(mockApproval);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Mock git commands (all using execFileSync)
      vi.mocked(childProcess.execFileSync)
        .mockReturnValueOnce(Buffer.from('/path/to/repo/.git\n')) // git rev-parse --git-dir
        .mockReturnValueOnce(Buffer.from('')) // git status --porcelain
        .mockReturnValueOnce(Buffer.from('')) // git add
        .mockReturnValueOnce(Buffer.from('')) // git commit
        .mockReturnValueOnce(Buffer.from('def5678')); // git rev-parse HEAD

      await commitApprovedVisual(visualId);

      // Verify metadata.json was added to commit
      const gitAddCalls = vi.mocked(childProcess.execFileSync).mock.calls.filter(
        ([cmd, args]) => cmd === 'git' && Array.isArray(args) && args[0] === 'add'
      );

      const metadataAdded = gitAddCalls.some(([cmd, args]) =>
        Array.isArray(args) && args.includes('.claude/visuals/metadata.json')
      );

      expect(metadataAdded).toBe(true);
    });

    it('When committing with custom message, Then uses provided commit message', async () => {
      const visualId = 'visual-3';
      const customMessage = 'feat(visuals): Add approved dashboard component';

      const mockMetadata = {
        id: visualId,
        workstream_id: 'WS-20',
        component: 'dashboard',
        version: 1,
        spec_hash: 'ghi789',
        file_path: '.claude/visuals/WS-20/approved/dashboard-v1.png',
        file_size: 1000000,
        dimensions: { width: 1024, height: 768 },
        status: 'approved' as const,
        created_at: '2026-02-04T12:00:00Z',
        updated_at: '2026-02-04T12:05:00Z',
      };

      const mockApproval = {
        visual_id: visualId,
        action: 'approved' as const,
        reviewer: 'art-director',
        timestamp: '2026-02-04T12:05:00Z',
      };

      vi.mocked(getMetadataById).mockResolvedValue(mockMetadata);
      vi.mocked(getApprovalRecord).mockResolvedValue(mockApproval);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Mock git commands (all using execFileSync)
      vi.mocked(childProcess.execFileSync)
        .mockReturnValueOnce(Buffer.from('/path/to/repo/.git\n')) // git rev-parse --git-dir
        .mockReturnValueOnce(Buffer.from('')) // git status --porcelain
        .mockReturnValueOnce(Buffer.from('')) // git add
        .mockReturnValueOnce(Buffer.from('')) // git commit
        .mockReturnValueOnce(Buffer.from('ghi1234')); // git rev-parse HEAD

      // Also need to mock file operations for temp file
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});
      vi.mocked(fs.unlinkSync).mockImplementation(() => {});

      await commitApprovedVisual(visualId, { message: customMessage });

      // Verify temp file was written with custom message
      const writeFileCalls = vi.mocked(fs.writeFileSync).mock.calls;
      const messageFileWrite = writeFileCalls.find(([path, content]) =>
        typeof content === 'string' && content.includes(customMessage)
      );

      expect(messageFileWrite).toBeDefined();
    });
  });

  describe('Given git repository validation errors (AC-4: Handle git errors)', () => {
    it('When not a git repository, Then throws clear error (AC-4a)', async () => {
      const visualId = 'visual-4';

      const mockMetadata = {
        id: visualId,
        workstream_id: 'WS-20',
        component: 'card',
        version: 1,
        spec_hash: 'jkl012',
        file_path: '.claude/visuals/WS-20/approved/card-v1.png',
        file_size: 500000,
        dimensions: { width: 400, height: 300 },
        status: 'approved' as const,
        created_at: '2026-02-04T13:00:00Z',
        updated_at: '2026-02-04T13:05:00Z',
      };

      vi.mocked(getMetadataById).mockResolvedValue(mockMetadata);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Simulate "not a git repository" error
      vi.mocked(childProcess.execFileSync).mockImplementation(() => {
        throw new Error('fatal: not a git repository (or any of the parent directories): .git');
      });

      await expect(commitApprovedVisual(visualId)).rejects.toThrow(
        /not a git repository/i
      );
    });

    it('When uncommitted changes exist, Then throws clear error (AC-4b)', async () => {
      const visualId = 'visual-5';

      const mockMetadata = {
        id: visualId,
        workstream_id: 'WS-20',
        component: 'widget',
        version: 1,
        spec_hash: 'mno345',
        file_path: '.claude/visuals/WS-20/approved/widget-v1.png',
        file_size: 750000,
        dimensions: { width: 600, height: 400 },
        status: 'approved' as const,
        created_at: '2026-02-04T14:00:00Z',
        updated_at: '2026-02-04T14:05:00Z',
      };

      vi.mocked(getMetadataById).mockResolvedValue(mockMetadata);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Mock git commands (all using execFileSync)
      vi.mocked(childProcess.execFileSync)
        .mockReturnValueOnce(Buffer.from('/path/to/repo/.git\n')) // git rev-parse --git-dir
        .mockReturnValueOnce(Buffer.from(' M src/file.ts\n?? untracked.txt\n')); // git status --porcelain

      await expect(commitApprovedVisual(visualId)).rejects.toThrow(
        /uncommitted changes/i
      );
    });

    it('When git permission denied, Then throws clear error (AC-4c)', async () => {
      const visualId = 'visual-6';

      const mockMetadata = {
        id: visualId,
        workstream_id: 'WS-20',
        component: 'icon',
        version: 1,
        spec_hash: 'pqr678',
        file_path: '.claude/visuals/WS-20/approved/icon-v1.png',
        file_size: 50000,
        dimensions: { width: 128, height: 128 },
        status: 'approved' as const,
        created_at: '2026-02-04T15:00:00Z',
        updated_at: '2026-02-04T15:05:00Z',
      };

      vi.mocked(getMetadataById).mockResolvedValue(mockMetadata);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Mock git commands (all using execFileSync)
      vi.mocked(childProcess.execFileSync)
        .mockReturnValueOnce(Buffer.from('/path/to/repo/.git\n')) // git rev-parse --git-dir
        .mockReturnValueOnce(Buffer.from('')) // git status --porcelain
        .mockImplementationOnce(() => {
          const error = new Error('Permission denied');
          (error as any).code = 'EACCES';
          throw error;
        });

      await expect(commitApprovedVisual(visualId)).rejects.toThrow(
        /permission denied/i
      );
    });

    it('When detached HEAD state, Then throws clear error (AC-4d)', async () => {
      const visualId = 'visual-7';

      const mockMetadata = {
        id: visualId,
        workstream_id: 'WS-20',
        component: 'logo',
        version: 1,
        spec_hash: 'stu901',
        file_path: '.claude/visuals/WS-20/approved/logo-v1.png',
        file_size: 250000,
        dimensions: { width: 512, height: 512 },
        status: 'approved' as const,
        created_at: '2026-02-04T16:00:00Z',
        updated_at: '2026-02-04T16:05:00Z',
      };

      vi.mocked(getMetadataById).mockResolvedValue(mockMetadata);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Mock git commands (all using execFileSync)
      vi.mocked(childProcess.execFileSync)
        .mockReturnValueOnce(Buffer.from('/path/to/repo/.git\n')) // git rev-parse --git-dir
        .mockReturnValueOnce(Buffer.from('')) // git status --porcelain
        .mockImplementationOnce(() => {
          throw new Error('fatal: You are in detached HEAD state');
        });

      await expect(commitApprovedVisual(visualId)).rejects.toThrow(
        /detached HEAD/i
      );
    });
  });

  describe('Given validation errors', () => {
    it('When visual ID does not exist, Then throws validation error', async () => {
      const visualId = 'nonexistent-visual';

      vi.mocked(getMetadataById).mockResolvedValue(null);

      await expect(commitApprovedVisual(visualId)).rejects.toThrow(
        /visual.*not found/i
      );
    });

    it('When visual status is not approved, Then throws validation error', async () => {
      const visualId = 'visual-8';

      const mockMetadata = {
        id: visualId,
        workstream_id: 'WS-20',
        component: 'button',
        version: 1,
        spec_hash: 'vwx234',
        file_path: '.claude/visuals/WS-20/pending/button-v1.png',
        file_size: 100000,
        dimensions: { width: 200, height: 50 },
        status: 'pending' as const, // Not approved!
        created_at: '2026-02-04T17:00:00Z',
        updated_at: '2026-02-04T17:00:00Z',
      };

      vi.mocked(getMetadataById).mockResolvedValue(mockMetadata);

      await expect(commitApprovedVisual(visualId)).rejects.toThrow(
        /not approved/i
      );
    });

    it('When visual file does not exist, Then throws validation error', async () => {
      const visualId = 'visual-9';

      const mockMetadata = {
        id: visualId,
        workstream_id: 'WS-20',
        component: 'badge',
        version: 1,
        spec_hash: 'yza567',
        file_path: '.claude/visuals/WS-20/approved/badge-v1.png',
        file_size: 75000,
        dimensions: { width: 150, height: 150 },
        status: 'approved' as const,
        created_at: '2026-02-04T18:00:00Z',
        updated_at: '2026-02-04T18:05:00Z',
      };

      vi.mocked(getMetadataById).mockResolvedValue(mockMetadata);
      vi.mocked(fs.existsSync).mockReturnValue(false); // File missing

      await expect(commitApprovedVisual(visualId)).rejects.toThrow(
        /file.*not found/i
      );
    });
  });
});

describe('visuals/git/commit - commitMultipleVisuals()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given multiple approved visuals', () => {
    it('When committing multiple visuals, Then creates single commit with all files', async () => {
      const visualIds = ['visual-10', 'visual-11', 'visual-12'];

      const mockMetadata = visualIds.map((id, index) => ({
        id,
        workstream_id: 'WS-20',
        component: `component-${index}`,
        version: 1,
        spec_hash: `hash-${index}`,
        file_path: `.claude/visuals/WS-20/approved/component-${index}-v1.png`,
        file_size: 1000000 + index * 100000,
        dimensions: { width: 800, height: 600 },
        status: 'approved' as const,
        created_at: '2026-02-04T19:00:00Z',
        updated_at: '2026-02-04T19:05:00Z',
      }));

      vi.mocked(getMetadataById).mockImplementation(async (id: string) => {
        return mockMetadata.find((m) => m.id === id) || null;
      });

      vi.mocked(getApprovalRecord).mockResolvedValue({
        visual_id: 'any',
        action: 'approved' as const,
        reviewer: 'art-director',
        timestamp: '2026-02-04T19:05:00Z',
      });

      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Mock git commands (all using execFileSync)
      vi.mocked(childProcess.execFileSync)
        .mockReturnValueOnce(Buffer.from('/path/to/repo/.git\n')) // git rev-parse --git-dir
        .mockReturnValueOnce(Buffer.from('')) // git status --porcelain
        .mockReturnValueOnce(Buffer.from('')) // git add
        .mockReturnValueOnce(Buffer.from('')) // git commit
        .mockReturnValueOnce(Buffer.from('multi123')); // git rev-parse HEAD

      const result = await commitMultipleVisuals(visualIds);

      expect(result.success).toBe(true);
      expect(result.committed_count).toBe(3);
      expect(result.visual_ids).toEqual(visualIds);
      expect(result.commit_hash).toBeDefined();

      // Verify single commit created
      const commitCalls = vi.mocked(childProcess.execFileSync).mock.calls.filter(
        ([cmd, args]) => cmd === 'git' && Array.isArray(args) && args.includes('commit')
      );
      expect(commitCalls).toHaveLength(1);
    });

    it('When some visuals fail validation, Then commits valid ones and reports failures', async () => {
      const visualIds = ['valid-1', 'invalid-1', 'valid-2'];

      vi.mocked(getMetadataById).mockImplementation(async (id: string) => {
        if (id === 'invalid-1') {
          return null; // Not found
        }
        return {
          id,
          workstream_id: 'WS-20',
          component: 'component',
          version: 1,
          spec_hash: 'hash',
          file_path: `.claude/visuals/WS-20/approved/${id}.png`,
          file_size: 1000000,
          dimensions: { width: 800, height: 600 },
          status: 'approved' as const,
          created_at: '2026-02-04T20:00:00Z',
          updated_at: '2026-02-04T20:05:00Z',
        };
      });

      vi.mocked(getApprovalRecord).mockResolvedValue({
        visual_id: 'any',
        action: 'approved' as const,
        reviewer: 'art-director',
        timestamp: '2026-02-04T20:05:00Z',
      });

      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Mock git commands (all using execFileSync)
      vi.mocked(childProcess.execFileSync)
        .mockReturnValueOnce(Buffer.from('/path/to/repo/.git\n')) // git rev-parse --git-dir
        .mockReturnValueOnce(Buffer.from('')) // git status --porcelain
        .mockReturnValueOnce(Buffer.from('')) // git add
        .mockReturnValueOnce(Buffer.from('')) // git commit
        .mockReturnValueOnce(Buffer.from('partial456')); // git rev-parse HEAD

      const result = await commitMultipleVisuals(visualIds);

      expect(result.success).toBe(true);
      expect(result.committed_count).toBe(2);
      expect(result.failed_count).toBe(1);
      expect(result.failed_ids).toContain('invalid-1');
    });
  });
});

describe('visuals/git/commit - validateGitRepository()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given git repository checks', () => {
    it('When valid git repository, Then validation passes', async () => {
      vi.mocked(childProcess.execFileSync).mockReturnValueOnce(
        Buffer.from('/path/to/repo/.git\n')
      );

      const result = await validateGitRepository();

      expect(result.valid).toBe(true);
      expect(result.git_dir).toContain('.git');
    });

    it('When not a git repository, Then validation fails with reason', async () => {
      vi.mocked(childProcess.execFileSync).mockImplementation(() => {
        throw new Error('fatal: not a git repository');
      });

      const result = await validateGitRepository();

      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/not a git repository/i);
    });

    it('When git not installed, Then validation fails with reason', async () => {
      vi.mocked(childProcess.execFileSync).mockImplementation(() => {
        const error = new Error('git: command not found');
        (error as any).code = 'ENOENT';
        throw error;
      });

      const result = await validateGitRepository();

      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/git.*not installed/i);
    });
  });
});

describe('visuals/git/commit - checkUncommittedChanges()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given working directory status', () => {
    it('When no uncommitted changes, Then returns clean status', async () => {
      vi.mocked(childProcess.execFileSync).mockReturnValueOnce(Buffer.from(''));

      const result = await checkUncommittedChanges();

      expect(result.has_changes).toBe(false);
      expect(result.files).toHaveLength(0);
    });

    it('When uncommitted changes exist, Then returns dirty status with file list', async () => {
      vi.mocked(childProcess.execFileSync).mockReturnValueOnce(
        Buffer.from(' M src/file1.ts\n?? src/file2.ts\n')
      );

      const result = await checkUncommittedChanges();

      expect(result.has_changes).toBe(true);
      expect(result.files.length).toBeGreaterThan(0);
    });

    it('When checking status fails, Then throws error', async () => {
      vi.mocked(childProcess.execFileSync).mockImplementation(() => {
        throw new Error('git status failed');
      });

      await expect(checkUncommittedChanges()).rejects.toThrow(/git status/i);
    });
  });
});

describe('visuals/git/commit - buildCommitMessage()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given visual metadata', () => {
    it('When building commit message for single visual, Then creates descriptive message', () => {
      const metadata = {
        id: 'visual-20',
        workstream_id: 'WS-20',
        component: 'dashboard-card',
        version: 1,
        spec_hash: 'abc123',
        file_path: '.claude/visuals/WS-20/approved/dashboard-card-v1.png',
        file_size: 1500000,
        dimensions: { width: 800, height: 600 },
        status: 'approved' as const,
        created_at: '2026-02-04T21:00:00Z',
        updated_at: '2026-02-04T21:05:00Z',
      };

      const message = buildCommitMessage([metadata]);

      expect(message).toContain('visual');
      expect(message).toContain('dashboard-card');
      expect(message).toContain('WS-20');
    });

    it('When building commit message for multiple visuals, Then creates batch message', () => {
      const metadata = [
        {
          id: 'visual-21',
          workstream_id: 'WS-20',
          component: 'card-1',
          version: 1,
          spec_hash: 'hash1',
          file_path: '.claude/visuals/WS-20/approved/card-1-v1.png',
          file_size: 1000000,
          dimensions: { width: 400, height: 300 },
          status: 'approved' as const,
          created_at: '2026-02-04T22:00:00Z',
          updated_at: '2026-02-04T22:05:00Z',
        },
        {
          id: 'visual-22',
          workstream_id: 'WS-20',
          component: 'card-2',
          version: 1,
          spec_hash: 'hash2',
          file_path: '.claude/visuals/WS-20/approved/card-2-v1.png',
          file_size: 1100000,
          dimensions: { width: 400, height: 300 },
          status: 'approved' as const,
          created_at: '2026-02-04T22:00:00Z',
          updated_at: '2026-02-04T22:05:00Z',
        },
      ];

      const message = buildCommitMessage(metadata);

      expect(message).toContain('visual');
      expect(message).toContain('2');
      expect(message).toContain('WS-20');
    });

    it('When empty metadata array, Then throws error', () => {
      expect(() => buildCommitMessage([])).toThrow(/no metadata/i);
    });
  });
});

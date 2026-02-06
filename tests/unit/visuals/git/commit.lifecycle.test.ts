/**
 * WS-MEM-1: Process Lifecycle and Resource Cleanup
 * Temp File Registry and Cleanup Tests (git/commit.ts lifecycle integration)
 *
 * BDD Scenarios:
 * - AC-4: Temp files matching commit-* pattern are cleaned on exit
 * - Temp files registered in lifecycle registry
 * - Temp files cleaned on graceful shutdown
 * - Temp files NOT cleaned if already deleted
 * - Multiple temp files handled correctly
 * - Integration with lifecycle manager
 *
 * Target: 99% coverage
 *
 * NOTE: These tests are written BEFORE the implementation (TDD).
 * They are expected to FAIL until the commit module is updated
 * to register temp files with the lifecycle manager.
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

// Mock LFS module
vi.mock('@/visuals/git/lfs', () => ({
  shouldUseLfs: vi.fn().mockResolvedValue({ should_use_lfs: false }),
  checkLfsPrerequisites: vi.fn().mockResolvedValue({ ready: true }),
  configureGitAttributes: vi.fn().mockResolvedValue(undefined),
  trackFileWithLfs: vi.fn().mockResolvedValue(undefined),
}));

// Mock security module
vi.mock('@/visuals/git/security', () => ({
  validateVisualPath: vi.fn(),
  validateVisualPaths: vi.fn(),
}));

// Mock lifecycle registration -- this verifies the commit module calls it
vi.mock('@/lifecycle/index', () => ({
  registerTempFile: vi.fn(),
  deregisterTempFile: vi.fn(),
  registerCleanup: vi.fn().mockReturnValue({ id: 'mock-id', name: 'mock', registeredAt: Date.now() }),
  initLifecycle: vi.fn(),
  shutdownLifecycle: vi.fn(),
  getLifecycleStatus: vi.fn(),
}));

import {
  commitApprovedVisual,
  commitMultipleVisuals,
} from '@/visuals/git/commit';
import { getMetadataById } from '@/visuals/metadata/queries';
import { registerTempFile, deregisterTempFile } from '@/lifecycle/index';

describe('visuals/git/commit - Temp File Lifecycle Registration (AC-4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given single visual commit with temp file', () => {
    const visualId = 'visual-lifecycle-1';
    const mockMetadata = {
      id: visualId,
      workstream_id: 'WS-MEM-1',
      component: 'lifecycle-card',
      version: 1,
      spec_hash: 'lc123',
      file_path: '.claude/visuals/WS-MEM-1/approved/lifecycle-card-v1.png',
      file_size: 1500000,
      dimensions: { width: 800, height: 600 },
      status: 'approved' as const,
      created_at: '2026-02-05T10:00:00Z',
      updated_at: '2026-02-05T10:05:00Z',
    };

    it('When creating commit temp file, Then registers it with lifecycle manager', async () => {
      vi.mocked(getMetadataById).mockResolvedValue(mockMetadata);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Mock git commands
      vi.mocked(childProcess.execFileSync)
        .mockReturnValueOnce(Buffer.from('/path/to/repo/.git\n')) // git rev-parse --git-dir
        .mockReturnValueOnce(Buffer.from('')) // git status --porcelain
        .mockReturnValueOnce(Buffer.from('')) // git add
        .mockReturnValueOnce(Buffer.from('')) // git commit
        .mockReturnValueOnce(Buffer.from('abc1234')); // git rev-parse HEAD

      await commitApprovedVisual(visualId);

      // Verify registerTempFile was called with a path matching the commit-* pattern
      expect(registerTempFile).toHaveBeenCalledWith(
        expect.stringMatching(/commit-\d+/)
      );
    });

    it('When commit succeeds and temp file cleaned up, Then deregisters from lifecycle', async () => {
      vi.mocked(getMetadataById).mockResolvedValue(mockMetadata);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      vi.mocked(childProcess.execFileSync)
        .mockReturnValueOnce(Buffer.from('/path/to/repo/.git\n'))
        .mockReturnValueOnce(Buffer.from(''))
        .mockReturnValueOnce(Buffer.from(''))
        .mockReturnValueOnce(Buffer.from(''))
        .mockReturnValueOnce(Buffer.from('abc1234'));

      await commitApprovedVisual(visualId);

      // After successful commit, temp file should be deregistered
      // because commit.ts already cleans up in its finally block
      expect(deregisterTempFile).toHaveBeenCalledWith(
        expect.stringMatching(/commit-\d+/)
      );
    });

    it('When commit fails, Then temp file is still deregistered from lifecycle', async () => {
      vi.mocked(getMetadataById).mockResolvedValue(mockMetadata);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      vi.mocked(childProcess.execFileSync)
        .mockReturnValueOnce(Buffer.from('/path/to/repo/.git\n'))
        .mockReturnValueOnce(Buffer.from(''))
        .mockReturnValueOnce(Buffer.from(''))  // git add
        .mockImplementationOnce(() => {         // git commit FAILS
          throw new Error('Commit failed');
        });

      try {
        await commitApprovedVisual(visualId);
      } catch {
        // Expected to throw
      }

      // Even on failure, temp file should be deregistered
      // because the finally block in commit.ts handles cleanup
      expect(deregisterTempFile).toHaveBeenCalledWith(
        expect.stringMatching(/commit-\d+/)
      );
    });
  });

  describe('Given multiple visual commit with temp files', () => {
    it('When committing multiple visuals, Then registers temp file with lifecycle', async () => {
      const visualIds = ['multi-lc-1', 'multi-lc-2'];

      const mockMetadataList = visualIds.map((id, idx) => ({
        id,
        workstream_id: 'WS-MEM-1',
        component: `component-${idx}`,
        version: 1,
        spec_hash: `hash-${idx}`,
        file_path: `.claude/visuals/WS-MEM-1/approved/component-${idx}-v1.png`,
        file_size: 1000000,
        dimensions: { width: 800, height: 600 },
        status: 'approved' as const,
        created_at: '2026-02-05T11:00:00Z',
        updated_at: '2026-02-05T11:05:00Z',
      }));

      vi.mocked(getMetadataById).mockImplementation(async (id: string) => {
        return mockMetadataList.find(m => m.id === id) || null;
      });

      vi.mocked(fs.existsSync).mockReturnValue(true);

      vi.mocked(childProcess.execFileSync)
        .mockReturnValueOnce(Buffer.from('/path/to/repo/.git\n'))
        .mockReturnValueOnce(Buffer.from(''))
        .mockReturnValueOnce(Buffer.from(''))
        .mockReturnValueOnce(Buffer.from(''))
        .mockReturnValueOnce(Buffer.from('multi123'));

      await commitMultipleVisuals(visualIds);

      // Temp file should be registered for the batch commit
      expect(registerTempFile).toHaveBeenCalledWith(
        expect.stringMatching(/commit-\d+/)
      );
    });

    it('When batch commit succeeds, Then deregisters temp file from lifecycle', async () => {
      const visualIds = ['batch-lc-1', 'batch-lc-2'];

      const mockMetadataList = visualIds.map((id, idx) => ({
        id,
        workstream_id: 'WS-MEM-1',
        component: `batch-${idx}`,
        version: 1,
        spec_hash: `bhash-${idx}`,
        file_path: `.claude/visuals/WS-MEM-1/approved/batch-${idx}-v1.png`,
        file_size: 1000000,
        dimensions: { width: 800, height: 600 },
        status: 'approved' as const,
        created_at: '2026-02-05T12:00:00Z',
        updated_at: '2026-02-05T12:05:00Z',
      }));

      vi.mocked(getMetadataById).mockImplementation(async (id: string) => {
        return mockMetadataList.find(m => m.id === id) || null;
      });

      vi.mocked(fs.existsSync).mockReturnValue(true);

      vi.mocked(childProcess.execFileSync)
        .mockReturnValueOnce(Buffer.from('/path/to/repo/.git\n'))
        .mockReturnValueOnce(Buffer.from(''))
        .mockReturnValueOnce(Buffer.from(''))
        .mockReturnValueOnce(Buffer.from(''))
        .mockReturnValueOnce(Buffer.from('batch456'));

      await commitMultipleVisuals(visualIds);

      expect(deregisterTempFile).toHaveBeenCalledWith(
        expect.stringMatching(/commit-\d+/)
      );
    });
  });
});

describe('visuals/git/commit - Temp File Pattern Verification (AC-4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given temp file naming convention', () => {
    it('When creating temp file for commit, Then filename matches commit-{timestamp}-{random}.txt pattern', async () => {
      const visualId = 'pattern-visual';
      const mockMetadata = {
        id: visualId,
        workstream_id: 'WS-MEM-1',
        component: 'pattern-test',
        version: 1,
        spec_hash: 'pt123',
        file_path: '.claude/visuals/WS-MEM-1/approved/pattern-test-v1.png',
        file_size: 500000,
        dimensions: { width: 400, height: 300 },
        status: 'approved' as const,
        created_at: '2026-02-05T13:00:00Z',
        updated_at: '2026-02-05T13:05:00Z',
      };

      vi.mocked(getMetadataById).mockResolvedValue(mockMetadata);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      vi.mocked(childProcess.execFileSync)
        .mockReturnValueOnce(Buffer.from('/path/to/repo/.git\n'))
        .mockReturnValueOnce(Buffer.from(''))
        .mockReturnValueOnce(Buffer.from(''))
        .mockReturnValueOnce(Buffer.from(''))
        .mockReturnValueOnce(Buffer.from('pat1234'));

      await commitApprovedVisual(visualId);

      // Check that writeFileSync was called with a temp file path
      const writeFileCalls = vi.mocked(fs.writeFileSync).mock.calls;
      const tempFileCall = writeFileCalls.find(([path]) =>
        typeof path === 'string' && path.includes('commit-')
      );
      expect(tempFileCall).toBeDefined();

      // Verify the path is in os.tmpdir()
      const tmpPath = tempFileCall![0] as string;
      expect(tmpPath).toMatch(/commit-\d+-[\d.]+\.txt$/);
    });
  });

  describe('Given temp file cleanup in finally block', () => {
    it('When commit succeeds, Then temp file is deleted by finally block', async () => {
      const visualId = 'finally-visual';
      const mockMetadata = {
        id: visualId,
        workstream_id: 'WS-MEM-1',
        component: 'finally-test',
        version: 1,
        spec_hash: 'ft123',
        file_path: '.claude/visuals/WS-MEM-1/approved/finally-test-v1.png',
        file_size: 500000,
        dimensions: { width: 400, height: 300 },
        status: 'approved' as const,
        created_at: '2026-02-05T14:00:00Z',
        updated_at: '2026-02-05T14:05:00Z',
      };

      vi.mocked(getMetadataById).mockResolvedValue(mockMetadata);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      vi.mocked(childProcess.execFileSync)
        .mockReturnValueOnce(Buffer.from('/path/to/repo/.git\n'))
        .mockReturnValueOnce(Buffer.from(''))
        .mockReturnValueOnce(Buffer.from(''))
        .mockReturnValueOnce(Buffer.from(''))
        .mockReturnValueOnce(Buffer.from('fin1234'));

      await commitApprovedVisual(visualId);

      // unlinkSync should have been called to clean up the temp file
      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('When process crashes before finally block, Then lifecycle manager cleans temp file', async () => {
      // This is a conceptual test - the lifecycle manager has the temp file
      // registered, so even if the process handling flow is interrupted,
      // the lifecycle signal handler will clean up the file.
      // We verify that registerTempFile is called BEFORE the git commit runs.

      const visualId = 'crash-visual';
      const mockMetadata = {
        id: visualId,
        workstream_id: 'WS-MEM-1',
        component: 'crash-test',
        version: 1,
        spec_hash: 'cr123',
        file_path: '.claude/visuals/WS-MEM-1/approved/crash-test-v1.png',
        file_size: 500000,
        dimensions: { width: 400, height: 300 },
        status: 'approved' as const,
        created_at: '2026-02-05T15:00:00Z',
        updated_at: '2026-02-05T15:05:00Z',
      };

      vi.mocked(getMetadataById).mockResolvedValue(mockMetadata);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Track the order of calls
      const callOrder: string[] = [];

      vi.mocked(registerTempFile as any).mockImplementation((path: string) => {
        callOrder.push('registerTempFile');
      });

      vi.mocked(childProcess.execFileSync)
        .mockReturnValueOnce(Buffer.from('/path/to/repo/.git\n'))
        .mockReturnValueOnce(Buffer.from(''))
        .mockReturnValueOnce(Buffer.from('')) // git add
        .mockImplementationOnce(() => {
          callOrder.push('git-commit');
          return Buffer.from(''); // git commit
        })
        .mockReturnValueOnce(Buffer.from('crash123'));

      await commitApprovedVisual(visualId);

      // registerTempFile should be called BEFORE git commit
      const registerIndex = callOrder.indexOf('registerTempFile');
      const commitIndex = callOrder.indexOf('git-commit');

      expect(registerIndex).toBeLessThan(commitIndex);
    });
  });
});

describe('visuals/git/commit - Orphaned Temp File Handling (Edge cases)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given temp file already deleted', () => {
    it('When finally block tries to clean up, Then handles ENOENT gracefully', async () => {
      const visualId = 'enoent-visual';
      const mockMetadata = {
        id: visualId,
        workstream_id: 'WS-MEM-1',
        component: 'enoent-test',
        version: 1,
        spec_hash: 'en123',
        file_path: '.claude/visuals/WS-MEM-1/approved/enoent-test-v1.png',
        file_size: 500000,
        dimensions: { width: 400, height: 300 },
        status: 'approved' as const,
        created_at: '2026-02-05T16:00:00Z',
        updated_at: '2026-02-05T16:05:00Z',
      };

      vi.mocked(getMetadataById).mockResolvedValue(mockMetadata);

      // existsSync returns true for visual file, but for temp file returns false
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = typeof p === 'string' ? p : p.toString();
        if (pathStr.includes('commit-')) return false; // Temp file already gone
        return true; // Visual file exists
      });

      vi.mocked(childProcess.execFileSync)
        .mockReturnValueOnce(Buffer.from('/path/to/repo/.git\n'))
        .mockReturnValueOnce(Buffer.from(''))
        .mockReturnValueOnce(Buffer.from(''))
        .mockReturnValueOnce(Buffer.from(''))
        .mockReturnValueOnce(Buffer.from('en1234'));

      // Should not throw even if temp file is already gone
      await expect(commitApprovedVisual(visualId)).resolves.toBeDefined();
    });
  });
});

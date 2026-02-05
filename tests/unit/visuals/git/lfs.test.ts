/**
 * WS-21: Git Integration and LFS Support - LFS Module Tests
 *
 * BDD Scenarios:
 * - AC-2: Git LFS tracks PNG files >1MB
 * - AC-5a: LFS prerequisite check - Git LFS installed
 * - AC-5b: LFS prerequisite check - LFS initialized in repo
 * - File size checks (exactly 1MB boundary test)
 * - Configure .gitattributes for PNG tracking
 * - Handle LFS errors gracefully
 *
 * Target: 99% coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as childProcess from 'child_process';
import * as path from 'path';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  statSync: vi.fn(),
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    stat: vi.fn(),
    appendFile: vi.fn(),
  },
}));

// Mock child_process module
vi.mock('child_process', () => ({
  exec: vi.fn(),
  execSync: vi.fn(),
  execFileSync: vi.fn(),
}));

import {
  isLfsInstalled,
  isLfsInitialized,
  checkLfsPrerequisites,
  shouldUseLfs,
  trackFileWithLfs,
  configureGitAttributes,
  ensureLfsTracking,
} from '@/visuals/git/lfs';

describe('visuals/git/lfs - isLfsInstalled()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given Git LFS installation check (AC-5a: Check if Git LFS is installed)', () => {
    it('When Git LFS is installed, Then returns true with version info', async () => {
      vi.mocked(childProcess.execFileSync).mockReturnValueOnce(
        Buffer.from('git-lfs/3.4.0 (GitHub; darwin arm64; go 1.21.0)\n')
      );

      const result = await isLfsInstalled();

      expect(result.installed).toBe(true);
      expect(result.version).toContain('3.4.0');
      expect(vi.mocked(childProcess.execFileSync)).toHaveBeenCalledWith(
        'git',
        ['lfs', 'version'],
        expect.any(Object)
      );
    });

    it('When Git LFS is not installed, Then returns false', async () => {
      vi.mocked(childProcess.execFileSync).mockImplementation(() => {
        const error = new Error('git-lfs: command not found');
        (error as any).code = 'ENOENT';
        throw error;
      });

      const result = await isLfsInstalled();

      expect(result.installed).toBe(false);
      expect(result.version).toBeNull();
    });

    it('When git lfs version command fails, Then returns false', async () => {
      vi.mocked(childProcess.execFileSync).mockImplementation(() => {
        throw new Error('Command failed');
      });

      const result = await isLfsInstalled();

      expect(result.installed).toBe(false);
    });
  });
});

describe('visuals/git/lfs - isLfsInitialized()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given Git LFS repository initialization check (AC-5b: Check if LFS is initialized)', () => {
    it('When LFS is initialized in repo, Then returns true', async () => {
      vi.mocked(childProcess.execFileSync).mockReturnValueOnce(
        Buffer.from('git-lfs filter is configured\n')
      );

      const result = await isLfsInitialized();

      expect(result.initialized).toBe(true);
    });

    it('When LFS is not initialized, Then returns false', async () => {
      vi.mocked(childProcess.execFileSync).mockImplementation(() => {
        throw new Error('Git LFS has not been set up');
      });

      const result = await isLfsInitialized();

      expect(result.initialized).toBe(false);
    });

    it('When checking hooks, Then verifies LFS hooks exist', async () => {
      vi.mocked(childProcess.execFileSync).mockReturnValueOnce(
        Buffer.from('git-lfs filter is configured\n')
      );
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = await isLfsInitialized({ checkHooks: true });

      expect(result.initialized).toBe(true);
      expect(result.hooks_configured).toBe(true);
    });

    it('When LFS initialized but hooks missing, Then returns initialized true with hooks false', async () => {
      vi.mocked(childProcess.execFileSync).mockReturnValueOnce(
        Buffer.from('git-lfs filter is configured\n')
      );
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await isLfsInitialized({ checkHooks: true });

      expect(result.initialized).toBe(true);
      expect(result.hooks_configured).toBe(false);
    });
  });
});

describe('visuals/git/lfs - checkLfsPrerequisites()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given complete LFS prerequisite check', () => {
    it('When all prerequisites met, Then returns success', async () => {
      vi.mocked(childProcess.execFileSync)
        .mockReturnValueOnce(Buffer.from('git-lfs/3.4.0\n'))
        .mockReturnValueOnce(Buffer.from('git-lfs filter is configured\n'));

      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = await checkLfsPrerequisites();

      expect(result.ready).toBe(true);
      expect(result.lfs_installed).toBe(true);
      expect(result.lfs_initialized).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('When LFS not installed, Then returns failure with error', async () => {
      vi.mocked(childProcess.execFileSync).mockImplementation(() => {
        const error = new Error('git-lfs: command not found');
        (error as any).code = 'ENOENT';
        throw error;
      });

      const result = await checkLfsPrerequisites();

      expect(result.ready).toBe(false);
      expect(result.lfs_installed).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toMatch(/not installed/i);
    });

    it('When LFS not initialized, Then returns failure with error', async () => {
      vi.mocked(childProcess.execFileSync)
        .mockReturnValueOnce(Buffer.from('git-lfs/3.4.0\n'))
        .mockImplementation(() => {
          throw new Error('Git LFS has not been set up');
        });

      const result = await checkLfsPrerequisites();

      expect(result.ready).toBe(false);
      expect(result.lfs_installed).toBe(true);
      expect(result.lfs_initialized).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.match(/not initialized/i))).toBe(true);
    });

    it('When neither installed nor initialized, Then returns multiple errors', async () => {
      vi.mocked(childProcess.execFileSync).mockImplementation(() => {
        const error = new Error('Command failed');
        (error as any).code = 'ENOENT';
        throw error;
      });

      const result = await checkLfsPrerequisites();

      expect(result.ready).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

describe('visuals/git/lfs - shouldUseLfs()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given file size checks (AC-2: Check if file size >1MB)', () => {
    it('When file size > 1MB, Then should use LFS', async () => {
      const filePath = '.claude/visuals/WS-20/approved/large-image.png';

      vi.mocked(fs.statSync).mockReturnValue({
        size: 1500000, // 1.5MB
        isFile: () => true,
        isDirectory: () => false,
      } as any);

      const result = await shouldUseLfs(filePath);

      expect(result.should_use_lfs).toBe(true);
      expect(result.file_size).toBe(1500000);
      expect(result.threshold).toBe(1048576); // 1MB in bytes
    });

    it('When file size < 1MB, Then should not use LFS', async () => {
      const filePath = '.claude/visuals/WS-20/approved/small-image.png';

      vi.mocked(fs.statSync).mockReturnValue({
        size: 500000, // 500KB
        isFile: () => true,
        isDirectory: () => false,
      } as any);

      const result = await shouldUseLfs(filePath);

      expect(result.should_use_lfs).toBe(false);
      expect(result.file_size).toBe(500000);
    });

    it('When file size exactly 1MB (boundary test), Then should not use LFS', async () => {
      const filePath = '.claude/visuals/WS-20/approved/exact-1mb.png';

      vi.mocked(fs.statSync).mockReturnValue({
        size: 1048576, // Exactly 1MB
        isFile: () => true,
        isDirectory: () => false,
      } as any);

      const result = await shouldUseLfs(filePath);

      expect(result.should_use_lfs).toBe(false);
      expect(result.file_size).toBe(1048576);
    });

    it('When file size is 1MB + 1 byte (boundary test), Then should use LFS', async () => {
      const filePath = '.claude/visuals/WS-20/approved/just-over-1mb.png';

      vi.mocked(fs.statSync).mockReturnValue({
        size: 1048577, // 1MB + 1 byte
        isFile: () => true,
        isDirectory: () => false,
      } as any);

      const result = await shouldUseLfs(filePath);

      expect(result.should_use_lfs).toBe(true);
      expect(result.file_size).toBe(1048577);
    });

    it('When file does not exist, Then throws error', async () => {
      const filePath = '.claude/visuals/WS-20/approved/missing.png';

      vi.mocked(fs.statSync).mockImplementation(() => {
        const error = new Error('ENOENT: no such file or directory');
        (error as any).code = 'ENOENT';
        throw error;
      });

      await expect(shouldUseLfs(filePath)).rejects.toThrow(/not found/i);
    });

    it('When custom threshold provided, Then uses custom threshold', async () => {
      const filePath = '.claude/visuals/WS-20/approved/image.png';
      const customThreshold = 2 * 1024 * 1024; // 2MB

      vi.mocked(fs.statSync).mockReturnValue({
        size: 1500000, // 1.5MB
        isFile: () => true,
        isDirectory: () => false,
      } as any);

      const result = await shouldUseLfs(filePath, { threshold: customThreshold });

      expect(result.should_use_lfs).toBe(false);
      expect(result.threshold).toBe(customThreshold);
    });
  });

  describe('Given non-PNG files', () => {
    it('When file is not PNG, Then can still check size', async () => {
      const filePath = '.claude/visuals/WS-20/approved/document.pdf';

      vi.mocked(fs.statSync).mockReturnValue({
        size: 2000000, // 2MB
        isFile: () => true,
        isDirectory: () => false,
      } as any);

      const result = await shouldUseLfs(filePath);

      expect(result.should_use_lfs).toBe(true);
      expect(result.file_size).toBe(2000000);
    });
  });
});

describe('visuals/git/lfs - trackFileWithLfs()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given LFS file tracking', () => {
    it('When tracking PNG file, Then executes git lfs track command', async () => {
      const filePath = '.claude/visuals/WS-20/approved/image.png';

      vi.mocked(childProcess.execFileSync).mockReturnValueOnce(
        Buffer.from('Tracking ".claude/visuals/WS-20/approved/image.png"\n')
      );

      const result = await trackFileWithLfs(filePath);

      expect(result.tracked).toBe(true);
      expect(result.file_path).toBe(filePath);
      expect(vi.mocked(childProcess.execFileSync)).toHaveBeenCalledWith(
        'git',
        ['lfs', 'track', filePath],
        expect.any(Object)
      );
    });

    it('When tracking with pattern, Then uses pattern matching', async () => {
      const pattern = '*.png';

      vi.mocked(childProcess.execFileSync).mockReturnValueOnce(
        Buffer.from('Tracking "*.png"\n')
      );

      const result = await trackFileWithLfs(pattern, { usePattern: true });

      expect(result.tracked).toBe(true);
      expect(result.pattern).toBe(pattern);
    });

    it('When tracking fails, Then returns error', async () => {
      const filePath = '.claude/visuals/WS-20/approved/image.png';

      vi.mocked(childProcess.execFileSync).mockImplementation(() => {
        throw new Error('git lfs track failed');
      });

      await expect(trackFileWithLfs(filePath)).rejects.toThrow(/track failed/i);
    });

    it('When LFS not installed, Then throws clear error', async () => {
      const filePath = '.claude/visuals/WS-20/approved/image.png';

      vi.mocked(childProcess.execFileSync).mockImplementation(() => {
        const error = new Error('git-lfs: command not found');
        (error as any).code = 'ENOENT';
        throw error;
      });

      await expect(trackFileWithLfs(filePath)).rejects.toThrow(/not installed/i);
    });
  });
});

describe('visuals/git/lfs - configureGitAttributes()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given .gitattributes configuration (AC-2: Configure .gitattributes for PNG tracking)', () => {
    it('When .gitattributes does not exist, Then creates file with PNG LFS rule', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const result = await configureGitAttributes({ pattern: '*.png' });

      expect(result.configured).toBe(true);
      expect(result.action).toBe('created');
      expect(vi.mocked(fs.promises.writeFile)).toHaveBeenCalledWith(
        expect.stringContaining('.gitattributes'),
        expect.stringContaining('*.png filter=lfs'),
        'utf-8'
      );
    });

    it('When .gitattributes exists without LFS rule, Then appends PNG LFS rule', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(
        '# Existing rules\n*.txt text\n'
      );
      vi.mocked(fs.promises.appendFile).mockResolvedValue(undefined);

      const result = await configureGitAttributes({ pattern: '*.png' });

      expect(result.configured).toBe(true);
      expect(result.action).toBe('updated');
      expect(vi.mocked(fs.promises.appendFile)).toHaveBeenCalledWith(
        expect.stringContaining('.gitattributes'),
        expect.stringContaining('*.png filter=lfs'),
        'utf-8'
      );
    });

    it('When .gitattributes already has PNG LFS rule, Then skips update', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(
        '*.png filter=lfs diff=lfs merge=lfs -text\n'
      );

      const result = await configureGitAttributes({ pattern: '*.png' });

      expect(result.configured).toBe(true);
      expect(result.action).toBe('already_configured');
      expect(vi.mocked(fs.promises.appendFile)).not.toHaveBeenCalled();
    });

    it('When custom pattern provided, Then uses custom pattern', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const customPattern = '.claude/visuals/**/*.png';
      const result = await configureGitAttributes({ pattern: customPattern });

      expect(result.configured).toBe(true);
      expect(vi.mocked(fs.promises.writeFile)).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(customPattern),
        'utf-8'
      );
    });

    it('When multiple patterns provided, Then configures all patterns', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const patterns = ['*.png', '*.jpg', '*.gif'];
      const result = await configureGitAttributes({ patterns });

      expect(result.configured).toBe(true);
      const writeCall = vi.mocked(fs.promises.writeFile).mock.calls[0];
      const content = writeCall[1] as string;

      patterns.forEach(pattern => {
        expect(content).toContain(pattern);
      });
    });

    it('When file write fails, Then throws error', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.promises.writeFile).mockRejectedValue(
        new Error('Permission denied')
      );

      await expect(
        configureGitAttributes({ pattern: '*.png' })
      ).rejects.toThrow(/permission denied/i);
    });
  });
});

describe('visuals/git/lfs - ensureLfsTracking()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given complete LFS setup workflow', () => {
    it('When file requires LFS, Then performs full setup (check, configure, track)', async () => {
      const filePath = '.claude/visuals/WS-20/approved/large-image.png';

      // Mock prerequisites check (now uses execFileSync for git lfs version and git lfs env)
      vi.mocked(childProcess.execFileSync)
        .mockReturnValueOnce(Buffer.from('git-lfs/3.4.0\n'))
        .mockReturnValueOnce(Buffer.from('git-lfs filter is configured\n'))
        .mockReturnValueOnce(Buffer.from('Tracking "*.png"\n'));

      // Mock file size check
      vi.mocked(fs.statSync).mockReturnValue({
        size: 1500000, // 1.5MB
        isFile: () => true,
        isDirectory: () => false,
      } as any);

      // Mock .gitattributes
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(
        '*.png filter=lfs diff=lfs merge=lfs -text\n'
      );

      const result = await ensureLfsTracking(filePath);

      expect(result.lfs_ready).toBe(true);
      expect(result.file_tracked).toBe(true);
      expect(result.prerequisites_met).toBe(true);
      expect(result.gitattributes_configured).toBe(true);
    });

    it('When file does not require LFS, Then skips LFS setup', async () => {
      const filePath = '.claude/visuals/WS-20/approved/small-image.png';

      vi.mocked(fs.statSync).mockReturnValue({
        size: 500000, // 500KB
        isFile: () => true,
        isDirectory: () => false,
      } as any);

      const result = await ensureLfsTracking(filePath);

      expect(result.lfs_ready).toBe(false);
      expect(result.file_requires_lfs).toBe(false);
      expect(result.reason).toMatch(/below threshold/i);
    });

    it('When prerequisites not met, Then returns error without tracking', async () => {
      const filePath = '.claude/visuals/WS-20/approved/large-image.png';

      vi.mocked(fs.statSync).mockReturnValue({
        size: 1500000, // 1.5MB
        isFile: () => true,
        isDirectory: () => false,
      } as any);

      vi.mocked(childProcess.execFileSync).mockImplementation(() => {
        const error = new Error('git-lfs: command not found');
        (error as any).code = 'ENOENT';
        throw error;
      });

      const result = await ensureLfsTracking(filePath);

      expect(result.lfs_ready).toBe(false);
      expect(result.prerequisites_met).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('When force option provided, Then attempts LFS regardless of prerequisites', async () => {
      const filePath = '.claude/visuals/WS-20/approved/image.png';

      vi.mocked(fs.statSync).mockReturnValue({
        size: 500000, // Below threshold
        isFile: () => true,
        isDirectory: () => false,
      } as any);

      vi.mocked(childProcess.execFileSync)
        .mockReturnValueOnce(Buffer.from('git-lfs/3.4.0\n'))
        .mockReturnValueOnce(Buffer.from('git-lfs filter is configured\n'))
        .mockReturnValueOnce(Buffer.from('Tracking file\n'));

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue('*.png filter=lfs\n');

      const result = await ensureLfsTracking(filePath, { force: true });

      expect(result.lfs_ready).toBe(true);
      expect(result.file_tracked).toBe(true);
    });
  });

  describe('Given batch file operations', () => {
    it('When multiple files provided, Then processes all files', async () => {
      const filePaths = [
        '.claude/visuals/WS-20/approved/image1.png',
        '.claude/visuals/WS-20/approved/image2.png',
        '.claude/visuals/WS-20/approved/image3.png',
      ];

      // Each ensureLfsTracking call will execute git lfs version, git lfs env, and git lfs track via execFileSync
      vi.mocked(childProcess.execFileSync)
        .mockReturnValue(Buffer.from('git-lfs/3.4.0\n'));

      vi.mocked(fs.statSync).mockReturnValue({
        size: 1500000,
        isFile: () => true,
        isDirectory: () => false,
      } as any);

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue('*.png filter=lfs\n');

      const results = await Promise.all(
        filePaths.map(fp => ensureLfsTracking(fp))
      );

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.lfs_ready).toBe(true);
      });
    });
  });
});

/**
 * WS-17: Visual Generation Infrastructure - Directory Management Tests
 *
 * BDD Scenarios:
 * - AC-4: Directory structure auto-created: .claude/visuals/WS-{id}/pending/, approved/, archive/
 * - Directory creation with proper permissions
 * - Path sanitization and validation
 * - Idempotent directory creation (safe re-runs)
 * - Error handling for permission issues
 *
 * Target: 99% coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';

// Mock fs module at the top level
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  accessSync: vi.fn(),
  constants: {
    R_OK: 4,
    W_OK: 2,
    X_OK: 1
  }
}));

import {
  createVisualsDirectory,
  createWorkstreamDirectories,
  getWorkstreamPath,
  ensureDirectoryExists,
  validateDirectoryPermissions
} from '@/visuals/directories';
import * as fs from 'fs';

describe('visuals/directories - createWorkstreamDirectories()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given workstream ID (AC-4: Auto-create directory structure)', () => {
    it('When creating directories for WS-17, Then creates pending subdirectory', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      createWorkstreamDirectories('WS-17');

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('WS-17/pending'),
        expect.objectContaining({ recursive: true })
      );
    });

    it('When creating directories for WS-17, Then creates approved subdirectory', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      createWorkstreamDirectories('WS-17');

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('WS-17/approved'),
        expect.objectContaining({ recursive: true })
      );
    });

    it('When creating directories for WS-17, Then creates archive subdirectory', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      createWorkstreamDirectories('WS-17');

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('WS-17/archive'),
        expect.objectContaining({ recursive: true })
      );
    });

    it('When creating directories, Then creates all three subdirectories', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      createWorkstreamDirectories('WS-17');

      // Should call mkdirSync 3 times (pending, approved, archive)
      expect(fs.mkdirSync).toHaveBeenCalledTimes(3);
    });

    it('When creating directories, Then uses recursive option', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      createWorkstreamDirectories('WS-17');

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ recursive: true })
      );
    });
  });

  describe('Given different workstream IDs', () => {
    it('When creating for WS-1, Then creates WS-1 directory', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      createWorkstreamDirectories('WS-1');

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('WS-1/pending'),
        expect.any(Object)
      );
    });

    it('When creating for WS-100, Then creates WS-100 directory', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      createWorkstreamDirectories('WS-100');

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('WS-100/pending'),
        expect.any(Object)
      );
    });
  });

  describe('Given directories already exist (AC-4: Idempotent)', () => {
    it('When directories exist, Then does not throw error', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      expect(() => createWorkstreamDirectories('WS-17')).not.toThrow();
    });

    it('When directories exist, Then skips mkdir calls', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      createWorkstreamDirectories('WS-17');

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it('When some directories exist, Then creates only missing ones', () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        return path.toString().includes('pending');
      });

      createWorkstreamDirectories('WS-17');

      // Should create approved and archive, but not pending
      expect(fs.mkdirSync).toHaveBeenCalledTimes(2);
      expect(fs.mkdirSync).not.toHaveBeenCalledWith(
        expect.stringContaining('pending'),
        expect.any(Object)
      );
    });
  });

  describe('Given invalid workstream ID', () => {
    it('When ID contains path traversal, Then sanitizes path', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      createWorkstreamDirectories('../../../etc/WS-17');

      // Should sanitize and not allow path traversal
      const calls = vi.mocked(fs.mkdirSync).mock.calls;
      calls.forEach(call => {
        expect(call[0]).not.toContain('..');
      });
    });

    it('When ID contains special characters, Then sanitizes path', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      createWorkstreamDirectories('WS-17; rm -rf /');

      // Should sanitize dangerous characters
      const calls = vi.mocked(fs.mkdirSync).mock.calls;
      calls.forEach(call => {
        expect(call[0]).not.toContain(';');
        expect(call[0]).not.toContain('rm');
      });
    });

    it('When ID is empty, Then throws validation error', () => {
      expect(() => createWorkstreamDirectories('')).toThrow('Invalid workstream ID');
    });

    it('When ID is null, Then throws validation error', () => {
      expect(() => createWorkstreamDirectories(null as any)).toThrow('Invalid workstream ID');
    });

    it('When ID is undefined, Then throws validation error', () => {
      expect(() => createWorkstreamDirectories(undefined as any)).toThrow('Invalid workstream ID');
    });
  });

  describe('Given permission errors', () => {
    it('When mkdir fails with EACCES, Then throws permission error', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockImplementation(() => {
        const error: any = new Error('Permission denied');
        error.code = 'EACCES';
        throw error;
      });

      expect(() => createWorkstreamDirectories('WS-17')).toThrow('Permission denied');
    });

    it('When mkdir fails with ENOSPC, Then throws disk space error', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockImplementation(() => {
        const error: any = new Error('No space left on device');
        error.code = 'ENOSPC';
        throw error;
      });

      expect(() => createWorkstreamDirectories('WS-17')).toThrow('No space left');
    });
  });

  describe('Given custom output directory', () => {
    it('When base path provided, Then creates under custom path', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      createWorkstreamDirectories('WS-17', '/custom/path/visuals');

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('/custom/path/visuals/WS-17'),
        expect.any(Object)
      );
    });

    it('When relative path provided, Then resolves to absolute', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      createWorkstreamDirectories('WS-17', 'custom/visuals');

      // Should convert to absolute path
      const calls = vi.mocked(fs.mkdirSync).mock.calls;
      calls.forEach(call => {
        expect(path.isAbsolute(call[0] as string)).toBe(true);
      });
    });
  });
});

describe('visuals/directories - getWorkstreamPath()', () => {
  it('When getting path for WS-17, Then returns correct structure', () => {
    const wsPath = getWorkstreamPath('WS-17');

    expect(wsPath).toContain('.claude/visuals/WS-17');
  });

  it('When getting path, Then includes workstream ID in path', () => {
    const wsPath = getWorkstreamPath('WS-100');

    expect(wsPath).toContain('WS-100');
  });

  it('When getting subdirectory path, Then appends subdirectory', () => {
    const pendingPath = getWorkstreamPath('WS-17', 'pending');

    expect(pendingPath).toContain('WS-17/pending');
  });

  it('When getting approved path, Then includes approved subdirectory', () => {
    const approvedPath = getWorkstreamPath('WS-17', 'approved');

    expect(approvedPath).toContain('WS-17/approved');
  });

  it('When getting archive path, Then includes archive subdirectory', () => {
    const archivePath = getWorkstreamPath('WS-17', 'archive');

    expect(archivePath).toContain('WS-17/archive');
  });

  it('When no subdirectory specified, Then returns base workstream path', () => {
    const basePath = getWorkstreamPath('WS-17');

    expect(basePath).toContain('WS-17');
    expect(basePath).not.toContain('pending');
    expect(basePath).not.toContain('approved');
    expect(basePath).not.toContain('archive');
  });

  it('When custom base path provided, Then uses custom base', () => {
    const customPath = getWorkstreamPath('WS-17', undefined, '/custom/base');

    expect(customPath).toContain('/custom/base');
    expect(customPath).toContain('WS-17');
  });
});

describe('visuals/directories - ensureDirectoryExists()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given directory path', () => {
    it('When directory does not exist, Then creates directory', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      ensureDirectoryExists('/path/to/directory');

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        '/path/to/directory',
        expect.objectContaining({ recursive: true })
      );
    });

    it('When directory exists, Then does nothing', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      ensureDirectoryExists('/path/to/directory');

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it('When creating directory, Then uses recursive option', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      ensureDirectoryExists('/path/to/nested/directory');

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ recursive: true })
      );
    });

    it('When directory creation succeeds, Then returns true', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = ensureDirectoryExists('/path/to/directory');

      expect(result).toBe(true);
    });

    it('When directory already exists, Then returns true', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = ensureDirectoryExists('/path/to/directory');

      expect(result).toBe(true);
    });

    it('When directory creation fails, Then returns false', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockImplementation(() => {
        throw new Error('Failed to create directory');
      });

      const result = ensureDirectoryExists('/path/to/directory');

      expect(result).toBe(false);
    });
  });

  describe('Given invalid paths', () => {
    it('When path is empty, Then returns false', () => {
      const result = ensureDirectoryExists('');

      expect(result).toBe(false);
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it('When path is null, Then returns false', () => {
      const result = ensureDirectoryExists(null as any);

      expect(result).toBe(false);
    });

    it('When path is undefined, Then returns false', () => {
      const result = ensureDirectoryExists(undefined as any);

      expect(result).toBe(false);
    });
  });
});

describe('visuals/directories - validateDirectoryPermissions()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given directory with proper permissions', () => {
    it('When directory is readable and writable, Then returns true', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.accessSync).mockImplementation(() => {});

      const result = validateDirectoryPermissions('/path/to/directory');

      expect(result).toBe(true);
    });

    it('When validating permissions, Then checks read access', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.accessSync).mockImplementation(() => {});

      validateDirectoryPermissions('/path/to/directory');

      expect(fs.accessSync).toHaveBeenCalledWith(
        '/path/to/directory',
        expect.any(Number)
      );
    });

    it('When validating permissions, Then checks write access', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.accessSync).mockImplementation(() => {});

      validateDirectoryPermissions('/path/to/directory');

      // Should check for write permissions
      expect(fs.accessSync).toHaveBeenCalled();
    });
  });

  describe('Given directory without permissions', () => {
    it('When directory is not readable, Then returns false', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.accessSync).mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      const result = validateDirectoryPermissions('/path/to/directory');

      expect(result).toBe(false);
    });

    it('When directory is not writable, Then returns false', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.accessSync).mockImplementation(() => {
        const error: any = new Error('Permission denied');
        error.code = 'EACCES';
        throw error;
      });

      const result = validateDirectoryPermissions('/path/to/directory');

      expect(result).toBe(false);
    });
  });

  describe('Given directory does not exist', () => {
    it('When directory missing, Then returns false', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = validateDirectoryPermissions('/path/to/missing');

      expect(result).toBe(false);
    });

    it('When directory missing, Then does not check access', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      validateDirectoryPermissions('/path/to/missing');

      expect(fs.accessSync).not.toHaveBeenCalled();
    });
  });
});

describe('visuals/directories - createVisualsDirectory()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given base visuals directory', () => {
    it('When creating base directory, Then creates .claude/visuals', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      createVisualsDirectory();

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('.claude/visuals'),
        expect.objectContaining({ recursive: true })
      );
    });

    it('When base directory exists, Then does not recreate', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      createVisualsDirectory();

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it('When custom path provided, Then creates under custom path', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      createVisualsDirectory('/custom/visuals');

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('/custom/visuals'),
        expect.any(Object)
      );
    });

    it('When creation succeeds, Then returns true', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = createVisualsDirectory();

      expect(result).toBe(true);
    });

    it('When directory exists, Then returns true', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = createVisualsDirectory();

      expect(result).toBe(true);
    });

    it('When creation fails, Then returns false', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockImplementation(() => {
        throw new Error('Failed');
      });

      const result = createVisualsDirectory();

      expect(result).toBe(false);
    });
  });
});

describe('visuals/directories - Integration scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Given complete workflow', () => {
    it('When setting up new workstream, Then creates all required directories', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      // Create base directory
      createVisualsDirectory();

      // Create workstream directories
      createWorkstreamDirectories('WS-17');

      // Should have created base + 3 workstream subdirectories
      expect(fs.mkdirSync).toHaveBeenCalledTimes(4);
    });

    it('When workstream already set up, Then subsequent calls are idempotent', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      createVisualsDirectory();
      createWorkstreamDirectories('WS-17');
      createWorkstreamDirectories('WS-17'); // Second call

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });
});

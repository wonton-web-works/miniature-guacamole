import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWorktree, removeWorktree, listWorktrees } from '../../src/worktree';
import type { ExecSyncFn } from '../../src/worktree';

// Module-level mock for spawnSyncAdapter coverage (lines 134-147)
vi.mock('child_process', () => ({
  spawnSync: vi.fn(),
}));

describe('createWorktree() (WS-DAEMON-11)', () => {
  let mockExecSync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExecSync = vi.fn().mockReturnValue(Buffer.from(''));
  });

  describe('AC: Creates worktree at .mg-daemon/worktrees/{ticketId}/', () => {
    it('GIVEN ticket PROJ-123 WHEN createWorktree called THEN worktreePath includes PROJ-123', () => {
      const result = createWorktree('PROJ-123', 'Add login', 'main', mockExecSync as ExecSyncFn);
      expect(result.worktreePath).toContain('PROJ-123');
    });

    it('GIVEN ticket PROJ-123 WHEN createWorktree called THEN worktreePath is under .mg-daemon/worktrees/', () => {
      const result = createWorktree('PROJ-123', 'Add login', 'main', mockExecSync as ExecSyncFn);
      expect(result.worktreePath).toContain('.mg-daemon/worktrees/');
    });

    it('GIVEN any ticket WHEN createWorktree called THEN calls execSync with git worktree add', () => {
      createWorktree('PROJ-123', 'Add login', 'main', mockExecSync as ExecSyncFn);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('git worktree add'),
        expect.any(Object)
      );
    });

    it('GIVEN ticket PROJ-123 WHEN createWorktree called THEN includes ticketId in branch name', () => {
      const result = createWorktree('PROJ-123', 'Add login', 'main', mockExecSync as ExecSyncFn);
      expect(result.branchName).toContain('PROJ-123');
    });
  });

  describe('AC: Branch naming follows feature/{ticketId}-{slug} convention', () => {
    it('GIVEN ticket PROJ-123 and summary "Add login" WHEN createWorktree called THEN branch starts with feature/', () => {
      const result = createWorktree('PROJ-123', 'Add login', 'main', mockExecSync as ExecSyncFn);
      expect(result.branchName).toMatch(/^feature\//);
    });

    it('GIVEN summary with uppercase WHEN createWorktree called THEN slug is lowercase', () => {
      const result = createWorktree('PROJ-123', 'Add LOGIN Endpoint', 'main', mockExecSync as ExecSyncFn);
      // The slug portion should be lowercase
      const slugPart = result.branchName.replace('feature/PROJ-123-', '');
      expect(slugPart).toBe(slugPart.toLowerCase());
    });

    it('GIVEN summary with special chars WHEN createWorktree called THEN slug contains only alphanumeric and dashes', () => {
      const result = createWorktree('GH-45', 'Fix: auth & oauth2!', 'main', mockExecSync as ExecSyncFn);
      expect(result.branchName).toMatch(/^feature\/[a-zA-Z0-9-]+$/);
    });

    it('GIVEN very long summary WHEN createWorktree called THEN branch name is at most 60 chars', () => {
      const result = createWorktree(
        'PROJ-1',
        'This is an extremely long summary that will definitely exceed the maximum branch name length',
        'main',
        mockExecSync as ExecSyncFn
      );
      expect(result.branchName.length).toBeLessThanOrEqual(60);
    });
  });

  describe('AC: Passes baseBranch to git worktree add command', () => {
    it('GIVEN baseBranch "main" WHEN createWorktree called THEN git command references main', () => {
      createWorktree('PROJ-123', 'Add login', 'main', mockExecSync as ExecSyncFn);
      const call = mockExecSync.mock.calls[0][0] as string;
      expect(call).toContain('main');
    });

    it('GIVEN baseBranch "develop" WHEN createWorktree called THEN git command references develop', () => {
      createWorktree('PROJ-123', 'Add login', 'develop', mockExecSync as ExecSyncFn);
      const call = mockExecSync.mock.calls[0][0] as string;
      expect(call).toContain('develop');
    });
  });

  describe('AC: Error propagation', () => {
    it('GIVEN git worktree add fails WHEN createWorktree called THEN throws the error', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('git error: worktree already exists');
      });

      expect(() => createWorktree('PROJ-123', 'Add login', 'main', mockExecSync as ExecSyncFn)).toThrow(
        'git error: worktree already exists'
      );
    });

    it('GIVEN git fails with non-already-exists error WHEN createWorktree called THEN re-throws that error', () => {
      // Lines 76-78: else branch — error does not contain 'already exists'
      mockExecSync.mockImplementation(() => {
        throw new Error('fatal: not a git repository');
      });

      expect(() => createWorktree('PROJ-123', 'Add login', 'main', mockExecSync as ExecSyncFn)).toThrow(
        'fatal: not a git repository'
      );
    });
  });

  describe('AC: Rejects unsafe ticket IDs (MED-2)', () => {
    it('GIVEN ticket ID with path traversal WHEN createWorktree called THEN throws unsafe ticket ID error', () => {
      // Lines 39-41: validation guard
      expect(() => createWorktree('../../../etc/passwd', 'Hack', 'main', mockExecSync as ExecSyncFn)).toThrow(
        'Unsafe ticket ID rejected'
      );
    });

    it('GIVEN ticket ID with semicolon injection WHEN createWorktree called THEN throws unsafe ticket ID error', () => {
      expect(() => createWorktree('ticket;rm -rf /', 'Bad', 'main', mockExecSync as ExecSyncFn)).toThrow(
        'Unsafe ticket ID rejected'
      );
    });

    it('GIVEN ticket ID exceeding 50 chars WHEN createWorktree called THEN throws unsafe ticket ID error', () => {
      const longId = 'a'.repeat(51);
      expect(() => createWorktree(longId, 'Too long', 'main', mockExecSync as ExecSyncFn)).toThrow(
        'Unsafe ticket ID rejected'
      );
    });
  });
});

describe('removeWorktree() (WS-DAEMON-11)', () => {
  let mockExecSync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExecSync = vi.fn().mockReturnValue(Buffer.from(''));
  });

  describe('AC: Removes worktree via git worktree remove', () => {
    it('GIVEN worktreePath WHEN removeWorktree called THEN calls execSync with git worktree remove', () => {
      removeWorktree('/tmp/.mg-daemon/worktrees/PROJ-123', mockExecSync as ExecSyncFn);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('git worktree remove'),
        expect.any(Object)
      );
    });

    it('GIVEN worktreePath WHEN removeWorktree called THEN includes path in command', () => {
      removeWorktree('/tmp/.mg-daemon/worktrees/PROJ-123', mockExecSync as ExecSyncFn);
      const call = mockExecSync.mock.calls[0][0] as string;
      expect(call).toContain('/tmp/.mg-daemon/worktrees/PROJ-123');
    });

    it('GIVEN git worktree remove fails WHEN removeWorktree called THEN throws the error', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('fatal: worktree not found');
      });

      expect(() => removeWorktree('/no/path', mockExecSync as ExecSyncFn)).toThrow('fatal: worktree not found');
    });
  });
});

describe('listWorktrees() (WS-DAEMON-11)', () => {
  let mockExecSync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExecSync = vi.fn();
  });

  describe('AC: Lists active worktrees', () => {
    it('GIVEN no active worktrees WHEN listWorktrees called THEN returns empty array', () => {
      mockExecSync.mockReturnValue(Buffer.from(''));
      const result = listWorktrees(mockExecSync as ExecSyncFn);
      expect(result).toEqual([]);
    });

    it('GIVEN one active worktree WHEN listWorktrees called THEN returns array with one path', () => {
      mockExecSync.mockReturnValue(Buffer.from('.mg-daemon/worktrees/PROJ-123\n'));
      const result = listWorktrees(mockExecSync as ExecSyncFn);
      expect(result).toHaveLength(1);
      expect(result[0]).toContain('PROJ-123');
    });

    it('GIVEN two active worktrees WHEN listWorktrees called THEN returns array with two paths', () => {
      mockExecSync.mockReturnValue(
        Buffer.from('.mg-daemon/worktrees/PROJ-123\n.mg-daemon/worktrees/PROJ-124\n')
      );
      const result = listWorktrees(mockExecSync as ExecSyncFn);
      expect(result).toHaveLength(2);
    });

    it('GIVEN listWorktrees called THEN calls execSync with git worktree list', () => {
      mockExecSync.mockReturnValue(Buffer.from(''));
      listWorktrees(mockExecSync as ExecSyncFn);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('git worktree list'),
        expect.any(Object)
      );
    });

    it('GIVEN output with blank lines WHEN listWorktrees called THEN filters them out', () => {
      mockExecSync.mockReturnValue(Buffer.from('\n\n.mg-daemon/worktrees/PROJ-123\n\n'));
      const result = listWorktrees(mockExecSync as ExecSyncFn);
      expect(result.every((p) => p.length > 0)).toBe(true);
    });

    it('GIVEN porcelain format output WHEN listWorktrees called THEN parses worktree path from "worktree <path>" lines', () => {
      // Lines 110-114: porcelain branch — lines starting with 'worktree '
      const porcelain = [
        'worktree /home/user/.mg-daemon/worktrees/PROJ-123',
        'HEAD abc1234',
        'branch refs/heads/feature/PROJ-123-add-login',
        '',
        'worktree /home/user',
        'HEAD def5678',
        'branch refs/heads/main',
        '',
      ].join('\n');
      mockExecSync.mockReturnValue(Buffer.from(porcelain));
      const result = listWorktrees(mockExecSync as ExecSyncFn);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe('/home/user/.mg-daemon/worktrees/PROJ-123');
    });

    it('GIVEN porcelain format with multiple daemon worktrees WHEN listWorktrees called THEN returns all daemon-managed paths', () => {
      // Lines 111-113: path extraction and push inside porcelain branch
      const porcelain = [
        'worktree /abs/path/.mg-daemon/worktrees/PROJ-1',
        'HEAD aaa0001',
        '',
        'worktree /abs/path/.mg-daemon/worktrees/PROJ-2',
        'HEAD bbb0002',
        '',
        'worktree /abs/path',
        'HEAD ccc0003',
        '',
      ].join('\n');
      mockExecSync.mockReturnValue(Buffer.from(porcelain));
      const result = listWorktrees(mockExecSync as ExecSyncFn);
      expect(result).toHaveLength(2);
      expect(result).toContain('/abs/path/.mg-daemon/worktrees/PROJ-1');
      expect(result).toContain('/abs/path/.mg-daemon/worktrees/PROJ-2');
    });
  });
});

// spawnSyncAdapter coverage (lines 134-147)
// The adapter is the default execSyncFn — call public API without injecting a mock
// so the real spawnSyncAdapter is exercised. child_process is mocked at module level.
describe('spawnSyncAdapter (default execSyncFn) (WS-DAEMON-11)', () => {
  let spawnSync: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Access the mocked spawnSync from the vi.mock at the top of the file
    const cp = await import('child_process');
    spawnSync = cp.spawnSync as ReturnType<typeof vi.fn>;
  });

  describe('AC: Delegates to child_process.spawnSync', () => {
    it('GIVEN spawnSync succeeds WHEN listWorktrees called without execSyncFn THEN calls spawnSync and returns result', () => {
      // Line 136-138: spawnSync call with args split from command string
      const stdout = Buffer.from('.mg-daemon/worktrees/PROJ-99\n');
      spawnSync.mockReturnValue({ status: 0, stdout, stderr: Buffer.from('') });

      const result = listWorktrees(); // no execSyncFn — uses spawnSyncAdapter default

      expect(spawnSync).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['worktree', 'list', '--porcelain']),
        expect.objectContaining({ encoding: 'buffer' })
      );
      expect(result).toContain('.mg-daemon/worktrees/PROJ-99');
    });

    it('GIVEN spawnSync returns non-zero status with stderr WHEN createWorktree called without execSyncFn THEN throws stderr message', () => {
      // Lines 141-143: status !== 0 throws error with stderr content
      spawnSync.mockReturnValue({
        status: 1,
        stdout: Buffer.from(''),
        stderr: Buffer.from('fatal: not a git repository'),
      });

      expect(() => createWorktree('PROJ-1', 'test', 'main')).toThrow('fatal: not a git repository');
    });

    it('GIVEN spawnSync returns non-zero status with empty stderr WHEN called THEN throws command-failed fallback message', () => {
      // Lines 142-143: fallback to "${cmd} failed" when stderr is empty
      spawnSync.mockReturnValue({
        status: 128,
        stdout: Buffer.from(''),
        stderr: Buffer.from(''),
      });

      expect(() => listWorktrees()).toThrow('git failed');
    });
  });
});

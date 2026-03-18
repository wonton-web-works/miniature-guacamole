import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWorktree, removeWorktree, listWorktrees } from '../../src/worktree';
import type { ExecSyncFn } from '../../src/worktree';

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
  });
});

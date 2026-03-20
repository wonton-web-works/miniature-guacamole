import { describe, it, expect, vi, beforeEach } from 'vitest';
import { spawnSync } from 'child_process';

import {
  userExists,
  createDaemonUser,
  formatSetupInstructions,
} from '../../src/setup-user';
import type { SetupUserResult } from '../../src/setup-user';

vi.mock('child_process', () => ({
  spawnSync: vi.fn(),
}));

describe('setup-user module (P0-1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('userExists()', () => {
    it('GIVEN id -u succeeds WHEN userExists() called THEN returns true', () => {
      vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '501', stderr: '' } as any);

      const result = userExists('mg-daemon');

      expect(result).toBe(true);
    });

    it('GIVEN id -u fails WHEN userExists() called THEN returns false', () => {
      vi.mocked(spawnSync).mockReturnValue({ status: 1, stdout: '', stderr: 'no such user' } as any);

      const result = userExists('mg-daemon');

      expect(result).toBe(false);
    });

    it('GIVEN no username argument WHEN userExists() called THEN defaults to mg-daemon', () => {
      vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '501', stderr: '' } as any);

      userExists();

      expect(vi.mocked(spawnSync)).toHaveBeenCalledWith('id', ['-u', 'mg-daemon'], expect.any(Object));
    });

    it('GIVEN custom username WHEN userExists() called THEN uses that username', () => {
      vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '502', stderr: '' } as any);

      userExists('custom-daemon');

      expect(vi.mocked(spawnSync)).toHaveBeenCalledWith('id', ['-u', 'custom-daemon'], expect.any(Object));
    });

    it('GIVEN spawnSync returns null status WHEN userExists() called THEN returns false', () => {
      vi.mocked(spawnSync).mockReturnValue({ status: null, stdout: '', stderr: '' } as any);

      const result = userExists('mg-daemon');

      expect(result).toBe(false);
    });
  });

  describe('createDaemonUser()', () => {
    it('GIVEN user does not exist WHEN createDaemonUser() called THEN calls dscl with correct create args', () => {
      // id -u returns failure (user does not exist), then dscl calls succeed
      vi.mocked(spawnSync)
        .mockReturnValueOnce({ status: 1, stdout: '', stderr: 'no such user' } as any) // id -u check
        .mockReturnValue({ status: 0, stdout: '', stderr: '' } as any); // all dscl calls

      const result = createDaemonUser('mg-daemon');

      const calls = vi.mocked(spawnSync).mock.calls;
      // First call: id -u
      expect(calls[0]).toEqual(['id', ['-u', 'mg-daemon'], expect.any(Object)]);
      // Subsequent calls: dscl
      const dsclCalls = calls.slice(1).map(c => c[0]);
      expect(dsclCalls.every(cmd => cmd === 'dscl')).toBe(true);
    });

    it('GIVEN user does not exist WHEN createDaemonUser() called THEN creates user entry at /Users/mg-daemon', () => {
      vi.mocked(spawnSync)
        .mockReturnValueOnce({ status: 1, stdout: '', stderr: '' } as any) // id -u check
        .mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

      createDaemonUser('mg-daemon');

      const calls = vi.mocked(spawnSync).mock.calls;
      const createCall = calls.find(c => c[0] === 'dscl' && (c[1] as string[]).includes('-create') && !(c[1] as string[]).includes('UserShell'));
      expect(createCall).toBeDefined();
      expect(createCall![1]).toContain('/Users/mg-daemon');
    });

    it('GIVEN user does not exist WHEN createDaemonUser() called THEN sets UserShell to /usr/bin/false', () => {
      vi.mocked(spawnSync)
        .mockReturnValueOnce({ status: 1, stdout: '', stderr: '' } as any)
        .mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

      createDaemonUser('mg-daemon');

      const calls = vi.mocked(spawnSync).mock.calls;
      const shellCall = calls.find(c =>
        c[0] === 'dscl' &&
        (c[1] as string[]).includes('UserShell') &&
        (c[1] as string[]).includes('/usr/bin/false')
      );
      expect(shellCall).toBeDefined();
    });

    it('GIVEN user does not exist WHEN createDaemonUser() called THEN sets NFSHomeDirectory to /var/empty', () => {
      vi.mocked(spawnSync)
        .mockReturnValueOnce({ status: 1, stdout: '', stderr: '' } as any)
        .mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

      createDaemonUser('mg-daemon');

      const calls = vi.mocked(spawnSync).mock.calls;
      const homeCall = calls.find(c =>
        c[0] === 'dscl' &&
        (c[1] as string[]).includes('NFSHomeDirectory') &&
        (c[1] as string[]).includes('/var/empty')
      );
      expect(homeCall).toBeDefined();
    });

    it('GIVEN user already exists WHEN createDaemonUser() called THEN returns created: false', () => {
      vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '501', stderr: '' } as any); // id -u succeeds

      const result = createDaemonUser('mg-daemon');

      expect(result.created).toBe(false);
      expect(result.username).toBe('mg-daemon');
    });

    it('GIVEN user already exists WHEN createDaemonUser() called THEN does not call dscl', () => {
      vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '501', stderr: '' } as any);

      createDaemonUser('mg-daemon');

      const calls = vi.mocked(spawnSync).mock.calls;
      const dsclCalls = calls.filter(c => c[0] === 'dscl');
      expect(dsclCalls).toHaveLength(0);
    });

    it('GIVEN dscl fails WHEN createDaemonUser() called THEN returns created: false with error', () => {
      vi.mocked(spawnSync)
        .mockReturnValueOnce({ status: 1, stdout: '', stderr: '' } as any) // id -u check — user not found
        .mockReturnValue({ status: 1, stdout: '', stderr: 'permission denied' } as any); // dscl fails

      const result = createDaemonUser('mg-daemon');

      expect(result.created).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('GIVEN user created successfully WHEN createDaemonUser() called THEN returns created: true', () => {
      vi.mocked(spawnSync)
        .mockReturnValueOnce({ status: 1, stdout: '', stderr: '' } as any) // id -u check
        .mockReturnValue({ status: 0, stdout: '', stderr: '' } as any); // dscl all succeed

      const result = createDaemonUser('mg-daemon');

      expect(result.created).toBe(true);
      expect(result.username).toBe('mg-daemon');
    });

    it('GIVEN no username arg WHEN createDaemonUser() called THEN defaults to mg-daemon', () => {
      vi.mocked(spawnSync)
        .mockReturnValueOnce({ status: 1, stdout: '', stderr: '' } as any)
        .mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

      const result = createDaemonUser();

      expect(result.username).toBe('mg-daemon');
    });

    it('GIVEN dscl list returns UID data WHEN createDaemonUser() called THEN parses existing UIDs and avoids collision (lines 76-83)', () => {
      // Sequence:
      //   call 1: id -u → status 1 (user doesn't exist)
      //   call 2: dscl . -list /Users UniqueID → returns UID list with 300 taken
      //   calls 3+: the 7 dscl -create commands → all succeed
      vi.mocked(spawnSync)
        .mockReturnValueOnce({ status: 1, stdout: '', stderr: 'no such user' } as any) // id -u
        .mockReturnValueOnce({                                                          // dscl list
          status: 0,
          stdout: 'root  0\nnobody  -2\n_mg-daemon  300\n',
          stderr: '',
        } as any)
        .mockReturnValue({ status: 0, stdout: '', stderr: '' } as any); // dscl create calls

      const result = createDaemonUser('mg-daemon');

      expect(result.created).toBe(true);
      // UID 300 is taken; should have picked 301
      expect(result.uid).toBe(301);
    });

    it('GIVEN dscl list output has malformed lines WHEN createDaemonUser() called THEN skips unparseable lines and continues', () => {
      // Lines with fewer than 2 parts or non-numeric UIDs should be silently skipped
      vi.mocked(spawnSync)
        .mockReturnValueOnce({ status: 1, stdout: '', stderr: '' } as any) // id -u
        .mockReturnValueOnce({                                               // dscl list — mixed good/bad lines
          status: 0,
          stdout: 'onlyonepart\nroot  0\nbaduid  notanumber\n_daemon  300\n\n',
          stderr: '',
        } as any)
        .mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

      const result = createDaemonUser('mg-daemon');

      // 0 and 300 are taken; starts at 300 which is taken, increments to 301
      expect(result.created).toBe(true);
      expect(result.uid).toBe(301);
    });

    it('GIVEN starting UID is taken WHEN findNextAvailableUid resolves THEN increments uid++ until free (lines 87-88)', () => {
      // UIDs 300, 301, 302 are all taken — should land on 303
      vi.mocked(spawnSync)
        .mockReturnValueOnce({ status: 1, stdout: '', stderr: '' } as any) // id -u
        .mockReturnValueOnce({                                               // dscl list with 300-302 taken
          status: 0,
          stdout: 'user300  300\nuser301  301\nuser302  302\n',
          stderr: '',
        } as any)
        .mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

      const result = createDaemonUser('mg-daemon');

      expect(result.created).toBe(true);
      expect(result.uid).toBe(303);
    });

    it('GIVEN dscl list returns status non-zero WHEN createDaemonUser() called THEN startAt UID is used directly', () => {
      // When dscl list fails, takenUids stays empty — startAt 300 is free
      vi.mocked(spawnSync)
        .mockReturnValueOnce({ status: 1, stdout: '', stderr: '' } as any) // id -u
        .mockReturnValueOnce({ status: 1, stdout: '', stderr: 'error' } as any) // dscl list fails
        .mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

      const result = createDaemonUser('mg-daemon');

      expect(result.created).toBe(true);
      expect(result.uid).toBe(300);
    });
  });

  describe('formatSetupInstructions()', () => {
    it('GIVEN username WHEN formatSetupInstructions() called THEN returns a non-empty string', () => {
      const result = formatSetupInstructions('mg-daemon');

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('GIVEN username WHEN formatSetupInstructions() called THEN includes the username in output', () => {
      const result = formatSetupInstructions('mg-daemon');

      expect(result).toContain('mg-daemon');
    });

    it('GIVEN username WHEN formatSetupInstructions() called THEN mentions setup-user command', () => {
      const result = formatSetupInstructions('mg-daemon');

      expect(result).toMatch(/setup-user|dscl|sudo/i);
    });
  });
});

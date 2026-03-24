import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('child_process', () => ({
  spawnSync: vi.fn(),
}));

import { spawnSync } from 'child_process';
import { resolveGhToken, clearTokenCache } from '../../src/github-auth';

describe('resolveGhToken (GH issue #14)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTokenCache();
  });

  describe('MISUSE: invalid / edge inputs', () => {
    it('GIVEN account is undefined WHEN resolveGhToken called THEN returns undefined without calling spawnSync', () => {
      const result = resolveGhToken(undefined);

      expect(result).toBeUndefined();
      expect(spawnSync).not.toHaveBeenCalled();
    });

    it('GIVEN account is empty string WHEN resolveGhToken called THEN returns undefined without calling spawnSync', () => {
      const result = resolveGhToken('');

      expect(result).toBeUndefined();
      expect(spawnSync).not.toHaveBeenCalled();
    });

    it('GIVEN gh auth token returns empty stdout WHEN resolveGhToken called THEN returns empty string (truthy check is caller responsibility)', () => {
      vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

      const result = resolveGhToken('my-user');

      expect(result).toBe('');
    });
  });

  describe('BOUNDARY: account present, gh CLI succeeds', () => {
    it('GIVEN account "myuser" WHEN resolveGhToken called THEN calls spawnSync with correct args', () => {
      vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: 'ghp_abc123\n', stderr: '' } as any);

      resolveGhToken('myuser');

      expect(spawnSync).toHaveBeenCalledWith(
        'gh',
        ['auth', 'token', '--user', 'myuser'],
        expect.objectContaining({ encoding: 'utf-8' })
      );
    });

    it('GIVEN token with trailing newline WHEN resolveGhToken called THEN trims the token', () => {
      vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: 'ghp_abc123\n\n', stderr: '' } as any);

      const result = resolveGhToken('myuser');

      expect(result).toBe('ghp_abc123');
    });

    it('GIVEN spawnSync timeout option WHEN resolveGhToken called THEN passes timeout: 10000', () => {
      vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: 'ghp_abc123\n', stderr: '' } as any);

      resolveGhToken('myuser');

      expect(spawnSync).toHaveBeenCalledWith(
        'gh',
        expect.any(Array),
        expect.objectContaining({ timeout: 10000 })
      );
    });
  });

  describe('GOLDEN PATH: caching behavior', () => {
    it('GIVEN same account called twice WHEN resolveGhToken called THEN spawnSync only called once', () => {
      vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: 'ghp_cached\n', stderr: '' } as any);

      resolveGhToken('myuser');
      resolveGhToken('myuser');

      expect(spawnSync).toHaveBeenCalledTimes(1);
    });

    it('GIVEN same account called twice WHEN resolveGhToken called THEN both calls return the same token', () => {
      vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: 'ghp_cached\n', stderr: '' } as any);

      const first = resolveGhToken('myuser');
      const second = resolveGhToken('myuser');

      expect(first).toBe('ghp_cached');
      expect(second).toBe('ghp_cached');
    });

    it('GIVEN two different accounts WHEN resolveGhToken called for each THEN spawnSync called twice with different users', () => {
      vi.mocked(spawnSync)
        .mockReturnValueOnce({ status: 0, stdout: 'ghp_token_a\n', stderr: '' } as any)
        .mockReturnValueOnce({ status: 0, stdout: 'ghp_token_b\n', stderr: '' } as any);

      const tokenA = resolveGhToken('user-a');
      const tokenB = resolveGhToken('user-b');

      expect(tokenA).toBe('ghp_token_a');
      expect(tokenB).toBe('ghp_token_b');
      expect(spawnSync).toHaveBeenCalledTimes(2);
    });

    it('GIVEN clearTokenCache called WHEN resolveGhToken called for same account THEN spawnSync called again', () => {
      vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: 'ghp_fresh\n', stderr: '' } as any);

      resolveGhToken('myuser');
      clearTokenCache();
      resolveGhToken('myuser');

      expect(spawnSync).toHaveBeenCalledTimes(2);
    });
  });

  describe('GOLDEN PATH: error handling', () => {
    it('GIVEN gh auth token exits with non-zero WHEN resolveGhToken called THEN throws with descriptive error', () => {
      vi.mocked(spawnSync).mockReturnValue({ status: 1, stdout: '', stderr: 'error: unknown user "baduser"' } as any);

      expect(() => resolveGhToken('baduser')).toThrow(
        'Failed to resolve gh auth token for account "baduser"'
      );
    });

    it('GIVEN gh auth token fails WHEN resolveGhToken called THEN error includes stderr message', () => {
      vi.mocked(spawnSync).mockReturnValue({ status: 1, stdout: '', stderr: 'error: not logged in' } as any);

      expect(() => resolveGhToken('someuser')).toThrow('not logged in');
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock child_process for shell execution
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

import { execSync } from 'child_process';
import { notify, notifyPRCreated, notifyFailure } from '../../src/notifications';
import type { NotificationContext } from '../../src/notifications';
import type { NotificationConfig } from '../../src/types';

const baseContext: NotificationContext = {
  ticketId: 'PROJ-123',
  ticketTitle: 'Add login feature',
  source: 'github',
};

describe('Notifications Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── notify ─────────────────────────────────────────────────────────────────

  describe('notify()', () => {
    describe('GIVEN a shell command WHEN notify called THEN executes it', () => {
      it('GIVEN command "echo done" THEN execSync is called', () => {
        vi.mocked(execSync).mockImplementation(() => Buffer.from(''));

        notify('echo done', baseContext);

        expect(execSync).toHaveBeenCalled();
      });

      it('GIVEN command WHEN called THEN MG_TICKET_ID env var is set', () => {
        vi.mocked(execSync).mockImplementation(() => Buffer.from(''));

        notify('echo done', baseContext);

        const callArgs = vi.mocked(execSync).mock.calls[0];
        const options = callArgs[1] as { env: Record<string, string> };
        expect(options.env['MG_TICKET_ID']).toBe('PROJ-123');
      });

      it('GIVEN command WHEN called THEN MG_TICKET_TITLE env var is set', () => {
        vi.mocked(execSync).mockImplementation(() => Buffer.from(''));

        notify('echo done', baseContext);

        const callArgs = vi.mocked(execSync).mock.calls[0];
        const options = callArgs[1] as { env: Record<string, string> };
        expect(options.env['MG_TICKET_TITLE']).toBe('Add login feature');
      });

      it('GIVEN command WHEN called THEN MG_SOURCE env var is set', () => {
        vi.mocked(execSync).mockImplementation(() => Buffer.from(''));

        notify('echo done', baseContext);

        const callArgs = vi.mocked(execSync).mock.calls[0];
        const options = callArgs[1] as { env: Record<string, string> };
        expect(options.env['MG_SOURCE']).toBe('github');
      });

      it('GIVEN context with prUrl WHEN called THEN MG_PR_URL env var is set', () => {
        vi.mocked(execSync).mockImplementation(() => Buffer.from(''));

        notify('echo done', { ...baseContext, prUrl: 'https://github.com/org/repo/pull/1' });

        const callArgs = vi.mocked(execSync).mock.calls[0];
        const options = callArgs[1] as { env: Record<string, string> };
        expect(options.env['MG_PR_URL']).toBe('https://github.com/org/repo/pull/1');
      });

      it('GIVEN context with error WHEN called THEN MG_ERROR env var is set', () => {
        vi.mocked(execSync).mockImplementation(() => Buffer.from(''));

        notify('echo done', { ...baseContext, error: 'build failed' });

        const callArgs = vi.mocked(execSync).mock.calls[0];
        const options = callArgs[1] as { env: Record<string, string> };
        expect(options.env['MG_ERROR']).toBe('build failed');
      });

      it('GIVEN no prUrl THEN MG_PR_URL env var is empty string', () => {
        vi.mocked(execSync).mockImplementation(() => Buffer.from(''));

        notify('echo done', baseContext);

        const callArgs = vi.mocked(execSync).mock.calls[0];
        const options = callArgs[1] as { env: Record<string, string> };
        expect(options.env['MG_PR_URL']).toBe('');
      });

      it('GIVEN no error THEN MG_ERROR env var is empty string', () => {
        vi.mocked(execSync).mockImplementation(() => Buffer.from(''));

        notify('echo done', baseContext);

        const callArgs = vi.mocked(execSync).mock.calls[0];
        const options = callArgs[1] as { env: Record<string, string> };
        expect(options.env['MG_ERROR']).toBe('');
      });
    });

    describe('GIVEN execSync throws WHEN notify called THEN does not rethrow', () => {
      it('GIVEN execSync throws THEN notify does not throw', () => {
        vi.mocked(execSync).mockImplementation(() => {
          throw new Error('command failed');
        });

        expect(() => notify('bad-command', baseContext)).not.toThrow();
      });

      it('GIVEN execSync throws THEN error is swallowed (fire-and-forget)', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.mocked(execSync).mockImplementation(() => {
          throw new Error('command failed');
        });

        notify('bad-command', baseContext);

        // Should have logged the error instead of rethrowing
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });

    describe('GIVEN the shell command string WHEN executed THEN command is passed correctly', () => {
      it('GIVEN command "notify-send msg" THEN execSync is called with that command', () => {
        vi.mocked(execSync).mockImplementation(() => Buffer.from(''));

        notify('notify-send msg', baseContext);

        const callArgs = vi.mocked(execSync).mock.calls[0];
        expect(callArgs[0]).toBe('notify-send msg');
      });
    });
  });

  // ─── notifyPRCreated ────────────────────────────────────────────────────────

  describe('notifyPRCreated()', () => {
    describe('GIVEN onPRCreated configured WHEN notifyPRCreated called THEN executes command', () => {
      it('GIVEN config with onPRCreated THEN execSync is called', () => {
        vi.mocked(execSync).mockImplementation(() => Buffer.from(''));
        const config: NotificationConfig = { onPRCreated: 'echo PR created' };

        notifyPRCreated(config, { ...baseContext, prUrl: 'https://github.com/org/repo/pull/1' });

        expect(execSync).toHaveBeenCalledTimes(1);
      });

      it('GIVEN config with onPRCreated THEN MG_PR_URL is set in env', () => {
        vi.mocked(execSync).mockImplementation(() => Buffer.from(''));
        const config: NotificationConfig = { onPRCreated: 'echo PR created' };
        const ctx = { ...baseContext, prUrl: 'https://github.com/org/repo/pull/99' };

        notifyPRCreated(config, ctx);

        const callArgs = vi.mocked(execSync).mock.calls[0];
        const options = callArgs[1] as { env: Record<string, string> };
        expect(options.env['MG_PR_URL']).toBe('https://github.com/org/repo/pull/99');
      });
    });

    describe('GIVEN no onPRCreated configured WHEN notifyPRCreated called THEN does nothing', () => {
      it('GIVEN config without onPRCreated THEN execSync is not called', () => {
        vi.mocked(execSync).mockImplementation(() => Buffer.from(''));
        const config: NotificationConfig = { onFailure: 'echo fail' };

        notifyPRCreated(config, baseContext);

        expect(execSync).not.toHaveBeenCalled();
      });

      it('GIVEN undefined config THEN execSync is not called', () => {
        vi.mocked(execSync).mockImplementation(() => Buffer.from(''));

        notifyPRCreated(undefined, baseContext);

        expect(execSync).not.toHaveBeenCalled();
      });
    });
  });

  // ─── notifyFailure ──────────────────────────────────────────────────────────

  describe('notifyFailure()', () => {
    describe('GIVEN onFailure configured WHEN notifyFailure called THEN executes command', () => {
      it('GIVEN config with onFailure THEN execSync is called', () => {
        vi.mocked(execSync).mockImplementation(() => Buffer.from(''));
        const config: NotificationConfig = { onFailure: 'echo failure' };

        notifyFailure(config, { ...baseContext, error: 'build failed' });

        expect(execSync).toHaveBeenCalledTimes(1);
      });

      it('GIVEN config with onFailure THEN MG_ERROR is set in env', () => {
        vi.mocked(execSync).mockImplementation(() => Buffer.from(''));
        const config: NotificationConfig = { onFailure: 'echo failure' };
        const ctx = { ...baseContext, error: 'claude timeout' };

        notifyFailure(config, ctx);

        const callArgs = vi.mocked(execSync).mock.calls[0];
        const options = callArgs[1] as { env: Record<string, string> };
        expect(options.env['MG_ERROR']).toBe('claude timeout');
      });

      it('GIVEN config with onFailure THEN MG_TICKET_ID is set in env', () => {
        vi.mocked(execSync).mockImplementation(() => Buffer.from(''));
        const config: NotificationConfig = { onFailure: 'echo failure' };

        notifyFailure(config, { ...baseContext, error: 'err' });

        const callArgs = vi.mocked(execSync).mock.calls[0];
        const options = callArgs[1] as { env: Record<string, string> };
        expect(options.env['MG_TICKET_ID']).toBe('PROJ-123');
      });
    });

    describe('GIVEN no onFailure configured WHEN notifyFailure called THEN does nothing', () => {
      it('GIVEN config without onFailure THEN execSync is not called', () => {
        vi.mocked(execSync).mockImplementation(() => Buffer.from(''));
        const config: NotificationConfig = { onPRCreated: 'echo pr' };

        notifyFailure(config, baseContext);

        expect(execSync).not.toHaveBeenCalled();
      });

      it('GIVEN undefined config THEN execSync is not called', () => {
        vi.mocked(execSync).mockImplementation(() => Buffer.from(''));

        notifyFailure(undefined, baseContext);

        expect(execSync).not.toHaveBeenCalled();
      });
    });
  });
});

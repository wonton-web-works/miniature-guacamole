import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { execClaude, scrubEnvironment } from '../../src/claude';
import type { SpawnFn } from '../../src/claude';

// Helper to build a mock ChildProcess with controllable stdout/stderr/close events
function makeMockProcess(overrides?: {
  stdoutData?: string;
  stderrData?: string;
  exitCode?: number;
  error?: Error;
  pid?: number;
}): { proc: ChildProcess; triggerExit: (code: number) => void } {
  const opts = {
    stdoutData: '',
    stderrData: '',
    exitCode: 0,
    pid: 12345,
    error: undefined as Error | undefined,
    ...overrides,
  };

  const stdout = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
  const stderr = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
  const proc = new EventEmitter() as unknown as ChildProcess;
  (proc as unknown as Record<string, unknown>).stdout = stdout;
  (proc as unknown as Record<string, unknown>).stderr = stderr;
  (proc as unknown as Record<string, unknown>).pid = opts.pid;

  const triggerExit = (code: number) => {
    if (opts.stdoutData) stdout.emit('data', Buffer.from(opts.stdoutData));
    if (opts.stderrData) stderr.emit('data', Buffer.from(opts.stderrData));
    proc.emit('close', code);
  };

  return { proc, triggerExit };
}

describe('execClaude() — Claude subprocess wrapper (WS-DAEMON-11)', () => {
  let mockSpawn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSpawn = vi.fn();
  });

  describe('AC: Executes claude --print with provided prompt', () => {
    it('GIVEN a prompt WHEN execClaude called THEN spawns "claude" with ["--print", prompt]', async () => {
      const { proc, triggerExit } = makeMockProcess({ stdoutData: 'result' });
      mockSpawn.mockReturnValue(proc);

      const promise = execClaude('hello world', {}, mockSpawn as SpawnFn);
      triggerExit(0);
      await promise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        ['--print', '--permission-mode', 'bypassPermissions', '--output-format', 'text', 'hello world'],
        expect.any(Object)
      );
    });

    it('GIVEN cwd option WHEN execClaude called THEN passes cwd to spawn options', async () => {
      const { proc, triggerExit } = makeMockProcess();
      mockSpawn.mockReturnValue(proc);

      const promise = execClaude('prompt', { cwd: '/some/path' }, mockSpawn as SpawnFn);
      triggerExit(0);
      await promise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.any(Array),
        expect.objectContaining({ cwd: '/some/path' })
      );
    });

    it('GIVEN env option WHEN execClaude called THEN merges env with scrubbed env', async () => {
      const { proc, triggerExit } = makeMockProcess();
      mockSpawn.mockReturnValue(proc);

      const promise = execClaude('prompt', { env: { FOO: 'bar' } }, mockSpawn as SpawnFn);
      triggerExit(0);
      await promise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining({ FOO: 'bar' }),
        })
      );
    });
  });

  describe('AC: Captures stdout and stderr as strings', () => {
    it('GIVEN claude outputs to stdout WHEN execClaude resolves THEN stdout contains the output', async () => {
      const { proc, triggerExit } = makeMockProcess({ stdoutData: 'planned workstreams here' });
      mockSpawn.mockReturnValue(proc);

      const promise = execClaude('prompt', {}, mockSpawn as SpawnFn);
      triggerExit(0);
      const result = await promise;

      expect(result.stdout).toBe('planned workstreams here');
    });

    it('GIVEN claude writes to stderr WHEN execClaude resolves THEN stderr contains the output', async () => {
      const { proc, triggerExit } = makeMockProcess({ stderrData: 'some warning' });
      mockSpawn.mockReturnValue(proc);

      const promise = execClaude('prompt', {}, mockSpawn as SpawnFn);
      triggerExit(0);
      const result = await promise;

      expect(result.stderr).toBe('some warning');
    });

    it('GIVEN claude outputs multiple chunks WHEN execClaude resolves THEN chunks are concatenated', async () => {
      const stdout = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
      const stderr = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
      const proc = new EventEmitter() as unknown as ChildProcess;
      (proc as unknown as Record<string, unknown>).stdout = stdout;
      (proc as unknown as Record<string, unknown>).stderr = stderr;
      mockSpawn.mockReturnValue(proc);

      const promise = execClaude('prompt', {}, mockSpawn as SpawnFn);
      stdout.emit('data', Buffer.from('chunk1'));
      stdout.emit('data', Buffer.from('chunk2'));
      proc.emit('close', 0);
      const result = await promise;

      expect(result.stdout).toBe('chunk1chunk2');
    });
  });

  describe('AC: Returns exit code', () => {
    it('GIVEN claude exits with code 0 WHEN execClaude resolves THEN exitCode is 0', async () => {
      const { proc, triggerExit } = makeMockProcess({ exitCode: 0 });
      mockSpawn.mockReturnValue(proc);

      const promise = execClaude('prompt', {}, mockSpawn as SpawnFn);
      triggerExit(0);
      const result = await promise;

      expect(result.exitCode).toBe(0);
    });

    it('GIVEN claude exits with code 1 WHEN execClaude resolves THEN exitCode is 1', async () => {
      const { proc, triggerExit } = makeMockProcess({ exitCode: 1 });
      mockSpawn.mockReturnValue(proc);

      const promise = execClaude('prompt', {}, mockSpawn as SpawnFn);
      triggerExit(1);
      const result = await promise;

      expect(result.exitCode).toBe(1);
    });

    it('GIVEN claude exits with code 2 WHEN execClaude resolves THEN exitCode is 2', async () => {
      const { proc, triggerExit } = makeMockProcess();
      mockSpawn.mockReturnValue(proc);

      const promise = execClaude('prompt', {}, mockSpawn as SpawnFn);
      triggerExit(2);
      const result = await promise;

      expect(result.exitCode).toBe(2);
    });
  });

  describe('AC: Timeout handling', () => {
    it('GIVEN timeout of 100ms and claude does not respond WHEN timeout elapses THEN timedOut is true', async () => {
      vi.useFakeTimers();

      const stdout = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
      const stderr = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
      const proc = new EventEmitter() as unknown as ChildProcess;
      (proc as unknown as Record<string, unknown>).stdout = stdout;
      (proc as unknown as Record<string, unknown>).stderr = stderr;
      (proc as unknown as Record<string, unknown>).kill = vi.fn();
      (proc as unknown as Record<string, unknown>).pid = 12345;
      mockSpawn.mockReturnValue(proc);

      const mockProcessKill = vi.spyOn(process, 'kill').mockImplementation(() => true);

      const promise = execClaude('prompt', { timeout: 100 }, mockSpawn as SpawnFn);

      vi.advanceTimersByTime(150);
      // After timeout kill is called; simulate process closing after kill
      proc.emit('close', null);

      const result = await promise;

      expect(result.timedOut).toBe(true);
      mockProcessKill.mockRestore();
      vi.useRealTimers();
    });

    it('GIVEN timeout and claude responds within time WHEN execClaude resolves THEN timedOut is false', async () => {
      const { proc, triggerExit } = makeMockProcess({ stdoutData: 'done' });
      mockSpawn.mockReturnValue(proc);

      const promise = execClaude('prompt', { timeout: 5000 }, mockSpawn as SpawnFn);
      triggerExit(0);
      const result = await promise;

      expect(result.timedOut).toBe(false);
    });

    it('GIVEN no timeout option WHEN execClaude called THEN defaults to 1800000ms', async () => {
      vi.useFakeTimers();

      const stdout = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
      const stderr = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
      const proc = new EventEmitter() as unknown as ChildProcess;
      (proc as unknown as Record<string, unknown>).stdout = stdout;
      (proc as unknown as Record<string, unknown>).stderr = stderr;
      (proc as unknown as Record<string, unknown>).kill = vi.fn();
      (proc as unknown as Record<string, unknown>).pid = 12345;
      mockSpawn.mockReturnValue(proc);

      const mockProcessKill = vi.spyOn(process, 'kill').mockImplementation(() => true);

      const promise = execClaude('prompt', {}, mockSpawn as SpawnFn);

      // Should not time out at 1799999ms
      vi.advanceTimersByTime(1799999);
      // Process still running, no timeout yet
      proc.emit('close', 0);
      const result = await promise;

      expect(result.timedOut).toBe(false);
      mockProcessKill.mockRestore();
      vi.useRealTimers();
    });

    it('GIVEN timeout elapses WHEN timeout fires THEN process.kill is called with negative PID (group kill)', async () => {
      vi.useFakeTimers();

      const stdout = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
      const stderr = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
      const proc = new EventEmitter() as unknown as ChildProcess;
      (proc as unknown as Record<string, unknown>).stdout = stdout;
      (proc as unknown as Record<string, unknown>).stderr = stderr;
      (proc as unknown as Record<string, unknown>).kill = vi.fn();
      (proc as unknown as Record<string, unknown>).pid = 99999;
      mockSpawn.mockReturnValue(proc);

      const mockProcessKill = vi.spyOn(process, 'kill').mockImplementation(() => true);

      const promise = execClaude('prompt', { timeout: 100 }, mockSpawn as SpawnFn);

      vi.advanceTimersByTime(150);
      proc.emit('close', null);
      await promise;

      // Should kill the process GROUP (negative PID) with SIGTERM
      expect(mockProcessKill).toHaveBeenCalledWith(-99999, 'SIGTERM');
      mockProcessKill.mockRestore();
      vi.useRealTimers();
    });

    it('GIVEN timeout elapses WHEN 5 seconds after SIGTERM THEN escalates to SIGKILL on process group', async () => {
      vi.useFakeTimers();

      const stdout = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
      const stderr = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
      const proc = new EventEmitter() as unknown as ChildProcess;
      (proc as unknown as Record<string, unknown>).stdout = stdout;
      (proc as unknown as Record<string, unknown>).stderr = stderr;
      (proc as unknown as Record<string, unknown>).kill = vi.fn();
      (proc as unknown as Record<string, unknown>).pid = 99999;
      mockSpawn.mockReturnValue(proc);

      const mockProcessKill = vi.spyOn(process, 'kill').mockImplementation(() => true);

      const promise = execClaude('prompt', { timeout: 100 }, mockSpawn as SpawnFn);

      vi.advanceTimersByTime(150);
      proc.emit('close', null);
      await promise;

      // Advance past the grace period to trigger SIGKILL
      vi.advanceTimersByTime(5000);

      expect(mockProcessKill).toHaveBeenCalledWith(-99999, 'SIGKILL');
      mockProcessKill.mockRestore();
      vi.useRealTimers();
    });
  });

  describe('AC: timedOut is false when process completes normally', () => {
    it('GIVEN successful claude run WHEN execClaude resolves THEN timedOut is false', async () => {
      const { proc, triggerExit } = makeMockProcess({ stdoutData: 'ok' });
      mockSpawn.mockReturnValue(proc);

      const promise = execClaude('prompt', {}, mockSpawn as SpawnFn);
      triggerExit(0);
      const result = await promise;

      expect(result.timedOut).toBe(false);
    });
  });

  describe('AC: spawn uses detached mode for process group management (P0-3)', () => {
    it('GIVEN execClaude is called WHEN spawn is invoked THEN detached: true is set', async () => {
      const { proc, triggerExit } = makeMockProcess();
      mockSpawn.mockReturnValue(proc);

      const promise = execClaude('prompt', {}, mockSpawn as SpawnFn);
      triggerExit(0);
      await promise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.any(Array),
        expect.objectContaining({ detached: true })
      );
    });
  });
});

describe('scrubEnvironment() — P0-2: Env var scrubbing', () => {
  describe('AC: Removes keys with sensitive prefixes', () => {
    it('GIVEN env with JIRA_ prefix WHEN scrubEnvironment called THEN removes JIRA_ key', () => {
      const env = { JIRA_TOKEN: 'secret', PATH: '/usr/bin' };
      const result = scrubEnvironment(env);
      expect(result).not.toHaveProperty('JIRA_TOKEN');
    });

    it('GIVEN env with LINEAR_ prefix WHEN scrubEnvironment called THEN removes LINEAR_ key', () => {
      const env = { LINEAR_API_KEY: 'abc123', HOME: '/home/user' };
      const result = scrubEnvironment(env);
      expect(result).not.toHaveProperty('LINEAR_API_KEY');
    });

    it('GIVEN env with AWS_ prefix WHEN scrubEnvironment called THEN removes AWS_ key', () => {
      const env = { AWS_ACCESS_KEY_ID: 'AKIA...', AWS_SECRET_ACCESS_KEY: 'secret', PATH: '/usr/bin' };
      const result = scrubEnvironment(env);
      expect(result).not.toHaveProperty('AWS_ACCESS_KEY_ID');
      expect(result).not.toHaveProperty('AWS_SECRET_ACCESS_KEY');
    });

    it('GIVEN env with GITHUB_TOKEN WHEN scrubEnvironment called THEN removes it', () => {
      const env = { GITHUB_TOKEN: 'ghp_secret', PATH: '/usr/bin' };
      const result = scrubEnvironment(env);
      expect(result).not.toHaveProperty('GITHUB_TOKEN');
    });

    it('GIVEN env with GH_TOKEN WHEN scrubEnvironment called THEN removes it', () => {
      const env = { GH_TOKEN: 'ghp_secret', PATH: '/usr/bin' };
      const result = scrubEnvironment(env);
      expect(result).not.toHaveProperty('GH_TOKEN');
    });

    it('GIVEN env with NPM_TOKEN WHEN scrubEnvironment called THEN removes it', () => {
      const env = { NPM_TOKEN: 'npm_secret', PATH: '/usr/bin' };
      const result = scrubEnvironment(env);
      expect(result).not.toHaveProperty('NPM_TOKEN');
    });

    it('GIVEN env with NPM_CONFIG_ prefix WHEN scrubEnvironment called THEN removes it', () => {
      const env = { NPM_CONFIG_TOKEN: 'secret', PATH: '/usr/bin' };
      const result = scrubEnvironment(env);
      expect(result).not.toHaveProperty('NPM_CONFIG_TOKEN');
    });

    it('GIVEN env with ANTHROPIC_API_KEY WHEN scrubEnvironment called THEN removes it', () => {
      const env = { ANTHROPIC_API_KEY: 'sk-ant-secret', PATH: '/usr/bin' };
      const result = scrubEnvironment(env);
      expect(result).not.toHaveProperty('ANTHROPIC_API_KEY');
    });

    it('GIVEN env with OPENAI_API_KEY WHEN scrubEnvironment called THEN removes it', () => {
      const env = { OPENAI_API_KEY: 'sk-openai-secret', PATH: '/usr/bin' };
      const result = scrubEnvironment(env);
      expect(result).not.toHaveProperty('OPENAI_API_KEY');
    });

    it('GIVEN env with STRIPE_ prefix WHEN scrubEnvironment called THEN removes it', () => {
      const env = { STRIPE_SECRET_KEY: 'sk_live_secret', PATH: '/usr/bin' };
      const result = scrubEnvironment(env);
      expect(result).not.toHaveProperty('STRIPE_SECRET_KEY');
    });

    it('GIVEN env with SLACK_ prefix WHEN scrubEnvironment called THEN removes it', () => {
      const env = { SLACK_TOKEN: 'xoxb-secret', PATH: '/usr/bin' };
      const result = scrubEnvironment(env);
      expect(result).not.toHaveProperty('SLACK_TOKEN');
    });

    it('GIVEN env with WEBHOOK_ prefix WHEN scrubEnvironment called THEN removes it', () => {
      const env = { WEBHOOK_SECRET: 'secret', PATH: '/usr/bin' };
      const result = scrubEnvironment(env);
      expect(result).not.toHaveProperty('WEBHOOK_SECRET');
    });

    it('GIVEN env with DATABASE_URL WHEN scrubEnvironment called THEN removes it', () => {
      const env = { DATABASE_URL: 'postgres://user:pass@host/db', PATH: '/usr/bin' };
      const result = scrubEnvironment(env);
      expect(result).not.toHaveProperty('DATABASE_URL');
    });

    it('GIVEN env with DB_ prefix WHEN scrubEnvironment called THEN removes it', () => {
      const env = { DB_PASSWORD: 'secret', PATH: '/usr/bin' };
      const result = scrubEnvironment(env);
      expect(result).not.toHaveProperty('DB_PASSWORD');
    });

    it('GIVEN env with REDIS_ prefix WHEN scrubEnvironment called THEN removes it', () => {
      const env = { REDIS_URL: 'redis://secret', PATH: '/usr/bin' };
      const result = scrubEnvironment(env);
      expect(result).not.toHaveProperty('REDIS_URL');
    });

    it('GIVEN env with MONGO_ prefix WHEN scrubEnvironment called THEN removes it', () => {
      const env = { MONGO_PASSWORD: 'secret', PATH: '/usr/bin' };
      const result = scrubEnvironment(env);
      expect(result).not.toHaveProperty('MONGO_PASSWORD');
    });

    it('GIVEN env with SECRET_ prefix WHEN scrubEnvironment called THEN removes it', () => {
      const env = { SECRET_KEY: 'mysecret', PATH: '/usr/bin' };
      const result = scrubEnvironment(env);
      expect(result).not.toHaveProperty('SECRET_KEY');
    });

    it('GIVEN env with TOKEN_ prefix WHEN scrubEnvironment called THEN removes it', () => {
      const env = { TOKEN_VALUE: 'mytoken', PATH: '/usr/bin' };
      const result = scrubEnvironment(env);
      expect(result).not.toHaveProperty('TOKEN_VALUE');
    });

    it('GIVEN env with API_KEY_ prefix WHEN scrubEnvironment called THEN removes it', () => {
      const env = { API_KEY_SERVICE: 'key123', PATH: '/usr/bin' };
      const result = scrubEnvironment(env);
      expect(result).not.toHaveProperty('API_KEY_SERVICE');
    });

    it('GIVEN env with PRIVATE_KEY_ prefix WHEN scrubEnvironment called THEN removes it', () => {
      const env = { PRIVATE_KEY_PEM: 'BEGIN RSA...', PATH: '/usr/bin' };
      const result = scrubEnvironment(env);
      expect(result).not.toHaveProperty('PRIVATE_KEY_PEM');
    });

    it('GIVEN env with MG_JIRA_ prefix WHEN scrubEnvironment called THEN removes it', () => {
      const env = { MG_JIRA_TOKEN: 'secret', PATH: '/usr/bin' };
      const result = scrubEnvironment(env);
      expect(result).not.toHaveProperty('MG_JIRA_TOKEN');
    });

    it('GIVEN env with MG_LINEAR_ prefix WHEN scrubEnvironment called THEN removes it', () => {
      const env = { MG_LINEAR_API_KEY: 'secret', PATH: '/usr/bin' };
      const result = scrubEnvironment(env);
      expect(result).not.toHaveProperty('MG_LINEAR_API_KEY');
    });

    it('GIVEN env key is lowercase sensitive prefix WHEN scrubEnvironment called THEN still removes it (case insensitive)', () => {
      const env = { jira_token: 'secret', PATH: '/usr/bin' };
      const result = scrubEnvironment(env);
      expect(result).not.toHaveProperty('jira_token');
    });
  });

  describe('AC: Preserves safe environment variables', () => {
    it('GIVEN env with PATH WHEN scrubEnvironment called THEN preserves PATH', () => {
      const env = { PATH: '/usr/bin:/bin', JIRA_TOKEN: 'secret' };
      const result = scrubEnvironment(env);
      expect(result).toHaveProperty('PATH', '/usr/bin:/bin');
    });

    it('GIVEN env with HOME WHEN scrubEnvironment called THEN preserves HOME', () => {
      const env = { HOME: '/home/user', AWS_SECRET: 'secret' };
      const result = scrubEnvironment(env);
      expect(result).toHaveProperty('HOME', '/home/user');
    });

    it('GIVEN env with NODE_ENV WHEN scrubEnvironment called THEN preserves NODE_ENV', () => {
      const env = { NODE_ENV: 'production', STRIPE_KEY: 'secret' };
      const result = scrubEnvironment(env);
      expect(result).toHaveProperty('NODE_ENV', 'production');
    });

    it('GIVEN env with TERM WHEN scrubEnvironment called THEN preserves TERM', () => {
      const env = { TERM: 'xterm-256color', GH_TOKEN: 'secret' };
      const result = scrubEnvironment(env);
      expect(result).toHaveProperty('TERM', 'xterm-256color');
    });

    it('GIVEN env with USER WHEN scrubEnvironment called THEN preserves USER', () => {
      const env = { USER: 'myuser', ANTHROPIC_API_KEY: 'secret' };
      const result = scrubEnvironment(env);
      expect(result).toHaveProperty('USER', 'myuser');
    });

    it('GIVEN env value is undefined WHEN scrubEnvironment called THEN skips that key', () => {
      const env: NodeJS.ProcessEnv = { PATH: '/usr/bin', UNDEFINED_VAR: undefined };
      const result = scrubEnvironment(env);
      expect(result).not.toHaveProperty('UNDEFINED_VAR');
      expect(result).toHaveProperty('PATH');
    });

    it('GIVEN empty env WHEN scrubEnvironment called THEN returns empty object', () => {
      const result = scrubEnvironment({});
      expect(result).toEqual({});
    });
  });

  describe('AC: Claude subprocess receives scrubbed env (P0-2 integration)', () => {
    let mockSpawn: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockSpawn = vi.fn();
    });

    it('GIVEN process.env contains JIRA_TOKEN WHEN execClaude called THEN subprocess env does not have JIRA_TOKEN', async () => {
      // Temporarily set a sensitive env var in process.env
      const originalJira = process.env.JIRA_TOKEN;
      process.env.JIRA_TOKEN = 'test-secret';

      const { proc, triggerExit } = makeMockProcess();
      mockSpawn.mockReturnValue(proc);

      const promise = execClaude('prompt', {}, mockSpawn as SpawnFn);
      triggerExit(0);
      await promise;

      const spawnCall = mockSpawn.mock.calls[0];
      const spawnedEnv = spawnCall[2].env as Record<string, string>;
      expect(spawnedEnv).not.toHaveProperty('JIRA_TOKEN');

      // Restore
      if (originalJira === undefined) delete process.env.JIRA_TOKEN;
      else process.env.JIRA_TOKEN = originalJira;
    });

    it('GIVEN process.env contains PATH WHEN execClaude called THEN subprocess env preserves PATH', async () => {
      const { proc, triggerExit } = makeMockProcess();
      mockSpawn.mockReturnValue(proc);

      const promise = execClaude('prompt', {}, mockSpawn as SpawnFn);
      triggerExit(0);
      await promise;

      const spawnCall = mockSpawn.mock.calls[0];
      const spawnedEnv = spawnCall[2].env as Record<string, string>;
      // PATH should be present (comes from the real process.env)
      if (process.env.PATH) {
        expect(spawnedEnv).toHaveProperty('PATH');
      }
    });

    it('GIVEN options.env contains extra vars WHEN execClaude called THEN extra vars are merged into scrubbed env', async () => {
      const { proc, triggerExit } = makeMockProcess();
      mockSpawn.mockReturnValue(proc);

      const promise = execClaude('prompt', { env: { CUSTOM_VAR: 'custom-value' } }, mockSpawn as SpawnFn);
      triggerExit(0);
      await promise;

      const spawnCall = mockSpawn.mock.calls[0];
      const spawnedEnv = spawnCall[2].env as Record<string, string>;
      expect(spawnedEnv).toHaveProperty('CUSTOM_VAR', 'custom-value');
    });
  });
});

describe('execClaude() — P0-4: Output buffer limiting', () => {
  let mockSpawn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSpawn = vi.fn();
  });

  describe('AC: stdout is truncated at 50MB', () => {
    it('GIVEN stdout output under 50MB WHEN execClaude resolves THEN stdout is not truncated', async () => {
      const stdout = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
      const stderr = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
      const proc = new EventEmitter() as unknown as ChildProcess;
      (proc as unknown as Record<string, unknown>).stdout = stdout;
      (proc as unknown as Record<string, unknown>).stderr = stderr;
      mockSpawn.mockReturnValue(proc);

      const promise = execClaude('prompt', {}, mockSpawn as SpawnFn);
      stdout.emit('data', Buffer.from('small output'));
      proc.emit('close', 0);
      const result = await promise;

      expect(result.stdout).toBe('small output');
      expect(result.stdout).not.toContain('[OUTPUT TRUNCATED');
    });

    it('GIVEN stdout exceeds maxOutputBytes WHEN execClaude resolves THEN stdout contains truncation message', async () => {
      const stdout = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
      const stderr = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
      const proc = new EventEmitter() as unknown as ChildProcess;
      (proc as unknown as Record<string, unknown>).stdout = stdout;
      (proc as unknown as Record<string, unknown>).stderr = stderr;
      mockSpawn.mockReturnValue(proc);

      // Use a small limit via options
      const promise = execClaude('prompt', { maxOutputBytes: 10 }, mockSpawn as SpawnFn);
      // Emit more than 10 bytes
      stdout.emit('data', Buffer.from('12345678901234567890'));
      proc.emit('close', 0);
      const result = await promise;

      expect(result.stdout).toContain('[OUTPUT TRUNCATED');
    });

    it('GIVEN stdout exactly at limit WHEN another chunk arrives THEN truncation message is appended', async () => {
      const stdout = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
      const stderr = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
      const proc = new EventEmitter() as unknown as ChildProcess;
      (proc as unknown as Record<string, unknown>).stdout = stdout;
      (proc as unknown as Record<string, unknown>).stderr = stderr;
      mockSpawn.mockReturnValue(proc);

      const promise = execClaude('prompt', { maxOutputBytes: 5 }, mockSpawn as SpawnFn);
      stdout.emit('data', Buffer.from('hello')); // exactly 5 bytes
      stdout.emit('data', Buffer.from(' world')); // exceeds limit
      proc.emit('close', 0);
      const result = await promise;

      expect(result.stdout).toContain('[OUTPUT TRUNCATED');
    });

    it('GIVEN truncation occurred WHEN more data arrives THEN additional data is ignored', async () => {
      const stdout = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
      const stderr = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
      const proc = new EventEmitter() as unknown as ChildProcess;
      (proc as unknown as Record<string, unknown>).stdout = stdout;
      (proc as unknown as Record<string, unknown>).stderr = stderr;
      mockSpawn.mockReturnValue(proc);

      const promise = execClaude('prompt', { maxOutputBytes: 5 }, mockSpawn as SpawnFn);
      stdout.emit('data', Buffer.from('123456789')); // exceeds 5 bytes
      stdout.emit('data', Buffer.from('MORE_DATA_AFTER_TRUNCATION'));
      proc.emit('close', 0);
      const result = await promise;

      // The truncation marker should appear only once
      const truncationCount = (result.stdout.match(/\[OUTPUT TRUNCATED/g) || []).length;
      expect(truncationCount).toBe(1);
    });
  });

  describe('AC: stderr is truncated at 50MB', () => {
    it('GIVEN stderr output under limit WHEN execClaude resolves THEN stderr is not truncated', async () => {
      const stdout = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
      const stderr = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
      const proc = new EventEmitter() as unknown as ChildProcess;
      (proc as unknown as Record<string, unknown>).stdout = stdout;
      (proc as unknown as Record<string, unknown>).stderr = stderr;
      mockSpawn.mockReturnValue(proc);

      const promise = execClaude('prompt', {}, mockSpawn as SpawnFn);
      stderr.emit('data', Buffer.from('small error'));
      proc.emit('close', 0);
      const result = await promise;

      expect(result.stderr).toBe('small error');
      expect(result.stderr).not.toContain('[OUTPUT TRUNCATED');
    });

    it('GIVEN stderr exceeds maxOutputBytes WHEN execClaude resolves THEN stderr contains truncation message', async () => {
      const stdout = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
      const stderr = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
      const proc = new EventEmitter() as unknown as ChildProcess;
      (proc as unknown as Record<string, unknown>).stdout = stdout;
      (proc as unknown as Record<string, unknown>).stderr = stderr;
      mockSpawn.mockReturnValue(proc);

      const promise = execClaude('prompt', { maxOutputBytes: 10 }, mockSpawn as SpawnFn);
      stderr.emit('data', Buffer.from('12345678901234567890'));
      proc.emit('close', 0);
      const result = await promise;

      expect(result.stderr).toContain('[OUTPUT TRUNCATED');
    });

    it('GIVEN stderr truncation occurred WHEN more data arrives THEN additional data is ignored', async () => {
      const stdout = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
      const stderr = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
      const proc = new EventEmitter() as unknown as ChildProcess;
      (proc as unknown as Record<string, unknown>).stdout = stdout;
      (proc as unknown as Record<string, unknown>).stderr = stderr;
      mockSpawn.mockReturnValue(proc);

      const promise = execClaude('prompt', { maxOutputBytes: 5 }, mockSpawn as SpawnFn);
      stderr.emit('data', Buffer.from('123456789'));
      stderr.emit('data', Buffer.from('MORE_AFTER_TRUNCATION'));
      proc.emit('close', 0);
      const result = await promise;

      const truncationCount = (result.stderr.match(/\[OUTPUT TRUNCATED/g) || []).length;
      expect(truncationCount).toBe(1);
    });

    it('GIVEN stderr exactly at limit WHEN another chunk arrives THEN truncation message is appended (lines 147-150)', async () => {
      const stdout = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
      const stderr = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
      const proc = new EventEmitter() as unknown as ChildProcess;
      (proc as unknown as Record<string, unknown>).stdout = stdout;
      (proc as unknown as Record<string, unknown>).stderr = stderr;
      mockSpawn.mockReturnValue(proc);

      const promise = execClaude('prompt', { maxOutputBytes: 5 }, mockSpawn as SpawnFn);
      // First chunk fills stderr to exactly the limit (5 bytes)
      stderr.emit('data', Buffer.from('hello'));
      // Second chunk arrives when remaining <= 0 — hits lines 147-150
      stderr.emit('data', Buffer.from('world'));
      proc.emit('close', 0);
      const result = await promise;

      expect(result.stderr).toContain('[OUTPUT TRUNCATED');
      // Only one truncation marker — the early-return prevents double-appending
      const truncationCount = (result.stderr.match(/\[OUTPUT TRUNCATED/g) || []).length;
      expect(truncationCount).toBe(1);
    });
  });
});

describe('execClaude() — timeout kill edge cases (P0-3)', () => {
  let mockSpawn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSpawn = vi.fn();
  });

  it('GIVEN process has no pid WHEN timeout fires THEN falls back to proc.kill() (lines 173-175)', async () => {
    vi.useFakeTimers();

    const stdout = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
    const stderr = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
    const proc = new EventEmitter() as unknown as ChildProcess;
    (proc as unknown as Record<string, unknown>).stdout = stdout;
    (proc as unknown as Record<string, unknown>).stderr = stderr;
    // Deliberately no pid — proc.pid is undefined
    (proc as unknown as Record<string, unknown>).pid = undefined;
    const killFn = vi.fn();
    (proc as unknown as Record<string, unknown>).kill = killFn;
    mockSpawn.mockReturnValue(proc);

    const promise = execClaude('prompt', { timeout: 100 }, mockSpawn as SpawnFn);

    vi.advanceTimersByTime(150);
    proc.emit('close', null);
    const result = await promise;

    expect(result.timedOut).toBe(true);
    // proc.kill() fallback should have been called
    expect(killFn).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('GIVEN process.kill(-pid) throws WHEN timeout fires THEN falls back to proc.kill() (lines 177-184)', async () => {
    vi.useFakeTimers();

    const stdout = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
    const stderr = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
    const proc = new EventEmitter() as unknown as ChildProcess;
    (proc as unknown as Record<string, unknown>).stdout = stdout;
    (proc as unknown as Record<string, unknown>).stderr = stderr;
    (proc as unknown as Record<string, unknown>).pid = 55555;
    const killFn = vi.fn();
    (proc as unknown as Record<string, unknown>).kill = killFn;
    mockSpawn.mockReturnValue(proc);

    // Make process.kill throw on first call (SIGTERM to process group)
    const mockProcessKill = vi.spyOn(process, 'kill').mockImplementationOnce(() => {
      throw new Error('ESRCH: no such process');
    }).mockImplementation(() => true);

    const promise = execClaude('prompt', { timeout: 100 }, mockSpawn as SpawnFn);

    vi.advanceTimersByTime(150);
    proc.emit('close', null);
    const result = await promise;

    expect(result.timedOut).toBe(true);
    // Fallback proc.kill() should have been called after process.kill threw
    expect(killFn).toHaveBeenCalled();

    mockProcessKill.mockRestore();
    vi.useRealTimers();
  });

  it('GIVEN process.kill(-pid) throws AND proc.kill() also throws WHEN timeout fires THEN no error propagates (lines 182-183)', async () => {
    vi.useFakeTimers();

    const stdout = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
    const stderr = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
    const proc = new EventEmitter() as unknown as ChildProcess;
    (proc as unknown as Record<string, unknown>).stdout = stdout;
    (proc as unknown as Record<string, unknown>).stderr = stderr;
    (proc as unknown as Record<string, unknown>).pid = 66666;
    // proc.kill() itself throws — process already gone
    const killFn = vi.fn().mockImplementation(() => {
      throw new Error('ESRCH: no such process');
    });
    (proc as unknown as Record<string, unknown>).kill = killFn;
    mockSpawn.mockReturnValue(proc);

    // process.kill(-pid, 'SIGTERM') also throws
    const mockProcessKill = vi.spyOn(process, 'kill').mockImplementation(() => {
      throw new Error('ESRCH: no such process');
    });

    const promise = execClaude('prompt', { timeout: 100 }, mockSpawn as SpawnFn);

    // Should not throw despite both kill paths throwing
    vi.advanceTimersByTime(150);
    proc.emit('close', null);
    const result = await promise;

    expect(result.timedOut).toBe(true);
    // killFn was attempted in the fallback
    expect(killFn).toHaveBeenCalled();

    mockProcessKill.mockRestore();
    vi.useRealTimers();
  });

  it('GIVEN process already gone WHEN SIGKILL escalation fires THEN no error propagates (lines 193-194)', async () => {
    vi.useFakeTimers();

    const stdout = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
    const stderr = new EventEmitter() as NodeJS.ReadableStream & EventEmitter;
    const proc = new EventEmitter() as unknown as ChildProcess;
    (proc as unknown as Record<string, unknown>).stdout = stdout;
    (proc as unknown as Record<string, unknown>).stderr = stderr;
    (proc as unknown as Record<string, unknown>).pid = 77777;
    (proc as unknown as Record<string, unknown>).kill = vi.fn();
    mockSpawn.mockReturnValue(proc);

    // SIGTERM succeeds but SIGKILL throws (process already gone)
    const mockProcessKill = vi.spyOn(process, 'kill')
      .mockImplementationOnce(() => true)  // SIGTERM — succeeds
      .mockImplementationOnce(() => {       // SIGKILL — throws as if process already gone
        throw new Error('ESRCH: no such process');
      });

    const promise = execClaude('prompt', { timeout: 100 }, mockSpawn as SpawnFn);

    vi.advanceTimersByTime(150);
    proc.emit('close', null);
    const result = await promise;

    // Advance past grace period to trigger SIGKILL escalation
    vi.advanceTimersByTime(5000);

    // The promise should have resolved cleanly — no error thrown
    expect(result.timedOut).toBe(true);
    expect(mockProcessKill).toHaveBeenCalledWith(-77777, 'SIGKILL');

    mockProcessKill.mockRestore();
    vi.useRealTimers();
  });
});

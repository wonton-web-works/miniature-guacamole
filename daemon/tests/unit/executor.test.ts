import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildExecutionPrompt, executeWorkstream } from '../../src/executor';
import type { NormalizedTicket } from '../../src/providers/types';
import type { WorkstreamPlan } from '../../src/planner';
import type { ExecClaudeFn } from '../../src/executor';

const TICKET: NormalizedTicket = {
  id: 'PROJ-123',
  source: 'jira',
  title: 'Add login endpoint',
  description: 'Implement REST API endpoint for user login',
  priority: 'high',
  labels: ['backend'],
  url: 'https://example.atlassian.net/browse/PROJ-123',
  raw: {},
};

const WS: WorkstreamPlan = {
  name: 'API endpoints',
  acceptanceCriteria: 'All endpoints return correct HTTP status codes and are covered by tests',
};

describe('buildExecutionPrompt() (WS-DAEMON-11)', () => {
  describe('AC: Builds structured execution prompt', () => {
    it('GIVEN workstream and ticket WHEN buildExecutionPrompt called THEN includes workstream name', () => {
      const prompt = buildExecutionPrompt(WS, TICKET);
      expect(prompt).toContain('API endpoints');
    });

    it('GIVEN workstream and ticket WHEN buildExecutionPrompt called THEN includes ticket id and title', () => {
      const prompt = buildExecutionPrompt(WS, TICKET);
      expect(prompt).toContain('PROJ-123');
      expect(prompt).toContain('Add login endpoint');
    });

    it('GIVEN workstream and ticket WHEN buildExecutionPrompt called THEN includes acceptance criteria', () => {
      const prompt = buildExecutionPrompt(WS, TICKET);
      expect(prompt).toContain('All endpoints return correct HTTP status codes');
    });

    it('GIVEN workstream and ticket WHEN buildExecutionPrompt called THEN includes ticket description', () => {
      const prompt = buildExecutionPrompt(WS, TICKET);
      expect(prompt).toContain('Implement REST API endpoint for user login');
    });

    it('GIVEN workstream and ticket WHEN buildExecutionPrompt called THEN mentions TDD', () => {
      const prompt = buildExecutionPrompt(WS, TICKET);
      expect(prompt.toLowerCase()).toContain('tdd');
    });

    it('GIVEN workstream and ticket WHEN buildExecutionPrompt called THEN returns non-empty string', () => {
      const prompt = buildExecutionPrompt(WS, TICKET);
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });
  });
});

describe('executeWorkstream() (WS-DAEMON-11)', () => {
  let mockExecClaude: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExecClaude = vi.fn();
  });

  describe('AC: Executes claude in the worktree directory', () => {
    it('GIVEN a worktreePath WHEN executeWorkstream called THEN passes cwd to execClaude', async () => {
      mockExecClaude.mockResolvedValue({
        stdout: 'Implementation complete',
        stderr: '',
        exitCode: 0,
        timedOut: false,
      });

      await executeWorkstream(WS, TICKET, '/tmp/worktrees/PROJ-123', { timeout: 1000 }, mockExecClaude as ExecClaudeFn);

      const [, options] = mockExecClaude.mock.calls[0];
      expect(options).toMatchObject({ cwd: '/tmp/worktrees/PROJ-123' });
    });

    it('GIVEN timeout option WHEN executeWorkstream called THEN passes timeout to execClaude', async () => {
      mockExecClaude.mockResolvedValue({
        stdout: 'done',
        stderr: '',
        exitCode: 0,
        timedOut: false,
      });

      await executeWorkstream(WS, TICKET, '/tmp/wt', { timeout: 55000 }, mockExecClaude as ExecClaudeFn);

      const [, options] = mockExecClaude.mock.calls[0];
      expect(options).toMatchObject({ timeout: 55000 });
    });
  });

  describe('AC: Returns ExecutionResult', () => {
    it('GIVEN claude exits with 0 WHEN executeWorkstream called THEN success is true', async () => {
      mockExecClaude.mockResolvedValue({
        stdout: 'All tests pass',
        stderr: '',
        exitCode: 0,
        timedOut: false,
      });

      const result = await executeWorkstream(WS, TICKET, '/tmp/wt', { timeout: 1000 }, mockExecClaude as ExecClaudeFn);

      expect(result.success).toBe(true);
    });

    it('GIVEN claude exits with non-zero WHEN executeWorkstream called THEN success is false', async () => {
      mockExecClaude.mockResolvedValue({
        stdout: '',
        stderr: 'Build failed',
        exitCode: 1,
        timedOut: false,
      });

      const result = await executeWorkstream(WS, TICKET, '/tmp/wt', { timeout: 1000 }, mockExecClaude as ExecClaudeFn);

      expect(result.success).toBe(false);
    });

    it('GIVEN claude times out WHEN executeWorkstream called THEN success is false', async () => {
      mockExecClaude.mockResolvedValue({
        stdout: '',
        stderr: '',
        exitCode: 0,
        timedOut: true,
      });

      const result = await executeWorkstream(WS, TICKET, '/tmp/wt', { timeout: 1000 }, mockExecClaude as ExecClaudeFn);

      expect(result.success).toBe(false);
    });

    it('GIVEN successful execution WHEN executeWorkstream called THEN output contains stdout', async () => {
      mockExecClaude.mockResolvedValue({
        stdout: 'Tests pass, PR ready',
        stderr: '',
        exitCode: 0,
        timedOut: false,
      });

      const result = await executeWorkstream(WS, TICKET, '/tmp/wt', { timeout: 1000 }, mockExecClaude as ExecClaudeFn);

      expect(result.output).toContain('Tests pass, PR ready');
    });

    it('GIVEN execution WHEN executeWorkstream resolves THEN result includes workstream name', async () => {
      mockExecClaude.mockResolvedValue({
        stdout: 'done',
        stderr: '',
        exitCode: 0,
        timedOut: false,
      });

      const result = await executeWorkstream(WS, TICKET, '/tmp/wt', { timeout: 1000 }, mockExecClaude as ExecClaudeFn);

      expect(result.workstream).toBe('API endpoints');
    });

    it('GIVEN execution WHEN executeWorkstream resolves THEN result includes durationMs', async () => {
      mockExecClaude.mockResolvedValue({
        stdout: 'done',
        stderr: '',
        exitCode: 0,
        timedOut: false,
      });

      const result = await executeWorkstream(WS, TICKET, '/tmp/wt', { timeout: 1000 }, mockExecClaude as ExecClaudeFn);

      expect(typeof result.durationMs).toBe('number');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('GIVEN failed execution WHEN executeWorkstream resolves THEN error field is populated', async () => {
      mockExecClaude.mockResolvedValue({
        stdout: '',
        stderr: 'Error: compilation failed',
        exitCode: 1,
        timedOut: false,
      });

      const result = await executeWorkstream(WS, TICKET, '/tmp/wt', { timeout: 1000 }, mockExecClaude as ExecClaudeFn);

      expect(result.error).toBeDefined();
      expect(result.error).toContain('compilation failed');
    });

    it('GIVEN timed-out execution WHEN executeWorkstream resolves THEN error mentions timeout', async () => {
      mockExecClaude.mockResolvedValue({
        stdout: '',
        stderr: '',
        exitCode: 0,
        timedOut: true,
      });

      const result = await executeWorkstream(WS, TICKET, '/tmp/wt', { timeout: 1000 }, mockExecClaude as ExecClaudeFn);

      expect(result.error).toBeDefined();
      expect(result.error?.toLowerCase()).toContain('timed out');
    });
  });

  describe('AC: Prompt is passed to execClaude', () => {
    it('GIVEN workstream and ticket WHEN executeWorkstream called THEN prompt contains workstream name', async () => {
      mockExecClaude.mockResolvedValue({
        stdout: 'done',
        stderr: '',
        exitCode: 0,
        timedOut: false,
      });

      await executeWorkstream(WS, TICKET, '/tmp/wt', { timeout: 1000 }, mockExecClaude as ExecClaudeFn);

      const [prompt] = mockExecClaude.mock.calls[0];
      expect(prompt).toContain('API endpoints');
    });
  });
});

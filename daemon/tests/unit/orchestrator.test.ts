import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processTicket, runPollCycle } from '../../src/orchestrator';
import type { OrchestratorConfig } from '../../src/orchestrator';
import type { NormalizedTicket, TicketProvider } from '../../src/providers/types';
import type { DaemonConfig } from '../../src/types';
import type { WorkstreamPlan } from '../../src/planner';
import type { ExecutionResult } from '../../src/executor';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TICKET: NormalizedTicket = {
  id: 'PROJ-123',
  source: 'jira',
  title: 'Add login endpoint',
  description: 'Implement login via OAuth2',
  priority: 'high',
  labels: ['backend'],
  url: 'https://example.atlassian.net/browse/PROJ-123',
  raw: {},
};

const WORKSTREAMS: WorkstreamPlan[] = [
  { name: 'Database schema', acceptanceCriteria: 'Tables migrated' },
  { name: 'API endpoints', acceptanceCriteria: 'Endpoints tested' },
];

const OK_RESULT: ExecutionResult = {
  workstream: 'Database schema',
  success: true,
  output: 'All tests pass',
  durationMs: 5000,
};

function makeConfig(overrides?: Partial<DaemonConfig['orchestration']>): DaemonConfig {
  return {
    provider: 'jira',
    jira: { host: 'https://example.atlassian.net', apiToken: 'tok', project: 'PROJ', jql: '' },
    github: { repo: 'owner/repo', baseBranch: 'main' },
    polling: { intervalSeconds: 300, batchSize: 5 },
    orchestration: {
      claudeTimeout: 1800000,
      concurrency: 1,
      delayBetweenTicketsMs: 0,
      dryRun: false,
      errorBudget: 3,
      ...overrides,
    },
  };
}

function makeProvider(overrides?: Partial<TicketProvider>): TicketProvider {
  return {
    poll: vi.fn().mockResolvedValue([TICKET]),
    createSubtask: vi.fn().mockResolvedValue('SUB-1'),
    transitionStatus: vi.fn().mockResolvedValue(undefined),
    addComment: vi.fn().mockResolvedValue(undefined),
    linkPR: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeDeps(overrides?: {
  providerOverrides?: Partial<TicketProvider>;
  configOverrides?: Partial<DaemonConfig['orchestration']>;
  planTicket?: ReturnType<typeof vi.fn>;
  executeWorkstream?: ReturnType<typeof vi.fn>;
  createWorktree?: ReturnType<typeof vi.fn>;
  removeWorktree?: ReturnType<typeof vi.fn>;
  createPR?: ReturnType<typeof vi.fn>;
  tracker?: {
    markProcessing: ReturnType<typeof vi.fn>;
    markComplete: ReturnType<typeof vi.fn>;
    markFailed: ReturnType<typeof vi.fn>;
    getProcessedTickets: ReturnType<typeof vi.fn>;
  };
}): OrchestratorConfig {
  const tracker = overrides?.tracker ?? {
    markProcessing: vi.fn(),
    markComplete: vi.fn(),
    markFailed: vi.fn(),
    getProcessedTickets: vi.fn().mockReturnValue([]),
  };

  return {
    provider: makeProvider(overrides?.providerOverrides),
    config: makeConfig(overrides?.configOverrides),
    tracker,
    planTicket: overrides?.planTicket ?? vi.fn().mockResolvedValue(WORKSTREAMS),
    executeWorkstream:
      overrides?.executeWorkstream ??
      vi.fn().mockImplementation(async (ws: WorkstreamPlan) => ({
        workstream: ws.name,
        success: true,
        output: 'done',
        durationMs: 100,
      })),
    createWorktree:
      overrides?.createWorktree ??
      vi.fn().mockReturnValue({
        worktreePath: '/tmp/.mg-daemon/worktrees/PROJ-123',
        branchName: 'feature/PROJ-123-add-login-endpoint',
      }),
    removeWorktree: overrides?.removeWorktree ?? vi.fn(),
    createPR:
      overrides?.createPR ??
      vi.fn().mockReturnValue({ success: true, prUrl: 'https://github.com/owner/repo/pull/42' }),
  };
}

// ---------------------------------------------------------------------------
// processTicket() tests
// ---------------------------------------------------------------------------

describe('processTicket() (WS-DAEMON-11)', () => {
  describe('AC: Transitions ticket to In Progress', () => {
    it('GIVEN a ticket WHEN processTicket called THEN transitions ticket to in_progress', async () => {
      const deps = makeDeps();
      await processTicket(TICKET, deps);
      expect(deps.provider.transitionStatus).toHaveBeenCalledWith(TICKET.id, 'in_progress');
    });

    it('GIVEN dryRun=true WHEN processTicket called THEN does NOT transition to in_progress', async () => {
      const deps = makeDeps({ configOverrides: { dryRun: true } });
      await processTicket(TICKET, deps);
      expect(deps.provider.transitionStatus).not.toHaveBeenCalledWith(TICKET.id, 'in_progress');
    });

    it('GIVEN transitionStatus throws WHEN processTicket called THEN pipeline continues', async () => {
      const deps = makeDeps({
        providerOverrides: {
          transitionStatus: vi.fn().mockRejectedValue(new Error('workflow rule rejected')),
        },
      });
      const result = await processTicket(TICKET, deps);
      // Pipeline should continue — createPR should still be called
      expect(deps.createPR).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('AC: Plans workstreams via planTicket', () => {
    it('GIVEN a ticket WHEN processTicket called THEN calls planTicket with the ticket', async () => {
      const deps = makeDeps();
      await processTicket(TICKET, deps);
      expect(deps.planTicket).toHaveBeenCalledWith(
        TICKET,
        expect.objectContaining({ timeout: expect.any(Number) }),
        expect.any(Function)
      );
    });

    it('GIVEN dryRun=true WHEN processTicket called THEN planTicket is still called', async () => {
      const deps = makeDeps({ configOverrides: { dryRun: true } });
      await processTicket(TICKET, deps);
      expect(deps.planTicket).toHaveBeenCalledOnce();
    });

    it('GIVEN planning returns empty array WHEN processTicket called THEN returns failure', async () => {
      const deps = makeDeps({
        planTicket: vi.fn().mockResolvedValue([]),
      });
      const result = await processTicket(TICKET, deps);
      expect(result.success).toBe(false);
      expect(result.error).toContain('no workstreams');
    });
  });

  describe('AC: Creates subtasks for each workstream', () => {
    it('GIVEN 2 workstreams WHEN processTicket called THEN createSubtask called twice', async () => {
      const deps = makeDeps();
      await processTicket(TICKET, deps);
      expect(deps.provider.createSubtask).toHaveBeenCalledTimes(WORKSTREAMS.length);
    });

    it('GIVEN workstreams WHEN processTicket called THEN createSubtask receives parent ticketId', async () => {
      const deps = makeDeps();
      await processTicket(TICKET, deps);
      expect(deps.provider.createSubtask).toHaveBeenCalledWith(
        TICKET.id,
        expect.objectContaining({ title: expect.any(String) })
      );
    });

    it('GIVEN dryRun=true WHEN processTicket called THEN createSubtask is NOT called', async () => {
      const deps = makeDeps({ configOverrides: { dryRun: true } });
      await processTicket(TICKET, deps);
      expect(deps.provider.createSubtask).not.toHaveBeenCalled();
    });
  });

  describe('AC: Creates a git worktree', () => {
    it('GIVEN a ticket WHEN processTicket called THEN createWorktree is called', async () => {
      const deps = makeDeps();
      await processTicket(TICKET, deps);
      expect(deps.createWorktree).toHaveBeenCalledWith(
        TICKET.id,
        TICKET.title,
        expect.any(String)
      );
    });

    it('GIVEN dryRun=true WHEN processTicket called THEN createWorktree is NOT called', async () => {
      const deps = makeDeps({ configOverrides: { dryRun: true } });
      await processTicket(TICKET, deps);
      expect(deps.createWorktree).not.toHaveBeenCalled();
    });
  });

  describe('AC: Executes each workstream', () => {
    it('GIVEN 2 workstreams and dryRun=false WHEN processTicket called THEN executeWorkstream called twice', async () => {
      const deps = makeDeps();
      await processTicket(TICKET, deps);
      expect(deps.executeWorkstream).toHaveBeenCalledTimes(WORKSTREAMS.length);
    });

    it('GIVEN dryRun=true WHEN processTicket called THEN executeWorkstream is NOT called', async () => {
      const deps = makeDeps({ configOverrides: { dryRun: true } });
      await processTicket(TICKET, deps);
      expect(deps.executeWorkstream).not.toHaveBeenCalled();
    });
  });

  describe('AC: Failed workstream does not block other workstreams', () => {
    it('GIVEN first workstream fails WHEN processTicket called THEN second workstream still executes', async () => {
      const execWs = vi
        .fn()
        .mockResolvedValueOnce({
          workstream: 'Database schema',
          success: false,
          output: '',
          error: 'build failed',
          durationMs: 100,
        })
        .mockResolvedValueOnce({
          workstream: 'API endpoints',
          success: true,
          output: 'done',
          durationMs: 100,
        });

      const deps = makeDeps({ executeWorkstream: execWs });
      const result = await processTicket(TICKET, deps);

      expect(result.executed).toHaveLength(2);
      expect(result.executed[0].success).toBe(false);
      expect(result.executed[1].success).toBe(true);
    });
  });

  describe('AC: Creates PR after execution', () => {
    it('GIVEN successful execution WHEN processTicket called THEN createPR is called', async () => {
      const deps = makeDeps();
      await processTicket(TICKET, deps);
      expect(deps.createPR).toHaveBeenCalled();
    });

    it('GIVEN dryRun=true WHEN processTicket called THEN createPR is NOT called', async () => {
      const deps = makeDeps({ configOverrides: { dryRun: true } });
      await processTicket(TICKET, deps);
      expect(deps.createPR).not.toHaveBeenCalled();
    });

    it('GIVEN successful PR WHEN processTicket called THEN prUrl is in result', async () => {
      const deps = makeDeps();
      const result = await processTicket(TICKET, deps);
      expect(result.prUrl).toBe('https://github.com/owner/repo/pull/42');
    });
  });

  describe('AC: Links PR to ticket', () => {
    it('GIVEN PR created WHEN processTicket called THEN linkPR is called with prUrl', async () => {
      const deps = makeDeps();
      await processTicket(TICKET, deps);
      expect(deps.provider.linkPR).toHaveBeenCalledWith(
        TICKET.id,
        'https://github.com/owner/repo/pull/42'
      );
    });
  });

  describe('AC: Transitions ticket to In Review', () => {
    it('GIVEN PR created WHEN processTicket called THEN transitions ticket to in_review', async () => {
      const deps = makeDeps();
      await processTicket(TICKET, deps);
      expect(deps.provider.transitionStatus).toHaveBeenCalledWith(TICKET.id, 'in_review');
    });
  });

  describe('AC: Cleans up worktree', () => {
    it('GIVEN successful pipeline WHEN processTicket called THEN removeWorktree is called', async () => {
      const deps = makeDeps();
      await processTicket(TICKET, deps);
      expect(deps.removeWorktree).toHaveBeenCalledWith('/tmp/.mg-daemon/worktrees/PROJ-123');
    });

    it('GIVEN pipeline fails after worktree creation WHEN processTicket returns THEN worktree still removed', async () => {
      const execWs = vi.fn().mockResolvedValue({
        workstream: 'DB schema',
        success: false,
        output: '',
        error: 'crash',
        durationMs: 0,
      });
      const createPR = vi.fn().mockReturnValue({ success: false, error: 'PR creation failed' });
      const deps = makeDeps({ executeWorkstream: execWs, createPR });

      await processTicket(TICKET, deps);
      expect(deps.removeWorktree).toHaveBeenCalled();
    });
  });

  describe('AC: Tracker updates', () => {
    it('GIVEN a ticket WHEN processTicket called THEN markProcessing is called', async () => {
      const deps = makeDeps();
      await processTicket(TICKET, deps);
      expect(deps.tracker.markProcessing).toHaveBeenCalledWith(TICKET.id);
    });

    it('GIVEN successful pipeline WHEN processTicket called THEN markComplete is called with prUrl', async () => {
      const deps = makeDeps();
      await processTicket(TICKET, deps);
      expect(deps.tracker.markComplete).toHaveBeenCalledWith(
        TICKET.id,
        'https://github.com/owner/repo/pull/42'
      );
    });

    it('GIVEN planning fails WHEN processTicket called THEN markFailed is called', async () => {
      const deps = makeDeps({
        planTicket: vi.fn().mockRejectedValue(new Error('planning error')),
      });

      await processTicket(TICKET, deps);
      expect(deps.tracker.markFailed).toHaveBeenCalledWith(TICKET.id, expect.any(String));
    });
  });

  describe('AC: PipelineResult shape', () => {
    it('GIVEN successful pipeline WHEN processTicket resolves THEN result.success is true', async () => {
      const deps = makeDeps();
      const result = await processTicket(TICKET, deps);
      expect(result.success).toBe(true);
    });

    it('GIVEN dryRun=true WHEN processTicket resolves THEN result.success is true (plan produced)', async () => {
      const deps = makeDeps({ configOverrides: { dryRun: true } });
      const result = await processTicket(TICKET, deps);
      expect(result.success).toBe(true);
    });

    it('GIVEN dryRun=true WHEN processTicket resolves THEN result.executed is empty', async () => {
      const deps = makeDeps({ configOverrides: { dryRun: true } });
      const result = await processTicket(TICKET, deps);
      expect(result.executed).toHaveLength(0);
    });

    it('GIVEN planning throws WHEN processTicket resolves THEN result.success is false', async () => {
      const deps = makeDeps({
        planTicket: vi.fn().mockRejectedValue(new Error('boom')),
      });
      const result = await processTicket(TICKET, deps);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('GIVEN any pipeline WHEN processTicket resolves THEN result.ticketId matches ticket', async () => {
      const deps = makeDeps();
      const result = await processTicket(TICKET, deps);
      expect(result.ticketId).toBe('PROJ-123');
    });

    it('GIVEN successful pipeline WHEN processTicket resolves THEN result.planned contains workstreams', async () => {
      const deps = makeDeps();
      const result = await processTicket(TICKET, deps);
      expect(result.planned).toHaveLength(WORKSTREAMS.length);
    });
  });
});

// ---------------------------------------------------------------------------
// runPollCycle() tests
// ---------------------------------------------------------------------------

describe('runPollCycle() (WS-DAEMON-11)', () => {
  describe('AC: Polls for tickets', () => {
    it('GIVEN a provider WHEN runPollCycle called THEN provider.poll is called', async () => {
      const deps = makeDeps();
      await runPollCycle(deps);
      expect(deps.provider.poll).toHaveBeenCalled();
    });

    it('GIVEN no tickets returned WHEN runPollCycle called THEN returns empty array', async () => {
      const deps = makeDeps({
        providerOverrides: { poll: vi.fn().mockResolvedValue([]) },
      });
      const results = await runPollCycle(deps);
      expect(results).toHaveLength(0);
    });
  });

  describe('AC: Processes each ticket', () => {
    it('GIVEN one ticket returned WHEN runPollCycle called THEN processes it and returns one result', async () => {
      const deps = makeDeps();
      const results = await runPollCycle(deps);
      expect(results).toHaveLength(1);
    });

    it('GIVEN two tickets returned WHEN runPollCycle called THEN returns two results', async () => {
      const ticket2: NormalizedTicket = { ...TICKET, id: 'PROJ-124' };
      const deps = makeDeps({
        providerOverrides: {
          poll: vi.fn().mockResolvedValue([TICKET, ticket2]),
        },
      });
      const results = await runPollCycle(deps);
      expect(results).toHaveLength(2);
    });
  });

  describe('AC: Skips already-processed tickets', () => {
    it('GIVEN ticket already in tracker WHEN runPollCycle called THEN skips it', async () => {
      const deps = makeDeps({
        tracker: {
          markProcessing: vi.fn(),
          markComplete: vi.fn(),
          markFailed: vi.fn(),
          getProcessedTickets: vi.fn().mockReturnValue(['PROJ-123']),
        },
      });
      const results = await runPollCycle(deps);
      expect(results).toHaveLength(0);
    });
  });

  describe('AC: dryRun mode', () => {
    it('GIVEN dryRun=true WHEN runPollCycle called THEN executeWorkstream not called', async () => {
      const deps = makeDeps({ configOverrides: { dryRun: true } });
      await runPollCycle(deps);
      expect(deps.executeWorkstream).not.toHaveBeenCalled();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock child_process.spawnSync for git operations in the orchestrator
vi.mock('child_process', () => ({
  spawnSync: vi.fn((cmd: string, args: string[]) => {
    // git diff --cached --quiet should return 1 (changes exist)
    if (cmd === 'git' && args?.includes('--cached') && args?.includes('--quiet')) {
      return { status: 1, stdout: '', stderr: '' };
    }
    return { status: 0, stdout: '', stderr: '' };
  }),
  spawn: vi.fn(),
  execSync: vi.fn(),
}));

import { processTicket, runPollCycle, shouldStop, hasSufficientDiskSpace } from '../../src/orchestrator';
import type { OrchestratorConfig } from '../../src/orchestrator';

// Mock triage-log module
vi.mock('../../src/triage-log', () => ({
  appendTriageLog: vi.fn(),
}));
import { appendTriageLog } from '../../src/triage-log';
import type { NormalizedTicket, TicketProvider } from '../../src/providers/types';
import type { DaemonConfig } from '../../src/types';
import type { WorkstreamPlan } from '../../src/planner';
import type { ExecutionResult } from '../../src/executor';
import type { TriageResult } from '../../src/triage';

// Mock child_process.spawnSync for git operations in processTicket
import { spawnSync } from 'child_process';
vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return { ...actual, spawnSync: vi.fn() };
});

// Mock fs for shouldStop and hasSufficientDiskSpace
import { existsSync, statfsSync } from 'fs';
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return { ...actual, existsSync: vi.fn().mockReturnValue(false), statfsSync: vi.fn().mockReturnValue({ bfree: 100_000_000, bsize: 4096 }) };
});

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
    addLabel: vi.fn().mockResolvedValue(undefined),
    linkPR: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeDeps(overrides?: {
  providerOverrides?: Partial<TicketProvider>;
  configOverrides?: Partial<DaemonConfig['orchestration']>;
  triageConfigOverrides?: Partial<DaemonConfig['triage']>;
  planTicket?: ReturnType<typeof vi.fn>;
  executeWorkstream?: ReturnType<typeof vi.fn>;
  createWorktree?: ReturnType<typeof vi.fn>;
  removeWorktree?: ReturnType<typeof vi.fn>;
  createPR?: ReturnType<typeof vi.fn>;
  triageTicket?: ReturnType<typeof vi.fn>;
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

  const config = makeConfig(overrides?.configOverrides);
  if (overrides?.triageConfigOverrides) {
    config.triage = { enabled: true, autoReject: false, maxTicketSizeChars: 10000, ...overrides.triageConfigOverrides };
  }

  return {
    provider: makeProvider(overrides?.providerOverrides),
    config,
    tracker,
    triageTicket: overrides?.triageTicket ?? vi.fn().mockResolvedValue({ outcome: 'GO', reason: 'All checks pass' } as TriageResult),
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
  beforeEach(() => {
    // Re-apply spawnSync mock implementation (mockReset clears it between tests)
    vi.mocked(spawnSync).mockImplementation((_cmd: unknown, args: unknown) => {
      const argsList = args as string[] | undefined;
      // git diff --cached --quiet returns 1 when there ARE changes
      if (argsList?.includes('--cached') && argsList?.includes('--quiet')) {
        return { status: 1, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
      }
      return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
    });
  });

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

    it('GIVEN ticket with labels WHEN processTicket called THEN createSubtask passes labels from parent ticket (GH-102)', async () => {
      const deps = makeDeps();
      await processTicket(TICKET, deps);
      expect(deps.provider.createSubtask).toHaveBeenCalledWith(
        TICKET.id,
        expect.objectContaining({ labels: TICKET.labels })
      );
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

  describe('AC: Transitions ticket to In Review (failure path)', () => {
    it('GIVEN transitionStatus to in_review throws WHEN processTicket called THEN pipeline still succeeds', async () => {
      const deps = makeDeps({
        providerOverrides: {
          transitionStatus: vi.fn().mockImplementation(async (_id: string, status: string) => {
            if (status === 'in_review') throw new Error('workflow rule rejected');
          }),
        },
      });
      const result = await processTicket(TICKET, deps);
      expect(result.success).toBe(true);
      expect(result.prUrl).toBeDefined();
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
// processTicket() triageResult passthrough tests (GH-81 refactor)
// Triage now runs in runPollCycle; processTicket receives triageResult as param.
// ---------------------------------------------------------------------------

describe('processTicket() triageResult passthrough (GH-81)', () => {
  beforeEach(() => {
    vi.mocked(spawnSync).mockImplementation((_cmd: unknown, args: unknown) => {
      const argsList = args as string[] | undefined;
      if (argsList?.includes('--cached') && argsList?.includes('--quiet')) {
        return { status: 1, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
      }
      return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
    });
  });

  describe('AC: processTicket no longer calls triageTicket', () => {
    it('GIVEN processTicket called directly WHEN triageTicket is injected THEN triageTicket is NOT called', async () => {
      const deps = makeDeps();
      await processTicket(TICKET, deps);
      expect(deps.triageTicket).not.toHaveBeenCalled();
    });
  });

  describe('AC: triageResult passed through to PipelineResult', () => {
    it('GIVEN triageResult with GO WHEN processTicket called THEN result includes triageResult', async () => {
      const deps = makeDeps();
      const triageResult: TriageResult = { outcome: 'GO', reason: 'All checks pass' };
      const result = await processTicket(TICKET, deps, triageResult);
      expect(result.triageResult).toBeDefined();
      expect(result.triageResult?.outcome).toBe('GO');
    });

    it('GIVEN no triageResult WHEN processTicket called THEN result.triageResult is undefined', async () => {
      const deps = makeDeps();
      const result = await processTicket(TICKET, deps);
      expect(result.triageResult).toBeUndefined();
    });

    it('GIVEN triageResult WHEN planning fails THEN triageResult still in error result', async () => {
      const deps = makeDeps({
        planTicket: vi.fn().mockRejectedValue(new Error('planning error')),
      });
      const triageResult: TriageResult = { outcome: 'GO', reason: 'All checks pass' };
      const result = await processTicket(TICKET, deps, triageResult);
      expect(result.triageResult?.outcome).toBe('GO');
      expect(result.success).toBe(false);
    });

    it('GIVEN triageResult WHEN dryRun=true THEN triageResult in dry-run result', async () => {
      const deps = makeDeps({ configOverrides: { dryRun: true } });
      const triageResult: TriageResult = { outcome: 'GO', reason: 'All checks pass' };
      const result = await processTicket(TICKET, deps, triageResult);
      expect(result.triageResult?.outcome).toBe('GO');
      expect(result.success).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// runPollCycle() tests
// ---------------------------------------------------------------------------

describe('runPollCycle() (WS-DAEMON-11)', () => {
  beforeEach(() => {
    vi.mocked(spawnSync).mockImplementation((_cmd: unknown, args: unknown) => {
      const argsList = args as string[] | undefined;
      if (argsList?.includes('--cached') && argsList?.includes('--quiet')) {
        return { status: 1, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
      }
      return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
    });
  });

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

// ---------------------------------------------------------------------------
// runPollCycle() triage integration tests (GH-81)
// ---------------------------------------------------------------------------

describe('runPollCycle() triage integration (GH-81)', () => {
  beforeEach(() => {
    vi.mocked(spawnSync).mockImplementation((_cmd: unknown, args: unknown) => {
      const argsList = args as string[] | undefined;
      if (argsList?.includes('--cached') && argsList?.includes('--quiet')) {
        return { status: 1, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
      }
      return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
    });
  });

  describe('AC: runPollCycle calls triageTicket after poll filtering and before processTicket', () => {
    it('GIVEN a pending ticket WHEN runPollCycle called THEN triageTicket is called', async () => {
      const deps = makeDeps();
      await runPollCycle(deps);
      expect(deps.triageTicket).toHaveBeenCalledWith(
        TICKET,
        expect.objectContaining({ enabled: expect.any(Boolean) }),
        expect.any(Function)
      );
    });

    it('GIVEN triage returns GO WHEN runPollCycle called THEN planTicket is called (processTicket proceeds)', async () => {
      const deps = makeDeps();
      await runPollCycle(deps);
      expect(deps.triageTicket).toHaveBeenCalledOnce();
      expect(deps.planTicket).toHaveBeenCalledOnce();
    });

    it('GIVEN triage returns NEEDS_CLARIFICATION WHEN runPollCycle called THEN planTicket is NOT called', async () => {
      const deps = makeDeps({
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'NEEDS_CLARIFICATION',
          reason: 'Missing acceptance criteria',
          questions: ['What should the behavior be?'],
        } as TriageResult),
      });
      const results = await runPollCycle(deps);
      expect(deps.planTicket).not.toHaveBeenCalled();
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
    });

    it('GIVEN triage returns REJECT WHEN runPollCycle called THEN planTicket is NOT called', async () => {
      const deps = makeDeps({
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'REJECT',
          reason: 'Out of scope',
        } as TriageResult),
      });
      const results = await runPollCycle(deps);
      expect(deps.planTicket).not.toHaveBeenCalled();
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
    });
  });

  describe('AC: NEEDS_CLARIFICATION posts comment with questions and adds label', () => {
    it('GIVEN triage returns NEEDS_CLARIFICATION with questions WHEN runPollCycle called THEN addComment includes questions', async () => {
      const deps = makeDeps({
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'NEEDS_CLARIFICATION',
          reason: 'Unclear requirements',
          questions: ['What endpoint format?', 'Which auth method?'],
        } as TriageResult),
      });
      await runPollCycle(deps);
      expect(deps.provider.addComment).toHaveBeenCalledWith(
        TICKET.id,
        expect.stringContaining('What endpoint format?')
      );
      expect(deps.provider.addComment).toHaveBeenCalledWith(
        TICKET.id,
        expect.stringContaining('Which auth method?')
      );
    });

    it('GIVEN triage returns NEEDS_CLARIFICATION with no questions WHEN runPollCycle called THEN addComment includes reason only', async () => {
      const deps = makeDeps({
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'NEEDS_CLARIFICATION',
          reason: 'Unclear requirements',
        } as TriageResult),
      });
      await runPollCycle(deps);
      expect(deps.provider.addComment).toHaveBeenCalledWith(
        TICKET.id,
        expect.stringContaining('Unclear requirements')
      );
      // No Questions section since there are no questions
      const call = vi.mocked(deps.provider.addComment).mock.calls[0];
      expect(call[1]).not.toContain('**Questions:**');
    });

    it('GIVEN triage returns NEEDS_CLARIFICATION with empty questions array WHEN runPollCycle called THEN addComment has no questions section', async () => {
      const deps = makeDeps({
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'NEEDS_CLARIFICATION',
          reason: 'Unclear requirements',
          questions: [],
        } as TriageResult),
      });
      await runPollCycle(deps);
      const call = vi.mocked(deps.provider.addComment).mock.calls[0];
      expect(call[1]).not.toContain('**Questions:**');
    });

    it('GIVEN triage returns NEEDS_CLARIFICATION WHEN runPollCycle called THEN adds mg-daemon:needs-info label', async () => {
      const deps = makeDeps({
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'NEEDS_CLARIFICATION',
          reason: 'Vague',
        } as TriageResult),
      });
      await runPollCycle(deps);
      expect(deps.provider.addLabel).toHaveBeenCalledWith(TICKET.id, 'mg-daemon:needs-info');
    });
  });

  describe('AC: REJECT posts comment with rejection reason and adds label', () => {
    it('GIVEN triage returns REJECT WHEN runPollCycle called THEN addComment includes rejection reason', async () => {
      const deps = makeDeps({
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'REJECT',
          reason: 'This ticket is out of scope for this repository',
        } as TriageResult),
      });
      await runPollCycle(deps);
      expect(deps.provider.addComment).toHaveBeenCalledWith(
        TICKET.id,
        expect.stringContaining('out of scope')
      );
    });

    it('GIVEN triage returns REJECT WHEN runPollCycle called THEN adds mg-daemon:rejected label', async () => {
      const deps = makeDeps({
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'REJECT',
          reason: 'Out of scope',
        } as TriageResult),
      });
      await runPollCycle(deps);
      expect(deps.provider.addLabel).toHaveBeenCalledWith(TICKET.id, 'mg-daemon:rejected');
    });
  });

  describe('AC: triageResult present in PipelineResult for all outcomes', () => {
    it('GIVEN triage returns GO WHEN runPollCycle resolves THEN triageResult is in PipelineResult', async () => {
      const deps = makeDeps();
      const results = await runPollCycle(deps);
      expect(results[0].triageResult).toBeDefined();
      expect(results[0].triageResult?.outcome).toBe('GO');
    });

    it('GIVEN triage returns NEEDS_CLARIFICATION WHEN runPollCycle resolves THEN triageResult is in PipelineResult', async () => {
      const deps = makeDeps({
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'NEEDS_CLARIFICATION',
          reason: 'Missing details',
          questions: ['What?'],
        } as TriageResult),
      });
      const results = await runPollCycle(deps);
      expect(results[0].triageResult).toBeDefined();
      expect(results[0].triageResult?.outcome).toBe('NEEDS_CLARIFICATION');
    });

    it('GIVEN triage returns REJECT WHEN runPollCycle resolves THEN triageResult is in PipelineResult', async () => {
      const deps = makeDeps({
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'REJECT',
          reason: 'Out of scope',
        } as TriageResult),
      });
      const results = await runPollCycle(deps);
      expect(results[0].triageResult).toBeDefined();
      expect(results[0].triageResult?.outcome).toBe('REJECT');
    });
  });

  describe('AC: Triaged tickets tracked in processed.json with triage outcome', () => {
    it('GIVEN triage returns NEEDS_CLARIFICATION WHEN runPollCycle called THEN markFailed records triage outcome', async () => {
      const deps = makeDeps({
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'NEEDS_CLARIFICATION',
          reason: 'Vague ticket',
        } as TriageResult),
      });
      await runPollCycle(deps);
      expect(deps.tracker.markFailed).toHaveBeenCalledWith(
        TICKET.id,
        expect.stringContaining('NEEDS_CLARIFICATION')
      );
    });

    it('GIVEN triage returns REJECT WHEN runPollCycle called THEN markFailed records triage outcome', async () => {
      const deps = makeDeps({
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'REJECT',
          reason: 'Out of scope',
        } as TriageResult),
      });
      await runPollCycle(deps);
      expect(deps.tracker.markFailed).toHaveBeenCalledWith(
        TICKET.id,
        expect.stringContaining('REJECT')
      );
    });
  });

  describe('AC: Dry-run mode runs triage but skips comment/label writes', () => {
    it('GIVEN dryRun=true WHEN runPollCycle called THEN triageTicket is still called', async () => {
      const deps = makeDeps({ configOverrides: { dryRun: true } });
      await runPollCycle(deps);
      expect(deps.triageTicket).toHaveBeenCalledOnce();
    });

    it('GIVEN dryRun=true and triage returns NEEDS_CLARIFICATION WHEN runPollCycle called THEN addComment is NOT called', async () => {
      const deps = makeDeps({
        configOverrides: { dryRun: true },
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'NEEDS_CLARIFICATION',
          reason: 'Vague',
        } as TriageResult),
      });
      await runPollCycle(deps);
      expect(deps.provider.addComment).not.toHaveBeenCalled();
      expect(deps.provider.addLabel).not.toHaveBeenCalled();
    });

    it('GIVEN dryRun=true and triage returns REJECT WHEN runPollCycle called THEN addComment is NOT called', async () => {
      const deps = makeDeps({
        configOverrides: { dryRun: true },
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'REJECT',
          reason: 'Out of scope',
        } as TriageResult),
      });
      await runPollCycle(deps);
      expect(deps.provider.addComment).not.toHaveBeenCalled();
      expect(deps.provider.addLabel).not.toHaveBeenCalled();
    });

    it('GIVEN dryRun=true and triage returns NEEDS_CLARIFICATION WHEN runPollCycle resolves THEN triageResult still in result', async () => {
      const deps = makeDeps({
        configOverrides: { dryRun: true },
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'NEEDS_CLARIFICATION',
          reason: 'Vague',
        } as TriageResult),
      });
      const results = await runPollCycle(deps);
      expect(results[0].triageResult?.outcome).toBe('NEEDS_CLARIFICATION');
    });
  });

  describe('AC: Comment/label errors are best-effort (non-blocking)', () => {
    it('GIVEN addComment throws WHEN handling NEEDS_CLARIFICATION THEN pipeline still returns result', async () => {
      const deps = makeDeps({
        providerOverrides: {
          addComment: vi.fn().mockRejectedValue(new Error('API error')),
          addLabel: vi.fn().mockRejectedValue(new Error('API error')),
        },
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'NEEDS_CLARIFICATION',
          reason: 'Unclear',
        } as TriageResult),
      });
      const results = await runPollCycle(deps);
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].triageResult?.outcome).toBe('NEEDS_CLARIFICATION');
    });

    it('GIVEN addLabel throws WHEN handling REJECT THEN pipeline still returns result', async () => {
      const deps = makeDeps({
        providerOverrides: {
          addComment: vi.fn().mockResolvedValue(undefined),
          addLabel: vi.fn().mockRejectedValue(new Error('label API error')),
        },
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'REJECT',
          reason: 'Out of scope',
        } as TriageResult),
      });
      const results = await runPollCycle(deps);
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].triageResult?.outcome).toBe('REJECT');
    });
  });

  describe('AC: Multiple tickets with mixed triage outcomes', () => {
    it('GIVEN two tickets, one GO one REJECT WHEN runPollCycle called THEN only GO ticket is processed', async () => {
      const ticket2: NormalizedTicket = { ...TICKET, id: 'PROJ-124' };
      const triageFn = vi.fn()
        .mockResolvedValueOnce({ outcome: 'REJECT', reason: 'Out of scope' } as TriageResult)
        .mockResolvedValueOnce({ outcome: 'GO', reason: 'All checks pass' } as TriageResult);

      const deps = makeDeps({
        providerOverrides: {
          poll: vi.fn().mockResolvedValue([TICKET, ticket2]),
        },
        triageTicket: triageFn,
      });
      const results = await runPollCycle(deps);
      expect(results).toHaveLength(2);
      // First ticket rejected — no planning
      expect(results[0].success).toBe(false);
      expect(results[0].triageResult?.outcome).toBe('REJECT');
      // Second ticket passed triage — planning happened
      expect(results[1].success).toBe(true);
      expect(results[1].triageResult?.outcome).toBe('GO');
    });
  });
});

// ---------------------------------------------------------------------------
// Edge case coverage tests (shouldStop, hasSufficientDiskSpace, git paths)
// ---------------------------------------------------------------------------

describe('shouldStop() and hasSufficientDiskSpace()', () => {
  it('GIVEN STOP sentinel exists WHEN shouldStop called THEN returns true', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    expect(shouldStop()).toBe(true);
    vi.mocked(existsSync).mockReturnValue(false);
  });

  it('GIVEN STOP sentinel does not exist WHEN shouldStop called THEN returns false', () => {
    vi.mocked(existsSync).mockReturnValue(false);
    expect(shouldStop()).toBe(false);
  });

  it('GIVEN statfsSync throws WHEN hasSufficientDiskSpace called THEN returns true (safe default)', () => {
    vi.mocked(statfsSync).mockImplementation(() => { throw new Error('ENOENT'); });
    expect(hasSufficientDiskSpace()).toBe(true);
    vi.mocked(statfsSync).mockReturnValue({ bfree: 100_000_000, bsize: 4096 } as ReturnType<typeof statfsSync>);
  });

  it('GIVEN disk space below threshold WHEN hasSufficientDiskSpace called THEN returns false', () => {
    vi.mocked(statfsSync).mockReturnValue({ bfree: 1, bsize: 1 } as ReturnType<typeof statfsSync>);
    expect(hasSufficientDiskSpace()).toBe(false);
    vi.mocked(statfsSync).mockReturnValue({ bfree: 100_000_000, bsize: 4096 } as ReturnType<typeof statfsSync>);
  });
});

describe('runPollCycle() guards', () => {
  it('GIVEN shouldStop=true WHEN runPollCycle called THEN returns empty immediately', async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    const deps = makeDeps();
    const results = await runPollCycle(deps);
    expect(results).toHaveLength(0);
    expect(deps.provider.poll).not.toHaveBeenCalled();
    vi.mocked(existsSync).mockReturnValue(false);
  });

  it('GIVEN insufficient disk space WHEN runPollCycle called THEN returns empty immediately', async () => {
    vi.mocked(statfsSync).mockReturnValue({ bfree: 1, bsize: 1 } as ReturnType<typeof statfsSync>);
    const deps = makeDeps();
    const results = await runPollCycle(deps);
    expect(results).toHaveLength(0);
    expect(deps.provider.poll).not.toHaveBeenCalled();
    vi.mocked(statfsSync).mockReturnValue({ bfree: 100_000_000, bsize: 4096 } as ReturnType<typeof statfsSync>);
  });
});

describe('processTicket() without orchestration config (default fallback)', () => {
  beforeEach(() => {
    vi.mocked(spawnSync).mockImplementation((_cmd: unknown, args: unknown) => {
      const argsList = args as string[] | undefined;
      if (argsList?.includes('--cached') && argsList?.includes('--quiet')) {
        return { status: 1, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
      }
      return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
    });
  });

  it('GIVEN no orchestration config WHEN processTicket called THEN uses default values', async () => {
    const config: DaemonConfig = {
      provider: 'jira',
      github: { repo: 'owner/repo', baseBranch: 'main' },
      polling: { intervalSeconds: 300, batchSize: 5 },
      // no orchestration key
    };
    const deps: OrchestratorConfig = {
      provider: makeProvider(),
      config,
      tracker: {
        markProcessing: vi.fn(),
        markComplete: vi.fn(),
        markFailed: vi.fn(),
        getProcessedTickets: vi.fn().mockReturnValue([]),
      },
      planTicket: vi.fn().mockResolvedValue(WORKSTREAMS),
      executeWorkstream: vi.fn().mockResolvedValue({ workstream: 'ws', success: true, output: '', durationMs: 0 }),
      createWorktree: vi.fn().mockReturnValue({ worktreePath: '/tmp/wt', branchName: 'feature/test' }),
      removeWorktree: vi.fn(),
      createPR: vi.fn().mockReturnValue({ success: true, prUrl: 'https://github.com/pull/1' }),
    };
    const result = await processTicket(TICKET, deps);
    expect(result.ticketId).toBe(TICKET.id);
    expect(result.success).toBe(true);
  });
});

describe('processTicket() git edge cases', () => {
  it('GIVEN git merge conflict WHEN processTicket runs THEN returns failure', async () => {
    vi.mocked(spawnSync).mockImplementation((_cmd: unknown, args: unknown) => {
      const argsList = args as string[] | undefined;
      if (argsList?.includes('--cached') && argsList?.includes('--quiet')) {
        return { status: 1, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
      }
      // Merge fails
      if (argsList?.includes('merge')) {
        return { status: 1, stdout: '', stderr: 'conflict', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
      }
      return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
    });

    const deps = makeDeps();
    const result = await processTicket(TICKET, deps);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Merge conflict');
  });

  it('GIVEN no code changes produced WHEN processTicket runs THEN returns failure', async () => {
    vi.mocked(spawnSync).mockImplementation((_cmd: unknown, args: unknown) => {
      const argsList = args as string[] | undefined;
      // git diff --cached --quiet returns 0 = no changes
      if (argsList?.includes('--cached') && argsList?.includes('--quiet')) {
        return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
      }
      return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
    });

    const deps = makeDeps();
    const result = await processTicket(TICKET, deps);
    expect(result.success).toBe(false);
    expect(result.error).toContain('No code changes');
  });

  it('GIVEN tests fail WHEN processTicket runs THEN quality-gate failure is recorded in executed', async () => {
    vi.mocked(spawnSync).mockImplementation((_cmd: unknown, args: unknown) => {
      const argsList = args as string[] | undefined;
      const cmd = _cmd as string;
      if (argsList?.includes('--cached') && argsList?.includes('--quiet')) {
        return { status: 1, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
      }
      // vitest fails
      if (cmd === 'npx' && argsList?.includes('vitest')) {
        return { status: 1, stdout: 'test failure output', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
      }
      return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
    });

    const deps = makeDeps();
    const result = await processTicket(TICKET, deps);
    const qualityGate = result.executed.find(e => e.workstream === 'quality-gate');
    expect(qualityGate).toBeDefined();
    expect(qualityGate?.error).toContain('Tests failed');
  });

  it('GIVEN build fails WHEN processTicket runs THEN quality-gate build failure is recorded', async () => {
    vi.mocked(spawnSync).mockImplementation((_cmd: unknown, args: unknown) => {
      const argsList = args as string[] | undefined;
      const cmd = _cmd as string;
      if (argsList?.includes('--cached') && argsList?.includes('--quiet')) {
        return { status: 1, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
      }
      // tsc fails
      if (cmd === 'npx' && argsList?.includes('tsc')) {
        return { status: 1, stdout: '', stderr: 'type error', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
      }
      return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
    });

    const deps = makeDeps();
    const result = await processTicket(TICKET, deps);
    const buildGate = result.executed.find(e => e.workstream === 'quality-gate' && e.error === 'Build failed');
    expect(buildGate).toBeDefined();
  });

  it('GIVEN build fails with undefined stderr WHEN processTicket runs THEN quality-gate uses empty string', async () => {
    vi.mocked(spawnSync).mockImplementation((_cmd: unknown, args: unknown) => {
      const argsList = args as string[] | undefined;
      const cmd = _cmd as string;
      if (argsList?.includes('--cached') && argsList?.includes('--quiet')) {
        return { status: 1, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
      }
      if (cmd === 'npx' && argsList?.includes('tsc')) {
        return { status: 1, stdout: '', stderr: undefined, pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
      }
      return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
    });

    const deps = makeDeps();
    const result = await processTicket(TICKET, deps);
    const buildGate = result.executed.find(e => e.workstream === 'quality-gate' && e.error === 'Build failed');
    expect(buildGate).toBeDefined();
    expect(buildGate?.output).toBe('');
  });

  it('GIVEN planning throws a non-Error value WHEN processTicket runs THEN error is stringified', async () => {
    vi.mocked(spawnSync).mockImplementation((_cmd: unknown, args: unknown) => {
      const argsList = args as string[] | undefined;
      if (argsList?.includes('--cached') && argsList?.includes('--quiet')) {
        return { status: 1, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
      }
      return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
    });

    const deps = makeDeps({
      planTicket: vi.fn().mockRejectedValue('string error'),
    });
    const result = await processTicket(TICKET, deps);
    expect(result.success).toBe(false);
    expect(result.error).toBe('string error');
  });

  it('GIVEN test failure with undefined stdout WHEN processTicket runs THEN quality-gate recorded', async () => {
    vi.mocked(spawnSync).mockImplementation((_cmd: unknown, args: unknown) => {
      const argsList = args as string[] | undefined;
      const cmd = _cmd as string;
      if (argsList?.includes('--cached') && argsList?.includes('--quiet')) {
        return { status: 1, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
      }
      if (cmd === 'npx' && argsList?.includes('vitest')) {
        return { status: 1, stdout: undefined, stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
      }
      return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
    });

    const deps = makeDeps();
    const result = await processTicket(TICKET, deps);
    const qualityGate = result.executed.find(e => e.workstream === 'quality-gate' && e.error === 'Tests failed');
    expect(qualityGate).toBeDefined();
    expect(qualityGate?.output).toBe('');
  });

  it('GIVEN PR creation fails with no error message WHEN processTicket runs THEN markFailed with default message', async () => {
    vi.mocked(spawnSync).mockImplementation((_cmd: unknown, args: unknown) => {
      const argsList = args as string[] | undefined;
      if (argsList?.includes('--cached') && argsList?.includes('--quiet')) {
        return { status: 1, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
      }
      return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
    });

    const deps = makeDeps({
      createPR: vi.fn().mockReturnValue({ success: false }),
    });
    const result = await processTicket(TICKET, deps);
    expect(result.success).toBe(false);
    expect(deps.tracker.markFailed).toHaveBeenCalledWith(TICKET.id, 'PR creation failed');
  });

  it('GIVEN removeWorktree throws WHEN processTicket runs THEN pipeline still returns result', async () => {
    vi.mocked(spawnSync).mockImplementation((_cmd: unknown, args: unknown) => {
      const argsList = args as string[] | undefined;
      if (argsList?.includes('--cached') && argsList?.includes('--quiet')) {
        return { status: 1, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
      }
      return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
    });

    const deps = makeDeps({
      removeWorktree: vi.fn().mockImplementation(() => { throw new Error('cleanup failed'); }),
    });
    const result = await processTicket(TICKET, deps);
    expect(result.ticketId).toBe(TICKET.id);
    // Should still succeed since PR was created
    expect(result.success).toBe(true);
  });
});

describe('runPollCycle() without orchestration config (default fallback)', () => {
  beforeEach(() => {
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(statfsSync).mockReturnValue({ bfree: 100_000_000, bsize: 4096 } as ReturnType<typeof statfsSync>);
    vi.mocked(spawnSync).mockImplementation((_cmd: unknown, args: unknown) => {
      const argsList = args as string[] | undefined;
      if (argsList?.includes('--cached') && argsList?.includes('--quiet')) {
        return { status: 1, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
      }
      return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
    });
  });

  it('GIVEN no orchestration config WHEN runPollCycle called THEN uses default values and processes ticket', async () => {
    const config: DaemonConfig = {
      provider: 'jira',
      github: { repo: 'owner/repo', baseBranch: 'main' },
      polling: { intervalSeconds: 300, batchSize: 5 },
      // no orchestration key — triggers default fallback on lines 348-354
    };
    const deps: OrchestratorConfig = {
      provider: makeProvider(),
      config,
      tracker: {
        markProcessing: vi.fn(),
        markComplete: vi.fn(),
        markFailed: vi.fn(),
        getProcessedTickets: vi.fn().mockReturnValue([]),
      },
      triageTicket: vi.fn().mockResolvedValue({ outcome: 'GO', reason: 'All checks pass' } as TriageResult),
      planTicket: vi.fn().mockResolvedValue(WORKSTREAMS),
      executeWorkstream: vi.fn().mockResolvedValue({ workstream: 'ws', success: true, output: '', durationMs: 0 }),
      createWorktree: vi.fn().mockReturnValue({ worktreePath: '/tmp/wt', branchName: 'feature/test' }),
      removeWorktree: vi.fn(),
      createPR: vi.fn().mockReturnValue({ success: true, prUrl: 'https://github.com/pull/1' }),
    };
    const results = await runPollCycle(deps);
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// runPollCycle() triage-log persistence tests (GH-81)
// ---------------------------------------------------------------------------

describe('processTicket() with default DI fallbacks (branch coverage)', () => {
  beforeEach(() => {
    vi.mocked(spawnSync).mockImplementation((_cmd: unknown, args: unknown) => {
      const argsList = args as string[] | undefined;
      if (argsList?.includes('--cached') && argsList?.includes('--quiet')) {
        return { status: 1, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
      }
      return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
    });
  });

  it('GIVEN createWorktree not provided WHEN processTicket called THEN uses defaultCreateWorktree', async () => {
    const deps: OrchestratorConfig = {
      provider: makeProvider(),
      config: makeConfig(),
      tracker: {
        markProcessing: vi.fn(),
        markComplete: vi.fn(),
        markFailed: vi.fn(),
        getProcessedTickets: vi.fn().mockReturnValue([]),
      },
      planTicket: vi.fn().mockResolvedValue(WORKSTREAMS),
      executeWorkstream: vi.fn().mockResolvedValue({ workstream: 'ws', success: true, output: '', durationMs: 0 }),
      // createWorktree omitted — exercises ?? defaultCreateWorktree branch
      removeWorktree: vi.fn(),
      createPR: vi.fn().mockReturnValue({ success: true, prUrl: 'https://github.com/pull/1' }),
    };
    const result = await processTicket(TICKET, deps);
    expect(result.ticketId).toBe(TICKET.id);
    // Pipeline should complete (default createWorktree uses mocked spawnSync)
    expect(result.success).toBe(true);
  });

  it('GIVEN removeWorktree not provided WHEN processTicket called THEN uses defaultRemoveWorktree', async () => {
    const deps: OrchestratorConfig = {
      provider: makeProvider(),
      config: makeConfig(),
      tracker: {
        markProcessing: vi.fn(),
        markComplete: vi.fn(),
        markFailed: vi.fn(),
        getProcessedTickets: vi.fn().mockReturnValue([]),
      },
      planTicket: vi.fn().mockResolvedValue(WORKSTREAMS),
      executeWorkstream: vi.fn().mockResolvedValue({ workstream: 'ws', success: true, output: '', durationMs: 0 }),
      createWorktree: vi.fn().mockReturnValue({ worktreePath: '/tmp/wt', branchName: 'feature/test' }),
      // removeWorktree omitted — exercises ?? defaultRemoveWorktree branch
      createPR: vi.fn().mockReturnValue({ success: true, prUrl: 'https://github.com/pull/1' }),
    };
    const result = await processTicket(TICKET, deps);
    expect(result.ticketId).toBe(TICKET.id);
    expect(result.success).toBe(true);
  });

  it('GIVEN createPR not provided WHEN processTicket called THEN uses defaultCreatePR', async () => {
    const deps: OrchestratorConfig = {
      provider: makeProvider(),
      config: makeConfig(),
      tracker: {
        markProcessing: vi.fn(),
        markComplete: vi.fn(),
        markFailed: vi.fn(),
        getProcessedTickets: vi.fn().mockReturnValue([]),
      },
      planTicket: vi.fn().mockResolvedValue(WORKSTREAMS),
      executeWorkstream: vi.fn().mockResolvedValue({ workstream: 'ws', success: true, output: '', durationMs: 0 }),
      createWorktree: vi.fn().mockReturnValue({ worktreePath: '/tmp/wt', branchName: 'feature/test' }),
      removeWorktree: vi.fn(),
      // createPR omitted — exercises ?? defaultCreatePR branch
    };
    const result = await processTicket(TICKET, deps);
    expect(result.ticketId).toBe(TICKET.id);
    // defaultCreatePR returns empty prUrl from mocked spawnSync, so success depends on that
  });
});

describe('runPollCycle() triage-log persistence (GH-81)', () => {
  beforeEach(() => {
    vi.mocked(appendTriageLog).mockReset();
    vi.mocked(spawnSync).mockImplementation((_cmd: unknown, args: unknown) => {
      const argsList = args as string[] | undefined;
      if (argsList?.includes('--cached') && argsList?.includes('--quiet')) {
        return { status: 1, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
      }
      return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
    });
  });

  describe('AC: All triage outcomes are appended to triage-log.json via appendTriageLog', () => {
    it('GIVEN triage returns GO WHEN runPollCycle called THEN appendTriageLog called with GO entry', async () => {
      const deps = makeDeps();
      await runPollCycle(deps);
      expect(appendTriageLog).toHaveBeenCalledWith(
        expect.objectContaining({
          ticketId: 'PROJ-123',
          outcome: 'GO',
          reason: 'All checks pass',
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        })
      );
    });

    it('GIVEN triage returns NEEDS_CLARIFICATION WHEN runPollCycle called THEN appendTriageLog called with NEEDS_CLARIFICATION entry', async () => {
      const deps = makeDeps({
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'NEEDS_CLARIFICATION',
          reason: 'Missing details',
          questions: ['What?'],
        } as TriageResult),
      });
      await runPollCycle(deps);
      expect(appendTriageLog).toHaveBeenCalledWith(
        expect.objectContaining({
          ticketId: 'PROJ-123',
          outcome: 'NEEDS_CLARIFICATION',
          reason: 'Missing details',
        })
      );
    });

    it('GIVEN triage returns REJECT WHEN runPollCycle called THEN appendTriageLog called with REJECT entry', async () => {
      const deps = makeDeps({
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'REJECT',
          reason: 'Out of scope',
        } as TriageResult),
      });
      await runPollCycle(deps);
      expect(appendTriageLog).toHaveBeenCalledWith(
        expect.objectContaining({
          ticketId: 'PROJ-123',
          outcome: 'REJECT',
          reason: 'Out of scope',
        })
      );
    });

    it('GIVEN two tickets WHEN runPollCycle called THEN appendTriageLog called for each ticket', async () => {
      const ticket2: NormalizedTicket = { ...TICKET, id: 'PROJ-124' };
      const deps = makeDeps({
        providerOverrides: {
          poll: vi.fn().mockResolvedValue([TICKET, ticket2]),
        },
      });
      await runPollCycle(deps);
      expect(appendTriageLog).toHaveBeenCalledTimes(2);
    });
  });

  describe('AC: appendTriageLog includes ISO timestamp', () => {
    it('GIVEN any triage outcome WHEN appendTriageLog called THEN timestamp is valid ISO string', async () => {
      const deps = makeDeps();
      await runPollCycle(deps);
      const call = vi.mocked(appendTriageLog).mock.calls[0][0];
      expect(() => new Date(call.timestamp)).not.toThrow();
      expect(new Date(call.timestamp).toISOString()).toBe(call.timestamp);
    });
  });

  describe('AC: appendTriageLog failures do not disrupt the pipeline', () => {
    it('GIVEN appendTriageLog throws WHEN runPollCycle with GO ticket THEN pipeline still processes ticket', async () => {
      vi.mocked(appendTriageLog).mockImplementation(() => { throw new Error('disk full'); });
      const deps = makeDeps();
      const results = await runPollCycle(deps);
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].triageResult?.outcome).toBe('GO');
    });

    it('GIVEN appendTriageLog throws WHEN runPollCycle with REJECT ticket THEN result still returned', async () => {
      vi.mocked(appendTriageLog).mockImplementation(() => { throw new Error('disk full'); });
      const deps = makeDeps({
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'REJECT',
          reason: 'Out of scope',
        } as TriageResult),
      });
      const results = await runPollCycle(deps);
      expect(results).toHaveLength(1);
      expect(results[0].triageResult?.outcome).toBe('REJECT');
    });
  });
});

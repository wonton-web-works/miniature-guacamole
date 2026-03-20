import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock child_process.spawnSync for git operations in processTicket
vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return { ...actual, spawnSync: vi.fn() };
});

// Mock fs for shouldStop (existsSync) and hasSufficientDiskSpace (statfsSync)
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return { ...actual, existsSync: vi.fn().mockReturnValue(false), statfsSync: vi.fn().mockReturnValue({ bfree: 1_000_000, bsize: 8192 }) };
});

// Mock default module imports so ?? fallbacks can be tested
vi.mock('../../src/planner', () => ({
  planTicket: vi.fn().mockResolvedValue([{ name: 'default-ws', acceptanceCriteria: 'AC' }]),
}));
vi.mock('../../src/executor', () => ({
  executeWorkstream: vi.fn().mockResolvedValue({ workstream: 'default-ws', success: true, output: 'ok', durationMs: 50 }),
}));
vi.mock('../../src/triage', () => ({
  triageTicket: vi.fn().mockResolvedValue({ outcome: 'GO', reason: 'default triage' }),
}));
vi.mock('../../src/worktree', () => ({
  createWorktree: vi.fn().mockReturnValue({ worktreePath: '/tmp/default-wt', branchName: 'feature/default' }),
  removeWorktree: vi.fn(),
}));
vi.mock('../../src/github', () => ({
  createPR: vi.fn().mockReturnValue({ success: true, prUrl: 'https://github.com/owner/repo/pull/77' }),
}));
vi.mock('../../src/claude', () => ({
  execClaude: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0, timedOut: false }),
}));

// Mock triage-log module
vi.mock('../../src/triage-log', () => ({
  appendTriageLog: vi.fn(),
}));

import { processTicket, runPollCycle, shouldStop, hasSufficientDiskSpace } from '../../src/orchestrator';
import type { OrchestratorConfig } from '../../src/orchestrator';
import type { NormalizedTicket, TicketProvider } from '../../src/providers/types';
import type { DaemonConfig } from '../../src/types';
import type { WorkstreamPlan } from '../../src/planner';
import type { ExecutionResult } from '../../src/executor';
import type { TriageResult } from '../../src/triage';
import { appendTriageLog } from '../../src/triage-log';

import { spawnSync } from 'child_process';
import { existsSync, statfsSync } from 'fs';
import { triageTicket as defaultTriageTicketMock } from '../../src/triage';
import { planTicket as defaultPlanTicketMock } from '../../src/planner';
import { executeWorkstream as defaultExecuteWorkstreamMock } from '../../src/executor';
import { createWorktree as defaultCreateWorktreeMock, removeWorktree as defaultRemoveWorktreeMock } from '../../src/worktree';
import { createPR as defaultCreatePRMock } from '../../src/github';
import { execClaude as defaultExecClaudeMock } from '../../src/claude';

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
// Triage gate integration tests (WS-DAEMON-15)
// ---------------------------------------------------------------------------

describe('processTicket() triage gate (WS-DAEMON-15)', () => {
  beforeEach(() => {
    vi.mocked(spawnSync).mockImplementation((_cmd: unknown, args: unknown) => {
      const argsList = args as string[] | undefined;
      if (argsList?.includes('--cached') && argsList?.includes('--quiet')) {
        return { status: 1, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
      }
      return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
    });
  });

  describe('AC: Triage runs before planning', () => {
    it('GIVEN triage returns GO WHEN processTicket called THEN planTicket is called', async () => {
      const deps = makeDeps();
      await processTicket(TICKET, deps);
      expect(deps.triageTicket).toHaveBeenCalledOnce();
      expect(deps.planTicket).toHaveBeenCalledOnce();
    });

    it('GIVEN triage returns NEEDS_CLARIFICATION WHEN processTicket called THEN planTicket is NOT called', async () => {
      const deps = makeDeps({
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'NEEDS_CLARIFICATION',
          reason: 'Missing acceptance criteria',
          questions: ['What should the behavior be?'],
        } as TriageResult),
      });
      const result = await processTicket(TICKET, deps);
      expect(deps.planTicket).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toContain('NEEDS_CLARIFICATION');
    });

    it('GIVEN triage returns REJECT WHEN processTicket called THEN planTicket is NOT called', async () => {
      const deps = makeDeps({
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'REJECT',
          reason: 'Out of scope',
        } as TriageResult),
      });
      const result = await processTicket(TICKET, deps);
      expect(deps.planTicket).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toContain('REJECT');
    });
  });

  describe('AC: Triage failure posts comment and label (GH-105)', () => {
    it('GIVEN NEEDS_CLARIFICATION with questions WHEN processTicket called THEN addComment body contains outcome, reason, and bullet-list questions', async () => {
      const deps = makeDeps({
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'NEEDS_CLARIFICATION',
          reason: 'Missing acceptance criteria',
          questions: ['What endpoint?', 'Auth required?'],
        } as TriageResult),
      });
      await processTicket(TICKET, deps);
      expect(deps.provider.addComment).toHaveBeenCalledWith(
        TICKET.id,
        '**Triage: NEEDS_CLARIFICATION**\n\n' +
        'Missing acceptance criteria\n\n' +
        '**Questions:**\n' +
        '- What endpoint?\n' +
        '- Auth required?'
      );
    });

    it('GIVEN NEEDS_CLARIFICATION without questions WHEN processTicket called THEN addComment body has outcome and reason only', async () => {
      const deps = makeDeps({
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'NEEDS_CLARIFICATION',
          reason: 'Unclear',
        } as TriageResult),
      });
      await processTicket(TICKET, deps);
      expect(deps.provider.addComment).toHaveBeenCalledWith(
        TICKET.id,
        '**Triage: NEEDS_CLARIFICATION**\n\nUnclear'
      );
    });

    it('GIVEN triage returns NEEDS_CLARIFICATION WHEN processTicket called THEN adds needs-info label', async () => {
      const deps = makeDeps({
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'NEEDS_CLARIFICATION',
          reason: 'Unclear',
        } as TriageResult),
      });
      await processTicket(TICKET, deps);
      expect(deps.provider.addLabel).toHaveBeenCalledWith(TICKET.id, 'mg-daemon:needs-info');
    });

    it('GIVEN REJECT WHEN processTicket called THEN addComment body contains outcome and rejection reason', async () => {
      const deps = makeDeps({
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'REJECT',
          reason: 'Out of scope',
        } as TriageResult),
      });
      await processTicket(TICKET, deps);
      expect(deps.provider.addComment).toHaveBeenCalledWith(
        TICKET.id,
        '**Triage: REJECT**\n\nOut of scope'
      );
    });

    it('GIVEN triage returns REJECT WHEN processTicket called THEN adds rejected label', async () => {
      const deps = makeDeps({
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'REJECT',
          reason: 'Out of scope',
        } as TriageResult),
      });
      await processTicket(TICKET, deps);
      expect(deps.provider.addLabel).toHaveBeenCalledWith(TICKET.id, 'mg-daemon:rejected');
    });

    it('GIVEN triage fails and addComment throws WHEN processTicket called THEN pipeline still returns (best-effort)', async () => {
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
      const result = await processTicket(TICKET, deps);
      expect(result.success).toBe(false);
      expect(result.triageResult?.outcome).toBe('NEEDS_CLARIFICATION');
    });

    it('GIVEN addLabel throws but addComment succeeds WHEN processTicket called THEN pipeline still returns (best-effort)', async () => {
      const deps = makeDeps({
        providerOverrides: {
          addLabel: vi.fn().mockRejectedValue(new Error('label API error')),
        },
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'REJECT',
          reason: 'Nope',
        } as TriageResult),
      });
      const result = await processTicket(TICKET, deps);
      expect(result.success).toBe(false);
      // Comment was still attempted even though label will fail
      expect(deps.provider.addComment).toHaveBeenCalled();
    });

    it('GIVEN addComment throws WHEN processTicket called THEN addLabel is still attempted', async () => {
      const addComment = vi.fn().mockRejectedValue(new Error('comment API error'));
      const addLabel = vi.fn().mockResolvedValue(undefined);
      const deps = makeDeps({
        providerOverrides: { addComment, addLabel },
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'NEEDS_CLARIFICATION',
          reason: 'Vague',
        } as TriageResult),
      });
      await processTicket(TICKET, deps);
      expect(addComment).toHaveBeenCalled();
      expect(addLabel).toHaveBeenCalledWith(TICKET.id, 'mg-daemon:needs-info');
    });

    it('GIVEN addComment throws WHEN processTicket called THEN markFailed is still called with triage reason', async () => {
      const deps = makeDeps({
        providerOverrides: {
          addComment: vi.fn().mockRejectedValue(new Error('API error')),
        },
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'NEEDS_CLARIFICATION',
          reason: 'Missing details',
        } as TriageResult),
      });
      await processTicket(TICKET, deps);
      expect(deps.tracker.markFailed).toHaveBeenCalledWith(
        TICKET.id,
        expect.stringContaining('NEEDS_CLARIFICATION')
      );
      expect(deps.tracker.markFailed).toHaveBeenCalledWith(
        TICKET.id,
        expect.stringContaining('Missing details')
      );
    });

    it('GIVEN addLabel throws WHEN processTicket called THEN markFailed is still called with triage reason', async () => {
      const deps = makeDeps({
        providerOverrides: {
          addLabel: vi.fn().mockRejectedValue(new Error('label error')),
        },
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'REJECT',
          reason: 'Out of scope',
        } as TriageResult),
      });
      await processTicket(TICKET, deps);
      expect(deps.tracker.markFailed).toHaveBeenCalledWith(
        TICKET.id,
        expect.stringContaining('REJECT')
      );
      expect(deps.tracker.markFailed).toHaveBeenCalledWith(
        TICKET.id,
        expect.stringContaining('Out of scope')
      );
    });

    it('GIVEN both addComment and addLabel throw WHEN processTicket called THEN markFailed is still called with triage reason', async () => {
      const deps = makeDeps({
        providerOverrides: {
          addComment: vi.fn().mockRejectedValue(new Error('comment error')),
          addLabel: vi.fn().mockRejectedValue(new Error('label error')),
        },
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'REJECT',
          reason: 'Not actionable',
        } as TriageResult),
      });
      const result = await processTicket(TICKET, deps);
      expect(result.success).toBe(false);
      expect(result.triageResult?.outcome).toBe('REJECT');
      expect(deps.tracker.markFailed).toHaveBeenCalledWith(
        TICKET.id,
        expect.stringContaining('Not actionable')
      );
    });

    it('GIVEN writeback fails WHEN processTicket called THEN processTicket does NOT throw', async () => {
      const deps = makeDeps({
        providerOverrides: {
          addComment: vi.fn().mockRejectedValue(new Error('boom')),
          addLabel: vi.fn().mockRejectedValue(new Error('boom')),
        },
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'NEEDS_CLARIFICATION',
          reason: 'Unclear',
        } as TriageResult),
      });
      // Should resolve, not reject
      await expect(processTicket(TICKET, deps)).resolves.toBeDefined();
    });
  });

  describe('AC: Triage result in PipelineResult', () => {
    it('GIVEN triage returns GO WHEN processTicket resolves THEN triageResult is in result', async () => {
      const deps = makeDeps();
      const result = await processTicket(TICKET, deps);
      expect(result.triageResult).toBeDefined();
      expect(result.triageResult?.outcome).toBe('GO');
    });

    it('GIVEN triage returns NEEDS_CLARIFICATION WHEN processTicket resolves THEN triageResult reflects it', async () => {
      const deps = makeDeps({
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'NEEDS_CLARIFICATION',
          reason: 'Missing details',
        } as TriageResult),
      });
      const result = await processTicket(TICKET, deps);
      expect(result.triageResult?.outcome).toBe('NEEDS_CLARIFICATION');
    });
  });

  describe('AC: dryRun skips comment/label but still triages', () => {
    it('GIVEN dryRun=true and triage rejects WHEN processTicket called THEN addComment is NOT called', async () => {
      const deps = makeDeps({
        configOverrides: { dryRun: true },
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'NEEDS_CLARIFICATION',
          reason: 'Vague',
        } as TriageResult),
      });
      await processTicket(TICKET, deps);
      expect(deps.provider.addComment).not.toHaveBeenCalled();
      expect(deps.provider.addLabel).not.toHaveBeenCalled();
    });
  });

  describe('AC: dryRun=true triage results in PipelineResult (GH-107)', () => {
    it('GIVEN dryRun=true and triage GO WHEN processTicket resolves THEN triageResult populated and success=true', async () => {
      const deps = makeDeps({
        configOverrides: { dryRun: true },
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'GO',
          reason: 'Ticket is well-defined',
        } as TriageResult),
      });
      const result = await processTicket(TICKET, deps);
      expect(result.triageResult).toBeDefined();
      expect(result.triageResult?.outcome).toBe('GO');
      expect(result.triageResult?.reason).toBe('Ticket is well-defined');
      expect(result.success).toBe(true);
    });

    it('GIVEN dryRun=true and triage REJECT WHEN processTicket resolves THEN triageResult populated and success=false', async () => {
      const deps = makeDeps({
        configOverrides: { dryRun: true },
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'REJECT',
          reason: 'Out of scope for this project',
        } as TriageResult),
      });
      const result = await processTicket(TICKET, deps);
      expect(result.triageResult).toBeDefined();
      expect(result.triageResult?.outcome).toBe('REJECT');
      expect(result.triageResult?.reason).toBe('Out of scope for this project');
      expect(result.success).toBe(false);
    });

    it('GIVEN dryRun=true and triage NEEDS_CLARIFICATION WHEN processTicket resolves THEN triageResult has questions and success=false', async () => {
      const deps = makeDeps({
        configOverrides: { dryRun: true },
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'NEEDS_CLARIFICATION',
          reason: 'Missing acceptance criteria',
          questions: ['What is the expected behavior?', 'Which endpoints are affected?'],
        } as TriageResult),
      });
      const result = await processTicket(TICKET, deps);
      expect(result.triageResult).toBeDefined();
      expect(result.triageResult?.outcome).toBe('NEEDS_CLARIFICATION');
      expect(result.triageResult?.questions).toEqual([
        'What is the expected behavior?',
        'Which endpoints are affected?',
      ]);
      expect(result.success).toBe(false);
    });

    it('GIVEN dryRun=true and non-GO triage WHEN processTicket called THEN addComment and addLabel are NOT called', async () => {
      const deps = makeDeps({
        configOverrides: { dryRun: true },
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'REJECT',
          reason: 'Not actionable',
        } as TriageResult),
      });
      await processTicket(TICKET, deps);
      expect(deps.provider.addComment).not.toHaveBeenCalled();
      expect(deps.provider.addLabel).not.toHaveBeenCalled();
    });
  });

  describe('AC: Tracker updated on triage failure', () => {
    it('GIVEN triage returns NEEDS_CLARIFICATION WHEN processTicket called THEN markFailed is called', async () => {
      const deps = makeDeps({
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'NEEDS_CLARIFICATION',
          reason: 'Vague ticket',
        } as TriageResult),
      });
      await processTicket(TICKET, deps);
      expect(deps.tracker.markFailed).toHaveBeenCalledWith(
        TICKET.id,
        expect.stringContaining('NEEDS_CLARIFICATION')
      );
    });
  });
});

// ---------------------------------------------------------------------------
// Triage log persistence tests (GH-106)
// ---------------------------------------------------------------------------

describe('processTicket() triage log persistence (GH-106)', () => {
  beforeEach(() => {
    vi.mocked(spawnSync).mockImplementation((_cmd: unknown, args: unknown) => {
      const argsList = args as string[] | undefined;
      if (argsList?.includes('--cached') && argsList?.includes('--quiet')) {
        return { status: 1, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
      }
      return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
    });
    vi.mocked(appendTriageLog).mockClear();
  });

  describe('AC: appendTriageLog called after every triage', () => {
    it('GIVEN triage returns GO WHEN processTicket called THEN appendTriageLog is called with GO outcome', async () => {
      const deps = makeDeps();
      await processTicket(TICKET, deps);

      expect(appendTriageLog).toHaveBeenCalledOnce();
      expect(appendTriageLog).toHaveBeenCalledWith(
        expect.objectContaining({
          ticketId: 'PROJ-123',
          outcome: 'GO',
          reason: 'All checks pass',
          timestamp: expect.any(String),
        })
      );
    });

    it('GIVEN triage returns NEEDS_CLARIFICATION WHEN processTicket called THEN appendTriageLog is called with NEEDS_CLARIFICATION', async () => {
      const deps = makeDeps({
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'NEEDS_CLARIFICATION',
          reason: 'Missing AC',
          questions: ['What endpoint?'],
        } as TriageResult),
      });
      await processTicket(TICKET, deps);

      expect(appendTriageLog).toHaveBeenCalledOnce();
      expect(appendTriageLog).toHaveBeenCalledWith(
        expect.objectContaining({
          ticketId: 'PROJ-123',
          outcome: 'NEEDS_CLARIFICATION',
          reason: 'Missing AC',
        })
      );
    });

    it('GIVEN triage returns REJECT WHEN processTicket called THEN appendTriageLog is called with REJECT', async () => {
      const deps = makeDeps({
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'REJECT',
          reason: 'Out of scope',
        } as TriageResult),
      });
      await processTicket(TICKET, deps);

      expect(appendTriageLog).toHaveBeenCalledOnce();
      expect(appendTriageLog).toHaveBeenCalledWith(
        expect.objectContaining({
          ticketId: 'PROJ-123',
          outcome: 'REJECT',
          reason: 'Out of scope',
        })
      );
    });

    it('GIVEN any triage outcome WHEN appendTriageLog called THEN timestamp is ISO format', async () => {
      const deps = makeDeps();
      await processTicket(TICKET, deps);

      const call = vi.mocked(appendTriageLog).mock.calls[0][0];
      expect(call.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('AC: pipeline continues if appendTriageLog throws', () => {
    it('GIVEN appendTriageLog throws WHEN triage returns GO THEN pipeline continues to planning', async () => {
      vi.mocked(appendTriageLog).mockImplementation(() => {
        throw new Error('disk full');
      });

      const deps = makeDeps();
      const result = await processTicket(TICKET, deps);

      expect(deps.planTicket).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('GIVEN appendTriageLog throws WHEN triage returns REJECT THEN pipeline still returns failure result', async () => {
      vi.mocked(appendTriageLog).mockImplementation(() => {
        throw new Error('disk full');
      });

      const deps = makeDeps({
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'REJECT',
          reason: 'Bad ticket',
        } as TriageResult),
      });
      const result = await processTicket(TICKET, deps);

      expect(result.success).toBe(false);
      expect(result.error).toContain('REJECT');
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

  describe('AC: Emergency stop guard', () => {
    it('GIVEN STOP sentinel exists WHEN runPollCycle called THEN returns empty array without polling', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      const deps = makeDeps();
      const results = await runPollCycle(deps);
      expect(results).toHaveLength(0);
      expect(deps.provider.poll).not.toHaveBeenCalled();
      vi.mocked(existsSync).mockReturnValue(false);
    });
  });

  describe('AC: Disk space guard', () => {
    it('GIVEN insufficient disk space WHEN runPollCycle called THEN returns empty array without polling', async () => {
      // statfsSync returns very low free space
      vi.mocked(statfsSync as unknown as () => unknown).mockReturnValue({ bfree: 1, bsize: 1 });
      const deps = makeDeps();
      const results = await runPollCycle(deps);
      expect(results).toHaveLength(0);
      expect(deps.provider.poll).not.toHaveBeenCalled();
      // Restore to sufficient space
      vi.mocked(statfsSync as unknown as () => unknown).mockReturnValue({ bfree: 1_000_000, bsize: 8192 });
    });
  });
});

// ---------------------------------------------------------------------------
// shouldStop() and hasSufficientDiskSpace() direct tests
// ---------------------------------------------------------------------------

describe('shouldStop() (WS-DAEMON-11)', () => {
  it('GIVEN STOP sentinel does not exist WHEN shouldStop called THEN returns false', () => {
    vi.mocked(existsSync).mockReturnValue(false);
    expect(shouldStop()).toBe(false);
  });

  it('GIVEN STOP sentinel exists WHEN shouldStop called THEN returns true', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    expect(shouldStop()).toBe(true);
    vi.mocked(existsSync).mockReturnValue(false);
  });
});

describe('hasSufficientDiskSpace() (WS-DAEMON-11)', () => {
  it('GIVEN enough free space WHEN hasSufficientDiskSpace called THEN returns true', () => {
    vi.mocked(statfsSync as unknown as () => unknown).mockReturnValue({ bfree: 1_000_000, bsize: 8192 });
    expect(hasSufficientDiskSpace()).toBe(true);
  });

  it('GIVEN insufficient free space WHEN hasSufficientDiskSpace called THEN returns false', () => {
    vi.mocked(statfsSync as unknown as () => unknown).mockReturnValue({ bfree: 1, bsize: 1 });
    expect(hasSufficientDiskSpace()).toBe(false);
    vi.mocked(statfsSync as unknown as () => unknown).mockReturnValue({ bfree: 1_000_000, bsize: 8192 });
  });

  it('GIVEN statfsSync throws WHEN hasSufficientDiskSpace called THEN returns true (fail-open)', () => {
    vi.mocked(statfsSync as unknown as () => unknown).mockImplementation(() => { throw new Error('ENOENT'); });
    expect(hasSufficientDiskSpace()).toBe(true);
    vi.mocked(statfsSync as unknown as () => unknown).mockReturnValue({ bfree: 1_000_000, bsize: 8192 });
  });
});

// ---------------------------------------------------------------------------
// processTicket() — coverage hardening (GH-108)
// ---------------------------------------------------------------------------

describe('processTicket() coverage hardening (GH-108)', () => {
  beforeEach(() => {
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(statfsSync as unknown as () => unknown).mockReturnValue({ bfree: 1_000_000, bsize: 8192 });
    vi.mocked(spawnSync).mockImplementation((_cmd: unknown, args: unknown) => {
      const argsList = args as string[] | undefined;
      if (argsList?.includes('--cached') && argsList?.includes('--quiet')) {
        return { status: 1, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
      }
      return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
    });
  });

  describe('AC: Default orchestration config fallback', () => {
    it('GIVEN config.orchestration is undefined WHEN processTicket called THEN uses default values and succeeds', async () => {
      const provider = makeProvider();
      const config: DaemonConfig = {
        provider: 'jira',
        jira: { host: 'https://example.atlassian.net', email: '', apiToken: 'tok', project: 'PROJ', jql: '' },
        github: { repo: 'owner/repo', baseBranch: 'main' },
        polling: { intervalSeconds: 300, batchSize: 5 },
        // orchestration intentionally omitted to exercise nullish coalescing fallback
      };
      const deps: OrchestratorConfig = {
        provider,
        config,
        tracker: {
          markProcessing: vi.fn(),
          markComplete: vi.fn(),
          markFailed: vi.fn(),
          getProcessedTickets: vi.fn().mockReturnValue([]),
        },
        triageTicket: vi.fn().mockResolvedValue({ outcome: 'GO', reason: 'OK' } as TriageResult),
        planTicket: vi.fn().mockResolvedValue(WORKSTREAMS),
        executeWorkstream: vi.fn().mockImplementation(async (ws: WorkstreamPlan) => ({
          workstream: ws.name, success: true, output: 'done', durationMs: 100,
        })),
        createWorktree: vi.fn().mockReturnValue({ worktreePath: '/tmp/wt', branchName: 'feature/test' }),
        removeWorktree: vi.fn(),
        createPR: vi.fn().mockReturnValue({ success: true, prUrl: 'https://github.com/owner/repo/pull/99' }),
      };

      const result = await processTicket(TICKET, deps);
      expect(result.success).toBe(true);
      expect(deps.planTicket).toHaveBeenCalled();
    });
  });

  describe('AC: Merge conflict handling', () => {
    it('GIVEN git merge fails WHEN processTicket runs THEN aborts merge and returns failure', async () => {
      vi.mocked(spawnSync).mockImplementation((_cmd: unknown, args: unknown) => {
        const argsList = args as string[] | undefined;
        const cmd = _cmd as string;
        // git merge returns non-zero (conflict)
        if (cmd === 'git' && argsList?.includes('merge') && !argsList?.includes('--abort')) {
          return { status: 1, stdout: '', stderr: 'CONFLICT', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
        }
        if (argsList?.includes('--cached') && argsList?.includes('--quiet')) {
          return { status: 1, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
        }
        return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
      });

      const deps = makeDeps();
      const result = await processTicket(TICKET, deps);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Merge conflict');
      expect(deps.tracker.markFailed).toHaveBeenCalledWith(TICKET.id, 'Merge conflict with main');
    });
  });

  describe('AC: No code changes produced', () => {
    it('GIVEN execution produces no diff WHEN processTicket runs THEN returns failure', async () => {
      vi.mocked(spawnSync).mockImplementation((_cmd: unknown, args: unknown) => {
        const argsList = args as string[] | undefined;
        // git diff --cached --quiet returns 0 = NO changes
        if (argsList?.includes('--cached') && argsList?.includes('--quiet')) {
          return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
        }
        return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
      });

      const deps = makeDeps();
      const result = await processTicket(TICKET, deps);
      expect(result.success).toBe(false);
      expect(result.error).toContain('No code changes produced');
      expect(deps.tracker.markFailed).toHaveBeenCalledWith(TICKET.id, 'No code changes produced');
    });
  });

  describe('AC: Test failure path', () => {
    it('GIVEN vitest run fails WHEN processTicket runs THEN adds quality-gate failure to executed and still creates PR', async () => {
      vi.mocked(spawnSync).mockImplementation((_cmd: unknown, args: unknown) => {
        const argsList = args as string[] | undefined;
        const cmd = _cmd as string;
        if (cmd === 'npx' && argsList?.includes('vitest')) {
          return { status: 1, stdout: 'FAIL tests/foo.test.ts', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
        }
        if (argsList?.includes('--cached') && argsList?.includes('--quiet')) {
          return { status: 1, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
        }
        return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
      });

      const deps = makeDeps();
      const result = await processTicket(TICKET, deps);
      const qgResult = result.executed.find(e => e.workstream === 'quality-gate' && e.error === 'Tests failed');
      expect(qgResult).toBeDefined();
      expect(qgResult!.success).toBe(false);
      // PR should still be created
      expect(deps.createPR).toHaveBeenCalled();
    });
  });

  describe('AC: Build failure path', () => {
    it('GIVEN tsc fails WHEN processTicket runs THEN adds quality-gate build failure to executed', async () => {
      vi.mocked(spawnSync).mockImplementation((_cmd: unknown, args: unknown) => {
        const argsList = args as string[] | undefined;
        const cmd = _cmd as string;
        if (cmd === 'npx' && argsList?.includes('tsc')) {
          return { status: 1, stdout: '', stderr: 'error TS2345', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
        }
        if (argsList?.includes('--cached') && argsList?.includes('--quiet')) {
          return { status: 1, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
        }
        return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
      });

      const deps = makeDeps();
      const result = await processTicket(TICKET, deps);
      const qgResult = result.executed.find(e => e.workstream === 'quality-gate' && e.error === 'Build failed');
      expect(qgResult).toBeDefined();
      expect(qgResult!.success).toBe(false);
    });
  });

  describe('AC: Worktree cleanup error', () => {
    it('GIVEN removeWorktree throws WHEN processTicket finishes THEN pipeline still returns result (best-effort cleanup)', async () => {
      const deps = makeDeps({
        removeWorktree: vi.fn().mockImplementation(() => { throw new Error('rm -rf failed'); }),
      });
      const result = await processTicket(TICKET, deps);
      // Pipeline should complete despite cleanup failure
      expect(result.success).toBe(true);
      expect(result.prUrl).toBeDefined();
    });
  });

  describe('AC: PR creation failure', () => {
    it('GIVEN createPR returns failure WHEN processTicket runs THEN markFailed is called with PR error', async () => {
      const deps = makeDeps({
        createPR: vi.fn().mockReturnValue({ success: false, error: 'gh CLI not found' }),
      });
      const result = await processTicket(TICKET, deps);
      expect(result.success).toBe(false);
      expect(deps.tracker.markFailed).toHaveBeenCalledWith(TICKET.id, 'gh CLI not found');
    });

    it('GIVEN createPR returns failure with no error message WHEN processTicket runs THEN uses fallback message', async () => {
      const deps = makeDeps({
        createPR: vi.fn().mockReturnValue({ success: false }),
      });
      const result = await processTicket(TICKET, deps);
      expect(result.success).toBe(false);
      expect(deps.tracker.markFailed).toHaveBeenCalledWith(TICKET.id, 'PR creation failed');
    });
  });

  describe('AC: planTicket rejects with non-Error value', () => {
    it('GIVEN planTicket rejects with a string WHEN processTicket runs THEN stringifies and marks failed', async () => {
      const deps = makeDeps({
        planTicket: vi.fn().mockRejectedValue('timeout reached'),
      });
      const result = await processTicket(TICKET, deps);
      expect(result.success).toBe(false);
      expect(result.error).toBe('timeout reached');
      expect(deps.tracker.markFailed).toHaveBeenCalledWith(TICKET.id, 'timeout reached');
    });
  });

  describe('AC: Test failure with undefined stdout', () => {
    it('GIVEN vitest fails with no stdout WHEN processTicket runs THEN uses empty string fallback for output', async () => {
      vi.mocked(spawnSync).mockImplementation((_cmd: unknown, args: unknown) => {
        const argsList = args as string[] | undefined;
        const cmd = _cmd as string;
        if (cmd === 'npx' && argsList?.includes('vitest')) {
          return { status: 1, stdout: undefined, stderr: '', pid: 0, output: [], signal: null } as unknown as ReturnType<typeof spawnSync>;
        }
        if (argsList?.includes('--cached') && argsList?.includes('--quiet')) {
          return { status: 1, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
        }
        return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
      });

      const deps = makeDeps();
      const result = await processTicket(TICKET, deps);
      const qgResult = result.executed.find(e => e.error === 'Tests failed');
      expect(qgResult).toBeDefined();
      expect(qgResult!.output).toBe('');
    });
  });

  describe('AC: Build failure with undefined stderr', () => {
    it('GIVEN tsc fails with no stderr WHEN processTicket runs THEN uses empty string fallback for output', async () => {
      vi.mocked(spawnSync).mockImplementation((_cmd: unknown, args: unknown) => {
        const argsList = args as string[] | undefined;
        const cmd = _cmd as string;
        if (cmd === 'npx' && argsList?.includes('tsc')) {
          return { status: 1, stdout: '', stderr: undefined, pid: 0, output: [], signal: null } as unknown as ReturnType<typeof spawnSync>;
        }
        if (argsList?.includes('--cached') && argsList?.includes('--quiet')) {
          return { status: 1, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
        }
        return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
      });

      const deps = makeDeps();
      const result = await processTicket(TICKET, deps);
      const qgResult = result.executed.find(e => e.error === 'Build failed');
      expect(qgResult).toBeDefined();
      expect(qgResult!.output).toBe('');
    });
  });

  describe('AC: Default dep fallbacks via ?? operator', () => {
    it('GIVEN no optional deps provided WHEN processTicket called THEN uses default module imports', async () => {
      // Re-setup mocked module defaults (mockReset clears them)
      vi.mocked(defaultTriageTicketMock).mockResolvedValue({ outcome: 'GO', reason: 'default triage' });
      vi.mocked(defaultPlanTicketMock).mockResolvedValue([{ name: 'default-ws', acceptanceCriteria: 'AC' }]);
      vi.mocked(defaultExecuteWorkstreamMock).mockResolvedValue({ workstream: 'default-ws', success: true, output: 'ok', durationMs: 50 });
      vi.mocked(defaultCreateWorktreeMock).mockReturnValue({ worktreePath: '/tmp/default-wt', branchName: 'feature/default' });
      vi.mocked(defaultRemoveWorktreeMock).mockImplementation(() => {});
      vi.mocked(defaultCreatePRMock).mockReturnValue({ success: true, prUrl: 'https://github.com/owner/repo/pull/77' });
      vi.mocked(defaultExecClaudeMock).mockResolvedValue({ stdout: '', stderr: '', exitCode: 0, timedOut: false });

      const provider = makeProvider();
      const config = makeConfig();
      const deps: OrchestratorConfig = {
        provider,
        config,
        tracker: {
          markProcessing: vi.fn(),
          markComplete: vi.fn(),
          markFailed: vi.fn(),
          getProcessedTickets: vi.fn().mockReturnValue([]),
        },
        // All optional deps omitted — exercises ?? default fallbacks for triageTicket, planTicket,
        // executeWorkstream, createWorktree, removeWorktree, createPR, execClaude
      };

      const result = await processTicket(TICKET, deps);
      // The mocked module defaults should take over
      expect(deps.tracker.markProcessing).toHaveBeenCalledWith(TICKET.id);
      expect(result.ticketId).toBe(TICKET.id);
      expect(result.success).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Triage integration paths — end-to-end (GH-108)
// ---------------------------------------------------------------------------

describe('processTicket() triage integration paths — end-to-end (GH-108)', () => {
  beforeEach(() => {
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(statfsSync as unknown as () => unknown).mockReturnValue({ bfree: 1_000_000, bsize: 8192 });
    vi.mocked(spawnSync).mockImplementation((_cmd: unknown, args: unknown) => {
      const argsList = args as string[] | undefined;
      if (argsList?.includes('--cached') && argsList?.includes('--quiet')) {
        return { status: 1, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
      }
      return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
    });
  });

  describe('GO path — full pipeline flows from triage through PR creation', () => {
    it('GIVEN triage returns GO WHEN processTicket completes THEN full pipeline executes: triage → plan → execute → PR → review transition → markComplete', async () => {
      const deps = makeDeps();
      const result = await processTicket(TICKET, deps);

      // Triage ran and returned GO
      expect(deps.triageTicket).toHaveBeenCalledOnce();
      expect(result.triageResult).toEqual({ outcome: 'GO', reason: 'All checks pass' });

      // Pipeline continued: plan → execute → PR
      expect(deps.planTicket).toHaveBeenCalledOnce();
      expect(deps.executeWorkstream).toHaveBeenCalledTimes(WORKSTREAMS.length);
      expect(deps.createWorktree).toHaveBeenCalledOnce();
      expect(deps.createPR).toHaveBeenCalledOnce();

      // Ticket transitioned through statuses
      expect(deps.provider.transitionStatus).toHaveBeenCalledWith(TICKET.id, 'in_progress');
      expect(deps.provider.transitionStatus).toHaveBeenCalledWith(TICKET.id, 'in_review');

      // PR linked and tracker updated
      expect(deps.provider.linkPR).toHaveBeenCalledWith(TICKET.id, result.prUrl);
      expect(deps.tracker.markProcessing).toHaveBeenCalledWith(TICKET.id);
      expect(deps.tracker.markComplete).toHaveBeenCalledWith(TICKET.id, result.prUrl);

      // No comment or label (triage passed)
      expect(deps.provider.addComment).not.toHaveBeenCalled();
      expect(deps.provider.addLabel).not.toHaveBeenCalled();

      // Result shape
      expect(result.success).toBe(true);
      expect(result.ticketId).toBe(TICKET.id);
      expect(result.planned).toHaveLength(WORKSTREAMS.length);
      expect(result.executed).toHaveLength(WORKSTREAMS.length);
      expect(result.prUrl).toBeDefined();
      expect(result.error).toBeUndefined();

      // Worktree cleaned up
      expect(deps.removeWorktree).toHaveBeenCalledOnce();
    });
  });

  describe('NEEDS_CLARIFICATION path — pipeline halts after triage with comment and label', () => {
    it('GIVEN triage returns NEEDS_CLARIFICATION with questions WHEN processTicket completes THEN pipeline halts, posts comment with questions, adds needs-info label, and marks failed', async () => {
      const triageResult: TriageResult = {
        outcome: 'NEEDS_CLARIFICATION',
        reason: 'Missing acceptance criteria and target API version',
        questions: ['Which API version (v1 or v2)?', 'What is the default page size?'],
      };
      const deps = makeDeps({
        triageTicket: vi.fn().mockResolvedValue(triageResult),
      });
      const result = await processTicket(TICKET, deps);

      // Triage ran
      expect(deps.triageTicket).toHaveBeenCalledOnce();
      expect(result.triageResult).toEqual(triageResult);

      // Pipeline halted — no planning, execution, worktree, or PR
      expect(deps.planTicket).not.toHaveBeenCalled();
      expect(deps.executeWorkstream).not.toHaveBeenCalled();
      expect(deps.createWorktree).not.toHaveBeenCalled();
      expect(deps.createPR).not.toHaveBeenCalled();
      expect(deps.removeWorktree).not.toHaveBeenCalled();
      expect(deps.provider.transitionStatus).not.toHaveBeenCalled();
      expect(deps.provider.linkPR).not.toHaveBeenCalled();

      // Comment posted with reason AND questions
      expect(deps.provider.addComment).toHaveBeenCalledWith(
        TICKET.id,
        expect.stringContaining('NEEDS_CLARIFICATION')
      );
      expect(deps.provider.addComment).toHaveBeenCalledWith(
        TICKET.id,
        expect.stringContaining('Missing acceptance criteria')
      );
      expect(deps.provider.addComment).toHaveBeenCalledWith(
        TICKET.id,
        expect.stringContaining('Which API version')
      );
      expect(deps.provider.addComment).toHaveBeenCalledWith(
        TICKET.id,
        expect.stringContaining('default page size')
      );

      // Label added
      expect(deps.provider.addLabel).toHaveBeenCalledWith(TICKET.id, 'mg-daemon:needs-info');

      // Tracker updated
      expect(deps.tracker.markProcessing).toHaveBeenCalledWith(TICKET.id);
      expect(deps.tracker.markFailed).toHaveBeenCalledWith(
        TICKET.id,
        expect.stringContaining('NEEDS_CLARIFICATION')
      );

      // Result shape
      expect(result.success).toBe(false);
      expect(result.ticketId).toBe(TICKET.id);
      expect(result.planned).toHaveLength(0);
      expect(result.executed).toHaveLength(0);
      expect(result.prUrl).toBeUndefined();
      expect(result.error).toContain('NEEDS_CLARIFICATION');
      expect(result.error).toContain('Missing acceptance criteria');
    });

    it('GIVEN triage returns NEEDS_CLARIFICATION without questions WHEN processTicket completes THEN comment does not include Questions section', async () => {
      const triageResult: TriageResult = {
        outcome: 'NEEDS_CLARIFICATION',
        reason: 'Ticket is too vague to implement',
      };
      const deps = makeDeps({
        triageTicket: vi.fn().mockResolvedValue(triageResult),
      });
      await processTicket(TICKET, deps);

      const commentArg = vi.mocked(deps.provider.addComment).mock.calls[0][1];
      expect(commentArg).toContain('NEEDS_CLARIFICATION');
      expect(commentArg).toContain('too vague');
      expect(commentArg).not.toContain('**Questions:**');
    });
  });

  describe('REJECT path — pipeline halts after triage with rejected label', () => {
    it('GIVEN triage returns REJECT WHEN processTicket completes THEN pipeline halts, posts comment, adds rejected label, and marks failed', async () => {
      const triageResult: TriageResult = {
        outcome: 'REJECT',
        reason: 'Ticket requires infrastructure changes unsafe for autonomous implementation',
      };
      const deps = makeDeps({
        triageTicket: vi.fn().mockResolvedValue(triageResult),
      });
      const result = await processTicket(TICKET, deps);

      // Triage ran
      expect(deps.triageTicket).toHaveBeenCalledOnce();
      expect(result.triageResult).toEqual(triageResult);

      // Pipeline halted
      expect(deps.planTicket).not.toHaveBeenCalled();
      expect(deps.executeWorkstream).not.toHaveBeenCalled();
      expect(deps.createWorktree).not.toHaveBeenCalled();
      expect(deps.createPR).not.toHaveBeenCalled();
      expect(deps.removeWorktree).not.toHaveBeenCalled();
      expect(deps.provider.transitionStatus).not.toHaveBeenCalled();
      expect(deps.provider.linkPR).not.toHaveBeenCalled();

      // Comment posted with reason
      expect(deps.provider.addComment).toHaveBeenCalledWith(
        TICKET.id,
        expect.stringContaining('REJECT')
      );
      expect(deps.provider.addComment).toHaveBeenCalledWith(
        TICKET.id,
        expect.stringContaining('infrastructure changes')
      );

      // Rejected label
      expect(deps.provider.addLabel).toHaveBeenCalledWith(TICKET.id, 'mg-daemon:rejected');

      // Tracker updated
      expect(deps.tracker.markProcessing).toHaveBeenCalledWith(TICKET.id);
      expect(deps.tracker.markFailed).toHaveBeenCalledWith(
        TICKET.id,
        expect.stringContaining('REJECT')
      );

      // Result shape
      expect(result.success).toBe(false);
      expect(result.ticketId).toBe(TICKET.id);
      expect(result.planned).toHaveLength(0);
      expect(result.executed).toHaveLength(0);
      expect(result.prUrl).toBeUndefined();
      expect(result.error).toContain('REJECT');
      expect(result.error).toContain('infrastructure changes');
    });
  });

  describe('dryRun interaction — triage paths skip write operations', () => {
    it('GIVEN dryRun=true and triage returns NEEDS_CLARIFICATION WHEN processTicket completes THEN no comment, no label, but still marks failed', async () => {
      const deps = makeDeps({
        configOverrides: { dryRun: true },
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'NEEDS_CLARIFICATION',
          reason: 'Unclear scope',
        } as TriageResult),
      });
      const result = await processTicket(TICKET, deps);

      expect(result.success).toBe(false);
      expect(result.triageResult?.outcome).toBe('NEEDS_CLARIFICATION');

      // Write operations skipped in dry-run
      expect(deps.provider.addComment).not.toHaveBeenCalled();
      expect(deps.provider.addLabel).not.toHaveBeenCalled();

      // Tracker still updated (not a write operation to the provider)
      expect(deps.tracker.markFailed).toHaveBeenCalledWith(
        TICKET.id,
        expect.stringContaining('NEEDS_CLARIFICATION')
      );
    });

    it('GIVEN dryRun=true and triage returns REJECT WHEN processTicket completes THEN no comment, no label, but still marks failed', async () => {
      const deps = makeDeps({
        configOverrides: { dryRun: true },
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'REJECT',
          reason: 'Out of scope',
        } as TriageResult),
      });
      const result = await processTicket(TICKET, deps);

      expect(result.success).toBe(false);
      expect(result.triageResult?.outcome).toBe('REJECT');
      expect(deps.provider.addComment).not.toHaveBeenCalled();
      expect(deps.provider.addLabel).not.toHaveBeenCalled();
      expect(deps.tracker.markFailed).toHaveBeenCalledWith(
        TICKET.id,
        expect.stringContaining('REJECT')
      );
    });

    it('GIVEN dryRun=true and triage returns GO WHEN processTicket completes THEN plans but does not execute or create PR', async () => {
      const deps = makeDeps({ configOverrides: { dryRun: true } });
      const result = await processTicket(TICKET, deps);

      expect(result.success).toBe(true);
      expect(result.triageResult?.outcome).toBe('GO');
      expect(deps.planTicket).toHaveBeenCalledOnce();
      expect(deps.executeWorkstream).not.toHaveBeenCalled();
      expect(deps.createWorktree).not.toHaveBeenCalled();
      expect(deps.createPR).not.toHaveBeenCalled();
    });
  });

  describe('triage config fallback — default triage config when config.triage is undefined', () => {
    it('GIVEN config.triage is undefined WHEN processTicket called THEN triage still runs with default config', async () => {
      const provider = makeProvider();
      const config: DaemonConfig = {
        provider: 'jira',
        jira: { host: 'https://example.atlassian.net', email: '', apiToken: 'tok', project: 'PROJ', jql: '' },
        github: { repo: 'owner/repo', baseBranch: 'main' },
        polling: { intervalSeconds: 300, batchSize: 5 },
        orchestration: {
          claudeTimeout: 1800000,
          concurrency: 1,
          delayBetweenTicketsMs: 0,
          dryRun: false,
          errorBudget: 3,
        },
        // triage intentionally omitted — exercises ?? default fallback
      };
      const triageFn = vi.fn().mockResolvedValue({ outcome: 'GO', reason: 'OK' } as TriageResult);
      const deps: OrchestratorConfig = {
        provider,
        config,
        tracker: { markProcessing: vi.fn(), markComplete: vi.fn(), markFailed: vi.fn(), getProcessedTickets: vi.fn().mockReturnValue([]) },
        triageTicket: triageFn,
        planTicket: vi.fn().mockResolvedValue(WORKSTREAMS),
        executeWorkstream: vi.fn().mockImplementation(async (ws: WorkstreamPlan) => ({
          workstream: ws.name, success: true, output: 'done', durationMs: 100,
        })),
        createWorktree: vi.fn().mockReturnValue({ worktreePath: '/tmp/wt', branchName: 'feature/test' }),
        removeWorktree: vi.fn(),
        createPR: vi.fn().mockReturnValue({ success: true, prUrl: 'https://github.com/owner/repo/pull/99' }),
      };

      const result = await processTicket(TICKET, deps);
      expect(result.success).toBe(true);
      // Triage was called with default config values
      expect(triageFn).toHaveBeenCalledWith(
        TICKET,
        expect.objectContaining({ enabled: true, autoReject: false, maxTicketSizeChars: 10000 }),
        expect.any(Function)
      );
    });
  });
});

// ---------------------------------------------------------------------------
// runPollCycle() — orchestration config fallback (GH-108)
// ---------------------------------------------------------------------------

describe('runPollCycle() orchestration config fallback (GH-108)', () => {
  beforeEach(() => {
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(statfsSync as unknown as () => unknown).mockReturnValue({ bfree: 1_000_000, bsize: 8192 });
    vi.mocked(spawnSync).mockImplementation((_cmd: unknown, args: unknown) => {
      const argsList = args as string[] | undefined;
      if (argsList?.includes('--cached') && argsList?.includes('--quiet')) {
        return { status: 1, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
      }
      return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null } as ReturnType<typeof spawnSync>;
    });
  });

  it('GIVEN config.orchestration is undefined WHEN runPollCycle called THEN uses default concurrency and delay', async () => {
    const provider = makeProvider();
    const config: DaemonConfig = {
      provider: 'jira',
      jira: { host: 'https://example.atlassian.net', email: '', apiToken: 'tok', project: 'PROJ', jql: '' },
      github: { repo: 'owner/repo', baseBranch: 'main' },
      polling: { intervalSeconds: 300, batchSize: 5 },
      // orchestration intentionally omitted
    };
    const deps: OrchestratorConfig = {
      provider,
      config,
      tracker: {
        markProcessing: vi.fn(),
        markComplete: vi.fn(),
        markFailed: vi.fn(),
        getProcessedTickets: vi.fn().mockReturnValue([]),
      },
      triageTicket: vi.fn().mockResolvedValue({ outcome: 'GO', reason: 'OK' } as TriageResult),
      planTicket: vi.fn().mockResolvedValue(WORKSTREAMS),
      executeWorkstream: vi.fn().mockImplementation(async (ws: WorkstreamPlan) => ({
        workstream: ws.name, success: true, output: 'done', durationMs: 100,
      })),
      createWorktree: vi.fn().mockReturnValue({ worktreePath: '/tmp/wt', branchName: 'feature/test' }),
      removeWorktree: vi.fn(),
      createPR: vi.fn().mockReturnValue({ success: true, prUrl: 'https://github.com/owner/repo/pull/99' }),
    };

    const results = await runPollCycle(deps);
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
  });
});

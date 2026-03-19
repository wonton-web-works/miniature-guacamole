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

// Mock triage-log module (must be before import)
vi.mock('../../src/triage-log', () => ({
  appendTriageLog: vi.fn().mockResolvedValue(undefined),
}));

import { processTicket, runPollCycle } from '../../src/orchestrator';
import type { OrchestratorConfig } from '../../src/orchestrator';
import type { NormalizedTicket, TicketProvider } from '../../src/providers/types';
import type { DaemonConfig } from '../../src/types';
import type { WorkstreamPlan } from '../../src/planner';
import type { ExecutionResult } from '../../src/executor';
import type { TriageResult } from '../../src/triage';
import { appendTriageLog } from '../../src/triage-log';

// Mock child_process.spawnSync for git operations in processTicket
import { spawnSync } from 'child_process';
vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return { ...actual, spawnSync: vi.fn() };
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

  describe('AC: Triage failure posts comment and label', () => {
    it('GIVEN triage returns NEEDS_CLARIFICATION WHEN processTicket called THEN addComment is called', async () => {
      const deps = makeDeps({
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'NEEDS_CLARIFICATION',
          reason: 'Unclear',
          questions: ['What endpoint?'],
        } as TriageResult),
      });
      await processTicket(TICKET, deps);
      expect(deps.provider.addComment).toHaveBeenCalledWith(
        TICKET.id,
        expect.stringContaining('NEEDS_CLARIFICATION')
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
// Triage log integration tests (WS-DAEMON-79)
// ---------------------------------------------------------------------------

describe('processTicket() triage log (WS-DAEMON-79)', () => {
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

  describe('AC: orchestrator Step 0 appends triage result to triage log', () => {
    it('GIVEN triage returns GO WHEN processTicket called THEN appendTriageLog is called with GO entry', async () => {
      const deps = makeDeps();
      await processTicket(TICKET, deps);
      expect(appendTriageLog).toHaveBeenCalledOnce();
      expect(appendTriageLog).toHaveBeenCalledWith(
        expect.objectContaining({
          ticketId: 'PROJ-123',
          outcome: 'GO',
          reason: expect.any(String),
          timestamp: expect.any(String),
        }),
        expect.any(String)
      );
    });

    it('GIVEN triage returns NEEDS_CLARIFICATION WHEN processTicket called THEN appendTriageLog is called before returning', async () => {
      const deps = makeDeps({
        triageTicket: vi.fn().mockResolvedValue({
          outcome: 'NEEDS_CLARIFICATION',
          reason: 'Missing details',
        } as TriageResult),
      });
      await processTicket(TICKET, deps);
      expect(appendTriageLog).toHaveBeenCalledOnce();
      expect(appendTriageLog).toHaveBeenCalledWith(
        expect.objectContaining({
          ticketId: 'PROJ-123',
          outcome: 'NEEDS_CLARIFICATION',
        }),
        expect.any(String)
      );
    });

    it('GIVEN triage returns REJECT WHEN processTicket called THEN appendTriageLog is called with REJECT entry', async () => {
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
        }),
        expect.any(String)
      );
    });

    it('GIVEN triage log append fails WHEN processTicket called THEN pipeline continues (best-effort)', async () => {
      vi.mocked(appendTriageLog).mockRejectedValueOnce(new Error('disk full'));
      const deps = makeDeps();
      const result = await processTicket(TICKET, deps);
      expect(result.success).toBe(true);
    });

    it('GIVEN triage result WHEN appendTriageLog called THEN timestamp is a valid ISO string', async () => {
      const deps = makeDeps();
      await processTicket(TICKET, deps);
      const entry = vi.mocked(appendTriageLog).mock.calls[0][0];
      expect(() => new Date(entry.timestamp).toISOString()).not.toThrow();
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

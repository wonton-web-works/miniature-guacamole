import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildPlanningPrompt, parseWorkstreamPlan, planTicket } from '../../src/planner';
import type { NormalizedTicket } from '../../src/providers/types';
import type { ExecClaudeFn } from '../../src/planner';

const TICKET: NormalizedTicket = {
  id: 'PROJ-123',
  source: 'jira',
  title: 'Add login endpoint',
  description: 'Implement REST API endpoint for user login with OAuth2',
  priority: 'high',
  labels: ['backend', 'api'],
  url: 'https://example.atlassian.net/browse/PROJ-123',
  raw: {},
};

describe('buildPlanningPrompt() (WS-DAEMON-11)', () => {
  describe('AC: Builds structured prompt', () => {
    it('GIVEN a ticket WHEN buildPlanningPrompt called THEN includes ticket id and title', () => {
      const prompt = buildPlanningPrompt(TICKET);
      expect(prompt).toContain('PROJ-123');
      expect(prompt).toContain('Add login endpoint');
    });

    it('GIVEN a ticket WHEN buildPlanningPrompt called THEN includes ticket description', () => {
      const prompt = buildPlanningPrompt(TICKET);
      expect(prompt).toContain('Implement REST API endpoint for user login with OAuth2');
    });

    it('GIVEN a ticket WHEN buildPlanningPrompt called THEN includes WS: and AC: format instructions', () => {
      const prompt = buildPlanningPrompt(TICKET);
      expect(prompt).toContain('WS:');
      expect(prompt).toContain('AC:');
      expect(prompt).toContain('---');
    });

    it('GIVEN a ticket WHEN buildPlanningPrompt called THEN returns a non-empty string', () => {
      const prompt = buildPlanningPrompt(TICKET);
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('GIVEN ticket with special chars in title WHEN buildPlanningPrompt called THEN includes raw title', () => {
      const ticket = { ...TICKET, title: 'Fix: "broken" endpoint & more' };
      const prompt = buildPlanningPrompt(ticket);
      expect(prompt).toContain('Fix: "broken" endpoint & more');
    });
  });
});

describe('parseWorkstreamPlan() (WS-DAEMON-11)', () => {
  describe('AC: Parses WS/AC pairs separated by ---', () => {
    it('GIVEN single WS/AC pair WHEN parseWorkstreamPlan called THEN returns array with one plan', () => {
      const output = `WS: Database schema
AC: Tables created and migrated
---`;
      const result = parseWorkstreamPlan(output);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Database schema');
      expect(result[0].acceptanceCriteria).toBe('Tables created and migrated');
    });

    it('GIVEN two WS/AC pairs WHEN parseWorkstreamPlan called THEN returns array with two plans', () => {
      const output = `WS: Database schema
AC: Tables created and migrated
---
WS: API endpoints
AC: REST endpoints implemented and tested
---`;
      const result = parseWorkstreamPlan(output);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Database schema');
      expect(result[1].name).toBe('API endpoints');
    });

    it('GIVEN three workstreams WHEN parseWorkstreamPlan called THEN returns all three', () => {
      const output = `WS: Alpha
AC: Alpha done
---
WS: Beta
AC: Beta done
---
WS: Gamma
AC: Gamma done
---`;
      const result = parseWorkstreamPlan(output);
      expect(result).toHaveLength(3);
      expect(result[2].name).toBe('Gamma');
    });

    it('GIVEN AC spans multiple lines WHEN parseWorkstreamPlan called THEN captures full AC text', () => {
      const output = `WS: Complex workstream
AC: First criterion. Second criterion.
---`;
      const result = parseWorkstreamPlan(output);
      expect(result[0].acceptanceCriteria).toContain('First criterion');
    });
  });

  describe('AC: Handles edge cases', () => {
    it('GIVEN empty string WHEN parseWorkstreamPlan called THEN returns empty array', () => {
      const result = parseWorkstreamPlan('');
      expect(result).toHaveLength(0);
    });

    it('GIVEN output with no WS: markers WHEN parseWorkstreamPlan called THEN returns empty array', () => {
      const result = parseWorkstreamPlan('Some random text without workstreams');
      expect(result).toHaveLength(0);
    });

    it('GIVEN WS without AC WHEN parseWorkstreamPlan called THEN defaults AC to empty string', () => {
      const output = `WS: Just a name
---`;
      const result = parseWorkstreamPlan(output);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Just a name');
      expect(result[0].acceptanceCriteria).toBe('');
    });

    it('GIVEN extra whitespace around values WHEN parseWorkstreamPlan called THEN trims whitespace', () => {
      const output = `WS:   Lots of whitespace
AC:   Also trimmed
---`;
      const result = parseWorkstreamPlan(output);
      expect(result[0].name).toBe('Lots of whitespace');
      expect(result[0].acceptanceCriteria).toBe('Also trimmed');
    });

    it('GIVEN blank lines between sections WHEN parseWorkstreamPlan called THEN handles gracefully', () => {
      const output = `
WS: First
AC: Done

---

WS: Second
AC: Also done
---

`;
      const result = parseWorkstreamPlan(output);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('AC: Returns correct WorkstreamPlan shape', () => {
    it('GIVEN valid output WHEN parseWorkstreamPlan called THEN each element has name and acceptanceCriteria', () => {
      const output = `WS: My workstream
AC: My criteria
---`;
      const result = parseWorkstreamPlan(output);
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('acceptanceCriteria');
    });
  });
});

describe('planTicket() (WS-DAEMON-11)', () => {
  let mockExecClaude: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExecClaude = vi.fn();
  });

  describe('AC: Invokes execClaude with planning prompt', () => {
    it('GIVEN a ticket WHEN planTicket called THEN calls execClaude with the ticket prompt', async () => {
      mockExecClaude.mockResolvedValue({
        stdout: `WS: Schema\nAC: Done\n---`,
        stderr: '',
        exitCode: 0,
        timedOut: false,
      });

      await planTicket(TICKET, { timeout: 1000, dryRun: false }, mockExecClaude as ExecClaudeFn);

      expect(mockExecClaude).toHaveBeenCalledOnce();
      const [prompt] = mockExecClaude.mock.calls[0];
      expect(prompt).toContain('PROJ-123');
    });

    it('GIVEN timeout option WHEN planTicket called THEN passes timeout to execClaude', async () => {
      mockExecClaude.mockResolvedValue({
        stdout: `WS: Schema\nAC: Done\n---`,
        stderr: '',
        exitCode: 0,
        timedOut: false,
      });

      await planTicket(TICKET, { timeout: 99999, dryRun: false }, mockExecClaude as ExecClaudeFn);

      const [, options] = mockExecClaude.mock.calls[0];
      expect(options).toMatchObject({ timeout: 99999 });
    });
  });

  describe('AC: Returns parsed WorkstreamPlan[]', () => {
    it('GIVEN claude returns valid plan WHEN planTicket called THEN returns parsed workstreams', async () => {
      mockExecClaude.mockResolvedValue({
        stdout: `WS: API layer\nAC: Endpoints pass tests\n---\nWS: DB layer\nAC: Migrations applied\n---`,
        stderr: '',
        exitCode: 0,
        timedOut: false,
      });

      const result = await planTicket(TICKET, { timeout: 1000, dryRun: false }, mockExecClaude as ExecClaudeFn);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('API layer');
      expect(result[1].name).toBe('DB layer');
    });

    it('GIVEN claude returns empty output WHEN planTicket called THEN returns empty array', async () => {
      mockExecClaude.mockResolvedValue({
        stdout: '',
        stderr: '',
        exitCode: 0,
        timedOut: false,
      });

      const result = await planTicket(TICKET, { timeout: 1000, dryRun: false }, mockExecClaude as ExecClaudeFn);

      expect(result).toHaveLength(0);
    });
  });

  describe('AC: dryRun skips nothing in planner (planning always runs)', () => {
    it('GIVEN dryRun=true WHEN planTicket called THEN still calls execClaude (planning is not skipped)', async () => {
      mockExecClaude.mockResolvedValue({
        stdout: `WS: Test\nAC: Done\n---`,
        stderr: '',
        exitCode: 0,
        timedOut: false,
      });

      await planTicket(TICKET, { timeout: 1000, dryRun: true }, mockExecClaude as ExecClaudeFn);

      expect(mockExecClaude).toHaveBeenCalledOnce();
    });
  });
});

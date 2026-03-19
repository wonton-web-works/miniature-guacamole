import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildTriagePrompt,
  parseTriageResult,
  triageTicket,
} from '../../src/triage';
import type {
  TriageConfig,
  TriageResult,
  ExecClaudeFn,
} from '../../src/triage';
import type { NormalizedTicket } from '../../src/providers/types';

const TICKET: NormalizedTicket = {
  id: 'PROJ-42',
  source: 'jira',
  title: 'Add user avatar upload',
  description: 'Allow users to upload profile avatars via the settings page.',
  priority: 'medium',
  labels: ['frontend', 'feature'],
  url: 'https://example.atlassian.net/browse/PROJ-42',
  raw: {},
};

const DEFAULT_CONFIG: TriageConfig = {
  enabled: true,
  autoReject: false,
  maxTicketSizeChars: 10000,
};

function makeClaudeResult(stdout: string) {
  return { stdout, stderr: '', exitCode: 0, timedOut: false };
}

// ---------------------------------------------------------------------------
// buildTriagePrompt
// ---------------------------------------------------------------------------
describe('buildTriagePrompt() (WS-DAEMON-15)', () => {
  describe('AC: Prompt injection protection', () => {
    it('GIVEN a ticket WHEN buildTriagePrompt called THEN wraps content in UNTRUSTED_TICKET_CONTENT tags', () => {
      const prompt = buildTriagePrompt(TICKET);
      expect(prompt).toContain('<UNTRUSTED_TICKET_CONTENT>');
      expect(prompt).toContain('</UNTRUSTED_TICKET_CONTENT>');
    });

    it('GIVEN a ticket WHEN buildTriagePrompt called THEN includes injection protection instructions', () => {
      const prompt = buildTriagePrompt(TICKET);
      expect(prompt).toMatch(/treat.*as data only/i);
      expect(prompt).toMatch(/never.*as instructions/i);
    });
  });

  describe('AC: Triage prompt evaluates scope, clarity, feasibility, size, safety', () => {
    it('GIVEN a ticket WHEN buildTriagePrompt called THEN mentions all 5 evaluation criteria', () => {
      const prompt = buildTriagePrompt(TICKET);
      expect(prompt.toLowerCase()).toContain('scope');
      expect(prompt.toLowerCase()).toContain('clarity');
      expect(prompt.toLowerCase()).toContain('feasibility');
      expect(prompt.toLowerCase()).toContain('size');
      expect(prompt.toLowerCase()).toContain('safety');
    });
  });

  describe('AC: Includes ticket data', () => {
    it('GIVEN a ticket WHEN buildTriagePrompt called THEN includes ticket id', () => {
      const prompt = buildTriagePrompt(TICKET);
      expect(prompt).toContain('PROJ-42');
    });

    it('GIVEN a ticket WHEN buildTriagePrompt called THEN includes title and description', () => {
      const prompt = buildTriagePrompt(TICKET);
      expect(prompt).toContain('Add user avatar upload');
      expect(prompt).toContain('Allow users to upload profile avatars');
    });

    it('GIVEN a ticket WHEN buildTriagePrompt called THEN includes labels', () => {
      const prompt = buildTriagePrompt(TICKET);
      expect(prompt).toContain('frontend');
      expect(prompt).toContain('feature');
    });

    it('GIVEN a ticket WHEN buildTriagePrompt called THEN includes priority', () => {
      const prompt = buildTriagePrompt(TICKET);
      expect(prompt).toContain('medium');
    });
  });

  describe('AC: Specifies expected output format', () => {
    it('GIVEN a ticket WHEN buildTriagePrompt called THEN requests VERDICT, REASONS, and COMMENT', () => {
      const prompt = buildTriagePrompt(TICKET);
      expect(prompt).toContain('VERDICT:');
      expect(prompt).toContain('REASONS:');
      expect(prompt).toContain('COMMENT:');
    });

    it('GIVEN a ticket WHEN buildTriagePrompt called THEN lists valid verdict values', () => {
      const prompt = buildTriagePrompt(TICKET);
      expect(prompt).toContain('GO');
      expect(prompt).toContain('NEEDS_CLARIFICATION');
      expect(prompt).toContain('REJECT');
    });
  });
});

// ---------------------------------------------------------------------------
// parseTriageResult
// ---------------------------------------------------------------------------
describe('parseTriageResult() (WS-DAEMON-15)', () => {
  describe('AC: Parses GO verdict', () => {
    it('GIVEN GO output WHEN parseTriageResult called THEN returns GO verdict', () => {
      const output = `VERDICT: GO
REASONS:
- Ticket is well-scoped to this repo
- Clear requirements provided
COMMENT: Ticket is ready for implementation.`;
      const result = parseTriageResult(output);
      expect(result.verdict).toBe('GO');
    });

    it('GIVEN GO output WHEN parseTriageResult called THEN extracts reasons', () => {
      const output = `VERDICT: GO
REASONS:
- Clear scope
- Feasible implementation
COMMENT: Ready.`;
      const result = parseTriageResult(output);
      expect(result.reasons).toHaveLength(2);
      expect(result.reasons[0]).toBe('Clear scope');
      expect(result.reasons[1]).toBe('Feasible implementation');
    });

    it('GIVEN GO output WHEN parseTriageResult called THEN extracts suggested comment', () => {
      const output = `VERDICT: GO
REASONS:
- OK
COMMENT: Ticket is well-defined and ready for autonomous implementation.`;
      const result = parseTriageResult(output);
      expect(result.suggestedComment).toBe('Ticket is well-defined and ready for autonomous implementation.');
    });
  });

  describe('AC: Parses NEEDS_CLARIFICATION verdict', () => {
    it('GIVEN NEEDS_CLARIFICATION output WHEN parseTriageResult called THEN returns NEEDS_CLARIFICATION verdict', () => {
      const output = `VERDICT: NEEDS_CLARIFICATION
REASONS:
- Description lacks acceptance criteria
- No mention of expected file format for upload
COMMENT: Could you clarify the expected file types and size limits for avatar uploads?`;
      const result = parseTriageResult(output);
      expect(result.verdict).toBe('NEEDS_CLARIFICATION');
      expect(result.reasons).toHaveLength(2);
    });
  });

  describe('AC: Parses REJECT verdict', () => {
    it('GIVEN REJECT output WHEN parseTriageResult called THEN returns REJECT verdict', () => {
      const output = `VERDICT: REJECT
REASONS:
- Requires infrastructure changes beyond code
- Involves third-party service provisioning
COMMENT: This ticket requires provisioning external services which cannot be done autonomously.`;
      const result = parseTriageResult(output);
      expect(result.verdict).toBe('REJECT');
      expect(result.reasons).toHaveLength(2);
      expect(result.suggestedComment).toContain('provisioning external services');
    });
  });

  describe('AC: Handles edge cases', () => {
    it('GIVEN empty output WHEN parseTriageResult called THEN returns NEEDS_CLARIFICATION with fallback reason', () => {
      const result = parseTriageResult('');
      expect(result.verdict).toBe('NEEDS_CLARIFICATION');
      expect(result.reasons).toHaveLength(1);
      expect(result.reasons[0]).toMatch(/parse|triage/i);
    });

    it('GIVEN malformed output WHEN parseTriageResult called THEN returns NEEDS_CLARIFICATION', () => {
      const result = parseTriageResult('Some random text that is not structured');
      expect(result.verdict).toBe('NEEDS_CLARIFICATION');
    });

    it('GIVEN verdict with extra whitespace WHEN parseTriageResult called THEN trims correctly', () => {
      const output = `VERDICT:   GO
REASONS:
- OK
COMMENT: Fine.`;
      const result = parseTriageResult(output);
      expect(result.verdict).toBe('GO');
    });

    it('GIVEN reasons with varied bullet styles WHEN parseTriageResult called THEN extracts all', () => {
      const output = `VERDICT: GO
REASONS:
- First reason
- Second reason
- Third reason
COMMENT: OK`;
      const result = parseTriageResult(output);
      expect(result.reasons).toHaveLength(3);
    });

    it('GIVEN multiline comment WHEN parseTriageResult called THEN captures full comment', () => {
      const output = `VERDICT: NEEDS_CLARIFICATION
REASONS:
- Vague description
COMMENT: Please clarify the following:
1. What file types are accepted?
2. What is the max file size?`;
      const result = parseTriageResult(output);
      expect(result.suggestedComment).toContain('What file types');
      expect(result.suggestedComment).toContain('max file size');
    });

    it('GIVEN output with no COMMENT section WHEN parseTriageResult called THEN defaults suggestedComment to empty string', () => {
      const output = `VERDICT: GO
REASONS:
- OK`;
      const result = parseTriageResult(output);
      expect(result.suggestedComment).toBe('');
    });

    it('GIVEN output with no REASONS section WHEN parseTriageResult called THEN defaults reasons to empty array', () => {
      const output = `VERDICT: GO
COMMENT: Fine.`;
      const result = parseTriageResult(output);
      expect(result.reasons).toHaveLength(0);
    });

    it('GIVEN unknown verdict string WHEN parseTriageResult called THEN returns NEEDS_CLARIFICATION', () => {
      const output = `VERDICT: MAYBE
REASONS:
- Unsure
COMMENT: Not clear.`;
      const result = parseTriageResult(output);
      expect(result.verdict).toBe('NEEDS_CLARIFICATION');
    });
  });
});

// ---------------------------------------------------------------------------
// triageTicket
// ---------------------------------------------------------------------------
describe('triageTicket() (WS-DAEMON-15)', () => {
  let mockExecClaude: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockExecClaude = vi.fn();
  });

  describe('AC: Invokes execClaude with triage prompt', () => {
    it('GIVEN a ticket WHEN triageTicket called THEN calls execClaude with triage prompt containing ticket id', async () => {
      mockExecClaude.mockResolvedValue(makeClaudeResult(`VERDICT: GO
REASONS:
- OK
COMMENT: Ready.`));

      await triageTicket(TICKET, DEFAULT_CONFIG, mockExecClaude as ExecClaudeFn);

      expect(mockExecClaude).toHaveBeenCalledOnce();
      const [prompt] = mockExecClaude.mock.calls[0];
      expect(prompt).toContain('PROJ-42');
      expect(prompt).toContain('<UNTRUSTED_TICKET_CONTENT>');
    });

    it('GIVEN timeout in config WHEN triageTicket called THEN passes timeout to execClaude', async () => {
      mockExecClaude.mockResolvedValue(makeClaudeResult(`VERDICT: GO
REASONS:
- OK
COMMENT: Ready.`));

      await triageTicket(TICKET, DEFAULT_CONFIG, mockExecClaude as ExecClaudeFn, { timeout: 60000 });

      const [, options] = mockExecClaude.mock.calls[0];
      expect(options).toMatchObject({ timeout: 60000 });
    });
  });

  describe('AC: Returns TriageResult with correct shape', () => {
    it('GIVEN claude returns GO WHEN triageTicket called THEN returns GO result', async () => {
      mockExecClaude.mockResolvedValue(makeClaudeResult(`VERDICT: GO
REASONS:
- Well-scoped
- Clear requirements
COMMENT: Ticket is ready for implementation.`));

      const result = await triageTicket(TICKET, DEFAULT_CONFIG, mockExecClaude as ExecClaudeFn);

      expect(result.verdict).toBe('GO');
      expect(result.reasons).toHaveLength(2);
      expect(result.suggestedComment).toContain('ready for implementation');
    });

    it('GIVEN claude returns NEEDS_CLARIFICATION WHEN triageTicket called THEN returns NEEDS_CLARIFICATION result', async () => {
      mockExecClaude.mockResolvedValue(makeClaudeResult(`VERDICT: NEEDS_CLARIFICATION
REASONS:
- Missing acceptance criteria
COMMENT: Please add acceptance criteria.`));

      const result = await triageTicket(TICKET, DEFAULT_CONFIG, mockExecClaude as ExecClaudeFn);

      expect(result.verdict).toBe('NEEDS_CLARIFICATION');
    });

    it('GIVEN claude returns REJECT WHEN triageTicket called THEN returns REJECT result', async () => {
      mockExecClaude.mockResolvedValue(makeClaudeResult(`VERDICT: REJECT
REASONS:
- Out of scope
COMMENT: This ticket is for a different repo.`));

      const result = await triageTicket(TICKET, { ...DEFAULT_CONFIG, autoReject: true }, mockExecClaude as ExecClaudeFn);

      expect(result.verdict).toBe('REJECT');
    });
  });

  describe('AC: autoReject=false downgrades REJECT to NEEDS_CLARIFICATION', () => {
    it('GIVEN autoReject=false and claude returns REJECT WHEN triageTicket called THEN downgrades to NEEDS_CLARIFICATION', async () => {
      mockExecClaude.mockResolvedValue(makeClaudeResult(`VERDICT: REJECT
REASONS:
- Out of scope
COMMENT: This ticket is for a different repo.`));

      const result = await triageTicket(TICKET, { ...DEFAULT_CONFIG, autoReject: false }, mockExecClaude as ExecClaudeFn);

      expect(result.verdict).toBe('NEEDS_CLARIFICATION');
      expect(result.reasons).toContain('Out of scope');
    });

    it('GIVEN autoReject=true and claude returns REJECT WHEN triageTicket called THEN keeps REJECT', async () => {
      mockExecClaude.mockResolvedValue(makeClaudeResult(`VERDICT: REJECT
REASONS:
- Out of scope
COMMENT: This ticket is for a different repo.`));

      const result = await triageTicket(TICKET, { ...DEFAULT_CONFIG, autoReject: true }, mockExecClaude as ExecClaudeFn);

      expect(result.verdict).toBe('REJECT');
    });

    it('GIVEN autoReject=false and claude returns GO WHEN triageTicket called THEN keeps GO (no downgrade)', async () => {
      mockExecClaude.mockResolvedValue(makeClaudeResult(`VERDICT: GO
REASONS:
- OK
COMMENT: Fine.`));

      const result = await triageTicket(TICKET, { ...DEFAULT_CONFIG, autoReject: false }, mockExecClaude as ExecClaudeFn);

      expect(result.verdict).toBe('GO');
    });

    it('GIVEN autoReject=false and claude returns NEEDS_CLARIFICATION WHEN triageTicket called THEN keeps NEEDS_CLARIFICATION', async () => {
      mockExecClaude.mockResolvedValue(makeClaudeResult(`VERDICT: NEEDS_CLARIFICATION
REASONS:
- Vague
COMMENT: Please clarify.`));

      const result = await triageTicket(TICKET, { ...DEFAULT_CONFIG, autoReject: false }, mockExecClaude as ExecClaudeFn);

      expect(result.verdict).toBe('NEEDS_CLARIFICATION');
    });
  });

  describe('AC: Tickets exceeding maxTicketSizeChars are auto-flagged', () => {
    it('GIVEN ticket description exceeds maxTicketSizeChars WHEN triageTicket called THEN returns NEEDS_CLARIFICATION without calling Claude', async () => {
      const longTicket: NormalizedTicket = {
        ...TICKET,
        description: 'x'.repeat(101),
      };

      const result = await triageTicket(longTicket, { ...DEFAULT_CONFIG, maxTicketSizeChars: 100 }, mockExecClaude as ExecClaudeFn);

      expect(mockExecClaude).not.toHaveBeenCalled();
      expect(result.verdict).toBe('NEEDS_CLARIFICATION');
      expect(result.reasons[0]).toMatch(/exceeds.*limit/i);
    });

    it('GIVEN ticket content equals maxTicketSizeChars WHEN triageTicket called THEN proceeds normally', async () => {
      const titleLen = TICKET.title.length;
      const exactTicket: NormalizedTicket = {
        ...TICKET,
        description: 'x'.repeat(100 - titleLen),
      };
      mockExecClaude.mockResolvedValue(makeClaudeResult(`VERDICT: GO
REASONS:
- OK
COMMENT: Fine.`));

      await triageTicket(exactTicket, { ...DEFAULT_CONFIG, maxTicketSizeChars: 100 }, mockExecClaude as ExecClaudeFn);

      expect(mockExecClaude).toHaveBeenCalledOnce();
    });

    it('GIVEN ticket title + description combined exceeds maxTicketSizeChars WHEN triageTicket called THEN auto-flags', async () => {
      const longTicket: NormalizedTicket = {
        ...TICKET,
        title: 'x'.repeat(50),
        description: 'y'.repeat(60),
      };

      const result = await triageTicket(longTicket, { ...DEFAULT_CONFIG, maxTicketSizeChars: 100 }, mockExecClaude as ExecClaudeFn);

      expect(mockExecClaude).not.toHaveBeenCalled();
      expect(result.verdict).toBe('NEEDS_CLARIFICATION');
    });

    it('GIVEN autoReject=true and oversized ticket WHEN triageTicket called THEN returns REJECT', async () => {
      const longTicket: NormalizedTicket = {
        ...TICKET,
        description: 'x'.repeat(200),
      };

      const result = await triageTicket(longTicket, { ...DEFAULT_CONFIG, autoReject: true, maxTicketSizeChars: 100 }, mockExecClaude as ExecClaudeFn);

      expect(result.verdict).toBe('REJECT');
    });
  });

  describe('AC: Handles Claude failures gracefully', () => {
    it('GIVEN execClaude throws WHEN triageTicket called THEN returns NEEDS_CLARIFICATION with error reason', async () => {
      mockExecClaude.mockRejectedValue(new Error('Claude subprocess timed out'));

      const result = await triageTicket(TICKET, DEFAULT_CONFIG, mockExecClaude as ExecClaudeFn);

      expect(result.verdict).toBe('NEEDS_CLARIFICATION');
      expect(result.reasons[0]).toMatch(/timed out|failed|error/i);
    });

    it('GIVEN execClaude throws non-Error value WHEN triageTicket called THEN returns NEEDS_CLARIFICATION with stringified reason', async () => {
      mockExecClaude.mockRejectedValue('string error');

      const result = await triageTicket(TICKET, DEFAULT_CONFIG, mockExecClaude as ExecClaudeFn);

      expect(result.verdict).toBe('NEEDS_CLARIFICATION');
      expect(result.reasons[0]).toContain('string error');
    });

    it('GIVEN execClaude returns non-zero exit code WHEN triageTicket called THEN returns NEEDS_CLARIFICATION', async () => {
      mockExecClaude.mockResolvedValue({
        stdout: '',
        stderr: 'Error: rate limited',
        exitCode: 1,
        timedOut: false,
      });

      const result = await triageTicket(TICKET, DEFAULT_CONFIG, mockExecClaude as ExecClaudeFn);

      expect(result.verdict).toBe('NEEDS_CLARIFICATION');
      expect(result.reasons[0]).toMatch(/failed|error|exit/i);
    });

    it('GIVEN execClaude times out WHEN triageTicket called THEN returns NEEDS_CLARIFICATION', async () => {
      mockExecClaude.mockResolvedValue({
        stdout: '',
        stderr: '',
        exitCode: 0,
        timedOut: true,
      });

      const result = await triageTicket(TICKET, DEFAULT_CONFIG, mockExecClaude as ExecClaudeFn);

      expect(result.verdict).toBe('NEEDS_CLARIFICATION');
      expect(result.reasons[0]).toMatch(/timed out/i);
    });
  });

  describe('AC: TriageResult has correct type shape', () => {
    it('GIVEN valid triage WHEN triageTicket called THEN result has verdict, reasons, and suggestedComment', async () => {
      mockExecClaude.mockResolvedValue(makeClaudeResult(`VERDICT: GO
REASONS:
- OK
COMMENT: Ready.`));

      const result = await triageTicket(TICKET, DEFAULT_CONFIG, mockExecClaude as ExecClaudeFn);

      expect(result).toHaveProperty('verdict');
      expect(result).toHaveProperty('reasons');
      expect(result).toHaveProperty('suggestedComment');
      expect(Array.isArray(result.reasons)).toBe(true);
      expect(typeof result.suggestedComment).toBe('string');
    });
  });
});

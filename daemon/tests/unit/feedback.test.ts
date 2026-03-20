import { describe, it, expect } from 'vitest';
import { formatTriageFeedback, triageLabelFor } from '../../src/feedback';
import type { TriageResult } from '../../src/triage';

// ---------------------------------------------------------------------------
// GH-105: Non-GO feedback comment formatting
// ---------------------------------------------------------------------------

describe('formatTriageFeedback() (GH-105)', () => {
  // -------------------------------------------------------------------
  // Misuse-first: edge cases and invalid inputs
  // -------------------------------------------------------------------

  describe('MISUSE: edge cases', () => {
    it('GIVEN empty reason WHEN formatting THEN comment still contains outcome header', () => {
      const result: TriageResult = { outcome: 'REJECT', reason: '' };
      const body = formatTriageFeedback(result);
      expect(body).toContain('**Triage: REJECT**');
    });

    it('GIVEN questions is empty array WHEN formatting THEN no Questions section appears', () => {
      const result: TriageResult = {
        outcome: 'NEEDS_CLARIFICATION',
        reason: 'Missing details',
        questions: [],
      };
      const body = formatTriageFeedback(result);
      expect(body).not.toContain('**Questions:**');
    });

    it('GIVEN questions is undefined WHEN formatting THEN no Questions section appears', () => {
      const result: TriageResult = {
        outcome: 'NEEDS_CLARIFICATION',
        reason: 'Missing details',
      };
      const body = formatTriageFeedback(result);
      expect(body).not.toContain('**Questions:**');
    });

    it('GIVEN reason contains markdown special chars WHEN formatting THEN they are preserved (not escaped)', () => {
      const result: TriageResult = {
        outcome: 'REJECT',
        reason: 'Ticket references `auth` module & payment <gateway>',
      };
      const body = formatTriageFeedback(result);
      expect(body).toContain('Ticket references `auth` module & payment <gateway>');
    });

    it('GIVEN question contains markdown WHEN formatting THEN it is preserved as-is', () => {
      const result: TriageResult = {
        outcome: 'NEEDS_CLARIFICATION',
        reason: 'Unclear',
        questions: ['What does `foo()` return?'],
      };
      const body = formatTriageFeedback(result);
      expect(body).toContain('- What does `foo()` return?');
    });
  });

  // -------------------------------------------------------------------
  // AC: NEEDS_CLARIFICATION comment body
  // -------------------------------------------------------------------

  describe('AC: NEEDS_CLARIFICATION comment contains outcome, reason, and questions', () => {
    const NEEDS_CLARIFICATION_WITH_QUESTIONS: TriageResult = {
      outcome: 'NEEDS_CLARIFICATION',
      reason: 'Missing acceptance criteria',
      questions: [
        'What should the endpoint return on success?',
        'Should authentication be required?',
      ],
    };

    it('GIVEN NEEDS_CLARIFICATION with questions WHEN formatting THEN body contains triage outcome', () => {
      const body = formatTriageFeedback(NEEDS_CLARIFICATION_WITH_QUESTIONS);
      expect(body).toContain('**Triage: NEEDS_CLARIFICATION**');
    });

    it('GIVEN NEEDS_CLARIFICATION with questions WHEN formatting THEN body contains reason string', () => {
      const body = formatTriageFeedback(NEEDS_CLARIFICATION_WITH_QUESTIONS);
      expect(body).toContain('Missing acceptance criteria');
    });

    it('GIVEN NEEDS_CLARIFICATION with questions WHEN formatting THEN body contains bullet-list of questions', () => {
      const body = formatTriageFeedback(NEEDS_CLARIFICATION_WITH_QUESTIONS);
      expect(body).toContain('- What should the endpoint return on success?');
      expect(body).toContain('- Should authentication be required?');
    });

    it('GIVEN NEEDS_CLARIFICATION with questions WHEN formatting THEN questions appear under Questions header', () => {
      const body = formatTriageFeedback(NEEDS_CLARIFICATION_WITH_QUESTIONS);
      expect(body).toContain('**Questions:**');
      const questionsIndex = body.indexOf('**Questions:**');
      const firstQuestion = body.indexOf('- What should the endpoint return on success?');
      expect(firstQuestion).toBeGreaterThan(questionsIndex);
    });

    it('GIVEN NEEDS_CLARIFICATION without questions WHEN formatting THEN body has outcome and reason only', () => {
      const result: TriageResult = {
        outcome: 'NEEDS_CLARIFICATION',
        reason: 'Vague description',
      };
      const body = formatTriageFeedback(result);
      expect(body).toContain('**Triage: NEEDS_CLARIFICATION**');
      expect(body).toContain('Vague description');
      expect(body).not.toContain('**Questions:**');
    });
  });

  // -------------------------------------------------------------------
  // AC: REJECT comment body
  // -------------------------------------------------------------------

  describe('AC: REJECT comment contains outcome and rejection reason', () => {
    const REJECT_RESULT: TriageResult = {
      outcome: 'REJECT',
      reason: 'Out of scope — ticket describes infrastructure work, not code changes',
    };

    it('GIVEN REJECT WHEN formatting THEN body contains triage outcome', () => {
      const body = formatTriageFeedback(REJECT_RESULT);
      expect(body).toContain('**Triage: REJECT**');
    });

    it('GIVEN REJECT WHEN formatting THEN body contains rejection reason', () => {
      const body = formatTriageFeedback(REJECT_RESULT);
      expect(body).toContain('Out of scope — ticket describes infrastructure work, not code changes');
    });

    it('GIVEN REJECT WHEN formatting THEN body does NOT contain Questions section', () => {
      const body = formatTriageFeedback(REJECT_RESULT);
      expect(body).not.toContain('**Questions:**');
    });
  });

  // -------------------------------------------------------------------
  // AC: comment body is provider-agnostic markdown
  // -------------------------------------------------------------------

  describe('AC: comment body is provider-agnostic markdown', () => {
    it('GIVEN any result WHEN formatting THEN outcome header uses bold markdown', () => {
      const result: TriageResult = { outcome: 'REJECT', reason: 'No' };
      const body = formatTriageFeedback(result);
      expect(body).toMatch(/\*\*Triage: \w+\*\*/);
    });

    it('GIVEN questions WHEN formatting THEN questions header uses bold markdown', () => {
      const result: TriageResult = {
        outcome: 'NEEDS_CLARIFICATION',
        reason: 'Unclear',
        questions: ['What?'],
      };
      const body = formatTriageFeedback(result);
      expect(body).toMatch(/\*\*Questions:\*\*/);
    });

    it('GIVEN questions WHEN formatting THEN each question is a markdown bullet', () => {
      const result: TriageResult = {
        outcome: 'NEEDS_CLARIFICATION',
        reason: 'Unclear',
        questions: ['Q1', 'Q2', 'Q3'],
      };
      const body = formatTriageFeedback(result);
      expect(body).toContain('- Q1\n- Q2\n- Q3');
    });

    it('GIVEN any result WHEN formatting THEN no HTML tags are used', () => {
      const result: TriageResult = {
        outcome: 'NEEDS_CLARIFICATION',
        reason: 'Missing info',
        questions: ['What API?'],
      };
      const body = formatTriageFeedback(result);
      // Should not use <p>, <ul>, <li>, <b>, etc.
      expect(body).not.toMatch(/<(?:p|ul|ol|li|b|strong|em|div|span)\b/i);
    });

    it('GIVEN any result WHEN formatting THEN no Jira/Linear/GitHub-specific markup is used', () => {
      const result: TriageResult = {
        outcome: 'NEEDS_CLARIFICATION',
        reason: 'Unclear',
        questions: ['What?'],
      };
      const body = formatTriageFeedback(result);
      // No Jira wiki markup
      expect(body).not.toMatch(/\{code\}/);
      expect(body).not.toMatch(/h[1-6]\./);
    });
  });

  // -------------------------------------------------------------------
  // Snapshot: full formatted comment
  // -------------------------------------------------------------------

  describe('full comment snapshot', () => {
    it('GIVEN NEEDS_CLARIFICATION with 2 questions WHEN formatting THEN matches expected markdown', () => {
      const result: TriageResult = {
        outcome: 'NEEDS_CLARIFICATION',
        reason: 'Missing acceptance criteria',
        questions: ['What should the response format be?', 'Is auth required?'],
      };
      const body = formatTriageFeedback(result);
      expect(body).toBe(
        '**Triage: NEEDS_CLARIFICATION**\n\n' +
        'Missing acceptance criteria\n\n' +
        '**Questions:**\n' +
        '- What should the response format be?\n' +
        '- Is auth required?'
      );
    });

    it('GIVEN REJECT WHEN formatting THEN matches expected markdown', () => {
      const result: TriageResult = { outcome: 'REJECT', reason: 'Out of scope' };
      const body = formatTriageFeedback(result);
      expect(body).toBe('**Triage: REJECT**\n\nOut of scope');
    });
  });
});

// ---------------------------------------------------------------------------
// triageLabelFor()
// ---------------------------------------------------------------------------

describe('triageLabelFor() (GH-105)', () => {
  it('GIVEN NEEDS_CLARIFICATION WHEN getting label THEN returns mg-daemon:needs-info', () => {
    expect(triageLabelFor('NEEDS_CLARIFICATION')).toBe('mg-daemon:needs-info');
  });

  it('GIVEN REJECT WHEN getting label THEN returns mg-daemon:rejected', () => {
    expect(triageLabelFor('REJECT')).toBe('mg-daemon:rejected');
  });
});

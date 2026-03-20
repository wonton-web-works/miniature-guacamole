// Non-GO triage feedback formatting
// GH-105: Comment writeback for NEEDS_CLARIFICATION and REJECT outcomes

import type { TriageResult, TriageOutcome } from './triage';

/**
 * Format a triage result into a provider-agnostic markdown comment body.
 *
 * Structure:
 *   **Triage: {OUTCOME}**
 *
 *   {reason}
 *
 *   **Questions:**
 *   - question 1
 *   - question 2
 *
 * The Questions section is only included when questions are present and non-empty.
 */
export function formatTriageFeedback(result: TriageResult): string {
  let comment = `**Triage: ${result.outcome}**\n\n${result.reason}`;

  if (result.questions && result.questions.length > 0) {
    comment += '\n\n**Questions:**\n' + result.questions.map(q => `- ${q}`).join('\n');
  }

  return comment;
}

/**
 * Map a non-GO triage outcome to its corresponding label.
 */
export function triageLabelFor(outcome: TriageOutcome): string {
  return outcome === 'REJECT' ? 'mg-daemon:rejected' : 'mg-daemon:needs-info';
}

// ---------------------------------------------------------------------------
// Shared status normalization for both filesystem and Postgres readers.
// Accepts a flat record; callers map their source shape before calling.
// ---------------------------------------------------------------------------

export interface NormalizeInput {
  phase?: string;
  status?: string;
  gate_status?: string;
  /** filesystem field */
  blocked_reason?: string | null;
  /** postgres field (alias of blocked_reason) */
  blocker?: string | null;
}

export function normalizeStatus(input: NormalizeInput): string {
  const { phase, status, gate_status } = input;
  const blocked = input.blocked_reason ?? input.blocker;

  if (blocked) return 'blocked';

  if (
    phase === 'complete' ||
    status === 'complete' ||
    status === 'merged' ||
    status === 'success' ||
    status === 'done'
  ) return 'complete';

  if (phase === 'planning') return 'planning';

  if (gate_status === 'ready_for_leadership') return 'ready_for_review';

  if (
    phase === 'in_progress' ||
    status === 'in_progress' ||
    status === 'active' ||
    phase === 'step_2_implementation' ||
    phase === 'step_1_test_spec' ||
    phase === 'step_3_verification'
  ) return 'in_progress';

  if (status === 'blocked') return 'blocked';

  return 'unknown';
}

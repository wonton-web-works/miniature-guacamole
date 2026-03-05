import { Client } from 'pg';
import type { WorkstreamSummary, WorkstreamDetail, WorkstreamCounts, WorkstreamStatus } from '../types';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function normalizeStatus(row: Record<string, unknown>): WorkstreamStatus {
  const data = (row.data as Record<string, unknown> | null) ?? {};
  const phase = (row.phase as string | undefined) ?? (data.phase as string | undefined);
  const status = data.status as string | undefined;
  const blocker = row.blocker as string | null | undefined;

  // Priority 1: blocker presence
  if (blocker) {
    return 'blocked';
  }

  // Priority 2: complete variants
  if (
    phase === 'complete' ||
    status === 'complete' ||
    status === 'merged' ||
    status === 'success' ||
    status === 'done'
  ) {
    return 'complete';
  }

  // Priority 3: planning
  if (phase === 'planning') {
    return 'planning';
  }

  // Priority 4: ready_for_review
  if (row.gate_status === 'ready_for_leadership') {
    return 'ready_for_review';
  }

  // Priority 5: in_progress variants
  if (
    phase === 'in_progress' ||
    status === 'in_progress' ||
    status === 'active' ||
    phase === 'step_2_implementation' ||
    phase === 'step_1_test_spec' ||
    phase === 'step_3_verification'
  ) {
    return 'in_progress';
  }

  // Priority 6: explicit blocked status
  if (status === 'blocked') {
    return 'blocked';
  }

  return 'unknown';
}

function rowToSummary(row: Record<string, unknown>): WorkstreamSummary | null {
  const workstreamId = row.workstream_id as string | undefined;
  const name = row.name as string | undefined;

  // Both workstream_id and name are required
  if (!workstreamId || !name) {
    return null;
  }

  const data = (row.data as Record<string, unknown> | null) ?? {};

  return {
    workstream_id: workstreamId,
    name,
    status: normalizeStatus(row),
    phase: (row.phase as string) || 'unknown',
    agent_id: (row.agent_id as string) || 'unknown',
    timestamp: (data.timestamp as string) || (row.created_at as string) || new Date().toISOString(),
    created_at: (data.created_at as string) || (row.created_at as string) || new Date().toISOString().split('T')[0],
    delegated_to: data.delegated_to as string | undefined,
    gate_status: row.gate_status as string | undefined,
    blocked_reason: (row.blocker as string | null | undefined) ?? null,
  };
}

function rowToDetail(row: Record<string, unknown>): WorkstreamDetail | null {
  const summary = rowToSummary(row);
  if (!summary) {
    return null;
  }

  const data = (row.data as Record<string, unknown> | null) ?? {};

  return {
    ...summary,
    description: data.description as string | undefined,
    acceptance_criteria: data.acceptance_criteria as string[] | undefined,
    dependencies: data.dependencies as string[] | undefined,
    tdd_cycle: data.tdd_cycle as Record<string, any> | undefined,
    notes: data.notes as string[] | undefined,
  };
}

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

export async function getAllWorkstreamsFromPostgres(
  connectionString?: string
): Promise<WorkstreamSummary[]> {
  const connStr = connectionString ?? process.env.MG_POSTGRES_URL ?? '';
  const client = new Client({ connectionString: connStr });

  try {
    await client.connect();
    const result = await client.query(
      'SELECT workstream_id, name, phase, gate_status, blocker, agent_id, data, synced_at, created_at, updated_at FROM workstreams ORDER BY created_at DESC'
    );

    const workstreams: WorkstreamSummary[] = [];
    for (const row of result.rows) {
      const summary = rowToSummary(row);
      if (summary) {
        workstreams.push(summary);
      }
    }

    return workstreams;
  } finally {
    await client.end().catch((endErr) => {
      console.error('[postgres-reader] client.end() failed:', endErr);
    });
  }
}

export async function getWorkstreamByIdFromPostgres(
  id: string,
  connectionString?: string
): Promise<WorkstreamDetail | null> {
  const connStr = connectionString ?? process.env.MG_POSTGRES_URL ?? '';
  const client = new Client({ connectionString: connStr });

  try {
    await client.connect();
    const result = await client.query(
      'SELECT workstream_id, name, phase, gate_status, blocker, agent_id, data, synced_at, created_at, updated_at FROM workstreams WHERE workstream_id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return rowToDetail(result.rows[0]);
  } finally {
    await client.end().catch((endErr) => {
      console.error('[postgres-reader] client.end() failed:', endErr);
    });
  }
}

function normalizeStatusFromRow(row: { phase: string | null; gate_status: string | null; blocker: string | null }): WorkstreamStatus {
  return normalizeStatus({
    phase: row.phase ?? undefined,
    gate_status: row.gate_status ?? undefined,
    blocker: row.blocker ?? undefined,
  });
}

export async function getWorkstreamCountsFromPostgres(
  connectionString: string = process.env.MG_POSTGRES_URL ?? ''
): Promise<WorkstreamCounts> {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const result = await client.query<{ phase: string | null; gate_status: string | null; blocker: string | null; count: string }>(
      `SELECT phase, gate_status, blocker, COUNT(*)::text AS count FROM workstreams GROUP BY phase, gate_status, blocker`
    );

    const counts: WorkstreamCounts = {
      total: 0,
      planning: 0,
      in_progress: 0,
      ready_for_review: 0,
      blocked: 0,
      complete: 0,
      unknown: 0,
    };

    for (const row of result.rows) {
      const n = row.count !== undefined ? parseInt(row.count, 10) : 1;
      counts.total += n;
      const status = normalizeStatusFromRow(row);
      counts[status] = (counts[status] ?? 0) + n;
    }

    return counts;
  } finally {
    await client.end().catch((endErr) => {
      console.error('[postgres-reader] client.end() failed:', endErr);
    });
  }
}

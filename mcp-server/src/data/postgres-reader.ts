import { Client } from 'pg';
import type { WorkstreamSummary, WorkstreamDetail, WorkstreamCounts } from '../types.js';
import { getMemoryPath } from '../config.js';
import { normalizeStatus } from './normalize.js';

// ---------------------------------------------------------------------------
// Postgres reader — adapted from dashboard/src/lib/data/postgres-reader.ts
// Returns MCP-shaped WorkstreamCounts (by_status/by_phase) not dashboard flat shape
// ---------------------------------------------------------------------------

function rowToSummary(row: Record<string, unknown>): WorkstreamSummary | null {
  const workstream_id = row.workstream_id as string | undefined;
  const name = row.name as string | undefined;
  if (!workstream_id || !name) return null;

  const data = (row.data as Record<string, unknown> | null) ?? {};
  return {
    workstream_id,
    name,
    status: normalizeStatus({
      phase: (row.phase as string | undefined) ?? (data.phase as string | undefined),
      status: data.status as string | undefined,
      gate_status: row.gate_status as string | undefined,
      blocker: row.blocker as string | null | undefined,
    }),
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
  if (!summary) return null;

  const data = (row.data as Record<string, unknown> | null) ?? {};

  return {
    ...summary,
    description: data.description as string | undefined,
    acceptance_criteria: data.acceptance_criteria as string[] | undefined,
    dependencies: data.dependencies as string[] | undefined,
  };
}

const SELECT_COLS =
  'SELECT workstream_id, name, phase, gate_status, blocker, agent_id, data, created_at FROM workstreams';

export async function getAllWorkstreams(
  _memoryPath: string = getMemoryPath(),
  connectionString: string = process.env.MG_POSTGRES_URL ?? ''
): Promise<WorkstreamSummary[]> {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const result = await client.query(`${SELECT_COLS} ORDER BY created_at DESC`);
    const workstreams: WorkstreamSummary[] = [];
    for (const row of result.rows) {
      const summary = rowToSummary(row as Record<string, unknown>);
      if (summary) workstreams.push(summary);
    }
    return workstreams;
  } finally {
    await client.end().catch(() => {});
  }
}

export async function getWorkstreamById(
  id: string,
  _memoryPath: string = getMemoryPath(),
  connectionString: string = process.env.MG_POSTGRES_URL ?? ''
): Promise<WorkstreamDetail | null> {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const result = await client.query(
      `${SELECT_COLS} WHERE workstream_id = $1`,
      [id]
    );
    if (result.rows.length === 0) return null;
    return rowToDetail(result.rows[0] as Record<string, unknown>);
  } finally {
    await client.end().catch(() => {});
  }
}

export async function getWorkstreamCounts(
  _memoryPath: string = getMemoryPath(),
  connectionString: string = process.env.MG_POSTGRES_URL ?? ''
): Promise<WorkstreamCounts> {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const result = await client.query<{
      phase: string | null;
      gate_status: string | null;
      blocker: string | null;
      count: string;
    }>(
      'SELECT phase, gate_status, blocker, COUNT(*)::text AS count FROM workstreams GROUP BY phase, gate_status, blocker'
    );

    let total = 0;
    const by_status: Record<string, number> = {};
    const by_phase: Record<string, number> = {};

    for (const row of result.rows) {
      const n = parseInt(row.count, 10);
      total += n;
      const status = normalizeStatus({
        phase: row.phase ?? undefined,
        gate_status: row.gate_status ?? undefined,
        blocker: row.blocker ?? undefined,
      });
      by_status[status] = (by_status[status] ?? 0) + n;
      if (row.phase) {
        by_phase[row.phase] = (by_phase[row.phase] ?? 0) + n;
      }
    }

    return { total, by_status, by_phase };
  } finally {
    await client.end().catch(() => {});
  }
}

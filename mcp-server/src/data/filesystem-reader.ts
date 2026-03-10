import { join } from 'node:path';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import type { WorkstreamSummary, WorkstreamDetail, WorkstreamCounts, MemoryEntry, AgentEvent } from '../types.js';
import { getMemoryPath } from '../config.js';
import { normalizeStatus } from './normalize.js';

// ---------------------------------------------------------------------------
// Filesystem reader — reads .claude/memory/*.json files
// Adapted from dashboard/src/lib/data/workstream-reader.ts filesystem path
// ---------------------------------------------------------------------------

function readJsonFile(filePath: string): Record<string, unknown> | null {
  try {
    if (!existsSync(filePath)) return null;
    const content = readFileSync(filePath, 'utf-8');
    if (!content || content.trim() === '') return null;
    const parsed = JSON.parse(content);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function listJsonFiles(dirPath: string): string[] {
  try {
    if (!existsSync(dirPath)) return [];
    return readdirSync(dirPath).filter((f) => f.endsWith('.json'));
  } catch {
    return [];
  }
}

function isValidWorkstream(data: unknown): data is Record<string, unknown> {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return typeof obj.workstream_id === 'string' && typeof obj.name === 'string';
}

function buildSummary(data: Record<string, unknown>): WorkstreamSummary {
  return {
    workstream_id: data.workstream_id as string,
    name: data.name as string,
    status: normalizeStatus({
      phase: data.phase as string | undefined,
      status: data.status as string | undefined,
      gate_status: data.gate_status as string | undefined,
      blocked_reason: data.blocked_reason as string | null | undefined,
    }),
    phase: (data.phase as string) || 'unknown',
    agent_id: (data.agent_id as string) || 'unknown',
    timestamp: (data.timestamp as string) || new Date().toISOString(),
    created_at: (data.created_at as string) || new Date().toISOString().split('T')[0],
    delegated_to: data.delegated_to as string | undefined,
    gate_status: data.gate_status as string | undefined,
    blocked_reason: data.blocked_reason as string | null | undefined,
  };
}

function buildDetail(data: Record<string, unknown>): WorkstreamDetail {
  return {
    ...data,
    ...buildSummary(data),
    description: data.description as string | undefined,
    acceptance_criteria: data.acceptance_criteria as string[] | undefined,
    dependencies: data.dependencies as string[] | undefined,
  };
}

// ---------------------------------------------------------------------------
// Exported functions (match DataReader interface shape)
// ---------------------------------------------------------------------------

export async function getAllWorkstreams(
  memoryPath: string = getMemoryPath()
): Promise<WorkstreamSummary[]> {
  const files = listJsonFiles(memoryPath);
  const workstreams: WorkstreamSummary[] = [];

  for (const file of files) {
    if (!file.startsWith('workstream-') && !file.startsWith('ws-')) continue;

    const data = readJsonFile(join(memoryPath, file));
    if (!isValidWorkstream(data)) continue;

    workstreams.push(buildSummary(data));
  }

  return workstreams;
}

export async function getWorkstreamById(
  id: string,
  memoryPath: string = getMemoryPath()
): Promise<WorkstreamDetail | null> {
  // Try common file patterns first
  const patterns = [
    `workstream-${id}-state.json`,
    `${id}-state.json`,
    `${id}.json`,
    `workstream-${id}.json`,
  ];

  for (const pattern of patterns) {
    const data = readJsonFile(join(memoryPath, pattern));
    if (isValidWorkstream(data) && data.workstream_id === id) {
      return buildDetail(data);
    }
  }

  // Scan workstream files as fallback
  const files = listJsonFiles(memoryPath);
  for (const file of files) {
    if (!file.startsWith('workstream-') && !file.startsWith('ws-')) continue;
    const data = readJsonFile(join(memoryPath, file));
    if (isValidWorkstream(data) && data.workstream_id === id) {
      return buildDetail(data);
    }
  }

  return null;
}

export async function getWorkstreamCounts(
  memoryPath: string = getMemoryPath()
): Promise<WorkstreamCounts> {
  const workstreams = await getAllWorkstreams(memoryPath);

  const by_status: Record<string, number> = {};
  const by_phase: Record<string, number> = {};

  for (const ws of workstreams) {
    by_status[ws.status] = (by_status[ws.status] ?? 0) + 1;
    by_phase[ws.phase] = (by_phase[ws.phase] ?? 0) + 1;
  }

  return { total: workstreams.length, by_status, by_phase };
}

// ---------------------------------------------------------------------------
// Memory entry readers (WS-MCP-0B)
// ---------------------------------------------------------------------------

export async function getAllMemoryEntries(
  memoryPath: string = getMemoryPath(),
  workstreamId?: string
): Promise<Pick<MemoryEntry, 'key' | 'agent_id' | 'workstream_id' | 'timestamp'>[]> {
  const files = listJsonFiles(memoryPath);
  const entries: Pick<MemoryEntry, 'key' | 'agent_id' | 'workstream_id' | 'timestamp'>[] = [];

  for (const file of files) {
    const key = file.replace(/\.json$/, '');
    const data = readJsonFile(join(memoryPath, file));
    const agent_id = (data?.agent_id as string) || (data?.from as string) || 'unknown';
    const workstream_id = (data?.workstream_id as string) || 'unknown';
    const timestamp = (data?.timestamp as string) || new Date().toISOString();

    if (workstreamId && workstream_id !== workstreamId) continue;

    entries.push({ key, agent_id, workstream_id, timestamp });
  }

  return entries;
}

export async function getMemoryEntry(
  key: string,
  memoryPath: string = getMemoryPath()
): Promise<MemoryEntry | null> {
  const filePath = join(memoryPath, `${key}.json`);
  if (!existsSync(filePath)) return null;

  try {
    const content = readFileSync(filePath, 'utf-8');
    const data: unknown = JSON.parse(content);
    const obj = data as Record<string, unknown> | null;
    return {
      key,
      agent_id: (obj?.agent_id as string) || (obj?.from as string) || 'unknown',
      workstream_id: (obj?.workstream_id as string) || 'unknown',
      timestamp: (obj?.timestamp as string) || new Date().toISOString(),
      data,
    };
  } catch {
    return null;
  }
}

// Events are Postgres-only; filesystem always returns empty array.
export async function getAgentEvents(): Promise<AgentEvent[]> {
  return [];
}

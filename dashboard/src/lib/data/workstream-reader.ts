import { join } from 'node:path';
import { readJsonFile, listJsonFiles } from './memory-reader';
import { DEFAULT_MEMORY_PATH } from '../constants';
import type {
  WorkstreamSummary,
  WorkstreamDetail,
  WorkstreamCounts,
  WorkstreamStatus,
} from '../types';

function normalizeStatus(raw: Record<string, unknown>): WorkstreamStatus {
  const phase = raw.phase as string | undefined;
  const status = raw.status as string | undefined;
  const blockedReason = raw.blocked_reason as string | null | undefined;

  // Priority 1: blocked_reason presence
  if (blockedReason) {
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
  if (raw.gate_status === 'ready_for_leadership') {
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

function isValidWorkstream(data: unknown): data is Record<string, unknown> {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const obj = data as Record<string, unknown>;
  return typeof obj.workstream_id === 'string' && typeof obj.name === 'string';
}

export function getAllWorkstreams(
  memoryPath: string = DEFAULT_MEMORY_PATH
): WorkstreamSummary[] {
  const files = listJsonFiles(memoryPath);
  const workstreams: WorkstreamSummary[] = [];

  for (const file of files) {
    // Only process files that look like workstream state files
    if (!file.startsWith('workstream-') && !file.startsWith('ws-')) {
      continue;
    }

    const filePath = join(memoryPath, file);
    const data = readJsonFile(filePath);

    if (!isValidWorkstream(data)) {
      continue;
    }

    const summary: WorkstreamSummary = {
      workstream_id: data.workstream_id as string,
      name: data.name as string,
      status: normalizeStatus(data),
      phase: (data.phase as string) || 'unknown',
      agent_id: (data.agent_id as string) || 'unknown',
      timestamp: (data.timestamp as string) || new Date().toISOString(),
      created_at: (data.created_at as string) || new Date().toISOString().split('T')[0],
      delegated_to: data.delegated_to as string | undefined,
      gate_status: data.gate_status as string | undefined,
      blocked_reason: data.blocked_reason as string | null | undefined,
    };

    workstreams.push(summary);
  }

  return workstreams;
}

export function getWorkstreamById(
  id: string,
  memoryPath: string = DEFAULT_MEMORY_PATH
): WorkstreamDetail | null {
  // Try common file patterns first
  const patterns = [
    `workstream-${id}-state.json`,
    `${id}-state.json`,
    `${id}.json`,
    `workstream-${id}.json`,
  ];

  for (const pattern of patterns) {
    const filePath = join(memoryPath, pattern);
    const data = readJsonFile(filePath);

    if (isValidWorkstream(data) && data.workstream_id === id) {
      const detail: WorkstreamDetail = {
        ...data,
        workstream_id: data.workstream_id as string,
        name: data.name as string,
        status: normalizeStatus(data),
        phase: (data.phase as string) || 'unknown',
        agent_id: (data.agent_id as string) || 'unknown',
        timestamp: (data.timestamp as string) || new Date().toISOString(),
        created_at: (data.created_at as string) || new Date().toISOString().split('T')[0],
        delegated_to: data.delegated_to as string | undefined,
        gate_status: data.gate_status as string | undefined,
        blocked_reason: data.blocked_reason as string | null | undefined,
        description: data.description as string | undefined,
        acceptance_criteria: data.acceptance_criteria as string[] | undefined,
        dependencies: data.dependencies as string[] | undefined,
        tdd_cycle: data.tdd_cycle as any,
        notes: data.notes as string[] | undefined,
      };

      return detail;
    }
  }

  // Fall back to scanning all files
  const files = listJsonFiles(memoryPath);

  for (const file of files) {
    const filePath = join(memoryPath, file);
    const data = readJsonFile(filePath);

    if (!isValidWorkstream(data)) {
      continue;
    }

    if (data.workstream_id === id) {
      const detail: WorkstreamDetail = {
        ...data,
        workstream_id: data.workstream_id as string,
        name: data.name as string,
        status: normalizeStatus(data),
        phase: (data.phase as string) || 'unknown',
        agent_id: (data.agent_id as string) || 'unknown',
        timestamp: (data.timestamp as string) || new Date().toISOString(),
        created_at: (data.created_at as string) || new Date().toISOString().split('T')[0],
        delegated_to: data.delegated_to as string | undefined,
        gate_status: data.gate_status as string | undefined,
        blocked_reason: data.blocked_reason as string | null | undefined,
        description: data.description as string | undefined,
        acceptance_criteria: data.acceptance_criteria as string[] | undefined,
        dependencies: data.dependencies as string[] | undefined,
        tdd_cycle: data.tdd_cycle as any,
        notes: data.notes as string[] | undefined,
      };

      return detail;
    }
  }

  return null;
}

export function getWorkstreamCounts(
  memoryPath: string = DEFAULT_MEMORY_PATH
): WorkstreamCounts {
  const workstreams = getAllWorkstreams(memoryPath);

  const counts: WorkstreamCounts = {
    total: workstreams.length,
    planning: 0,
    in_progress: 0,
    ready_for_review: 0,
    blocked: 0,
    complete: 0,
    unknown: 0,
  };

  for (const ws of workstreams) {
    counts[ws.status]++;
  }

  return counts;
}

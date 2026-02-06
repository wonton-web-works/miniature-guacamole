import { join } from 'node:path';
import { readJsonFile, listJsonFiles } from './memory-reader';
import { DEFAULT_MEMORY_PATH } from '../constants';
import type { Activity, AgentHierarchy } from '../types';

interface ActivityOptions {
  limit?: number;
  offset?: number;
  agentId?: string;
  workstreamId?: string;
}

const AGENT_HIERARCHY_MAP: Record<string, AgentHierarchy> = {
  ceo: 'leadership',
  cto: 'leadership',
  'product-manager': 'product',
  'product-owner': 'product',
  'product-team': 'product',
  'engineering-manager': 'engineering',
  'staff-engineer': 'engineering',
  dev: 'engineering',
  qa: 'engineering',
  'technical-writer': 'operations',
  designer: 'operations',
  'art-director': 'operations',
};

function getAgentHierarchy(agentId: string): AgentHierarchy {
  return AGENT_HIERARCHY_MAP[agentId] || 'unknown';
}

function deriveActivityType(data: Record<string, unknown>): string {
  if (data.phase && data.phase !== (data as any).previous_phase) {
    return 'phase_changed';
  }
  if (data.status && data.status !== (data as any).previous_status) {
    return 'status_changed';
  }
  if (data.agent_id && data.agent_id !== (data as any).previous_agent_id) {
    return 'agent_assigned';
  }
  if (data.gate_status) {
    return 'gate_passed';
  }
  if (data.blocked_reason) {
    return 'blocked';
  }
  if (data.status === 'complete' || data.phase === 'complete') {
    return 'completed';
  }
  if (data.created_at === data.timestamp?.toString().split('T')[0]) {
    return 'workstream_created';
  }
  return 'workstream_updated';
}

function deriveDescription(data: Record<string, unknown>): string {
  const name = data.name || data.workstream_id || 'activity';
  const agentId = data.agent_id || 'agent';

  if (data.blocked_reason) {
    return `${agentId} blocked ${name}: ${data.blocked_reason}`;
  }
  if (data.status === 'complete' || data.phase === 'complete') {
    return `${agentId} completed ${name}`;
  }
  if (data.gate_status) {
    return `${agentId} passed gate: ${data.gate_status}`;
  }

  return `${agentId} updated ${name}`;
}

export function getActivities(
  memoryPath: string = DEFAULT_MEMORY_PATH,
  options: ActivityOptions = {}
): Activity[] {
  const { limit, offset = 0, agentId, workstreamId } = options;

  const files = listJsonFiles(memoryPath);
  const activities: Activity[] = [];

  for (const file of files) {
    const filePath = join(memoryPath, file);
    const data = readJsonFile(filePath);

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      continue;
    }

    const record = data as Record<string, unknown>;

    // Activities must have agent_id, timestamp, and workstream_id
    if (!record.agent_id || !record.timestamp) {
      continue;
    }

    const activity: Activity = {
      id: `${record.workstream_id || file}-${record.timestamp}`,
      timestamp: record.timestamp as string,
      type: deriveActivityType(record) as any,
      agent_id: record.agent_id as string,
      agent_hierarchy: getAgentHierarchy(record.agent_id as string),
      workstream_id: (record.workstream_id as string) || 'unknown',
      workstream_name: (record.name as string) || 'Unknown',
      description: deriveDescription(record),
      metadata: record,
    };

    activities.push(activity);
  }

  // Sort reverse-chronologically
  activities.sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  // Apply filters
  let filtered = activities;

  if (agentId) {
    filtered = filtered.filter(a => a.agent_id === agentId);
  }

  if (workstreamId) {
    filtered = filtered.filter(a => a.workstream_id === workstreamId);
  }

  // Apply pagination
  const normalizedOffset = Math.max(0, offset);
  const start = normalizedOffset;
  const end = limit !== undefined ? start + limit : undefined;

  return filtered.slice(start, end);
}

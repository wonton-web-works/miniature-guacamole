export type ActivityType =
  | 'workstream_created'
  | 'workstream_updated'
  | 'phase_changed'
  | 'status_changed'
  | 'agent_assigned'
  | 'gate_passed'
  | 'blocked'
  | 'unblocked'
  | 'completed';

export type AgentHierarchy =
  | 'leadership'
  | 'product'
  | 'engineering'
  | 'operations'
  | 'unknown';

export interface Activity {
  id: string;
  timestamp: string;
  type: ActivityType;
  agent_id: string;
  agent_hierarchy: AgentHierarchy;
  workstream_id: string;
  workstream_name: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface ActivityFeed {
  activities: Activity[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

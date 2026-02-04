export type AgentStatus = 'success' | 'failure' | 'partial' | 'escalate';

export interface AgentMetrics {
  tests_passed?: number;
  tests_failed?: number;
  coverage?: number;
  files_changed?: number;
  lines_added?: number;
  lines_removed?: number;
  duration_ms?: number;
}

export interface AgentResult {
  summary: string;
  deliverables?: string[];
  next_steps?: string[];
}

export interface EscalationInfo {
  reason: string;
  required_from: string;
  blocker?: string;
}

export interface AgentReturn {
  status: AgentStatus;
  agent_id: string;
  workstream_id?: string;
  timestamp: string;
  metrics?: AgentMetrics;
  result?: AgentResult;
  escalation?: EscalationInfo;
}

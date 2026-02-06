export type WorkstreamStatus =
  | 'planning'
  | 'in_progress'
  | 'ready_for_review'
  | 'blocked'
  | 'complete'
  | 'unknown';

export interface StepStatus {
  status: 'pending' | 'in_progress' | 'complete' | 'blocked';
  assigned_to: string;
  started?: string;
  completed?: string;
  [key: string]: unknown;
}

export interface WorkstreamSummary {
  workstream_id: string;
  name: string;
  status: WorkstreamStatus;
  phase: string;
  agent_id: string;
  timestamp: string;
  created_at: string;
  delegated_to?: string;
  gate_status?: string;
  blocked_reason?: string | null;
}

export interface WorkstreamDetail extends WorkstreamSummary {
  description?: string;
  acceptance_criteria?: string[];
  dependencies?: string[];
  tdd_cycle?: Record<string, StepStatus>;
  notes?: string[];
  [key: string]: unknown;
}

export interface WorkstreamCounts {
  total: number;
  planning: number;
  in_progress: number;
  ready_for_review: number;
  blocked: number;
  complete: number;
  unknown: number;
}

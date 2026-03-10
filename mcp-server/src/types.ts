// ---------------------------------------------------------------------------
// MCP Server types — workstream shapes used by resource handlers and data layer
// ---------------------------------------------------------------------------

export type WorkstreamStatus =
  | 'planning'
  | 'in_progress'
  | 'ready_for_review'
  | 'blocked'
  | 'complete'
  | 'unknown';

export interface WorkstreamSummary {
  workstream_id: string;
  name: string;
  status: string;
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
  [key: string]: unknown;
}

// MCP-specific counts shape: { total, by_status, by_phase }
// Differs from dashboard's flat shape (planning/in_progress/etc.)
export interface WorkstreamCounts {
  total: number;
  by_status: Record<string, number>;
  by_phase: Record<string, number>;
}

// Data reader interface — both filesystem and postgres readers implement this
export interface DataReader {
  getAllWorkstreams(memoryPath?: string): Promise<WorkstreamSummary[]>;
  getWorkstreamById(id: string, memoryPath?: string): Promise<WorkstreamDetail | null>;
  getWorkstreamCounts(memoryPath?: string): Promise<WorkstreamCounts>;
}

export type QuestionPriority = 'low' | 'medium' | 'high' | 'critical';
export type QuestionStatus = 'open' | 'answered' | 'dismissed';

export interface AgentQuestion {
  id: string;
  timestamp: string;
  agent_id: string;
  workstream_id: string;
  question: string;
  context?: string;
  priority: QuestionPriority;
  status: QuestionStatus;
  answered_at?: string;
  answer?: string;
}

export interface QuestionsSummary {
  questions: AgentQuestion[];
  total: number;
  byStatus: {
    open: number;
    answered: number;
    dismissed: number;
  };
  byPriority: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

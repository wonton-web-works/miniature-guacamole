// Provider abstraction types for ticket sources
// WS-DAEMON-10: Ticket Provider Abstraction Layer

export type TicketSource = 'jira' | 'linear' | 'github';

export type TicketStatus = 'todo' | 'in_progress' | 'in_review' | 'done';

export interface NormalizedTicket {
  id: string;           // PROJ-123, GH-45, LIN-abc
  source: TicketSource;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  labels: string[];
  url: string;
  raw: unknown;
}

export interface SubtaskInput {
  title: string;
  description: string;
  parentId: string;
}

export interface TicketProvider {
  poll(since?: Date): Promise<NormalizedTicket[]>;
  createSubtask(parent: string, task: SubtaskInput): Promise<string>;
  transitionStatus(ticketId: string, status: TicketStatus): Promise<void>;
  addComment(ticketId: string, body: string): Promise<void>;
  linkPR(ticketId: string, prUrl: string): Promise<void>;
}

// Barrel export for provider abstractions
// WS-DAEMON-10: Ticket Provider Abstraction Layer

export type {
  TicketSource,
  TicketStatus,
  NormalizedTicket,
  SubtaskInput,
  TicketProvider,
} from './types';

export { JiraProvider } from './jira';
export { LinearProvider } from './linear';
export { GitHubProvider } from './github';
export { createProvider } from './factory';

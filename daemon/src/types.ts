// Type definitions for miniature-guacamole daemon
// AC-1.7: Config schema exported as TypeScript type DaemonConfig with no `any` types
// AC-1.8: All types exported from daemon/src/types.ts

export interface JiraConfig {
  host: string;
  apiToken: string;
  project: string;
  jql: string;
}

export interface GitHubConfig {
  repo: string;
  token: string;
  baseBranch: string;
}

export interface PollingConfig {
  intervalSeconds: number;
  batchSize: number;
}

export interface DaemonConfig {
  jira: JiraConfig;
  github: GitHubConfig;
  polling: PollingConfig;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ProcessedTicket {
  ticketId: string;
  status: 'pending' | 'processed' | 'failed';
  processedAt: Date;
  prUrl?: string;
}

export interface DaemonState {
  lastPollTimestamp: Date | null;
  processedTickets: ProcessedTicket[];
}

export interface TicketData {
  id: string;
  summary: string;
  description: string;
  acceptanceCriteria: string[];
}

// Process Manager types (WS-DAEMON-2)
export interface StartResult {
  pid: number;
  startedAt: Date;
}

export interface StatusResult {
  running: boolean;
  pid?: number;
  uptimeMs?: number;
}

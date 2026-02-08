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

// WS-DAEMON-4: Tracker types
export interface ProcessedTicket {
  processedAt: string;
  status: 'processing' | 'complete' | 'failed';
  prUrl?: string;
  error?: string;
}

export interface DaemonState {
  lastPollTimestamp: Date | null;
  processedTickets: ProcessedTicket[];
}

// WS-DAEMON-4: Jira ticket data
export interface TicketData {
  key: string;
  summary: string;
  description: string;
  priority: string;
  labels: string[];
  url: string;
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

// Type definitions for miniature-guacamole daemon
// AC-1.7: Config schema exported as TypeScript type DaemonConfig with no `any` types
// AC-1.8: All types exported from daemon/src/types.ts

import type { ClaudeResult } from './claude';

export type ExecClaudeFn = (
  prompt: string,
  options: { timeout?: number; cwd?: string }
) => Promise<ClaudeResult>;

export interface JiraConfig {
  host: string;
  email: string;
  apiToken: string;
  project: string;
  jql: string;
}

export interface LinearConfig {
  apiKey: string;
  teamId: string;
  projectId?: string;
  filter: string;
}

export interface GitHubConfig {
  repo: string;
  baseBranch: string;
  issueFilter?: string;
  account?: string; // gh auth username for multi-org (GH-14)
}

export interface PollingConfig {
  intervalSeconds: number;
  batchSize: number;
}

export interface OrchestrationConfig {
  claudeTimeout: number;
  concurrency: number;
  delayBetweenTicketsMs: number;
  dryRun: boolean;
  errorBudget: number;
}

export interface NotificationConfig {
  onPRCreated?: string;
  onFailure?: string;
}

export interface TriageConfig {
  enabled: boolean;
  autoReject: boolean;
  maxTicketSizeChars: number;
}

export interface DaemonConfig {
  provider: 'jira' | 'linear' | 'github';
  jira?: JiraConfig;
  linear?: LinearConfig;
  github: GitHubConfig;
  polling: PollingConfig;
  orchestration?: OrchestrationConfig;
  notifications?: NotificationConfig;
  triage?: TriageConfig;
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

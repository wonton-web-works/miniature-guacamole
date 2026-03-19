// Type definitions for daemon configuration (ARCH-006)
// YAML-based configuration at .claude/daemon-config.yaml

export type NotifyOnEvent = 'blocked' | 'failed' | 'question' | 'complete';

export interface ValidationError {
  field: string;
  message: string;
}

export interface JiraConfig {
  host: string;
  email: string;
  apiToken: string;
  project: string;
  jql: string;
  statusTransitions: Record<string, string>;
  commentOnStart?: boolean;
  commentOnComplete?: boolean;
}

export interface DmContact {
  userId: string;
  notifyOn: NotifyOnEvent[];
}

export interface SlackConfig {
  botToken: string;
  statusChannel: string;
  dmContacts: DmContact[];
}

export interface ContextRepo {
  owner: string;
  name: string;
  description: string;
  cloneDepth?: number;
}

export interface PrimaryRepo {
  owner: string;
  name: string;
  baseBranch: string;
}

export interface GitHubConfig {
  token: string;
  primaryRepo: PrimaryRepo;
  contextRepos: ContextRepo[];
}

export interface MCPServer {
  name: string;
  command: string;
  env?: Record<string, string>;
  args?: string[];
}

export interface MCPConfig {
  enabled: boolean;
  servers: MCPServer[];
}

export interface TriageConfig {
  enabled: boolean;
  autoReject: boolean;
  maxTicketSizeChars: number;
}

export interface DaemonConfig {
  version: string;
  jira: JiraConfig;
  slack: SlackConfig;
  github: GitHubConfig;
  mcp: MCPConfig;
  triage?: TriageConfig;
}

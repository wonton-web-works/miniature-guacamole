// Config template generator - ARCH-006 compliant YAML template
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { dump } from 'js-yaml';
import type { DaemonConfig } from './types';

export function getDefaultConfig(): DaemonConfig {
  return {
    version: '1.0',
    jira: {
      host: 'https://YOUR_DOMAIN.atlassian.net',
      email: 'YOUR_EMAIL@example.com',
      apiToken: 'YOUR_JIRA_API_TOKEN',
      project: 'YOUR_PROJECT_KEY',
      jql: 'project = YOUR_PROJECT_KEY AND status = "Ready for Dev"',
      statusTransitions: {
        in_progress: 'In Development',
        complete: 'Ready for Review',
        failed: 'Needs Clarification'
      }
    },
    slack: {
      botToken: 'xoxb-YOUR-SLACK-BOT-TOKEN',
      statusChannel: 'C_YOUR_CHANNEL_ID',
      dmContacts: []
    },
    github: {
      token: 'ghp_YOUR_GITHUB_TOKEN',
      primaryRepo: {
        owner: 'YOUR_GITHUB_ORG',
        name: 'YOUR_REPO_NAME',
        baseBranch: 'main'
      },
      contextRepos: []
    },
    mcp: {
      enabled: false,
      servers: []
    }
  };
}

export function createConfigTemplate(projectPath: string, options?: { force?: boolean }): string {
  const configDir = resolve(projectPath, '.claude');
  const configPath = resolve(configDir, 'daemon-config.yaml');

  // Check if file exists
  if (existsSync(configPath) && !options?.force) {
    throw new Error(`Config file already exists at ${configPath}. Use force option to overwrite.`);
  }

  // Create .claude directory if needed
  try {
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }
  } catch (error: any) {
    if (error.code === 'EACCES') {
      throw new Error(`Permission denied creating directory: ${configDir}`);
    }
    throw error;
  }

  // Generate YAML template with comments
  const config = getDefaultConfig();

  // Create YAML content with inline comments
  const yamlContent = `# Daemon Configuration (ARCH-006)
# YAML format with inline secrets (no environment variable indirection)
# Schema version: 1.0

version: "1.0"

# Jira Configuration
# Get your API token from: https://id.atlassian.com/manage-profile/security/api-tokens
jira:
  host: ${config.jira.host}  # Your Jira instance URL (no trailing slash)
  email: ${config.jira.email}  # Email associated with Jira account
  apiToken: ${config.jira.apiToken}  # Jira API token (ATATT3xFfGF... format)
  project: ${config.jira.project}  # Jira project key (e.g., PROJ, DEV)
  jql: ${config.jira.jql}  # JQL query to find work items
  statusTransitions:
    in_progress: ${config.jira.statusTransitions.in_progress}
    complete: ${config.jira.statusTransitions.complete}
    failed: ${config.jira.statusTransitions.failed}
  # Optional: Post comments when starting/completing work
  # commentOnStart: true
  # commentOnComplete: true

# Slack Configuration
# Get your bot token from: https://api.slack.com/apps
slack:
  botToken: ${config.slack.botToken}  # Slack bot token (xoxb-... format)
  statusChannel: ${config.slack.statusChannel}  # Channel ID for status updates (C... format)
  dmContacts: []  # Optional: Direct message contacts
  # Example DM contact:
  # - userId: U01234EFGH
  #   notifyOn:
  #     - blocked
  #     - failed

# GitHub Configuration
# Generate a token at: https://github.com/settings/tokens
github:
  token: ${config.github.token}  # GitHub personal access token (ghp_... or github_pat_... format)
  primaryRepo:
    owner: ${config.github.primaryRepo.owner}  # GitHub repo owner (organization or username)
    name: ${config.github.primaryRepo.name}  # GitHub repo name
    baseBranch: ${config.github.primaryRepo.baseBranch}  # Base branch for PRs (usually "main")
  contextRepos: []  # Optional: Additional repos for context
  # Example context repo:
  # - owner: myorg
  #   name: shared-utils
  #   description: Shared utility library
  #   cloneDepth: 1  # Optional: shallow clone depth

# MCP (Model Context Protocol) Configuration
# Optional: Enable MCP servers for additional AI capabilities
mcp:
  enabled: false
  servers: []
  # Example MCP server:
  # - name: postgres
  #   command: mcp-server-postgres
  #   env:
  #     DATABASE_URL: postgresql://localhost/mydb
  # - name: filesystem
  #   command: mcp-server-filesystem
  #   args:
  #     - /path/to/project

# Triage Configuration
# Optional: Quality gate that evaluates tickets before planning
# triage:
#   enabled: true                # Toggle triage on/off (default: true)
#   autoReject: false            # When false, questionable tickets get needs-info instead of reject (default: false)
#   maxTicketSizeChars: 10000   # Tickets exceeding this limit are auto-flagged for review
`;

  // Write to file
  try {
    writeFileSync(configPath, yamlContent, 'utf-8');
  } catch (error: any) {
    if (error.code === 'EACCES') {
      throw new Error(`Permission denied writing config file: ${configPath}`);
    }
    throw error;
  }

  return configPath;
}

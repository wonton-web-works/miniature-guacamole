// Config validator - manual validation per ARCH-006
import type { DaemonConfig, ValidationError, NotifyOnEvent } from './types';

export function validateConfig(config: DaemonConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate version
  if (!config.version || typeof config.version !== 'string' || config.version.trim() === '') {
    errors.push({
      field: 'version',
      message: 'version is required and must be a non-empty string'
    });
  } else if (config.version !== '1.0') {
    errors.push({
      field: 'version',
      message: 'version must be "1.0" (currently supported version)'
    });
  }

  // Validate jira section
  if (!config.jira || typeof config.jira !== 'object') {
    errors.push({
      field: 'jira',
      message: 'jira configuration section is required'
    });
  } else {
    validateJiraConfig(config.jira, errors);
  }

  // Validate slack section
  if (!config.slack || typeof config.slack !== 'object') {
    errors.push({
      field: 'slack',
      message: 'slack configuration section is required'
    });
  } else {
    validateSlackConfig(config.slack, errors);
  }

  // Validate github section
  if (!config.github || typeof config.github !== 'object') {
    errors.push({
      field: 'github',
      message: 'github configuration section is required'
    });
  } else {
    validateGitHubConfig(config.github, errors);
  }

  // Validate mcp section
  if (!config.mcp || typeof config.mcp !== 'object') {
    errors.push({
      field: 'mcp',
      message: 'mcp configuration section is required'
    });
  } else {
    validateMCPConfig(config.mcp, errors);
  }

  // Validate optional triage section
  if (config.triage !== undefined) {
    if (typeof config.triage !== 'object' || Array.isArray(config.triage)) {
      errors.push({
        field: 'triage',
        message: 'triage must be an object when provided'
      });
    } else {
      validateTriageConfig(config.triage, errors);
    }
  }

  return errors;
}

function validateJiraConfig(jira: any, errors: ValidationError[]): void {
  // Required string fields
  const requiredFields = ['host', 'email', 'apiToken', 'project', 'jql'];
  for (const field of requiredFields) {
    if (!jira[field] || typeof jira[field] !== 'string' || jira[field].trim() === '') {
      errors.push({
        field: `jira.${field}`,
        message: `jira.${field} is required and must be a non-empty string`
      });
    }
  }

  // Validate host URL
  if (jira.host && typeof jira.host === 'string' && jira.host.trim() !== '') {
    if (!jira.host.match(/^https?:\/\//)) {
      errors.push({
        field: 'jira.host',
        message: 'jira.host must be a valid URL starting with http:// or https://'
      });
    } else if (jira.host.startsWith('http://')) {
      errors.push({
        field: 'jira.host',
        message: 'jira.host should use HTTPS for secure connections'
      });
    } else if (jira.host.endsWith('/')) {
      errors.push({
        field: 'jira.host',
        message: 'jira.host should not have a trailing slash'
      });
    }
  }

  // Validate email format
  if (jira.email && typeof jira.email === 'string' && jira.email.trim() !== '') {
    if (!jira.email.includes('@') || !jira.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      errors.push({
        field: 'jira.email',
        message: 'jira.email must be a valid email address (e.g., user@example.com)'
      });
    }
  }

  // Validate apiToken (basic length check) - only warn for very short tokens
  if (jira.apiToken && typeof jira.apiToken === 'string' && jira.apiToken.length < 3) {
    errors.push({
      field: 'jira.apiToken',
      message: 'jira.apiToken appears to be invalid (too short, minimum 3 characters)'
    });
  }

  // Default statusTransitions to empty object if undefined
  if (jira.statusTransitions === undefined) {
    jira.statusTransitions = {};
  }

  // Validate statusTransitions (must be object)
  if (!jira.statusTransitions || typeof jira.statusTransitions !== 'object' || Array.isArray(jira.statusTransitions)) {
    errors.push({
      field: 'jira.statusTransitions',
      message: 'jira.statusTransitions is required and must be an object'
    });
  }
  // Note: Empty statusTransitions is allowed (daemon won't transition, just read)

  // Validate optional boolean fields
  if (jira.commentOnStart !== undefined && typeof jira.commentOnStart !== 'boolean') {
    errors.push({
      field: 'jira.commentOnStart',
      message: 'jira.commentOnStart must be a boolean (true or false)'
    });
  }

  if (jira.commentOnComplete !== undefined && typeof jira.commentOnComplete !== 'boolean') {
    errors.push({
      field: 'jira.commentOnComplete',
      message: 'jira.commentOnComplete must be a boolean (true or false)'
    });
  }
}

function validateSlackConfig(slack: any, errors: ValidationError[]): void {
  // Required fields
  if (!slack.botToken || typeof slack.botToken !== 'string' || slack.botToken.trim() === '') {
    errors.push({
      field: 'slack.botToken',
      message: 'slack.botToken is required and must be a non-empty string'
    });
  } else if (!slack.botToken.startsWith('xoxb-')) {
    errors.push({
      field: 'slack.botToken',
      message: 'slack.botToken must start with "xoxb-" (Slack bot token format)'
    });
  }

  if (!slack.statusChannel || typeof slack.statusChannel !== 'string' || slack.statusChannel.trim() === '') {
    errors.push({
      field: 'slack.statusChannel',
      message: 'slack.statusChannel is required and must be a non-empty string'
    });
  }

  // Default dmContacts to empty array if undefined
  if (slack.dmContacts === undefined) {
    slack.dmContacts = [];
  }

  // Validate dmContacts
  if (!Array.isArray(slack.dmContacts)) {
    errors.push({
      field: 'slack.dmContacts',
      message: 'slack.dmContacts must be an array'
    });
  } else {
    slack.dmContacts.forEach((contact: any, index: number) => {
      if (!contact.userId || typeof contact.userId !== 'string' || contact.userId.trim() === '') {
        errors.push({
          field: `slack.dmContacts[${index}].userId`,
          message: 'slack.dmContacts userId is required and must be a non-empty string'
        });
      }

      if (!Array.isArray(contact.notifyOn)) {
        errors.push({
          field: `slack.dmContacts[${index}].notifyOn`,
          message: 'slack.dmContacts notifyOn must be an array'
        });
      } else {
        const validEvents: NotifyOnEvent[] = ['blocked', 'failed', 'question', 'complete'];
        contact.notifyOn.forEach((event: any) => {
          if (!validEvents.includes(event)) {
            errors.push({
              field: `slack.dmContacts[${index}].notifyOn`,
              message: `Invalid notification event "${event}". Must be one of: blocked, failed, question, complete`
            });
          }
        });
      }
    });
  }
}

function validateGitHubConfig(github: any, errors: ValidationError[]): void {
  // Required token
  if (!github.token || typeof github.token !== 'string' || github.token.trim() === '') {
    errors.push({
      field: 'github.token',
      message: 'github.token is required and must be a non-empty string'
    });
  } else if (!github.token.match(/^(ghp_|github_pat_)/)) {
    errors.push({
      field: 'github.token',
      message: 'github.token must start with "ghp_" or "github_pat_" (GitHub token format)'
    });
  }

  // Validate primaryRepo
  if (!github.primaryRepo || typeof github.primaryRepo !== 'object') {
    errors.push({
      field: 'github.primaryRepo',
      message: 'github.primaryRepo is required and must be an object'
    });
  } else {
    if (!github.primaryRepo.owner || typeof github.primaryRepo.owner !== 'string' || github.primaryRepo.owner.trim() === '') {
      errors.push({
        field: 'github.primaryRepo.owner',
        message: 'github.primaryRepo.owner is required and must be a non-empty string'
      });
    }

    if (!github.primaryRepo.name || typeof github.primaryRepo.name !== 'string' || github.primaryRepo.name.trim() === '') {
      errors.push({
        field: 'github.primaryRepo.name',
        message: 'github.primaryRepo.name is required and must be a non-empty string'
      });
    }

    if (!github.primaryRepo.baseBranch || typeof github.primaryRepo.baseBranch !== 'string' || github.primaryRepo.baseBranch.trim() === '') {
      errors.push({
        field: 'github.primaryRepo.baseBranch',
        message: 'github.primaryRepo.baseBranch is required and must be a non-empty string'
      });
    }
  }

  // Default contextRepos to empty array if undefined
  if (github.contextRepos === undefined) {
    github.contextRepos = [];
  }

  // Validate contextRepos
  if (!Array.isArray(github.contextRepos)) {
    errors.push({
      field: 'github.contextRepos',
      message: 'github.contextRepos must be an array'
    });
  } else {
    github.contextRepos.forEach((repo: any, index: number) => {
      if (!repo.owner || typeof repo.owner !== 'string' || repo.owner.trim() === '') {
        errors.push({
          field: `github.contextRepos[${index}].owner`,
          message: 'github.contextRepos owner is required and must be a non-empty string'
        });
      }

      if (!repo.name || typeof repo.name !== 'string' || repo.name.trim() === '') {
        errors.push({
          field: `github.contextRepos[${index}].name`,
          message: 'github.contextRepos name is required and must be a non-empty string'
        });
      }

      if (repo.cloneDepth !== undefined && (typeof repo.cloneDepth !== 'number' || repo.cloneDepth < 1)) {
        errors.push({
          field: `github.contextRepos[${index}].cloneDepth`,
          message: 'github.contextRepos cloneDepth must be a positive number greater than 0'
        });
      }
    });
  }
}

function validateTriageConfig(triage: any, errors: ValidationError[]): void {
  if (typeof triage.enabled !== 'boolean') {
    errors.push({
      field: 'triage.enabled',
      message: 'triage.enabled must be a boolean (true or false)'
    });
  }

  if (typeof triage.autoReject !== 'boolean') {
    errors.push({
      field: 'triage.autoReject',
      message: 'triage.autoReject must be a boolean (true or false)'
    });
  }

  if (typeof triage.maxTicketSizeChars !== 'number' || triage.maxTicketSizeChars <= 0) {
    errors.push({
      field: 'triage.maxTicketSizeChars',
      message: 'triage.maxTicketSizeChars must be a positive number greater than 0'
    });
  }
}

function validateMCPConfig(mcp: any, errors: ValidationError[]): void {
  // Validate enabled field
  if (typeof mcp.enabled !== 'boolean') {
    errors.push({
      field: 'mcp.enabled',
      message: 'mcp.enabled must be a boolean (true or false)'
    });
  }

  // Default servers to empty array if undefined
  if (mcp.servers === undefined) {
    mcp.servers = [];
  }

  // Validate servers array
  if (!Array.isArray(mcp.servers)) {
    errors.push({
      field: 'mcp.servers',
      message: 'mcp.servers must be an array'
    });
  } else {
    // Warn if MCP enabled but no servers
    if (mcp.enabled === true && mcp.servers.length === 0) {
      errors.push({
        field: 'mcp.servers',
        message: 'mcp.enabled is true but no MCP servers are configured'
      });
    }

    mcp.servers.forEach((server: any, index: number) => {
      if (!server.name || typeof server.name !== 'string' || server.name.trim() === '') {
        errors.push({
          field: `mcp.servers[${index}].name`,
          message: 'mcp.servers name is required and must be a non-empty string'
        });
      }

      if (!server.command || typeof server.command !== 'string' || server.command.trim() === '') {
        errors.push({
          field: `mcp.servers[${index}].command`,
          message: 'mcp.servers command is required and must be a non-empty string'
        });
      }

      // Optional env validation
      if (server.env !== undefined && (typeof server.env !== 'object' || Array.isArray(server.env))) {
        errors.push({
          field: `mcp.servers[${index}].env`,
          message: 'mcp.servers env must be an object (key-value pairs)'
        });
      }

      // Optional args validation
      if (server.args !== undefined && !Array.isArray(server.args)) {
        errors.push({
          field: `mcp.servers[${index}].args`,
          message: 'mcp.servers args must be an array of strings'
        });
      }
    });
  }
}

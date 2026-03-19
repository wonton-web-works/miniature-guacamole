// JiraProvider: wraps existing Jira REST API logic and adds write-back methods
// WS-DAEMON-10: Ticket Provider Abstraction Layer

import type { JiraConfig, PollingConfig } from '../types';
import type { TicketProvider, NormalizedTicket, TicketStatus, SubtaskInput } from './types';

interface JiraIssueFields {
  summary?: string;
  description?: string;
  priority?: { name?: string };
  labels?: string[];
}

interface JiraIssue {
  key: string;
  fields: JiraIssueFields;
}

interface JiraApiResponse {
  issues: JiraIssue[];
}

interface JiraTransitionsResponse {
  transitions: Array<{ id: string; name: string }>;
}

/**
 * Maps Jira priority name to normalized priority enum
 */
function mapPriority(jiraPriority: string | undefined): NormalizedTicket['priority'] {
  switch (jiraPriority?.toLowerCase()) {
    case 'highest':
    case 'critical':
      return 'critical';
    case 'high':
      return 'high';
    case 'low':
    case 'lowest':
      return 'low';
    case 'medium':
      return 'medium';
    default:
      return 'medium';
  }
}

/**
 * Maps TicketStatus to Jira transition name substring for matching
 */
function statusToTransitionName(status: TicketStatus): string {
  switch (status) {
    case 'todo':
      return 'To Do';
    case 'in_progress':
      return 'In Progress';
    case 'in_review':
      return 'In Review';
    case 'done':
      return 'Done';
  }
}

export class JiraProvider implements TicketProvider {
  private readonly config: JiraConfig;
  private readonly polling: PollingConfig;
  private readonly fetchFn: typeof fetch;

  constructor(
    config: JiraConfig,
    polling: PollingConfig,
    fetchFn: typeof fetch = globalThis.fetch
  ) {
    this.config = config;
    this.polling = polling;
    this.fetchFn = fetchFn;
  }

  private get authHeader(): string {
    const encoded = Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString('base64');
    return `Basic ${encoded}`;
  }

  private get baseHeaders(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  async poll(_since?: Date): Promise<NormalizedTicket[]> {
    try {
      const jql = encodeURIComponent(this.config.jql);
      const maxResults = this.polling.batchSize;
      const url = `${this.config.host}/rest/api/3/search?jql=${jql}&maxResults=${maxResults}`;

      const response = await this.fetchFn(url, {
        method: 'GET',
        headers: this.baseHeaders,
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json() as JiraApiResponse;

      if (!data.issues || !Array.isArray(data.issues)) {
        return [];
      }

      return data.issues
        .map((issue): NormalizedTicket => ({
          id: issue.key,
          source: 'jira',
          title: issue.fields?.summary || '',
          description: issue.fields?.description || '',
          priority: mapPriority(issue.fields?.priority?.name),
          labels: issue.fields?.labels || [],
          url: `${this.config.host}/browse/${issue.key}`,
          raw: issue,
        }))
        .slice(0, this.polling.batchSize);
    } catch {
      return [];
    }
  }

  async createSubtask(parent: string, task: SubtaskInput): Promise<string> {
    const url = `${this.config.host}/rest/api/3/issue`;

    const body = {
      fields: {
        project: { key: this.config.project },
        parent: { key: parent },
        summary: task.title,
        description: task.description,
        issuetype: { name: 'Sub-task' },
      },
    };

    const response = await this.fetchFn(url, {
      method: 'POST',
      headers: this.baseHeaders,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Jira createSubtask failed: ${response.status}`);
    }

    const data = await response.json() as { key: string };
    return data.key;
  }

  async transitionStatus(ticketId: string, status: TicketStatus): Promise<void> {
    const transitionsUrl = `${this.config.host}/rest/api/3/issue/${ticketId}/transitions`;

    const transitionsResponse = await this.fetchFn(transitionsUrl, {
      method: 'GET',
      headers: this.baseHeaders,
    });

    if (!transitionsResponse.ok) {
      throw new Error(`Jira getTransitions failed: ${transitionsResponse.status}`);
    }

    const transitionsData = await transitionsResponse.json() as JiraTransitionsResponse;
    const targetName = statusToTransitionName(status).toLowerCase();
    const transition = transitionsData.transitions.find(
      (t) => t.name.toLowerCase().includes(targetName)
    );

    if (!transition) {
      // No matching transition found — silently skip (idempotent)
      return;
    }

    const response = await this.fetchFn(transitionsUrl, {
      method: 'POST',
      headers: this.baseHeaders,
      body: JSON.stringify({ transition: { id: transition.id } }),
    });

    if (!response.ok) {
      throw new Error(`Jira transitionStatus failed: ${response.status}`);
    }
  }

  async addComment(ticketId: string, body: string): Promise<void> {
    const url = `${this.config.host}/rest/api/3/issue/${ticketId}/comment`;

    const payload = {
      body: {
        type: 'doc',
        version: 1,
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: body }],
        }],
      },
    };

    const response = await this.fetchFn(url, {
      method: 'POST',
      headers: this.baseHeaders,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Jira addComment failed: ${response.status}`);
    }
  }

  async addLabel(ticketId: string, label: string): Promise<void> {
    const url = `${this.config.host}/rest/api/3/issue/${ticketId}`;

    const payload = {
      update: {
        labels: [{ add: label }],
      },
    };

    const response = await this.fetchFn(url, {
      method: 'PUT',
      headers: this.baseHeaders,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Jira addLabel failed: ${response.status}`);
    }
  }

  async linkPR(ticketId: string, prUrl: string): Promise<void> {
    const url = `${this.config.host}/rest/api/3/issue/${ticketId}/remotelink`;

    const payload = {
      object: {
        url: prUrl,
        title: `Pull Request: ${prUrl}`,
        icon: {
          url16x16: 'https://github.com/favicon.ico',
          title: 'GitHub',
        },
      },
    };

    const response = await this.fetchFn(url, {
      method: 'POST',
      headers: this.baseHeaders,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Jira linkPR failed: ${response.status}`);
    }
  }
}

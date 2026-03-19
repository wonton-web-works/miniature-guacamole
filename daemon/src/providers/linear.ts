// LinearProvider: Linear GraphQL API implementation
// WS-DAEMON-10: Ticket Provider Abstraction Layer

import type { LinearConfig } from '../types';
import type { TicketProvider, NormalizedTicket, TicketStatus, SubtaskInput } from './types';

const LINEAR_GRAPHQL_URL = 'https://api.linear.app/graphql';

interface LinearLabelNode {
  name: string;
}

interface LinearIssueNode {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  priority: number;
  labels: { nodes: LinearLabelNode[] };
  url: string;
}

interface LinearIssuesResponse {
  data?: {
    issues: {
      nodes: LinearIssueNode[];
    };
  };
  errors?: Array<{ message: string }>;
}

interface LinearCreateIssueResponse {
  data?: {
    issueCreate: {
      issue: { id: string; identifier: string };
    };
  };
  errors?: Array<{ message: string }>;
}

interface LinearUpdateIssueResponse {
  data?: {
    issueUpdate: {
      issue: { id: string };
    };
  };
  errors?: Array<{ message: string }>;
}

interface LinearCreateCommentResponse {
  data?: {
    createComment: {
      comment: { id: string };
    };
  };
  errors?: Array<{ message: string }>;
}

interface LinearAttachmentResponse {
  data?: {
    attachmentCreate: {
      attachment: { id: string };
    };
  };
  errors?: Array<{ message: string }>;
}

interface LinearIssueLabelNode {
  id: string;
  name: string;
}

interface LinearIssueLabelsResponse {
  data?: {
    issueLabels: {
      nodes: LinearIssueLabelNode[];
    };
  };
  errors?: Array<{ message: string }>;
}

interface LinearIssueLabelCreateResponse {
  data?: {
    issueLabelCreate: {
      issueLabel: { id: string };
    };
  };
  errors?: Array<{ message: string }>;
}

interface LinearIssueDetailResponse {
  data?: {
    issue: {
      labels: {
        nodes: Array<{ id: string }>;
      };
    };
  };
  errors?: Array<{ message: string }>;
}

interface LinearWorkflowStateNode {
  id: string;
  name: string;
}

interface LinearTeamStatesResponse {
  data?: {
    team: {
      states: {
        nodes: LinearWorkflowStateNode[];
      };
    };
  };
  errors?: Array<{ message: string }>;
}

/**
 * Maps Linear priority (1=urgent, 2=high, 3=medium, 4=low, 0=none) to normalized enum
 */
function mapPriority(linearPriority: number): NormalizedTicket['priority'] {
  switch (linearPriority) {
    case 1:
      return 'critical';
    case 2:
      return 'high';
    case 3:
      return 'medium';
    case 4:
      return 'low';
    default:
      return 'medium';
  }
}

/**
 * Maps TicketStatus to Linear state name
 */
function statusToStateName(status: TicketStatus): string {
  switch (status) {
    case 'todo':
      return 'Todo';
    case 'in_progress':
      return 'In Progress';
    case 'in_review':
      return 'In Review';
    case 'done':
      return 'Done';
  }
}

function throwIfErrors(errors: Array<{ message: string }> | undefined, context: string): void {
  if (errors && errors.length > 0) {
    throw new Error(`Linear ${context} failed: ${errors.map((e) => e.message).join(', ')}`);
  }
}

export class LinearProvider implements TicketProvider {
  private readonly config: LinearConfig;
  private readonly fetchFn: typeof fetch;
  /** Cached workflow states for this team — populated on first transitionStatus call */
  private stateCache: LinearWorkflowStateNode[] | null = null;

  constructor(config: LinearConfig, fetchFn: typeof fetch = globalThis.fetch) {
    this.config = config;
    this.fetchFn = fetchFn;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: this.config.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private async graphql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const response = await this.fetchFn(LINEAR_GRAPHQL_URL, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`Linear API request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  async poll(_since?: Date): Promise<NormalizedTicket[]> {
    try {
      const query = `
        query Issues($teamId: String!, $filter: IssueFilter) {
          issues(filter: $filter) {
            nodes {
              id
              identifier
              title
              description
              priority
              labels {
                nodes {
                  name
                }
              }
              url
            }
          }
        }
      `;

      const variables: Record<string, unknown> = {
        teamId: this.config.teamId,
      };

      if (this.config.filter) {
        variables.filter = this.config.filter;
      }

      const data = await this.graphql<LinearIssuesResponse>(query, variables);

      if (data.errors && data.errors.length > 0) {
        return [];
      }

      if (!data.data?.issues?.nodes) {
        return [];
      }

      return data.data.issues.nodes.map((node): NormalizedTicket => ({
        id: node.identifier,
        source: 'linear',
        title: node.title,
        description: node.description || '',
        priority: mapPriority(node.priority),
        labels: node.labels.nodes.map((l) => l.name),
        url: node.url,
        raw: node,
      }));
    } catch {
      return [];
    }
  }

  async createSubtask(parent: string, task: SubtaskInput): Promise<string> {
    const query = `
      mutation IssueCreate($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          issue {
            id
            identifier
          }
        }
      }
    `;

    const variables = {
      input: {
        teamId: this.config.teamId,
        title: task.title,
        description: task.description,
        parentId: task.parentId,
      },
    };

    const data = await this.graphql<LinearCreateIssueResponse>(query, variables);
    throwIfErrors(data.errors, 'createSubtask');

    const issue = data.data?.issueCreate?.issue;
    if (!issue) {
      throw new Error(`Linear createSubtask: no issue returned for parent ${parent}`);
    }

    return issue.identifier;
  }

  private async fetchTeamStates(): Promise<LinearWorkflowStateNode[]> {
    if (this.stateCache !== null) {
      return this.stateCache;
    }

    const query = `
      query TeamStates($teamId: String!) {
        team(id: $teamId) {
          states {
            nodes {
              id
              name
            }
          }
        }
      }
    `;

    const data = await this.graphql<LinearTeamStatesResponse>(query, {
      teamId: this.config.teamId,
    });

    throwIfErrors(data.errors, 'fetchTeamStates');

    const nodes = data.data?.team?.states?.nodes ?? [];
    this.stateCache = nodes;
    return nodes;
  }

  async transitionStatus(ticketId: string, status: TicketStatus): Promise<void> {
    const targetName = statusToStateName(status);

    // Step 1: Resolve stateName to stateId via team workflow states
    const states = await this.fetchTeamStates();
    const state = states.find((s) => s.name === targetName);

    if (!state) {
      // No matching state found — skip silently (some teams may have custom state names)
      return;
    }

    // Step 2: Update issue with stateId (Linear API requires ID, not name)
    const query = `
      mutation IssueUpdate($id: String!, $stateId: String!) {
        issueUpdate(id: $id, input: { stateId: $stateId }) {
          issue {
            id
          }
        }
      }
    `;

    const data = await this.graphql<LinearUpdateIssueResponse>(query, {
      id: ticketId,
      stateId: state.id,
    });

    throwIfErrors(data.errors, 'transitionStatus');
  }

  async addLabel(ticketId: string, label: string): Promise<void> {
    // Step 1: Find label by name
    const findQuery = `
      query FindLabel($filter: IssueLabelFilter) {
        issueLabels(filter: $filter) {
          nodes {
            id
            name
          }
        }
      }
    `;

    const findData = await this.graphql<LinearIssueLabelsResponse>(findQuery, {
      filter: { name: { eq: label } },
    });
    throwIfErrors(findData.errors, 'addLabel:findLabel');

    let labelId: string;
    const existingLabels = findData.data?.issueLabels?.nodes ?? [];

    if (existingLabels.length > 0) {
      labelId = existingLabels[0].id;
    } else {
      // Step 1b: Create label if it doesn't exist
      const createQuery = `
        mutation IssueLabelCreate($input: IssueLabelCreateInput!) {
          issueLabelCreate(input: $input) {
            issueLabel {
              id
            }
          }
        }
      `;

      const createData = await this.graphql<LinearIssueLabelCreateResponse>(createQuery, {
        input: { name: label, teamId: this.config.teamId },
      });
      throwIfErrors(createData.errors, 'addLabel:createLabel');

      const created = createData.data?.issueLabelCreate?.issueLabel;
      if (!created) {
        throw new Error(`Linear addLabel: failed to create label "${label}"`);
      }
      labelId = created.id;
    }

    // Step 2: Get issue's current labels
    const issueQuery = `
      query Issue($id: String!) {
        issue(id: $id) {
          labels {
            nodes {
              id
            }
          }
        }
      }
    `;

    const issueData = await this.graphql<LinearIssueDetailResponse>(issueQuery, {
      id: ticketId,
    });
    throwIfErrors(issueData.errors, 'addLabel:getIssue');

    const currentLabelIds = (issueData.data?.issue?.labels?.nodes ?? []).map((l) => l.id);

    // Step 3: Skip if label already on issue (idempotent)
    if (currentLabelIds.includes(labelId)) {
      return;
    }

    // Step 4: Update issue with combined label IDs
    const updateQuery = `
      mutation IssueUpdate($id: String!, $labelIds: [String!]!) {
        issueUpdate(id: $id, input: { labelIds: $labelIds }) {
          issue {
            id
          }
        }
      }
    `;

    const updateData = await this.graphql<LinearUpdateIssueResponse>(updateQuery, {
      id: ticketId,
      labelIds: [...currentLabelIds, labelId],
    });
    throwIfErrors(updateData.errors, 'addLabel:updateIssue');
  }

  async addComment(ticketId: string, body: string): Promise<void> {
    const query = `
      mutation CreateComment($issueId: String!, $body: String!) {
        createComment(input: { issueId: $issueId, body: $body }) {
          comment {
            id
          }
        }
      }
    `;

    const data = await this.graphql<LinearCreateCommentResponse>(query, {
      issueId: ticketId,
      body,
    });

    throwIfErrors(data.errors, 'addComment');
  }

  async linkPR(ticketId: string, prUrl: string): Promise<void> {
    const query = `
      mutation AttachmentCreate($issueId: String!, $url: String!, $title: String!) {
        attachmentCreate(input: { issueId: $issueId, url: $url, title: $title }) {
          attachment {
            id
          }
        }
      }
    `;

    const data = await this.graphql<LinearAttachmentResponse>(query, {
      issueId: ticketId,
      url: prUrl,
      title: `Pull Request: ${prUrl}`,
    });

    throwIfErrors(data.errors, 'linkPR');
  }
}

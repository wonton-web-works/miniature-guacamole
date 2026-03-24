// GitHubProvider: uses gh CLI for zero new dependencies
// WS-DAEMON-10: Ticket Provider Abstraction Layer

import { spawnSync, type SpawnSyncOptions } from 'child_process';
import type { GitHubConfig } from '../types';
import type { TicketProvider, NormalizedTicket, TicketStatus, SubtaskInput } from './types';
import { resolveGhToken } from '../github-auth';

interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  labels: Array<{ name: string }>;
  url: string;
}

/**
 * Maps priority: label to normalized priority enum.
 * Checks labels array for 'priority:critical', 'priority:high', etc.
 */
function mapPriorityFromLabels(labels: Array<{ name: string }>): NormalizedTicket['priority'] {
  for (const label of labels) {
    switch (label.name) {
      case 'priority:critical':
        return 'critical';
      case 'priority:high':
        return 'high';
      case 'priority:medium':
        return 'medium';
      case 'priority:low':
        return 'low';
    }
  }
  return 'medium';
}

/**
 * Extracts the issue number from a GH-{number} identifier
 */
function parseIssueNumber(ticketId: string): number {
  const match = ticketId.match(/^GH-(\d+)$/);
  if (!match) {
    throw new Error(`Invalid GitHub ticket ID: ${ticketId}. Expected format: GH-{number}`);
  }
  return parseInt(match[1], 10);
}

/**
 * Extracts the issue number from a GitHub issue URL
 */
function extractIssueNumberFromUrl(url: string): number {
  const match = url.match(/\/issues\/(\d+)/);
  if (!match) {
    throw new Error(`Could not extract issue number from URL: ${url}`);
  }
  return parseInt(match[1], 10);
}

export class GitHubProvider implements TicketProvider {
  private readonly config: GitHubConfig;
  private readonly spawnOpts: SpawnSyncOptions;

  constructor(config: GitHubConfig) {
    this.config = config;
    const token = resolveGhToken(config.account);
    this.spawnOpts = {
      encoding: 'utf-8' as const,
      ...(token ? { env: { ...process.env, GH_TOKEN: token } } : {}),
    };
  }

  async poll(_since?: Date): Promise<NormalizedTicket[]> {
    try {
      // Build argv array — no manual escaping needed, no shell injection risk
      const args = [
        'issue', 'list',
        '--repo', this.config.repo,
        '--json', 'number,title,body,labels,url',
      ];

      if (this.config.issueFilter) {
        args.push('--search', this.config.issueFilter);
      }

      const result = spawnSync('gh', args, this.spawnOpts);
      if (result.status !== 0) {
        return [];
      }

      const issues: GitHubIssue[] = JSON.parse(result.stdout);

      return issues.map((issue): NormalizedTicket => ({
        id: `GH-${issue.number}`,
        source: 'github',
        title: issue.title,
        description: issue.body || '',
        priority: mapPriorityFromLabels(issue.labels),
        labels: issue.labels.map((l) => l.name),
        url: issue.url,
        raw: issue,
      }));
    } catch {
      return [];
    }
  }

  async createSubtask(parent: string, task: SubtaskInput): Promise<string> {
    const parentNumber = parseIssueNumber(parent);
    const bodyText = `Parent: #${parentNumber}\n\n${task.description}`;

    // argv array — no escaping needed, no shell injection risk
    const args = [
      'issue', 'create',
      '--repo', this.config.repo,
      '--title', task.title,
      '--body', bodyText,
    ];

    // Copy parent labels to sub-issue (GH-102)
    if (task.labels && task.labels.length > 0) {
      args.push('--label', task.labels.join(','));
    }

    const result = spawnSync('gh', args, this.spawnOpts);

    if (result.status !== 0) {
      throw new Error(result.stderr?.trim() || 'gh issue create failed');
    }

    const issueUrl = result.stdout.trim();
    const newNumber = extractIssueNumberFromUrl(issueUrl);

    return `GH-${newNumber}`;
  }

  async transitionStatus(ticketId: string, status: TicketStatus): Promise<void> {
    const issueNumber = parseIssueNumber(ticketId);
    const statusLabel = `status:${status}`;

    // Remove existing status labels and add new one
    const oldStatuses: TicketStatus[] = ['todo', 'in_progress', 'in_review', 'done'];
    const removeLabels = oldStatuses
      .filter((s) => s !== status)
      .map((s) => `status:${s}`)
      .join(',');

    // Build argv array — labels passed as separate args, no quoting needed
    const args = [
      'issue', 'edit', String(issueNumber),
      '--repo', this.config.repo,
      '--add-label', statusLabel,
    ];

    if (removeLabels) {
      args.push('--remove-label', removeLabels);
    }

    const result = spawnSync('gh', args, this.spawnOpts);
    if (result.status !== 0) {
      throw new Error(result.stderr?.trim() || 'gh issue edit failed');
    }
  }

  async addComment(ticketId: string, body: string): Promise<void> {
    const issueNumber = parseIssueNumber(ticketId);

    // argv array — body passed as separate arg, no manual escaping needed
    const result = spawnSync('gh', [
      'issue', 'comment', String(issueNumber),
      '--repo', this.config.repo,
      '--body', body,
    ], this.spawnOpts);

    if (result.status !== 0) {
      throw new Error(result.stderr?.trim() || 'gh issue comment failed');
    }
  }

  async addLabel(ticketId: string, label: string): Promise<void> {
    const issueNumber = parseIssueNumber(ticketId);

    const result = spawnSync('gh', [
      'issue', 'edit', String(issueNumber),
      '--repo', this.config.repo,
      '--add-label', label,
    ], this.spawnOpts);

    if (result.status !== 0) {
      throw new Error(result.stderr?.trim() || 'gh issue edit failed');
    }
  }

  async linkPR(_ticketId: string, _prUrl: string): Promise<void> {
    // GitHub cross-references are automatic when a PR body mentions #N
    // No explicit action needed — the PR body mentioning the issue number creates the link
  }
}

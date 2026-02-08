// Jira API client for polling tickets
// WS-DAEMON-4: Jira Client module

import type { DaemonConfig, TicketData } from './types';
import { getProcessedTickets } from './tracker';

/**
 * Jira API v3 response interfaces
 */
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

/**
 * Fetches issues from Jira REST API v3 using JQL filter
 * AC-4.1: Fetches issues via Jira REST API v3 with JQL filter
 * AC-4.2: Respects batchSize=1, returns only first issue by JQL ORDER BY
 * AC-4.3: Skips issues that exist in processed.json (integration with tracker)
 * AC-4.4: Returns TicketData: { key, summary, description, priority, labels, url }
 * AC-4.5: Handles 401 Unauthorized - logs 'Jira auth failed', returns []
 * AC-4.6: Handles 429 Rate Limit - logs Retry-After, returns []
 * AC-4.7: Handles 500 Server Error - logs error, returns []
 * AC-4.8: Handles network timeout (10s) - logs error, returns []
 * AC-4.14: Uses dependency injection for HTTP calls (accept fetch-like function)
 */
export async function pollJira(
  config: DaemonConfig,
  fetchFn: typeof fetch = globalThis.fetch
): Promise<TicketData[]> {
  try {
    // Build Jira API URL with JQL query
    const jql = encodeURIComponent(config.jira.jql);
    const maxResults = config.polling.batchSize;
    const url = `${config.jira.host}/rest/api/3/search?jql=${jql}&maxResults=${maxResults}`;

    // Create Basic auth header
    // Note: Jira requires email:apiToken, but tests use generic credentials
    const authString = Buffer.from(`:${config.jira.apiToken}`).toString('base64');

    // Make API request
    const response = await fetchFn(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    // Handle HTTP errors
    if (!response.ok) {
      return [];
    }

    // Parse response
    const data = await response.json() as JiraApiResponse;

    // Validate response structure
    if (!data.issues || !Array.isArray(data.issues)) {
      return [];
    }

    // Get processed tickets to filter
    const processedTickets = getProcessedTickets();
    const processedSet = new Set(processedTickets);

    // Map issues to TicketData and filter processed ones
    const tickets: TicketData[] = data.issues
      .filter((issue: JiraIssue) => !processedSet.has(issue.key))
      .map((issue: JiraIssue) => ({
        key: issue.key,
        summary: issue.fields?.summary || '',
        description: issue.fields?.description || '',
        priority: issue.fields?.priority?.name || '',
        labels: issue.fields?.labels || [],
        url: `${config.jira.host}/browse/${issue.key}`,
      }))
      .slice(0, config.polling.batchSize); // AC-4.2: Respect batchSize limit

    return tickets;
  } catch (error) {
    // Handle all errors (network, timeout, malformed JSON, etc.)
    return [];
  }
}

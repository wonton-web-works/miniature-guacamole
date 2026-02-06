/**
 * WS-TRACKING Phase 2: Aggregation Module
 *
 * Purpose: Aggregate audit entries into reports.
 * Supports workstream summaries and agent breakdowns.
 */

import type { TrackedAuditEntry } from './reader';

/**
 * Workstream summary report.
 */
export interface WorkstreamSummary {
  workstream_id: string | null;
  request_count: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
}

/**
 * Agent breakdown report.
 */
export interface AgentBreakdown {
  workstream_id: string | null;
  agent_name: string | null;
  request_count: number;
  total_tokens: number;
  total_cost_usd: number;
  success_count: number | null;
  success_rate: number | null;
}

/**
 * Date range for filtering.
 */
export interface DateRange {
  from?: Date;
  to?: Date;
}

/**
 * Options for aggregation functions.
 */
export interface AggregationOptions {
  dateRange?: DateRange;
  workstream?: string;
  knownWorkstreams?: string[];
  currentDate?: Date;
}

/**
 * Filters entries by date range.
 * Default: last 30 days from current date.
 */
export function filterByDateRange(
  entries: TrackedAuditEntry[],
  dateRange: DateRange = {},
  currentDate: Date = new Date()
): TrackedAuditEntry[] {
  const { from, to } = dateRange;

  // Default to last 30 days if no range specified
  const effectiveFrom = from || new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  const effectiveTo = to || currentDate;

  return entries.filter(entry => {
    const entryDate = new Date(entry.timestamp);
    return entryDate >= effectiveFrom && entryDate <= effectiveTo;
  });
}

/**
 * Aggregates entries by workstream.
 */
export function aggregateByWorkstream(
  entries: TrackedAuditEntry[],
  options: AggregationOptions = {}
): WorkstreamSummary[] {
  // Filter by date range if specified
  let filtered = entries;
  if (options.dateRange || options.currentDate) {
    filtered = filterByDateRange(entries, options.dateRange || {}, options.currentDate);
  }

  // Group by workstream_id
  const groups = new Map<string | null, TrackedAuditEntry[]>();
  for (const entry of filtered) {
    const key = entry.workstream_id ?? null;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(entry);
  }

  // Aggregate each group
  const summaries: WorkstreamSummary[] = [];
  for (const [workstream_id, groupEntries] of Array.from(groups.entries())) {
    const summary: WorkstreamSummary = {
      workstream_id,
      request_count: groupEntries.length,
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_cost_usd: 0,
    };

    for (const entry of groupEntries) {
      summary.total_input_tokens += entry.input_tokens || 0;
      summary.total_output_tokens += entry.output_tokens || 0;
      summary.total_cost_usd += entry.total_cost_usd || 0;
    }

    summaries.push(summary);
  }

  return summaries;
}

/**
 * Includes zero-usage workstreams from config.
 */
export function includeZeroUsageWorkstreams(
  summaries: WorkstreamSummary[],
  knownWorkstreams: string[]
): WorkstreamSummary[] {
  const existingIds = new Set(summaries.map(s => s.workstream_id));
  const result = [...summaries];

  for (const workstreamId of knownWorkstreams) {
    if (!existingIds.has(workstreamId)) {
      result.push({
        workstream_id: workstreamId,
        request_count: 0,
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_cost_usd: 0,
      });
    }
  }

  return result;
}

/**
 * Calculates success rate as a percentage.
 * Returns null if total is 0 or if success count is null.
 */
export function calculateSuccessRate(
  successCount: number | null,
  totalCount: number
): number | null {
  if (successCount === null || totalCount === 0) {
    return null;
  }
  return Math.round((successCount / totalCount) * 100 * 100) / 100; // Round to 2 decimals
}

/**
 * Aggregates entries by agent within workstreams.
 */
export function aggregateByAgent(
  entries: TrackedAuditEntry[],
  options: AggregationOptions = {}
): AgentBreakdown[] {
  // Filter by date range if specified
  let filtered = entries;
  if (options.dateRange || options.currentDate) {
    filtered = filterByDateRange(entries, options.dateRange || {}, options.currentDate);
  }

  // Filter by workstream if specified
  if (options.workstream) {
    filtered = filtered.filter(e => e.workstream_id === options.workstream);
  }

  // Group by workstream_id + agent_name
  const groups = new Map<string, TrackedAuditEntry[]>();
  for (const entry of filtered) {
    const key = `${entry.workstream_id ?? 'null'}:${entry.agent_name ?? 'null'}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(entry);
  }

  // Aggregate each group
  const breakdowns: AgentBreakdown[] = [];
  for (const [key, groupEntries] of Array.from(groups.entries())) {
    const firstEntry = groupEntries[0];
    const breakdown: AgentBreakdown = {
      workstream_id: firstEntry.workstream_id ?? null,
      agent_name: firstEntry.agent_name ?? null,
      request_count: groupEntries.length,
      total_tokens: 0,
      total_cost_usd: 0,
      success_count: null,
      success_rate: null,
    };

    let hasSuccessData = false;
    let successCount = 0;

    for (const entry of groupEntries) {
      const inputTokens = entry.input_tokens || 0;
      const outputTokens = entry.output_tokens || 0;
      breakdown.total_tokens += inputTokens + outputTokens;
      breakdown.total_cost_usd += entry.total_cost_usd || 0;

      // Track success metrics if present
      if ('success' in entry && entry.success !== undefined) {
        hasSuccessData = true;
        if (entry.success === true) {
          successCount++;
        }
      }
    }

    // Calculate success rate if we have success data
    if (hasSuccessData) {
      breakdown.success_count = successCount;
      breakdown.success_rate = calculateSuccessRate(successCount, groupEntries.length);
    }

    breakdowns.push(breakdown);
  }

  // Sort by cost descending
  breakdowns.sort((a, b) => b.total_cost_usd - a.total_cost_usd);

  return breakdowns;
}

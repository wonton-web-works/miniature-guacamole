/**
 * WS-TRACKING Phase 2: Aggregation Module
 *
 * Purpose: Aggregate audit entries into reports.
 * Supports workstream summaries and agent breakdowns.
 */

import type { TrackedAuditEntry } from './reader';
import { estimateCost, DEFAULT_PRICING_TABLE, type TokenCounts } from './pricing';

/**
 * Workstream summary report.
 */
export interface WorkstreamSummary {
  workstream_id: string | null;
  request_count: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  total_duration_ms: number;
  estimated_cost_usd: number;
  cache_savings_tokens: number;
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
  total_duration_ms: number;
  estimated_cost_usd: number;
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

  // Default to last 30 days only if neither from nor to is specified
  let effectiveFrom: Date;
  let effectiveTo: Date;

  if (!from && !to) {
    // Default case: last 30 days
    effectiveFrom = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    effectiveTo = currentDate;
  } else {
    // If either from or to is specified, use them (or no bound if not specified)
    effectiveFrom = from || new Date(0); // Beginning of time if not specified
    effectiveTo = to || new Date(8640000000000000); // Max JS date if not specified
  }

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
      total_duration_ms: 0,
      estimated_cost_usd: 0,
      cache_savings_tokens: 0,
    };

    for (const entry of groupEntries) {
      summary.total_input_tokens += entry.input_tokens || 0;
      summary.total_output_tokens += entry.output_tokens || 0;
      summary.total_cost_usd += entry.total_cost_usd || 0;
      summary.total_duration_ms += entry.duration_ms || 0;
      summary.cache_savings_tokens += entry.cache_read_tokens || 0;

      // Estimate cost if not provided
      if (entry.total_cost_usd !== null && entry.total_cost_usd !== undefined) {
        summary.estimated_cost_usd += entry.total_cost_usd;
      } else if (entry.model && (entry.input_tokens !== null || entry.output_tokens !== null)) {
        try {
          const tokens: TokenCounts = {
            input_tokens: entry.input_tokens || 0,
            output_tokens: entry.output_tokens || 0,
            cache_creation_tokens: entry.cache_creation_tokens || undefined,
            cache_read_tokens: entry.cache_read_tokens || undefined,
          };
          const estimated = estimateCost(entry.model, tokens, DEFAULT_PRICING_TABLE);
          summary.estimated_cost_usd += estimated;
        } catch (error) {
          // If estimation fails (model not in pricing table), skip this entry
          // This maintains backward compatibility with unknown models
        }
      }
    }

    // Round costs to avoid floating-point precision errors
    summary.total_cost_usd = Math.round(summary.total_cost_usd * 1000000) / 1000000;
    summary.estimated_cost_usd = Math.round(summary.estimated_cost_usd * 1000000) / 1000000;

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
        total_duration_ms: 0,
        estimated_cost_usd: 0,
        cache_savings_tokens: 0,
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
      total_duration_ms: 0,
      estimated_cost_usd: 0,
    };

    let hasSuccessData = false;
    let successCount = 0;

    for (const entry of groupEntries) {
      const inputTokens = entry.input_tokens || 0;
      const outputTokens = entry.output_tokens || 0;
      breakdown.total_tokens += inputTokens + outputTokens;
      breakdown.total_cost_usd += entry.total_cost_usd || 0;
      breakdown.total_duration_ms += entry.duration_ms || 0;

      // Estimate cost if not provided
      if (entry.total_cost_usd !== null && entry.total_cost_usd !== undefined) {
        breakdown.estimated_cost_usd += entry.total_cost_usd;
      } else if (entry.model && (entry.input_tokens !== null || entry.output_tokens !== null)) {
        try {
          const tokens: TokenCounts = {
            input_tokens: entry.input_tokens || 0,
            output_tokens: entry.output_tokens || 0,
            cache_creation_tokens: entry.cache_creation_tokens || undefined,
            cache_read_tokens: entry.cache_read_tokens || undefined,
          };
          const estimated = estimateCost(entry.model, tokens, DEFAULT_PRICING_TABLE);
          breakdown.estimated_cost_usd += estimated;
        } catch (error) {
          // If estimation fails (model not in pricing table), skip this entry
        }
      }

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

    // Round costs to avoid floating-point precision errors
    breakdown.total_cost_usd = Math.round(breakdown.total_cost_usd * 1000000) / 1000000;
    breakdown.estimated_cost_usd = Math.round(breakdown.estimated_cost_usd * 1000000) / 1000000;

    breakdowns.push(breakdown);
  }

  // Sort by cost descending
  breakdowns.sort((a, b) => b.total_cost_usd - a.total_cost_usd);

  return breakdowns;
}

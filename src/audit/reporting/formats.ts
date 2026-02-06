/**
 * WS-TRACKING Phase 2: Formats Module
 *
 * Purpose: Format aggregated data into various output formats.
 * Supports: table, json, csv
 */

import type { WorkstreamSummary, AgentBreakdown, DateRange } from './aggregation';

export type OutputFormat = 'table' | 'json' | 'csv';

/**
 * Format options with date range info.
 */
export interface FormatOptions {
  format?: OutputFormat;
  dateRange?: DateRange;
}

/**
 * Sorts summaries by total cost descending.
 * Does not mutate original array.
 */
export function sortByTotalCost<T extends { total_cost_usd: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.total_cost_usd - a.total_cost_usd);
}

/**
 * Adds a total row to workstream summaries.
 * Does not mutate original array.
 */
export function addTotalRow(summaries: WorkstreamSummary[]): WorkstreamSummary[] {
  const total: WorkstreamSummary = {
    workstream_id: 'TOTAL',
    request_count: 0,
    total_input_tokens: 0,
    total_output_tokens: 0,
    total_cost_usd: 0,
  };

  for (const summary of summaries) {
    total.request_count += summary.request_count;
    total.total_input_tokens += summary.total_input_tokens;
    total.total_output_tokens += summary.total_output_tokens;
    total.total_cost_usd += summary.total_cost_usd;
  }

  return [...summaries, total];
}

/**
 * Formats a number with thousand separators.
 */
function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Formats a cost value to 2 decimal places.
 */
function formatCost(cost: number): string {
  return cost.toFixed(2);
}

/**
 * Formats date range header text.
 */
function formatDateRangeHeader(dateRange?: DateRange): string {
  if (!dateRange || (!dateRange.from && !dateRange.to)) {
    return 'Date Range: Last 30 days';
  }

  if (dateRange.from && dateRange.to) {
    const fromStr = dateRange.from.toISOString().split('T')[0];
    const toStr = dateRange.to.toISOString().split('T')[0];
    return `Date Range: ${fromStr} to ${toStr}`;
  }

  if (dateRange.from) {
    const fromStr = dateRange.from.toISOString().split('T')[0];
    return `Date Range: From ${fromStr}`;
  }

  if (dateRange.to) {
    const toStr = dateRange.to.toISOString().split('T')[0];
    return `Date Range: Up to ${toStr}`;
  }

  return '';
}

/**
 * Formats workstream summary as ASCII table.
 */
function formatWorkstreamTable(summaries: WorkstreamSummary[], dateRange?: DateRange): string {
  if (summaries.length === 0) {
    return 'No data available.';
  }

  const sorted = sortByTotalCost(summaries);
  const withTotal = addTotalRow(sorted);

  // Column widths
  const col1Width = Math.max(15, ...withTotal.map(s => String(s.workstream_id || 'null').length));
  const col2Width = 10;
  const col3Width = 15;
  const col4Width = 16;
  const col5Width = 12;

  // Helper to pad strings
  const padRight = (str: string, width: number) => str + ' '.repeat(Math.max(0, width - str.length));
  const padLeft = (str: string, width: number) => ' '.repeat(Math.max(0, width - str.length)) + str;

  // Header
  const header = [
    formatDateRangeHeader(dateRange),
    '',
    padRight('workstream_id', col1Width) + ' ' +
    padLeft('requests', col2Width) + ' ' +
    padLeft('input_tokens', col3Width) + ' ' +
    padLeft('output_tokens', col4Width) + ' ' +
    padLeft('cost_usd', col5Width),
    '─'.repeat(col1Width + col2Width + col3Width + col4Width + col5Width + 4),
  ];

  // Data rows
  const rows = withTotal.map(s => {
    const wsId = padRight(String(s.workstream_id || 'null'), col1Width);
    const requests = padLeft(formatNumber(s.request_count), col2Width);
    const inputTokens = padLeft(formatNumber(s.total_input_tokens), col3Width);
    const outputTokens = padLeft(formatNumber(s.total_output_tokens), col4Width);
    const cost = padLeft(formatCost(s.total_cost_usd), col5Width);
    return `${wsId} ${requests} ${inputTokens} ${outputTokens} ${cost}`;
  });

  return [...header, ...rows].join('\n');
}

/**
 * Formats workstream summary as JSON.
 */
function formatWorkstreamJson(summaries: WorkstreamSummary[]): string {
  const sorted = sortByTotalCost(summaries);
  return JSON.stringify(sorted, null, 2);
}

/**
 * Formats workstream summary as CSV.
 */
function formatWorkstreamCsv(summaries: WorkstreamSummary[]): string {
  const sorted = sortByTotalCost(summaries);
  const header = 'workstream_id,request_count,total_input_tokens,total_output_tokens,total_cost_usd';
  const rows = sorted.map(s =>
    `${s.workstream_id || 'null'},${s.request_count},${s.total_input_tokens},${s.total_output_tokens},${s.total_cost_usd.toFixed(3)}`
  );
  return [header, ...rows].join('\n');
}

/**
 * Formats workstream summary in specified format.
 */
export function formatWorkstreamSummary(
  summaries: WorkstreamSummary[],
  format: OutputFormat = 'table',
  dateRange?: DateRange
): string {
  switch (format) {
    case 'json':
      return formatWorkstreamJson(summaries);
    case 'csv':
      return formatWorkstreamCsv(summaries);
    case 'table':
    default:
      return formatWorkstreamTable(summaries, dateRange);
  }
}

/**
 * Formats agent breakdown as ASCII table.
 */
function formatAgentTable(breakdowns: AgentBreakdown[], dateRange?: DateRange): string {
  if (breakdowns.length === 0) {
    return 'No data available.';
  }

  const sorted = sortByTotalCost(breakdowns);

  // Column widths
  const col1Width = Math.max(15, ...sorted.map(b => String(b.workstream_id || 'null').length));
  const col2Width = Math.max(12, ...sorted.map(b => String(b.agent_name || 'null').length));
  const col3Width = 10;
  const col4Width = 13;
  const col5Width = 10;
  const col6Width = 12;

  // Helper to pad strings
  const padRight = (str: string, width: number) => str + ' '.repeat(Math.max(0, width - str.length));
  const padLeft = (str: string, width: number) => ' '.repeat(Math.max(0, width - str.length)) + str;

  // Header
  const header = [
    formatDateRangeHeader(dateRange),
    '',
    padRight('workstream_id', col1Width) + ' ' +
    padRight('agent_name', col2Width) + ' ' +
    padLeft('requests', col3Width) + ' ' +
    padLeft('total_tokens', col4Width) + ' ' +
    padLeft('cost_usd', col5Width) + ' ' +
    padLeft('success_rate', col6Width),
    '─'.repeat(col1Width + col2Width + col3Width + col4Width + col5Width + col6Width + 5),
  ];

  // Data rows
  const rows = sorted.map(b => {
    const wsId = padRight(String(b.workstream_id || 'null'), col1Width);
    const agentName = padRight(String(b.agent_name || 'null'), col2Width);
    const requests = padLeft(formatNumber(b.request_count), col3Width);
    const tokens = padLeft(formatNumber(b.total_tokens), col4Width);
    const cost = padLeft(formatCost(b.total_cost_usd), col5Width);
    const successRate = b.success_rate !== null
      ? padLeft(`${b.success_rate.toFixed(2)}%`, col6Width)
      : padLeft('N/A', col6Width);
    return `${wsId} ${agentName} ${requests} ${tokens} ${cost} ${successRate}`;
  });

  return [...header, ...rows].join('\n');
}

/**
 * Formats agent breakdown as JSON.
 */
function formatAgentJson(breakdowns: AgentBreakdown[]): string {
  const sorted = sortByTotalCost(breakdowns);
  return JSON.stringify(sorted, null, 2);
}

/**
 * Formats agent breakdown as CSV.
 */
function formatAgentCsv(breakdowns: AgentBreakdown[]): string {
  const sorted = sortByTotalCost(breakdowns);
  const header = 'workstream_id,agent_name,request_count,total_tokens,total_cost_usd,success_count,success_rate';
  const rows = sorted.map(b =>
    `${b.workstream_id || 'null'},${b.agent_name || 'null'},${b.request_count},${b.total_tokens},${b.total_cost_usd.toFixed(3)},${b.success_count ?? ''},${b.success_rate ?? ''}`
  );
  return [header, ...rows].join('\n');
}

/**
 * Formats agent breakdown in specified format.
 */
export function formatAgentBreakdown(
  breakdowns: AgentBreakdown[],
  format: OutputFormat = 'table',
  dateRange?: DateRange
): string {
  switch (format) {
    case 'json':
      return formatAgentJson(breakdowns);
    case 'csv':
      return formatAgentCsv(breakdowns);
    case 'table':
    default:
      return formatAgentTable(breakdowns, dateRange);
  }
}

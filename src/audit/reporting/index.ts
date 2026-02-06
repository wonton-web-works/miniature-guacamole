/**
 * WS-TRACKING Phase 2: Reporting Module Public API
 *
 * Barrel file pattern for clean imports.
 */

// Reader
export {
  readAuditLog,
  parseAuditLogLine,
  getDefaultAuditLogPath,
  isValidAuditEntry,
  type TrackedAuditEntry,
} from './reader';

// Aggregation
export {
  aggregateByWorkstream,
  aggregateByAgent,
  filterByDateRange,
  includeZeroUsageWorkstreams,
  calculateSuccessRate,
  type WorkstreamSummary,
  type AgentBreakdown,
  type DateRange,
  type AggregationOptions,
} from './aggregation';

// Formats
export {
  formatWorkstreamSummary,
  formatAgentBreakdown,
  sortByTotalCost,
  addTotalRow,
  type OutputFormat,
  type FormatOptions,
} from './formats';

// CLI
export {
  runReport,
  runReportCli,
  parseReportArgs,
  validateReportArgs,
  getReportHelp,
  formatCliError,
  type ReportOptions,
  type ValidationResult,
} from './cli';

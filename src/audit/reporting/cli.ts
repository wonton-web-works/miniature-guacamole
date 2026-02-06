/**
 * WS-TRACKING Phase 2: CLI Module
 *
 * Purpose: Command-line interface for generating reports.
 * Supports: --by-workstream, --by-agent, --format, --from, --to, --workstream
 */

import { readAuditLog } from './reader';
import {
  aggregateByWorkstream,
  aggregateByAgent,
  includeZeroUsageWorkstreams,
  type AggregationOptions,
  type DateRange,
} from './aggregation';
import { formatWorkstreamSummary, formatAgentBreakdown, type OutputFormat } from './formats';
import { loadTrackingConfig } from '../tracking/config';
import { validateWorkstreamId } from '../tracking/validation';

/**
 * Report options parsed from CLI arguments.
 */
export interface ReportOptions {
  byWorkstream?: boolean;
  byAgent?: boolean;
  format?: OutputFormat;
  from?: string;
  to?: string;
  workstream?: string;
  auditLogPath?: string;
  currentDate?: Date;
  configPath?: string;
}

/**
 * Validation result.
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Parses CLI arguments into ReportOptions.
 */
export function parseReportArgs(args: string[]): ReportOptions {
  const options: ReportOptions = {
    format: 'table',
    byWorkstream: false,
    byAgent: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // Skip 'report' command itself
    if (arg === 'report') {
      continue;
    }

    // --by-workstream or --by-ws
    if (arg === '--by-workstream' || arg === '--by-ws') {
      options.byWorkstream = true;
      continue;
    }

    // --by-agent
    if (arg === '--by-agent') {
      options.byAgent = true;
      continue;
    }

    // --format=<value> or --format <value>
    if (arg.startsWith('--format=')) {
      options.format = arg.split('=')[1] as OutputFormat;
      continue;
    }
    if (arg === '--format' && i + 1 < args.length) {
      options.format = args[++i] as OutputFormat;
      continue;
    }

    // --from=<date> or --from <date>
    if (arg.startsWith('--from=')) {
      options.from = arg.split('=')[1];
      continue;
    }
    if (arg === '--from' && i + 1 < args.length) {
      options.from = args[++i];
      continue;
    }

    // --to=<date> or --to <date>
    if (arg.startsWith('--to=')) {
      options.to = arg.split('=')[1];
      continue;
    }
    if (arg === '--to' && i + 1 < args.length) {
      options.to = args[++i];
      continue;
    }

    // --workstream=<id> or --ws=<id> or --workstream <id>
    if (arg.startsWith('--workstream=')) {
      options.workstream = arg.split('=')[1];
      continue;
    }
    if (arg.startsWith('--ws=')) {
      options.workstream = arg.split('=')[1];
      continue;
    }
    if ((arg === '--workstream' || arg === '--ws') && i + 1 < args.length) {
      options.workstream = args[++i];
      continue;
    }
  }

  // Default to by-workstream if neither specified
  if (!options.byWorkstream && !options.byAgent) {
    options.byWorkstream = true;
  }

  return options;
}

/**
 * Validates report options.
 */
export function validateReportArgs(options: ReportOptions): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Cannot specify both --by-workstream and --by-agent
  if (options.byWorkstream && options.byAgent) {
    errors.push('Cannot specify both --by-workstream and --by-agent');
  }

  // Validate format
  if (options.format && !['table', 'json', 'csv'].includes(options.format)) {
    errors.push(`Invalid format: ${options.format}. Must be table, json, or csv.`);
  }

  // Validate date formats
  if (options.from) {
    const fromDate = new Date(options.from);
    if (isNaN(fromDate.getTime()) || !/^\d{4}-\d{2}-\d{2}/.test(options.from)) {
      errors.push(`Invalid date format for --from: ${options.from}. Expected YYYY-MM-DD.`);
    }
  }

  if (options.to) {
    const toDate = new Date(options.to);
    if (isNaN(toDate.getTime()) || !/^\d{4}-\d{2}-\d{2}/.test(options.to)) {
      errors.push(`Invalid date format for --to: ${options.to}. Expected YYYY-MM-DD.`);
    }
  }

  // Validate date range logic
  if (options.from && options.to) {
    const fromDate = new Date(options.from);
    const toDate = new Date(options.to);
    if (fromDate > toDate) {
      errors.push('--from date cannot be after --to date');
    }
  }

  // Validate workstream ID format
  if (options.workstream && !validateWorkstreamId(options.workstream)) {
    errors.push(`Invalid workstream ID format: ${options.workstream}. Expected pattern: [A-Z]+-[0-9]+ (e.g., WS-18)`);
  }

  // Warn if using --workstream with --by-workstream
  if (options.workstream && options.byWorkstream) {
    warnings.push('--workstream filter has no effect with --by-workstream');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Runs the report based on options.
 */
export function runReport(options: ReportOptions): string {
  try {
    // Read audit log
    const entries = readAuditLog(options.auditLogPath);

    if (entries.length === 0) {
      return 'No data available in audit log.';
    }

    // Build date range
    const dateRange: DateRange = {};
    if (options.from) {
      dateRange.from = new Date(options.from);
    }
    if (options.to) {
      dateRange.to = new Date(options.to);
    }

    // Build aggregation options
    const aggOptions: AggregationOptions = {
      dateRange,
      currentDate: options.currentDate,
    };

    if (options.workstream) {
      aggOptions.workstream = options.workstream;
    }

    // Generate report
    if (options.byAgent) {
      const breakdowns = aggregateByAgent(entries, aggOptions);
      return formatAgentBreakdown(breakdowns, options.format, dateRange);
    } else {
      // By workstream (default)
      let summaries = aggregateByWorkstream(entries, aggOptions);

      // Include zero-usage workstreams if config has known workstreams
      try {
        const config = loadTrackingConfig();
        if ((config as any).tracking?.known_workstreams) {
          const knownWorkstreams = (config as any).tracking.known_workstreams;
          summaries = includeZeroUsageWorkstreams(summaries, knownWorkstreams);
        }
      } catch (error) {
        // Config not found or parsing failed - continue without zero-usage workstreams
      }

      return formatWorkstreamSummary(summaries, options.format, dateRange);
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Audit log not found')) {
        throw new Error(`Audit log not found. Please check the path: ${options.auditLogPath || '~/.claude/audit.log'}`);
      }
      throw error;
    }
    throw new Error('Unexpected error generating report');
  }
}

/**
 * Returns help text for the report command.
 */
export function getReportHelp(): string {
  return `
Usage: claude-audit report [options]

Options:
  --by-workstream, --by-ws   Group by workstream (default)
  --by-agent                 Group by agent within workstreams
  --format=<format>          Output format: table (default), json, csv
  --from=YYYY-MM-DD          Start date (default: 30 days ago)
  --to=YYYY-MM-DD            End date (default: today)
  --workstream=<id>, --ws=<id>  Filter by workstream (for --by-agent)
  --help                     Show this help message

Examples:
  claude-audit report --by-workstream
  claude-audit report --by-agent --workstream=WS-18
  claude-audit report --by-workstream --format=json
  claude-audit report --by-workstream --from=2026-02-01 --to=2026-02-04
  `.trim();
}

/**
 * Formats CLI error messages.
 */
export function formatCliError(message: string): string {
  return `ERROR: ${message}\n\nRun 'claude-audit report --help' for usage information.`;
}

/**
 * Runs the report CLI with the given arguments.
 * Returns exit code.
 */
export function runReportCli(args: string[]): number {
  try {
    // Handle --help
    if (args.includes('--help')) {
      console.log(getReportHelp());
      return 0;
    }

    // Parse arguments
    const options = parseReportArgs(args);

    // Validate arguments
    const validation = validateReportArgs(options);
    if (!validation.valid) {
      console.error(formatCliError(validation.errors.join('\n')));
      return 1;
    }

    // Show warnings if any
    if (validation.warnings && validation.warnings.length > 0) {
      for (const warning of validation.warnings) {
        console.warn(`WARNING: ${warning}`);
      }
    }

    // Run report
    const output = runReport(options);
    console.log(output);
    return 0;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Audit log not found')) {
        console.error(formatCliError(error.message));
        return 2;
      }
      console.error(formatCliError(error.message));
      return 3;
    }
    console.error(formatCliError('Unexpected error occurred'));
    return 3;
  }
}

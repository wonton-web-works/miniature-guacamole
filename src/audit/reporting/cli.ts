/**
 * WS-TRACKING Phase 2: CLI Module
 *
 * Purpose: Command-line interface for generating reports.
 * Supports: --by-workstream, --by-agent, --format, --from, --to, --workstream
 */

import { readAuditLog, type TrackedAuditEntry } from './reader';
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
import { aggregateByWorkstreamPeriodic, type TimePeriod } from './periodic';
import { enhanceSummaryWithROI, generateSummaryDashboard, DEFAULT_ROI_CONFIG, type ROIConfig } from './roi';
import { readMultipleAuditLogs, aggregateCrossProject, parseProjectPaths } from './cross-project';

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
  // WS-AUDIT-2: New options
  period?: 'daily' | 'weekly' | 'monthly';
  hourlyRate?: number;
  summary?: boolean;
  projects?: string;
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

    // WS-AUDIT-2: --period=<value> or --period <value>
    if (arg.startsWith('--period=')) {
      const periodValue = arg.split('=')[1];
      const validPeriods = ['daily', 'weekly', 'monthly'];
      if (!periodValue || !validPeriods.includes(periodValue)) {
        throw new Error(`Invalid period: ${periodValue || '(empty)'}. Must be daily, weekly, or monthly.`);
      }
      options.period = periodValue as 'daily' | 'weekly' | 'monthly';
      continue;
    }
    if (arg === '--period' && i + 1 < args.length) {
      const periodValue = args[++i];
      const validPeriods = ['daily', 'weekly', 'monthly'];
      if (!periodValue || !validPeriods.includes(periodValue)) {
        throw new Error(`Invalid period: ${periodValue || '(empty)'}. Must be daily, weekly, or monthly.`);
      }
      options.period = periodValue as 'daily' | 'weekly' | 'monthly';
      continue;
    }

    // WS-AUDIT-2: --hourly-rate=<value> or --hourly-rate <value>
    if (arg.startsWith('--hourly-rate=')) {
      const rateValue = parseFloat(arg.split('=')[1]);
      if (isNaN(rateValue)) {
        throw new Error('Invalid hourly rate: must be a valid number');
      }
      if (rateValue < 0) {
        throw new Error('Negative hourly rate: hourly rate cannot be negative');
      }
      if (rateValue === 0) {
        throw new Error('Invalid hourly rate: must be greater than zero');
      }
      if (!isFinite(rateValue)) {
        throw new Error('Invalid hourly rate: must be a finite number');
      }
      if (rateValue > 10000) {
        throw new Error('Hourly rate too high: must be 10000 or less');
      }
      options.hourlyRate = rateValue;
      continue;
    }
    if (arg === '--hourly-rate' && i + 1 < args.length) {
      const rateValue = parseFloat(args[++i]);
      if (isNaN(rateValue)) {
        throw new Error('Invalid hourly rate: must be a valid number');
      }
      if (rateValue < 0) {
        throw new Error('Negative hourly rate: hourly rate cannot be negative');
      }
      if (rateValue === 0) {
        throw new Error('Invalid hourly rate: must be greater than zero');
      }
      if (!isFinite(rateValue)) {
        throw new Error('Invalid hourly rate: must be a finite number');
      }
      if (rateValue > 10000) {
        throw new Error('Hourly rate too high: must be 10000 or less');
      }
      options.hourlyRate = rateValue;
      continue;
    }

    // WS-AUDIT-2: --summary
    if (arg === '--summary') {
      options.summary = true;
      continue;
    }

    // WS-AUDIT-2: --projects=<paths> or --projects <paths>
    if (arg.startsWith('--projects=')) {
      const pathsValue = arg.split('=')[1];
      if (!pathsValue || pathsValue.trim() === '') {
        throw new Error('Invalid projects: path cannot be empty');
      }
      // Check for commas-only
      if (pathsValue.replace(/,/g, '').trim() === '') {
        throw new Error('Invalid projects: path cannot contain only commas');
      }
      if (pathsValue.includes('..')) {
        throw new Error('Path traversal detected: projects path cannot contain ..');
      }
      options.projects = pathsValue;
      continue;
    }
    if (arg === '--projects' && i + 1 < args.length) {
      const pathsValue = args[++i];
      if (!pathsValue || pathsValue.trim() === '') {
        throw new Error('Invalid projects: path cannot be empty');
      }
      // Check for commas-only
      if (pathsValue.replace(/,/g, '').trim() === '') {
        throw new Error('Invalid projects: path cannot contain only commas');
      }
      if (pathsValue.includes('..')) {
        throw new Error('Path traversal detected: projects path cannot contain ..');
      }
      options.projects = pathsValue;
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

  // WS-AUDIT-2: Validate period
  if (options.period) {
    const validPeriods = ['daily', 'weekly', 'monthly'];
    if (!validPeriods.includes(options.period)) {
      errors.push(`Invalid period: ${options.period}. Must be daily, weekly, or monthly.`);
    }

    // Period only works with --by-workstream
    if (options.byAgent) {
      errors.push('--period can only be used with --by-workstream');
    }
  }

  // WS-AUDIT-2: Validate hourly rate
  if (options.hourlyRate !== undefined) {
    if (isNaN(options.hourlyRate)) {
      errors.push('Invalid hourly rate: must be a valid number');
    } else if (options.hourlyRate <= 0) {
      errors.push('Invalid hourly rate: must be greater than zero');
    } else if (!isFinite(options.hourlyRate)) {
      errors.push('Invalid hourly rate: must be a finite number');
    } else if (options.hourlyRate > 10000) {
      errors.push('Hourly rate too high: must be 10000 or less');
    } else if (options.hourlyRate > 1000) {
      warnings.push('Unusually high hourly rate detected');
    }
  }

  // WS-AUDIT-2: Cannot combine --period and --summary
  if (options.period && options.summary) {
    errors.push('Cannot combine --period and --summary flags');
  }

  // WS-AUDIT-2: Validate projects paths
  if (options.projects) {
    try {
      parseProjectPaths(options.projects);
    } catch (error) {
      if (error instanceof Error) {
        errors.push(error.message);
      }
    }

    // Check if project directories exist
    const paths = options.projects.split(',').map(p => p.trim()).filter(p => p.length > 0);
    const fs = require('fs');
    for (const projectPath of paths) {
      if (!fs.existsSync(projectPath)) {
        errors.push(`Project directory not found: ${projectPath} does not exist`);
      }
    }
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
    // Validate period
    if (options.period) {
      const validPeriods: TimePeriod[] = ['daily', 'weekly', 'monthly'];
      if (!validPeriods.includes(options.period as TimePeriod)) {
        throw new Error(`Invalid period: ${options.period}`);
      }
    }

    // Validate hourly rate
    if (options.hourlyRate !== undefined && options.hourlyRate < 0) {
      throw new Error('Negative hourly rate not allowed');
    }

    // Read audit log(s)
    let entries: TrackedAuditEntry[];
    try {
      entries = options.projects
        ? aggregateCrossProject(readMultipleAuditLogs(parseProjectPaths(options.projects))).combined
        : readAuditLog(options.auditLogPath);
    } catch (error) {
      // If audit log not found and we're generating a summary, treat as empty data
      if (error instanceof Error && error.message.includes('Audit log not found') && options.summary) {
        entries = [];
      } else {
        throw error;
      }
    }

    if (entries.length === 0 && !options.summary) {
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

    // Build ROI config if hourly rate specified
    const roiConfig: ROIConfig = options.hourlyRate
      ? { ...DEFAULT_ROI_CONFIG, hourly_rate_usd: options.hourlyRate }
      : DEFAULT_ROI_CONFIG;

    // Generate report
    if (options.byAgent) {
      const breakdowns = aggregateByAgent(entries, aggOptions);
      return formatAgentBreakdown(breakdowns, options.format, dateRange);
    } else {
      // By workstream (default)

      // Handle periodic rollup
      if (options.period) {
        const periodicSummaries = aggregateByWorkstreamPeriodic(entries, options.period as TimePeriod);

        // Format periodic summaries (simplified table format)
        if (options.format === 'json') {
          return JSON.stringify(periodicSummaries, null, 2);
        } else {
          // Table format showing time buckets
          let output = 'Periodic Workstream Summary\n';
          output += '='.repeat(80) + '\n\n';
          for (const summary of periodicSummaries) {
            output += `Period: ${summary.time_bucket.label}\n`;
            output += `Workstream: ${summary.workstream_id || '(none)'}\n`;
            output += `Requests: ${summary.request_count}\n`;
            output += `Cost: $${summary.total_cost_usd.toFixed(6)}\n`;
            output += '-'.repeat(40) + '\n';
          }
          return output.trim();
        }
      }

      // Handle summary dashboard
      if (options.summary) {
        let summaries = aggregateByWorkstream(entries, aggOptions);
        const summariesWithROI = enhanceSummaryWithROI(summaries, roiConfig);
        const dashboard = generateSummaryDashboard(
          summariesWithROI,
          options.from && options.to ? { from: options.from, to: options.to } : undefined
        );

        if (options.format === 'json') {
          return JSON.stringify(dashboard, null, 2);
        } else {
          // Table format for dashboard
          let output = 'Summary Dashboard\n';
          output += '='.repeat(80) + '\n';
          output += `total spend:             $${dashboard.total_agent_cost_usd.toFixed(2)}\n`;
          output += `total savings:           $${dashboard.total_savings_usd.toFixed(2)}\n`;
          output += `Workstream Count:        ${dashboard.workstream_count}\n`;
          output += `Average Cost per Workstream: $${dashboard.average_cost_per_workstream_usd.toFixed(2)}\n`;
          if (dashboard.date_range) {
            output += `Date Range:              ${dashboard.date_range.from} to ${dashboard.date_range.to}\n`;
          }
          return output;
        }
      }

      // Regular workstream summary (with optional ROI)
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

      // Add ROI data if hourly rate specified
      if (options.hourlyRate) {
        const summariesWithROI = enhanceSummaryWithROI(summaries, roiConfig);

        if (options.format === 'json') {
          return JSON.stringify(summariesWithROI, null, 2);
        } else {
          // Table format with ROI columns
          let output = 'Workstream Summary (with ROI)\n';
          output += '='.repeat(120) + '\n';
          output += 'Workstream'.padEnd(15) +
                    'Requests'.padEnd(10) +
                    'Agent Cost'.padEnd(12) +
                    'Human Est.'.padEnd(12) +
                    'Savings'.padEnd(12) +
                    'Savings %'.padEnd(12) +
                    'Est. Hours\n';
          output += '-'.repeat(120) + '\n';

          for (const summary of summariesWithROI) {
            output += `${(summary.workstream_id || '(none)').padEnd(15)}`;
            output += `${String(summary.request_count).padEnd(10)}`;
            output += `$${summary.roi.agent_cost_usd.toFixed(2).padEnd(11)}`;
            output += `$${summary.roi.human_cost_estimate_usd.toFixed(2).padEnd(11)}`;
            output += `$${summary.roi.savings_usd.toFixed(2).padEnd(11)}`;
            output += `${summary.roi.savings_percentage.toFixed(1)}%`.padEnd(12);
            output += `${summary.roi.estimated_human_hours.toFixed(1)}\n`;
          }
          return output;
        }
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
  --period=<period>          Time period: daily, weekly, monthly (for --by-workstream)
  --hourly-rate=<rate>       Developer hourly rate in USD (for ROI calculations)
  --summary                  Show summary dashboard with total costs and savings
  --projects=<paths>         Comma-separated project directory paths (cross-project aggregation, synchronous read)
  --help                     Show this help message

Examples:
  claude-audit report --by-workstream
  claude-audit report --by-agent --workstream=WS-18
  claude-audit report --by-workstream --format=json
  claude-audit report --by-workstream --from=2026-02-01 --to=2026-02-04
  claude-audit report --by-workstream --period=daily
  claude-audit report --by-workstream --hourly-rate=150
  claude-audit report --by-workstream --summary
  claude-audit report --projects=/path/to/proj1,/path/to/proj2
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

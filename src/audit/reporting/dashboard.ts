/**
 * GH-82: Dashboard Triage Stats
 *
 * Purpose: Read triage-log.json and render a dashboard with triage statistics.
 * DashboardData.triageStats includes {go, needsInfo, rejected} counts.
 * Graceful fallback when triage-log.json is missing or empty.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Triage statistics aggregated from triage log entries.
 */
export interface TriageStats {
  go: number;
  needsInfo: number;
  rejected: number;
}

/**
 * A single triage log entry persisted in triage-log.json.
 */
export interface TriageLogEntry {
  verdict: string;
  timestamp: string;
}

/**
 * Dashboard data combining all dashboard sections.
 */
export interface DashboardData {
  triageStats: TriageStats;
}

/**
 * Options for the dashboard CLI command.
 */
export interface DashboardOptions {
  format?: 'table' | 'json';
  triageLogPath?: string;
}

/**
 * Default triage log path relative to .mg-daemon/.
 */
const DEFAULT_TRIAGE_LOG = '.mg-daemon/triage-log.json';

/**
 * Returns zeroed triage stats.
 */
function zeroedStats(): TriageStats {
  return { go: 0, needsInfo: 0, rejected: 0 };
}

/**
 * Validates that a file path is safe to read.
 * Rejects path traversal and non-JSON extensions.
 */
function validateTriageLogPath(filePath: string): void {
  if (!filePath || filePath.trim() === '') {
    throw new Error('Invalid path: path cannot be empty');
  }

  const normalized = path.normalize(filePath);
  if (filePath.includes('..') || normalized.includes('..') ||
      filePath.includes('%2e%2e') || filePath.includes('%2F')) {
    throw new Error('Invalid path: path traversal detected');
  }

  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.json') {
    throw new Error('Invalid path: only .json files are allowed');
  }
}

/**
 * Reads and aggregates triage stats from a triage-log.json file.
 *
 * The file is expected to contain a JSON array of TriageLogEntry objects.
 * Each entry has a `verdict` field: "GO", "NEEDS_INFO", or "REJECT".
 *
 * Graceful fallback: returns zeroed stats if file is missing, empty,
 * malformed, or unreadable.
 *
 * @throws Error only for path validation failures (traversal, wrong extension, empty path)
 */
export function readTriageLog(logPath: string): TriageStats {
  // Validate path (throws on traversal or wrong extension)
  validateTriageLogPath(logPath);

  // Graceful fallback for missing file
  if (!fs.existsSync(logPath)) {
    return zeroedStats();
  }

  let content: string;
  try {
    content = fs.readFileSync(logPath, 'utf8');
  } catch {
    return zeroedStats();
  }

  if (!content || content.trim() === '') {
    return zeroedStats();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return zeroedStats();
  }

  if (!Array.isArray(parsed)) {
    return zeroedStats();
  }

  const stats = zeroedStats();

  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object' || typeof entry.verdict !== 'string') {
      continue;
    }

    const verdict = entry.verdict.toUpperCase();

    switch (verdict) {
      case 'GO':
        stats.go++;
        break;
      case 'NEEDS_INFO':
        stats.needsInfo++;
        break;
      case 'REJECT':
        stats.rejected++;
        break;
      // Unknown verdicts are silently ignored
    }
  }

  return stats;
}

/**
 * Gathers all dashboard data. Catches errors from readTriageLog
 * and returns zeroed triage stats on failure.
 */
export function gatherDashboardData(options: DashboardOptions): DashboardData {
  const triageLogPath = options.triageLogPath || DEFAULT_TRIAGE_LOG;

  let triageStats: TriageStats;
  try {
    triageStats = readTriageLog(triageLogPath);
  } catch {
    triageStats = zeroedStats();
  }

  return { triageStats };
}

/**
 * Formats dashboard data for display.
 *
 * @param data - Dashboard data to format
 * @param format - Output format: 'table' (default) or 'json'
 * @returns Formatted dashboard string
 */
export function formatDashboard(data: DashboardData, format: 'table' | 'json' = 'table'): string {
  if (format === 'json') {
    return JSON.stringify(data, null, 2);
  }

  // Clamp negative values to 0
  const go = Math.max(0, data.triageStats.go);
  const needsInfo = Math.max(0, data.triageStats.needsInfo);
  const rejected = Math.max(0, data.triageStats.rejected);
  const total = go + needsInfo + rejected;

  let output = 'Dashboard\n';
  output += '='.repeat(40) + '\n\n';
  output += 'TRIAGE\n';
  output += '-'.repeat(40) + '\n';
  output += `GO:          ${go}\n`;
  output += `NEEDS_INFO:  ${needsInfo}\n`;
  output += `REJECT:      ${rejected}\n`;
  output += '-'.repeat(40) + '\n';
  output += `Total:       ${total}\n`;

  return output;
}

/**
 * Parses CLI arguments for the dashboard command.
 */
export function parseDashboardArgs(args: string[]): DashboardOptions {
  const options: DashboardOptions = {
    format: 'table',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === 'dashboard') {
      continue;
    }

    if (arg.startsWith('--format=')) {
      options.format = arg.split('=')[1] as 'table' | 'json';
      continue;
    }
    if (arg === '--format' && i + 1 < args.length) {
      options.format = args[++i] as 'table' | 'json';
      continue;
    }

    if (arg.startsWith('--triage-log=')) {
      options.triageLogPath = arg.split('=')[1];
      continue;
    }
    if (arg === '--triage-log' && i + 1 < args.length) {
      options.triageLogPath = args[++i];
      continue;
    }
  }

  return options;
}

/**
 * Returns help text for the dashboard command.
 */
export function getDashboardHelp(): string {
  return `
Usage: mg-daemon dashboard [options]

Options:
  --format=<format>        Output format: table (default), json
  --triage-log=<path>      Path to triage-log.json (default: .mg-daemon/triage-log.json)
  --help                   Show this help message

Examples:
  mg-daemon dashboard
  mg-daemon dashboard --format=json
  mg-daemon dashboard --triage-log=.mg-daemon/triage-log.json
  `.trim();
}

/**
 * Runs the dashboard CLI with the given arguments.
 * Returns exit code.
 */
export function runDashboardCli(args: string[]): number {
  if (args.includes('--help')) {
    console.log(getDashboardHelp());
    return 0;
  }

  const options = parseDashboardArgs(args);
  const data = gatherDashboardData(options);
  const output = formatDashboard(data, options.format);
  console.log(output);
  return 0;
}

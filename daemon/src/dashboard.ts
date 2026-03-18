// Pipeline dashboard for the mg-daemon
// WS-DAEMON-14: Pipeline Observability & Safety

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { statusDaemon } from './process';
import { isStale } from './heartbeat';
import type { DaemonConfig, ProcessedTicket } from './types';

export interface InFlightTicket {
  id: string;
  status: 'processing';
  startedAt: string;
}

export interface CompletedTicket {
  id: string;
  prUrl: string;
  completedAt: string;
}

export interface FailedTicket {
  id: string;
  error: string;
  failedAt: string;
}

export interface DashboardData {
  daemonStatus: { running: boolean; pid?: number; uptimeMs?: number };
  lastPollTime: string | null;
  heartbeatStale: boolean;
  inFlightTickets: InFlightTicket[];
  recentCompleted: CompletedTicket[];
  recentFailed: FailedTicket[];
  errorBudget: { consecutive: number; threshold: number; paused: boolean };
}

// ─── File paths ──────────────────────────────────────────────────────────────

const MG_DIR = join(process.cwd(), '..', '.mg-daemon');
const PROCESSED_FILE = join(MG_DIR, 'processed.json');
const ERROR_BUDGET_FILE = join(MG_DIR, 'error-budget.json');
const LAST_POLL_FILE = join(MG_DIR, 'last-poll.json');
const HEARTBEAT_PATH = join(MG_DIR, 'heartbeat');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readJsonFile<T>(filePath: string): T | null {
  try {
    if (!existsSync(filePath)) return null;
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

// ─── gatherDashboardData ──────────────────────────────────────────────────────

/**
 * Gather all dashboard data from daemon state files.
 */
export function gatherDashboardData(config: DaemonConfig): DashboardData {
  // Daemon status
  const daemonStatus = statusDaemon();

  // Heartbeat staleness
  const heartbeatConfig = {
    heartbeatPath: HEARTBEAT_PATH,
    intervalMs: config.polling.intervalSeconds * 1000,
  };
  const heartbeatStale = isStale(heartbeatConfig);

  // Processed tickets
  const processedRaw = readJsonFile<Record<string, ProcessedTicket>>(PROCESSED_FILE) ?? {};

  const inFlightTickets: InFlightTicket[] = [];
  const recentCompleted: CompletedTicket[] = [];
  const recentFailed: FailedTicket[] = [];

  for (const [id, ticket] of Object.entries(processedRaw)) {
    if (ticket.status === 'processing') {
      inFlightTickets.push({ id, status: 'processing', startedAt: ticket.processedAt });
    } else if (ticket.status === 'complete' && ticket.prUrl) {
      recentCompleted.push({ id, prUrl: ticket.prUrl, completedAt: ticket.processedAt });
    } else if (ticket.status === 'failed' && ticket.error) {
      recentFailed.push({ id, error: ticket.error, failedAt: ticket.processedAt });
    }
  }

  // Error budget
  const threshold = config.orchestration?.errorBudget ?? 3;
  const budgetRaw = readJsonFile<{ consecutiveFailures: number; paused: boolean }>(
    ERROR_BUDGET_FILE
  );
  const errorBudget = {
    consecutive: budgetRaw?.consecutiveFailures ?? 0,
    threshold,
    paused: budgetRaw?.paused ?? false,
  };

  // Last poll time
  const pollRaw = readJsonFile<{ timestamp: string }>(LAST_POLL_FILE);
  const lastPollTime = pollRaw?.timestamp ?? null;

  return {
    daemonStatus,
    lastPollTime,
    heartbeatStale,
    inFlightTickets,
    recentCompleted,
    recentFailed,
    errorBudget,
  };
}

// ─── formatDashboard ─────────────────────────────────────────────────────────

// Inner width: 78 chars, total line = 80 (borders + space)
const WIDTH = 78;
const BORDER_TOP    = `┌${'─'.repeat(WIDTH)}┐`;
const BORDER_MID    = `├${'─'.repeat(WIDTH)}┤`;
const BORDER_BOTTOM = `└${'─'.repeat(WIDTH)}┘`;

function row(text: string): string {
  return `│ ${text.padEnd(WIDTH - 2)} │`;
}

function centeredRow(text: string): string {
  const padTotal = WIDTH - 2 - text.length;
  const left = Math.floor(padTotal / 2);
  const right = padTotal - left;
  return `│${' '.repeat(left + 1)}${text}${' '.repeat(right + 1)}│`;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

function formatUptime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function relativeTime(isoTimestamp: string): string {
  try {
    const diffMs = Date.now() - new Date(isoTimestamp).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin === 1) return '1m ago';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    return `${diffH}h ago`;
  } catch {
    return isoTimestamp;
  }
}

/**
 * Format dashboard data for terminal display (80 columns).
 */
export function formatDashboard(data: DashboardData): string {
  const lines: string[] = [];

  lines.push(BORDER_TOP);
  lines.push(centeredRow('MG DAEMON DASHBOARD'));
  lines.push(BORDER_MID);

  // Status row
  const { daemonStatus } = data;
  let statusStr: string;
  if (daemonStatus.running && daemonStatus.pid !== undefined) {
    const uptime = daemonStatus.uptimeMs !== undefined ? formatUptime(daemonStatus.uptimeMs) : '?';
    statusStr = `Running (PID: ${daemonStatus.pid}, uptime: ${uptime})`;
  } else {
    statusStr = 'Stopped';
  }
  lines.push(row(`Status:    ${statusStr}`));

  // Last poll
  const pollStr = data.lastPollTime ?? 'Never';
  lines.push(row(`Last Poll: ${pollStr}`));

  // Heartbeat
  const hbStr = data.heartbeatStale ? 'STALE (warn)' : 'OK';
  lines.push(row(`Heartbeat: ${hbStr}`));

  // Error budget
  const { errorBudget } = data;
  const budgetStr = errorBudget.paused
    ? `PAUSED (${errorBudget.consecutive}/${errorBudget.threshold} failures)`
    : `${errorBudget.consecutive}/${errorBudget.threshold} (budget OK)`;
  lines.push(row(`Errors:    ${budgetStr}`));

  // IN-FLIGHT
  lines.push(BORDER_MID);
  lines.push(row('IN-FLIGHT'));
  if (data.inFlightTickets.length === 0) {
    lines.push(row('  (none)'));
  } else {
    for (const ticket of data.inFlightTickets) {
      const rel = relativeTime(ticket.startedAt);
      const line = truncate(`  ${ticket.id}  │ ${ticket.status} │ started ${rel}`, WIDTH - 2);
      lines.push(row(line));
    }
  }

  // RECENT COMPLETED
  lines.push(BORDER_MID);
  lines.push(row('RECENT COMPLETED'));
  if (data.recentCompleted.length === 0) {
    lines.push(row('  (none)'));
  } else {
    for (const ticket of data.recentCompleted) {
      const line = truncate(`  ${ticket.id}  │ ${ticket.prUrl}`, WIDTH - 2);
      lines.push(row(line));
    }
  }

  // RECENT FAILED
  lines.push(BORDER_MID);
  lines.push(row('RECENT FAILED'));
  if (data.recentFailed.length === 0) {
    lines.push(row('  (none)'));
  } else {
    for (const ticket of data.recentFailed) {
      const line = truncate(`  ${ticket.id}  │ ${ticket.error}`, WIDTH - 2);
      lines.push(row(line));
    }
  }

  lines.push(BORDER_BOTTOM);
  return lines.join('\n');
}

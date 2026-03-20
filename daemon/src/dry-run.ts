// Dry-run support for the mg-daemon pipeline
// WS-DAEMON-14: Pipeline Observability & Safety

import type { WorkstreamPlan } from './planner';
import type { TriageResult } from './triage';

export type { WorkstreamPlan };

export interface DryRunResult {
  ticketId: string;
  ticketTitle: string;
  plannedWorkstreams: WorkstreamPlan[];
  wouldCreatePR: boolean;
  wouldCreateSubtasks: number;
  triageResult?: TriageResult;
}

// Box-drawing constants — all output must fit 80 columns
const WIDTH = 78; // inner width (border chars use 2 more = 80 total)
const BORDER_TOP    = `┌${'─'.repeat(WIDTH)}┐`;
const BORDER_MID    = `├${'─'.repeat(WIDTH)}┤`;
const BORDER_BOTTOM = `└${'─'.repeat(WIDTH)}┘`;

function pad(text: string): string {
  return `│ ${text.padEnd(WIDTH - 2)} │`;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

/**
 * Format dry-run results for terminal display (80 columns).
 */
export function formatDryRunReport(results: DryRunResult[]): string {
  const lines: string[] = [];

  lines.push(BORDER_TOP);
  lines.push(pad('DRY RUN REPORT'.padStart(Math.floor((WIDTH - 2 + 14) / 2)).padEnd(WIDTH - 2)));
  lines.push(BORDER_MID);

  if (results.length === 0) {
    lines.push(pad('No tickets would be processed.'));
    lines.push(BORDER_BOTTOM);
    return lines.join('\n');
  }

  lines.push(pad(`${results.length} ticket(s) would be processed (no changes made)`));

  for (const result of results) {
    lines.push(BORDER_MID);

    const titleLine = truncate(`${result.ticketId}  ${result.ticketTitle}`, WIDTH - 2);
    lines.push(pad(titleLine));

    if (result.triageResult) {
      const triageLine = truncate(`  Triage: ${result.triageResult.outcome} — ${result.triageResult.reason}`, WIDTH - 2);
      lines.push(pad(triageLine));
    }

    if (result.wouldCreatePR) {
      lines.push(pad('  Would create PR'));
    }

    if (result.wouldCreateSubtasks > 0) {
      lines.push(pad(`  Would create ${result.wouldCreateSubtasks} subtask(s)`));
    }

    if (result.plannedWorkstreams.length > 0) {
      lines.push(pad('  Workstreams:'));
      for (const ws of result.plannedWorkstreams) {
        const wsName = truncate(`    - ${ws.name}`, WIDTH - 2);
        lines.push(pad(wsName));
        const ac = truncate(`      AC: ${ws.acceptanceCriteria}`, WIDTH - 2);
        lines.push(pad(ac));
      }
    }
  }

  lines.push(BORDER_BOTTOM);
  return lines.join('\n');
}

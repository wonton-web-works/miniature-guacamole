// Git worktree management for miniature-guacamole daemon
// WS-DAEMON-11: MG Orchestration Engine

import { spawnSync } from 'child_process';

// Dependency-injectable execSync type for testing
// Kept as string-command type for backward compat with existing tests
export type ExecSyncFn = (command: string, options: Record<string, unknown>) => Buffer;

const WORKTREE_BASE = '.mg-daemon/worktrees';

/**
 * Creates a slug from text for use in branch names.
 * - Converts to lowercase
 * - Replaces special chars and spaces with single dash
 * - Removes leading/trailing dashes
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Create a git worktree for a ticket.
 * Path: .mg-daemon/worktrees/{ticketId}/
 * Branch: feature/{ticketId}-{slug}
 *
 * MED-2: Validates ticketId to prevent path/command injection.
 */
export function createWorktree(
  ticketId: string,
  summary: string,
  baseBranch: string,
  execSyncFn: ExecSyncFn = spawnSyncAdapter
): { worktreePath: string; branchName: string } {
  // MED-2: Reject ticket IDs that could inject into git args or paths
  if (!/^[A-Za-z0-9_\-]{1,50}$/.test(ticketId)) {
    throw new Error(`Unsafe ticket ID rejected: ${ticketId}`);
  }

  const slug = slugify(summary);

  // Build branch name with truncation to max 60 chars total
  const prefix = `feature/${ticketId}-`;
  const maxSlugLength = 60 - prefix.length;
  const truncatedSlug = slug.substring(0, Math.max(0, maxSlugLength));
  const branchName = `${prefix}${truncatedSlug}`;

  const worktreePath = `${WORKTREE_BASE}/${ticketId}`;

  execSyncFn(
    `git worktree add ${worktreePath} -b ${branchName} ${baseBranch}`,
    { cwd: process.cwd() }
  );

  return { worktreePath, branchName };
}

/**
 * Remove a git worktree after PR creation.
 */
export function removeWorktree(
  worktreePath: string,
  execSyncFn: ExecSyncFn = spawnSyncAdapter
): void {
  execSyncFn(`git worktree remove ${worktreePath} --force`, { cwd: process.cwd() });
}

/**
 * List active worktrees managed by the daemon.
 * Parses `git worktree list` output and returns daemon-managed worktree paths.
 */
export function listWorktrees(
  execSyncFn: ExecSyncFn = spawnSyncAdapter
): string[] {
  const output = execSyncFn('git worktree list --porcelain', { cwd: process.cwd() });
  const text = output.toString();

  const paths: string[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Porcelain format: "worktree <path>"
    if (trimmed.startsWith('worktree ')) {
      const path = trimmed.slice('worktree '.length).trim();
      if (path && path.includes(WORKTREE_BASE)) {
        paths.push(path);
      }
    } else if (trimmed.includes(WORKTREE_BASE)) {
      // Fallback: plain path lines containing worktree base dir
      paths.push(trimmed);
    }
  }

  return paths.filter((p) => p.length > 0);
}

/**
 * Adapter that translates the legacy string-command interface used by the
 * dependency-injectable ExecSyncFn type into a spawnSync call.
 * This keeps the public API stable while the underlying execution is safe.
 *
 * NOTE: The string command is split naively on whitespace. This is acceptable
 * because all callers in this file construct the command from controlled values
 * (WORKTREE_BASE constant, validated ticketId, slugified branchName, baseBranch).
 * If this function is ever used with arbitrary strings, switch to a typed argv array.
 */
function spawnSyncAdapter(command: string, options: Record<string, unknown>): Buffer {
  const [cmd, ...args] = command.split(' ');
  const result = spawnSync(cmd, args, {
    ...options,
    encoding: 'buffer',
  } as Parameters<typeof spawnSync>[2]);

  if (result.status !== 0) {
    const stderr = result.stderr?.toString().trim() ?? '';
    throw new Error(stderr || `${cmd} failed`);
  }

  return result.stdout as Buffer;
}

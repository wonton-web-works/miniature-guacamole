// Git operations module for miniature-guacamole daemon
// WS-DAEMON-5: Git Client

import { execSync } from 'child_process';
import type { DaemonConfig, TicketData } from './types';

/**
 * Creates a slug from summary text
 * - Convert to lowercase
 * - Replace special chars and spaces with single dash
 * - Remove leading/trailing dashes
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Creates a new feature branch for the given ticket
 * AC-5.1: Creates branch 'feature/PROJ-123-slug' from baseBranch
 * AC-5.2: Branch name slug truncation (max 60 chars total)
 * AC-5.3: Idempotent branch creation (checks out if exists)
 * AC-5.9: Git operations shell out to git CLI via child_process.execSync
 */
export function createBranch(ticketData: TicketData, config: DaemonConfig): string {
  const { key, summary } = ticketData;
  const { baseBranch } = config.github;

  // Create slug from summary
  const slug = slugify(summary);

  // Build branch name with truncation to max 60 chars
  const prefix = `feature/${key}-`;
  const maxSlugLength = 60 - prefix.length;
  const truncatedSlug = slug.substring(0, maxSlugLength);
  const branchName = `${prefix}${truncatedSlug}`;

  const options = { cwd: process.cwd() };

  try {
    // Checkout base branch first
    execSync(`git checkout ${baseBranch}`, options);

    // Try to create new branch
    execSync(`git checkout -b ${branchName}`, options);
  } catch (error) {
    // If branch already exists, checkout existing branch (idempotent)
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('already exists')) {
      execSync(`git checkout ${branchName}`, options);
    } else {
      throw error;
    }
  }

  return branchName;
}

/**
 * Commits all changes with a formatted commit message
 * AC-5.4: Stages all and commits with 'feat(KEY): message'
 * AC-5.9: Git operations shell out to git CLI via child_process.execSync
 */
export function commitChanges(ticketKey: string, summary: string, config: DaemonConfig): void {
  const options = { cwd: process.cwd() };

  // Stage all changes
  execSync('git add -A', options);

  // Commit with formatted message
  execSync(`git commit -m "feat(${ticketKey}): ${summary}"`, options);
}

/**
 * Pushes the current branch to origin with upstream tracking
 * AC-5.5: Pushes with -u origin flag
 * AC-5.9: Git operations shell out to git CLI via child_process.execSync
 */
export function pushBranch(branchName: string, config: DaemonConfig): void {
  const options = { cwd: process.cwd() };
  execSync(`git push -u origin ${branchName}`, options);
}

/**
 * Cleans up feature branch by checking out base and deleting feature branch
 * AC-5.11: Checks out base and deletes feature branch
 * AC-5.9: Git operations shell out to git CLI via child_process.execSync
 */
export function cleanupBranch(branchName: string, baseBranch: string, config: DaemonConfig): void {
  const options = { cwd: process.cwd() };

  // Checkout base branch
  execSync(`git checkout ${baseBranch}`, options);

  // Delete feature branch
  execSync(`git branch -D ${branchName}`, options);
}

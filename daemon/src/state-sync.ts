// Lifecycle State Sync
// WS-DAEMON-18: State sync module — persists workstream state and decisions to memory files

import * as fs from 'fs';
import * as path from 'path';
import type { ReviewResult, ReviewDecision, WorkstreamTrack } from './reviewer';
import type { MergeResult } from './merger';

export type WorkstreamPhase =
  | 'planning'
  | 'executing'
  | 'reviewing'
  | 'approved'
  | 'changes_requested'
  | 'merged'
  | 'failed';

export interface WorkstreamState {
  workstreamId: string;
  ticketId: string;
  phase: WorkstreamPhase;
  track?: WorkstreamTrack;
  reviewResult?: ReviewResult;
  mergeResult?: MergeResult;
  updatedAt: string;
}

/**
 * Resolve a safe file path under memoryDir.
 * Strips null bytes from the id segments and ensures the result stays under memoryDir.
 */
function safeStatePath(workstreamId: string, memoryDir: string): string {
  // Strip null bytes and sanitize id for use in filename
  const safeId = workstreamId.replace(/\0/g, '').replace(/[/\\]/g, '_');
  const resolvedDir = path.resolve(memoryDir);
  const candidate = path.join(resolvedDir, `workstream-${safeId}-state.json`);
  const resolvedCandidate = path.resolve(candidate);
  // Ensure resolved path stays under memoryDir — throw on traversal attempt
  if (!resolvedCandidate.startsWith(resolvedDir + path.sep) && resolvedCandidate !== resolvedDir) {
    throw new Error(
      `Path traversal detected: workstreamId "${workstreamId}" resolves outside memoryDir`
    );
  }
  return resolvedCandidate;
}

/**
 * Write workstream state to disk.
 * Always sets workstreamId, ticketId, and updatedAt.
 * Validates resolved path stays under memoryDir to prevent path traversal.
 */
export function writeWorkstreamState(
  workstreamId: string,
  ticketId: string,
  state: Partial<WorkstreamState>,
  memoryDir: string
): void {
  // Strip null bytes from ticketId
  const safeTicketId = ticketId.replace(/\0/g, '');
  const resolvedDir = path.resolve(memoryDir);

  // Ensure directory exists
  fs.mkdirSync(resolvedDir, { recursive: true });

  const filePath = safeStatePath(workstreamId, memoryDir);

  const fullState: WorkstreamState = {
    ...state,
    workstreamId,
    ticketId: safeTicketId,
    updatedAt: new Date().toISOString(),
  } as WorkstreamState;

  fs.writeFileSync(filePath, JSON.stringify(fullState, null, 2), 'utf-8');
}

/**
 * Read workstream state from disk.
 * Returns null on missing file, invalid JSON, or wrong shape.
 */
export function readWorkstreamState(
  workstreamId: string,
  ticketId: string,
  memoryDir: string
): WorkstreamState | null {
  const filePath = safeStatePath(workstreamId, memoryDir);

  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    if (!raw || !raw.trim()) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);

    // Must be an object (not array, not null)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null;
    }

    return parsed as WorkstreamState;
  } catch {
    return null;
  }
}

/**
 * Append a review decision to decisions.json.
 * Creates the file if missing, recovers if corrupt (starts fresh).
 * Always writes valid JSON.
 */
export function appendDecision(
  ticketId: string,
  workstreamId: string,
  decision: ReviewDecision,
  feedback: string,
  memoryDir: string
): void {
  const resolvedDir = path.resolve(memoryDir);
  const decisionsPath = path.join(resolvedDir, 'decisions.json');

  // Ensure directory exists
  if (!fs.existsSync(resolvedDir)) {
    fs.mkdirSync(resolvedDir, { recursive: true });
  }

  // Load existing decisions — recover on missing or corrupt
  let existing: unknown[] = [];
  if (fs.existsSync(decisionsPath)) {
    try {
      const raw = fs.readFileSync(decisionsPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        existing = parsed;
      }
      // If parsed is not an array, start fresh
    } catch {
      // Corrupt JSON — start fresh
      existing = [];
    }
  }

  const entry = {
    ticketId,
    workstreamId,
    decision,
    feedback,
    timestamp: new Date().toISOString(),
  };

  existing.push(entry);

  fs.writeFileSync(decisionsPath, JSON.stringify(existing, null, 2), 'utf-8');
}

/**
 * WS-20: Art Director Approval Workflow - Commands Module
 *
 * CLI-style commands for reviewing and approving visuals.
 * Integrates with metadata system and approval tracking.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { MetadataEntry } from '../metadata/types';
import { recordApproval } from './approvals';
import type { ReviewOptions, BatchApprovalResult, BatchOptions } from './types';

const METADATA_FILE = '.claude/visuals/visual-metadata.json';

/**
 * Lists pending visuals for review.
 * Supports filtering by workstream and status.
 * Returns results sorted by created_at.
 */
export async function reviewVisuals(
  options: ReviewOptions = {}
): Promise<MetadataEntry[]> {
  const metadataPath = path.resolve(process.cwd(), METADATA_FILE);

  // Return empty array if metadata file doesn't exist
  if (!fs.existsSync(metadataPath)) {
    return [];
  }

  try {
    const content = await fs.promises.readFile(metadataPath, 'utf8');
    let metadata: MetadataEntry[] = JSON.parse(content);

    // Apply filters
    if (options.workstream_id) {
      metadata = metadata.filter(entry => entry.workstream_id === options.workstream_id);
    }

    if (options.status) {
      metadata = metadata.filter(entry => entry.status === options.status);
    }

    // Sort by created_at ascending (chronological order)
    metadata.sort((a, b) => {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    return metadata;
  } catch (error) {
    return [];
  }
}

/**
 * Approves a visual, moving it to the approved/ directory.
 * Updates metadata status and records approval.
 */
export async function approveVisual(
  visualId: string,
  reviewer: string
): Promise<MetadataEntry> {
  const metadataPath = path.resolve(process.cwd(), METADATA_FILE);

  // Read metadata
  if (!fs.existsSync(metadataPath)) {
    throw new Error(`Visual not found: ${visualId}`);
  }

  const content = await fs.promises.readFile(metadataPath, 'utf8');
  const metadata: MetadataEntry[] = JSON.parse(content);

  // Find visual
  const visual = metadata.find(entry => entry.id === visualId);
  if (!visual) {
    throw new Error(`Visual not found: ${visualId}`);
  }

  // Check if already approved
  if (visual.status === 'approved') {
    throw new Error(`Visual already approved: ${visualId}`);
  }

  // Move file from pending/ to approved/
  const oldPath = visual.file_path;
  const newPath = oldPath.replace('/pending/', '/approved/');

  try {
    // Ensure approved directory exists
    const approvedDir = path.dirname(path.resolve(process.cwd(), newPath));
    if (!fs.existsSync(approvedDir)) {
      await fs.promises.mkdir(approvedDir, { recursive: true });
    }

    // Move file (use original paths from metadata, which are relative)
    await fs.promises.rename(oldPath, newPath);
  } catch (error: any) {
    if (error.code === 'EACCES') {
      throw new Error('EACCES: permission denied');
    } else if (error.code === 'ENOENT') {
      throw new Error('File not found');
    }
    throw error;
  }

  // Update metadata
  visual.status = 'approved';
  visual.file_path = newPath;
  visual.updated_at = new Date().toISOString();

  // Write updated metadata
  await fs.promises.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

  // Record approval
  await recordApproval({
    visual_id: visualId,
    action: 'approved',
    reviewer,
    timestamp: new Date().toISOString(),
  });

  return visual;
}

/**
 * Rejects a visual, keeping it in pending/ directory.
 * Updates metadata status and records rejection with feedback.
 */
export async function rejectVisual(
  visualId: string,
  reviewer: string,
  feedback: string
): Promise<MetadataEntry> {
  // Validate feedback
  if (!feedback || feedback.trim() === '') {
    throw new Error('Feedback is required when rejecting a visual');
  }

  const metadataPath = path.resolve(process.cwd(), METADATA_FILE);

  // Read metadata
  if (!fs.existsSync(metadataPath)) {
    throw new Error(`Visual not found: ${visualId}`);
  }

  const content = await fs.promises.readFile(metadataPath, 'utf8');
  const metadata: MetadataEntry[] = JSON.parse(content);

  // Find visual
  const visual = metadata.find(entry => entry.id === visualId);
  if (!visual) {
    throw new Error(`Visual not found: ${visualId}`);
  }

  // Check if already approved
  if (visual.status === 'approved') {
    throw new Error(`Cannot reject approved visual: ${visualId}`);
  }

  // Update metadata status
  visual.status = 'rejected';
  visual.updated_at = new Date().toISOString();

  // Write updated metadata
  await fs.promises.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

  // Record rejection with feedback
  await recordApproval({
    visual_id: visualId,
    action: 'rejected',
    reviewer,
    timestamp: new Date().toISOString(),
    feedback,
  });

  return visual;
}

/**
 * Batch approves all pending visuals.
 * Requires explicit confirmation flag to prevent accidental bulk operations.
 */
export async function batchApproveAll(
  reviewer: string,
  confirmed: boolean,
  options: BatchOptions = {}
): Promise<BatchApprovalResult> {
  // Require confirmation
  if (!confirmed) {
    throw new Error('Batch approval requires explicit confirmation');
  }

  // Get all pending visuals
  const pendingVisuals = await reviewVisuals({
    status: 'pending',
    ...options,
  });

  const result: BatchApprovalResult = {
    approved_count: 0,
    visual_ids: [],
    failed_count: 0,
    failed_ids: [],
  };

  // Approve each visual
  for (const visual of pendingVisuals) {
    try {
      await approveVisual(visual.id, reviewer);
      result.approved_count++;
      result.visual_ids.push(visual.id);
    } catch (error) {
      result.failed_count = (result.failed_count || 0) + 1;
      result.failed_ids = result.failed_ids || [];
      result.failed_ids.push(visual.id);
    }
  }

  return result;
}

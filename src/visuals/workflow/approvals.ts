/**
 * WS-20: Art Director Approval Workflow - Approvals Module
 *
 * Manages approval records in visual-approvals.json.
 * Provides atomic writes and query capabilities.
 */

import * as fs from 'fs';
import * as path from 'path';
import { VISUAL_CONFIG } from '../config';
import type { ApprovalRecord, ApprovalAction } from './types';

const APPROVALS_FILE = '.claude/visuals/visual-approvals.json';

/**
 * Records an approval or rejection action.
 * Uses atomic writes to prevent data corruption.
 */
export async function recordApproval(record: ApprovalRecord): Promise<ApprovalRecord> {
  // Validate inputs
  if (!record.visual_id || record.visual_id.trim() === '') {
    throw new Error('visual_id is required');
  }

  if (!record.action || (record.action !== 'approved' && record.action !== 'rejected')) {
    throw new Error('action must be "approved" or "rejected"');
  }

  if (!record.reviewer || record.reviewer.trim() === '') {
    throw new Error('reviewer is required');
  }

  // Validate timestamp is ISO 8601
  try {
    const date = new Date(record.timestamp);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
  } catch (error) {
    throw new Error('timestamp must be a valid ISO 8601 date string');
  }

  // Ensure directory exists
  const approvalsDir = path.dirname(path.resolve(process.cwd(), APPROVALS_FILE));
  if (!fs.existsSync(approvalsDir)) {
    await fs.promises.mkdir(approvalsDir, { recursive: true });
  }

  // Read existing records
  let records: ApprovalRecord[] = [];
  const approvalsPath = path.resolve(process.cwd(), APPROVALS_FILE);

  if (fs.existsSync(approvalsPath)) {
    try {
      const content = await fs.promises.readFile(approvalsPath, 'utf8');
      const parsed = JSON.parse(content);
      // Validate that it's an array of approval records
      if (Array.isArray(parsed) && (parsed.length === 0 || parsed[0].visual_id !== undefined)) {
        records = parsed;
      } else {
        // Invalid structure, start fresh
        records = [];
      }
    } catch (error: any) {
      // If file is corrupt, start fresh
      records = [];
    }
  }

  // Append new record
  records.push(record);

  // Atomic write
  try {
    await fs.promises.writeFile(approvalsPath, JSON.stringify(records, null, 2), 'utf8');
  } catch (error: any) {
    if (error.code === 'EACCES') {
      throw new Error('EACCES: permission denied');
    } else if (error.code === 'ENOSPC') {
      throw new Error('ENOSPC: no space left on device');
    }
    throw error;
  }

  return record;
}

/**
 * Gets all approval records.
 * Returns empty array if file doesn't exist.
 */
export async function getApprovalHistory(): Promise<ApprovalRecord[]> {
  const approvalsPath = path.resolve(process.cwd(), APPROVALS_FILE);

  if (!fs.existsSync(approvalsPath)) {
    return [];
  }

  try {
    const content = await fs.promises.readFile(approvalsPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return [];
  }
}

/**
 * Gets all approval records for a specific visual.
 * Returns records in chronological order.
 */
export async function getApprovalsByVisualId(visualId: string): Promise<ApprovalRecord[]> {
  const allRecords = await getApprovalHistory();
  const filtered = allRecords.filter(record => record.visual_id === visualId);

  // Sort by timestamp ascending
  return filtered.sort((a, b) => {
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });
}

/**
 * Gets all approval records by a specific reviewer.
 */
export async function getApprovalsByReviewer(reviewer: string): Promise<ApprovalRecord[]> {
  const allRecords = await getApprovalHistory();
  return allRecords.filter(record => record.reviewer === reviewer);
}

/**
 * Gets all approval records with a specific action.
 */
export async function getApprovalsByAction(action: ApprovalAction): Promise<ApprovalRecord[]> {
  // Validate action
  if (action !== 'approved' && action !== 'rejected') {
    throw new Error('action must be "approved" or "rejected"');
  }

  const allRecords = await getApprovalHistory();
  return allRecords.filter(record => record.action === action);
}

/**
 * Gets approval records within a date range.
 */
export async function getApprovalsByDateRange(
  startDate: string,
  endDate: string
): Promise<ApprovalRecord[]> {
  // Validate dates
  let start: Date;
  let end: Date;

  try {
    start = new Date(startDate);
    if (isNaN(start.getTime())) {
      throw new Error('Invalid start date');
    }
  } catch (error) {
    throw new Error('Invalid date format');
  }

  try {
    end = new Date(endDate);
    if (isNaN(end.getTime())) {
      throw new Error('Invalid end date');
    }
  } catch (error) {
    throw new Error('Invalid date format');
  }

  if (start >= end) {
    throw new Error('start date must be before end date');
  }

  const allRecords = await getApprovalHistory();
  return allRecords.filter(record => {
    const recordDate = new Date(record.timestamp);
    return recordDate >= start && recordDate <= end;
  });
}

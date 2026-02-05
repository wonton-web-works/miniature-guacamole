/**
 * WS-20: Art Director Approval Workflow - Type Definitions
 *
 * TypeScript interfaces for approval records and workflow operations.
 */

export type ApprovalAction = 'approved' | 'rejected';

export interface ApprovalRecord {
  visual_id: string;
  action: ApprovalAction;
  reviewer: string;
  timestamp: string;
  feedback?: string;
}

export interface BatchApprovalResult {
  approved_count: number;
  visual_ids: string[];
  failed_count?: number;
  failed_ids?: string[];
}

export interface ReviewOptions {
  workstream_id?: string;
  status?: string;
}

export interface BatchOptions {
  workstream_id?: string;
}

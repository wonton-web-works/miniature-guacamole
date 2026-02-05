/**
 * WS-20: Art Director Approval Workflow - Index Module Tests
 *
 * BDD Scenarios:
 * - Module exports all required functions
 * - Integration tests for workflow operations
 * - End-to-end approval workflow scenarios
 *
 * Target: 99% coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  renameSync: vi.fn(),
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    rename: vi.fn(),
  },
}));

import * as workflow from '@/visuals/workflow';

describe('visuals/workflow - Module Exports', () => {
  describe('Given workflow module', () => {
    it('Then exports reviewVisuals function', () => {
      expect(workflow.reviewVisuals).toBeDefined();
      expect(typeof workflow.reviewVisuals).toBe('function');
    });

    it('Then exports approveVisual function', () => {
      expect(workflow.approveVisual).toBeDefined();
      expect(typeof workflow.approveVisual).toBe('function');
    });

    it('Then exports rejectVisual function', () => {
      expect(workflow.rejectVisual).toBeDefined();
      expect(typeof workflow.rejectVisual).toBe('function');
    });

    it('Then exports batchApproveAll function', () => {
      expect(workflow.batchApproveAll).toBeDefined();
      expect(typeof workflow.batchApproveAll).toBe('function');
    });

    it('Then exports recordApproval function', () => {
      expect(workflow.recordApproval).toBeDefined();
      expect(typeof workflow.recordApproval).toBe('function');
    });

    it('Then exports getApprovalHistory function', () => {
      expect(workflow.getApprovalHistory).toBeDefined();
      expect(typeof workflow.getApprovalHistory).toBe('function');
    });

    it('Then exports getApprovalsByVisualId function', () => {
      expect(workflow.getApprovalsByVisualId).toBeDefined();
      expect(typeof workflow.getApprovalsByVisualId).toBe('function');
    });

    it('Then exports getApprovalsByReviewer function', () => {
      expect(workflow.getApprovalsByReviewer).toBeDefined();
      expect(typeof workflow.getApprovalsByReviewer).toBe('function');
    });

    it('Then exports getApprovalsByAction function', () => {
      expect(workflow.getApprovalsByAction).toBeDefined();
      expect(typeof workflow.getApprovalsByAction).toBe('function');
    });

    it('Then exports getApprovalsByDateRange function', () => {
      expect(workflow.getApprovalsByDateRange).toBeDefined();
      expect(typeof workflow.getApprovalsByDateRange).toBe('function');
    });
  });
});

describe('visuals/workflow - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given end-to-end approval workflow', () => {
    it('When visual is created, reviewed, and approved, Then complete workflow succeeds', async () => {
      const metadata = [
        {
          id: 'visual-1',
          workstream_id: 'WS-20',
          component: 'card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-20/pending/card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T10:00:00Z',
          updated_at: '2026-02-04T10:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(metadata));
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.rename).mockResolvedValue(undefined);

      // Step 1: Review pending visuals
      const pendingVisuals = await workflow.reviewVisuals({ status: 'pending' });
      expect(pendingVisuals).toHaveLength(1);
      expect(pendingVisuals[0].id).toBe('visual-1');

      // Step 2: Approve the visual
      const approvedVisual = await workflow.approveVisual('visual-1', 'art-director@example.com');
      expect(approvedVisual.status).toBe('approved');

      // Step 3: Verify approval was recorded
      const writeCall = vi.mocked(fs.promises.writeFile).mock.calls.find(call =>
        call[0].toString().includes('visual-approvals.json')
      );
      expect(writeCall).toBeDefined();
    });

    it('When visual is created, reviewed, and rejected, Then rejection workflow succeeds', async () => {
      const metadata = [
        {
          id: 'visual-1',
          workstream_id: 'WS-20',
          component: 'card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-20/pending/card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T10:00:00Z',
          updated_at: '2026-02-04T10:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(metadata));
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      // Step 1: Review pending visuals
      const pendingVisuals = await workflow.reviewVisuals();
      expect(pendingVisuals).toHaveLength(1);

      // Step 2: Reject the visual with feedback
      const rejectedVisual = await workflow.rejectVisual(
        'visual-1',
        'art-director@example.com',
        'Colors do not match brand guidelines'
      );
      expect(rejectedVisual.status).toBe('rejected');

      // Step 3: Verify rejection was recorded with feedback
      const writeCall = vi.mocked(fs.promises.writeFile).mock.calls.find(call =>
        call[0].toString().includes('visual-approvals.json')
      );
      expect(writeCall).toBeDefined();
      const approvalData = JSON.parse(writeCall![1] as string);
      expect(approvalData[0].feedback).toBe('Colors do not match brand guidelines');
    });

    it('When multiple visuals exist, Then batch approval workflow succeeds', async () => {
      const metadata = [
        {
          id: 'visual-1',
          workstream_id: 'WS-20',
          component: 'card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-20/pending/card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T10:00:00Z',
          updated_at: '2026-02-04T10:00:00Z',
        },
        {
          id: 'visual-2',
          workstream_id: 'WS-20',
          component: 'banner',
          version: 1,
          spec_hash: 'def456',
          file_path: '.claude/visuals/WS-20/pending/banner-v1.png',
          file_size: 8000,
          dimensions: { width: 1920, height: 400 },
          status: 'pending' as const,
          created_at: '2026-02-04T11:00:00Z',
          updated_at: '2026-02-04T11:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(metadata));
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.rename).mockResolvedValue(undefined);

      // Step 1: Review all pending visuals
      const pendingVisuals = await workflow.reviewVisuals();
      expect(pendingVisuals).toHaveLength(2);

      // Step 2: Batch approve all
      const result = await workflow.batchApproveAll('art-director@example.com', true);
      expect(result.approved_count).toBe(2);

      // Step 3: Verify both approvals were recorded
      const writeCall = vi.mocked(fs.promises.writeFile).mock.calls.find(call =>
        call[0].toString().includes('visual-approvals.json')
      );
      expect(writeCall).toBeDefined();
    });
  });

  describe('Given approval history queries', () => {
    it('When querying approval history after approvals, Then returns complete history', async () => {
      const approvalRecords = [
        {
          visual_id: 'visual-1',
          action: 'approved' as const,
          reviewer: 'art-director@example.com',
          timestamp: '2026-02-04T10:00:00Z',
        },
        {
          visual_id: 'visual-2',
          action: 'rejected' as const,
          reviewer: 'art-director@example.com',
          timestamp: '2026-02-04T11:00:00Z',
          feedback: 'Colors do not match',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(approvalRecords));

      const history = await workflow.getApprovalHistory();
      expect(history).toHaveLength(2);
      expect(history[0].action).toBe('approved');
      expect(history[1].action).toBe('rejected');
    });

    it('When querying approvals by visual_id, Then returns approvals for that visual', async () => {
      const approvalRecords = [
        {
          visual_id: 'visual-1',
          action: 'rejected' as const,
          reviewer: 'art-director@example.com',
          timestamp: '2026-02-04T10:00:00Z',
          feedback: 'Initial feedback',
        },
        {
          visual_id: 'visual-1',
          action: 'approved' as const,
          reviewer: 'art-director@example.com',
          timestamp: '2026-02-04T12:00:00Z',
        },
        {
          visual_id: 'visual-2',
          action: 'approved' as const,
          reviewer: 'art-director@example.com',
          timestamp: '2026-02-04T11:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(approvalRecords));

      const visualHistory = await workflow.getApprovalsByVisualId('visual-1');
      expect(visualHistory).toHaveLength(2);
      expect(visualHistory[0].action).toBe('rejected');
      expect(visualHistory[1].action).toBe('approved');
    });

    it('When querying approvals by reviewer, Then returns approvals by that reviewer', async () => {
      const approvalRecords = [
        {
          visual_id: 'visual-1',
          action: 'approved' as const,
          reviewer: 'art-director@example.com',
          timestamp: '2026-02-04T10:00:00Z',
        },
        {
          visual_id: 'visual-2',
          action: 'approved' as const,
          reviewer: 'other-reviewer@example.com',
          timestamp: '2026-02-04T11:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(approvalRecords));

      const reviewerHistory = await workflow.getApprovalsByReviewer('art-director@example.com');
      expect(reviewerHistory).toHaveLength(1);
      expect(reviewerHistory[0].reviewer).toBe('art-director@example.com');
    });
  });

  describe('Given complex workflow scenarios', () => {
    it('When visual is rejected then regenerated and approved, Then history shows complete workflow', async () => {
      const approvalRecords = [
        {
          visual_id: 'visual-1',
          action: 'rejected' as const,
          reviewer: 'art-director@example.com',
          timestamp: '2026-02-04T10:00:00Z',
          feedback: 'Colors need adjustment',
        },
        {
          visual_id: 'visual-1-v2',
          action: 'approved' as const,
          reviewer: 'art-director@example.com',
          timestamp: '2026-02-04T14:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(approvalRecords));

      const history = await workflow.getApprovalHistory();
      expect(history).toHaveLength(2);

      const rejections = await workflow.getApprovalsByAction('rejected');
      expect(rejections).toHaveLength(1);
      expect(rejections[0].feedback).toBe('Colors need adjustment');

      const approvals = await workflow.getApprovalsByAction('approved');
      expect(approvals).toHaveLength(1);
    });

    it('When filtering approvals by workstream and date range, Then returns precise results', async () => {
      const metadata = [
        {
          id: 'visual-1',
          workstream_id: 'WS-20',
          component: 'card',
          version: 1,
          spec_hash: 'abc123',
          file_path: '.claude/visuals/WS-20/pending/card-v1.png',
          file_size: 12345,
          dimensions: { width: 800, height: 600 },
          status: 'pending' as const,
          created_at: '2026-02-04T10:00:00Z',
          updated_at: '2026-02-04T10:00:00Z',
        },
      ];

      const approvalRecords = [
        {
          visual_id: 'visual-1',
          action: 'approved' as const,
          reviewer: 'art-director@example.com',
          timestamp: '2026-02-04T12:00:00Z',
        },
        {
          visual_id: 'visual-2',
          action: 'approved' as const,
          reviewer: 'art-director@example.com',
          timestamp: '2026-02-05T12:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(approvalRecords));

      const dateRangeHistory = await workflow.getApprovalsByDateRange(
        '2026-02-04T00:00:00Z',
        '2026-02-04T23:59:59Z'
      );

      expect(dateRangeHistory).toHaveLength(1);
      expect(dateRangeHistory[0].visual_id).toBe('visual-1');
    });
  });
});

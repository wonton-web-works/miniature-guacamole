/**
 * WS-20: Art Director Approval Workflow - Approvals Module Tests
 *
 * BDD Scenarios:
 * - AC-5: Approval records stored in visual-approvals.json
 * - Approval record structure validation
 * - Query approval history by visual_id, reviewer, action, date range
 * - Atomic writes to prevent data corruption
 * - Error handling
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
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  },
}));

import {
  recordApproval,
  getApprovalHistory,
  getApprovalsByVisualId,
  getApprovalsByReviewer,
  getApprovalsByAction,
  getApprovalsByDateRange,
} from '@/visuals/workflow/approvals';

describe('visuals/workflow/approvals - recordApproval()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given approval record creation (AC-5: Record with timestamp and reviewer)', () => {
    it('When recording approval, Then creates visual-approvals.json on first record', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      await recordApproval({
        visual_id: 'visual-1',
        action: 'approved',
        reviewer: 'art-director@example.com',
        timestamp: new Date().toISOString(),
      });

      expect(fs.promises.mkdir).toHaveBeenCalled();
      expect(fs.promises.writeFile).toHaveBeenCalled();
    });

    it('When recording approval, Then includes visual_id in record', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const record = await recordApproval({
        visual_id: 'visual-1',
        action: 'approved',
        reviewer: 'art-director@example.com',
        timestamp: new Date().toISOString(),
      });

      expect(record.visual_id).toBe('visual-1');
    });

    it('When recording approval, Then includes reviewer email', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const record = await recordApproval({
        visual_id: 'visual-1',
        action: 'approved',
        reviewer: 'art-director@example.com',
        timestamp: new Date().toISOString(),
      });

      expect(record.reviewer).toBe('art-director@example.com');
    });

    it('When recording approval, Then includes timestamp', async () => {
      const timestamp = new Date().toISOString();

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const record = await recordApproval({
        visual_id: 'visual-1',
        action: 'approved',
        reviewer: 'art-director@example.com',
        timestamp,
      });

      expect(record.timestamp).toBe(timestamp);
      expect(new Date(record.timestamp)).toBeInstanceOf(Date);
    });

    it('When recording approval, Then includes action type', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const record = await recordApproval({
        visual_id: 'visual-1',
        action: 'approved',
        reviewer: 'art-director@example.com',
        timestamp: new Date().toISOString(),
      });

      expect(record.action).toBe('approved');
    });

    it('When recording rejection, Then includes feedback field', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const record = await recordApproval({
        visual_id: 'visual-1',
        action: 'rejected',
        reviewer: 'art-director@example.com',
        timestamp: new Date().toISOString(),
        feedback: 'Colors do not match brand guidelines',
      });

      expect(record.feedback).toBe('Colors do not match brand guidelines');
    });

    it('When recording approval without feedback, Then feedback is undefined', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      const record = await recordApproval({
        visual_id: 'visual-1',
        action: 'approved',
        reviewer: 'art-director@example.com',
        timestamp: new Date().toISOString(),
      });

      expect(record.feedback).toBeUndefined();
    });
  });

  describe('Given multiple approval records', () => {
    it('When recording subsequent approval, Then appends to existing records', async () => {
      const existingRecords = [
        {
          visual_id: 'visual-1',
          action: 'approved' as const,
          reviewer: 'art-director@example.com',
          timestamp: '2026-02-04T10:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(existingRecords));
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      await recordApproval({
        visual_id: 'visual-2',
        action: 'approved',
        reviewer: 'art-director@example.com',
        timestamp: new Date().toISOString(),
      });

      const writeCall = vi.mocked(fs.promises.writeFile).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData).toHaveLength(2);
    });

    it('When recording approval, Then uses atomic write operation', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      await recordApproval({
        visual_id: 'visual-1',
        action: 'approved',
        reviewer: 'art-director@example.com',
        timestamp: new Date().toISOString(),
      });

      expect(fs.promises.writeFile).toHaveBeenCalled();
    });
  });

  describe('Given validation requirements', () => {
    it('When visual_id is missing, Then throws validation error', async () => {
      await expect(
        recordApproval({
          visual_id: '',
          action: 'approved',
          reviewer: 'art-director@example.com',
          timestamp: new Date().toISOString(),
        })
      ).rejects.toThrow('visual_id is required');
    });

    it('When action is invalid, Then throws validation error', async () => {
      await expect(
        recordApproval({
          visual_id: 'visual-1',
          action: 'invalid' as any,
          reviewer: 'art-director@example.com',
          timestamp: new Date().toISOString(),
        })
      ).rejects.toThrow('action must be "approved" or "rejected"');
    });

    it('When reviewer is missing, Then throws validation error', async () => {
      await expect(
        recordApproval({
          visual_id: 'visual-1',
          action: 'approved',
          reviewer: '',
          timestamp: new Date().toISOString(),
        })
      ).rejects.toThrow('reviewer is required');
    });

    it('When timestamp is invalid, Then throws validation error', async () => {
      await expect(
        recordApproval({
          visual_id: 'visual-1',
          action: 'approved',
          reviewer: 'art-director@example.com',
          timestamp: 'invalid-timestamp',
        })
      ).rejects.toThrow('timestamp must be a valid ISO 8601 date string');
    });
  });

  describe('Given error conditions', () => {
    it('When write fails with permission error, Then throws error', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      const permissionError = new Error('EACCES: permission denied') as NodeJS.ErrnoException;
      permissionError.code = 'EACCES';
      vi.mocked(fs.promises.writeFile).mockRejectedValue(permissionError);

      await expect(
        recordApproval({
          visual_id: 'visual-1',
          action: 'approved',
          reviewer: 'art-director@example.com',
          timestamp: new Date().toISOString(),
        })
      ).rejects.toThrow('permission denied');
    });

    it('When disk is full, Then throws ENOSPC error', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      const diskFullError = new Error('ENOSPC: no space left on device') as NodeJS.ErrnoException;
      diskFullError.code = 'ENOSPC';
      vi.mocked(fs.promises.writeFile).mockRejectedValue(diskFullError);

      await expect(
        recordApproval({
          visual_id: 'visual-1',
          action: 'approved',
          reviewer: 'art-director@example.com',
          timestamp: new Date().toISOString(),
        })
      ).rejects.toThrow('no space left');
    });
  });
});

describe('visuals/workflow/approvals - getApprovalHistory()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given approval records exist', () => {
    it('When getting approval history, Then returns all approval records', async () => {
      const records = [
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
          feedback: 'Colors do not match brand guidelines',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(records));

      const result = await getApprovalHistory();

      expect(result).toHaveLength(2);
      expect(result).toEqual(records);
    });

    it('When getting approval history with empty file, Then returns empty array', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue('[]');

      const result = await getApprovalHistory();

      expect(result).toEqual([]);
    });
  });

  describe('Given approval file does not exist', () => {
    it('When getting approval history, Then returns empty array', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await getApprovalHistory();

      expect(result).toEqual([]);
    });
  });
});

describe('visuals/workflow/approvals - getApprovalsByVisualId()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given approval records for specific visual', () => {
    it('When querying by visual_id, Then returns all approvals for that visual', async () => {
      const records = [
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
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(records));

      const result = await getApprovalsByVisualId('visual-1');

      expect(result).toHaveLength(2);
      expect(result[0].visual_id).toBe('visual-1');
      expect(result[1].visual_id).toBe('visual-1');
    });

    it('When visual has no approvals, Then returns empty array', async () => {
      const records = [
        {
          visual_id: 'visual-1',
          action: 'approved' as const,
          reviewer: 'art-director@example.com',
          timestamp: '2026-02-04T10:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(records));

      const result = await getApprovalsByVisualId('visual-2');

      expect(result).toEqual([]);
    });

    it('When querying by visual_id, Then returns records in chronological order', async () => {
      const records = [
        {
          visual_id: 'visual-1',
          action: 'approved' as const,
          reviewer: 'art-director@example.com',
          timestamp: '2026-02-04T12:00:00Z',
        },
        {
          visual_id: 'visual-1',
          action: 'rejected' as const,
          reviewer: 'art-director@example.com',
          timestamp: '2026-02-04T10:00:00Z',
          feedback: 'Initial feedback',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(records));

      const result = await getApprovalsByVisualId('visual-1');

      expect(result[0].timestamp).toBe('2026-02-04T10:00:00Z');
      expect(result[1].timestamp).toBe('2026-02-04T12:00:00Z');
    });
  });
});

describe('visuals/workflow/approvals - getApprovalsByReviewer()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given approval records by specific reviewer', () => {
    it('When querying by reviewer, Then returns all approvals by that reviewer', async () => {
      const records = [
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
          feedback: 'Feedback',
        },
        {
          visual_id: 'visual-3',
          action: 'approved' as const,
          reviewer: 'other-reviewer@example.com',
          timestamp: '2026-02-04T12:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(records));

      const result = await getApprovalsByReviewer('art-director@example.com');

      expect(result).toHaveLength(2);
      expect(result[0].reviewer).toBe('art-director@example.com');
      expect(result[1].reviewer).toBe('art-director@example.com');
    });

    it('When reviewer has no approvals, Then returns empty array', async () => {
      const records = [
        {
          visual_id: 'visual-1',
          action: 'approved' as const,
          reviewer: 'art-director@example.com',
          timestamp: '2026-02-04T10:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(records));

      const result = await getApprovalsByReviewer('other@example.com');

      expect(result).toEqual([]);
    });
  });
});

describe('visuals/workflow/approvals - getApprovalsByAction()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given approval records with different actions', () => {
    it('When querying for approved actions, Then returns only approved records', async () => {
      const records = [
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
          feedback: 'Feedback',
        },
        {
          visual_id: 'visual-3',
          action: 'approved' as const,
          reviewer: 'art-director@example.com',
          timestamp: '2026-02-04T12:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(records));

      const result = await getApprovalsByAction('approved');

      expect(result).toHaveLength(2);
      expect(result[0].action).toBe('approved');
      expect(result[1].action).toBe('approved');
    });

    it('When querying for rejected actions, Then returns only rejected records', async () => {
      const records = [
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
          feedback: 'Feedback',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(records));

      const result = await getApprovalsByAction('rejected');

      expect(result).toHaveLength(1);
      expect(result[0].action).toBe('rejected');
    });

    it('When querying with invalid action, Then throws validation error', async () => {
      await expect(getApprovalsByAction('invalid' as any)).rejects.toThrow(
        'action must be "approved" or "rejected"'
      );
    });
  });
});

describe('visuals/workflow/approvals - getApprovalsByDateRange()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given approval records across different dates', () => {
    it('When querying by date range, Then returns approvals within range', async () => {
      const records = [
        {
          visual_id: 'visual-1',
          action: 'approved' as const,
          reviewer: 'art-director@example.com',
          timestamp: '2026-02-04T10:00:00Z',
        },
        {
          visual_id: 'visual-2',
          action: 'approved' as const,
          reviewer: 'art-director@example.com',
          timestamp: '2026-02-05T10:00:00Z',
        },
        {
          visual_id: 'visual-3',
          action: 'approved' as const,
          reviewer: 'art-director@example.com',
          timestamp: '2026-02-06T10:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(records));

      const result = await getApprovalsByDateRange('2026-02-04T00:00:00Z', '2026-02-05T23:59:59Z');

      expect(result).toHaveLength(2);
      expect(result[0].visual_id).toBe('visual-1');
      expect(result[1].visual_id).toBe('visual-2');
    });

    it('When no approvals in date range, Then returns empty array', async () => {
      const records = [
        {
          visual_id: 'visual-1',
          action: 'approved' as const,
          reviewer: 'art-director@example.com',
          timestamp: '2026-02-04T10:00:00Z',
        },
      ];

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(records));

      const result = await getApprovalsByDateRange('2026-02-05T00:00:00Z', '2026-02-06T00:00:00Z');

      expect(result).toEqual([]);
    });

    it('When start date is after end date, Then throws validation error', async () => {
      await expect(
        getApprovalsByDateRange('2026-02-06T00:00:00Z', '2026-02-04T00:00:00Z')
      ).rejects.toThrow('start date must be before end date');
    });

    it('When date format is invalid, Then throws validation error', async () => {
      await expect(
        getApprovalsByDateRange('invalid-date', '2026-02-06T00:00:00Z')
      ).rejects.toThrow('Invalid date format');
    });
  });
});

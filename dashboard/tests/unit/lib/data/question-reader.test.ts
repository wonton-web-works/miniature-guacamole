import { describe, it, expect, beforeEach, vi } from 'vitest';

// Tests for agent questions reader

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
}));

describe('QuestionReader', () => {
  let getQuestions: any;
  let fs: any;

  beforeEach(async () => {
    vi.resetModules();
    fs = await import('node:fs');
    // @ts-expect-error - module not implemented yet
    const module = await import('../../../../src/lib/data/question-reader');
    getQuestions = module.getQuestions;
  });

  describe('basic functionality', () => {
    it('should return questions array', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        questions: [
          {
            id: 'q1',
            agent_id: 'dev',
            workstream_id: 'WS-1',
            question: 'Should we proceed?',
            priority: 'normal',
            timestamp: '2026-02-05T10:00:00Z'
          }
        ]
      }));

      const result = getQuestions('/dashboard/path');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('question');
    });

    it('should return empty array when file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = getQuestions('/dashboard/path');

      expect(result).toEqual([]);
    });

    it('should handle empty questions array', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        questions: []
      }));

      const result = getQuestions('/dashboard/path');

      expect(result).toEqual([]);
    });

    it('should handle multiple questions', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        questions: [
          { id: 'q1', question: 'Question 1', agent_id: 'dev', workstream_id: 'WS-TEST' },
          { id: 'q2', question: 'Question 2', agent_id: 'qa', workstream_id: 'WS-TEST' },
          { id: 'q3', question: 'Question 3', agent_id: 'ceo', workstream_id: 'WS-TEST' }
        ]
      }));

      const result = getQuestions('/dashboard/path');

      expect(result.length).toBe(3);
    });
  });

  describe('question schema validation', () => {
    it('should include all required fields', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        questions: [
          {
            id: 'q1',
            agent_id: 'dev',
            workstream_id: 'WS-1',
            question: 'Test question?',
            priority: 'urgent',
            timestamp: '2026-02-05T10:00:00Z',
            status: 'pending'
          }
        ]
      }));

      const result = getQuestions('/dashboard/path');

      expect(result[0]).toHaveProperty('id', 'q1');
      expect(result[0]).toHaveProperty('agent_id', 'dev');
      expect(result[0]).toHaveProperty('workstream_id', 'WS-1');
      expect(result[0]).toHaveProperty('question', 'Test question?');
      expect(result[0]).toHaveProperty('priority', 'urgent');
      expect(result[0]).toHaveProperty('timestamp');
      expect(result[0]).toHaveProperty('status', 'pending');
    });

    it('should handle optional fields', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        questions: [
          {
            id: 'q1',
            agent_id: 'dev',
            workstream_id: 'WS-TEST',
            question: 'Question without optional context',
            priority: 'normal',
            timestamp: '2026-02-05T10:00:00Z'
          }
        ]
      }));

      const result = getQuestions('/dashboard/path');

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('q1');
    });

    it('should handle different priority levels', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        questions: [
          { id: 'q1', question: 'Q1', priority: 'urgent', agent_id: 'dev', workstream_id: 'WS-TEST' },
          { id: 'q2', question: 'Q2', priority: 'normal', agent_id: 'qa', workstream_id: 'WS-TEST' },
          { id: 'q3', question: 'Q3', priority: 'low', agent_id: 'ceo', workstream_id: 'WS-TEST' }
        ]
      }));

      const result = getQuestions('/dashboard/path');

      expect(result[0].priority).toBe('urgent');
      expect(result[1].priority).toBe('normal');
      expect(result[2].priority).toBe('low');
    });

    it('should handle different status values', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        questions: [
          { id: 'q1', question: 'Q1', status: 'pending', agent_id: 'dev', workstream_id: 'WS-TEST' },
          { id: 'q2', question: 'Q2', status: 'answered', agent_id: 'qa', workstream_id: 'WS-TEST' },
          { id: 'q3', question: 'Q3', status: 'resolved', agent_id: 'ceo', workstream_id: 'WS-TEST' }
        ]
      }));

      const result = getQuestions('/dashboard/path');

      expect(result[0].status).toBe('pending');
      expect(result[1].status).toBe('answered');
      expect(result[2].status).toBe('resolved');
    });
  });

  describe('filtering', () => {
    beforeEach(() => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        questions: [
          { id: 'q1', question: 'Q1', status: 'pending', agent_id: 'dev', workstream_id: 'WS-TEST' },
          { id: 'q2', question: 'Q2', status: 'answered', agent_id: 'qa', workstream_id: 'WS-TEST' },
          { id: 'q3', question: 'Q3', status: 'pending', agent_id: 'ceo', workstream_id: 'WS-TEST' }
        ]
      }));
    });

    it('should filter by status', () => {
      const result = getQuestions('/dashboard/path', { status: 'pending' });

      expect(result.length).toBe(2);
      expect(result.every(q => q.status === 'pending')).toBe(true);
    });

    it('should return all questions when no filter', () => {
      const result = getQuestions('/dashboard/path');

      expect(result.length).toBe(3);
    });

    it('should filter by agent_id', () => {
      const result = getQuestions('/dashboard/path', { agentId: 'dev' });

      expect(result.length).toBe(1);
      expect(result[0].agent_id).toBe('dev');
    });

    it('should filter by workstream_id', () => {
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        questions: [
          { id: 'q1', question: 'Q1', workstream_id: 'WS-1', agent_id: 'dev' },
          { id: 'q2', question: 'Q2', workstream_id: 'WS-2', agent_id: 'qa' },
          { id: 'q3', question: 'Q3', workstream_id: 'WS-1', agent_id: 'ceo' }
        ]
      }));

      const result = getQuestions('/dashboard/path', { workstreamId: 'WS-1' });

      expect(result.length).toBe(2);
      expect(result.every(q => q.workstream_id === 'WS-1')).toBe(true);
    });

    it('should combine multiple filters', () => {
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        questions: [
          { id: 'q1', question: 'Q1', status: 'pending', workstream_id: 'WS-1', agent_id: 'dev' },
          { id: 'q2', question: 'Q2', status: 'pending', workstream_id: 'WS-2', agent_id: 'qa' },
          { id: 'q3', question: 'Q3', status: 'answered', workstream_id: 'WS-1', agent_id: 'ceo' }
        ]
      }));

      const result = getQuestions('/dashboard/path', {
        status: 'pending',
        workstreamId: 'WS-1'
      });

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('q1');
    });
  });

  describe('error handling', () => {
    it('should return empty array for malformed JSON', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('{ invalid json }');

      const result = getQuestions('/dashboard/path');

      expect(result).toEqual([]);
    });

    it('should return empty array for missing questions field', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        data: 'something else'
      }));

      const result = getQuestions('/dashboard/path');

      expect(result).toEqual([]);
    });

    it('should return empty array for non-array questions', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        questions: 'not an array'
      }));

      const result = getQuestions('/dashboard/path');

      expect(result).toEqual([]);
    });

    it('should return empty array for read permission error', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        const error: any = new Error('EACCES: permission denied');
        error.code = 'EACCES';
        throw error;
      });

      const result = getQuestions('/dashboard/path');

      expect(result).toEqual([]);
    });

    it('should handle empty string content', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('');

      const result = getQuestions('/dashboard/path');

      expect(result).toEqual([]);
    });

    it('should skip invalid question entries', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        questions: [
          { id: 'q1', question: 'Valid', agent_id: 'dev', workstream_id: 'WS-TEST' },
          { id: 'q2' }, // Missing question field
          { question: 'Missing ID' }, // Missing id field
          { id: 'q3', question: 'Valid too', agent_id: 'qa', workstream_id: 'WS-TEST' }
        ]
      }));

      const result = getQuestions('/dashboard/path');

      expect(result.length).toBe(2);
      expect(result[0].id).toBe('q1');
      expect(result[1].id).toBe('q3');
    });
  });

  describe('sorting', () => {
    it('should return questions in timestamp order (newest first)', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        questions: [
          { id: 'q1', question: 'Q1', timestamp: '2026-02-05T10:00:00Z', agent_id: 'dev', workstream_id: 'WS-TEST' },
          { id: 'q2', question: 'Q2', timestamp: '2026-02-05T12:00:00Z', agent_id: 'qa', workstream_id: 'WS-TEST' },
          { id: 'q3', question: 'Q3', timestamp: '2026-02-05T08:00:00Z', agent_id: 'ceo', workstream_id: 'WS-TEST' }
        ]
      }));

      const result = getQuestions('/dashboard/path');

      expect(result[0].id).toBe('q2'); // 12:00
      expect(result[1].id).toBe('q1'); // 10:00
      expect(result[2].id).toBe('q3'); // 08:00
    });

    it('should handle missing timestamps', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        questions: [
          { id: 'q1', question: 'Q1', timestamp: '2026-02-05T10:00:00Z', agent_id: 'dev', workstream_id: 'WS-TEST' },
          { id: 'q2', question: 'Q2', agent_id: 'qa', workstream_id: 'WS-TEST' }
        ]
      }));

      const result = getQuestions('/dashboard/path');

      expect(result.length).toBe(2);
    });
  });
});

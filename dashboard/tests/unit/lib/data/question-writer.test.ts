import { describe, it, expect, beforeEach, vi } from 'vitest';

// Tests for question-writer with atomic write protection (FIX-2)

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  renameSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

describe('QuestionWriter', () => {
  let answerQuestion: any;
  let fs: any;

  beforeEach(async () => {
    vi.resetModules();
    fs = await import('node:fs');
    // @ts-expect-error - module not implemented yet
    const module = await import('../../../../src/lib/data/question-writer');
    answerQuestion = module.answerQuestion;
  });

  describe('answerQuestion', () => {
    const mockQuestions = {
      questions: [
        {
          id: 'q1',
          agent_id: 'dev',
          workstream_id: 'WS-1',
          question: 'Should we proceed?',
          priority: 'normal',
          timestamp: '2026-02-05T10:00:00Z',
          status: 'pending'
        },
        {
          id: 'q2',
          agent_id: 'qa',
          workstream_id: 'WS-2',
          question: 'Need approval?',
          priority: 'urgent',
          timestamp: '2026-02-05T11:00:00Z',
          status: 'pending'
        }
      ]
    };

    describe('basic functionality', () => {
      beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockQuestions));
        vi.mocked(fs.writeFileSync).mockImplementation(() => {});
        vi.mocked(fs.renameSync).mockImplementation(() => {});
      });

      it('should update question status to answered for approve action', () => {
        const result = answerQuestion('q1', 'Approved by team', 'approve', '/test/path');

        expect(result).toBeDefined();
        expect(result?.status).toBe('answered');
        expect(result?.answer).toBe('Approved by team');
        expect(result?.answered_at).toBeDefined();
      });

      it('should update question status to dismissed for reject action', () => {
        const result = answerQuestion('q1', 'Not needed', 'reject', '/test/path');

        expect(result).toBeDefined();
        expect(result?.status).toBe('dismissed');
        expect(result?.answer).toBe('Not needed');
      });

      it('should update question status to answered for respond action', () => {
        const result = answerQuestion('q1', 'Response text', 'respond', '/test/path');

        expect(result).toBeDefined();
        expect(result?.status).toBe('answered');
        expect(result?.answer).toBe('Response text');
      });

      it('should use default answer format when answer is empty', () => {
        const result = answerQuestion('q1', '', 'approve', '/test/path');

        expect(result?.answer).toBe('[approve]');
      });

      it('should return null for non-existent question', () => {
        const result = answerQuestion('nonexistent', 'Answer', 'approve', '/test/path');

        expect(result).toBeNull();
      });

      it('should add answered_at timestamp', () => {
        const result = answerQuestion('q1', 'Answer', 'approve', '/test/path');

        expect(result?.answered_at).toBeDefined();
        expect(result?.answered_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      });
    });

    describe('atomic write protection (FIX-2)', () => {
      beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockQuestions));
        vi.mocked(fs.writeFileSync).mockImplementation(() => {});
        vi.mocked(fs.renameSync).mockImplementation(() => {});
      });

      it('should write to temp file before renaming', () => {
        answerQuestion('q1', 'Answer', 'approve', '/test/path');

        expect(fs.writeFileSync).toHaveBeenCalled();
        expect(fs.renameSync).toHaveBeenCalled();

        const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
        const renameCall = vi.mocked(fs.renameSync).mock.calls[0];

        // First arg should be temp file path
        expect(writeCall[0]).toMatch(/\.tmp\.\d+\./);
        // Rename should move temp to final location
        expect(renameCall[0]).toBe(writeCall[0]);
        expect(renameCall[1]).toMatch(/agent-questions\.json$/);
      });

      it('should use unique temp file names', () => {
        answerQuestion('q1', 'Answer 1', 'approve', '/test/path');
        const firstTempPath = vi.mocked(fs.writeFileSync).mock.calls[0][0];

        vi.clearAllMocks();
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockQuestions));

        answerQuestion('q2', 'Answer 2', 'approve', '/test/path');
        const secondTempPath = vi.mocked(fs.writeFileSync).mock.calls[0][0];

        expect(firstTempPath).not.toBe(secondTempPath);
      });

      it('should clean up temp file if rename fails', () => {
        vi.mocked(fs.renameSync).mockImplementation(() => {
          throw new Error('Rename failed');
        });

        expect(() => answerQuestion('q1', 'Answer', 'approve', '/test/path')).toThrow('Rename failed');
        expect(fs.unlinkSync).toHaveBeenCalled();

        const unlinkCall = vi.mocked(fs.unlinkSync).mock.calls[0];
        const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
        // Verify temp file path contains expected pattern
        expect(unlinkCall[0]).toMatch(/\.tmp\.\d+\./);
        expect(writeCall[0]).toMatch(/\.tmp\.\d+\./);
      });

      it('should not fail if temp cleanup fails', () => {
        vi.mocked(fs.renameSync).mockImplementation(() => {
          throw new Error('Rename failed');
        });
        vi.mocked(fs.unlinkSync).mockImplementation(() => {
          throw new Error('Cleanup failed');
        });

        expect(() => answerQuestion('q1', 'Answer', 'approve', '/test/path')).toThrow('Rename failed');
        // Should not throw the cleanup error
      });

      it('should write valid JSON to temp file', () => {
        vi.mocked(fs.renameSync).mockImplementation(() => {}); // Reset to not throw
        answerQuestion('q1', 'Test answer', 'approve', '/test/path');

        const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
        const writtenData = writeCall[1];

        expect(() => JSON.parse(writtenData as string)).not.toThrow();
        const parsed = JSON.parse(writtenData as string);
        expect(parsed.questions).toBeDefined();
        expect(Array.isArray(parsed.questions)).toBe(true);
      });
    });

    describe('error handling', () => {
      it('should return null when file read fails', () => {
        vi.mocked(fs.readFileSync).mockImplementation(() => {
          throw new Error('File not found');
        });

        const result = answerQuestion('q1', 'Answer', 'approve', '/test/path');

        expect(result).toBeNull();
      });

      it('should return null for malformed JSON', () => {
        vi.mocked(fs.readFileSync).mockReturnValue('{ invalid json }');

        const result = answerQuestion('q1', 'Answer', 'approve', '/test/path');

        expect(result).toBeNull();
      });

      it('should return null when questions is not an array', () => {
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
          questions: 'not an array'
        }));

        const result = answerQuestion('q1', 'Answer', 'approve', '/test/path');

        expect(result).toBeNull();
      });

      it('should propagate write errors', () => {
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockQuestions));
        vi.mocked(fs.writeFileSync).mockImplementation(() => {
          throw new Error('Disk full');
        });

        expect(() => answerQuestion('q1', 'Answer', 'approve', '/test/path')).toThrow('Disk full');
      });
    });

    describe('data preservation', () => {
      beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockQuestions));
        vi.mocked(fs.writeFileSync).mockImplementation(() => {});
        vi.mocked(fs.renameSync).mockImplementation(() => {});
      });

      it('should preserve other questions unchanged', () => {
        answerQuestion('q1', 'Answer', 'approve', '/test/path');

        const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
        const written = JSON.parse(writeCall[1] as string);

        expect(written.questions.length).toBe(2);
        expect(written.questions[1].id).toBe('q2');
        expect(written.questions[1].status).toBe('pending');
      });

      it('should preserve all question fields', () => {
        answerQuestion('q1', 'Answer', 'approve', '/test/path');

        const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
        const written = JSON.parse(writeCall[1] as string);
        const updatedQuestion = written.questions[0];

        expect(updatedQuestion.id).toBe('q1');
        expect(updatedQuestion.agent_id).toBe('dev');
        expect(updatedQuestion.workstream_id).toBe('WS-1');
        expect(updatedQuestion.question).toBe('Should we proceed?');
        expect(updatedQuestion.priority).toBe('normal');
        expect(updatedQuestion.timestamp).toBe('2026-02-05T10:00:00Z');
      });
    });

    describe('action types', () => {
      beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockQuestions));
        vi.mocked(fs.writeFileSync).mockImplementation(() => {});
        vi.mocked(fs.renameSync).mockImplementation(() => {});
      });

      it('should handle approve action', () => {
        const result = answerQuestion('q1', 'Approved', 'approve', '/test/path');

        expect(result?.status).toBe('answered');
        expect(result?.answer).toBe('Approved');
      });

      it('should handle reject action', () => {
        const result = answerQuestion('q1', 'Rejected', 'reject', '/test/path');

        expect(result?.status).toBe('dismissed');
        expect(result?.answer).toBe('Rejected');
      });

      it('should handle respond action', () => {
        const result = answerQuestion('q1', 'Response', 'respond', '/test/path');

        expect(result?.status).toBe('answered');
        expect(result?.answer).toBe('Response');
      });
    });
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Tests for question-creator with atomic write protection

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  renameSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

describe('QuestionCreator', () => {
  let createQuestion: any;
  let fs: any;

  beforeEach(async () => {
    vi.resetModules();
    fs = await import('node:fs');
    // @ts-expect-error - module not implemented yet
    const module = await import('../../../../src/lib/data/question-creator');
    createQuestion = module.createQuestion;
  });

  describe('createQuestion', () => {
    const mockExistingQuestions = {
      questions: [
        {
          id: 'q1',
          agent_id: 'dev',
          workstream_id: 'WS-1',
          question: 'Existing question?',
          priority: 'medium',
          status: 'open',
          timestamp: '2026-02-05T10:00:00Z',
        }
      ]
    };

    describe('basic functionality', () => {
      beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockExistingQuestions));
        vi.mocked(fs.writeFileSync).mockImplementation(() => {});
        vi.mocked(fs.renameSync).mockImplementation(() => {});
      });

      it('should create a new question with generated ID', () => {
        const result = createQuestion({
          agent_id: 'qa',
          workstream_id: 'WS-2',
          question: 'Should we test this?',
          priority: 'high',
        }, '/test/path');

        expect(result).toBeDefined();
        expect(result?.id).toBeDefined();
        expect(result?.id).toMatch(/^q-\d+$/);
        expect(result?.agent_id).toBe('qa');
        expect(result?.workstream_id).toBe('WS-2');
        expect(result?.question).toBe('Should we test this?');
        expect(result?.priority).toBe('high');
      });

      it('should add timestamp to new question', () => {
        const result = createQuestion({
          agent_id: 'dev',
          workstream_id: 'WS-1',
          question: 'New question?',
          priority: 'medium',
        }, '/test/path');

        expect(result?.timestamp).toBeDefined();
        expect(result?.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      });

      it('should set default status to open', () => {
        const result = createQuestion({
          agent_id: 'dev',
          workstream_id: 'WS-1',
          question: 'New question?',
          priority: 'medium',
        }, '/test/path');

        expect(result?.status).toBe('open');
      });

      it('should default priority to medium if not provided', () => {
        const result = createQuestion({
          agent_id: 'dev',
          workstream_id: 'WS-1',
          question: 'New question?',
        }, '/test/path');

        expect(result?.priority).toBe('medium');
      });

      it('should include optional context', () => {
        const result = createQuestion({
          agent_id: 'dev',
          workstream_id: 'WS-1',
          question: 'New question?',
          priority: 'high',
          context: 'Additional context here',
        }, '/test/path');

        expect(result?.context).toBe('Additional context here');
      });

      it('should append new question to existing array', () => {
        createQuestion({
          agent_id: 'qa',
          workstream_id: 'WS-2',
          question: 'New question?',
          priority: 'high',
        }, '/test/path');

        const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
        const written = JSON.parse(writeCall[1] as string);

        expect(written.questions.length).toBe(2);
        expect(written.questions[0].id).toBe('q1');
        expect(written.questions[1].question).toBe('New question?');
      });
    });

    describe('validation', () => {
      beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockExistingQuestions));
        vi.mocked(fs.writeFileSync).mockImplementation(() => {});
        vi.mocked(fs.renameSync).mockImplementation(() => {});
      });

      it('should return null if agent_id is missing', () => {
        const result = createQuestion({
          workstream_id: 'WS-1',
          question: 'New question?',
          priority: 'medium',
        } as any, '/test/path');

        expect(result).toBeNull();
      });

      it('should return null if workstream_id is missing', () => {
        const result = createQuestion({
          agent_id: 'dev',
          question: 'New question?',
          priority: 'medium',
        } as any, '/test/path');

        expect(result).toBeNull();
      });

      it('should return null if question text is missing', () => {
        const result = createQuestion({
          agent_id: 'dev',
          workstream_id: 'WS-1',
          priority: 'medium',
        } as any, '/test/path');

        expect(result).toBeNull();
      });

      it('should return null if question text is empty', () => {
        const result = createQuestion({
          agent_id: 'dev',
          workstream_id: 'WS-1',
          question: '',
          priority: 'medium',
        }, '/test/path');

        expect(result).toBeNull();
      });

      it('should accept valid priority values', () => {
        const priorities = ['low', 'medium', 'high', 'critical'] as const;

        priorities.forEach(priority => {
          vi.clearAllMocks();
          const result = createQuestion({
            agent_id: 'dev',
            workstream_id: 'WS-1',
            question: 'Test?',
            priority,
          }, '/test/path');

          expect(result?.priority).toBe(priority);
        });
      });
    });

    describe('atomic write protection', () => {
      beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockExistingQuestions));
        vi.mocked(fs.writeFileSync).mockImplementation(() => {});
        vi.mocked(fs.renameSync).mockImplementation(() => {});
      });

      it('should write to temp file before renaming', () => {
        createQuestion({
          agent_id: 'qa',
          workstream_id: 'WS-2',
          question: 'New question?',
          priority: 'high',
        }, '/test/path');

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
        createQuestion({
          agent_id: 'qa',
          workstream_id: 'WS-2',
          question: 'Question 1?',
          priority: 'high',
        }, '/test/path');
        const firstTempPath = vi.mocked(fs.writeFileSync).mock.calls[0][0];

        vi.clearAllMocks();
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockExistingQuestions));

        createQuestion({
          agent_id: 'qa',
          workstream_id: 'WS-2',
          question: 'Question 2?',
          priority: 'high',
        }, '/test/path');
        const secondTempPath = vi.mocked(fs.writeFileSync).mock.calls[0][0];

        expect(firstTempPath).not.toBe(secondTempPath);
      });

      it('should clean up temp file if rename fails', () => {
        vi.mocked(fs.renameSync).mockImplementation(() => {
          throw new Error('Rename failed');
        });

        expect(() => createQuestion({
          agent_id: 'qa',
          workstream_id: 'WS-2',
          question: 'New question?',
          priority: 'high',
        }, '/test/path')).toThrow('Rename failed');

        expect(fs.unlinkSync).toHaveBeenCalled();

        const unlinkCall = vi.mocked(fs.unlinkSync).mock.calls[0];
        expect(unlinkCall[0]).toMatch(/\.tmp\.\d+\./);
      });

      it('should write valid JSON to temp file', () => {
        createQuestion({
          agent_id: 'qa',
          workstream_id: 'WS-2',
          question: 'New question?',
          priority: 'high',
        }, '/test/path');

        const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
        const writtenData = writeCall[1];

        expect(() => JSON.parse(writtenData as string)).not.toThrow();
        const parsed = JSON.parse(writtenData as string);
        expect(parsed.questions).toBeDefined();
        expect(Array.isArray(parsed.questions)).toBe(true);
      });
    });

    describe('missing file handling', () => {
      beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(fs.writeFileSync).mockImplementation(() => {});
        vi.mocked(fs.renameSync).mockImplementation(() => {});
      });

      it('should create new file if questions file missing', () => {
        vi.mocked(fs.readFileSync).mockImplementation(() => {
          throw new Error('File not found');
        });

        const result = createQuestion({
          agent_id: 'qa',
          workstream_id: 'WS-2',
          question: 'First question?',
          priority: 'high',
        }, '/test/path');

        expect(result).toBeDefined();
        expect(fs.writeFileSync).toHaveBeenCalled();

        const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
        const written = JSON.parse(writeCall[1] as string);

        expect(written.questions.length).toBe(1);
        expect(written.questions[0].question).toBe('First question?');
      });
    });

    describe('malformed file handling', () => {
      beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(fs.writeFileSync).mockImplementation(() => {});
        vi.mocked(fs.renameSync).mockImplementation(() => {});
      });

      it('should handle malformed JSON gracefully', () => {
        vi.mocked(fs.readFileSync).mockReturnValue('{ invalid json }');

        const result = createQuestion({
          agent_id: 'qa',
          workstream_id: 'WS-2',
          question: 'New question?',
          priority: 'high',
        }, '/test/path');

        expect(result).toBeDefined();
        expect(fs.writeFileSync).toHaveBeenCalled();

        const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
        const written = JSON.parse(writeCall[1] as string);

        // Should create new array with single question
        expect(written.questions.length).toBe(1);
      });

      it('should handle questions not being an array', () => {
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
          questions: 'not an array'
        }));

        const result = createQuestion({
          agent_id: 'qa',
          workstream_id: 'WS-2',
          question: 'New question?',
          priority: 'high',
        }, '/test/path');

        expect(result).toBeDefined();

        const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
        const written = JSON.parse(writeCall[1] as string);

        expect(Array.isArray(written.questions)).toBe(true);
        expect(written.questions.length).toBe(1);
      });
    });

    describe('error handling', () => {
      it('should propagate write errors', () => {
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockExistingQuestions));
        vi.mocked(fs.writeFileSync).mockImplementation(() => {
          throw new Error('Disk full');
        });

        expect(() => createQuestion({
          agent_id: 'qa',
          workstream_id: 'WS-2',
          question: 'New question?',
          priority: 'high',
        }, '/test/path')).toThrow('Disk full');
      });
    });
  });
});

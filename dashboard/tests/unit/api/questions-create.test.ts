import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Tests for POST /api/questions endpoint

vi.mock('@/lib/data/question-creator', () => ({
  createQuestion: vi.fn(),
}));

describe('POST /api/questions', () => {
  let POST: any;
  let createQuestionMock: any;

  beforeEach(async () => {
    vi.resetModules();
    const creatorModule = await import('@/lib/data/question-creator');
    createQuestionMock = creatorModule.createQuestion;

    // @ts-expect-error - module not implemented yet
    const module = await import('../../../src/app/api/questions/route');
    POST = module.POST;
  });

  describe('successful creation', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(createQuestionMock).mockReturnValue({
        id: 'q-123',
        timestamp: '2026-02-07T10:00:00Z',
        agent_id: 'qa',
        workstream_id: 'WS-2',
        question: 'Should we proceed?',
        priority: 'high',
        status: 'open',
      });
    });

    it('should return 201 with created question', async () => {
      const request = new NextRequest('http://localhost:3000/api/questions', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: 'qa',
          workstream_id: 'WS-2',
          question: 'Should we proceed?',
          priority: 'high',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      expect(data.data.id).toBe('q-123');
      expect(data.data.question).toBe('Should we proceed?');
    });

    it('should return ApiResponse envelope', async () => {
      const request = new NextRequest('http://localhost:3000/api/questions', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: 'qa',
          workstream_id: 'WS-2',
          question: 'Should we proceed?',
          priority: 'high',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('error');
    });

    it('should call createQuestion with correct parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/questions', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: 'qa',
          workstream_id: 'WS-2',
          question: 'Should we proceed?',
          priority: 'high',
          context: 'Additional context',
        }),
      });

      await POST(request);

      expect(createQuestionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          agent_id: 'qa',
          workstream_id: 'WS-2',
          question: 'Should we proceed?',
          priority: 'high',
          context: 'Additional context',
        }),
        expect.any(String)
      );
    });

    it('should default priority to medium if not provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/questions', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: 'qa',
          workstream_id: 'WS-2',
          question: 'Should we proceed?',
        }),
      });

      await POST(request);

      expect(createQuestionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'medium',
        }),
        expect.any(String)
      );
    });
  });

  describe('validation errors', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return 400 if agent_id is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/questions', {
        method: 'POST',
        body: JSON.stringify({
          workstream_id: 'WS-2',
          question: 'Should we proceed?',
          priority: 'high',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.error).toContain('agent_id');
    });

    it('should return 400 if workstream_id is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/questions', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: 'qa',
          question: 'Should we proceed?',
          priority: 'high',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.error).toContain('workstream_id');
    });

    it('should return 400 if question is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/questions', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: 'qa',
          workstream_id: 'WS-2',
          priority: 'high',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.error).toContain('question');
    });

    it('should return 400 if question is empty string', async () => {
      const request = new NextRequest('http://localhost:3000/api/questions', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: 'qa',
          workstream_id: 'WS-2',
          question: '',
          priority: 'high',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('question');
    });

    it('should return 400 if priority is invalid', async () => {
      const request = new NextRequest('http://localhost:3000/api/questions', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: 'qa',
          workstream_id: 'WS-2',
          question: 'Should we proceed?',
          priority: 'invalid',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.error).toContain('priority');
    });

    it('should accept valid priority values', async () => {
      const priorities = ['low', 'medium', 'high', 'critical'];

      for (const priority of priorities) {
        vi.clearAllMocks();
        vi.mocked(createQuestionMock).mockReturnValue({
          id: 'q-123',
          timestamp: '2026-02-07T10:00:00Z',
          agent_id: 'qa',
          workstream_id: 'WS-2',
          question: 'Test?',
          priority,
          status: 'open',
        });

        const request = new NextRequest('http://localhost:3000/api/questions', {
          method: 'POST',
          body: JSON.stringify({
            agent_id: 'qa',
            workstream_id: 'WS-2',
            question: 'Test?',
            priority,
          }),
        });

        const response = await POST(request);
        expect(response.status).toBe(201);
      }
    });

    it('should return 400 if body is invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/questions', {
        method: 'POST',
        body: '{ invalid json }',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 if body is empty', async () => {
      const request = new NextRequest('http://localhost:3000/api/questions', {
        method: 'POST',
        body: '',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('creation failures', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return 500 if createQuestion returns null', async () => {
      vi.mocked(createQuestionMock).mockReturnValue(null);

      const request = new NextRequest('http://localhost:3000/api/questions', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: 'qa',
          workstream_id: 'WS-2',
          question: 'Should we proceed?',
          priority: 'high',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should return 500 if createQuestion throws error', async () => {
      vi.mocked(createQuestionMock).mockImplementation(() => {
        throw new Error('Disk full');
      });

      const request = new NextRequest('http://localhost:3000/api/questions', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: 'qa',
          workstream_id: 'WS-2',
          question: 'Should we proceed?',
          priority: 'high',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Disk full');
    });
  });

  describe('optional fields', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(createQuestionMock).mockReturnValue({
        id: 'q-123',
        timestamp: '2026-02-07T10:00:00Z',
        agent_id: 'qa',
        workstream_id: 'WS-2',
        question: 'Should we proceed?',
        priority: 'high',
        status: 'open',
        context: 'Additional context',
      });
    });

    it('should handle optional context field', async () => {
      const request = new NextRequest('http://localhost:3000/api/questions', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: 'qa',
          workstream_id: 'WS-2',
          question: 'Should we proceed?',
          priority: 'high',
          context: 'Additional context',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.context).toBe('Additional context');
    });

    it('should work without context field', async () => {
      vi.mocked(createQuestionMock).mockReturnValue({
        id: 'q-123',
        timestamp: '2026-02-07T10:00:00Z',
        agent_id: 'qa',
        workstream_id: 'WS-2',
        question: 'Should we proceed?',
        priority: 'high',
        status: 'open',
      });

      const request = new NextRequest('http://localhost:3000/api/questions', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: 'qa',
          workstream_id: 'WS-2',
          question: 'Should we proceed?',
          priority: 'high',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
    });
  });
});

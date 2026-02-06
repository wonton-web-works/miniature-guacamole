import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ApiError,
  fetchWorkstreams,
  fetchWorkstreamById,
  fetchSystemHealth,
  fetchQuestions,
  fetchQuestionById,
  updateQuestionPriority,
  answerQuestion,
} from '@/lib/api-client';

global.fetch = vi.fn();

describe('ApiError', () => {
  it('creates error with message and status', () => {
    const error = new ApiError('Test error', 404);
    expect(error.message).toBe('Test error');
    expect(error.status).toBe(404);
    expect(error.name).toBe('ApiError');
  });
});

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchWorkstreams', () => {
    it('fetches workstreams successfully', async () => {
      const mockData = [{ id: 'ws-1', name: 'Test Workstream' }];
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const result = await fetchWorkstreams();
      expect(result).toEqual(mockData);
      expect(fetch).toHaveBeenCalledWith('/api/workstreams');
    });

    it('throws ApiError on failure', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(fetchWorkstreams()).rejects.toThrow(ApiError);
      await expect(fetchWorkstreams()).rejects.toThrow('Failed to fetch workstreams: Internal Server Error');
    });
  });

  describe('fetchWorkstreamById', () => {
    it('fetches workstream by id successfully', async () => {
      const mockData = { id: 'ws-1', name: 'Test Workstream' };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const result = await fetchWorkstreamById('ws-1');
      expect(result).toEqual(mockData);
      expect(fetch).toHaveBeenCalledWith('/api/workstreams/ws-1');
    });

    it('throws ApiError on 404', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      await expect(fetchWorkstreamById('ws-999')).rejects.toThrow(ApiError);
    });
  });

  describe('fetchSystemHealth', () => {
    it('fetches system health successfully', async () => {
      const mockData = { status: 'healthy', checks: [] };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const result = await fetchSystemHealth();
      expect(result).toEqual(mockData);
      expect(fetch).toHaveBeenCalledWith('/api/health');
    });

    it('throws ApiError on failure', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      } as Response);

      await expect(fetchSystemHealth()).rejects.toThrow(ApiError);
    });
  });

  describe('fetchQuestions', () => {
    it('fetches questions successfully', async () => {
      const mockData = [{ id: 'q-1', question: 'Test?' }];
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const result = await fetchQuestions();
      expect(result).toEqual(mockData);
      expect(fetch).toHaveBeenCalledWith('/api/questions');
    });

    it('throws ApiError on failure', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(fetchQuestions()).rejects.toThrow(ApiError);
    });
  });

  describe('fetchQuestionById', () => {
    it('fetches question by id successfully', async () => {
      const mockData = { id: 'q-1', question: 'Test?' };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const result = await fetchQuestionById('q-1');
      expect(result).toEqual(mockData);
      expect(fetch).toHaveBeenCalledWith('/api/questions/q-1');
    });

    it('throws ApiError on 404', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      await expect(fetchQuestionById('q-999')).rejects.toThrow(ApiError);
    });
  });

  describe('updateQuestionPriority', () => {
    it('updates question priority successfully', async () => {
      const mockData = { id: 'q-1', priority: 'high' };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const result = await updateQuestionPriority('q-1', 'high');
      expect(result).toEqual(mockData);
      expect(fetch).toHaveBeenCalledWith('/api/questions/q-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: 'high' }),
      });
    });

    it('throws ApiError on failure', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      } as Response);

      await expect(updateQuestionPriority('q-1', 'high')).rejects.toThrow(ApiError);
    });
  });

  describe('answerQuestion', () => {
    it('answers question successfully', async () => {
      const mockData = { id: 'q-1', answer: 'Test answer' };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const result = await answerQuestion('q-1', 'Test answer');
      expect(result).toEqual(mockData);
      expect(fetch).toHaveBeenCalledWith('/api/questions/q-1/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: 'Test answer' }),
      });
    });

    it('throws ApiError on failure', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(answerQuestion('q-1', 'Test answer')).rejects.toThrow(ApiError);
    });
  });
});

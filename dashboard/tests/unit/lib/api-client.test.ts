import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ApiError,
  getWorkstreams,
  getWorkstreamById,
  getActivities,
  getQuestions,
  getHealth,
  answerQuestion,
} from '@/lib/api-client';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function mockApiResponse(data: unknown, success = true) {
  return {
    ok: success,
    status: success ? 200 : 500,
    json: async () => ({
      success,
      data: success ? data : null,
      error: success ? null : 'Server error',
      timestamp: new Date().toISOString(),
    }),
  } as Response;
}

describe('ApiError', () => {
  it('creates error with message and status', () => {
    const error = new ApiError('Test error', 404);
    expect(error.message).toBe('Test error');
    expect(error.status).toBe(404);
    expect(error.name).toBe('ApiError');
  });

  it('stores response data', () => {
    const resp = { success: false, data: null, error: 'not found', timestamp: '' };
    const error = new ApiError('not found', 404, resp);
    expect(error.response).toBe(resp);
  });
});

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getWorkstreams', () => {
    it('fetches workstreams successfully', async () => {
      const mockData = [{ workstream_id: 'ws-1', name: 'Test' }];
      mockFetch.mockResolvedValueOnce(mockApiResponse(mockData));

      const result = await getWorkstreams();
      expect(result).toEqual(mockData);
      expect(mockFetch.mock.calls[0][0]).toBe('/api/workstreams');
    });

    it('passes status filter as query param', async () => {
      mockFetch.mockResolvedValueOnce(mockApiResponse([]));
      await getWorkstreams('blocked');
      expect(mockFetch.mock.calls[0][0]).toBe('/api/workstreams?status=blocked');
    });

    it('throws ApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce(mockApiResponse(null, false));
      await expect(getWorkstreams()).rejects.toThrow(ApiError);
    });
  });

  describe('getWorkstreamById', () => {
    it('fetches workstream by id successfully', async () => {
      const mockData = { workstream_id: 'ws-1', name: 'Test' };
      mockFetch.mockResolvedValueOnce(mockApiResponse(mockData));

      const result = await getWorkstreamById('ws-1');
      expect(result).toEqual(mockData);
      expect(mockFetch.mock.calls[0][0]).toBe('/api/workstreams/ws-1');
    });

    it('throws ApiError on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          success: false,
          data: null,
          error: 'Not found',
          timestamp: new Date().toISOString(),
        }),
      } as Response);

      await expect(getWorkstreamById('ws-999')).rejects.toThrow(ApiError);
    });
  });

  describe('getActivities', () => {
    it('fetches activities successfully', async () => {
      const mockData = [{ id: 'a-1', description: 'Test' }];
      mockFetch.mockResolvedValueOnce(mockApiResponse(mockData));

      const result = await getActivities();
      expect(result).toEqual(mockData);
      expect(mockFetch.mock.calls[0][0]).toBe('/api/activities');
    });

    it('passes limit and offset as query params', async () => {
      mockFetch.mockResolvedValueOnce(mockApiResponse([]));
      await getActivities({ limit: 10, offset: 20 });
      expect(mockFetch.mock.calls[0][0]).toBe('/api/activities?limit=10&offset=20');
    });

    it('throws ApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce(mockApiResponse(null, false));
      await expect(getActivities()).rejects.toThrow(ApiError);
    });
  });

  describe('getQuestions', () => {
    it('fetches questions successfully', async () => {
      const mockData = [{ id: 'q-1', question: 'Test?' }];
      mockFetch.mockResolvedValueOnce(mockApiResponse(mockData));

      const result = await getQuestions();
      expect(result).toEqual(mockData);
      expect(mockFetch.mock.calls[0][0]).toBe('/api/questions');
    });

    it('passes status filter', async () => {
      mockFetch.mockResolvedValueOnce(mockApiResponse([]));
      await getQuestions('open');
      expect(mockFetch.mock.calls[0][0]).toBe('/api/questions?status=open');
    });

    it('throws ApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce(mockApiResponse(null, false));
      await expect(getQuestions()).rejects.toThrow(ApiError);
    });
  });

  describe('getHealth', () => {
    it('fetches health successfully', async () => {
      const mockData = { status: 'healthy', checks: {} };
      mockFetch.mockResolvedValueOnce(mockApiResponse(mockData));

      const result = await getHealth();
      expect(result).toEqual(mockData);
      expect(mockFetch.mock.calls[0][0]).toBe('/api/health');
    });

    it('throws ApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce(mockApiResponse(null, false));
      await expect(getHealth()).rejects.toThrow(ApiError);
    });
  });

  describe('answerQuestion', () => {
    it('answers question successfully', async () => {
      const mockData = { success: true };
      mockFetch.mockResolvedValueOnce(mockApiResponse(mockData));

      const result = await answerQuestion('q-1', 'My answer', 'approve');
      expect(result).toEqual(mockData);
      expect(mockFetch.mock.calls[0][0]).toBe('/api/questions/q-1/answer');
      expect(mockFetch.mock.calls[0][1]).toEqual({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: 'My answer', action: 'approve' }),
      });
    });

    it('encodes question id in URL', async () => {
      mockFetch.mockResolvedValueOnce(mockApiResponse({ success: true }));
      await answerQuestion('q/special', 'answer', 'respond');
      expect(mockFetch.mock.calls[0][0]).toBe('/api/questions/q%2Fspecial/answer');
    });

    it('throws ApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce(mockApiResponse(null, false));
      await expect(answerQuestion('q-1', 'answer', 'approve')).rejects.toThrow(ApiError);
    });
  });
});

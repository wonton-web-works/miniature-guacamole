import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useQuestions } from '@/hooks/use-questions';
import type { AgentQuestion } from '@/lib/types';

// Mock api-client
vi.mock('@/lib/api-client', () => ({
  getQuestions: vi.fn(),
}));

describe('useQuestions', () => {
  let getQuestionsMock: any;

  const mockOpenQuestions: AgentQuestion[] = [
    {
      id: 'q1',
      timestamp: '2026-02-07T10:00:00Z',
      agent_id: 'dev',
      workstream_id: 'WS-1',
      question: 'Should we proceed with feature X?',
      priority: 'critical',
      status: 'open',
    },
    {
      id: 'q2',
      timestamp: '2026-02-07T09:00:00Z',
      agent_id: 'qa',
      workstream_id: 'WS-2',
      question: 'Need approval for testing?',
      priority: 'high',
      status: 'open',
    },
    {
      id: 'q3',
      timestamp: '2026-02-07T08:00:00Z',
      agent_id: 'pm',
      workstream_id: 'WS-1',
      question: 'Update timeline?',
      priority: 'medium',
      status: 'open',
    },
  ];

  const mockAnsweredQuestions: AgentQuestion[] = [
    {
      id: 'q4',
      timestamp: '2026-02-06T10:00:00Z',
      agent_id: 'dev',
      workstream_id: 'WS-1',
      question: 'Deploy to production?',
      priority: 'high',
      status: 'answered',
      answered_at: '2026-02-06T11:00:00Z',
      answer: 'Approved',
    },
  ];

  beforeEach(async () => {
    vi.clearAllMocks();

    const apiClient = await import('@/lib/api-client');
    getQuestionsMock = apiClient.getQuestions;
    vi.mocked(getQuestionsMock).mockImplementation((status: string) => {
      if (status === 'open') {
        return Promise.resolve(mockOpenQuestions);
      } else if (status === 'answered') {
        return Promise.resolve(mockAnsweredQuestions);
      }
      return Promise.resolve([]);
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial data fetching', () => {
    it('should fetch open and answered questions on mount', async () => {
      renderHook(() => useQuestions(5000));

      await waitFor(() => {
        expect(getQuestionsMock).toHaveBeenCalledWith('open');
        expect(getQuestionsMock).toHaveBeenCalledWith('answered');
      });
    });

    it('should start in loading state', () => {
      const { result } = renderHook(() => useQuestions(5000));

      expect(result.current.isLoading).toBe(true);
    });

    it('should populate openQuestions with data', async () => {
      const { result } = renderHook(() => useQuestions(5000));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.openQuestions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'q1' }),
          expect.objectContaining({ id: 'q2' }),
          expect.objectContaining({ id: 'q3' }),
        ])
      );
    });

    it('should populate answeredQuestions with data', async () => {
      const { result } = renderHook(() => useQuestions(5000));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.answeredQuestions).toEqual([
        expect.objectContaining({ id: 'q4' }),
      ]);
    });

    it('should set loading to false after fetch completes', async () => {
      const { result } = renderHook(() => useQuestions(5000));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('priority sorting', () => {
    it('should sort open questions by priority (critical > high > medium > low)', async () => {
      const { result } = renderHook(() => useQuestions(5000));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const priorities = result.current.openQuestions.map(q => q.priority);
      expect(priorities).toEqual(['critical', 'high', 'medium']);
    });

    it('should maintain priority order across refetches', async () => {
      const { result } = renderHook(() => useQuestions(5000));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const firstOrder = result.current.openQuestions.map(q => q.priority);

      act(() => {
        result.current.refresh();
      });

      await waitFor(() => {
        const secondOrder = result.current.openQuestions.map(q => q.priority);
        expect(secondOrder).toEqual(firstOrder);
      });
    });
  });

  describe('answered questions limit', () => {
    it('should limit answered questions to last 10', async () => {
      const manyAnswered = Array.from({ length: 15 }, (_, i) => ({
        id: `q-answered-${i}`,
        timestamp: `2026-02-0${Math.floor(i / 10) + 1}T10:00:00Z`,
        agent_id: 'dev',
        workstream_id: 'WS-1',
        question: `Question ${i}?`,
        priority: 'medium' as const,
        status: 'answered' as const,
        answered_at: `2026-02-0${Math.floor(i / 10) + 1}T11:00:00Z`,
        answer: 'Answered',
      }));

      vi.mocked(getQuestionsMock).mockImplementation((status: string) => {
        if (status === 'answered') {
          return Promise.resolve(manyAnswered);
        }
        return Promise.resolve([]);
      });

      const { result } = renderHook(() => useQuestions(5000));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.answeredQuestions.length).toBe(10);
    });
  });

  describe('polling behavior', () => {
    it('should poll at specified interval', async () => {
      vi.useFakeTimers();

      renderHook(() => useQuestions(100));

      // Wait for initial fetch
      await vi.runOnlyPendingTimersAsync();

      const initialCalls = getQuestionsMock.mock.calls.length;
      expect(initialCalls).toBeGreaterThanOrEqual(2); // At least open and answered

      // Advance timers to trigger next poll
      await vi.advanceTimersByTimeAsync(100);

      // Should have made another poll (2 more calls for open+answered)
      expect(getQuestionsMock.mock.calls.length).toBeGreaterThan(initialCalls);

      vi.useRealTimers();
    });

    it('should stop polling on unmount', async () => {
      vi.useFakeTimers();

      const { unmount } = renderHook(() => useQuestions(1000));

      await vi.runOnlyPendingTimersAsync();
      expect(getQuestionsMock).toHaveBeenCalled();

      const callCountBeforeUnmount = getQuestionsMock.mock.calls.length;

      unmount();

      await vi.advanceTimersByTimeAsync(2000);

      // Should not have made additional calls after unmount
      expect(getQuestionsMock).toHaveBeenCalledTimes(callCountBeforeUnmount);

      vi.useRealTimers();
    });

    it('should use default polling interval of 5000ms', async () => {
      vi.useFakeTimers();

      renderHook(() => useQuestions());

      await vi.runOnlyPendingTimersAsync();
      expect(getQuestionsMock).toHaveBeenCalled();

      const initialCalls = getQuestionsMock.mock.calls.length;

      await vi.advanceTimersByTimeAsync(4999);
      expect(getQuestionsMock).toHaveBeenCalledTimes(initialCalls);

      await vi.advanceTimersByTimeAsync(1);
      expect(getQuestionsMock.mock.calls.length).toBeGreaterThan(initialCalls);

      vi.useRealTimers();
    });
  });

  describe('manual refresh', () => {
    it('should provide refresh function', async () => {
      const { result } = renderHook(() => useQuestions(5000));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.refresh).toBeDefined();
      expect(typeof result.current.refresh).toBe('function');
    });

    it('should fetch data when refresh is called', async () => {
      const { result } = renderHook(() => useQuestions(5000));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const callCountBefore = getQuestionsMock.mock.calls.length;

      act(() => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(getQuestionsMock.mock.calls.length).toBeGreaterThan(callCountBefore);
      });
    });

    it('should update data after refresh', async () => {
      const { result } = renderHook(() => useQuestions(5000));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newQuestion: AgentQuestion = {
        id: 'q-new',
        timestamp: '2026-02-07T12:00:00Z',
        agent_id: 'dev',
        workstream_id: 'WS-3',
        question: 'New question?',
        priority: 'critical',
        status: 'open',
      };

      vi.mocked(getQuestionsMock).mockImplementation((status: string) => {
        if (status === 'open') {
          return Promise.resolve([...mockOpenQuestions, newQuestion]);
        }
        return Promise.resolve(mockAnsweredQuestions);
      });

      act(() => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.openQuestions).toContainEqual(
          expect.objectContaining({ id: 'q-new' })
        );
      });
    });
  });

  describe('error handling', () => {
    it('should set error state when fetch fails', async () => {
      vi.mocked(getQuestionsMock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useQuestions(5000));

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });
    });

    it('should stop loading when error occurs', async () => {
      vi.mocked(getQuestionsMock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useQuestions(5000));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should clear error on successful fetch', async () => {
      vi.mocked(getQuestionsMock).mockRejectedValueOnce(new Error('Network error'));
      vi.mocked(getQuestionsMock).mockRejectedValueOnce(new Error('Network error'));
      vi.mocked(getQuestionsMock).mockImplementation((status: string) => {
        if (status === 'open') return Promise.resolve(mockOpenQuestions);
        return Promise.resolve(mockAnsweredQuestions);
      });

      const { result } = renderHook(() => useQuestions(5000));

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });

      act(() => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(getQuestionsMock).mockRejectedValue('String error');

      const { result } = renderHook(() => useQuestions(5000));

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch questions');
      });
    });
  });

  describe('SSE integration notes', () => {
    // Note: Full SSE integration would be tested in integration tests
    // These are unit tests for the hook behavior
    // SSE events would trigger refresh() in the parent component

    it('should update when refresh is called by SSE handler', async () => {
      const { result } = renderHook(() => useQuestions(5000));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialQuestions = result.current.openQuestions.length;

      const newQuestion: AgentQuestion = {
        id: 'q-sse',
        timestamp: '2026-02-07T12:00:00Z',
        agent_id: 'dev',
        workstream_id: 'WS-4',
        question: 'SSE triggered question?',
        priority: 'high',
        status: 'open',
      };

      vi.mocked(getQuestionsMock).mockImplementation((status: string) => {
        if (status === 'open') {
          return Promise.resolve([...mockOpenQuestions, newQuestion]);
        }
        return Promise.resolve(mockAnsweredQuestions);
      });

      // Simulate SSE event triggering refresh
      act(() => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.openQuestions.length).toBe(initialQuestions + 1);
      });
    });
  });
});

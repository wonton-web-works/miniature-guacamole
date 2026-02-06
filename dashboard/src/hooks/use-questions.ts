'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getQuestions } from '@/lib/api-client';
import type { AgentQuestion } from '@/lib/types';

interface UseQuestionsResult {
  openQuestions: AgentQuestion[];
  answeredQuestions: AgentQuestion[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useQuestions(pollingInterval = 5000): UseQuestionsResult {
  const [openQuestions, setOpenQuestions] = useState<AgentQuestion[]>([]);
  const [answeredQuestions, setAnsweredQuestions] = useState<AgentQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const fetchData = useCallback(async () => {
    try {
      const [open, answered] = await Promise.all([
        getQuestions('open'),
        getQuestions('answered'),
      ]);

      // Sort open by priority: critical > high > medium > low
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      open.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      setOpenQuestions(open);
      setAnsweredQuestions(answered.slice(0, 10)); // Keep last 10
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch questions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, pollingInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData, pollingInterval]);

  return { openQuestions, answeredQuestions, isLoading, error, refresh: fetchData };
}

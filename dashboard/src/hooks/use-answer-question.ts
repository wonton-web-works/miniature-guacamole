'use client';

import { useState, useCallback } from 'react';
import { answerQuestion } from '@/lib/api-client';

interface UseAnswerQuestionResult {
  submitAnswer: (questionId: string, answer: string, action: 'approve' | 'reject' | 'respond') => void;
  submittingId: string | null;
  error: string | null;
}

export function useAnswerQuestion(
  onSuccess?: () => void
): UseAnswerQuestionResult {
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitAnswer = useCallback(
    async (questionId: string, answer: string, action: 'approve' | 'reject' | 'respond') => {
      setSubmittingId(questionId);
      setError(null);

      try {
        await answerQuestion(questionId, answer, action);
        onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to submit answer');
      } finally {
        setSubmittingId(null);
      }
    },
    [onSuccess]
  );

  return { submitAnswer, submittingId, error };
}

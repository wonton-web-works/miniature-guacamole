'use client';

import { useState } from 'react';
import { QuestionCard } from './question-card';
import { QuestionModal } from './question-modal';
import type { AgentQuestion } from '@/lib/types';

interface PendingQuestionsProps {
  openQuestions: AgentQuestion[];
  answeredQuestions: AgentQuestion[];
  onAnswer: (questionId: string, answer: string, action: 'approve' | 'reject' | 'respond') => void;
  submittingId: string | null;
}

export function PendingQuestions({
  openQuestions,
  answeredQuestions,
  onAnswer,
  submittingId,
}: PendingQuestionsProps) {
  const [showModal, setShowModal] = useState(false);

  if (openQuestions.length === 0) return null;

  const displayQuestions = openQuestions.slice(0, 2);
  const moreCount = openQuestions.length - displayQuestions.length;

  return (
    <div className="border-b p-4 space-y-3" data-testid="pending-questions">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">
          Pending Questions ({openQuestions.length})
        </h2>
        {openQuestions.length > 2 && (
          <button
            onClick={() => setShowModal(true)}
            className="text-xs text-primary hover:underline"
            data-testid="view-all-questions"
          >
            View all
          </button>
        )}
      </div>
      <div className="space-y-3">
        {displayQuestions.map((q) => (
          <QuestionCard
            key={q.id}
            question={q}
            onAnswer={onAnswer}
            isSubmitting={submittingId === q.id}
          />
        ))}
      </div>
      {moreCount > 0 && (
        <button
          onClick={() => setShowModal(true)}
          className="w-full py-2 text-center text-xs text-muted-foreground hover:text-foreground"
        >
          +{moreCount} more question{moreCount !== 1 ? 's' : ''}
        </button>
      )}
      <QuestionModal
        open={showModal}
        onClose={() => setShowModal(false)}
        openQuestions={openQuestions}
        answeredQuestions={answeredQuestions}
        onAnswer={onAnswer}
        submittingId={submittingId}
      />
    </div>
  );
}

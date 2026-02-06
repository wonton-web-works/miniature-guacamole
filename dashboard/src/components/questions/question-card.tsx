'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PriorityBadge } from './priority-badge';
import { QuestionResponse } from './question-response';
import { RelativeTime } from '@/components/shared/relative-time';
import type { AgentQuestion } from '@/lib/types';

interface QuestionCardProps {
  question: AgentQuestion;
  onAnswer: (questionId: string, answer: string, action: 'approve' | 'reject' | 'respond') => void;
  isSubmitting: boolean;
}

export function QuestionCard({ question, onAnswer, isSubmitting }: QuestionCardProps) {
  return (
    <Card className="animate-slide-up" data-testid={`question-card-${question.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-snug">{question.question}</p>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{question.agent_id}</span>
              <span>&middot;</span>
              <RelativeTime timestamp={question.timestamp} />
            </div>
          </div>
          <PriorityBadge priority={question.priority} />
        </div>
      </CardHeader>
      <CardContent>
        {question.context && (
          <p className="mb-3 text-xs text-muted-foreground bg-muted p-2 rounded">
            {question.context}
          </p>
        )}
        <QuestionResponse
          questionId={question.id}
          onSubmit={onAnswer}
          isSubmitting={isSubmitting}
        />
      </CardContent>
    </Card>
  );
}

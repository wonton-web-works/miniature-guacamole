'use client';

import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { PriorityBadge } from './priority-badge';
import { RelativeTime } from '@/components/shared/relative-time';
import type { AgentQuestion } from '@/lib/types';

interface AnsweredQuestionProps {
  question: AgentQuestion;
}

export function AnsweredQuestion({ question }: AnsweredQuestionProps) {
  return (
    <AccordionItem value={question.id} data-testid={`answered-question-${question.id}`}>
      <AccordionTrigger className="text-sm py-2">
        <div className="flex items-center gap-2 text-left">
          <span className="truncate">{question.question}</span>
          <PriorityBadge priority={question.priority} />
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-2 text-sm">
          {question.context && (
            <p className="text-xs text-muted-foreground bg-muted p-2 rounded">{question.context}</p>
          )}
          {question.answer && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Answer:</p>
              <p className="mt-1">{question.answer}</p>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{question.agent_id}</span>
            {question.answered_at && (
              <>
                <span>&middot;</span>
                <span>Answered</span>
                <RelativeTime timestamp={question.answered_at} />
              </>
            )}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

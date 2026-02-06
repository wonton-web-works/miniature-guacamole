'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion } from '@/components/ui/accordion';
import { QuestionCard } from './question-card';
import { AnsweredQuestion } from './answered-question';
import type { AgentQuestion } from '@/lib/types';

interface QuestionModalProps {
  open: boolean;
  onClose: () => void;
  openQuestions: AgentQuestion[];
  answeredQuestions: AgentQuestion[];
  onAnswer: (questionId: string, answer: string, action: 'approve' | 'reject' | 'respond') => void;
  submittingId: string | null;
}

export function QuestionModal({
  open,
  onClose,
  openQuestions,
  answeredQuestions,
  onAnswer,
  submittingId,
}: QuestionModalProps) {
  const criticalQuestions = openQuestions.filter((q) => q.priority === 'critical' || q.priority === 'high');
  const otherQuestions = openQuestions.filter((q) => q.priority !== 'critical' && q.priority !== 'high');

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh]" data-testid="question-modal">
        <DialogHeader>
          <DialogTitle>Agent Questions ({openQuestions.length} pending)</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6">
            {criticalQuestions.length > 0 && (
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wider text-destructive mb-3">
                  Urgent
                </h3>
                <div className="space-y-3">
                  {criticalQuestions.map((q) => (
                    <QuestionCard
                      key={q.id}
                      question={q}
                      onAnswer={onAnswer}
                      isSubmitting={submittingId === q.id}
                    />
                  ))}
                </div>
              </div>
            )}
            {otherQuestions.length > 0 && (
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                  Other Questions
                </h3>
                <div className="space-y-3">
                  {otherQuestions.map((q) => (
                    <QuestionCard
                      key={q.id}
                      question={q}
                      onAnswer={onAnswer}
                      isSubmitting={submittingId === q.id}
                    />
                  ))}
                </div>
              </div>
            )}
            {answeredQuestions.length > 0 && (
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                  Recently Answered
                </h3>
                <Accordion type="multiple">
                  {answeredQuestions.map((q) => (
                    <AnsweredQuestion key={q.id} question={q} />
                  ))}
                </Accordion>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface QuestionResponseProps {
  questionId: string;
  onSubmit: (questionId: string, answer: string, action: 'approve' | 'reject' | 'respond') => void;
  isSubmitting: boolean;
}

export function QuestionResponse({ questionId, onSubmit, isSubmitting }: QuestionResponseProps) {
  const [answer, setAnswer] = useState('');

  const handleAction = (action: 'approve' | 'reject' | 'respond') => {
    onSubmit(questionId, answer, action);
    setAnswer('');
  };

  return (
    <div className="space-y-3" data-testid="question-response">
      <Textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Type your response..."
        className="min-h-[80px] resize-none"
        disabled={isSubmitting}
        data-testid="response-textarea"
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => handleAction('approve')}
          disabled={isSubmitting}
          data-testid="action-approve"
        >
          Approve
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => handleAction('reject')}
          disabled={isSubmitting}
          data-testid="action-reject"
        >
          Reject
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAction('respond')}
          disabled={isSubmitting || !answer.trim()}
          data-testid="action-respond"
        >
          Respond
        </Button>
      </div>
    </div>
  );
}

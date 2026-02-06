import { CheckCircle, Circle } from 'lucide-react';

interface AcceptanceCriteriaProps {
  criteria?: string[];
}

export function AcceptanceCriteria({ criteria }: AcceptanceCriteriaProps) {
  if (!criteria || criteria.length === 0) return null;

  return (
    <div data-testid="acceptance-criteria">
      <h3 className="text-sm font-medium">Acceptance Criteria</h3>
      <ul className="mt-2 space-y-2">
        {criteria.map((criterion, i) => {
          const isDone = criterion.startsWith('[x]') || criterion.startsWith('[X]');
          const text = criterion.replace(/^\[[ xX]\]\s*/, '');

          return (
            <li key={i} className="flex items-start gap-2 text-sm">
              {isDone ? (
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-complete" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className={isDone ? 'text-muted-foreground line-through' : ''}>{text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

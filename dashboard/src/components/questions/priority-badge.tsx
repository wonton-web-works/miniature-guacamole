import { cn } from '@/lib/utils';
import type { QuestionPriority } from '@/lib/types';

const PRIORITY_CONFIG: Record<QuestionPriority, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'bg-red-100 text-red-700 border-red-200' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  medium: { label: 'Medium', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  low: { label: 'Low', className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

interface PriorityBadgeProps {
  priority: QuestionPriority;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase',
        config.className,
        className
      )}
      data-testid="priority-badge"
      data-priority={priority}
    >
      {config.label}
    </span>
  );
}

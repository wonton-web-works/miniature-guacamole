import { cn } from '@/lib/utils';

interface EmptyStateProps {
  message?: string;
  className?: string;
}

export function EmptyState({ message = 'No workstreams found', className }: EmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center py-12 text-center', className)}
      data-testid="empty-state"
    >
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

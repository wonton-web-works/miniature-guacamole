import { cn } from '@/lib/utils';

interface PhaseBadgeProps {
  phase: string;
  className?: string;
}

export function PhaseBadge({ phase, className }: PhaseBadgeProps) {
  const label = phase.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700',
        className
      )}
      data-testid="phase-badge"
    >
      {label}
    </span>
  );
}

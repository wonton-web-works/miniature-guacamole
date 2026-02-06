import { cn } from '@/lib/utils';
import { formatCoverage } from '@/lib/format';

interface CoverageCellProps {
  value?: number | null;
  className?: string;
}

export function CoverageCell({ value, className }: CoverageCellProps) {
  const display = formatCoverage(value);

  const colorClass =
    value === undefined || value === null
      ? 'text-muted-foreground'
      : value >= 90
        ? 'text-status-complete'
        : value >= 70
          ? 'text-status-ready-for-review'
          : 'text-status-blocked';

  return (
    <span
      className={cn('text-sm font-mono', colorClass, className)}
      data-testid="coverage-cell"
    >
      {display}
    </span>
  );
}

'use client';

import { cn } from '@/lib/utils';
import type { WorkstreamCounts } from '@/lib/types';

interface OverviewBarProps {
  counts: WorkstreamCounts;
  className?: string;
}

const SEGMENTS: { key: keyof Omit<WorkstreamCounts, 'total'>; label: string; dotColor: string }[] = [
  { key: 'in_progress', label: 'active', dotColor: 'bg-status-in-progress' },
  { key: 'blocked', label: 'blocked', dotColor: 'bg-status-blocked' },
  { key: 'complete', label: 'complete', dotColor: 'bg-status-complete' },
  { key: 'planning', label: 'planning', dotColor: 'bg-status-planning' },
  { key: 'ready_for_review', label: 'review', dotColor: 'bg-status-ready-for-review' },
];

export function OverviewBar({ counts, className }: OverviewBarProps) {
  return (
    <div
      className={cn('flex flex-wrap items-center gap-4 text-sm text-muted-foreground', className)}
      data-testid="overview-bar"
      role="status"
      aria-label={`${counts.total} total workstreams`}
    >
      <span className="font-medium text-foreground">{counts.total} workstreams</span>
      {SEGMENTS.map(({ key, label, dotColor }) => {
        const count = counts[key];
        if (count === 0) return null;
        return (
          <span key={key} className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', dotColor)} />
            {count} {label}
          </span>
        );
      })}
    </div>
  );
}

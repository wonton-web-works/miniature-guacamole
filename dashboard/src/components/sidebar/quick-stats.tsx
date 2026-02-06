'use client';

import { useWorkstreamCounts } from '@/hooks/use-workstream-counts';
import type { WorkstreamSummary } from '@/lib/types';

interface QuickStatsProps {
  workstreams: WorkstreamSummary[];
}

const STAT_ITEMS: { key: 'in_progress' | 'blocked' | 'complete' | 'planning'; label: string; dotColor: string }[] = [
  { key: 'in_progress', label: 'Active', dotColor: 'bg-status-in-progress' },
  { key: 'blocked', label: 'Blocked', dotColor: 'bg-status-blocked' },
  { key: 'complete', label: 'Complete', dotColor: 'bg-status-complete' },
  { key: 'planning', label: 'Planning', dotColor: 'bg-status-planning' },
];

export function QuickStats({ workstreams }: QuickStatsProps) {
  const counts = useWorkstreamCounts(workstreams);

  return (
    <div data-testid="quick-stats">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Workstreams ({counts.total})
      </h3>
      <div className="mt-2 space-y-1.5">
        {STAT_ITEMS.map(({ key, label, dotColor }) => (
          <div key={key} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${dotColor}`} />
              {label}
            </span>
            <span className="font-medium">{counts[key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

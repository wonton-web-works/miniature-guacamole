'use client';
import { cn } from '@/lib/utils';
import type { WorkstreamStatus } from '@/lib/types';

const STATUS_CONFIG: Record<WorkstreamStatus, { label: string; className: string }> = {
  planning: { label: 'Planning', className: 'bg-status-planning/10 text-status-planning border-status-planning/20' },
  in_progress: { label: 'In Progress', className: 'bg-status-in-progress/10 text-status-in-progress border-status-in-progress/20' },
  ready_for_review: { label: 'Review', className: 'bg-status-ready-for-review/10 text-status-ready-for-review border-status-ready-for-review/20' },
  blocked: { label: 'Blocked', className: 'bg-status-blocked/10 text-status-blocked border-status-blocked/20' },
  complete: { label: 'Complete', className: 'bg-status-complete/10 text-status-complete border-status-complete/20' },
  unknown: { label: 'Unknown', className: 'bg-status-unknown/10 text-status-unknown border-status-unknown/20' },
};

interface StatusBadgeProps {
  status: WorkstreamStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.unknown;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        config.className,
        className
      )}
      data-testid="status-badge"
      data-status={status}
    >
      {config.label}
    </span>
  );
}

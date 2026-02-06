import { RelativeTime } from '@/components/shared/relative-time';
import { cn } from '@/lib/utils';
import type { Activity, ActivityType, AgentHierarchy } from '@/lib/types';

const TYPE_COLORS: Record<ActivityType, string> = {
  workstream_created: 'bg-status-planning',
  workstream_updated: 'bg-status-in-progress',
  phase_changed: 'bg-status-in-progress',
  status_changed: 'bg-status-ready-for-review',
  agent_assigned: 'bg-agent-engineering',
  gate_passed: 'bg-status-complete',
  blocked: 'bg-status-blocked',
  unblocked: 'bg-status-complete',
  completed: 'bg-status-complete',
};

const HIERARCHY_LABELS: Record<AgentHierarchy, string> = {
  leadership: 'Leadership',
  product: 'Product',
  engineering: 'Engineering',
  operations: 'Operations',
  unknown: '',
};

interface ActivityItemProps {
  activity: Activity;
  isNew?: boolean;
}

export function ActivityItem({ activity, isNew }: ActivityItemProps) {
  const dotColor = TYPE_COLORS[activity.type] || 'bg-muted-foreground';
  const hierarchyLabel = HIERARCHY_LABELS[activity.agent_hierarchy];

  return (
    <div
      className={cn('flex gap-3 px-4 py-3 hover:bg-muted/50', isNew && 'animate-fade-in')}
      data-testid={`activity-item-${activity.id}`}
    >
      <span className={cn('mt-2 h-2 w-2 shrink-0 rounded-full', dotColor)} />
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm leading-snug">{activity.description}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">{activity.agent_id}</span>
          {hierarchyLabel && (
            <>
              <span>&middot;</span>
              <span>{hierarchyLabel}</span>
            </>
          )}
          <span>&middot;</span>
          <RelativeTime timestamp={activity.timestamp} />
        </div>
      </div>
    </div>
  );
}

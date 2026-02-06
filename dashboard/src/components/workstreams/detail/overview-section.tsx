import { StatusBadge } from '@/components/shared/status-badge';
import { PhaseBadge } from '@/components/shared/phase-badge';
import { RelativeTime } from '@/components/shared/relative-time';
import type { WorkstreamDetail } from '@/lib/types';

interface OverviewSectionProps {
  workstream: WorkstreamDetail;
}

export function OverviewSection({ workstream }: OverviewSectionProps) {
  return (
    <div className="grid grid-cols-2 gap-4" data-testid="overview-section">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Status</p>
        <StatusBadge status={workstream.status} className="mt-1" />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">Phase</p>
        <PhaseBadge phase={workstream.phase} className="mt-1" />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">Agent</p>
        <p className="mt-1 text-sm">{workstream.agent_id}</p>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">Last Updated</p>
        <RelativeTime timestamp={workstream.timestamp} className="mt-1" />
      </div>
      {workstream.delegated_to && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">Delegated To</p>
          <p className="mt-1 text-sm">{workstream.delegated_to}</p>
        </div>
      )}
      {workstream.blocked_reason && (
        <div className="col-span-2">
          <p className="text-xs font-medium text-destructive">Blocked Reason</p>
          <p className="mt-1 text-sm text-destructive/80">{workstream.blocked_reason}</p>
        </div>
      )}
    </div>
  );
}

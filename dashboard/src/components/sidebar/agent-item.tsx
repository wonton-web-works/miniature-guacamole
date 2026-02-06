import { cn } from '@/lib/utils';
import { RelativeTime } from '@/components/shared/relative-time';

interface AgentItemProps {
  agentId: string;
  isActive: boolean;
  lastSeen: string;
}

export function AgentItem({ agentId, isActive, lastSeen }: AgentItemProps) {
  return (
    <div className="flex items-center justify-between py-1.5" data-testid={`agent-item-${agentId}`}>
      <div className="flex items-center gap-2">
        <span className={cn('h-2 w-2 rounded-full', isActive ? 'bg-status-complete' : 'bg-muted')} />
        <span className="text-sm">{agentId}</span>
      </div>
      <RelativeTime timestamp={lastSeen} />
    </div>
  );
}

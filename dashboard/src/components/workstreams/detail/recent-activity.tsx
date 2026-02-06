import { RelativeTime } from '@/components/shared/relative-time';
import type { Activity } from '@/lib/types';

interface RecentActivityProps {
  activities: Activity[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  if (activities.length === 0) return null;

  return (
    <div data-testid="recent-activity">
      <h3 className="text-sm font-medium">Recent Activity</h3>
      <ul className="mt-2 space-y-3">
        {activities.slice(0, 5).map((activity) => (
          <li key={activity.id} className="flex items-start gap-2 text-sm">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm">{activity.description}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">{activity.agent_id}</span>
                <RelativeTime timestamp={activity.timestamp} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

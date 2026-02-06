'use client';

import { ActivityFeed } from './activity-feed';
import { Sidebar } from '@/components/sidebar/sidebar';
import type { Activity, WorkstreamSummary } from '@/lib/types';

interface ActivityFeedTabProps {
  activities: Activity[];
  isLoadingActivities: boolean;
  hasMoreActivities: boolean;
  onLoadMore: () => void;
  workstreams: WorkstreamSummary[];
  pendingQuestions?: React.ReactNode;
  newActivityIds?: Set<string>;
}

export function ActivityFeedTab({
  activities,
  isLoadingActivities,
  hasMoreActivities,
  onLoadMore,
  workstreams,
  pendingQuestions,
  newActivityIds,
}: ActivityFeedTabProps) {
  return (
    <div className="flex" data-testid="activity-feed-tab">
      <div className="flex-1 min-w-0 border-r">
        {pendingQuestions}
        <ActivityFeed
          activities={activities}
          isLoading={isLoadingActivities}
          hasMore={hasMoreActivities}
          onLoadMore={onLoadMore}
          newActivityIds={newActivityIds}
        />
      </div>
      <div className="w-80 shrink-0">
        <Sidebar workstreams={workstreams} activities={activities} />
      </div>
    </div>
  );
}

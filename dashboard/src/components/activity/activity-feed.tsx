'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { ActivityItem } from './activity-item';
import { ActivityItemSkeleton } from './activity-item-skeleton';
import type { Activity } from '@/lib/types';

interface ActivityFeedProps {
  activities: Activity[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  newActivityIds?: Set<string>;
}

export function ActivityFeed({
  activities,
  isLoading,
  hasMore,
  onLoadMore,
  newActivityIds,
}: ActivityFeedProps) {
  return (
    <ScrollArea className="h-[calc(100vh-200px)]" data-testid="activity-feed">
      <div className="divide-y">
        {isLoading && activities.length === 0 && (
          <>
            {Array.from({ length: 5 }).map((_, i) => (
              <ActivityItemSkeleton key={i} />
            ))}
          </>
        )}
        {activities.map((activity) => (
          <ActivityItem
            key={activity.id}
            activity={activity}
            isNew={newActivityIds?.has(activity.id)}
          />
        ))}
        {activities.length === 0 && !isLoading && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No activity yet
          </div>
        )}
        {hasMore && activities.length > 0 && (
          <button
            onClick={onLoadMore}
            className="w-full py-3 text-center text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50"
            data-testid="load-more"
          >
            Load more
          </button>
        )}
      </div>
    </ScrollArea>
  );
}

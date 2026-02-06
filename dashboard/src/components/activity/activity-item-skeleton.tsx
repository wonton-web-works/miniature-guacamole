export function ActivityItemSkeleton() {
  return (
    <div className="flex gap-3 px-4 py-3 animate-pulse" data-testid="activity-item-skeleton">
      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="h-3 w-1/3 rounded bg-muted" />
      </div>
    </div>
  );
}

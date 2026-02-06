'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getActivities } from '@/lib/api-client';
import type { Activity } from '@/lib/types';

interface UseActivitiesResult {
  activities: Activity[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
}

const PAGE_SIZE = 20;

export function useActivities(pollingInterval = 5000): UseActivitiesResult {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const fetchInitial = useCallback(async () => {
    try {
      const data = await getActivities({ limit: PAGE_SIZE, offset: 0 });
      setActivities(data);
      setHasMore(data.length >= PAGE_SIZE);
      setOffset(PAGE_SIZE);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activities');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore) return;
    try {
      const data = await getActivities({ limit: PAGE_SIZE, offset });
      setActivities((prev) => [...prev, ...data]);
      setHasMore(data.length >= PAGE_SIZE);
      setOffset((prev) => prev + PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more');
    }
  }, [offset, hasMore]);

  useEffect(() => {
    fetchInitial();
    intervalRef.current = setInterval(fetchInitial, pollingInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchInitial, pollingInterval]);

  return { activities, isLoading, error, hasMore, loadMore, refresh: fetchInitial };
}

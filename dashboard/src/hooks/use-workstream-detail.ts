'use client';

import { useState, useEffect } from 'react';
import { getWorkstreamById, getActivities } from '@/lib/api-client';
import type { WorkstreamDetail, Activity } from '@/lib/types';

interface UseWorkstreamDetailResult {
  detail: WorkstreamDetail | null;
  activities: Activity[];
  isLoading: boolean;
  error: string | null;
}

export function useWorkstreamDetail(workstreamId: string | null): UseWorkstreamDetailResult {
  const [detail, setDetail] = useState<WorkstreamDetail | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workstreamId) {
      setDetail(null);
      setActivities([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    async function fetchDetail() {
      try {
        const [ws, acts] = await Promise.all([
          getWorkstreamById(workstreamId!),
          getActivities({ limit: 5 }).catch(() => [] as Activity[]),
        ]);

        if (!cancelled) {
          setDetail(ws);
          setActivities(acts.filter((a) => a.workstream_id === workstreamId));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch details');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchDetail();
    return () => {
      cancelled = true;
    };
  }, [workstreamId]);

  return { detail, activities, isLoading, error };
}

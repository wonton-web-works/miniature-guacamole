'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getWorkstreams } from '@/lib/api-client';
import type { WorkstreamSummary, WorkstreamCounts } from '@/lib/types';

interface UseWorkstreamsResult {
  workstreams: WorkstreamSummary[];
  counts: WorkstreamCounts;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

const EMPTY_COUNTS: WorkstreamCounts = {
  total: 0,
  planning: 0,
  in_progress: 0,
  ready_for_review: 0,
  blocked: 0,
  complete: 0,
  unknown: 0,
};

function computeCounts(workstreams: WorkstreamSummary[]): WorkstreamCounts {
  const counts = { ...EMPTY_COUNTS, total: workstreams.length };
  for (const ws of workstreams) {
    if (ws.status in counts) {
      counts[ws.status]++;
    }
  }
  return counts;
}

export function useWorkstreams(pollingInterval = 5000): UseWorkstreamsResult {
  const [workstreams, setWorkstreams] = useState<WorkstreamSummary[]>([]);
  const [counts, setCounts] = useState<WorkstreamCounts>(EMPTY_COUNTS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const fetchData = useCallback(async () => {
    try {
      const data = await getWorkstreams();
      setWorkstreams(data);
      setCounts(computeCounts(data));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch workstreams');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, pollingInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData, pollingInterval]);

  return { workstreams, counts, isLoading, error, refresh: fetchData };
}

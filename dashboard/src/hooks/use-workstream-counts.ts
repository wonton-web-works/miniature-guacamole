'use client';

import { useMemo } from 'react';
import type { WorkstreamSummary, WorkstreamCounts } from '@/lib/types';

export function useWorkstreamCounts(workstreams: WorkstreamSummary[]): WorkstreamCounts {
  return useMemo(() => {
    const counts: WorkstreamCounts = {
      total: workstreams.length,
      planning: 0,
      in_progress: 0,
      ready_for_review: 0,
      blocked: 0,
      complete: 0,
      unknown: 0,
    };

    for (const ws of workstreams) {
      if (ws.status in counts) {
        counts[ws.status]++;
      }
    }

    return counts;
  }, [workstreams]);
}

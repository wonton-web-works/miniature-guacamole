import { NextRequest, NextResponse } from 'next/server';
import { getAllWorkstreams } from '@/lib/data';
import { MemoryCache } from '@/lib/data/cache';
import type { ApiResponse, WorkstreamSummary, WorkstreamStatus } from '@/lib/types';

const cache = new MemoryCache();

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<WorkstreamSummary[]>>> {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') as WorkstreamStatus | null;

    const cacheKey = `workstreams:${statusFilter || 'all'}`;
    const cached = cache.getWithMeta<WorkstreamSummary[]>(cacheKey);

    let workstreams: WorkstreamSummary[];
    let isCached = false;
    let cacheAge = 0;

    if (cached) {
      workstreams = cached.data;
      isCached = true;
      cacheAge = cached.meta.cacheAge;
    } else {
      const allWorkstreams = getAllWorkstreams();

      if (statusFilter) {
        workstreams = allWorkstreams.filter(ws => ws.status === statusFilter);
      } else {
        workstreams = allWorkstreams;
      }

      cache.set(cacheKey, workstreams);
    }

    const response: ApiResponse<WorkstreamSummary[]> = {
      success: true,
      data: workstreams,
      error: null,
      timestamp: new Date().toISOString(),
      meta: {
        cached: isCached,
        cacheAge,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const response: ApiResponse<WorkstreamSummary[]> = {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}

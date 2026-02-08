import { NextRequest, NextResponse } from 'next/server';
import { getActivitiesWithTotal } from '@/lib/data';
import { MemoryCache } from '@/lib/data/cache';
import { DEFAULT_ACTIVITY_LIMIT } from '@/lib/constants';
import type { ApiResponse, Activity } from '@/lib/types';

const cache = new MemoryCache();

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<Activity[]>>> {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : undefined;
    const agentId = searchParams.get('agentId');
    const workstreamId = searchParams.get('workstreamId');

    const cacheKey = `activities:${limit}:${offset}:${agentId}:${workstreamId}`;
    const cached = cache.getWithMeta<{ items: Activity[]; total: number }>(cacheKey);

    let activities: Activity[];
    let total: number;
    let isCached = false;
    let cacheAge = 0;

    if (cached) {
      activities = cached.data.items;
      total = cached.data.total;
      isCached = true;
      cacheAge = cached.meta.cacheAge;
    } else {
      const result = getActivitiesWithTotal(undefined, {
        limit,
        offset,
        agentId: agentId || undefined,
        workstreamId: workstreamId || undefined,
      });

      activities = result.items;
      total = result.total;

      cache.set(cacheKey, result);
    }

    const actualLimit = limit ?? DEFAULT_ACTIVITY_LIMIT;
    const actualOffset = offset ?? 0;

    const response: ApiResponse<Activity[]> = {
      success: true,
      data: activities,
      error: null,
      timestamp: new Date().toISOString(),
      meta: {
        cached: isCached,
        cacheAge,
        total,
        offset: actualOffset,
        limit: actualLimit,
        hasMore: (actualOffset + actualLimit) < total,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const response: ApiResponse<Activity[]> = {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}

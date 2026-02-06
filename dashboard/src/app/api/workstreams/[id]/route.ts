import { NextRequest, NextResponse } from 'next/server';
import { getWorkstreamById } from '@/lib/data';
import { MemoryCache } from '@/lib/data/cache';
import type { ApiResponse, WorkstreamDetail } from '@/lib/types';

const cache = new MemoryCache();

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<WorkstreamDetail>>> {
  try {
    const { id } = params;
    const cacheKey = `workstream:${id}`;
    const cached = cache.getWithMeta<WorkstreamDetail>(cacheKey);

    let workstream: WorkstreamDetail | null;
    let isCached = false;
    let cacheAge = 0;

    if (cached) {
      workstream = cached.data;
      isCached = true;
      cacheAge = cached.meta.cacheAge;
    } else {
      workstream = getWorkstreamById(id);

      if (workstream) {
        cache.set(cacheKey, workstream);
      }
    }

    if (!workstream) {
      const response: ApiResponse<WorkstreamDetail> = {
        success: false,
        data: null,
        error: `Workstream ${id} not found`,
        timestamp: new Date().toISOString(),
      };

      return NextResponse.json(response, { status: 404 });
    }

    const response: ApiResponse<WorkstreamDetail> = {
      success: true,
      data: workstream,
      error: null,
      timestamp: new Date().toISOString(),
      meta: {
        cached: isCached,
        cacheAge,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const response: ApiResponse<WorkstreamDetail> = {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}

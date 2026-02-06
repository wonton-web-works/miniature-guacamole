import { NextRequest, NextResponse } from 'next/server';
import { getQuestions } from '@/lib/data';
import { MemoryCache } from '@/lib/data/cache';
import type { ApiResponse, AgentQuestion, QuestionStatus } from '@/lib/types';

const cache = new MemoryCache();

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<AgentQuestion[]>>> {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as QuestionStatus | null;

    const cacheKey = `questions:${status || 'all'}`;
    const cached = cache.getWithMeta<AgentQuestion[]>(cacheKey);

    let questions: AgentQuestion[];
    let isCached = false;
    let cacheAge = 0;

    if (cached) {
      questions = cached.data;
      isCached = true;
      cacheAge = cached.meta.cacheAge;
    } else {
      questions = getQuestions(undefined, {
        status: status || undefined,
      });

      cache.set(cacheKey, questions);
    }

    const response: ApiResponse<AgentQuestion[]> = {
      success: true,
      data: questions,
      error: null,
      timestamp: new Date().toISOString(),
      meta: {
        cached: isCached,
        cacheAge,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const response: ApiResponse<AgentQuestion[]> = {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getQuestions } from '@/lib/data';
import { MemoryCache } from '@/lib/data/cache';
import { createQuestion } from '@/lib/data/question-creator';
import { DEFAULT_MEMORY_PATH } from '@/lib/constants';
import type { ApiResponse, AgentQuestion, QuestionStatus, QuestionPriority } from '@/lib/types';

const cache = new MemoryCache();

const VALID_PRIORITIES: QuestionPriority[] = ['low', 'medium', 'high', 'critical'];

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

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<AgentQuestion>>> {
  try {
    // Parse request body
    let body: any;
    try {
      const text = await request.text();
      if (!text || text.trim() === '') {
        const response: ApiResponse<AgentQuestion> = {
          success: false,
          data: null,
          error: 'Request body is required',
          timestamp: new Date().toISOString(),
        };
        return NextResponse.json(response, { status: 400 });
      }
      body = JSON.parse(text);
    } catch {
      const response: ApiResponse<AgentQuestion> = {
        success: false,
        data: null,
        error: 'Invalid JSON in request body',
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate required fields
    if (!body.agent_id) {
      const response: ApiResponse<AgentQuestion> = {
        success: false,
        data: null,
        error: 'agent_id is required',
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(response, { status: 400 });
    }

    if (!body.workstream_id) {
      const response: ApiResponse<AgentQuestion> = {
        success: false,
        data: null,
        error: 'workstream_id is required',
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(response, { status: 400 });
    }

    if (!body.question || body.question.trim() === '') {
      const response: ApiResponse<AgentQuestion> = {
        success: false,
        data: null,
        error: 'question is required',
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate priority if provided
    const priority = body.priority || 'medium';
    if (!VALID_PRIORITIES.includes(priority)) {
      const response: ApiResponse<AgentQuestion> = {
        success: false,
        data: null,
        error: 'priority must be one of: low, medium, high, critical',
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Create question
    const question = createQuestion(
      {
        agent_id: body.agent_id,
        workstream_id: body.workstream_id,
        question: body.question,
        priority,
        context: body.context,
      },
      DEFAULT_MEMORY_PATH
    );

    if (!question) {
      const response: ApiResponse<AgentQuestion> = {
        success: false,
        data: null,
        error: 'Failed to create question',
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(response, { status: 500 });
    }

    // Clear cache
    cache.invalidateAll();

    const response: ApiResponse<AgentQuestion> = {
      success: true,
      data: question,
      error: null,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const response: ApiResponse<AgentQuestion> = {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Internal server error',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}

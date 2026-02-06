import { NextRequest, NextResponse } from 'next/server';
import { answerQuestion } from '@/lib/data/question-writer';
import type { ApiResponse, AgentQuestion } from '@/lib/types';

interface AnswerBody {
  answer: string;
  action: 'approve' | 'reject' | 'respond';
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<AgentQuestion>>> {
  try {
    const { id } = params;
    const body: AnswerBody = await request.json();

    if (!body.action || !['approve', 'reject', 'respond'].includes(body.action)) {
      const response: ApiResponse<AgentQuestion> = {
        success: false,
        data: null,
        error: 'Invalid action. Must be approve, reject, or respond.',
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(response, { status: 400 });
    }

    const updated = answerQuestion(id, body.answer || '', body.action);

    if (!updated) {
      const response: ApiResponse<AgentQuestion> = {
        success: false,
        data: null,
        error: `Question ${id} not found`,
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: ApiResponse<AgentQuestion> = {
      success: true,
      data: updated,
      error: null,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const response: ApiResponse<AgentQuestion> = {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}

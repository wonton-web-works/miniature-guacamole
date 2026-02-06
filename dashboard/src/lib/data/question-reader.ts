import { join } from 'node:path';
import { readJsonFile } from './memory-reader';
import { DEFAULT_DASHBOARD_PATH, QUESTIONS_FILE } from '../constants';
import type { AgentQuestion, QuestionsSummary, QuestionStatus, QuestionPriority } from '../types';

interface RawQuestion {
  id: string;
  agent_id: string;
  workstream_id: string;
  question: string;
  priority?: string;
  status?: string;
  timestamp?: string;
  context?: string;
  answered_at?: string;
  answer?: string;
}

function normalizeQuestion(raw: RawQuestion): AgentQuestion | null {
  // Validate required fields (timestamp is optional for sorting to work)
  if (!raw.id || !raw.agent_id || !raw.workstream_id || !raw.question) {
    return null;
  }

  return {
    id: raw.id,
    timestamp: raw.timestamp || new Date(0).toISOString(), // Use epoch for missing timestamps
    agent_id: raw.agent_id,
    workstream_id: raw.workstream_id,
    question: raw.question,
    context: raw.context,
    priority: (raw.priority as QuestionPriority) || 'medium',
    status: (raw.status as QuestionStatus) || 'open',
    answered_at: raw.answered_at,
    answer: raw.answer,
  };
}

export function getQuestions(
  dashboardPath: string = DEFAULT_DASHBOARD_PATH,
  options: { status?: QuestionStatus; agentId?: string; workstreamId?: string } = {}
): AgentQuestion[] {
  const filePath = join(dashboardPath, QUESTIONS_FILE);
  const data = readJsonFile(filePath);

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return [];
  }

  const record = data as Record<string, unknown>;
  const rawQuestions = record.questions as RawQuestion[] | undefined;

  if (!Array.isArray(rawQuestions)) {
    return [];
  }

  let questions = rawQuestions.map(normalizeQuestion).filter(q => q !== null);

  // Sort reverse-chronologically (newest first)
  questions.sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  // Apply filters
  if (options.status) {
    questions = questions.filter(q => q.status === options.status);
  }

  if (options.agentId) {
    questions = questions.filter(q => q.agent_id === options.agentId);
  }

  if (options.workstreamId) {
    questions = questions.filter(q => q.workstream_id === options.workstreamId);
  }

  return questions;
}

export function getQuestionsSummary(
  dashboardPath: string = DEFAULT_DASHBOARD_PATH
): QuestionsSummary {
  const questions = getQuestions(dashboardPath);

  const summary: QuestionsSummary = {
    questions,
    total: questions.length,
    byStatus: {
      open: 0,
      answered: 0,
      dismissed: 0,
    },
    byPriority: {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    },
  };

  for (const q of questions) {
    summary.byStatus[q.status]++;
    summary.byPriority[q.priority]++;
  }

  return summary;
}

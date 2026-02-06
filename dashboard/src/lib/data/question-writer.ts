import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_MEMORY_PATH, QUESTIONS_FILE } from '../constants';
import type { AgentQuestion } from '../types';

export function answerQuestion(
  questionId: string,
  answer: string,
  action: 'approve' | 'reject' | 'respond',
  memoryPath: string = DEFAULT_MEMORY_PATH
): AgentQuestion | null {
  const filePath = join(memoryPath, QUESTIONS_FILE);

  let data: { questions: AgentQuestion[] };
  try {
    const raw = readFileSync(filePath, 'utf-8');
    data = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!Array.isArray(data.questions)) {
    return null;
  }

  const question = data.questions.find((q) => q.id === questionId);
  if (!question) {
    return null;
  }

  question.status = action === 'reject' ? 'dismissed' : 'answered';
  question.answer = answer || `[${action}]`;
  question.answered_at = new Date().toISOString();

  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  return question;
}

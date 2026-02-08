import { readFileSync, writeFileSync, renameSync, unlinkSync } from 'node:fs';
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

  // Atomic write pattern: write to temp file first, then rename
  // This prevents race conditions where two simultaneous requests could
  // corrupt the file or lose data. The rename operation is atomic at the
  // filesystem level, ensuring either the old or new content is always readable.
  const tempPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`;

  try {
    writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    renameSync(tempPath, filePath);
  } catch (error) {
    // Clean up temp file if write succeeded but rename failed
    try {
      unlinkSync(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }

  return question;
}

import { readFileSync, writeFileSync, renameSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_MEMORY_PATH, QUESTIONS_FILE } from '../constants';
import type { AgentQuestion, QuestionPriority } from '../types';

interface CreateQuestionInput {
  agent_id: string;
  workstream_id: string;
  question: string;
  priority?: QuestionPriority;
  context?: string;
}

export function createQuestion(
  questionData: CreateQuestionInput,
  memoryPath: string = DEFAULT_MEMORY_PATH
): AgentQuestion | null {
  // Validate required fields
  if (!questionData.agent_id || !questionData.workstream_id || !questionData.question || questionData.question.trim() === '') {
    return null;
  }

  const filePath = join(memoryPath, QUESTIONS_FILE);

  // Read existing questions or create new array
  let existingQuestions: AgentQuestion[] = [];
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    if (Array.isArray(data.questions)) {
      existingQuestions = data.questions;
    }
  } catch {
    // File doesn't exist or is malformed, start with empty array
  }

  // Create new question with generated ID and timestamp
  const newQuestion: AgentQuestion = {
    id: `q-${Date.now()}`,
    timestamp: new Date().toISOString(),
    agent_id: questionData.agent_id,
    workstream_id: questionData.workstream_id,
    question: questionData.question,
    priority: questionData.priority || 'medium',
    status: 'open',
  };

  // Include optional context if provided
  if (questionData.context) {
    newQuestion.context = questionData.context;
  }

  // Append to existing questions
  existingQuestions.push(newQuestion);

  // Atomic write pattern: write to temp file first, then rename
  // This prevents race conditions where two simultaneous requests could
  // corrupt the file or lose data. The rename operation is atomic at the
  // filesystem level, ensuring either the old or new content is always readable.
  const tempPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`;

  try {
    writeFileSync(tempPath, JSON.stringify({ questions: existingQuestions }, null, 2), 'utf-8');
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

  return newQuestion;
}

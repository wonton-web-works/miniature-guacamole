import { statSync } from 'node:fs';
import { join } from 'node:path';
import { listJsonFiles } from './memory-reader';
import { DEFAULT_MEMORY_PATH } from '../constants';
import type { SSEEventType } from '../types/events';

interface FileState {
  path: string;
  mtime: number;
}

interface DetectedChange {
  type: SSEEventType;
  data: Record<string, unknown>;
}

let lastState = new Map<string, number>();

function getFileStates(memoryPath: string): Map<string, number> {
  const files = listJsonFiles(memoryPath);
  const states = new Map<string, number>();

  for (const file of files) {
    try {
      const filePath = join(memoryPath, file);
      const stat = statSync(filePath);
      states.set(file, stat.mtimeMs);
    } catch {
      // File may have been deleted
    }
  }

  return states;
}

export function detectChanges(memoryPath: string = DEFAULT_MEMORY_PATH): DetectedChange[] {
  const currentState = getFileStates(memoryPath);
  const changes: DetectedChange[] = [];

  for (const [file, mtime] of currentState) {
    const prevMtime = lastState.get(file);

    if (prevMtime === undefined) {
      // New file
      if (file.startsWith('workstream-') || file.startsWith('ws-')) {
        changes.push({
          type: 'workstream_updated',
          data: { workstream_id: file, changes: ['created'] },
        });
      } else if (file.includes('question')) {
        changes.push({
          type: 'question_added',
          data: { question_id: file },
        });
      } else {
        changes.push({
          type: 'activity_added',
          data: { activity_id: file },
        });
      }
    } else if (mtime > prevMtime) {
      // Modified file
      if (file.startsWith('workstream-') || file.startsWith('ws-')) {
        changes.push({
          type: 'workstream_updated',
          data: { workstream_id: file, changes: ['modified'] },
        });
      } else if (file.includes('question')) {
        changes.push({
          type: 'question_answered',
          data: { question_id: file },
        });
      }
    }
  }

  lastState = currentState;
  return changes;
}

export function resetChangeDetector(): void {
  lastState = new Map();
}

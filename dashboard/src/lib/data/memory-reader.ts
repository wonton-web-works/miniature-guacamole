import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';

export function readJsonFile(filePath: string): Record<string, unknown> | unknown[] | null {
  try {
    if (!existsSync(filePath)) {
      return null;
    }

    const content = readFileSync(filePath, 'utf-8');

    if (!content || content.trim() === '') {
      return null;
    }

    const parsed = JSON.parse(content);
    return parsed;
  } catch (error) {
    // Handle all errors (permission denied, malformed JSON, etc.) by returning null
    return null;
  }
}

export function listJsonFiles(dirPath: string): string[] {
  try {
    if (!existsSync(dirPath)) {
      return [];
    }

    const files = readdirSync(dirPath);
    return files.filter(file => file.endsWith('.json'));
  } catch (error) {
    // Handle all errors (permission denied, etc.) by returning empty array
    return [];
  }
}

export function getFileModifiedTime(filePath: string): number | null {
  try {
    if (!existsSync(filePath)) {
      return null;
    }

    const stats = statSync(filePath);
    return stats.mtimeMs;
  } catch (error) {
    // Handle all errors by returning null
    return null;
  }
}

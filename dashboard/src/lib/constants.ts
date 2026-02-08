import { join } from 'path';
import { homedir } from 'os';

export const DEFAULT_MEMORY_PATH = process.env.CLAUDE_MEMORY_PATH || join(homedir(), '.claude', 'memory');
export const DEFAULT_DASHBOARD_PATH = join(homedir(), '.claude', 'dashboard');
export const CACHE_TTL_MS = 5000;
export const QUESTIONS_FILE = 'agent-questions.json';
export const PROJECT_REGISTRY_FILE = 'project-registry.json';

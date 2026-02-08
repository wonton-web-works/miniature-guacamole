import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock os.homedir() to return consistent path across environments
vi.mock('node:os', () => ({
  homedir: () => '/mock/home'
}));

import {
  DEFAULT_MEMORY_PATH,
  DEFAULT_DASHBOARD_PATH,
  CACHE_TTL_MS,
  QUESTIONS_FILE,
  PROJECT_REGISTRY_FILE,
} from '@/lib/constants';

describe('Constants', () => {
  describe('DEFAULT_MEMORY_PATH', () => {
    it('should point to ~/.claude/memory directory', () => {
      expect(DEFAULT_MEMORY_PATH).toContain('.claude/memory');
      expect(DEFAULT_MEMORY_PATH).toMatch(/\/\.claude\/memory$/);
    });

    it('should resolve to absolute path', () => {
      expect(DEFAULT_MEMORY_PATH).toMatch(/^\//);
    });
  });

  describe('DEFAULT_DASHBOARD_PATH', () => {
    it('should point to ~/.claude/dashboard directory', () => {
      expect(DEFAULT_DASHBOARD_PATH).toContain('.claude/dashboard');
      expect(DEFAULT_DASHBOARD_PATH).toMatch(/\/\.claude\/dashboard$/);
    });
  });

  describe('CACHE_TTL_MS', () => {
    it('should default to 5000ms (5 seconds)', () => {
      expect(CACHE_TTL_MS).toBe(5000);
    });

    it('should be a positive number', () => {
      expect(typeof CACHE_TTL_MS).toBe('number');
      expect(CACHE_TTL_MS).toBeGreaterThan(0);
    });
  });

  describe('QUESTIONS_FILE', () => {
    it('should point to agent-questions.json', () => {
      expect(QUESTIONS_FILE).toBe('agent-questions.json');
    });
  });

  describe('PROJECT_REGISTRY_FILE', () => {
    it('should point to project-registry.json', () => {
      expect(PROJECT_REGISTRY_FILE).toBe('project-registry.json');
    });
  });
});

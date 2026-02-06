import { describe, it, expect } from 'vitest';

// These tests will fail until implementation is complete (TDD red phase)

describe('Constants', () => {
  describe('DEFAULT_MEMORY_PATH', () => {
    it('should point to ~/.claude/memory directory', () => {
      // @ts-expect-error - module not implemented yet
      const { DEFAULT_MEMORY_PATH } = require('../../../src/lib/constants');
      expect(DEFAULT_MEMORY_PATH).toContain('.claude/memory');
      expect(DEFAULT_MEMORY_PATH).toMatch(/\/\.claude\/memory$/);
    });

    it('should resolve to absolute path', () => {
      // @ts-expect-error - module not implemented yet
      const { DEFAULT_MEMORY_PATH } = require('../../../src/lib/constants');
      expect(DEFAULT_MEMORY_PATH).toMatch(/^\//); // Unix absolute path
    });
  });

  describe('DEFAULT_DASHBOARD_PATH', () => {
    it('should point to ~/.claude/dashboard directory', () => {
      // @ts-expect-error - module not implemented yet
      const { DEFAULT_DASHBOARD_PATH } = require('../../../src/lib/constants');
      expect(DEFAULT_DASHBOARD_PATH).toContain('.claude/dashboard');
      expect(DEFAULT_DASHBOARD_PATH).toMatch(/\/\.claude\/dashboard$/);
    });
  });

  describe('CACHE_TTL_MS', () => {
    it('should default to 5000ms (5 seconds)', () => {
      // @ts-expect-error - module not implemented yet
      const { CACHE_TTL_MS } = require('../../../src/lib/constants');
      expect(CACHE_TTL_MS).toBe(5000);
    });

    it('should be a positive number', () => {
      // @ts-expect-error - module not implemented yet
      const { CACHE_TTL_MS } = require('../../../src/lib/constants');
      expect(typeof CACHE_TTL_MS).toBe('number');
      expect(CACHE_TTL_MS).toBeGreaterThan(0);
    });
  });

  describe('QUESTIONS_FILE', () => {
    it('should point to agent-questions.json', () => {
      // @ts-expect-error - module not implemented yet
      const { QUESTIONS_FILE } = require('../../../src/lib/constants');
      expect(QUESTIONS_FILE).toBe('agent-questions.json');
    });
  });

  describe('PROJECT_REGISTRY_FILE', () => {
    it('should point to project-registry.json', () => {
      // @ts-expect-error - module not implemented yet
      const { PROJECT_REGISTRY_FILE } = require('../../../src/lib/constants');
      expect(PROJECT_REGISTRY_FILE).toBe('project-registry.json');
    });
  });
});

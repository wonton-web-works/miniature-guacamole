/**
 * Unit Tests for API & Data Agents (WS-7)
 *
 * Tests the api-designer and data-engineer agent files.
 * These tests verify agent existence and proper structure.
 * These tests are written BEFORE implementation (TDD - Red phase).
 *
 * @see WS-7: API & Data
 * @target 99% function coverage
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TEST SECTION 1: API Designer Agent Existence
// ============================================================================

describe('WS-7: API & Data - API Designer Agent Existence', () => {
  const API_DESIGNER_AGENT_PATH = path.join(
    __dirname,
    '../../.claude/agents/api-designer/agent.md'
  );

  describe('Agent File Structure', () => {
    it('should have .claude/agents/api-designer/agent.md file', () => {
      expect(fs.existsSync(API_DESIGNER_AGENT_PATH)).toBe(true);
    });

    it('should contain valid YAML frontmatter with name, description, model, tools', () => {
      const content = fs.readFileSync(API_DESIGNER_AGENT_PATH, 'utf-8');

      // Should start with ---
      expect(content).toMatch(/^---\n/);

      // Should have name field
      expect(content).toMatch(/^name:\s*api-designer\s*$/m);

      // Should have description field
      expect(content).toMatch(/^description:\s*.+$/m);

      // Should have model field
      expect(content).toMatch(/^model:\s*\w+\s*$/m);

      // Should have tools field
      expect(content).toMatch(/^tools:\s*.+$/m);

      // Closing frontmatter
      expect(content).toMatch(/\n---\n/);
    });

    it('should contain Boundaries section', () => {
      const content = fs.readFileSync(API_DESIGNER_AGENT_PATH, 'utf-8');

      expect(content).toMatch(/^##\s+Boundaries\s*$/m);
    });

    it('Boundaries should contain **CAN:** field with content', () => {
      const content = fs.readFileSync(API_DESIGNER_AGENT_PATH, 'utf-8');

      const canMatch = content.match(/\*\*CAN:\*\*\s+(.+)/);
      expect(canMatch).toBeTruthy();

      if (canMatch) {
        const canContent = canMatch[1].trim();
        expect(canContent.length).toBeGreaterThan(0);
      }
    });

    it('Boundaries should contain **CANNOT:** field with content', () => {
      const content = fs.readFileSync(API_DESIGNER_AGENT_PATH, 'utf-8');

      const cannotMatch = content.match(/\*\*CANNOT:\*\*\s+(.+)/);
      expect(cannotMatch).toBeTruthy();

      if (cannotMatch) {
        const cannotContent = cannotMatch[1].trim();
        expect(cannotContent.length).toBeGreaterThan(0);
      }
    });

    it('Boundaries should contain **ESCALATES TO:** field', () => {
      const content = fs.readFileSync(API_DESIGNER_AGENT_PATH, 'utf-8');

      expect(content).toMatch(/\*\*ESCALATES TO:\*\*/);
    });
  });
});

// ============================================================================
// TEST SECTION 2: Data Engineer Agent Existence
// ============================================================================

describe('WS-7: API & Data - Data Engineer Agent Existence', () => {
  const DATA_ENGINEER_AGENT_PATH = path.join(
    __dirname,
    '../../.claude/agents/data-engineer/agent.md'
  );

  describe('Agent File Structure', () => {
    it('should have .claude/agents/data-engineer/agent.md file', () => {
      expect(fs.existsSync(DATA_ENGINEER_AGENT_PATH)).toBe(true);
    });

    it('should contain valid YAML frontmatter with name, description, model, tools', () => {
      const content = fs.readFileSync(DATA_ENGINEER_AGENT_PATH, 'utf-8');

      // Should start with ---
      expect(content).toMatch(/^---\n/);

      // Should have name field
      expect(content).toMatch(/^name:\s*data-engineer\s*$/m);

      // Should have description field
      expect(content).toMatch(/^description:\s*.+$/m);

      // Should have model field
      expect(content).toMatch(/^model:\s*\w+\s*$/m);

      // Should have tools field
      expect(content).toMatch(/^tools:\s*.+$/m);

      // Closing frontmatter
      expect(content).toMatch(/\n---\n/);
    });

    it('should contain Boundaries section', () => {
      const content = fs.readFileSync(DATA_ENGINEER_AGENT_PATH, 'utf-8');

      expect(content).toMatch(/^##\s+Boundaries\s*$/m);
    });

    it('Boundaries should contain **CAN:** field with content', () => {
      const content = fs.readFileSync(DATA_ENGINEER_AGENT_PATH, 'utf-8');

      const canMatch = content.match(/\*\*CAN:\*\*\s+(.+)/);
      expect(canMatch).toBeTruthy();

      if (canMatch) {
        const canContent = canMatch[1].trim();
        expect(canContent.length).toBeGreaterThan(0);
      }
    });

    it('Boundaries should contain **CANNOT:** field with content', () => {
      const content = fs.readFileSync(DATA_ENGINEER_AGENT_PATH, 'utf-8');

      const cannotMatch = content.match(/\*\*CANNOT:\*\*\s+(.+)/);
      expect(cannotMatch).toBeTruthy();

      if (cannotMatch) {
        const cannotContent = cannotMatch[1].trim();
        expect(cannotContent.length).toBeGreaterThan(0);
      }
    });

    it('Boundaries should contain **ESCALATES TO:** field', () => {
      const content = fs.readFileSync(DATA_ENGINEER_AGENT_PATH, 'utf-8');

      expect(content).toMatch(/\*\*ESCALATES TO:\*\*/);
    });
  });
});

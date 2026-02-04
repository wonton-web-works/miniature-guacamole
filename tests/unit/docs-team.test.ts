/**
 * Unit Tests for Documentation Team
 *
 * Tests that docs-team skill and technical-writer agent exist with proper structure.
 * WS-5: Documentation Team
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SKILLS_DIR = path.join(__dirname, '../../.claude/skills');
const AGENTS_DIR = path.join(__dirname, '../../.claude/agents');

describe('Documentation Team - WS-5', () => {
  describe('docs-team SKILL.md', () => {
    const skillPath = path.join(SKILLS_DIR, 'docs-team', 'SKILL.md');

    it('should exist', () => {
      expect(fs.existsSync(skillPath)).toBe(true);
    });

    it('should have frontmatter with name', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/^---$/m);
      expect(content).toMatch(/name:\s+docs-team/);
    });

    it('should have frontmatter with description', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/description:\s*"[^"]+"/);
    });

    it('should have frontmatter with model', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/model:\s+\w+/);
    });

    it('should have frontmatter with tools array', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/tools:\s*\[.+\]/);
    });

    it('should contain ## Constitution section', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/^##\s+Constitution\s*$/m);
    });

    it('should contain ## Memory Protocol section', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/^##\s+Memory Protocol\s*$/m);
    });

    it('should contain ## Boundaries section', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/^##\s+Boundaries\s*$/m);
    });

    it('should have **CAN:** field in Boundaries', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/\*\*CAN:\*\*/);
    });

    it('should have **CANNOT:** field in Boundaries', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/\*\*CANNOT:\*\*/);
    });

    it('should have **ESCALATES TO:** field in Boundaries', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/\*\*ESCALATES TO:\*\*/);
    });
  });

  describe('technical-writer agent.md', () => {
    const agentPath = path.join(AGENTS_DIR, 'technical-writer', 'agent.md');

    it('should exist', () => {
      expect(fs.existsSync(agentPath)).toBe(true);
    });

    it('should have frontmatter with name', () => {
      const content = fs.readFileSync(agentPath, 'utf-8');
      expect(content).toMatch(/^---$/m);
      expect(content).toMatch(/name:\s+technical-writer/);
    });

    it('should have frontmatter with description', () => {
      const content = fs.readFileSync(agentPath, 'utf-8');
      expect(content).toMatch(/description:\s*"[^"]+"/);
    });

    it('should have frontmatter with model', () => {
      const content = fs.readFileSync(agentPath, 'utf-8');
      expect(content).toMatch(/model:\s+\w+/);
    });

    it('should have frontmatter with tools array', () => {
      const content = fs.readFileSync(agentPath, 'utf-8');
      expect(content).toMatch(/tools:\s*\[.+\]/);
    });

    it('should contain ## Constitution section', () => {
      const content = fs.readFileSync(agentPath, 'utf-8');
      expect(content).toMatch(/^##\s+Constitution\s*$/m);
    });

    it('should contain ## Memory Protocol section', () => {
      const content = fs.readFileSync(agentPath, 'utf-8');
      expect(content).toMatch(/^##\s+Memory Protocol\s*$/m);
    });

    it('should contain ## Boundaries section', () => {
      const content = fs.readFileSync(agentPath, 'utf-8');
      expect(content).toMatch(/^##\s+Boundaries\s*$/m);
    });

    it('should have **CAN:** field in Boundaries', () => {
      const content = fs.readFileSync(agentPath, 'utf-8');
      expect(content).toMatch(/\*\*CAN:\*\*/);
    });

    it('should have **CANNOT:** field in Boundaries', () => {
      const content = fs.readFileSync(agentPath, 'utf-8');
      expect(content).toMatch(/\*\*CANNOT:\*\*/);
    });

    it('should have **ESCALATES TO:** field in Boundaries', () => {
      const content = fs.readFileSync(agentPath, 'utf-8');
      expect(content).toMatch(/\*\*ESCALATES TO:\*\*/);
    });
  });

  describe('Boundaries Integrity', () => {
    const agentPath = path.join(AGENTS_DIR, 'technical-writer', 'agent.md');

    it('technical-writer: All boundary fields should have content', () => {
      const content = fs.readFileSync(agentPath, 'utf-8');

      const canMatch = content.match(/\*\*CAN:\*\*\s+(.+)/);
      const cannotMatch = content.match(/\*\*CANNOT:\*\*\s+(.+)/);
      const escalatesMatch = content.match(/\*\*ESCALATES TO:\*\*\s+(.+)/);

      expect(canMatch).toBeTruthy();
      expect(cannotMatch).toBeTruthy();
      expect(escalatesMatch).toBeTruthy();

      if (canMatch) {
        expect(canMatch[1].trim().length).toBeGreaterThan(0);
      }
      if (cannotMatch) {
        expect(cannotMatch[1].trim().length).toBeGreaterThan(0);
      }
      if (escalatesMatch) {
        expect(escalatesMatch[1].trim().length).toBeGreaterThan(0);
      }
    });

    it('technical-writer: Fields should be in correct order (CAN, CANNOT, ESCALATES TO)', () => {
      const content = fs.readFileSync(agentPath, 'utf-8');

      const canIndex = content.search(/\*\*CAN:\*\*/);
      const cannotIndex = content.search(/\*\*CANNOT:\*\*/);
      const escalatesIndex = content.search(/\*\*ESCALATES TO:\*\*/);

      expect(canIndex).toBeLessThan(cannotIndex);
      expect(cannotIndex).toBeLessThan(escalatesIndex);
    });
  });
});

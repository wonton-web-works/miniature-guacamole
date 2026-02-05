/**
 * Unit Tests for Technical Assessment Skill
 *
 * Tests that technical-assessment skill exists with proper structure.
 * WS-9: Technical Assessment
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SKILLS_DIR = path.join(__dirname, '../../.claude/skills');

describe('Technical Assessment - WS-9', () => {
  describe('technical-assessment SKILL.md', () => {
    const skillPath = path.join(SKILLS_DIR, 'technical-assessment', 'SKILL.md');

    it('should exist', () => {
      expect(fs.existsSync(skillPath)).toBe(true);
    });

    it('should have frontmatter with name', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/^---$/m);
      expect(content).toMatch(/name:\s+technical-assessment/);
    });

    it('should have frontmatter with description', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/description:\s*"[^"]+"/);
    });

    it('should have frontmatter with model: sonnet', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/model:\s+sonnet/);
    });

    it('should have frontmatter with tools array', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/tools:\s*\[.+\]/);
    });

    it('should contain ## Constitution section', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/^##\s+Constitution\s*$/m);
    });

    it('should have 5 constitution principles', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      const constitutionSection = content.split(/^##\s+Constitution\s*$/m)[1]?.split(/^##\s+/m)[0];
      expect(constitutionSection).toBeTruthy();

      // Count numbered principles (1. 2. 3. 4. 5. 6.)
      const principles = constitutionSection?.match(/^\d+\.\s+\*\*/gm) || [];
      expect(principles.length).toBe(6);
    });

    it('should contain ## Memory Protocol section', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/^##\s+Memory Protocol\s*$/m);
    });

    it('should contain ## Output Format section', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/^##\s+Output Format\s*$/m);
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

    it('should mention spawnable agents: cto, staff-engineer, api-designer, data-engineer', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/cto/i);
      expect(content).toMatch(/staff-engineer/i);
      expect(content).toMatch(/api-designer/i);
      expect(content).toMatch(/data-engineer/i);
    });

    it('should mention key evaluation areas: architecture, performance, scalability, security', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/architecture/i);
      expect(content).toMatch(/performance/i);
      expect(content).toMatch(/scalability/i);
      expect(content).toMatch(/security/i);
    });

    it('should mention technical debt implications', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/technical\s+debt/i);
    });

    it('should mention alternatives or trade-offs', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/alternative/i);
    });

    it('should mention risks', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/risk/i);
    });
  });

  describe('Boundaries Integrity', () => {
    const skillPath = path.join(SKILLS_DIR, 'technical-assessment', 'SKILL.md');

    it('All boundary fields should have content', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');

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

    it('Fields should be in correct order (CAN, CANNOT, ESCALATES TO)', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');

      const canIndex = content.search(/\*\*CAN:\*\*/);
      const cannotIndex = content.search(/\*\*CANNOT:\*\*/);
      const escalatesIndex = content.search(/\*\*ESCALATES TO:\*\*/);

      expect(canIndex).toBeLessThan(cannotIndex);
      expect(cannotIndex).toBeLessThan(escalatesIndex);
    });
  });
});

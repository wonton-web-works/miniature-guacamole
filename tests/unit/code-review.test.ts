/**
 * Unit Tests for Code Review Skill
 *
 * Tests that code-review skill exists with proper structure.
 * WS-13: Code Review Skill
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SKILLS_DIR = path.join(__dirname, '../../.claude/skills');

describe('Code Review Skill - WS-13', () => {
  describe('code-review SKILL.md', () => {
    const skillPath = path.join(SKILLS_DIR, 'code-review', 'SKILL.md');

    it('should exist', () => {
      expect(fs.existsSync(skillPath)).toBe(true);
    });

    it('should have frontmatter with name', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/^---$/m);
      expect(content).toMatch(/name:\s+code-review/);
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

    it('should have 5 constitutional principles', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      const constitutionSection = content.split('## Constitution')[1]?.split('##')[0];
      expect(constitutionSection).toBeTruthy();

      const principles = constitutionSection.match(/^\d+\.\s+\*\*/gm);
      expect(principles).toBeTruthy();
      expect(principles?.length).toBe(5);
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

    it('should mention staff-engineer in delegation or spawn pattern', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content.toLowerCase()).toMatch(/staff-engineer/);
    });

    it('should mention security-engineer in delegation or spawn pattern', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content.toLowerCase()).toMatch(/security-engineer/);
    });

    it('should have APPROVED or REQUEST CHANGES in output format', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/APPROVED|REQUEST CHANGES/);
    });

    it('should mention code quality or standards', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content.toLowerCase()).toMatch(/code quality|standards|coding standards/);
    });

    it('should mention test coverage', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content.toLowerCase()).toMatch(/test coverage|coverage/);
    });

    it('should mention performance', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content.toLowerCase()).toMatch(/performance/);
    });

    it('should mention error handling', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content.toLowerCase()).toMatch(/error handling/);
    });
  });

  describe('Boundaries Integrity', () => {
    const skillPath = path.join(SKILLS_DIR, 'code-review', 'SKILL.md');

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

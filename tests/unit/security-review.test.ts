/**
 * Unit Tests for Security Review Workflow Skill
 *
 * Tests that security-review skill exists with proper structure.
 * WS-10: Security Review Skill
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SKILLS_DIR = path.join(__dirname, '../../.claude/skills');

describe('Security Review - WS-10', () => {
  describe('security-review SKILL.md', () => {
    const skillPath = path.join(SKILLS_DIR, 'security-review', 'SKILL.md');

    it('should exist', () => {
      expect(fs.existsSync(skillPath)).toBe(true);
    });

    it('should have frontmatter with name', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/^---$/m);
      expect(content).toMatch(/name:\s+security-review/);
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

    it('should have 6 constitution principles', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      const constitutionMatch = content.match(/##\s+Constitution\s*$([\s\S]*?)##/m);
      expect(constitutionMatch).toBeTruthy();
      if (constitutionMatch) {
        const principles = constitutionMatch[1].match(/^\d+\.\s+\*\*/gm);
        expect(principles).toBeTruthy();
        expect(principles?.length).toBe(6);
      }
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

    it('should reference security-engineer for spawning', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/security-engineer/);
    });

    it('should mention OWASP Top 10', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/OWASP/i);
    });

    it('should include severity levels (CRITICAL, HIGH, MEDIUM, LOW)', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/CRITICAL/);
      expect(content).toMatch(/HIGH/);
      expect(content).toMatch(/MEDIUM/);
      expect(content).toMatch(/LOW/);
    });

    it('should mention authentication and authorization', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/authentication/i);
      expect(content).toMatch(/authorization/i);
    });

    it('should mention input validation', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/input validation/i);
    });

    it('should mention XSS', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/XSS/i);
    });

    it('should mention SQL injection', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/SQL injection/i);
    });

    it('should mention remediation', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/remediation/i);
    });

    it('should mention secrets management', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/secrets/i);
    });

    it('should mention API security', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/API/i);
    });
  });

  describe('Boundaries Integrity', () => {
    const skillPath = path.join(SKILLS_DIR, 'security-review', 'SKILL.md');

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

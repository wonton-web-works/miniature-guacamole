/**
 * Unit Tests for Design Review Workflow
 *
 * Tests that design-review skill exists with proper structure.
 * WS-12: Design Review Skill
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SKILLS_DIR = path.join(__dirname, '../../.claude/skills');

describe('Design Review - WS-12', () => {
  describe('design-review SKILL.md', () => {
    const skillPath = path.join(SKILLS_DIR, 'design-review', 'SKILL.md');

    it('should exist', () => {
      expect(fs.existsSync(skillPath)).toBe(true);
    });

    it('should have frontmatter with name', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/^---$/m);
      expect(content).toMatch(/name:\s+design-review/);
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
      const constitutionSection = content.match(/##\s+Constitution([\s\S]+?)##/);
      expect(constitutionSection).toBeTruthy();
      if (constitutionSection) {
        const principles = constitutionSection[1].match(/^\d+\.\s+\*\*/gm);
        expect(principles).toBeTruthy();
        expect(principles?.length).toBe(5);
      }
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

    it('should reference art-director in delegation', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content.toLowerCase()).toMatch(/art-director/);
    });

    it('should reference design agent in delegation', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content.toLowerCase()).toMatch(/\bdesign\b/);
    });

    it('should mention brand consistency', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content.toLowerCase()).toMatch(/brand/);
    });

    it('should mention visual hierarchy', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content.toLowerCase()).toMatch(/visual hierarchy|hierarchy/);
    });

    it('should mention UX patterns or usability', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content.toLowerCase()).toMatch(/ux|usability/);
    });

    it('should mention responsive design', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content.toLowerCase()).toMatch(/responsive/);
    });
  });

  describe('Boundaries Integrity', () => {
    const skillPath = path.join(SKILLS_DIR, 'design-review', 'SKILL.md');

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

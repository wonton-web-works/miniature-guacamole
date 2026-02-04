/**
 * Unit Tests for Feature Assessment Workflow
 *
 * Tests that feature-assessment skill exists with proper structure.
 * WS-8: Feature Assessment
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SKILLS_DIR = path.join(__dirname, '../../.claude/skills');

describe('Feature Assessment - WS-8', () => {
  describe('feature-assessment SKILL.md', () => {
    const skillPath = path.join(SKILLS_DIR, 'feature-assessment', 'SKILL.md');

    it('should exist', () => {
      expect(fs.existsSync(skillPath)).toBe(true);
    });

    it('should have frontmatter with name', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/^---$/m);
      expect(content).toMatch(/name:\s+feature-assessment/);
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

    it('should have 5 principles in Constitution', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      const constitutionMatch = content.match(/##\s+Constitution\s*$(.*?)(?=^##)/ms);
      expect(constitutionMatch).toBeTruthy();
      if (constitutionMatch) {
        const principles = constitutionMatch[1].match(/^\d+\.\s+\*\*/gm);
        expect(principles).toBeTruthy();
        expect(principles?.length).toBe(5);
      }
    });

    it('should mention interactive assessment approach', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content.toLowerCase()).toMatch(/interactive|ask|question/);
    });

    it('should reference product-owner, product-manager, and cto', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/product-owner/);
      expect(content).toMatch(/product-manager/);
      expect(content).toMatch(/cto/);
    });

    it('should include scope definition in output', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content.toLowerCase()).toMatch(/scope/);
    });

    it('should include acceptance criteria in output', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content.toLowerCase()).toMatch(/acceptance\s+criteria/);
    });

    it('should include recommendation (go/no-go) in output', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content.toLowerCase()).toMatch(/recommendation|go\/no-go/);
    });
  });

  describe('Boundaries Integrity', () => {
    const skillPath = path.join(SKILLS_DIR, 'feature-assessment', 'SKILL.md');

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

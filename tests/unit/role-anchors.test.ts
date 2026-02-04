/**
 * Unit Tests for Role Anchors
 *
 * Tests that all SKILL.md files in .claude/skills/ include Role Anchor sections
 * to prevent agent drift. Each Role Anchor must define MUST, CANNOT, and ESCALATE WHEN rules.
 *
 * WS-2: Role Reinforcement Anchors
 * @target All skill files must have complete Role Anchor sections
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Skills to verify (16 total)
const REQUIRED_SKILLS = [
  'ceo',
  'cto',
  'engineering-director',
  'product-owner',
  'product-manager',
  'engineering-manager',
  'staff-engineer',
  'art-director',
  'dev',
  'qa',
  'design',
  'leadership-team',
  'engineering-team',
  'product-team',
  'design-team',
  'deployment-engineer'
];

const SKILLS_DIR = path.join(__dirname, '../../.claude/skills');

describe('Role Anchors - WS-2 Compliance', () => {
  describe('Role Anchor Section Existence', () => {
    it('should have 16 required skills', () => {
      expect(REQUIRED_SKILLS).toHaveLength(16);
    });

    REQUIRED_SKILLS.forEach(skill => {
      it(`${skill}/SKILL.md should exist`, () => {
        const skillPath = path.join(SKILLS_DIR, skill, 'SKILL.md');
        expect(fs.existsSync(skillPath)).toBe(true);
      });
    });

    REQUIRED_SKILLS.forEach(skill => {
      it(`${skill}/SKILL.md should contain ## Role Anchor section`, () => {
        const skillPath = path.join(SKILLS_DIR, skill, 'SKILL.md');
        const content = fs.readFileSync(skillPath, 'utf-8');

        expect(content).toMatch(/^##\s+Role Anchor\s*$/m);
      });
    });
  });

  describe('Role Anchor Subsections', () => {
    REQUIRED_SKILLS.forEach(skill => {
      describe(`${skill} Role Anchor`, () => {
        let skillContent: string;

        beforeEach(() => {
          const skillPath = path.join(SKILLS_DIR, skill, 'SKILL.md');
          skillContent = fs.readFileSync(skillPath, 'utf-8');
        });

        it('should contain ### MUST subsection', () => {
          expect(skillContent).toMatch(/^###\s+MUST\s*$/m);
        });

        it('should contain ### CANNOT subsection', () => {
          expect(skillContent).toMatch(/^###\s+CANNOT\s*$/m);
        });

        it('should contain ### ESCALATE WHEN subsection', () => {
          expect(skillContent).toMatch(/^###\s+ESCALATE WHEN\s*$/m);
        });

        it('### MUST should have at least 2 bullet points', () => {
          // Match from ### MUST to next ### or ## or end of file
          const mustMatch = skillContent.match(/###\s+MUST\s*\n([\s\S]*?)(?=\n###|\n##|$)/);
          expect(mustMatch).toBeTruthy();

          if (mustMatch) {
            const mustSection = mustMatch[1];
            const bulletCount = (mustSection.match(/^-\s+.+$/gm) || []).length;
            expect(bulletCount).toBeGreaterThanOrEqual(2);
          }
        });

        it('### CANNOT should have at least 2 bullet points', () => {
          // Match from ### CANNOT to next ### or ## or end of file
          const cannotMatch = skillContent.match(/###\s+CANNOT\s*\n([\s\S]*?)(?=\n###|\n##|$)/);
          expect(cannotMatch).toBeTruthy();

          if (cannotMatch) {
            const cannotSection = cannotMatch[1];
            const bulletCount = (cannotSection.match(/^-\s+.+$/gm) || []).length;
            expect(bulletCount).toBeGreaterThanOrEqual(2);
          }
        });

        it('### ESCALATE WHEN should have at least 2 bullet points', () => {
          // Match from ### ESCALATE WHEN to next ### or ## or $ARGUMENTS or end of file
          const escalateMatch = skillContent.match(/###\s+ESCALATE WHEN\s*\n([\s\S]*?)(?=\n###|\n##|\$ARGUMENTS|$)/);
          expect(escalateMatch).toBeTruthy();

          if (escalateMatch) {
            const escalateSection = escalateMatch[1];
            const bulletCount = (escalateSection.match(/^-\s+.+$/gm) || []).length;
            expect(bulletCount).toBeGreaterThanOrEqual(2);
          }
        });
      });
    });
  });

  describe('Role Anchor Structure Integrity', () => {
    REQUIRED_SKILLS.forEach(skill => {
      it(`${skill}: Role Anchor section should come before end of file`, () => {
        const skillPath = path.join(SKILLS_DIR, skill, 'SKILL.md');
        const content = fs.readFileSync(skillPath, 'utf-8');

        const roleAnchorIndex = content.search(/^##\s+Role Anchor\s*$/m);
        expect(roleAnchorIndex).toBeGreaterThan(-1);
      });

      it(`${skill}: All subsections should be after Role Anchor header`, () => {
        const skillPath = path.join(SKILLS_DIR, skill, 'SKILL.md');
        const content = fs.readFileSync(skillPath, 'utf-8');

        const roleAnchorIndex = content.search(/^##\s+Role Anchor\s*$/m);
        const mustIndex = content.search(/^###\s+MUST\s*$/m);
        const cannotIndex = content.search(/^###\s+CANNOT\s*$/m);
        const escalateIndex = content.search(/^###\s+ESCALATE WHEN\s*$/m);

        expect(mustIndex).toBeGreaterThan(roleAnchorIndex);
        expect(cannotIndex).toBeGreaterThan(roleAnchorIndex);
        expect(escalateIndex).toBeGreaterThan(roleAnchorIndex);
      });

      it(`${skill}: Subsections should be in correct order (MUST, CANNOT, ESCALATE WHEN)`, () => {
        const skillPath = path.join(SKILLS_DIR, skill, 'SKILL.md');
        const content = fs.readFileSync(skillPath, 'utf-8');

        const mustIndex = content.search(/^###\s+MUST\s*$/m);
        const cannotIndex = content.search(/^###\s+CANNOT\s*$/m);
        const escalateIndex = content.search(/^###\s+ESCALATE WHEN\s*$/m);

        expect(mustIndex).toBeLessThan(cannotIndex);
        expect(cannotIndex).toBeLessThan(escalateIndex);
      });
    });
  });

  describe('Bullet Point Quality', () => {
    REQUIRED_SKILLS.forEach(skill => {
      it(`${skill}: All bullet points should not be empty`, () => {
        const skillPath = path.join(SKILLS_DIR, skill, 'SKILL.md');
        const content = fs.readFileSync(skillPath, 'utf-8');

        const roleAnchorSection = content.match(/^##\s+Role Anchor\s*$[\s\S]*?(?=^##\s+\w+|$)/m);
        expect(roleAnchorSection).toBeTruthy();

        if (roleAnchorSection) {
          const bullets = roleAnchorSection[0].match(/^\s*[-*]\s+(.+)$/gm);
          if (bullets) {
            bullets.forEach(bullet => {
              const content = bullet.replace(/^\s*[-*]\s+/, '').trim();
              expect(content).toBeTruthy();
              expect(content.length).toBeGreaterThan(0);
            });
          }
        }
      });
    });
  });

  describe('Coverage Summary', () => {
    it('should verify all 16 skills have Role Anchors', () => {
      const skillsWithAnchors = REQUIRED_SKILLS.filter(skill => {
        const skillPath = path.join(SKILLS_DIR, skill, 'SKILL.md');
        if (!fs.existsSync(skillPath)) return false;

        const content = fs.readFileSync(skillPath, 'utf-8');
        return /^##\s+Role Anchor\s*$/m.test(content);
      });

      expect(skillsWithAnchors).toHaveLength(16);
    });

    it('should provide detailed report of missing Role Anchors', () => {
      const missingAnchors = REQUIRED_SKILLS.filter(skill => {
        const skillPath = path.join(SKILLS_DIR, skill, 'SKILL.md');
        if (!fs.existsSync(skillPath)) return true;

        const content = fs.readFileSync(skillPath, 'utf-8');
        const hasMust = /^###\s+MUST\s*$/m.test(content);
        const hasCannot = /^###\s+CANNOT\s*$/m.test(content);
        const hasEscalate = /^###\s+ESCALATE WHEN\s*$/m.test(content);

        return !(hasMust && hasCannot && hasEscalate);
      });

      if (missingAnchors.length > 0) {
        console.log('\nSkills missing complete Role Anchors:');
        missingAnchors.forEach(skill => {
          console.log(`  - ${skill}`);
        });
      }

      expect(missingAnchors).toHaveLength(0);
    });
  });
});

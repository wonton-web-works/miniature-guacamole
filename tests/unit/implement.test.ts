/**
 * Unit Tests for Implement Skill
 *
 * Tests that implement skill exists with proper TDD cycle structure.
 * WS-14: Implement skill (TDD cycle)
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SKILLS_DIR = path.join(__dirname, '../../.claude/skills');

describe('Implement Skill - WS-14', () => {
  describe('mg-build SKILL.md', () => {
    const skillPath = path.join(SKILLS_DIR, 'mg-build', 'SKILL.md');

    it('should exist', () => {
      expect(fs.existsSync(skillPath)).toBe(true);
    });

    it('should have frontmatter with name', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/^---$/m);
      expect(content).toMatch(/name:\s+mg-build/);
    });

    it('should have frontmatter with description', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/description:\s*"[^"]+"/);
    });

    it('should have frontmatter with model', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/model:\s+\w+/);
    });

    it('should have frontmatter with allowed-tools field', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/allowed-tools:.+/);
    });

    it('should include Bash in allowed-tools', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/allowed-tools:.*Bash/);
    });

    it('should contain ## Constitution section', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/^##\s+Constitution\s*$/m);
    });

    it('should contain ## The CAD Cycle section', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/^##\s+The CAD Cycle\s*$/m);
    });

    it('should contain ## Memory Protocol section', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/^##\s+Memory Protocol\s*$/m);
    });

    it('should contain ## Spawn Pattern section', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/^##\s+Spawn Pattern\s*$/m);
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
  });

  describe('Constitution - TDD Principles', () => {
    const skillPath = path.join(SKILLS_DIR, 'mg-build', 'SKILL.md');

    it('should emphasize tests before code', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content.toLowerCase()).toMatch(/tests?\s+before\s+code/);
    });

    it('should require 99% coverage', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/99%/);
    });

    it('should mention escalating blockers', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content.toLowerCase()).toMatch(/escalate.*blocker/);
    });
  });

  describe('TDD Cycle Structure', () => {
    const skillPath = path.join(SKILLS_DIR, 'mg-build', 'SKILL.md');

    it('should define step 1 as QA writes tests', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content.toLowerCase()).toMatch(/step\s+1.*qa.*tests/);
    });

    it('should define step 2 as Dev implements', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content.toLowerCase()).toMatch(/step\s+2.*dev.*implement/);
    });

    it('should define step 3 as QA verifies', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content.toLowerCase()).toMatch(/step\s+3.*qa.*verif/);
    });

    it('should define step 4 as classification into mechanical or architectural gate', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      // Step 4 is now classification → Gate 4A (mechanical) or Gate 4B (architectural)
      expect(content.toLowerCase()).toMatch(/step\s+4.*classification|step\s+4.*gate\s+4/);
    });
  });

  describe('Spawn Pattern', () => {
    const skillPath = path.join(SKILLS_DIR, 'mg-build', 'SKILL.md');

    it('should include qa spawn pattern', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/subagent_type:\s+qa/);
    });

    it('should include dev spawn pattern', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/subagent_type:\s+dev/);
    });

    it('should include staff-engineer spawn pattern', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/subagent_type:\s+staff-engineer/);
    });
  });

  describe('Boundaries Integrity', () => {
    const skillPath = path.join(SKILLS_DIR, 'mg-build', 'SKILL.md');

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

    it('should not allow skipping tests', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      const cannotSection = content.match(/\*\*CANNOT:\*\*\s+(.+?)(?=\*\*|$)/s);

      expect(cannotSection).toBeTruthy();
      if (cannotSection) {
        expect(cannotSection[1].toLowerCase()).toMatch(/skip.*test/);
      }
    });

    it('should not allow writing code without tests', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      const cannotSection = content.match(/\*\*CANNOT:\*\*\s+(.+?)(?=\*\*|$)/s);

      expect(cannotSection).toBeTruthy();
      if (cannotSection) {
        expect(cannotSection[1].toLowerCase()).toMatch(/code.*without.*test/);
      }
    });
  });

  describe('Memory Protocol Integration', () => {
    const skillPath = path.join(SKILLS_DIR, 'mg-build', 'SKILL.md');

    it('should read from workstream state', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/workstream-.*-state\.json/);
    });

    it('should write phase transitions', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/phase:/);
    });

    it('should track gate status', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/gate_status:/);
    });
  });
});

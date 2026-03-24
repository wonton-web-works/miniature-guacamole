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
  describe('mg-security-review SKILL.md', () => {
    const skillPath = path.join(SKILLS_DIR, 'mg-security-review', 'SKILL.md');

    it('should exist', () => {
      expect(fs.existsSync(skillPath)).toBe(true);
    });

    it('should have frontmatter with name', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/^---$/m);
      expect(content).toMatch(/name:\s+mg-security-review/);
    });

    it('should have frontmatter with description', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/description:\s*"[^"]+"/);
    });

    it('should have frontmatter with model: sonnet', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/model:\s+sonnet/);
    });

    it('should have frontmatter with allowed-tools field', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/allowed-tools:.+/);
    });

    it('should contain ## Constitution section', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/^##\s+Constitution\s*$/m);
    });

    it('should have 5 constitution principles', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      const constitutionMatch = content.match(/##\s+Constitution\s*$([\s\S]*?)##/m);
      expect(constitutionMatch).toBeTruthy();
      if (constitutionMatch) {
        const principles = constitutionMatch[1].match(/^\d+\.\s+\*\*/gm);
        expect(principles).toBeTruthy();
        expect(principles?.length).toBe(5);
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

  describe('Domain-Aware Spawn Pattern (GH-15)', () => {
    const skillPath = path.join(SKILLS_DIR, 'mg-security-review', 'SKILL.md');

    it('should contain a "Domain Context" or "Domain-Aware" section', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      expect(content).toMatch(/^##\s+.*[Dd]omain/m);
    });

    it('should instruct the skill to infer domain from project context', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      const lower = content.toLowerCase();
      expect(lower).toMatch(/infer|detect|determine|identify/);
      expect(lower).toMatch(/domain/);
    });

    it('should list all four security domains (web, systems, cloud, crypto)', () => {
      const content = fs.readFileSync(skillPath, 'utf-8').toLowerCase();
      expect(content).toMatch(/\bweb\b/);
      expect(content).toMatch(/\bsystems?\b/);
      expect(content).toMatch(/\bcloud\b/);
      expect(content).toMatch(/\bcrypto/);
    });

    it('should include domain-specific file indicators for systems detection', () => {
      const content = fs.readFileSync(skillPath, 'utf-8').toLowerCase();
      // Systems domain should detect daemon/launchd/systemd patterns
      expect(content).toMatch(/daemon|launchd|systemd|service/);
    });

    it('should include domain-specific file indicators for web detection', () => {
      const content = fs.readFileSync(skillPath, 'utf-8').toLowerCase();
      expect(content).toMatch(/http|api|endpoint|route/);
    });

    it('should include domain-specific file indicators for cloud detection', () => {
      const content = fs.readFileSync(skillPath, 'utf-8').toLowerCase();
      expect(content).toMatch(/docker|container|iam|ci\/cd|pipeline/);
    });

    it('should include domain-specific file indicators for crypto detection', () => {
      const content = fs.readFileSync(skillPath, 'utf-8').toLowerCase();
      expect(content).toMatch(/encrypt|tls|certificate|key.?management/);
    });

    it('spawn pattern should pass domain context to security-engineer', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      // The spawn pattern should include domain in the prompt
      const spawnMatch = content.match(
        /##\s+.*Spawn Pattern\s*\n([\s\S]*?)(?=\n##|\n$|$)/i
      );
      expect(spawnMatch).toBeTruthy();
      if (spawnMatch) {
        const section = spawnMatch[1];
        expect(section).toMatch(/domain/i);
        // Should reference loading domain reference files
        expect(section).toMatch(/domains?\//i);
      }
    });

    it('spawn prompt should instruct agent to read domain reference files', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      // Within the spawn prompt YAML block, domain file loading must be mentioned
      expect(content).toMatch(
        /Read.*domains?\/.*\.md|load.*domain.*reference|domain.*reference.*file/i
      );
    });

    it('should provide domain inference rules (not just list domains)', () => {
      const content = fs.readFileSync(skillPath, 'utf-8');
      // Must have actual mapping rules, not just domain names
      const domainSection = content.match(
        /##\s+.*[Dd]omain.*\n([\s\S]*?)(?=\n##\s|$)/
      );
      expect(domainSection).toBeTruthy();
      if (domainSection) {
        const section = domainSection[1];
        // Should contain mapping indicators (file patterns, keywords, or heuristics)
        const lines = section.split('\n').filter((l) => l.trim().length > 0);
        expect(lines.length).toBeGreaterThanOrEqual(5);
      }
    });
  });

  describe('Boundaries Integrity', () => {
    const skillPath = path.join(SKILLS_DIR, 'mg-security-review', 'SKILL.md');

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

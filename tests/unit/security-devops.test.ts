/**
 * Unit Tests for Security & DevOps Engineers (WS-6)
 *
 * Tests the security-engineer and devops-engineer agent definitions.
 * These tests verify agent file existence and proper Boundaries section structure.
 * These tests are written BEFORE implementation (TDD - Red phase).
 *
 * @see WS-6: Security & DevOps
 * @target 99% function coverage for security and devops agents
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TEST SECTION 1: Security Engineer Agent
// ============================================================================

describe('WS-6: Security Engineer Agent - Agent Existence', () => {
  const SECURITY_AGENT_PATH = path.join(
    __dirname,
    '../../.claude/agents/security-engineer/agent.md'
  );

  describe('Agent File Structure', () => {
    it('should have .claude/agents/security-engineer/agent.md file', () => {
      expect(fs.existsSync(SECURITY_AGENT_PATH)).toBe(true);
    });

    it('should contain valid YAML frontmatter with name, description, model, tools', () => {
      const content = fs.readFileSync(SECURITY_AGENT_PATH, 'utf-8');

      // Should start with ---
      expect(content).toMatch(/^---\n/);

      // Should have name field
      expect(content).toMatch(/^name:\s*security-engineer\s*$/m);

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
      const content = fs.readFileSync(SECURITY_AGENT_PATH, 'utf-8');

      expect(content).toMatch(/^##\s+Boundaries\s*$/m);
    });

    it('Boundaries should contain **CAN:** field with content', () => {
      const content = fs.readFileSync(SECURITY_AGENT_PATH, 'utf-8');

      const canMatch = content.match(/\*\*CAN:\*\*\s+(.+)/);
      expect(canMatch).toBeTruthy();

      if (canMatch) {
        const canContent = canMatch[1].trim();
        expect(canContent.length).toBeGreaterThan(0);
      }
    });

    it('Boundaries should contain **CANNOT:** field with content', () => {
      const content = fs.readFileSync(SECURITY_AGENT_PATH, 'utf-8');

      const cannotMatch = content.match(/\*\*CANNOT:\*\*\s+(.+)/);
      expect(cannotMatch).toBeTruthy();

      if (cannotMatch) {
        const cannotContent = cannotMatch[1].trim();
        expect(cannotContent.length).toBeGreaterThan(0);
      }
    });

    it('Boundaries should contain **ESCALATES TO:** field', () => {
      const content = fs.readFileSync(SECURITY_AGENT_PATH, 'utf-8');

      expect(content).toMatch(/\*\*ESCALATES TO:\*\*/);
    });
  });

  describe('Security Engineer Content', () => {
    it('should mention security code review', () => {
      const content = fs.readFileSync(SECURITY_AGENT_PATH, 'utf-8');

      expect(content.toLowerCase()).toMatch(/security.*review|review.*security/);
    });

    it('should mention vulnerability or vulnerabilities', () => {
      const content = fs.readFileSync(SECURITY_AGENT_PATH, 'utf-8');

      expect(content.toLowerCase()).toContain('vulnerabilit');
    });

    it('should mention OWASP', () => {
      const content = fs.readFileSync(SECURITY_AGENT_PATH, 'utf-8');

      expect(content.toUpperCase()).toContain('OWASP');
    });

    it('should mention authentication or authorization', () => {
      const content = fs.readFileSync(SECURITY_AGENT_PATH, 'utf-8');

      expect(content.toLowerCase()).toMatch(/authenti|authoriz/);
    });
  });
});

// ============================================================================
// TEST SECTION 2: DevOps Engineer Agent
// ============================================================================

describe('WS-6: DevOps Engineer Agent - Agent Existence', () => {
  const DEVOPS_AGENT_PATH = path.join(
    __dirname,
    '../../.claude/agents/devops-engineer/agent.md'
  );

  describe('Agent File Structure', () => {
    it('should have .claude/agents/devops-engineer/agent.md file', () => {
      expect(fs.existsSync(DEVOPS_AGENT_PATH)).toBe(true);
    });

    it('should contain valid YAML frontmatter with name, description, model, tools', () => {
      const content = fs.readFileSync(DEVOPS_AGENT_PATH, 'utf-8');

      // Should start with ---
      expect(content).toMatch(/^---\n/);

      // Should have name field
      expect(content).toMatch(/^name:\s*devops-engineer\s*$/m);

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
      const content = fs.readFileSync(DEVOPS_AGENT_PATH, 'utf-8');

      expect(content).toMatch(/^##\s+Boundaries\s*$/m);
    });

    it('Boundaries should contain **CAN:** field with content', () => {
      const content = fs.readFileSync(DEVOPS_AGENT_PATH, 'utf-8');

      const canMatch = content.match(/\*\*CAN:\*\*\s+(.+)/);
      expect(canMatch).toBeTruthy();

      if (canMatch) {
        const canContent = canMatch[1].trim();
        expect(canContent.length).toBeGreaterThan(0);
      }
    });

    it('Boundaries should contain **CANNOT:** field with content', () => {
      const content = fs.readFileSync(DEVOPS_AGENT_PATH, 'utf-8');

      const cannotMatch = content.match(/\*\*CANNOT:\*\*\s+(.+)/);
      expect(cannotMatch).toBeTruthy();

      if (cannotMatch) {
        const cannotContent = cannotMatch[1].trim();
        expect(cannotContent.length).toBeGreaterThan(0);
      }
    });

    it('Boundaries should contain **ESCALATES TO:** field', () => {
      const content = fs.readFileSync(DEVOPS_AGENT_PATH, 'utf-8');

      expect(content).toMatch(/\*\*ESCALATES TO:\*\*/);
    });
  });

  describe('DevOps Engineer Content', () => {
    it('should mention CI/CD or pipeline', () => {
      const content = fs.readFileSync(DEVOPS_AGENT_PATH, 'utf-8');

      expect(content.toLowerCase()).toMatch(/ci\/cd|pipeline/);
    });

    it('should mention infrastructure', () => {
      const content = fs.readFileSync(DEVOPS_AGENT_PATH, 'utf-8');

      expect(content.toLowerCase()).toContain('infrastructure');
    });

    it('should mention container or Docker', () => {
      const content = fs.readFileSync(DEVOPS_AGENT_PATH, 'utf-8');

      expect(content.toLowerCase()).toMatch(/container|docker/);
    });

    it('should mention monitoring or logging', () => {
      const content = fs.readFileSync(DEVOPS_AGENT_PATH, 'utf-8');

      expect(content.toLowerCase()).toMatch(/monitoring|logging/);
    });
  });
});

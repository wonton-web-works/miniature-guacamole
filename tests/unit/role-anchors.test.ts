/**
 * Unit Tests for Role Anchors
 *
 * Tests that all agent.md files in .claude/agents/ include Boundaries sections
 * to prevent agent drift. Each Boundaries section must define CAN, CANNOT, and ESCALATES TO rules.
 *
 * WS-2: Role Reinforcement Anchors
 * @target All agent files must have complete Boundaries sections
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Agents to verify (13 migrated to .claude/agents/)
const REQUIRED_AGENTS = [
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
  'deployment-engineer',
  'supervisor'
];

const AGENTS_DIR = path.join(__dirname, '../../.claude/agents');

describe('Role Anchors - WS-2 Compliance', () => {
  describe('Boundaries Section Existence', () => {
    it('should have 13 required agents', () => {
      expect(REQUIRED_AGENTS).toHaveLength(13);
    });

    REQUIRED_AGENTS.forEach(agent => {
      it(`${agent}/agent.md should exist`, () => {
        const agentPath = path.join(AGENTS_DIR, agent, 'agent.md');
        expect(fs.existsSync(agentPath)).toBe(true);
      });
    });

    REQUIRED_AGENTS.forEach(agent => {
      it(`${agent}/agent.md should contain ## Boundaries section`, () => {
        const agentPath = path.join(AGENTS_DIR, agent, 'agent.md');
        const content = fs.readFileSync(agentPath, 'utf-8');

        expect(content).toMatch(/^##\s+Boundaries\s*$/m);
      });
    });
  });

  describe('Boundaries Subsections', () => {
    REQUIRED_AGENTS.forEach(agent => {
      describe(`${agent} Boundaries`, () => {
        let agentContent: string;

        beforeEach(() => {
          const agentPath = path.join(AGENTS_DIR, agent, 'agent.md');
          agentContent = fs.readFileSync(agentPath, 'utf-8');
        });

        it('should contain **CAN:** field', () => {
          expect(agentContent).toMatch(/\*\*CAN:\*\*/);
        });

        it('should contain **CANNOT:** field', () => {
          expect(agentContent).toMatch(/\*\*CANNOT:\*\*/);
        });

        it('should contain **ESCALATES TO:** field', () => {
          expect(agentContent).toMatch(/\*\*ESCALATES TO:\*\*/);
        });

        it('**CAN:** should have content after it', () => {
          const canMatch = agentContent.match(/\*\*CAN:\*\*\s+(.+)/);
          expect(canMatch).toBeTruthy();

          if (canMatch) {
            const canContent = canMatch[1].trim();
            expect(canContent.length).toBeGreaterThan(0);
          }
        });

        it('**CANNOT:** should have content after it', () => {
          const cannotMatch = agentContent.match(/\*\*CANNOT:\*\*\s+(.+)/);
          expect(cannotMatch).toBeTruthy();

          if (cannotMatch) {
            const cannotContent = cannotMatch[1].trim();
            expect(cannotContent.length).toBeGreaterThan(0);
          }
        });

        it('**ESCALATES TO:** should have content after it', () => {
          const escalatesMatch = agentContent.match(/\*\*ESCALATES TO:\*\*\s+(.+)/);
          expect(escalatesMatch).toBeTruthy();

          if (escalatesMatch) {
            const escalatesContent = escalatesMatch[1].trim();
            expect(escalatesContent.length).toBeGreaterThan(0);
          }
        });
      });
    });
  });

  describe('Boundaries Structure Integrity', () => {
    REQUIRED_AGENTS.forEach(agent => {
      it(`${agent}: Boundaries section should come before end of file`, () => {
        const agentPath = path.join(AGENTS_DIR, agent, 'agent.md');
        const content = fs.readFileSync(agentPath, 'utf-8');

        const boundariesIndex = content.search(/^##\s+Boundaries\s*$/m);
        expect(boundariesIndex).toBeGreaterThan(-1);
      });

      it(`${agent}: All fields should be after Boundaries header`, () => {
        const agentPath = path.join(AGENTS_DIR, agent, 'agent.md');
        const content = fs.readFileSync(agentPath, 'utf-8');

        const boundariesIndex = content.search(/^##\s+Boundaries\s*$/m);
        const canIndex = content.search(/\*\*CAN:\*\*/);
        const cannotIndex = content.search(/\*\*CANNOT:\*\*/);
        const escalatesIndex = content.search(/\*\*ESCALATES TO:\*\*/);

        expect(canIndex).toBeGreaterThan(boundariesIndex);
        expect(cannotIndex).toBeGreaterThan(boundariesIndex);
        expect(escalatesIndex).toBeGreaterThan(boundariesIndex);
      });

      it(`${agent}: Fields should be in correct order (CAN, CANNOT, ESCALATES TO)`, () => {
        const agentPath = path.join(AGENTS_DIR, agent, 'agent.md');
        const content = fs.readFileSync(agentPath, 'utf-8');

        const canIndex = content.search(/\*\*CAN:\*\*/);
        const cannotIndex = content.search(/\*\*CANNOT:\*\*/);
        const escalatesIndex = content.search(/\*\*ESCALATES TO:\*\*/);

        expect(canIndex).toBeLessThan(cannotIndex);
        expect(cannotIndex).toBeLessThan(escalatesIndex);
      });
    });
  });

  describe('Content Quality', () => {
    REQUIRED_AGENTS.forEach(agent => {
      it(`${agent}: All boundary fields should have meaningful content`, () => {
        const agentPath = path.join(AGENTS_DIR, agent, 'agent.md');
        const content = fs.readFileSync(agentPath, 'utf-8');

        const boundariesSection = content.match(/^##\s+Boundaries\s*$[\s\S]*?(?=^##\s+\w+|$)/m);
        expect(boundariesSection).toBeTruthy();

        if (boundariesSection) {
          const canMatch = boundariesSection[0].match(/\*\*CAN:\*\*\s+(.+)/);
          const cannotMatch = boundariesSection[0].match(/\*\*CANNOT:\*\*\s+(.+)/);
          const escalatesMatch = boundariesSection[0].match(/\*\*ESCALATES TO:\*\*\s+(.+)/);

          if (canMatch) {
            const canContent = canMatch[1].trim();
            expect(canContent.length).toBeGreaterThan(0);
          }
          if (cannotMatch) {
            const cannotContent = cannotMatch[1].trim();
            expect(cannotContent.length).toBeGreaterThan(0);
          }
          if (escalatesMatch) {
            const escalatesContent = escalatesMatch[1].trim();
            expect(escalatesContent.length).toBeGreaterThan(0);
          }
        }
      });
    });
  });

  describe('Coverage Summary', () => {
    it('should verify all 13 agents have Boundaries', () => {
      const agentsWithBoundaries = REQUIRED_AGENTS.filter(agent => {
        const agentPath = path.join(AGENTS_DIR, agent, 'agent.md');
        if (!fs.existsSync(agentPath)) return false;

        const content = fs.readFileSync(agentPath, 'utf-8');
        return /^##\s+Boundaries\s*$/m.test(content);
      });

      expect(agentsWithBoundaries).toHaveLength(13);
    });

    it('should provide detailed report of missing Boundaries', () => {
      const missingBoundaries = REQUIRED_AGENTS.filter(agent => {
        const agentPath = path.join(AGENTS_DIR, agent, 'agent.md');
        if (!fs.existsSync(agentPath)) return true;

        const content = fs.readFileSync(agentPath, 'utf-8');
        const hasCan = /\*\*CAN:\*\*/.test(content);
        const hasCannot = /\*\*CANNOT:\*\*/.test(content);
        const hasEscalates = /\*\*ESCALATES TO:\*\*/.test(content);

        return !(hasCan && hasCannot && hasEscalates);
      });

      if (missingBoundaries.length > 0) {
        console.log('\nAgents missing complete Boundaries:');
        missingBoundaries.forEach(agent => {
          console.log(`  - ${agent}`);
        });
      }

      expect(missingBoundaries).toHaveLength(0);
    });
  });
});

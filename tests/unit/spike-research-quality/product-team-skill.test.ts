/**
 * Unit tests for Product Team skill External Dependency Policy
 * Tests AC-2: Product-team SKILL.md includes External Dependency Policy and spike validation gate in workflow
 *
 * TDD Approach: These tests verify the product-team skill includes mandatory spike validation gates
 * and external dependency policy to prevent unvalidated dependencies from reaching engineering.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Product Team Skill - External Dependency Policy (AC-2)', () => {
  const skillPath = path.join(process.cwd(), '.claude/skills/product-team/SKILL.md');
  let skillContent: string;

  it('should have product-team SKILL.md file', () => {
    expect(fs.existsSync(skillPath)).toBe(true);
  });

  it('should be readable', () => {
    skillContent = fs.readFileSync(skillPath, 'utf-8');
    expect(skillContent).toBeTruthy();
    expect(skillContent.length).toBeGreaterThan(0);
  });

  describe('Workflow Section', () => {
    it('should have "Workflow" section', () => {
      expect(skillContent).toContain('Workflow');
    });

    it('should include Product Owner step', () => {
      const workflowSection = skillContent.match(/Workflow.*?(?=\#\#)/is)?.[0] || '';
      expect(workflowSection).toMatch(/Product Owner.*Vision/i);
    });

    it('should include Product Manager step', () => {
      const workflowSection = skillContent.match(/Workflow.*?(?=\#\#)/is)?.[0] || '';
      expect(workflowSection).toMatch(/Product Manager.*User stories/i);
    });

    it('should include Designer step', () => {
      const workflowSection = skillContent.match(/Workflow.*?(?=\#\#)/is)?.[0] || '';
      expect(workflowSection).toMatch(/Designer.*UX/i);
    });

    it('should include Spike Validation gate as step 4', () => {
      const workflowSection = skillContent.match(/Workflow.*?(?=\#\#)/is)?.[0] || '';
      expect(workflowSection).toMatch(/\[GATE\].*Spike Validation/i);
    });

    it('should specify gate checks for external dependencies', () => {
      const workflowSection = skillContent.match(/Workflow.*?(?=\#\#)/is)?.[0] || '';
      expect(workflowSection).toMatch(/external dependencies.*validate.*spike/i);
    });

    it('should show workflow flow: Product steps -> Gate -> Engineering handoff', () => {
      const workflowSection = skillContent.match(/Workflow.*?(?=\#\#)/is)?.[0] || '';
      expect(workflowSection).toMatch(/Write to memory.*Hand off.*engineering-team/is);
    });
  });

  describe('Delegation Section', () => {
    it('should have "Delegation" section', () => {
      expect(skillContent).toContain('Delegation');
    });

    it('should delegate external dependency validation to staff-engineer', () => {
      const delegationSection = skillContent.match(/Delegation.*?(?=\#\#)/is)?.[0] || '';
      expect(delegationSection).toMatch(/External dependency validation.*staff-engineer/i);
    });

    it('should specify spike research as delegation action', () => {
      const delegationSection = skillContent.match(/Delegation.*?(?=\#\#)/is)?.[0] || '';
      expect(delegationSection).toMatch(/spike.*research/i);
    });
  });

  describe('External Dependency Policy Section', () => {
    it('should have "External Dependency Policy" section', () => {
      expect(skillContent).toContain('## External Dependency Policy');
    });

    it('should mandate validation before writing feature specs', () => {
      const policySection = skillContent.match(/External Dependency Policy.*?(?=\#\#|\Z)/is)?.[0] || '';
      expect(policySection).toMatch(/Before writing feature specs/i);
      expect(policySection).toMatch(/external.*(?:APIs|tools)/i);
    });

    describe('Policy Steps', () => {
      it('should require identifying all external dependencies', () => {
        const policySection = skillContent.match(/External Dependency Policy.*?(?=\#\#|\Z)/is)?.[0] || '';
        expect(policySection).toMatch(/Identify.*external dependencies/i);
      });

      it('should require classifying as Tier 1 or Tier 2', () => {
        const policySection = skillContent.match(/External Dependency Policy.*?(?=\#\#|\Z)/is)?.[0] || '';
        expect(policySection).toMatch(/Classify.*Tier 1.*Tier 2/is);
      });

      it('should require spawning staff-engineer for Tier 2 validation', () => {
        const policySection = skillContent.match(/External Dependency Policy.*?(?=\#\#|\Z)/is)?.[0] || '';
        expect(policySection).toMatch(/Tier 2.*Spawn.*staff-engineer/is);
      });

      it('should mandate WebSearch usage in spike', () => {
        const policySection = skillContent.match(/External Dependency Policy.*?(?=\#\#|\Z)/is)?.[0] || '';
        expect(policySection).toMatch(/Spike.*MUST.*WebSearch/i);
      });

      it('should require waiting for spike results before finalizing specs', () => {
        const policySection = skillContent.match(/External Dependency Policy.*?(?=\#\#|\Z)/is)?.[0] || '';
        expect(policySection).toMatch(/Wait.*spike results.*before finalizing/i);
      });

      it('should specify action if spike returns NO-GO', () => {
        const policySection = skillContent.match(/External Dependency Policy.*?(?=\#\#|\Z)/is)?.[0] || '';
        expect(policySection).toMatch(/NO-GO.*Revise.*alternative/is);
      });

      it('should require documenting assumption failures', () => {
        const policySection = skillContent.match(/External Dependency Policy.*?(?=\#\#|\Z)/is)?.[0] || '';
        expect(policySection).toMatch(/Document.*assumption failure.*lessons learned/i);
      });
    });

    describe('Tier 2 Examples (Requiring Spikes)', () => {
      it('should list examples requiring spikes', () => {
        const policySection = skillContent.match(/External Dependency Policy.*?(?=\#\#|\Z)/is)?.[0] || '';
        expect(policySection).toMatch(/Examples requiring spikes.*Tier 2/is);
      });

      it('should include third-party APIs as examples', () => {
        const policySection = skillContent.match(/External Dependency Policy.*?(?=\#\#|\Z)/is)?.[0] || '';
        expect(policySection).toMatch(/Third-party APIs/i);
        expect(policySection).toMatch(/Stripe|Figma|UX Pilot/i);
      });

      it('should include external services as examples', () => {
        const policySection = skillContent.match(/External Dependency Policy.*?(?=\#\#|\Z)/is)?.[0] || '';
        expect(policySection).toMatch(/External services.*webhook|CDN/is);
      });

      it('should include new libraries/frameworks as examples', () => {
        const policySection = skillContent.match(/External Dependency Policy.*?(?=\#\#|\Z)/is)?.[0] || '';
        expect(policySection).toMatch(/libraries.*frameworks.*not yet used/i);
      });

      it('should include cloud services as examples', () => {
        const policySection = skillContent.match(/External Dependency Policy.*?(?=\#\#|\Z)/is)?.[0] || '';
        expect(policySection).toMatch(/Cloud services.*AWS|Anthropic/i);
      });
    });

    describe('Tier 1 Examples (NOT Requiring Spikes)', () => {
      it('should list examples NOT requiring spikes', () => {
        const policySection = skillContent.match(/External Dependency Policy.*?(?=\#\#|\Z)/is)?.[0] || '';
        expect(policySection).toMatch(/Examples NOT requiring spikes.*Tier 1/is);
      });

      it('should include existing codebase features', () => {
        const policySection = skillContent.match(/External Dependency Policy.*?(?=\#\#|\Z)/is)?.[0] || '';
        expect(policySection).toMatch(/Existing codebase features/i);
      });

      it('should include internal tools already in use', () => {
        const policySection = skillContent.match(/External Dependency Policy.*?(?=\#\#|\Z)/is)?.[0] || '';
        expect(policySection).toMatch(/Internal tools already in use/i);
      });

      it('should include standard language features', () => {
        const policySection = skillContent.match(/External Dependency Policy.*?(?=\#\#|\Z)/is)?.[0] || '';
        expect(policySection).toMatch(/Standard.*Node\.js|language.*features/i);
      });

      it('should include previously validated dependencies', () => {
        const policySection = skillContent.match(/External Dependency Policy.*?(?=\#\#|\Z)/is)?.[0] || '';
        expect(policySection).toMatch(/Previously validated dependencies/i);
      });
    });
  });

  describe('Memory Protocol', () => {
    it('should include ready_for_engineering field in memory protocol', () => {
      const memorySection = skillContent.match(/Memory Protocol.*?(?=\#\#)/is)?.[0] || '';
      expect(memorySection).toMatch(/ready_for_engineering/i);
    });
  });

  describe('Output Format', () => {
    it('should have "Ready for Engineering" section in output format', () => {
      const outputSection = skillContent.match(/Output Format.*?(?=\#\#|\Z)/is)?.[0] || '';
      expect(outputSection).toMatch(/Ready for Engineering/i);
    });

    it('should include External Dependencies Validated field', () => {
      const outputSection = skillContent.match(/Output Format.*?(?=\#\#|\Z)/is)?.[0] || '';
      expect(outputSection).toMatch(/External Dependencies Validated/i);
    });

    it('should show yes/no/n/a options for validation status', () => {
      const outputSection = skillContent.match(/Output Format.*?(?=\#\#|\Z)/is)?.[0] || '';
      expect(outputSection).toMatch(/yes.*no.*n\/a/i);
    });
  });

  describe('Content Quality', () => {
    it('should have substantial External Dependency Policy content (minimum 150 words)', () => {
      const policySection = skillContent.match(/## External Dependency Policy.*?(?=\n##|\Z)/is)?.[0] || '';
      const wordCount = policySection.split(/\s+/).length;
      expect(wordCount).toBeGreaterThan(150);
    });

    it('should use clear formatting with numbered steps', () => {
      const policySection = skillContent.match(/## External Dependency Policy.*?(?=\n##|\Z)/is)?.[0] || '';
      expect(policySection).toMatch(/1\./);
      expect(policySection).toMatch(/2\./);
      expect(policySection).toMatch(/3\./);
      expect(policySection).toMatch(/4\./);
    });

    it('should distinguish Tier 2 (requiring spikes) from Tier 1 (not requiring spikes)', () => {
      const policySection = skillContent.match(/## External Dependency Policy.*?(?=\n##|\Z)/is)?.[0] || '';
      expect(policySection).toMatch(/Tier 2/i);
      expect(policySection).toMatch(/Tier 1/i);
      expect(policySection).toMatch(/NOT requiring/i);
    });

    it('should not contain placeholder text', () => {
      expect(skillContent).not.toMatch(/\[TODO\]/i);
      expect(skillContent).not.toMatch(/\[PLACEHOLDER\]/i);
      expect(skillContent).not.toMatch(/\[TBD\]/i);
    });
  });

  describe('Integration with Spike Research', () => {
    it('should reference staff-engineer for spike research', () => {
      expect(skillContent).toMatch(/staff-engineer.*spike/i);
    });

    it('should emphasize MUST use WebSearch', () => {
      expect(skillContent).toMatch(/MUST.*WebSearch/i);
    });

    it('should block engineering handoff until spike complete', () => {
      const policySection = skillContent.match(/External Dependency Policy.*?(?=\#\#|\Z)/is)?.[0] || '';
      expect(policySection).toMatch(/Wait.*spike.*before/i);
    });
  });
});

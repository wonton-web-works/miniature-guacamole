/**
 * Unit tests for Staff Engineer agent Spike Research Protocol
 * Tests AC-1: Staff-engineer agent.md includes Spike Research Protocol with Tier 1/Tier 2 requirements
 *
 * TDD Approach: These tests verify the structure and content of the staff-engineer agent definition
 * to ensure it includes all mandatory spike research requirements.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Staff Engineer Agent - Spike Research Protocol (AC-1)', () => {
  const agentPath = path.join(process.cwd(), '.claude/agents/staff-engineer/agent.md');
  let agentContent: string;

  it('should have staff-engineer agent.md file', () => {
    expect(fs.existsSync(agentPath)).toBe(true);
  });

  it('should be readable', () => {
    agentContent = fs.readFileSync(agentPath, 'utf-8');
    expect(agentContent).toBeTruthy();
    expect(agentContent.length).toBeGreaterThan(0);
  });

  describe('Constitution', () => {
    it('should include "External validation" principle in Constitution', () => {
      expect(agentContent).toContain('Constitution');
      expect(agentContent).toContain('External validation');
    });

    it('should mandate verification of external dependencies before negative results', () => {
      const constitutionMatch = agentContent.match(/External validation.*verify external dependencies/i);
      expect(constitutionMatch).toBeTruthy();
    });
  });

  describe('Review Checklist', () => {
    it('should include "Review Checklist" section', () => {
      expect(agentContent).toContain('Review Checklist');
    });

    it('should include external dependency validation checklist item', () => {
      expect(agentContent).toMatch(/External dependencies validated/i);
    });

    it('should include WebSearch requirement for Tier 2 dependencies', () => {
      expect(agentContent).toMatch(/WebSearch.*Tier 2/i);
    });

    it('should include negative results verification checklist item', () => {
      expect(agentContent).toMatch(/Negative results.*multiple sources/i);
    });

    it('should include alternative solutions checklist item', () => {
      expect(agentContent).toMatch(/Alternative solutions researched/i);
    });
  });

  describe('Spike Research Protocol Section', () => {
    it('should have "Spike Research Protocol" section', () => {
      expect(agentContent).toContain('## Spike Research Protocol');
    });

    it('should have "Research Tiers" subsection', () => {
      expect(agentContent).toContain('### Research Tiers');
    });

    describe('Tier 1 (Internal)', () => {
      it('should define Tier 1 as Internal research', () => {
        expect(agentContent).toMatch(/Tier 1.*Internal/i);
      });

      it('should specify Tier 1 scope: codebase, local tools, CLI commands, file system', () => {
        const tier1Section = agentContent.match(/Tier 1.*?\n(?:.*?\n){0,10}/i)?.[0] || '';
        expect(tier1Section).toMatch(/codebase/i);
        expect(tier1Section).toMatch(/local tools/i);
        expect(tier1Section).toMatch(/CLI/i);
        expect(tier1Section).toMatch(/file system/i);
      });

      it('should list Tier 1 required tools: Read, Glob, Grep, Bash', () => {
        const tier1Section = agentContent.match(/Tier 1.*?(?=Tier 2|\#\#)/is)?.[0] || '';
        expect(tier1Section).toContain('Read');
        expect(tier1Section).toContain('Glob');
        expect(tier1Section).toContain('Grep');
        expect(tier1Section).toContain('Bash');
      });

      it('should state WebSearch NOT required for Tier 1', () => {
        const tier1Section = agentContent.match(/Tier 1.*?(?=Tier 2|\#\#)/is)?.[0] || '';
        expect(tier1Section).toMatch(/No WebSearch required/i);
      });

      it('should provide Tier 1 examples', () => {
        const tier1Section = agentContent.match(/Tier 1.*?(?=Tier 2|\#\#)/is)?.[0] || '';
        expect(tier1Section).toMatch(/example/i);
      });
    });

    describe('Tier 2 (External)', () => {
      it('should define Tier 2 as External research', () => {
        expect(agentContent).toMatch(/Tier 2.*External/i);
      });

      it('should specify Tier 2 scope: APIs, services, libraries, documentation, third-party tools', () => {
        const tier2Section = agentContent.match(/Tier 2.*?(?=\#\#\#|\#\#)/is)?.[0] || '';
        expect(tier2Section).toMatch(/API/i);
        expect(tier2Section).toMatch(/service/i);
        expect(tier2Section).toMatch(/librar/i);
        expect(tier2Section).toMatch(/documentation/i);
        expect(tier2Section).toMatch(/third-party/i);
      });

      it('should list Tier 2 required tools including WebSearch', () => {
        const tier2Section = agentContent.match(/Tier 2.*?(?=\#\#\#|\#\#)/is)?.[0] || '';
        expect(tier2Section).toContain('Read');
        expect(tier2Section).toContain('Glob');
        expect(tier2Section).toContain('Grep');
        expect(tier2Section).toContain('Bash');
        expect(tier2Section).toContain('WebSearch');
      });

      it('should mark WebSearch as MANDATORY for Tier 2', () => {
        const tier2Section = agentContent.match(/Tier 2.*?(?=\#\#\#|\#\#)/is)?.[0] || '';
        expect(tier2Section).toMatch(/WebSearch.*MANDATORY/i);
      });

      it('should emphasize CRITICAL importance of WebSearch for external dependencies', () => {
        const tier2Section = agentContent.match(/Tier 2.*?(?=\#\#\#|\#\#)/is)?.[0] || '';
        expect(tier2Section).toMatch(/CRITICAL.*External dependencies.*WebSearch/is);
      });

      it('should provide Tier 2 examples including third-party APIs', () => {
        const tier2Section = agentContent.match(/Tier 2.*?(?=\#\#\#|\#\#)/is)?.[0] || '';
        expect(tier2Section).toMatch(/example/i);
        expect(tier2Section).toMatch(/API/i);
      });
    });

    describe('Negative Result Verification', () => {
      it('should have "Negative Result Verification" subsection', () => {
        expect(agentContent).toContain('### Negative Result Verification');
      });

      it('should require WebSearch before declaring "does not exist"', () => {
        const negativeSection = agentContent.match(/Negative Result Verification.*?(?=\#\#\#|\#\#)/is)?.[0] || '';
        expect(negativeSection).toMatch(/does not exist/i);
        expect(negativeSection).toMatch(/WebSearch/i);
      });

      it('should require search for official website/documentation', () => {
        const negativeSection = agentContent.match(/Negative Result Verification.*?(?=\#\#\#|\#\#)/is)?.[0] || '';
        expect(negativeSection).toMatch(/official.*(?:website|documentation)/i);
      });

      it('should require search for API documentation', () => {
        const negativeSection = agentContent.match(/Negative Result Verification.*?(?=\#\#\#|\#\#)/is)?.[0] || '';
        expect(negativeSection).toMatch(/API documentation/i);
      });

      it('should require search for package registry (NPM/GitHub)', () => {
        const negativeSection = agentContent.match(/Negative Result Verification.*?(?=\#\#\#|\#\#)/is)?.[0] || '';
        expect(negativeSection).toMatch(/NPM|GitHub/i);
      });

      it('should require checking multiple name variations', () => {
        const negativeSection = agentContent.match(/Negative Result Verification.*?(?=\#\#\#|\#\#)/is)?.[0] || '';
        expect(negativeSection).toMatch(/variation/i);
        expect(negativeSection).toMatch(/spaces|hyphens|capitalization/i);
      });

      it('should require minimum 3 WebSearch queries before NO-GO', () => {
        const negativeSection = agentContent.match(/Negative Result Verification.*?(?=\#\#\#|\#\#)/is)?.[0] || '';
        expect(negativeSection).toMatch(/3.*WebSearch/i);
        expect(negativeSection).toMatch(/NO-GO/i);
      });

      it('should emphasize "Only after" requirement for declaring NO-GO', () => {
        const negativeSection = agentContent.match(/Negative Result Verification.*?(?=\#\#\#|\#\#)/is)?.[0] || '';
        expect(negativeSection).toMatch(/Only after.*3.*WebSearch/is);
      });
    });

    describe('Spike Quality Gates', () => {
      it('should list spike deliverables', () => {
        const spikeSection = agentContent.match(/Spike.*(?:Quality Gates|Deliverables).*?(?=\#\#\#|\#\#)/is)?.[0] || '';
        expect(spikeSection).toMatch(/spike.*results\.json/i);
      });

      it('should require research checklist with verification evidence', () => {
        const spikeSection = agentContent.match(/Spike.*(?:Quality Gates|Deliverables).*?(?=\#\#\#|\#\#)/is)?.[0] || '';
        expect(spikeSection).toMatch(/checklist.*evidence/i);
      });

      it('should reference spike-research-checklist-template.json', () => {
        const spikeSection = agentContent.match(/Spike.*(?:Quality Gates|Deliverables).*?(?=\#\#\#|\#\#)/is)?.[0] || '';
        expect(spikeSection).toContain('spike-research-checklist-template.json');
      });

      it('should require alternative solutions if primary approach fails', () => {
        const spikeSection = agentContent.match(/Spike.*(?:Quality Gates|Deliverables).*?(?=\#\#\#|\#\#)/is)?.[0] || '';
        expect(spikeSection).toMatch(/alternative.*solution/i);
      });

      it('should require clear GO/NO-GO recommendation with confidence level', () => {
        const spikeSection = agentContent.match(/Spike.*(?:Quality Gates|Deliverables).*?(?=\#\#\#|\#\#)/is)?.[0] || '';
        expect(spikeSection).toMatch(/GO.*NO-GO/i);
        expect(spikeSection).toMatch(/confidence/i);
      });

      it('should have completion checklist with Tier 2 validation', () => {
        const spikeSection = agentContent.match(/Spike.*Quality Gates.*?(?=\#\#|\Z)/is)?.[0] || '';
        expect(spikeSection).toMatch(/Tier 2.*validated.*WebSearch/is);
      });

      it('should require minimum 3 WebSearch queries for negative findings', () => {
        const spikeSection = agentContent.match(/Spike.*Quality Gates.*?(?=\#\#|\Z)/is)?.[0] || '';
        expect(spikeSection).toMatch(/3.*WebSearch.*negative/is);
      });

      it('should require minimum 3 alternative solutions researched', () => {
        const spikeSection = agentContent.match(/Spike.*Quality Gates.*?(?=\#\#|\Z)/is)?.[0] || '';
        expect(spikeSection).toMatch(/3.*alternative/i);
      });
    });
  });

  describe('Content Quality', () => {
    it('should have substantial Spike Research Protocol content (minimum 200 words)', () => {
      const spikeSection = agentContent.match(/## Spike Research Protocol.*?(?=\n##|\Z)/is)?.[0] || '';
      const wordCount = spikeSection.split(/\s+/).length;
      expect(wordCount).toBeGreaterThan(200);
    });

    it('should use clear formatting with headings and bullet points', () => {
      expect(agentContent).toMatch(/##.*Spike Research Protocol/);
      expect(agentContent).toMatch(/###.*Research Tiers/);
      expect(agentContent).toMatch(/###.*Negative Result Verification/);
      expect(agentContent).toContain('-'); // Has bullet points
    });

    it('should not contain placeholder text', () => {
      expect(agentContent).not.toMatch(/\[TODO\]/i);
      expect(agentContent).not.toMatch(/\[PLACEHOLDER\]/i);
      expect(agentContent).not.toMatch(/\[TBD\]/i);
    });
  });
});

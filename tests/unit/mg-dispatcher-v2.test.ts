/**
 * Unit Tests for the mg dispatcher v2 upgrade (WS-2.0-1)
 *
 * Contract/documentation tests verifying the new grouped display and smart
 * sub-command routing described in the WS-2.0-1 spec.
 *
 * These tests are ADDITIONAL to the 79 tests in mg-dispatcher.test.ts.
 * They MUST NOT duplicate checks already in that file.
 *
 * Tests are ordered misuse-first per TDD workflow:
 *   misuse → boundary → golden path
 *
 * NOTE: These tests FAIL before SKILL.md is upgraded. That is intentional.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SKILLS_DIR = path.resolve(__dirname, '../../src/framework/skills');
const SKILL_PATH = path.join(SKILLS_DIR, 'mg', 'SKILL.md');

// The full list of routable skills that must still be present after the upgrade.
const ALL_17_SKILLS = [
  'mg-accessibility-review',
  'mg-add-context',
  'mg-assess',
  'mg-assess-tech',
  'mg-build',
  'mg-code-review',
  'mg-debug',
  'mg-design',
  'mg-design-review',
  'mg-document',
  'mg-init',
  'mg-refactor',
  'mg-security-review',
  'mg-spec',
  'mg-ticket',
  'mg-write',
] as const;

// Skills that /mg plan must describe routing to (AC 3)
// mg-leadership-team merged into /mg — strategic planning is handled in /mg leadership mode
const PLAN_ROUTING_TARGETS = [
  'mg-assess',
  'mg-assess-tech',
  'mg-spec',
] as const;

// Skills that /mg review must describe routing to (AC 4)
// mg-leadership-team merged into /mg — workstream approval is handled in /mg leadership mode
const REVIEW_ROUTING_TARGETS = [
  'mg-code-review',
  'mg-security-review',
  'mg-design-review',
  'mg-accessibility-review',
] as const;

// Required group names in the grouped display (AC 2)
const REQUIRED_GROUPS = ['Planning', 'Building', 'Reviewing', 'Shipping'] as const;

// Helper — read once and cache within a test run
let _content: string | null = null;
function content(): string {
  if (_content === null) {
    _content = fs.readFileSync(SKILL_PATH, 'utf-8');
  }
  return _content;
}

// Helper — extract a named ## section through to the next ## or EOF
function extractSection(sectionPattern: RegExp): string | null {
  const match = content().match(sectionPattern);
  return match ? match[1] : null;
}

// ─────────────────────────────────────────────────────────────
// ROOT GUARD
// ─────────────────────────────────────────────────────────────

describe('mg dispatcher v2 — root guard', () => {
  it('SKILL.md must exist at src/framework/skills/mg/SKILL.md', () => {
    expect(fs.existsSync(SKILL_PATH)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// MISUSE CASES — tested first per TDD workflow
// ─────────────────────────────────────────────────────────────

describe('mg dispatcher v2 — misuse cases', () => {
  describe('dispatcher contract preserved: no agent spawning', () => {
    it('SKILL.md must still explicitly state it does NOT spawn agents after upgrade', () => {
      // Given: the upgrade adds grouped display and sub-commands
      // When: we check the routing-only contract
      // Then: the file must still contain language stating it only routes
      expect(content()).toMatch(/only routes?|routes only|does not spawn|does not execute/i);
    });

    it('SKILL.md Boundaries CANNOT field must still forbid spawning subagents', () => {
      // Regression guard: upgrade must not quietly remove the spawn restriction
      const cannotMatch = content().match(/\*\*CANNOT:\*\*\s+([\s\S]*?)(?=\*\*[A-Z]|\n##\s+|$)/);
      expect(cannotMatch, 'CANNOT field must exist in Boundaries').toBeTruthy();
      if (cannotMatch) {
        expect(cannotMatch[1]).toMatch(/spawn|subagent/i);
      }
    });

    it('/mg plan sub-command section must NOT claim to execute the planning work', () => {
      // The plan sub-command describes routing, not execution
      const planSection = extractSection(
        /##\s+\/mg plan\s*([\s\S]*?)(?=\n##\s+|$)/i
      );
      expect(planSection, '/mg plan section must exist').toBeTruthy();
      if (planSection) {
        expect(planSection).not.toMatch(/executes?.*plan|runs?.*planning|does.*planning/i);
      }
    });

    it('/mg review sub-command section must NOT claim to execute the review work', () => {
      // The review sub-command describes routing, not execution
      const reviewSection = extractSection(
        /##\s+\/mg review\s*([\s\S]*?)(?=\n##\s+|$)/i
      );
      expect(reviewSection, '/mg review section must exist').toBeTruthy();
      if (reviewSection) {
        expect(reviewSection).not.toMatch(/executes?.*review|runs?.*review|does.*review/i);
      }
    });
  });

  describe('no skills dropped from the file', () => {
    for (const skill of ALL_17_SKILLS) {
      it(`${skill} must still appear somewhere in SKILL.md after the upgrade`, () => {
        // Given: the upgrade restructures the no-args display
        // Then: every original skill must still be referenced — none dropped
        expect(content()).toContain(skill);
      });
    }
  });

  describe('no phantom skills introduced in sub-command sections', () => {
    it('/mg plan section must NOT reference mg-deploy (not yet implemented)', () => {
      const planSection = extractSection(
        /##\s+\/mg plan\s*([\s\S]*?)(?=\n##\s+|$)/i
      );
      if (planSection) {
        expect(planSection).not.toMatch(/mg-deploy/);
      }
    });

    it('/mg review section must NOT reference mg-qa (not yet implemented)', () => {
      const reviewSection = extractSection(
        /##\s+\/mg review\s*([\s\S]*?)(?=\n##\s+|$)/i
      );
      if (reviewSection) {
        expect(reviewSection).not.toMatch(/mg-qa/);
      }
    });

    it('/mg plan section must NOT reference mg-test (does not exist)', () => {
      const planSection = extractSection(
        /##\s+\/mg plan\s*([\s\S]*?)(?=\n##\s+|$)/i
      );
      if (planSection) {
        expect(planSection).not.toMatch(/mg-test(?!-)/);
      }
    });
  });

  describe('grouped display must not silently omit groups', () => {
    it('grouped no-args display must NOT reduce to fewer than 4 groups', () => {
      // A partial grouping (e.g. only Planning + Building) is a misuse of the spec
      let foundGroups = 0;
      for (const group of REQUIRED_GROUPS) {
        if (content().includes(group)) foundGroups++;
      }
      expect(
        foundGroups,
        `Expected all 4 groups (Planning, Building, Reviewing, Shipping), found ${foundGroups}`
      ).toBeGreaterThanOrEqual(4);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// BOUNDARY CASES
// ─────────────────────────────────────────────────────────────

describe('mg dispatcher v2 — boundary cases', () => {
  describe('grouped display: skill count still adds up', () => {
    it('total skills across all group entries must equal 16', () => {
      // After grouping, the same 16 skills should appear — no more, no less.
      // mg-leadership-team merged into /mg — 17 original skills minus 1 = 16.
      // We scan the full file for mg-* skill references and deduplicate.
      const allMgSkills = content().match(/mg-[\w-]+/g) ?? [];
      const uniqueSkills = new Set(
        allMgSkills.filter(s => ALL_17_SKILLS.includes(s as typeof ALL_17_SKILLS[number]))
      );
      expect(
        uniqueSkills.size,
        `Expected exactly 16 skill references, found: ${[...uniqueSkills].join(', ')}`
      ).toBe(16);
    });

    it('grouped display sections must not list the same skill in two different groups', () => {
      // Each skill belongs to exactly one group — duplication is a spec violation
      // Strategy: find all mg-* occurrences in the no-args / grouped display block
      // (the section up to the Routing Table header), check for duplicates there.
      const noArgsSection = extractSection(
        /##\s+No.?Args\s*([\s\S]*?)(?=\n##\s+Routing|$)/i
      );
      if (noArgsSection) {
        const listed = noArgsSection.match(/mg-[\w-]+/g) ?? [];
        const unique = new Set(listed);
        expect(
          listed.length,
          `Duplicate skills detected in grouped display: ${listed.filter((s, i) => listed.indexOf(s) !== i).join(', ')}`
        ).toBe(unique.size);
      }
    });
  });

  describe('/mg plan routing: boundary inputs', () => {
    it('/mg plan section must describe routing for ambiguous "rough idea" input', () => {
      // A rough idea is the low-maturity boundary — maps to mg-assess
      const planSection = extractSection(
        /##\s+\/mg plan\s*([\s\S]*?)(?=\n##\s+|$)/i
      );
      expect(planSection, '/mg plan section must exist').toBeTruthy();
      if (planSection) {
        expect(planSection).toMatch(/rough|idea|early|initial|vague|immature/i);
      }
    });

    it('/mg plan section must distinguish between mg-assess (idea) and mg-spec (requirements)', () => {
      // These two look similar to users. The dispatcher must disambiguate.
      const planSection = extractSection(
        /##\s+\/mg plan\s*([\s\S]*?)(?=\n##\s+|$)/i
      );
      expect(planSection, '/mg plan section must exist').toBeTruthy();
      if (planSection) {
        expect(planSection).toMatch(/mg-assess/);
        expect(planSection).toMatch(/mg-spec/);
      }
    });

    it('/mg plan section must distinguish mg-assess from mg-assess-tech', () => {
      // Both are "assess" skills — the routing must specify when each applies
      const planSection = extractSection(
        /##\s+\/mg plan\s*([\s\S]*?)(?=\n##\s+|$)/i
      );
      expect(planSection, '/mg plan section must exist').toBeTruthy();
      if (planSection) {
        expect(planSection).toMatch(/mg-assess(?!-tech)/);
        expect(planSection).toMatch(/mg-assess-tech/);
      }
    });
  });

  describe('/mg review routing: boundary inputs', () => {
    it('/mg review section must handle the ambiguous bare "review" case — not silently pick one skill', () => {
      // "review" alone could mean code, security, design, or accessibility.
      // The dispatcher must ask or present options, not guess.
      const reviewSection = extractSection(
        /##\s+\/mg review\s*([\s\S]*?)(?=\n##\s+|$)/i
      );
      expect(reviewSection, '/mg review section must exist').toBeTruthy();
      if (reviewSection) {
        // Section must present multiple options (more than one mg-*-review skill mentioned)
        // mg-leadership-team merged into /mg — workstream approval is handled in /mg leadership mode
        const reviewSkills = reviewSection.match(/mg-[\w-]+-review/g) ?? [];
        const unique = new Set(reviewSkills);
        expect(
          unique.size,
          'Bare /mg review must route to more than one possible target'
        ).toBeGreaterThan(1);
      }
    });

    it('/mg review section must distinguish security-sensitive code review from standard code review', () => {
      // Security is a distinct boundary case — must route to mg-security-review, not mg-code-review
      const reviewSection = extractSection(
        /##\s+\/mg review\s*([\s\S]*?)(?=\n##\s+|$)/i
      );
      expect(reviewSection, '/mg review section must exist').toBeTruthy();
      if (reviewSection) {
        expect(reviewSection).toMatch(/security/i);
        expect(reviewSection).toMatch(/mg-security-review/);
      }
    });
  });

  describe('existing routing table keywords must survive the upgrade', () => {
    const preservedKeywords = ['build', 'debug', 'fix', 'refactor', 'ticket', 'docs', 'document', 'write', 'a11y'];
    for (const keyword of preservedKeywords) {
      it(`keyword "${keyword}" must still appear in SKILL.md after upgrade`, () => {
        // Routing table entries must not be removed when sub-commands are added
        expect(content()).toMatch(new RegExp(keyword, 'i'));
      });
    }
  });
});

// ─────────────────────────────────────────────────────────────
// GOLDEN PATH
// ─────────────────────────────────────────────────────────────

describe('mg dispatcher v2 — golden path', () => {
  describe('AC 1: grouped command display section exists', () => {
    it('No-Args section describes grouped display (not just a flat list)', () => {
      // AC 1: SKILL.md has a section describing grouped command display
      // A grouped display will include group names as headers or bold labels
      const noArgsSection = extractSection(
        /##\s+No.?Args\s*([\s\S]*?)(?=\n##\s+Routing|$)/i
      );
      expect(noArgsSection, 'No-Args section must exist').toBeTruthy();
      if (noArgsSection) {
        // At least one of the expected group names must appear in the no-args section
        const groupsFound = REQUIRED_GROUPS.filter(g => noArgsSection.includes(g));
        expect(
          groupsFound.length,
          `No group names found in No-Args section. Expected at least one of: ${REQUIRED_GROUPS.join(', ')}`
        ).toBeGreaterThan(0);
      }
    });
  });

  describe('AC 2: all four groups present in file', () => {
    for (const group of REQUIRED_GROUPS) {
      it(`grouped display includes group: ${group}`, () => {
        // AC 2: file mentions all 4 groups
        expect(content()).toContain(group);
      });
    }
  });

  describe('AC 3: /mg plan sub-command section routes to all four planning skills', () => {
    it('/mg plan section exists', () => {
      // AC 3: SKILL.md has a /mg plan sub-command section
      const planSection = extractSection(
        /##\s+\/mg plan\s*([\s\S]*?)(?=\n##\s+|$)/i
      );
      expect(planSection, '/mg plan section not found').toBeTruthy();
    });

    for (const skill of PLAN_ROUTING_TARGETS) {
      it(`/mg plan section describes routing to ${skill}`, () => {
        const planSection = extractSection(
          /##\s+\/mg plan\s*([\s\S]*?)(?=\n##\s+|$)/i
        );
        expect(planSection, '/mg plan section must exist').toBeTruthy();
        if (planSection) {
          expect(planSection).toContain(skill);
        }
      });
    }

    it('/mg plan section specifies rough idea → mg-assess routing', () => {
      const planSection = extractSection(
        /##\s+\/mg plan\s*([\s\S]*?)(?=\n##\s+|$)/i
      );
      expect(planSection, '/mg plan section must exist').toBeTruthy();
      if (planSection) {
        // Must mention rough/idea/early in proximity to mg-assess
        expect(planSection).toMatch(/rough|idea|early|immature|unclear/i);
        expect(planSection).toMatch(/mg-assess/);
      }
    });

    it('/mg plan section specifies architecture decision → mg-assess-tech routing', () => {
      const planSection = extractSection(
        /##\s+\/mg plan\s*([\s\S]*?)(?=\n##\s+|$)/i
      );
      expect(planSection, '/mg plan section must exist').toBeTruthy();
      if (planSection) {
        expect(planSection).toMatch(/architect|technical|tech/i);
        expect(planSection).toMatch(/mg-assess-tech/);
      }
    });

    it('/mg plan section specifies ready for requirements → mg-spec routing', () => {
      const planSection = extractSection(
        /##\s+\/mg plan\s*([\s\S]*?)(?=\n##\s+|$)/i
      );
      expect(planSection, '/mg plan section must exist').toBeTruthy();
      if (planSection) {
        expect(planSection).toMatch(/require|stories|spec|ready/i);
        expect(planSection).toMatch(/mg-spec/);
      }
    });

    it('/mg plan section specifies strategic review → leadership mode (within /mg)', () => {
      // mg-leadership-team merged into /mg — strategic planning stays in /mg leadership mode
      const planSection = extractSection(
        /##\s+\/mg plan\s*([\s\S]*?)(?=\n##\s+|$)/i
      );
      expect(planSection, '/mg plan section must exist').toBeTruthy();
      if (planSection) {
        expect(planSection).toMatch(/strategic|leadership|executive|roadmap/i);
      }
    });
  });

  describe('AC 4: /mg review sub-command section routes to all five review skills', () => {
    it('/mg review section exists', () => {
      // AC 4: SKILL.md has a /mg review sub-command section
      const reviewSection = extractSection(
        /##\s+\/mg review\s*([\s\S]*?)(?=\n##\s+|$)/i
      );
      expect(reviewSection, '/mg review section not found').toBeTruthy();
    });

    for (const skill of REVIEW_ROUTING_TARGETS) {
      it(`/mg review section describes routing to ${skill}`, () => {
        const reviewSection = extractSection(
          /##\s+\/mg review\s*([\s\S]*?)(?=\n##\s+|$)/i
        );
        expect(reviewSection, '/mg review section must exist').toBeTruthy();
        if (reviewSection) {
          expect(reviewSection).toContain(skill);
        }
      });
    }

    it('/mg review section specifies code changes → mg-code-review routing', () => {
      const reviewSection = extractSection(
        /##\s+\/mg review\s*([\s\S]*?)(?=\n##\s+|$)/i
      );
      expect(reviewSection, '/mg review section must exist').toBeTruthy();
      if (reviewSection) {
        expect(reviewSection).toMatch(/code|changes|pr|pull request/i);
        expect(reviewSection).toMatch(/mg-code-review/);
      }
    });

    it('/mg review section specifies security-sensitive code → mg-security-review routing', () => {
      const reviewSection = extractSection(
        /##\s+\/mg review\s*([\s\S]*?)(?=\n##\s+|$)/i
      );
      expect(reviewSection, '/mg review section must exist').toBeTruthy();
      if (reviewSection) {
        expect(reviewSection).toMatch(/security/i);
        expect(reviewSection).toMatch(/mg-security-review/);
      }
    });

    it('/mg review section specifies visual/UI changes → mg-design-review routing', () => {
      const reviewSection = extractSection(
        /##\s+\/mg review\s*([\s\S]*?)(?=\n##\s+|$)/i
      );
      expect(reviewSection, '/mg review section must exist').toBeTruthy();
      if (reviewSection) {
        expect(reviewSection).toMatch(/visual|ui|design/i);
        expect(reviewSection).toMatch(/mg-design-review/);
      }
    });

    it('/mg review section specifies accessibility → mg-accessibility-review routing', () => {
      const reviewSection = extractSection(
        /##\s+\/mg review\s*([\s\S]*?)(?=\n##\s+|$)/i
      );
      expect(reviewSection, '/mg review section must exist').toBeTruthy();
      if (reviewSection) {
        expect(reviewSection).toMatch(/accessibility|a11y/i);
        expect(reviewSection).toMatch(/mg-accessibility-review/);
      }
    });

    it('/mg review section specifies workstream approval → leadership mode (within /mg)', () => {
      // mg-leadership-team merged into /mg — workstream approval stays in /mg leadership mode
      const reviewSection = extractSection(
        /##\s+\/mg review\s*([\s\S]*?)(?=\n##\s+|$)/i
      );
      expect(reviewSection, '/mg review section must exist').toBeTruthy();
      if (reviewSection) {
        expect(reviewSection).toMatch(/workstream|approval|leadership|executive/i);
      }
    });
  });

  describe('AC 5: all 16 routable skills still referenced', () => {
    // mg-leadership-team was merged into /mg and is no longer a separate routable skill
    for (const skill of ALL_17_SKILLS) {
      it(`${skill} is still referenced in SKILL.md`, () => {
        expect(content()).toContain(skill);
      });
    }
  });

  describe('AC 6: dispatcher contract preserved — no agent spawning', () => {
    it('SKILL.md body still says it does NOT spawn agents', () => {
      const bodyStart = content().indexOf('---', 3) + 3; // skip frontmatter
      const body = content().slice(bodyStart);
      expect(body).toMatch(/only routes?|routes only|does not spawn|does not execute/i);
    });

    it('Boundaries section still has CANNOT referencing dispatch/spawn restriction', () => {
      expect(content()).toMatch(/\*\*CANNOT:\*\*/);
      const cannotMatch = content().match(/\*\*CANNOT:\*\*\s+([\s\S]*?)(?=\*\*[A-Z]|\n##\s+|$)/);
      if (cannotMatch) {
        expect(cannotMatch[1]).toMatch(/spawn|subagent|dispatch/i);
      }
    });
  });

  describe('AC 7: existing routing table keywords still present', () => {
    const existingKeywords = [
      'build', 'implement', 'execute',
      'assess', 'evaluate', 'feature',
      'spec', 'define', 'requirements',
      'design',
      'debug', 'fix', 'broken', 'bug',
      'refactor', 'clean', 'restructure',
      'ticket', 'issue',
      'docs', 'document',
      'write', 'copy', 'marketing', 'content',
      'security', 'owasp', 'auth',
      'accessibility', 'a11y', 'wcag',
      'code-review', 'pr',
      'design-review', 'ux', 'ui',
      'tech', 'architecture', 'feasibility',
      'init', 'initialize', 'setup',
      'context', 'add-context', 'reference',
    ];
    for (const keyword of existingKeywords) {
      it(`routing keyword "${keyword}" is still present in SKILL.md`, () => {
        // Routing keywords from the original spec must be preserved
        expect(content()).toMatch(new RegExp(keyword, 'i'));
      });
    }
  });
});

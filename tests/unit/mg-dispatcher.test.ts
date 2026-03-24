/**
 * Unit Tests for the mg dispatcher skill
 *
 * Contract/documentation tests verifying SKILL.md behavior spec.
 * Tests are ordered misuse-first per TDD workflow.
 * WS-DISPATCH-1: /mg — front door dispatcher to all 17 mg-* skills
 *
 * NOTE: These tests FAIL before SKILL.md is written. That is intentional.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SKILLS_DIR = path.resolve(__dirname, '../../src/framework/skills');
const SKILL_PATH = path.join(SKILLS_DIR, 'mg', 'SKILL.md');

// The full list of routable skills (17 total). mg itself is not routable.
const ROUTABLE_SKILLS = [
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

// Keywords that must appear in the routing table (acceptance criteria 5)
const REQUIRED_ROUTING_KEYWORDS = [
  'build',
  'plan',
  'leadership',
  'review',
  'assess',
  'evaluate',
  'spec',
  'define',
  'design',
  'debug',
  'fix',
  'refactor',
  'ticket',
  'bug',
  'issue',
  'docs',
  'document',
  'write',
  'copy',
  'security',
  'accessibility',
  'a11y',
  'code-review',
  'design-review',
  'tech',
  'architecture',
  'init',
  'context',
] as const;

// Helper — read once and cache within a test run
let _content: string | null = null;
function content(): string {
  if (_content === null) {
    _content = fs.readFileSync(SKILL_PATH, 'utf-8');
  }
  return _content;
}

// ─────────────────────────────────────────────────────────────
// ROOT GUARD — must pass for every other test to be meaningful
// ─────────────────────────────────────────────────────────────

describe('mg dispatcher — root guard', () => {
  it('SKILL.md must exist at src/framework/skills/mg/SKILL.md', () => {
    expect(fs.existsSync(SKILL_PATH)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// MISUSE CASES — tested first per TDD workflow
// ─────────────────────────────────────────────────────────────

describe('mg dispatcher — misuse cases (tested first)', () => {
  describe('no agent spawning', () => {
    it('SKILL.md body must NOT contain "subagent_type" — dispatcher never spawns agents', () => {
      // Given: a dispatcher that only routes
      // When: scanning SKILL.md for agent-spawning patterns
      // Then: "subagent_type" must not appear anywhere in the body
      const bodyStart = content().indexOf('---', 3) + 3; // skip frontmatter
      const body = content().slice(bodyStart);
      expect(body).not.toMatch(/subagent_type/);
    });

    it('SKILL.md dispatch mode must explicitly state it does NOT spawn agents', () => {
      // Dispatch mode (Path 1) is routing-only. Leadership mode (Path 2) may spawn — that is intentional.
      // We verify the dispatch mode section explicitly forbids spawning.
      const dispatchMatch = content().match(
        /##\s+Path 1.*?Dispatch Mode\s*([\s\S]*?)(?=\n##\s+Path 2|$)/i
      );
      if (dispatchMatch) {
        // Dispatch mode boundaries must explicitly say CANNOT spawn
        expect(dispatchMatch[1]).toMatch(/cannot.*spawn|does not spawn|never spawn|only routes?/i);
      } else {
        // Fall back to checking the overall boundaries section for dispatch restriction
        expect(content()).toMatch(/Dispatch mode CANNOT.*spawn|only routes?|does not spawn/i);
      }
    });

    it('SKILL.md must explicitly state it only routes — not executes', () => {
      // The skill must make clear in its documented behavior that it routes only
      expect(content()).toMatch(/only routes?|routes only|does not spawn|does not execute/i);
    });
  });

  describe('no phantom skills in routing table', () => {
    it('routing table must NOT reference mg-deploy (not yet implemented)', () => {
      expect(content()).not.toMatch(/mg-deploy/);
    });

    it('routing table must NOT reference mg-qa (not yet implemented)', () => {
      expect(content()).not.toMatch(/mg-qa/);
    });

    it('routing table must NOT reference mg-test (does not exist)', () => {
      expect(content()).not.toMatch(/mg-test(?!-)/);
    });

    it('routing table must NOT reference mg-run (does not exist)', () => {
      expect(content()).not.toMatch(/mg-run/);
    });
  });

  describe('no-args behavior must be documented (not silently fail)', () => {
    it('SKILL.md must document what happens when invoked with no arguments', () => {
      // Given: user types /mg with nothing after it
      // Then: skill must have a documented no-args mode (show all commands)
      expect(content()).toMatch(/no.arg|no arg|without arg|zero arg|invoked.*no|no.*argument|## No-?Args|no-args mode/i);
    });

    it('no-args mode must show all commands — not silently do nothing', () => {
      // Silently doing nothing is a bad UX. The spec requires listing all 17 skills.
      expect(content()).toMatch(/show.*commands?|list.*commands?|all.*commands?|shows.*skills?|list.*skills?/i);
    });
  });

  describe('natural language fallback must be documented', () => {
    it('SKILL.md must document behavior for unrecognized input', () => {
      // Given: user types /mg <something that doesn't match any keyword>
      // Then: skill must suggest a command, not silently fail
      expect(content()).toMatch(/unrecognized|fallback|no.*match|not.*match|didn.t.*match|suggest/i);
    });

    it('fallback must suggest a skill — not silently fail or error', () => {
      // Silently failing or returning a raw error is a misuse of the dispatcher role
      expect(content()).toMatch(/suggest.*command|suggest.*skill|recommend.*command|closest.*match|fallback.*suggest/i);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// BOUNDARY CASES
// ─────────────────────────────────────────────────────────────

describe('mg dispatcher — boundary cases', () => {
  describe('skill count precision', () => {
    it('no-args section must list exactly 17 skills (not 16, not 18)', () => {
      // Acceptance criteria 9: the skill count is 17 (mg-leadership-team merged into /mg)
      // We count distinct mg-* skill names listed in the no-args section.
      // Strategy: find the no-args section and count mg-* occurrences there.
      const noArgsMatch = content().match(
        /##\s+No.?Args\s*([\s\S]*?)(?=\n##\s+|\n---\s+|$)/i
      );
      expect(noArgsMatch, 'no-args section must exist').toBeTruthy();

      if (noArgsMatch) {
        const section = noArgsMatch[1];
        const listedSkills = section.match(/mg-[\w-]+/g) ?? [];
        const uniqueSkills = new Set(listedSkills);
        expect(
          uniqueSkills.size,
          `Expected 17 unique skills in no-args section, found: ${[...uniqueSkills].join(', ')}`
        ).toBe(17);
      }
    });

    it('no-args section skill list must not contain duplicate entries', () => {
      const noArgsMatch = content().match(
        /##\s+No.?Args\s*([\s\S]*?)(?=\n##\s+|\n---\s+|$)/i
      );
      if (noArgsMatch) {
        const section = noArgsMatch[1];
        const listedSkills = section.match(/mg-[\w-]+/g) ?? [];
        const unique = new Set(listedSkills);
        expect(listedSkills.length).toBe(unique.size);
      }
    });
  });

  describe('routing table keyword completeness', () => {
    it('routing table section must exist', () => {
      expect(content()).toMatch(/##\s+Routing Table|## Routing|##.*routing/i);
    });

    it('routing table must cover ambiguous keyword "review" (maps to multiple skills)', () => {
      // "review" could mean code-review, design-review, security-review, accessibility-review.
      // The dispatcher must handle this and clarify — not just pick one silently.
      expect(content()).toMatch(/review/i);
      // The routing table must show review keywords map to specific skills
      const routingMatch = content().match(/##\s+Routing\s*Table?\s*([\s\S]*?)(?=\n##\s+|$)/i);
      if (routingMatch) {
        expect(routingMatch[1]).toMatch(/review/i);
      }
    });

    it('routing table must cover "tech" keyword (maps to mg-assess-tech)', () => {
      const routingMatch = content().match(/##\s+Routing\s*Table?\s*([\s\S]*?)(?=\n##\s+|$)/i);
      expect(routingMatch).toBeTruthy();
      if (routingMatch) {
        expect(routingMatch[1]).toMatch(/tech|architecture/i);
        expect(routingMatch[1]).toMatch(/mg-assess-tech/);
      }
    });

    it('routing table must cover "a11y" alias for accessibility', () => {
      expect(content()).toMatch(/a11y/i);
    });
  });

  describe('boundaries section completeness', () => {
    it('Boundaries section must have CAN, CANNOT, and ESCALATES TO — all on non-empty lines', () => {
      // Post-merger: boundaries are split by mode. Accept mode-prefixed labels.
      const canMatch = content().match(/\*\*(?:Dispatch mode )?CAN:\*\*\s+(.+)/);
      const cannotMatch = content().match(/\*\*(?:Dispatch mode )?CANNOT:\*\*\s+(.+)/);
      const escalatesMatch = content().match(/\*\*ESCALATES TO:\*\*\s+(.+)/);

      expect(canMatch?.[1].trim().length).toBeGreaterThan(0);
      expect(cannotMatch?.[1].trim().length).toBeGreaterThan(0);
      expect(escalatesMatch?.[1].trim().length).toBeGreaterThan(0);
    });

    it('Boundaries CANNOT field must explicitly mention spawning agents', () => {
      // Post-merger: dispatch mode CANNOT must explicitly forbid spawning agents
      const cannotMatch = content().match(/\*\*(?:Dispatch mode )?CANNOT:\*\*\s+([\s\S]*?)(?=\*\*[A-Z]|\n##\s+|$)/);
      if (cannotMatch) {
        expect(cannotMatch[1]).toMatch(/spawn|execute.*work|perform.*work|run.*work/i);
      }
    });
  });
});

// ─────────────────────────────────────────────────────────────
// GOLDEN PATH
// ─────────────────────────────────────────────────────────────

describe('mg dispatcher — golden path', () => {
  describe('all 16 routable skills are listed in no-args output', () => {
    for (const skill of ROUTABLE_SKILLS) {
      it(`no-args section lists ${skill}`, () => {
        const noArgsMatch = content().match(
          /##\s+No.?Args\s*([\s\S]*?)(?=\n##\s+|\n---\s+|$)/i
        );
        expect(noArgsMatch, 'no-args section must exist').toBeTruthy();
        if (noArgsMatch) {
          expect(noArgsMatch[1]).toContain(skill);
        }
      });
    }
  });

  describe('routing table covers all required keywords', () => {
    for (const keyword of REQUIRED_ROUTING_KEYWORDS) {
      it(`routing table covers keyword: ${keyword}`, () => {
        const routingMatch = content().match(/##\s+Routing\s*Table?\s*([\s\S]*?)(?=\n##\s+|$)/i);
        expect(routingMatch, 'routing table section must exist').toBeTruthy();
        if (routingMatch) {
          expect(routingMatch[1]).toMatch(new RegExp(keyword, 'i'));
        }
      });
    }
  });

  describe('natural language fallback section', () => {
    it('has a Fallback or Natural Language section', () => {
      expect(content()).toMatch(/##\s+(Fallback|Natural Language|Unrecognized Input)/i);
    });

    it('fallback section says it suggests a skill rather than failing', () => {
      const fallbackMatch = content().match(
        /##\s+(?:Fallback|Natural Language|Unrecognized Input)\s*([\s\S]*?)(?=\n##\s+|$)/i
      );
      expect(fallbackMatch).toBeTruthy();
      if (fallbackMatch) {
        expect(fallbackMatch[1]).toMatch(/suggest/i);
      }
    });
  });

  describe('structure contract', () => {
    it('has No-Args section (## or ### level)', () => {
      // Post-merger: No-Args is a subsection (### No-Args Menu) under ## Path 1 — Dispatch Mode
      expect(content()).toMatch(/^#{2,3}\s+No.?Args/im);
    });

    it('has Routing Table section (## or ### level)', () => {
      // Post-merger: Routing Table is a subsection (### Routing Table) under ## Path 1 — Dispatch Mode
      expect(content()).toMatch(/^#{2,3}\s+Routing\s*Table?/im);
    });

    it('has ## Boundaries section', () => {
      expect(content()).toMatch(/^##\s+Boundaries\s*$/m);
    });

    it('has ## Constitution section', () => {
      expect(content()).toMatch(/^##\s+Constitution\s*$/m);
    });

    it('Boundaries fields are in correct order: CAN before CANNOT before ESCALATES TO', () => {
      // Post-merger: boundaries are split by mode. Accept both standard (**CAN:**)
      // and mode-prefixed (**Dispatch mode CAN:**) patterns.
      const canIndex = content().search(/\*\*(?:Dispatch mode )?CAN:\*\*/);
      const cannotIndex = content().search(/\*\*(?:Dispatch mode )?CANNOT:\*\*/);
      const escalatesIndex = content().search(/\*\*ESCALATES TO:\*\*/);

      expect(canIndex).toBeGreaterThan(-1);
      expect(canIndex).toBeLessThan(cannotIndex);
      expect(cannotIndex).toBeLessThan(escalatesIndex);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// FRONTMATTER CONTRACT
// ─────────────────────────────────────────────────────────────

describe('mg dispatcher — frontmatter contract', () => {
  it('has valid YAML frontmatter delimiters', () => {
    expect(content()).toMatch(/^---$/m);
  });

  it('has name: mg', () => {
    expect(content()).toMatch(/^name:\s+mg\s*$/m);
  });

  it('has a non-empty quoted description', () => {
    expect(content()).toMatch(/description:\s*"[^"]+"/);
  });

  it('has model: opus', () => {
    // /mg runs leadership mode (spawns agents) — opus is required for that
    expect(content()).toMatch(/model:\s+opus/);
  });

  it('has allowed-tools field', () => {
    expect(content()).toMatch(/^allowed-tools:.+/m);
  });

  it('has compatibility field', () => {
    expect(content()).toMatch(/^compatibility:/m);
  });

  it('has metadata.version', () => {
    expect(content()).toMatch(/version:\s+"[\d.]+"/);
  });
});

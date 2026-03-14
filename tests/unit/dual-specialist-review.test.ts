/**
 * Unit Tests: Dual-Specialist Code Review for Deliverable Code Samples
 *
 * Issue #1: When a CAD deliverable contains fenced code blocks, mg-build must trigger
 * a dual-specialist review step — one domain specialist (platform correctness) and one
 * language specialist (code quality) — before code is included. Both must PASS.
 *
 * Tests target either:
 *   - src/framework/skills/mg-build/SKILL.md  (step 4 / spawn pattern update), OR
 *   - src/framework/shared/dual-specialist-review.md  (new shared protocol)
 *
 * Tests are ordered misuse-first per CAD TDD protocol:
 *   1. MISUSE   — things that must NOT appear (hardcoded stacks, implicit triggers, skip paths)
 *   2. BOUNDARY — edge cases (no code blocks = no dual review, any language combo works)
 *   3. GOLDEN   — happy path (dual specialists described, trigger defined, severity output)
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SRC_SKILLS  = path.resolve(__dirname, '../../src/framework/skills');
const SRC_SHARED  = path.resolve(__dirname, '../../src/framework/shared');

const MG_BUILD_SKILL       = path.join(SRC_SKILLS, 'mg-build', 'SKILL.md');
const DUAL_SPECIALIST_PROTOCOL = path.join(SRC_SHARED, 'dual-specialist-review.md');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return the content of whichever implementation file exists. */
function readImplementation(): string {
  if (fs.existsSync(DUAL_SPECIALIST_PROTOCOL)) {
    return fs.readFileSync(DUAL_SPECIALIST_PROTOCOL, 'utf-8');
  }
  if (fs.existsSync(MG_BUILD_SKILL)) {
    return fs.readFileSync(MG_BUILD_SKILL, 'utf-8');
  }
  return '';
}

/** True if at least one of the two acceptable implementation files exists. */
function implementationExists(): boolean {
  return fs.existsSync(DUAL_SPECIALIST_PROTOCOL) || fs.existsSync(MG_BUILD_SKILL);
}

// ============================================================================
// MISUSE CASES — tested first
// Things that must NOT appear in the implementation
// ============================================================================

describe('Misuse: dual-specialist review must not hardcode a specific tech stack', () => {
  it('at least one implementation file must exist before misuse checks can run', () => {
    // Root guard — every test in this block depends on the feature being described somewhere.
    // This confirms the feature exists in either mg-build SKILL.md or the shared protocol.
    expect(implementationExists()).toBe(true);
  });

  it('must not limit dual review to TypeScript only', () => {
    // Given: a deliverable contains Python code blocks
    // When: the CAD cycle processes it
    // Then: dual-specialist review must still trigger — "TypeScript only" is a hardcoded misuse
    const content = readImplementation();
    const hardcodedToTS = /dual.{0,40}(review|specialist).{0,80}typescript\s+only/i.test(content);
    expect(hardcodedToTS).toBe(false);
  });

  it('must not name a hardcoded domain specialist (e.g. "react-specialist" or "next-specialist")', () => {
    // Given: the skill is used on a Rails project
    // When: dual-specialist review triggers
    // Then: the domain specialist must be resolved at runtime, not pre-wired to a single framework.
    // "react-specialist" or "next-specialist" as a fixed agent name would break non-JS projects.
    const content = readImplementation();
    const hasHardcodedDomainAgent = /react-specialist|next-specialist|rails-specialist|django-specialist/i.test(content);
    expect(hasHardcodedDomainAgent).toBe(false);
  });

  it('must not describe skipping dual review based on file size or line count alone', () => {
    // Given: a short deliverable has a 3-line fenced code block
    // When: the CAD cycle evaluates whether to trigger review
    // Then: the presence of a code block — not the number of lines — is the trigger.
    // Skipping because "< N lines" is a misuse that lets small but wrong code through.
    const content = readImplementation();
    const skipsByLineCount = /skip.{0,60}(fewer|less than|under)\s+\d+\s+lines/i.test(content);
    expect(skipsByLineCount).toBe(false);
  });

  it('must not describe review as implicit or assumed — trigger must be explicit', () => {
    // Given: an agent reads the skill
    // When: it processes a deliverable
    // Then: the agent must be told explicitly what the trigger condition is.
    // "assume review happens" or "implicitly triggered" leaves agents free to skip it.
    const content = readImplementation();
    const usesImplicitTrigger = /implicitly triggered|assume.{0,30}review|review.{0,30}assumed/i.test(content);
    expect(usesImplicitTrigger).toBe(false);
  });

  it('must not allow code to be included before both specialists pass', () => {
    // Given: one specialist passes but the other has not yet reviewed
    // When: the build cycle evaluates whether to proceed
    // Then: code must be blocked until BOTH pass — partial approval is a misuse.
    // A pattern like "either specialist" or "at least one" would introduce this flaw.
    const content = readImplementation();
    const allowsPartialApproval = /either specialist|at least one specialist|one of the two/i.test(content);
    expect(allowsPartialApproval).toBe(false);
  });
});

describe('Misuse: dual-specialist review must not add more than one additional agent spawn', () => {
  it('must not describe spawning more than two specialist agents per review', () => {
    // The acceptance criteria cap overhead at 1 additional spawn (2 specialists share the budget).
    // Describing a third, fourth, or N specialist spawn would violate this constraint.
    // We check that the description doesn't call for spawning more than two agents
    // in the dual-specialist step (i.e., doesn't say "spawn three" or "multiple rounds").
    const content = readImplementation();
    const spawnsMoreThanTwo = /spawn.{0,40}(three|four|\d{2,})\s+(specialist|agent)/i.test(content);
    expect(spawnsMoreThanTwo).toBe(false);
  });
});

// ============================================================================
// BOUNDARY CASES — edge conditions
// ============================================================================

describe('Boundary: dual-specialist review must not trigger when deliverable has no code blocks', () => {
  it('trigger condition must be tied to detecting fenced code blocks specifically', () => {
    // Given: a deliverable is pure prose (no ``` fences)
    // When: the CAD cycle inspects it
    // Then: dual-specialist review must NOT run — prose-only deliverables skip this step.
    // The description must make detection of fenced code blocks the explicit gate condition,
    // not just "deliverable contains text" or "deliverable is markdown".
    const content = readImplementation();

    // Must mention fenced code blocks (``` or backtick fences) as the trigger
    expect(content).toMatch(/fenced code blocks?|```|code block/i);

    // Must describe the no-code-blocks path as a skip or bypass
    expect(content).toMatch(/no code blocks?|without code blocks?|if no.{0,30}code|skip.{0,30}no code|no.{0,30}fenced/i);
  });

  it('must describe the trigger as conditional, not always-on', () => {
    // If dual review runs on every deliverable unconditionally, it wastes spawns on prose docs.
    // The description must use conditional language (if, when, only if, triggers when, etc.)
    const content = readImplementation();
    expect(content).toMatch(/\b(if|when|only if|triggers? when|detects?)\b.{0,60}code block/i);
  });
});

describe('Boundary: dual-specialist review must work for any language/platform combo', () => {
  it('must describe the domain specialist role generically, not as a named agent', () => {
    // Given: a deliverable contains shell script
    // When: dual-specialist review triggers
    // Then: the domain specialist is determined by the platform context, not pre-assigned.
    // The description must use generic role language like "domain specialist" or
    // "platform-appropriate specialist", not a specific named agent.
    const content = readImplementation();
    expect(content).toMatch(/domain specialist|platform.{0,20}specialist|specialist.{0,20}domain/i);
  });

  it('must describe the language specialist role generically', () => {
    // The language specialist validates code quality regardless of language.
    // Must be described generically — not as "TypeScript reviewer" or "Python linter".
    const content = readImplementation();
    expect(content).toMatch(/language specialist|code quality.{0,30}specialist|specialist.{0,20}language/i);
  });

  it('step placement — dual review must occur after dev and before staff-engineer', () => {
    // Given: the CAD pipeline runs step 2 (dev) and step 4 (staff-engineer review)
    // When: dual-specialist review is inserted
    // Then: it must sit between dev completion and staff-engineer review.
    // This preserves the existing pipeline order: test → implement → [dual review] → staff-engineer.
    const content = readImplementation();

    // Must mention both dev/implementation and staff-engineer in proximity to the review step
    expect(content).toMatch(/dev|implementation/i);
    expect(content).toMatch(/staff-engineer/i);

    // Must indicate ordering: dual review comes after dev, before staff-engineer
    expect(content).toMatch(
      /after.{0,60}(dev|implement)|before.{0,60}staff.engineer|dev.{0,80}staff.engineer/i
    );
  });
});

describe('Boundary: severity output must distinguish blocking from non-blocking findings', () => {
  it('must describe at least two severity levels in review output', () => {
    // A review that only says "pass/fail" gives no triage guidance.
    // The output format must distinguish blocking issues from warnings so
    // a dev knows what must be fixed vs. what is advisory.
    const content = readImplementation();

    // Must mention blocking (or equivalent: error, critical, must-fix)
    expect(content).toMatch(/blocking|blocker|\bcritical\b|must.fix|error severity/i);

    // Must mention non-blocking (or equivalent: warning, advisory, suggestion)
    expect(content).toMatch(/warning|advisory|suggestion|non.blocking/i);
  });
});

// ============================================================================
// GOLDEN PATH — happy-path content assertions
// ============================================================================

describe('Golden: dual-specialist review feature is described somewhere in the framework', () => {
  it('dual-specialist-review.md exists OR mg-build SKILL.md contains dual-specialist review', () => {
    // The feature may live in either the shared protocol OR in mg-build.
    // Both are acceptable. At least one must exist and contain the feature description.
    const sharedProtocolExists = fs.existsSync(DUAL_SPECIALIST_PROTOCOL);
    const buildSkillMentionsDualReview = (() => {
      if (!fs.existsSync(MG_BUILD_SKILL)) return false;
      const content = fs.readFileSync(MG_BUILD_SKILL, 'utf-8');
      return /dual.specialist|dual specialist/i.test(content);
    })();

    expect(sharedProtocolExists || buildSkillMentionsDualReview).toBe(true);
  });
});

describe('Golden: mg-build SKILL.md references dual-specialist review in step 4', () => {
  it('mg-build SKILL.md must exist', () => {
    expect(fs.existsSync(MG_BUILD_SKILL)).toBe(true);
  });

  it('step 4 (code review) spawn pattern must mention dual-specialist review', () => {
    // Given: mg-build runs step 4
    // When: the deliverable contains code blocks
    // Then: the step 4 spawn pattern must describe triggering dual-specialist review.
    // A step 4 that only spawns staff-engineer is incomplete for this feature.
    const content = fs.readFileSync(MG_BUILD_SKILL, 'utf-8');
    expect(content).toMatch(/dual.specialist|dual specialist/i);
  });

  it('step 4 must describe detecting code blocks in deliverables as the trigger', () => {
    // The trigger must be explicit: presence of fenced code blocks in the deliverable output.
    // We require the words "code block" or "fenced code" in narrative prose (not just a yaml
    // example that happens to contain backticks), so we check for the phrase directly.
    const content = fs.readFileSync(MG_BUILD_SKILL, 'utf-8');
    expect(content).toMatch(/code blocks?|fenced code/i);
  });

  it('step 4 must name both a domain specialist and a language specialist', () => {
    // Both specialist roles must be described so an agent knows what to spawn.
    const content = fs.readFileSync(MG_BUILD_SKILL, 'utf-8');
    expect(content).toMatch(/domain specialist|platform.{0,20}specialist/i);
    expect(content).toMatch(/language specialist|code quality.{0,30}specialist/i);
  });

  it('step 4 must state that both specialists must pass before code is included', () => {
    // The gate condition must be explicit: both specialists pass, not just one.
    const content = fs.readFileSync(MG_BUILD_SKILL, 'utf-8');
    expect(content).toMatch(/both.{0,40}(pass|approve|must)/i);
  });

  it('review output must describe severity-ranked findings', () => {
    // Severity-ranked output is a required acceptance criterion.
    // The description must reference severity, ranking, or a blocking/warning distinction.
    const content = fs.readFileSync(MG_BUILD_SKILL, 'utf-8');
    expect(content).toMatch(/severity|blocking|warning/i);
  });
});

describe('Golden: dual-specialist review shared protocol (if present) is well-formed', () => {
  it('if dual-specialist-review.md exists, it has a markdown heading', () => {
    if (!fs.existsSync(DUAL_SPECIALIST_PROTOCOL)) return;
    const content = fs.readFileSync(DUAL_SPECIALIST_PROTOCOL, 'utf-8');
    expect(content).toMatch(/^#\s+/m);
  });

  it('if dual-specialist-review.md exists, it describes the trigger condition', () => {
    if (!fs.existsSync(DUAL_SPECIALIST_PROTOCOL)) return;
    const content = fs.readFileSync(DUAL_SPECIALIST_PROTOCOL, 'utf-8');
    expect(content).toMatch(/trigger|detect|fenced code|code block/i);
  });

  it('if dual-specialist-review.md exists, it describes both specialist roles', () => {
    if (!fs.existsSync(DUAL_SPECIALIST_PROTOCOL)) return;
    const content = fs.readFileSync(DUAL_SPECIALIST_PROTOCOL, 'utf-8');
    expect(content).toMatch(/domain specialist|platform.{0,20}specialist/i);
    expect(content).toMatch(/language specialist|code quality.{0,30}specialist/i);
  });

  it('if dual-specialist-review.md exists, it describes a pass gate requiring both specialists', () => {
    if (!fs.existsSync(DUAL_SPECIALIST_PROTOCOL)) return;
    const content = fs.readFileSync(DUAL_SPECIALIST_PROTOCOL, 'utf-8');
    expect(content).toMatch(/both.{0,40}(pass|approve|must)/i);
  });

  it('if dual-specialist-review.md exists, it describes severity-ranked output', () => {
    if (!fs.existsSync(DUAL_SPECIALIST_PROTOCOL)) return;
    const content = fs.readFileSync(DUAL_SPECIALIST_PROTOCOL, 'utf-8');
    expect(content).toMatch(/severity|blocking|warning/i);
  });

  it('if dual-specialist-review.md exists, it references mg-build or CAD cycle context', () => {
    // A standalone protocol that doesn't reference when it is invoked leaves agents without
    // the context needed to know when to apply it.
    if (!fs.existsSync(DUAL_SPECIALIST_PROTOCOL)) return;
    const content = fs.readFileSync(DUAL_SPECIALIST_PROTOCOL, 'utf-8');
    expect(content).toMatch(/mg-build|CAD cycle|step 4|code review step/i);
  });
});

/**
 * TDD Tests for WS-MG-FIX — issues #258 and #261
 *
 * Issue #258: /mg dispatches instead of directly invoking skills
 *   SKILL.md tells the model to suggest skills rather than invoke them.
 *   Fix: dispatch mode must instruct the model to call the Skill tool directly.
 *
 * Issue #261: /mg dispatches to wrong agent type for non-built-in agents
 *   Custom agents (beyond the built-in set) fail with "Agent type not found."
 *   Fix: SKILL.md must document the general-purpose + prompt-loading pattern.
 *
 * Tests ordered misuse → boundary → golden path per TDD workflow.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SKILL_PATH = path.resolve(
  __dirname,
  '../../src/framework/skills/mg/SKILL.md'
);

let _content: string | null = null;
function content(): string {
  if (_content === null) {
    _content = fs.readFileSync(SKILL_PATH, 'utf-8');
  }
  return _content;
}

// ─────────────────────────────────────────────────────────────
// ISSUE #258 — Direct invocation, not suggestion
// ─────────────────────────────────────────────────────────────

describe('Issue #258: dispatch mode — invoke directly', () => {
  // ── Misuse ──────────────────────────────────────────────────

  it('[misuse] Constitution must NOT say "suggest" as the routing action (old behavior)', () => {
    // The old rule 5 read "Suggest, don't assume" — this encouraged passive suggestion.
    // After the fix the constitution must describe direct invocation, not suggestion.
    // We check that rule-2 (Route, don't execute) has been updated to reflect invocation.
    const constitutionSection = content().match(
      /## Constitution([\s\S]*?)(?=\n---\n|\n## )/
    )?.[1] ?? '';

    // The updated rule must mention invoking/calling the Skill tool, not just suggesting
    expect(constitutionSection).toMatch(
      /invoke|call.*[Ss]kill\s+tool|[Ss]kill\s+tool.*call/i
    );
  });

  it('[misuse] Natural Language Fallback section must NOT only suggest — it must invoke', () => {
    // Old behavior: "Run `/mg-debug ...`?" — a suggestion.
    // New behavior: directly invoke via Skill tool.
    // The section must describe using the Skill tool, not just asking the user to run a command.
    const nlSection = content().match(
      /Natural Language Fallback([\s\S]*?)(?=\n---\n|\n## |\n### )/
    )?.[1] ?? '';

    expect(nlSection, 'Natural Language Fallback section must exist').toBeTruthy();
    // The fallback must reference the Skill tool or direct invocation
    expect(nlSection).toMatch(/[Ss]kill\s+tool|invoke|directly/i);
  });

  it('[misuse] Dispatch mode CANNOT section must still forbid executing work itself', () => {
    // Even with direct invocation via Skill tool, dispatch mode must not do the work itself.
    // The CANNOT field must still say it cannot execute workstreams or write code.
    const cannotMatch = content().match(
      /\*\*(?:Dispatch mode )?CANNOT:\*\*\s+([\s\S]*?)(?=\*\*[A-Z]|\n##\s+|$)/
    );
    expect(cannotMatch, 'CANNOT field must exist').toBeTruthy();
    if (cannotMatch) {
      expect(cannotMatch[1]).toMatch(/execute|write code|spawn/i);
    }
  });

  // ── Boundary ─────────────────────────────────────────────────

  it('[boundary] Constitution rule about routing must mention the Skill tool', () => {
    // "Route and invoke" is the new behavior — the Skill tool is the mechanism.
    // The constitution must name the Skill tool so the model knows how to invoke.
    const constitutionSection = content().match(
      /## Constitution([\s\S]*?)(?=\n---\n|\n## )/
    )?.[1] ?? '';

    expect(constitutionSection).toMatch(/[Ss]kill\s+tool/i);
  });

  it('[boundary] Natural Language Fallback example must show invocation, not just a prompt suggestion', () => {
    // A mere "Run /mg-debug ...?" is not direct invocation.
    // After the fix the fallback description must show how to call the Skill tool.
    const nlSection = content().match(
      /Natural Language Fallback([\s\S]*?)(?=\n---\n|\n## |\n### )/
    )?.[1] ?? '';

    // Must not revert to "Run `/mg-X ...`?" as the only action described
    expect(nlSection).not.toMatch(/^.*Run `\/mg-\w+.*`\?.*$/m);
  });

  // ── Golden path ───────────────────────────────────────────────

  it('[golden path] Constitution rule 2 describes direct invocation via Skill tool', () => {
    // Rule 2 was "Route, don't execute".
    // After the fix it must say something like "Route and invoke — call the Skill tool..."
    const constitutionSection = content().match(
      /## Constitution([\s\S]*?)(?=\n---\n|\n## )/
    )?.[1] ?? '';

    expect(constitutionSection).toMatch(/[Rr]oute and invoke|invoke.*[Ss]kill\s+tool/i);
  });

  it('[golden path] Dispatch mode CAN section mentions calling the Skill tool', () => {
    // The CAN boundary must now include "call the Skill tool" as a permitted action.
    const canMatch = content().match(
      /\*\*(?:Dispatch mode )?CAN:\*\*\s+([\s\S]*?)(?=\n\*\*[A-Z]|\n##\s+|$)/
    );
    expect(canMatch, 'CAN field must exist').toBeTruthy();
    if (canMatch) {
      expect(canMatch[1]).toMatch(/[Ss]kill\s+tool|invoke/i);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// ISSUE #261 — Custom agent type pattern
// ─────────────────────────────────────────────────────────────

describe('Issue #261: custom agent type — general-purpose + prompt-loading', () => {
  // ── Misuse ──────────────────────────────────────────────────

  it('[misuse] SKILL.md must NOT be silent about custom agents failing with "Agent type not found"', () => {
    // The old SKILL.md had no guidance on custom agents — users hit "Agent type not found."
    // The fix must document the correct pattern so the model does not guess wrong.
    expect(content()).toMatch(/general.purpose|custom\s+agent/i);
  });

  it('[misuse] SKILL.md must NOT suggest using a non-existent subagent_type for custom agents', () => {
    // Using `subagent_type: "my-custom-agent"` causes "Agent type not found."
    // The documentation must not encourage this anti-pattern.
    // Instead it must describe using subagent_type: "general-purpose".
    // We verify by checking the documented pattern uses "general-purpose".
    const customSection = content().match(
      /[Cc]ustom\s+[Aa]gent[^#]*([\s\S]*?)(?=\n##\s+|\n---\n|$)/
    )?.[0] ?? '';

    if (customSection) {
      // Must mention general-purpose
      expect(customSection).toMatch(/general.purpose/i);
      // Must NOT instruct to use an arbitrary custom subagent_type as the type itself
      expect(customSection).not.toMatch(/subagent_type:\s*["'](?!general-purpose)[a-z]+-[a-z]+-[a-z]+/i);
    }
  });

  // ── Boundary ─────────────────────────────────────────────────

  it('[boundary] Custom agent section must explain that only built-in types are valid subagent_type values', () => {
    // The key insight: subagent_type must be from the built-in set.
    // Custom identity is injected via the prompt, not via subagent_type.
    const customSection = content().match(
      /[Cc]ustom\s+[Aa]gent[^#]*([\s\S]*?)(?=\n##\s+|\n---\n|$)/
    )?.[0] ?? '';

    if (customSection) {
      expect(customSection).toMatch(/built.in|prompt.*identity|identity.*prompt|load.*AGENT\.md|AGENT\.md.*prompt/i);
    }
  });

  it('[boundary] Custom agent section must reference subagent_type: general-purpose explicitly', () => {
    // The exact string "general-purpose" must appear so the model copies it correctly.
    expect(content()).toMatch(/general-purpose/);
  });

  it('[boundary] Custom agent pattern must explain prompt-loading to inject agent identity', () => {
    // Prompt-loading = read the AGENT.md and include its content in the Task prompt.
    // This is the mechanism for custom agent identity without a built-in type.
    expect(content()).toMatch(/prompt.*load|load.*AGENT\.md|read.*AGENT\.md|AGENT\.md.*prompt/i);
  });

  // ── Golden path ───────────────────────────────────────────────

  it('[golden path] SKILL.md contains a Custom Agents section', () => {
    // A dedicated section makes the pattern discoverable.
    expect(content()).toMatch(/##\s+Custom Agents|###\s+Custom Agents|##\s+Spawning Custom Agents/i);
  });

  it('[golden path] Custom agents section shows subagent_type: "general-purpose"', () => {
    // The section must include the exact documented value.
    const sectionMatch = content().match(
      /(?:Custom Agents|Spawning Custom Agents)[^\n]*\n([\s\S]*?)(?=\n##\s+|\n---\n|$)/i
    );
    expect(sectionMatch, 'Custom Agents section must exist').toBeTruthy();
    if (sectionMatch) {
      expect(sectionMatch[1]).toMatch(/general-purpose/);
    }
  });

  it('[golden path] Custom agents section explains the two-step pattern: load AGENT.md + pass as prompt', () => {
    // Step 1: read the custom AGENT.md to get agent identity
    // Step 2: include that identity in the Task prompt alongside the task
    const sectionMatch = content().match(
      /(?:Custom Agents|Spawning Custom Agents)[^\n]*\n([\s\S]*?)(?=\n##\s+|\n---\n|$)/i
    );
    expect(sectionMatch, 'Custom Agents section must exist').toBeTruthy();
    if (sectionMatch) {
      const section = sectionMatch[1];
      expect(section).toMatch(/AGENT\.md/);
      expect(section).toMatch(/prompt/i);
    }
  });

  it('[golden path] Custom agents section clearly distinguishes it from built-in agent spawning', () => {
    // Users need to know this is a different pattern from `subagent_type: "dev"`.
    const sectionMatch = content().match(
      /(?:Custom Agents|Spawning Custom Agents)[^\n]*\n([\s\S]*?)(?=\n##\s+|\n---\n|$)/i
    );
    expect(sectionMatch, 'Custom Agents section must exist').toBeTruthy();
    if (sectionMatch) {
      const section = sectionMatch[1];
      // Must distinguish from the built-in pattern
      expect(section).toMatch(/built.in|not.*built.in|beyond.*built.in|outside.*built.in/i);
    }
  });
});

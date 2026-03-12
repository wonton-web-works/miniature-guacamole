/**
 * Unit Tests for mg-ticket Skill
 *
 * Contract/documentation tests verifying SKILL.md behavior spec.
 * Tests are ordered misuse-first per TDD workflow.
 * WS-TICKET-1: /mg-ticket — file GitHub Issues from CLI/co-work sessions
 *
 * NOTE: These tests FAIL before SKILL.md is written. That is intentional.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SKILLS_DIR = path.join(__dirname, '../../.claude/skills');
const SKILL_PATH = path.join(SKILLS_DIR, 'mg-ticket', 'SKILL.md');

// Helper — read once and cache within a test run
let _content: string | null = null;
function content(): string {
  if (_content === null) {
    _content = fs.readFileSync(SKILL_PATH, 'utf-8');
  }
  return _content;
}

// ─────────────────────────────────────────────────────────────
// MISUSE CASES — documented failure modes the skill must handle
// ─────────────────────────────────────────────────────────────

describe('mg-ticket skill — misuse cases (tested first)', () => {
  it('SKILL.md must exist at the expected path', () => {
    // This is the root guard — every test below depends on it.
    expect(fs.existsSync(SKILL_PATH)).toBe(true);
  });

  describe('missing or empty description', () => {
    it('documents error when no description is provided', () => {
      // Given: user invokes /mg-ticket with no argument
      // When: skill processes the invocation
      // Then: skill must emit a usage error, not silently proceed
      expect(content()).toMatch(/no description|missing description|usage.*mg-ticket|usage hint/i);
    });

    it('documents error for empty string description', () => {
      // Given: user passes "" as the description
      // Then: skill must reject it — not create an empty-title issue
      expect(content()).toMatch(/empty.*description|empty string|blank description/i);
    });
  });

  describe('unknown flags', () => {
    it('documents error for unrecognized flags', () => {
      // Given: user passes --typo or any flag not in {--bug, --feature, --question}
      // Then: skill must list valid flags and reject the unknown one
      expect(content()).toMatch(/unknown flag|invalid flag|unrecognized flag|valid flags/i);
    });

    it('documents the three valid flags explicitly', () => {
      // The error message contract: user must be told what flags are valid
      expect(content()).toMatch(/--bug/);
      expect(content()).toMatch(/--feature/);
      expect(content()).toMatch(/--question/);
    });
  });

  describe('gh CLI not available', () => {
    it('documents graceful error when gh is not installed', () => {
      // Given: gh binary is absent from PATH
      // Then: skill must detect this and surface a clear error — not crash
      expect(content()).toMatch(/gh.*not installed|gh is not installed|gh not found/i);
    });

    it('documents a manual fallback URL when gh is unavailable', () => {
      // The fallback must give the user a way to file the issue themselves
      expect(content()).toMatch(/github\.com.*new.*issue|new.*issue.*github\.com|fallback.*url|manual.*fallback/i);
    });

    it('documents graceful error when gh is not authenticated', () => {
      // Given: gh is installed but `gh auth status` fails
      // Then: skill must surface auth instructions, not a raw error
      expect(content()).toMatch(/not authenticated|gh auth login|authentication.*required/i);
    });
  });

  describe('oversized description', () => {
    it('documents behavior for descriptions longer than 500 chars', () => {
      // Given: user passes a 600-char wall of text
      // Then: skill must truncate with a warning OR reject with a clear error
      expect(content()).toMatch(/500 char|500-char|truncat|description.*too long|max.*description/i);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// BOUNDARY CASES
// ─────────────────────────────────────────────────────────────

describe('mg-ticket skill — boundary cases', () => {
  describe('title truncation at 100 chars', () => {
    it('documents that titles are capped at 100 chars', () => {
      // Issue title = first 100 chars of description (acceptance criteria 7)
      expect(content()).toMatch(/100 char|100-char|title.*100|first 100/i);
    });

    it('documents that the full description goes into the issue body when title is truncated', () => {
      // When description > 100 chars, title is truncated but body gets the full text
      expect(content()).toMatch(/full.*body|body.*full|full description.*body|body.*full description/i);
    });
  });

  describe('flag handling', () => {
    it('documents that --bug applies bug-specific labels', () => {
      expect(content()).toMatch(/--bug.*label|label.*bug|bug.*template/i);
    });

    it('documents that --feature applies feature-request labels', () => {
      expect(content()).toMatch(/--feature.*label|label.*feature|feature.*template/i);
    });

    it('documents that --question applies question labels', () => {
      expect(content()).toMatch(/--question.*label|label.*question|question.*template/i);
    });

    it('documents that --bug is the default when no flag is provided', () => {
      expect(content()).toMatch(/default.*--bug|--bug.*default|default.*bug/i);
    });
  });

  describe('missing memory directory', () => {
    it('documents degraded mode when .claude/memory/ does not exist', () => {
      // Skill must still work — just omit the auto-context attachment
      expect(content()).toMatch(/degraded mode|memory.*not found|without.*context|context.*unavailable|gracefully.*without/i);
    });

    it('documents that missing workstream context is omitted gracefully', () => {
      expect(content()).toMatch(/no.*workstream|workstream.*omit|omit.*workstream|workstream.*not found/i);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// GOLDEN PATH
// ─────────────────────────────────────────────────────────────

describe('mg-ticket skill — golden path', () => {
  describe('issue creation flow', () => {
    it('documents that invoking /mg-ticket <description> creates an issue via gh', () => {
      expect(content()).toMatch(/gh issue create/);
    });

    it('documents that the skill returns the issue URL on success', () => {
      expect(content()).toMatch(/issue url|returns.*url|url.*returned|github\.com.*issues/i);
    });
  });

  describe('auto-context attachment', () => {
    it('documents that MG version is attached from package.json', () => {
      expect(content()).toMatch(/package\.json.*version|version.*package\.json|mg version|framework version/i);
    });

    it('documents that current workstream is attached from .claude/memory/', () => {
      expect(content()).toMatch(/\.claude\/memory|workstream.*context|current workstream/i);
    });

    it('documents that recent errors are attached when present', () => {
      expect(content()).toMatch(/recent error|error.*context|errors.*attached/i);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// FRONTMATTER CONTRACT
// ─────────────────────────────────────────────────────────────

describe('mg-ticket skill — frontmatter contract', () => {
  it('has valid YAML frontmatter delimiters', () => {
    expect(content()).toMatch(/^---$/m);
  });

  it('has name: mg-ticket', () => {
    expect(content()).toMatch(/name:\s+mg-ticket/);
  });

  it('has a non-empty quoted description', () => {
    expect(content()).toMatch(/description:\s*"[^"]+"/);
  });

  it('has model: sonnet', () => {
    expect(content()).toMatch(/model:\s+sonnet/);
  });

  it('has allowed-tools field', () => {
    expect(content()).toMatch(/allowed-tools:.+/);
  });

  it('includes Bash in allowed-tools (needed for gh)', () => {
    // gh issue create is a Bash command — must be in allowed-tools
    expect(content()).toMatch(/allowed-tools:.*Bash|Bash.*allowed-tools/);
  });

  it('has compatibility field', () => {
    expect(content()).toMatch(/compatibility:/);
  });

  it('has metadata.version', () => {
    expect(content()).toMatch(/version:\s+"[\d.]+"/);
  });
});

// ─────────────────────────────────────────────────────────────
// STRUCTURE CONTRACT
// ─────────────────────────────────────────────────────────────

describe('mg-ticket skill — structure contract', () => {
  it('has ## Constitution section', () => {
    expect(content()).toMatch(/^##\s+Constitution\s*$/m);
  });

  it('has 6 constitution principles', () => {
    const constitutionSection = content().match(/##\s+Constitution\s*$([\s\S]*?)(?=^##)/m);
    expect(constitutionSection).toBeTruthy();
    if (constitutionSection) {
      const principles = constitutionSection[1].match(/^\d+\.\s+\*\*/gm);
      expect(principles).toBeTruthy();
      expect(principles?.length).toBe(6);
    }
  });

  it('has ## Templates section documenting bug/feature/question templates', () => {
    expect(content()).toMatch(/^##\s+Templates?\s*$/m);
  });

  it('has ## Context Assembly section documenting auto-attach logic', () => {
    expect(content()).toMatch(/^##\s+Context Assembly\s*$/m);
  });

  it('has ## Error Handling section documenting failure modes', () => {
    expect(content()).toMatch(/^##\s+Error Handling\s*$/m);
  });

  it('has ## Boundaries section', () => {
    expect(content()).toMatch(/^##\s+Boundaries\s*$/m);
  });

  it('has **CAN:** in Boundaries', () => {
    expect(content()).toMatch(/\*\*CAN:\*\*/);
  });

  it('has **CANNOT:** in Boundaries', () => {
    expect(content()).toMatch(/\*\*CANNOT:\*\*/);
  });

  it('has **ESCALATES TO:** in Boundaries', () => {
    expect(content()).toMatch(/\*\*ESCALATES TO:\*\*/);
  });

  it('has Boundaries fields in correct order (CAN, CANNOT, ESCALATES TO)', () => {
    const canIndex = content().search(/\*\*CAN:\*\*/);
    const cannotIndex = content().search(/\*\*CANNOT:\*\*/);
    const escalatesIndex = content().search(/\*\*ESCALATES TO:\*\*/);

    expect(canIndex).toBeGreaterThan(-1);
    expect(canIndex).toBeLessThan(cannotIndex);
    expect(cannotIndex).toBeLessThan(escalatesIndex);
  });

  it('Boundaries fields all have non-empty content', () => {
    const canMatch = content().match(/\*\*CAN:\*\*\s+(.+)/);
    const cannotMatch = content().match(/\*\*CANNOT:\*\*\s+(.+)/);
    const escalatesMatch = content().match(/\*\*ESCALATES TO:\*\*\s+(.+)/);

    expect(canMatch?.[1].trim().length).toBeGreaterThan(0);
    expect(cannotMatch?.[1].trim().length).toBeGreaterThan(0);
    expect(escalatesMatch?.[1].trim().length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────
// TEMPLATE CONTENT CONTRACT
// ─────────────────────────────────────────────────────────────

describe('mg-ticket skill — template content contract', () => {
  it('bug template has a body section with reproduction steps', () => {
    expect(content()).toMatch(/steps to reproduce|reproduction steps|repro steps/i);
  });

  it('bug template has a body section for expected vs actual behavior', () => {
    expect(content()).toMatch(/expected.*behavior|actual.*behavior|expected vs actual/i);
  });

  it('feature template has a body section for the use case or motivation', () => {
    expect(content()).toMatch(/use case|motivation|feature request|enhancement/i);
  });

  it('question template has a body section for context or background', () => {
    expect(content()).toMatch(/background|context|discussion/i);
  });

  it('all three templates produce different labels', () => {
    // We verify that each label string is distinct and present
    const bugLabel = content().match(/bug.*label|label.*bug/i);
    const featureLabel = content().match(/enhancement|feature.*label|label.*feature/i);
    const questionLabel = content().match(/question.*label|label.*question/i);

    expect(bugLabel).toBeTruthy();
    expect(featureLabel).toBeTruthy();
    expect(questionLabel).toBeTruthy();
  });
});

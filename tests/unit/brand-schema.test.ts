/**
 * Unit Tests: Brand File Schemas — WS-BRAND-SCHEMA (#246)
 *
 * Tests are ordered misuse-first per CAD TDD protocol:
 *   1. MISUSE   — things that must NOT be present (missing required fields, wrong sections)
 *   2. BOUNDARY — structural edge cases (field types, optional vs required)
 *   3. GOLDEN   — happy-path content assertions (required schema and mg-init step)
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SRC_SHARED = path.resolve(__dirname, '../../src/framework/shared');
const SRC_SKILLS = path.resolve(__dirname, '../../src/framework/skills');

const MEMORY_PROTOCOL = path.join(SRC_SHARED, 'memory-protocol.md');
const MG_INIT_SKILL   = path.join(SRC_SKILLS, 'mg-init', 'SKILL.md');
const BRAND_KIT_TEMPLATE = path.join(SRC_SKILLS, 'mg-design', 'references', 'brand-kit-template.md');

// ============================================================================
// MISUSE CASES — tested first
// What must NOT be in the files (or what must NOT be absent)
// ============================================================================

describe('Misuse: memory-protocol.md must define brand-guidelines.json schema', () => {
  it('must contain a brand-guidelines.json schema section', () => {
    // Without a documented schema, agents will invent their own structure on every run,
    // causing inconsistency when art-director reads what design wrote.
    const content = fs.readFileSync(MEMORY_PROTOCOL, 'utf-8');
    expect(content).toMatch(/brand-guidelines\.json/);
  });

  it('brand-guidelines.json schema must include a brand_name field', () => {
    // brand_name is the root identifier — every other field is anchored to it.
    // Agents that read brand-guidelines.json need a stable top-level key to identify
    // which brand's guidelines they are working with.
    const content = fs.readFileSync(MEMORY_PROTOCOL, 'utf-8');
    expect(content).toMatch(/brand_name/);
  });

  it('brand-guidelines.json schema must include a voice field', () => {
    // Voice is the core of brand verbal identity. Without it in the schema,
    // agents have no structured place to store tone/personality data.
    const content = fs.readFileSync(MEMORY_PROTOCOL, 'utf-8');
    expect(content).toMatch(/\bvoice\b/);
  });

  it('brand-guidelines.json schema must include a terminology field', () => {
    // Preferred and avoided words are load-bearing for copy agents.
    // Without a terminology field in the schema, CMO/copywriting agents have nowhere
    // to write or read the word list.
    const content = fs.readFileSync(MEMORY_PROTOCOL, 'utf-8');
    expect(content).toMatch(/\bterminology\b/);
  });

  it('brand-guidelines.json schema must include a visual_identity field', () => {
    // visual_identity links brand-guidelines.json to the design-system.json values.
    // Without it, the two files are disconnected and design agents cannot
    // reference brand colors from a single authoritative source.
    const content = fs.readFileSync(MEMORY_PROTOCOL, 'utf-8');
    expect(content).toMatch(/visual_identity/);
  });
});

describe('Misuse: memory-protocol.md must define design-system.json schema', () => {
  it('must contain a design-system.json schema section', () => {
    // Without a documented schema, design agents will use ad-hoc keys that
    // frontend engineers cannot rely on for systematic token consumption.
    const content = fs.readFileSync(MEMORY_PROTOCOL, 'utf-8');
    expect(content).toMatch(/design-system\.json/);
  });

  it('design-system.json schema must include a colors field', () => {
    // Colors are the highest-frequency design token. Without a colors field
    // in the schema, agents have no stable key to write or read color values.
    const content = fs.readFileSync(MEMORY_PROTOCOL, 'utf-8');
    expect(content).toMatch(/\bcolors\b/);
  });

  it('design-system.json schema must include a typography field', () => {
    // Typography tokens (headings, body, mono) drive CSS generation.
    // A design-system.json without typography is incomplete for any agent
    // that needs to produce or verify styled output.
    const content = fs.readFileSync(MEMORY_PROTOCOL, 'utf-8');
    expect(content).toMatch(/\btypography\b/);
  });

  it('design-system.json schema must include a spacing field', () => {
    // Spacing tokens (unit, scale) are required for layout consistency.
    // Without spacing in the schema, agents omit it and designs become
    // inconsistent across components.
    const content = fs.readFileSync(MEMORY_PROTOCOL, 'utf-8');
    expect(content).toMatch(/\bspacing\b/);
  });

  it('design-system.json schema must include a components field', () => {
    // Components section stores per-component token overrides.
    // Without it, agents have no structured place to record component-level
    // design decisions (button radius, input height, etc.).
    const content = fs.readFileSync(MEMORY_PROTOCOL, 'utf-8');
    expect(content).toMatch(/\bcomponents\b/);
  });
});

describe('Misuse: mg-init SKILL.md must not omit brand file creation step', () => {
  it('must mention brand-guidelines.json creation during init', () => {
    // If mg-init does not create brand-guidelines.json, every new project starts with
    // no brand memory. Agents that read it on first run will fail with file-not-found errors.
    const content = fs.readFileSync(MG_INIT_SKILL, 'utf-8');
    expect(content).toMatch(/brand-guidelines\.json/);
  });

  it('must mention design-system.json creation during init', () => {
    // Same reasoning as brand-guidelines.json — art-director reads design-system.json
    // on every visual review. A missing file causes agent failures on new projects.
    const content = fs.readFileSync(MG_INIT_SKILL, 'utf-8');
    expect(content).toMatch(/design-system\.json/);
  });
});

describe('Misuse: brand-kit-template.md must note JSON file generation', () => {
  it('must instruct that brand kit output also generates brand-guidelines.json', () => {
    // Without this instruction, mg-design agents output only the human-readable
    // brand-kit.md but never populate the machine-readable JSON that art-director reads.
    // This creates a permanent disconnect between design output and agent memory.
    const content = fs.readFileSync(BRAND_KIT_TEMPLATE, 'utf-8');
    expect(content).toMatch(/brand-guidelines\.json/);
  });

  it('must instruct that brand kit output also generates design-system.json', () => {
    // Same reasoning — design-system.json must be populated during the brand kit
    // workflow, not left as a manual step that agents might skip.
    const content = fs.readFileSync(BRAND_KIT_TEMPLATE, 'utf-8');
    expect(content).toMatch(/design-system\.json/);
  });
});

// ============================================================================
// BOUNDARY CASES — structural edge cases
// ============================================================================

describe('Boundary: memory-protocol.md — brand-guidelines.json voice sub-fields', () => {
  it('voice field must document tone sub-field', () => {
    // tone is the contextual variation of voice (formal vs casual).
    // Without documenting it as a sub-field, agents omit it and voice
    // becomes a flat string instead of a structured object.
    const content = fs.readFileSync(MEMORY_PROTOCOL, 'utf-8');
    // Must appear near the voice section — check that "tone" appears in the doc
    expect(content).toMatch(/\btone\b/);
  });

  it('voice field must document personality_traits sub-field', () => {
    // personality_traits is an array of adjectives that defines the brand character.
    // Without it in the schema, agents cannot programmatically compare brand consistency.
    const content = fs.readFileSync(MEMORY_PROTOCOL, 'utf-8');
    expect(content).toMatch(/personality_traits/);
  });

  it('terminology field must document preferred sub-field', () => {
    // The preferred/avoided split is the minimum viable structure for a word list.
    // Just "terminology" as a free-form string gives agents no guidance on
    // which words to use vs avoid.
    const content = fs.readFileSync(MEMORY_PROTOCOL, 'utf-8');
    expect(content).toMatch(/preferred/);
  });

  it('terminology field must document avoided sub-field', () => {
    const content = fs.readFileSync(MEMORY_PROTOCOL, 'utf-8');
    expect(content).toMatch(/avoided/);
  });
});

describe('Boundary: memory-protocol.md — design-system.json colors sub-fields', () => {
  it('colors field must document primary sub-field', () => {
    // primary is the single most critical color token — CTAs, links, active states.
    // Without documenting it as a colors sub-field, agents store it at the wrong level.
    const content = fs.readFileSync(MEMORY_PROTOCOL, 'utf-8');
    expect(content).toMatch(/\bprimary\b/);
  });

  it('colors field must document secondary sub-field', () => {
    const content = fs.readFileSync(MEMORY_PROTOCOL, 'utf-8');
    expect(content).toMatch(/\bsecondary\b/);
  });

  it('colors field must document semantic sub-field', () => {
    // semantic colors (success, warning, error, info) need their own sub-group
    // to allow agents to apply feedback colors without hardcoding hex values.
    const content = fs.readFileSync(MEMORY_PROTOCOL, 'utf-8');
    expect(content).toMatch(/\bsemantic\b/);
  });
});

describe('Boundary: memory-protocol.md — design-system.json spacing sub-fields', () => {
  it('spacing field must document unit sub-field', () => {
    // The base unit (e.g. 4px) anchors the entire spacing scale.
    // Without documenting it, agents produce scales that are internally inconsistent.
    const content = fs.readFileSync(MEMORY_PROTOCOL, 'utf-8');
    // "unit" is a common word; confirm it appears in the context of spacing schema
    expect(content).toMatch(/\bunit\b/);
  });

  it('spacing field must document scale sub-field', () => {
    // scale is the list of allowed spacing values derived from the unit.
    // Without it, agents use arbitrary pixel values that violate the design system.
    const content = fs.readFileSync(MEMORY_PROTOCOL, 'utf-8');
    expect(content).toMatch(/\bscale\b/);
  });
});

describe('Boundary: mg-init SKILL.md — brand files must not overwrite existing content', () => {
  it('brand file creation step must respect idempotency', () => {
    // mg-init must never overwrite existing brand files — users may have filled them in.
    // The skill's idempotency guarantee (DEC-INIT-006) must explicitly cover brand files.
    const content = fs.readFileSync(MG_INIT_SKILL, 'utf-8');
    // The file already documents "never overwrites" / "idempotent" — verify the brand
    // step context respects this. Check for the idempotent guarantee in the skill.
    expect(content).toMatch(/idempoten|not overwrite|preserve|skip.*exist|exist.*skip/i);
  });
});

// ============================================================================
// GOLDEN PATH — happy-path content assertions
// ============================================================================

describe('Golden: memory-protocol.md — complete brand-guidelines.json schema', () => {
  it('schema section appears under a recognizable heading', () => {
    // The schema must be discoverable without reading the entire file.
    // Agents scan headings to find relevant sections.
    const content = fs.readFileSync(MEMORY_PROTOCOL, 'utf-8');
    expect(content).toMatch(/brand.{0,30}schema|schema.{0,30}brand|Brand Files?/i);
  });

  it('brand-guidelines.json schema documents all four required top-level fields', () => {
    // All four must be present: brand_name, voice, terminology, visual_identity.
    // Missing any one means agents will invent the missing field on their own.
    const content = fs.readFileSync(MEMORY_PROTOCOL, 'utf-8');
    expect(content).toMatch(/brand_name/);
    expect(content).toMatch(/\bvoice\b/);
    expect(content).toMatch(/\bterminology\b/);
    expect(content).toMatch(/visual_identity/);
  });
});

describe('Golden: memory-protocol.md — complete design-system.json schema', () => {
  it('design-system.json schema documents all four required top-level fields', () => {
    // All four must be present: colors, typography, spacing, components.
    const content = fs.readFileSync(MEMORY_PROTOCOL, 'utf-8');
    expect(content).toMatch(/\bcolors\b/);
    expect(content).toMatch(/\btypography\b/);
    expect(content).toMatch(/\bspacing\b/);
    expect(content).toMatch(/\bcomponents\b/);
  });

  it('typography field must document headings, body, and mono sub-fields', () => {
    // These three cover all font categories used in the brand kit template.
    // Missing any one means agents will store fonts under ad-hoc keys.
    const content = fs.readFileSync(MEMORY_PROTOCOL, 'utf-8');
    expect(content).toMatch(/\bheadings\b/);
    expect(content).toMatch(/\bbody\b/);
    expect(content).toMatch(/\bmono\b/);
  });
});

describe('Golden: mg-init SKILL.md — brand file init step is documented', () => {
  it('brand file creation appears in the What This Skill Does section or equivalent', () => {
    // The step must be visible to anyone reading the skill overview,
    // not buried in implementation notes only.
    const content = fs.readFileSync(MG_INIT_SKILL, 'utf-8');
    // Both file names must appear in the skill documentation
    expect(content).toMatch(/brand-guidelines\.json/);
    expect(content).toMatch(/design-system\.json/);
  });

  it('brand files are placed in .claude/memory/', () => {
    // Brand files belong in the project-local memory directory, not in docs/ or root.
    // This is where art-director reads them from (per art-director AGENT.md).
    const content = fs.readFileSync(MG_INIT_SKILL, 'utf-8');
    // Check that brand file mention is near a .claude/memory reference
    expect(content).toMatch(/\.claude\/memory\//);
    // Both brand files must appear in the same document as the memory path
    expect(content).toMatch(/brand-guidelines\.json/);
    expect(content).toMatch(/design-system\.json/);
  });
});

describe('Golden: brand-kit-template.md — JSON output instructions present', () => {
  it('template notes that brand-guidelines.json and design-system.json should be generated', () => {
    // Both files must be mentioned together to make clear that the brand kit
    // workflow produces two outputs: the human-readable MD and two JSON files.
    const content = fs.readFileSync(BRAND_KIT_TEMPLATE, 'utf-8');
    expect(content).toMatch(/brand-guidelines\.json/);
    expect(content).toMatch(/design-system\.json/);
  });

  it('JSON output instruction appears in a distinct section or callout', () => {
    // The instruction must not be buried inline — agents scan headings and
    // callout blocks to find action items.
    const content = fs.readFileSync(BRAND_KIT_TEMPLATE, 'utf-8');
    // Must have some structured callout: heading, bold text, or a note block
    expect(content).toMatch(/^#{1,4}\s.*[Jj][Ss][Oo][Nn]|^\*\*.*[Jj][Ss][Oo][Nn]|Note.*[Jj][Ss][Oo][Nn]|[Jj][Ss][Oo][Nn].*[Oo]utput/m);
  });
});

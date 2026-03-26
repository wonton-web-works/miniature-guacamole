/**
 * GH-265: VERSION.json version sync fix
 *
 * Validates that src/installer/VERSION.json reflects the current release (6.1.3)
 * and that docs/contributing.md contains a release checklist with a step to
 * bump VERSION.json.
 *
 * Test order: misuse (stale/wrong values must NOT appear)
 *           → boundary (required fields must ALL be present)
 *           → golden path (correct values must appear)
 *
 * These tests FAIL against the current codebase and PASS after the fix.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '../..');
const VERSION_PATH = path.join(ROOT, 'src/installer/VERSION.json');
const CONTRIBUTING_PATH = path.join(ROOT, 'docs/contributing.md');

function readVersion(): Record<string, string> {
  return JSON.parse(readFileSync(VERSION_PATH, 'utf-8'));
}

function readContributing(): string {
  return readFileSync(CONTRIBUTING_PATH, 'utf-8');
}

// ─────────────────────────────────────────────────────────────────────────────
// Misuse cases — stale or prohibited values must NOT appear
// ─────────────────────────────────────────────────────────────────────────────

describe('VERSION.json — misuse cases (stale values must not appear)', () => {
  it('version is not the stale "1.0.0" value', () => {
    // AC-1: version must be 6.1.2; 1.0.0 is the pre-fix stale value
    const { version } = readVersion();
    expect(version).not.toBe('1.0.0');
  });

  it('released_at is not the stale "2026-02-09T00:00:00Z" timestamp', () => {
    // AC-2: released_at must be updated beyond the 1.0.0 release date
    const { released_at } = readVersion();
    expect(released_at).not.toBe('2026-02-09T00:00:00Z');
  });

  it('description does not contain the retired phrase "Product Development Team"', () => {
    // AC-3: "Product Development Team" is retired language; must not appear
    const { description } = readVersion();
    expect(description).not.toMatch(/Product Development Team/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Boundary cases — required fields must all be present and non-empty
// ─────────────────────────────────────────────────────────────────────────────

describe('VERSION.json — boundary cases (all required fields must be present)', () => {
  it('has a "name" field', () => {
    // AC-4: name is a required field
    const data = readVersion();
    expect(data).toHaveProperty('name');
    expect(typeof data.name).toBe('string');
    expect(data.name.trim()).not.toBe('');
  });

  it('has a "version" field', () => {
    // AC-4: version is a required field
    const data = readVersion();
    expect(data).toHaveProperty('version');
    expect(typeof data.version).toBe('string');
    expect(data.version.trim()).not.toBe('');
  });

  it('has a "channel" field', () => {
    // AC-4: channel is a required field
    const data = readVersion();
    expect(data).toHaveProperty('channel');
    expect(typeof data.channel).toBe('string');
    expect(data.channel.trim()).not.toBe('');
  });

  it('has a "released_at" field', () => {
    // AC-4: released_at is a required field
    const data = readVersion();
    expect(data).toHaveProperty('released_at');
    expect(typeof data.released_at).toBe('string');
    expect(data.released_at.trim()).not.toBe('');
  });

  it('has a "description" field', () => {
    // AC-4: description is a required field
    const data = readVersion();
    expect(data).toHaveProperty('description');
    expect(typeof data.description).toBe('string');
    expect(data.description.trim()).not.toBe('');
  });

  it('released_at is a valid ISO 8601 timestamp', () => {
    // Boundary: the timestamp must be parseable as a valid date
    const { released_at } = readVersion();
    const parsed = new Date(released_at);
    expect(isNaN(parsed.getTime())).toBe(false);
  });

  it('version matches semver format major.minor.patch', () => {
    // Boundary: version must conform to semver so tooling can parse it
    const { version } = readVersion();
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Golden path — correct values must appear
// ─────────────────────────────────────────────────────────────────────────────

describe('VERSION.json — golden path (correct values must appear)', () => {
  it('version is "6.1.3"', () => {
    // AC-1: must match the current release tag exactly
    const { version } = readVersion();
    expect(version).toBe('6.1.3');
  });

  it('released_at is more recent than the stale 1.0.0 date', () => {
    // AC-2: the updated timestamp must be after 2026-02-09
    const { released_at } = readVersion();
    const updated = new Date(released_at);
    const staleDate = new Date('2026-02-09T00:00:00Z');
    expect(updated.getTime()).toBeGreaterThan(staleDate.getTime());
  });

  it('name is "miniature-guacamole"', () => {
    // Golden path: name must not have changed
    const { name } = readVersion();
    expect(name).toBe('miniature-guacamole');
  });

  it('channel is "stable"', () => {
    // Golden path: channel must remain "stable" for release builds
    const { channel } = readVersion();
    expect(channel).toBe('stable');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// docs/contributing.md — misuse cases
// ─────────────────────────────────────────────────────────────────────────────

describe('docs/contributing.md — misuse cases (release checklist must not be absent)', () => {
  it('is not missing a release checklist section entirely', () => {
    // AC-5: the absence of any release checklist is the defect being fixed;
    // this test confirms the section cannot be confused with the PR checklist
    // in the "Pull Request Process" section.
    const content = readContributing();
    // The PR checklist exists but a dedicated release checklist does not.
    // After the fix a "Release Checklist" (or "Releasing") heading must exist.
    const hasReleaseSection = /##\s+(Release Checklist|Releasing|Release Process)/i.test(content);
    expect(hasReleaseSection).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// docs/contributing.md — golden path
// ─────────────────────────────────────────────────────────────────────────────

describe('docs/contributing.md — golden path (release checklist content)', () => {
  it('release checklist includes a step that mentions bumping VERSION.json', () => {
    // AC-5: contributors must be reminded to sync VERSION.json on every release
    const content = readContributing();
    // Match any checklist item ( "- [ ]" or "- " bullet) that references VERSION.json
    expect(content).toMatch(/VERSION\.json/);
  });

  it('release checklist VERSION.json step appears inside a checklist item', () => {
    // AC-5 (tighter): the reference must be in an actionable checklist line,
    // not merely a prose mention
    const content = readContributing();
    // A checklist line begins with "- [ ]" or "- " followed by text containing VERSION.json
    expect(content).toMatch(/^[\s]*-\s+(\[ \]\s+)?.*VERSION\.json/m);
  });
});

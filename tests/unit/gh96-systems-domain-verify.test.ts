/**
 * Verification Tests for GH-96: systems.md Domain Reference
 *
 * Confirms systems.md covers all 5 areas from the ticket:
 *   1. Process isolation
 *   2. File permissions
 *   3. Daemon hardening
 *   4. Privilege escalation prevention
 *   5. System hardening
 *
 * Also validates the domain-ref pattern (review areas + threat model + checklist)
 * and staff-engineer-level completeness.
 *
 * Misuse-first ordering:
 * 1. File missing or empty
 * 2. Pattern mismatch — missing required sections
 * 3. Coverage gaps — required areas absent
 * 4. Shallow content — areas present but lack depth
 * 5. Happy path — all 5 areas covered with depth
 *
 * @see GH-96: domain-ref-systems verification
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const DOMAINS_DIR = path.join(
  __dirname,
  '../../.claude/agents/security-engineer/domains'
);
const SYSTEMS_MD = path.join(DOMAINS_DIR, 'systems.md');

let content: string;
let reviewAreasSection: string;
let threatModelSection: string;
let checklistSection: string;

beforeAll(() => {
  content = fs.readFileSync(SYSTEMS_MD, 'utf-8');

  const reviewMatch = content.match(
    /^## Review Areas\s*\n([\s\S]*?)(?=\n## )/m
  );
  reviewAreasSection = reviewMatch ? reviewMatch[1] : '';

  const threatMatch = content.match(
    /^## Threat Model\s*\n([\s\S]*?)(?=\n## )/m
  );
  threatModelSection = threatMatch ? threatMatch[1] : '';

  const checklistMatch = content.match(
    /^## Checklist\s*\n([\s\S]*)$/m
  );
  checklistSection = checklistMatch ? checklistMatch[1] : '';
});

// ============================================================================
// SECTION 1: File existence and non-empty (misuse: missing/empty file)
// ============================================================================

describe('GH-96: systems.md — File Existence', () => {
  it('should exist at the expected path', () => {
    expect(fs.existsSync(SYSTEMS_MD)).toBe(true);
  });

  it('should have substantial content (>1000 chars)', () => {
    expect(content.length).toBeGreaterThan(1000);
  });

  it('should not be a placeholder', () => {
    const lower = content.toLowerCase();
    expect(lower).not.toContain('todo');
    expect(lower).not.toContain('placeholder');
    expect(lower).not.toContain('coming soon');
  });
});

// ============================================================================
// SECTION 2: Domain-ref pattern compliance (misuse: pattern mismatch)
// ============================================================================

describe('GH-96: systems.md — Domain-Ref Pattern', () => {
  it('should have an H1 title matching "Systems Security"', () => {
    expect(content).toMatch(/^# Systems? Security/m);
  });

  it('should have a "## Review Areas" section', () => {
    expect(content).toMatch(/^## Review Areas/m);
  });

  it('should have a "## Threat Model" section', () => {
    expect(content).toMatch(/^## Threat Model/m);
  });

  it('should have a "## Checklist" section', () => {
    expect(content).toMatch(/^## Checklist/m);
  });

  it('should have exactly 3 H2 sections (Review Areas, Threat Model, Checklist)', () => {
    const h2Headings = content.match(/^## .+/gm);
    expect(h2Headings).toBeTruthy();
    expect(h2Headings!.length).toBe(3);
  });

  it('sections should appear in canonical order: Review Areas → Threat Model → Checklist', () => {
    const reviewIdx = content.indexOf('## Review Areas');
    const threatIdx = content.indexOf('## Threat Model');
    const checklistIdx = content.indexOf('## Checklist');
    expect(reviewIdx).toBeLessThan(threatIdx);
    expect(threatIdx).toBeLessThan(checklistIdx);
  });
});

// ============================================================================
// SECTION 3: All 5 required areas present in Review Areas (misuse: coverage gaps)
// ============================================================================

describe('GH-96: systems.md — Required Area Coverage', () => {
  it('Area 1: should cover process isolation', () => {
    expect(reviewAreasSection).toMatch(/process isolation/i);
  });

  it('Area 2: should cover file permissions', () => {
    expect(reviewAreasSection).toMatch(/file.*permission|file system/i);
  });

  it('Area 3: should cover daemon hardening', () => {
    expect(reviewAreasSection).toMatch(/daemon.*security|daemon.*harden|service.*security/i);
  });

  it('Area 4: should cover privilege escalation prevention', () => {
    expect(reviewAreasSection).toMatch(/privilege escalation/i);
  });

  it('Area 5: should cover system hardening', () => {
    expect(reviewAreasSection).toMatch(/system hardening/i);
  });

  it('should have exactly 5 review areas (numbered list items)', () => {
    const numberedItems = reviewAreasSection.match(/^\d+\.\s+/gm);
    expect(numberedItems).toBeTruthy();
    expect(numberedItems!.length).toBe(5);
  });
});

// ============================================================================
// SECTION 4: Review area depth (misuse: shallow stubs)
// ============================================================================

describe('GH-96: systems.md — Review Area Depth', () => {
  it('process isolation area should mention sandboxing mechanisms', () => {
    expect(reviewAreasSection).toMatch(/seccomp|AppArmor|sandbox/i);
  });

  it('process isolation area should mention subprocess security', () => {
    expect(reviewAreasSection).toMatch(/subprocess|shell injection/i);
  });

  it('file permissions area should mention specific permission modes', () => {
    expect(reviewAreasSection).toMatch(/600|700|world.readable/);
  });

  it('file permissions area should mention path traversal', () => {
    expect(reviewAreasSection).toMatch(/path traversal/i);
  });

  it('file permissions area should mention TOCTOU', () => {
    expect(reviewAreasSection).toMatch(/TOCTOU|race condition/i);
  });

  it('daemon hardening area should mention privilege dropping', () => {
    expect(reviewAreasSection).toMatch(/drop privileges|privilege.*port/i);
  });

  it('daemon hardening area should mention init systems', () => {
    expect(reviewAreasSection).toMatch(/launchd|systemd/i);
  });

  it('privilege escalation area should mention SUID/SGID', () => {
    expect(reviewAreasSection).toMatch(/SUID|SGID/i);
  });

  it('privilege escalation area should mention sudo', () => {
    expect(reviewAreasSection).toMatch(/sudo/i);
  });

  it('system hardening area should mention unnecessary services', () => {
    expect(reviewAreasSection).toMatch(/unnecessary services/i);
  });

  it('system hardening area should mention kernel parameters', () => {
    expect(reviewAreasSection).toMatch(/kernel|sysctl/i);
  });
});

// ============================================================================
// SECTION 5: Threat model covers all 5 area risks
// ============================================================================

describe('GH-96: systems.md — Threat Model Coverage', () => {
  it('should have at least 5 threat entries', () => {
    const entries = threatModelSection.match(/^\d+\.\s+/gm);
    expect(entries).toBeTruthy();
    expect(entries!.length).toBeGreaterThanOrEqual(5);
  });

  it('should model privilege escalation threats', () => {
    expect(threatModelSection).toMatch(/privilege escalation/i);
  });

  it('should model subprocess/command injection threats', () => {
    expect(threatModelSection).toMatch(/subprocess injection|command injection/i);
  });

  it('should model file system race condition threats', () => {
    expect(threatModelSection).toMatch(/file system race|TOCTOU/i);
  });

  it('should model daemon compromise threats', () => {
    expect(threatModelSection).toMatch(/daemon compromise/i);
  });

  it('should model information disclosure threats', () => {
    expect(threatModelSection).toMatch(/information disclosure|sensitive data/i);
  });

  it('each threat should include a mitigation', () => {
    const threats = threatModelSection
      .split(/\n(?=\d+\.\s)/)
      .filter((t) => t.trim());
    for (const threat of threats) {
      expect(threat.toLowerCase()).toMatch(/mitigat/);
    }
  });
});

// ============================================================================
// SECTION 6: Checklist actionability and coverage
// ============================================================================

describe('GH-96: systems.md — Checklist', () => {
  it('should have at least 10 checklist items', () => {
    const items = checklistSection.match(/^- \[ \]/gm);
    expect(items).toBeTruthy();
    expect(items!.length).toBeGreaterThanOrEqual(10);
  });

  it('should use markdown checkbox format', () => {
    const lines = checklistSection.split('\n').filter((l) => l.trim());
    for (const line of lines) {
      expect(line).toMatch(/^- \[ \] /);
    }
  });

  it('checklist should cover non-root execution', () => {
    expect(checklistSection).toMatch(/non-root|dedicated.*user/i);
  });

  it('checklist should cover subprocess safety', () => {
    expect(checklistSection).toMatch(/exec.*style|shell interpolation/i);
  });

  it('checklist should cover file permissions', () => {
    expect(checklistSection).toMatch(/chmod|600|640/);
  });

  it('checklist should cover temporary file safety', () => {
    expect(checklistSection).toMatch(/mkstemp|mkdtemp|temporary/i);
  });

  it('checklist should cover init system hardening', () => {
    expect(checklistSection).toMatch(/launchd|systemd|NoNewPrivileges/i);
  });

  it('checklist should cover SUID/SGID audit', () => {
    expect(checklistSection).toMatch(/SUID|SGID/i);
  });

  it('checklist should cover environment variable sanitization', () => {
    expect(checklistSection).toMatch(/environment.*sanitiz/i);
  });

  it('checklist should cover PID/lock file handling', () => {
    expect(checklistSection).toMatch(/PID.*file|lock.*file/i);
  });

  it('checklist should cover core dump restrictions', () => {
    expect(checklistSection).toMatch(/core dump/i);
  });

  it('checklist should cover signal handler safety', () => {
    expect(checklistSection).toMatch(/signal.*handler/i);
  });
});

// ============================================================================
// SECTION 7: Cross-reference — other domains are NOT confused with systems
// ============================================================================

describe('GH-96: systems.md — Domain Isolation', () => {
  it('should not contain web-specific terms as review items', () => {
    const lines = content.split('\n');
    const webTermLines = lines.filter((l) =>
      /CSRF|XSS|cookie|session.fixation|CORS/i.test(l)
    );
    expect(webTermLines.length).toBe(0);
  });

  it('should not reference cloud-specific services', () => {
    const lines = content.split('\n');
    const cloudLines = lines.filter((l) =>
      /S3 bucket|EC2|Lambda|IAM polic/i.test(l)
    );
    expect(cloudLines.length).toBe(0);
  });
});

// ============================================================================
// SECTION 8: Pattern parity with sibling domains
// ============================================================================

describe('GH-96: systems.md — Pattern Parity with Siblings', () => {
  it('should follow the same structure as web.md', () => {
    const webContent = fs.readFileSync(
      path.join(DOMAINS_DIR, 'web.md'),
      'utf-8'
    );
    // Both should have the same H2 section names
    const webH2 = webContent.match(/^## .+/gm)!.map((h) => h.replace(/^## /, ''));
    const sysH2 = content.match(/^## .+/gm)!.map((h) => h.replace(/^## /, ''));

    // Core sections must match
    expect(sysH2).toContain('Review Areas');
    expect(sysH2).toContain('Threat Model');
    expect(sysH2).toContain('Checklist');
    expect(webH2).toContain('Review Areas');
    expect(webH2).toContain('Threat Model');
    expect(webH2).toContain('Checklist');
  });

  it('should follow the same structure as cloud.md', () => {
    const cloudContent = fs.readFileSync(
      path.join(DOMAINS_DIR, 'cloud.md'),
      'utf-8'
    );
    const cloudH2 = cloudContent.match(/^## .+/gm)!.map((h) => h.replace(/^## /, ''));
    const sysH2 = content.match(/^## .+/gm)!.map((h) => h.replace(/^## /, ''));

    expect(cloudH2).toContain('Review Areas');
    expect(cloudH2).toContain('Threat Model');
    expect(cloudH2).toContain('Checklist');
    expect(sysH2).toContain('Review Areas');
    expect(sysH2).toContain('Threat Model');
    expect(sysH2).toContain('Checklist');
  });
});

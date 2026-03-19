/**
 * Unit Tests for Security Engineer Domain Reference Files (GH-15)
 *
 * Tests the domain-specific reference files for the security-engineer agent.
 * Validates file existence, structure, required sections, and content quality.
 * Written BEFORE implementation (TDD - Red phase).
 *
 * Misuse-first ordering:
 * 1. Missing files — domain files don't exist
 * 2. Empty/malformed files — files exist but have no useful content
 * 3. Missing required sections — files lack checklists, threat models, or review areas
 * 4. Insufficient depth — sections exist but are shallow stubs
 * 5. Happy path — all domains present with full content
 *
 * @see GH-15: Agent skill expansions — SME agents per security domain
 * @target 99% coverage for security domain reference files
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const AGENT_DIR = path.join(
  __dirname,
  '../../.claude/agents/security-engineer'
);
const DOMAINS_DIR = path.join(AGENT_DIR, 'domains');
const AGENT_MD = path.join(AGENT_DIR, 'agent.md');

const DOMAIN_NAMES = ['web', 'systems', 'cloud', 'crypto'] as const;

// ============================================================================
// TEST SECTION 1: File Existence (Misuse: missing files)
// ============================================================================

describe('GH-15: Security Domain Reference Files — File Existence', () => {
  it('should have a domains/ directory under security-engineer', () => {
    expect(fs.existsSync(DOMAINS_DIR)).toBe(true);
    const stat = fs.statSync(DOMAINS_DIR);
    expect(stat.isDirectory()).toBe(true);
  });

  for (const domain of DOMAIN_NAMES) {
    it(`should have ${domain}.md domain reference file`, () => {
      const filePath = path.join(DOMAINS_DIR, `${domain}.md`);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  }
});

// ============================================================================
// TEST SECTION 2: Non-empty Content (Misuse: empty/stub files)
// ============================================================================

describe('GH-15: Security Domain Reference Files — Content Not Empty', () => {
  for (const domain of DOMAIN_NAMES) {
    it(`${domain}.md should have substantial content (>500 chars)`, () => {
      const filePath = path.join(DOMAINS_DIR, `${domain}.md`);
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content.trim().length).toBeGreaterThan(500);
    });

    it(`${domain}.md should not be a placeholder stub`, () => {
      const filePath = path.join(DOMAINS_DIR, `${domain}.md`);
      const content = fs.readFileSync(filePath, 'utf-8').toLowerCase();
      expect(content).not.toContain('todo');
      expect(content).not.toContain('placeholder');
      expect(content).not.toContain('coming soon');
      expect(content).not.toContain('tbd');
    });
  }
});

// ============================================================================
// TEST SECTION 3: Required Sections (Misuse: missing structure)
// ============================================================================

describe('GH-15: Security Domain Reference Files — Required Sections', () => {
  const REQUIRED_SECTIONS = [
    { heading: 'Checklist', description: 'actionable review checklist' },
    { heading: 'Threat Model', description: 'domain-specific threat model' },
    { heading: 'Review Areas', description: 'key areas to review' },
  ];

  for (const domain of DOMAIN_NAMES) {
    describe(`${domain}.md required sections`, () => {
      for (const section of REQUIRED_SECTIONS) {
        it(`should contain a "${section.heading}" section (${section.description})`, () => {
          const filePath = path.join(DOMAINS_DIR, `${domain}.md`);
          const content = fs.readFileSync(filePath, 'utf-8');
          // Match ## Checklist or ## Security Checklist etc.
          const pattern = new RegExp(
            `^##\\s+.*${section.heading}`,
            'im'
          );
          expect(content).toMatch(pattern);
        });
      }
    });
  }
});

// ============================================================================
// TEST SECTION 4: Section Depth (Misuse: shallow/empty sections)
// ============================================================================

describe('GH-15: Security Domain Reference Files — Section Depth', () => {
  for (const domain of DOMAIN_NAMES) {
    it(`${domain}.md checklist should have at least 5 items`, () => {
      const filePath = path.join(DOMAINS_DIR, `${domain}.md`);
      const content = fs.readFileSync(filePath, 'utf-8');
      // Find checklist section and count list items (- [ ] or - lines)
      const checklistMatch = content.match(
        /##\s+.*Checklist\s*\n([\s\S]*?)(?=\n##|\n$|$)/i
      );
      expect(checklistMatch).toBeTruthy();
      if (checklistMatch) {
        const items = checklistMatch[1].match(/^[\s]*[-*]\s+/gm);
        expect(items).toBeTruthy();
        expect(items!.length).toBeGreaterThanOrEqual(5);
      }
    });

    it(`${domain}.md threat model should describe at least 3 threats`, () => {
      const filePath = path.join(DOMAINS_DIR, `${domain}.md`);
      const content = fs.readFileSync(filePath, 'utf-8');
      const threatMatch = content.match(
        /##\s+.*Threat Model\s*\n([\s\S]*?)(?=\n##|\n$|$)/i
      );
      expect(threatMatch).toBeTruthy();
      if (threatMatch) {
        // Count threat entries (list items or numbered items or sub-headings)
        const items = threatMatch[1].match(/^[\s]*[-*\d]+[.)]\s+|^###\s+/gm);
        expect(items).toBeTruthy();
        expect(items!.length).toBeGreaterThanOrEqual(3);
      }
    });

    it(`${domain}.md review areas should have at least 3 areas`, () => {
      const filePath = path.join(DOMAINS_DIR, `${domain}.md`);
      const content = fs.readFileSync(filePath, 'utf-8');
      const reviewMatch = content.match(
        /##\s+.*Review Areas\s*\n([\s\S]*?)(?=\n##|\n$|$)/i
      );
      expect(reviewMatch).toBeTruthy();
      if (reviewMatch) {
        const items = reviewMatch[1].match(/^[\s]*[-*\d]+[.)]\s+|^###\s+/gm);
        expect(items).toBeTruthy();
        expect(items!.length).toBeGreaterThanOrEqual(3);
      }
    });
  }
});

// ============================================================================
// TEST SECTION 5: Domain-Specific Content Validation
// ============================================================================

describe('GH-15: Security Domain Reference Files — Domain-Specific Content', () => {
  it('web.md should cover OWASP and web-specific concerns', () => {
    const content = fs.readFileSync(
      path.join(DOMAINS_DIR, 'web.md'),
      'utf-8'
    );
    expect(content).toMatch(/OWASP/i);
    expect(content).toMatch(/XSS|cross.site.scripting/i);
    expect(content).toMatch(/SQL injection|SQLi/i);
    expect(content).toMatch(/CSRF|cross.site.request.forgery/i);
    expect(content).toMatch(/authentication|auth[nz]/i);
  });

  it('systems.md should cover OS hardening and process isolation', () => {
    const content = fs.readFileSync(
      path.join(DOMAINS_DIR, 'systems.md'),
      'utf-8'
    );
    expect(content).toMatch(/process isolation|sandboxing/i);
    expect(content).toMatch(/file permissions|file.system/i);
    expect(content).toMatch(/daemon|service/i);
    expect(content).toMatch(/privilege escalation|least privilege/i);
  });

  it('cloud.md should cover IAM, secrets management, and network policy', () => {
    const content = fs.readFileSync(
      path.join(DOMAINS_DIR, 'cloud.md'),
      'utf-8'
    );
    expect(content).toMatch(/IAM|identity.and.access/i);
    expect(content).toMatch(/secrets? management/i);
    expect(content).toMatch(/network polic|VPC|firewall/i);
    expect(content).toMatch(/supply chain|dependency|container/i);
  });

  it('crypto.md should cover key management and algorithm selection', () => {
    const content = fs.readFileSync(
      path.join(DOMAINS_DIR, 'crypto.md'),
      'utf-8'
    );
    expect(content).toMatch(/key management|key rotation/i);
    expect(content).toMatch(/TLS|transport layer/i);
    expect(content).toMatch(/algorithm|cipher/i);
    expect(content).toMatch(/hash|digest/i);
  });
});

// ============================================================================
// TEST SECTION 6: Title and Header Structure
// ============================================================================

describe('GH-15: Security Domain Reference Files — Title Structure', () => {
  const EXPECTED_TITLES: Record<string, RegExp> = {
    web: /^#\s+.*[Ww]eb\s+[Ss]ecurity/m,
    systems: /^#\s+.*[Ss]ystems?\s+[Ss]ecurity/m,
    cloud: /^#\s+.*[Cc]loud\s+[Ss]ecurity/m,
    crypto: /^#\s+.*[Cc]ryptograph/m,
  };

  for (const domain of DOMAIN_NAMES) {
    it(`${domain}.md should have a proper H1 title`, () => {
      const filePath = path.join(DOMAINS_DIR, `${domain}.md`);
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toMatch(EXPECTED_TITLES[domain]);
    });
  }
});

// ============================================================================
// TEST SECTION 7: No Cross-Domain Confusion
// ============================================================================

describe('GH-15: Security Domain Reference Files — Domain Isolation', () => {
  it('web.md should not primarily discuss OS/systems topics', () => {
    const content = fs.readFileSync(
      path.join(DOMAINS_DIR, 'web.md'),
      'utf-8'
    );
    // Web file should not have launchd, systemd, or kernel references as primary content
    const lines = content.split('\n');
    const systemsLines = lines.filter(
      (l) => /launchd|systemd|kernel module|selinux/i.test(l)
    );
    // Allow incidental mentions but not dominant
    expect(systemsLines.length).toBeLessThan(5);
  });

  it('systems.md should not primarily discuss web app topics', () => {
    const content = fs.readFileSync(
      path.join(DOMAINS_DIR, 'systems.md'),
      'utf-8'
    );
    const lines = content.split('\n');
    const webLines = lines.filter(
      (l) => /CSRF|XSS|cookie|session.fixation/i.test(l)
    );
    expect(webLines.length).toBeLessThan(5);
  });

  it('cloud.md should not primarily discuss cryptographic algorithms', () => {
    const content = fs.readFileSync(
      path.join(DOMAINS_DIR, 'cloud.md'),
      'utf-8'
    );
    const lines = content.split('\n');
    const cryptoLines = lines.filter(
      (l) => /AES-256|RSA-OAEP|elliptic curve|ChaCha20/i.test(l)
    );
    expect(cryptoLines.length).toBeLessThan(5);
  });

  it('crypto.md should not primarily discuss cloud IAM', () => {
    const content = fs.readFileSync(
      path.join(DOMAINS_DIR, 'crypto.md'),
      'utf-8'
    );
    const lines = content.split('\n');
    const cloudLines = lines.filter(
      (l) => /IAM polic|S3 bucket|EC2 instance|Lambda function/i.test(l)
    );
    expect(cloudLines.length).toBeLessThan(5);
  });
});

// ============================================================================
// TEST SECTION 8: SKILL.MD Domain Context Passing (GH-15 Acceptance Criteria)
// ============================================================================

const SKILL_MD = path.join(
  __dirname,
  '../../.claude/skills/mg-security-review/SKILL.md'
);

describe('GH-15: mg-security-review SKILL.MD — Domain Context Passing', () => {
  let skillContent: string;

  beforeAll(() => {
    skillContent = fs.readFileSync(SKILL_MD, 'utf-8');
  });

  it('should pass domain context in the security-engineer spawn prompt', () => {
    // The spawn pattern must include domain awareness
    expect(skillContent).toMatch(/domain/i);
    const spawnSection = skillContent.match(
      /##\s+.*Spawn Pattern\s*\n([\s\S]*?)(?=\n##\s|$)/i
    );
    expect(spawnSection).toBeTruthy();
    expect(spawnSection![1]).toMatch(/domain/i);
  });

  it('should include a domain inference table or mapping', () => {
    // Must map project signals to domains
    const domainSection = skillContent.match(
      /##\s+.*[Dd]omain.*\n([\s\S]*?)(?=\n##\s|$)/
    );
    expect(domainSection).toBeTruthy();
    // The mapping must mention all four domains
    const section = domainSection![1].toLowerCase();
    expect(section).toContain('web');
    expect(section).toContain('systems');
    expect(section).toContain('cloud');
    expect(section).toContain('crypto');
  });

  it('should detect daemon/systems projects without user intervention', () => {
    // The skill must have heuristics to auto-detect systems domain
    const lower = skillContent.toLowerCase();
    // Must mention daemon detection signals
    expect(lower).toMatch(/daemon|launchd|systemd|plist/);
    // Must mention auto-detection (not requiring user flag)
    expect(lower).toMatch(/infer|detect|auto|heuristic|signal/);
  });
});

// ============================================================================
// TEST SECTION 9: AGENT.MD Domain Selection Section (GH-15 Acceptance Criteria)
// ============================================================================

describe('GH-15: Security Engineer AGENT.MD — Domain Selection', () => {
  let agentContent: string;

  beforeAll(() => {
    agentContent = fs.readFileSync(AGENT_MD, 'utf-8');
  });

  it('should contain a "Domain Selection" section', () => {
    expect(agentContent).toMatch(/^##\s+Domain Selection/m);
  });

  it('should instruct the agent to infer the domain from task context', () => {
    const sectionMatch = agentContent.match(
      /##\s+Domain Selection\s*\n([\s\S]*?)(?=\n##|\n$|$)/i
    );
    expect(sectionMatch).toBeTruthy();
    const section = sectionMatch![1].toLowerCase();
    expect(section).toMatch(/infer|detect|determine|identify/);
    expect(section).toMatch(/context|task|prompt|request/);
  });

  it('should reference reading domain-specific files', () => {
    const sectionMatch = agentContent.match(
      /##\s+Domain Selection\s*\n([\s\S]*?)(?=\n##|\n$|$)/i
    );
    expect(sectionMatch).toBeTruthy();
    const section = sectionMatch![1];
    expect(section).toMatch(/domains\//);
    for (const domain of DOMAIN_NAMES) {
      expect(section).toMatch(new RegExp(`${domain}\\.md`, 'i'));
    }
  });

  it('should list all four domains with descriptions', () => {
    const sectionMatch = agentContent.match(
      /##\s+Domain Selection\s*\n([\s\S]*?)(?=\n##|\n$|$)/i
    );
    expect(sectionMatch).toBeTruthy();
    const section = sectionMatch![1].toLowerCase();
    expect(section).toMatch(/web/);
    expect(section).toMatch(/systems?/);
    expect(section).toMatch(/cloud/);
    expect(section).toMatch(/crypto/);
  });

  it('should not add new agents (agent count must remain at 20)', () => {
    // Verify the agent.md does not define or reference splitting into multiple agents
    expect(agentContent).not.toMatch(/security-engineer-web/i);
    expect(agentContent).not.toMatch(/security-engineer-systems/i);
    expect(agentContent).not.toMatch(/security-engineer-cloud/i);
    expect(agentContent).not.toMatch(/security-engineer-crypto/i);
  });
});

// ============================================================================
// TEST SECTION 10: Memory Protocol — domains_reviewed Field (GH-15 AC)
// ============================================================================

describe('GH-15: Memory Protocol — domains_reviewed Field', () => {
  it('agent.md memory protocol should include domains_reviewed field', () => {
    const content = fs.readFileSync(AGENT_MD, 'utf-8');
    const memorySection = content.match(
      /##\s+Memory Protocol\s*\n([\s\S]*?)(?=\n##\s|$)/i
    );
    expect(memorySection).toBeTruthy();
    expect(memorySection![1]).toMatch(/domains_reviewed/);
  });

  it('agent.md domains_reviewed should list domain values', () => {
    const content = fs.readFileSync(AGENT_MD, 'utf-8');
    const memorySection = content.match(
      /##\s+Memory Protocol\s*\n([\s\S]*?)(?=\n##\s|$)/i
    );
    expect(memorySection).toBeTruthy();
    const section = memorySection![1].toLowerCase();
    // Should reference the domain names as valid values
    expect(section).toMatch(/web/);
    expect(section).toMatch(/systems/);
    expect(section).toMatch(/cloud/);
    expect(section).toMatch(/crypto/);
  });

  it('SKILL.md memory protocol should include domains_reviewed field', () => {
    const content = fs.readFileSync(SKILL_MD, 'utf-8');
    const memorySection = content.match(
      /##\s+Memory Protocol\s*\n([\s\S]*?)(?=\n##\s|$)/i
    );
    expect(memorySection).toBeTruthy();
    expect(memorySection![1]).toMatch(/domains_reviewed/);
  });

  it('SKILL.md domains_reviewed should be an array type', () => {
    const content = fs.readFileSync(SKILL_MD, 'utf-8');
    const memorySection = content.match(
      /##\s+Memory Protocol\s*\n([\s\S]*?)(?=\n##\s|$)/i
    );
    expect(memorySection).toBeTruthy();
    // Should indicate it's a list/array (brackets or "list" or multiple values)
    const section = memorySection![1];
    const domainsLine = section
      .split('\n')
      .find((l) => /domains_reviewed/.test(l));
    expect(domainsLine).toBeTruthy();
    expect(domainsLine!).toMatch(/\[|list|array|web.*systems|web.*cloud/i);
  });
});

// ============================================================================
// TEST SECTION 11: End-to-End — Daemon Codebase OS-Level Detection (GH-15 AC)
// ============================================================================

describe('GH-15: Domain Detection Heuristics — Daemon Codebase', () => {
  const skillContent = fs.readFileSync(SKILL_MD, 'utf-8');

  // Extract the domain inference section for testing heuristic completeness
  const domainSection = skillContent.match(
    /##\s+.*[Dd]omain.*\n([\s\S]*?)(?=\n##\s|$)/
  );
  const inferenceContent = domainSection ? domainSection[1] : '';

  it('should detect systems domain from daemon-related file patterns', () => {
    const lower = inferenceContent.toLowerCase();
    expect(lower).toMatch(/daemon/);
    expect(lower).toMatch(/launchd|plist/);
    expect(lower).toMatch(/systemd/);
  });

  it('should detect systems domain from process management signals', () => {
    const lower = inferenceContent.toLowerCase();
    expect(lower).toMatch(/child_process|process.*spawn|spawn/);
    expect(lower).toMatch(/pid|lock.?file/);
  });

  it('should detect systems domain from file permission signals', () => {
    const lower = inferenceContent.toLowerCase();
    expect(lower).toMatch(/chmod|chown|permission/);
  });

  it('should detect web domain from HTTP/API signals', () => {
    const lower = inferenceContent.toLowerCase();
    expect(lower).toMatch(/http|express|fastify/);
    expect(lower).toMatch(/route|endpoint/);
  });

  it('should detect cloud domain from container/CI signals', () => {
    const lower = inferenceContent.toLowerCase();
    expect(lower).toMatch(/docker/);
    expect(lower).toMatch(/ci\/cd|pipeline|workflow/);
  });

  it('should detect crypto domain from encryption signals', () => {
    const lower = inferenceContent.toLowerCase();
    expect(lower).toMatch(/encrypt|decrypt/);
    expect(lower).toMatch(/tls|certificate/);
    expect(lower).toMatch(/crypto/);
  });

  it('should default to all domains when signals are ambiguous', () => {
    const lower = inferenceContent.toLowerCase();
    expect(lower).toMatch(
      /default.*all|all.*domain|comprehensive|no.*clear.*signal|ambiguous/i
    );
  });

  it('systems.md checklist covers OS-level findings a web-only review would miss', () => {
    const systemsContent = fs.readFileSync(
      path.join(DOMAINS_DIR, 'systems.md'),
      'utf-8'
    );
    const checklistMatch = systemsContent.match(
      /##\s+.*Checklist\s*\n([\s\S]*?)(?=\n##|\n$|$)/i
    );
    expect(checklistMatch).toBeTruthy();
    const checklist = checklistMatch![1].toLowerCase();

    // These are OS-level findings that the original web-only agent missed
    expect(checklist).toMatch(/non-root|dedicated.*user/);
    expect(checklist).toMatch(/exec.*style|shell.*interpolation|child_process/i);
    expect(checklist).toMatch(/chmod|file.*permission|600|640/);
    expect(checklist).toMatch(/pid.*file|lock.*file/);
    expect(checklist).toMatch(/signal.*handler/);
  });

  it('systems.md threat model covers daemon-specific threats', () => {
    const systemsContent = fs.readFileSync(
      path.join(DOMAINS_DIR, 'systems.md'),
      'utf-8'
    );
    const threatMatch = systemsContent.match(
      /##\s+.*Threat Model\s*\n([\s\S]*?)(?=\n##|\n$|$)/i
    );
    expect(threatMatch).toBeTruthy();
    const threats = threatMatch![1].toLowerCase();

    // Daemon-specific threats the web agent missed
    expect(threats).toMatch(/privilege escalation/);
    expect(threats).toMatch(/subprocess.*injection|command.*injection/i);
    expect(threats).toMatch(/daemon.*compromise|service.*compromise/i);
    expect(threats).toMatch(/supply chain/);
  });
});

// ============================================================================
// TEST SECTION 12: GH-84 — Systems Domain Completeness Validation
// ============================================================================

describe('GH-84: systems.md — Critical Systems Security Area Coverage', () => {
  let systemsContent: string;
  let checklist: string;
  let threats: string;
  let reviewAreas: string;

  beforeAll(() => {
    systemsContent = fs.readFileSync(
      path.join(DOMAINS_DIR, 'systems.md'),
      'utf-8'
    );
    const checklistMatch = systemsContent.match(
      /##\s+.*Checklist\s*\n([\s\S]*?)(?=\n##|\n$|$)/i
    );
    checklist = checklistMatch ? checklistMatch[1].toLowerCase() : '';
    const threatMatch = systemsContent.match(
      /##\s+.*Threat Model\s*\n([\s\S]*?)(?=\n##|\n$|$)/i
    );
    threats = threatMatch ? threatMatch[1].toLowerCase() : '';
    const reviewMatch = systemsContent.match(
      /##\s+.*Review Areas\s*\n([\s\S]*?)(?=\n##|\n$|$)/i
    );
    reviewAreas = reviewMatch ? reviewMatch[1].toLowerCase() : '';
  });

  // --- Acceptance Criteria: process isolation ---
  it('review areas should cover process isolation', () => {
    expect(reviewAreas).toMatch(/process isolation/);
  });

  it('review areas should mention sandboxing mechanisms', () => {
    expect(reviewAreas).toMatch(/seccomp|apparmor|sandbox/);
  });

  it('review areas should cover namespace isolation', () => {
    expect(reviewAreas).toMatch(/namespace/);
  });

  // --- Acceptance Criteria: file permissions ---
  it('review areas should cover file permissions', () => {
    expect(reviewAreas).toMatch(/file.*permission|permission/);
  });

  it('checklist should include specific permission values', () => {
    expect(checklist).toMatch(/600|640|700/);
  });

  it('review areas should address path traversal', () => {
    expect(reviewAreas).toMatch(/path traversal/);
  });

  it('review areas should address TOCTOU race conditions', () => {
    expect(reviewAreas).toMatch(/toctou|race condition/);
  });

  // --- Acceptance Criteria: daemon hardening ---
  it('review areas should cover daemon/service security', () => {
    expect(reviewAreas).toMatch(/daemon.*security|service.*security/);
  });

  it('checklist should include launchd/systemd hardening directives', () => {
    expect(checklist).toMatch(/launchd|systemd/);
    expect(checklist).toMatch(/nonewprivileges|protecthome|hardening/);
  });

  it('review areas should cover PID/lock file handling', () => {
    expect(reviewAreas).toMatch(/pid|lock.*file/);
  });

  it('review areas should cover cron/scheduled task security', () => {
    expect(reviewAreas).toMatch(/cron|scheduled.*task/);
  });

  // --- Acceptance Criteria: privilege escalation prevention ---
  it('review areas should cover privilege escalation prevention', () => {
    expect(reviewAreas).toMatch(/privilege escalation/);
  });

  it('review areas should address SUID/SGID binaries', () => {
    expect(reviewAreas).toMatch(/suid|sgid/);
  });

  it('review areas should cover sudo configuration', () => {
    expect(reviewAreas).toMatch(/sudo/);
  });

  it('review areas should address capability leaks', () => {
    expect(reviewAreas).toMatch(/capability.*leak|environment.*variable|file.*descriptor/);
  });

  // --- Acceptance Criteria: system hardening ---
  it('review areas should cover system hardening', () => {
    expect(reviewAreas).toMatch(/system hardening/);
  });

  it('review areas should address kernel parameters', () => {
    expect(reviewAreas).toMatch(/kernel.*parameter|sysctl/);
  });

  it('review areas should address network listener exposure', () => {
    expect(reviewAreas).toMatch(/network.*listener|open.*port/);
  });

  it('review areas should cover memory protections', () => {
    expect(reviewAreas).toMatch(/aslr|stack.*canari|nx|dep|memory.*protection/);
  });

  // --- GH-84 additions: IPC and resource controls ---
  it('review areas should cover IPC security', () => {
    expect(reviewAreas).toMatch(/ipc|unix.*socket|shared.*memory|d-bus/);
  });

  it('review areas should cover resource limits', () => {
    expect(reviewAreas).toMatch(/ulimit|cgroup|resource.*limit/);
  });

  it('review areas should cover audit logging', () => {
    expect(reviewAreas).toMatch(/audit.*log/);
  });

  // --- Threat model completeness ---
  it('threat model should cover resource exhaustion', () => {
    expect(threats).toMatch(/resource exhaustion/);
  });

  it('threat model should cover IPC abuse', () => {
    expect(threats).toMatch(/ipc.*abuse|ipc.*exploit/i);
  });

  it('threat model should have at least 6 threats for systems domain', () => {
    const items = threats.match(/^\d+\.\s+/gm);
    expect(items).toBeTruthy();
    expect(items!.length).toBeGreaterThanOrEqual(6);
  });

  // --- Checklist completeness ---
  it('checklist should cover resource limits', () => {
    expect(checklist).toMatch(/ulimit|cgroup|resource.*limit/);
  });

  it('checklist should cover IPC channel permissions', () => {
    expect(checklist).toMatch(/unix.*socket|ipc.*channel|ipc.*permission/);
  });

  it('checklist should cover audit logging', () => {
    expect(checklist).toMatch(/audit.*log/);
  });

  it('checklist should cover cron job security', () => {
    expect(checklist).toMatch(/cron.*job|scheduled.*task/);
  });

  it('checklist should cover memory protections', () => {
    expect(checklist).toMatch(/aslr|nx|dep|stack.*canari|memory.*protection/);
  });

  it('checklist should have at least 13 items', () => {
    const items = checklist.match(/^[\s]*-\s+\[/gm);
    expect(items).toBeTruthy();
    expect(items!.length).toBeGreaterThanOrEqual(13);
  });

  // --- Review area count ---
  it('should have at least 6 review areas covering all critical domains', () => {
    const items = reviewAreas.match(/^\d+\.\s+/gm);
    expect(items).toBeTruthy();
    expect(items!.length).toBeGreaterThanOrEqual(6);
  });
});

// ============================================================================
// TEST SECTION 13: GH-84 — Cloud Domain Completeness Validation
// ============================================================================

describe('GH-84: cloud.md — Critical Cloud Security Area Coverage', () => {
  let cloudContent: string;
  let checklist: string;
  let threats: string;
  let reviewAreas: string;

  beforeAll(() => {
    cloudContent = fs.readFileSync(
      path.join(DOMAINS_DIR, 'cloud.md'),
      'utf-8'
    );
    const checklistMatch = cloudContent.match(
      /##\s+.*Checklist\s*\n([\s\S]*?)(?=\n##|\n$|$)/i
    );
    checklist = checklistMatch ? checklistMatch[1].toLowerCase() : '';
    const threatMatch = cloudContent.match(
      /##\s+.*Threat Model\s*\n([\s\S]*?)(?=\n##|\n$|$)/i
    );
    threats = threatMatch ? threatMatch[1].toLowerCase() : '';
    const reviewMatch = cloudContent.match(
      /##\s+.*Review Areas\s*\n([\s\S]*?)(?=\n##|\n$|$)/i
    );
    reviewAreas = reviewMatch ? reviewMatch[1].toLowerCase() : '';
  });

  // --- Acceptance Criteria: IAM ---
  it('review areas should cover IAM', () => {
    expect(reviewAreas).toMatch(/iam|identity.*access/);
  });

  it('review areas should address least privilege for IAM policies', () => {
    expect(reviewAreas).toMatch(/least privilege|no.*wildcard/);
  });

  it('review areas should cover MFA enforcement', () => {
    expect(reviewAreas).toMatch(/mfa/);
  });

  it('review areas should address temporary credentials over long-lived keys', () => {
    expect(reviewAreas).toMatch(/temporary.*credential|long-lived.*key/);
  });

  it('checklist should enforce no wildcard IAM policies', () => {
    expect(checklist).toMatch(/no.*wildcard|specific.*action/);
  });

  it('checklist should require dedicated service account roles', () => {
    expect(checklist).toMatch(/service account|dedicated.*role/);
  });

  // --- Acceptance Criteria: Secrets Management ---
  it('review areas should cover secrets management', () => {
    expect(reviewAreas).toMatch(/secrets? management/);
  });

  it('review areas should mention vault or secrets manager', () => {
    expect(reviewAreas).toMatch(/vault|secrets? manager/);
  });

  it('review areas should address secret rotation', () => {
    expect(reviewAreas).toMatch(/rotation/);
  });

  it('checklist should require secrets in vault (not repos or images)', () => {
    expect(checklist).toMatch(/vault|secrets? manager/);
    expect(checklist).toMatch(/not.*repo|not.*image|not.*env/);
  });

  it('checklist should require automated secret rotation', () => {
    expect(checklist).toMatch(/rotation.*automat|automat.*rotation/);
  });

  // --- Acceptance Criteria: Network Isolation ---
  it('review areas should cover network isolation', () => {
    expect(reviewAreas).toMatch(/network.*isolation|network.*segmentation|vpc/);
  });

  it('review areas should address security groups', () => {
    expect(reviewAreas).toMatch(/security group/);
  });

  it('review areas should cover private subnets', () => {
    expect(reviewAreas).toMatch(/private subnet/);
  });

  it('review areas should address overly permissive ingress rules', () => {
    expect(reviewAreas).toMatch(/0\.0\.0\.0|permissive.*ingress|ingress.*permissive/);
  });

  it('checklist should enforce private subnet deployment for internal services', () => {
    expect(checklist).toMatch(/private subnet/);
  });

  it('checklist should restrict security group ingress', () => {
    expect(checklist).toMatch(/security group.*restrict|restrict.*ingress|required.*port/);
  });

  // --- Acceptance Criteria: Container Security ---
  it('review areas should cover container security', () => {
    expect(reviewAreas).toMatch(/container/);
  });

  it('review areas should address non-root containers', () => {
    expect(reviewAreas).toMatch(/root.*container|non-root/);
  });

  it('review areas should address minimal base images', () => {
    expect(reviewAreas).toMatch(/minimal.*base.*image|distroless|alpine/);
  });

  it('review areas should cover image scanning', () => {
    expect(reviewAreas).toMatch(/image.*scan/);
  });

  it('review areas should address Kubernetes security', () => {
    expect(reviewAreas).toMatch(/kubernetes|k8s|rbac|pod.*security/);
  });

  it('checklist should require non-root containers', () => {
    expect(checklist).toMatch(/non-root/);
  });

  it('checklist should require container image scanning', () => {
    expect(checklist).toMatch(/image.*scan.*cve|scan.*cve|cve/);
  });

  // --- Acceptance Criteria: Supply Chain ---
  it('review areas should cover supply chain security', () => {
    expect(reviewAreas).toMatch(/supply chain/);
  });

  it('review areas should address dependency lock files', () => {
    expect(reviewAreas).toMatch(/lock file/);
  });

  it('review areas should cover artifact signing', () => {
    expect(reviewAreas).toMatch(/artifact.*sign|signing/);
  });

  it('review areas should address image pinning to digest', () => {
    expect(reviewAreas).toMatch(/pin.*digest|digest/);
  });

  it('checklist should require dependency pinning and auditing', () => {
    expect(checklist).toMatch(/lock file|pinned/);
    expect(checklist).toMatch(/audit|vulnerabilit/);
  });

  it('checklist should require CI/CD artifact signing', () => {
    expect(checklist).toMatch(/signed|signing/);
  });

  // --- Acceptance Criteria: Data Storage ---
  it('review areas should cover data and storage security', () => {
    expect(reviewAreas).toMatch(/data.*storage|storage.*security/);
  });

  it('review areas should address public bucket access', () => {
    expect(reviewAreas).toMatch(/public.*access|publicly accessible/);
  });

  it('review areas should cover encryption at rest', () => {
    expect(reviewAreas).toMatch(/encryption.*rest/);
  });

  it('review areas should cover audit trails for data access', () => {
    expect(reviewAreas).toMatch(/audit.*trail|logging/);
  });

  it('checklist should deny public access to storage buckets', () => {
    expect(checklist).toMatch(/public.*access/);
  });

  it('checklist should require audit logging for cloud APIs', () => {
    expect(checklist).toMatch(/audit.*log/);
  });

  // --- Structural completeness ---
  it('threat model should have at least 6 threats for cloud domain', () => {
    const items = threats.match(/^\d+\.\s+/gm);
    expect(items).toBeTruthy();
    expect(items!.length).toBeGreaterThanOrEqual(6);
  });

  it('checklist should have at least 12 items', () => {
    const items = checklist.match(/^[\s]*-\s+\[/gm);
    expect(items).toBeTruthy();
    expect(items!.length).toBeGreaterThanOrEqual(12);
  });

  it('should have at least 6 review areas covering all critical cloud domains', () => {
    const items = reviewAreas.match(/^\d+\.\s+/gm);
    expect(items).toBeTruthy();
    expect(items!.length).toBeGreaterThanOrEqual(6);
  });

  // --- Threat model specific coverage ---
  it('threat model should cover IAM misconfiguration', () => {
    expect(threats).toMatch(/iam.*misconfig|iam.*polic/);
  });

  it('threat model should cover exposed secrets', () => {
    expect(threats).toMatch(/exposed.*secret|secret.*leak|credential.*leak/);
  });

  it('threat model should cover network exposure', () => {
    expect(threats).toMatch(/network.*expos/);
  });

  it('threat model should cover container escape', () => {
    expect(threats).toMatch(/container.*escape/);
  });

  it('threat model should cover supply chain compromise', () => {
    expect(threats).toMatch(/supply chain.*compromise/);
  });

  it('threat model should cover data exfiltration', () => {
    expect(threats).toMatch(/data.*exfiltration/);
  });

  // --- IaC coverage ---
  it('checklist should require infrastructure-as-code with peer review', () => {
    expect(checklist).toMatch(/iac|infrastructure.*code/);
  });
});

// ============================================================================
// TEST SECTION 14: GH-84 — Crypto Domain Completeness Validation
// ============================================================================

describe('GH-84: crypto.md — Critical Cryptographic Security Area Coverage', () => {
  let cryptoContent: string;
  let checklist: string;
  let threats: string;
  let reviewAreas: string;

  beforeAll(() => {
    cryptoContent = fs.readFileSync(
      path.join(DOMAINS_DIR, 'crypto.md'),
      'utf-8'
    );
    const checklistMatch = cryptoContent.match(
      /##\s+.*Checklist\s*\n([\s\S]*?)(?=\n##|\n$|$)/i
    );
    checklist = checklistMatch ? checklistMatch[1].toLowerCase() : '';
    const threatMatch = cryptoContent.match(
      /##\s+.*Threat Model\s*\n([\s\S]*?)(?=\n##|\n$|$)/i
    );
    threats = threatMatch ? threatMatch[1].toLowerCase() : '';
    const reviewMatch = cryptoContent.match(
      /##\s+.*Review Areas\s*\n([\s\S]*?)(?=\n##|\n$|$)/i
    );
    reviewAreas = reviewMatch ? reviewMatch[1].toLowerCase() : '';
  });

  // --- Acceptance Criteria: Key Management ---
  it('review areas should cover key management', () => {
    expect(reviewAreas).toMatch(/key management/);
  });

  it('review areas should address key rotation', () => {
    expect(reviewAreas).toMatch(/key rotation/);
  });

  it('review areas should mention HSM or KMS', () => {
    expect(reviewAreas).toMatch(/hsm|kms|key management service/);
  });

  it('review areas should address key derivation functions', () => {
    expect(reviewAreas).toMatch(/key derivation|kdf/);
  });

  it('review areas should address key material exposure prevention', () => {
    expect(reviewAreas).toMatch(/never.*log|not.*log|key.*expos/);
  });

  it('checklist should require KMS/HSM for key storage', () => {
    expect(checklist).toMatch(/kms|hsm/);
  });

  it('checklist should require key rotation policy', () => {
    expect(checklist).toMatch(/key rotation/);
  });

  // --- Acceptance Criteria: TLS Configuration ---
  it('review areas should cover TLS configuration', () => {
    expect(reviewAreas).toMatch(/tls/);
  });

  it('review areas should specify TLS version requirements', () => {
    expect(reviewAreas).toMatch(/tls 1\.2|tls 1\.0|tls 1\.1/);
  });

  it('review areas should address cipher suite configuration', () => {
    expect(reviewAreas).toMatch(/cipher suite/);
  });

  it('review areas should address certificate validation', () => {
    expect(reviewAreas).toMatch(/certificate.*valid|chain.*verif/);
  });

  it('review areas should mention HSTS', () => {
    expect(reviewAreas).toMatch(/hsts/);
  });

  it('checklist should enforce TLS 1.2+', () => {
    expect(checklist).toMatch(/tls 1\.2/);
  });

  it('checklist should require AEAD cipher suites', () => {
    expect(checklist).toMatch(/aead/);
  });

  it('checklist should require certificate validation (no skip-verify)', () => {
    expect(checklist).toMatch(/certificate.*valid|skip.*verify/);
  });

  // --- Acceptance Criteria: Algorithm Selection ---
  it('review areas should cover algorithm selection', () => {
    expect(reviewAreas).toMatch(/algorithm|cipher.*selection/);
  });

  it('review areas should list deprecated algorithms to avoid', () => {
    expect(reviewAreas).toMatch(/md5|sha-1|des|rc4|ecb/);
  });

  it('review areas should mention modern algorithms', () => {
    expect(reviewAreas).toMatch(/aes-256|ed25519|x25519/);
  });

  it('review areas should address CSPRNG requirements', () => {
    expect(reviewAreas).toMatch(/csprng|random.*number.*generat/);
  });

  it('review areas should mention authenticated encryption', () => {
    expect(reviewAreas).toMatch(/authenticated encryption/);
  });

  it('checklist should ban deprecated algorithms', () => {
    expect(checklist).toMatch(/md5.*sha-1|deprecated.*algorithm|no.*md5/);
  });

  it('checklist should require CSPRNG for security-sensitive randomness', () => {
    expect(checklist).toMatch(/csprng/);
  });

  // --- Acceptance Criteria: Password Hashing ---
  it('review areas should cover password hashing', () => {
    expect(reviewAreas).toMatch(/password.*hash|hashing/);
  });

  it('review areas should mention memory-hard functions', () => {
    expect(reviewAreas).toMatch(/argon2|bcrypt|scrypt|memory-hard/);
  });

  it('review areas should address unique salts', () => {
    expect(reviewAreas).toMatch(/salt/);
  });

  it('review areas should address constant-time comparison', () => {
    expect(reviewAreas).toMatch(/constant.time/);
  });

  it('checklist should require argon2id/bcrypt/scrypt for passwords', () => {
    expect(checklist).toMatch(/argon2|bcrypt|scrypt/);
  });

  it('checklist should require constant-time comparison', () => {
    expect(checklist).toMatch(/constant.time/);
  });

  // --- Acceptance Criteria: Digital Signatures ---
  it('review areas should cover digital signatures', () => {
    expect(reviewAreas).toMatch(/digital signature/);
  });

  it('review areas should mention signature algorithms', () => {
    expect(reviewAreas).toMatch(/ed25519|ecdsa|rsa-pss/);
  });

  it('review areas should address signature verification', () => {
    expect(reviewAreas).toMatch(/signature.*verif/);
  });

  it('review areas should address replay attack prevention', () => {
    expect(reviewAreas).toMatch(/replay.*attack|nonce|timestamp/);
  });

  it('checklist should require signature verification before trust', () => {
    expect(checklist).toMatch(/signature.*verif/);
  });

  // --- Threat model completeness ---
  it('threat model should cover weak algorithm usage', () => {
    expect(threats).toMatch(/weak.*algorithm|deprecated.*algorithm/);
  });

  it('threat model should cover key exposure', () => {
    expect(threats).toMatch(/key.*expos|key.*leak/);
  });

  it('threat model should cover improper randomness', () => {
    expect(threats).toMatch(/improper.*random|predictable.*random/);
  });

  it('threat model should cover downgrade attacks', () => {
    expect(threats).toMatch(/downgrade.*attack/);
  });

  it('threat model should cover padding oracle attacks', () => {
    expect(threats).toMatch(/padding.*oracle/);
  });

  it('threat model should cover replay attacks', () => {
    expect(threats).toMatch(/replay.*attack/);
  });

  it('threat model should cover side-channel attacks', () => {
    expect(threats).toMatch(/side.channel|timing.*attack/);
  });

  it('threat model should cover cryptographic agility failures', () => {
    expect(threats).toMatch(/crypto.*agility|algorithm.*migration|algorithm.*transition/);
  });

  it('threat model should have at least 8 threats for crypto domain', () => {
    const items = threats.match(/^\d+\.\s+/gm);
    expect(items).toBeTruthy();
    expect(items!.length).toBeGreaterThanOrEqual(8);
  });

  // --- Checklist structural completeness ---
  it('checklist should have at least 15 items', () => {
    const items = checklist.match(/^[\s]*-\s+\[/gm);
    expect(items).toBeTruthy();
    expect(items!.length).toBeGreaterThanOrEqual(15);
  });

  it('checklist should require minimum key sizes', () => {
    expect(checklist).toMatch(/2048.*bit|256.*bit|key.*size/);
  });

  it('checklist should address forward secrecy', () => {
    expect(checklist).toMatch(/forward secrecy|ecdhe/);
  });

  // --- Review area structural completeness ---
  it('should have at least 6 review areas covering all critical crypto domains', () => {
    const items = reviewAreas.match(/^\d+\.\s+/gm);
    expect(items).toBeTruthy();
    expect(items!.length).toBeGreaterThanOrEqual(6);
  });

  // --- GH-84 additions: side-channel, crypto agility, IV/nonce ---
  it('review areas should address IV/nonce management', () => {
    expect(reviewAreas).toMatch(/iv|nonce.*manag|nonce.*reuse/);
  });

  it('checklist should address IV/nonce uniqueness', () => {
    expect(checklist).toMatch(/iv|nonce.*unique|nonce.*reuse/);
  });

  it('checklist should address side-channel mitigations', () => {
    expect(checklist).toMatch(/side.channel|timing.*safe|constant.time/);
  });

  it('review areas should address cryptographic agility', () => {
    expect(reviewAreas).toMatch(/crypto.*agility|algorithm.*migrat|algorithm.*transition/);
  });
});

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

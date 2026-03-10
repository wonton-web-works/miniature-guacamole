/**
 * WS-16-DOCS: Audit Module User Documentation Tests
 *
 * TDD/BDD Tests for audit logging documentation.
 * Tests validate documentation files themselves, not the audit module code.
 *
 * BDD Scenarios:
 * - Documentation structure and completeness
 * - Code example validity (JSON, bash, jq)
 * - Configuration schema accuracy
 * - Link validation to source files
 * - Example commands work against sample data
 *
 * Target: 99% coverage, failing tests (docs don't exist yet)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const README_PATH = path.join(PROJECT_ROOT, 'README.md');
const DOCS_DIR = path.join(PROJECT_ROOT, 'docs');
const AUDIT_DOCS_PATH = path.join(DOCS_DIR, 'audit-logging.md');
const CONFIG_MODULE_PATH = path.join(PROJECT_ROOT, 'src/audit/config.ts');

// Sample audit log data for testing jq/grep examples
const SAMPLE_AUDIT_LOG_DATA = [
  {
    timestamp: '2026-02-04T10:00:00Z',
    model: 'claude-sonnet-4-5-20250929',
    input_tokens: 1234,
    output_tokens: 567,
    duration_ms: 3200
  },
  {
    timestamp: '2026-02-04T10:15:00Z',
    model: 'claude-sonnet-4-5-20250929',
    input_tokens: 2000,
    output_tokens: 800,
    duration_ms: 4500
  },
  {
    timestamp: '2026-02-04T10:30:00Z',
    model: 'claude-opus-4-5-20251101',
    input_tokens: 5000,
    output_tokens: 1500,
    duration_ms: 8000
  },
  {
    timestamp: '2026-02-03T14:00:00Z',
    model: 'claude-sonnet-4-5-20250929',
    input_tokens: 800,
    output_tokens: 300,
    duration_ms: 2100
  }
].map(entry => JSON.stringify(entry)).join('\n');

describe('WS-16-DOCS: Audit Logging Documentation', () => {
  describe('Given README.md (Scenario: Main documentation entry point)', () => {
    let readmeContent: string;

    beforeAll(() => {
      // This will fail initially since docs don't exist yet
      if (fs.existsSync(README_PATH)) {
        readmeContent = fs.readFileSync(README_PATH, 'utf8');
      }
    });

    it('When reading README, Then it contains an Audit Logging section', () => {
      expect(fs.existsSync(README_PATH)).toBe(true);
      expect(readmeContent).toContain('Audit Logging');
    });

    it('When reading README, Then audit section includes quick start example', () => {
      expect(readmeContent).toMatch(/audit.*logging/i);
      expect(readmeContent).toMatch(/enabled.*true/);
    });

    it('When reading README, Then audit section links to detailed docs', () => {
      expect(readmeContent).toMatch(/docs\/audit-logging\.md/i);
    });

    it('When reading README, Then audit section mentions opt-in nature', () => {
      expect(readmeContent).toMatch(/opt-in|disabled.*default/i);
    });

    it('When reading README, Then audit section mentions token tracking', () => {
      expect(readmeContent).toMatch(/token.*usage|track.*tokens/i);
    });
  });

  describe('Given docs/audit-logging.md (Scenario: Complete user guide)', () => {
    let docsContent: string;

    beforeAll(() => {
      if (fs.existsSync(AUDIT_DOCS_PATH)) {
        docsContent = fs.readFileSync(AUDIT_DOCS_PATH, 'utf8');
      }
    });

    it('When reading docs, Then the file exists', () => {
      expect(fs.existsSync(AUDIT_DOCS_PATH)).toBe(true);
    });

    it('When reading docs, Then it contains Overview section', () => {
      expect(docsContent).toMatch(/##?\s+Overview/i);
      expect(docsContent).toMatch(/audit.*log/i);
    });

    it('When reading docs, Then it contains Enabling Audit Logging section', () => {
      expect(docsContent).toMatch(/##?\s+Enabling.*Audit.*Logging/i);
    });

    it('When reading docs, Then it contains Configuration Options section', () => {
      expect(docsContent).toMatch(/##?\s+Configuration.*Options?/i);
      expect(docsContent).toMatch(/enabled/i);
      expect(docsContent).toMatch(/log_path/i);
      expect(docsContent).toMatch(/max_size_mb/i);
      expect(docsContent).toMatch(/keep_backups/i);
    });

    it('When reading docs, Then it contains Log Format section', () => {
      expect(docsContent).toMatch(/##?\s+Log.*Format/i);
      expect(docsContent).toMatch(/timestamp/i);
      expect(docsContent).toMatch(/model/i);
      expect(docsContent).toMatch(/input_tokens/i);
      expect(docsContent).toMatch(/output_tokens/i);
    });

    it('When reading docs, Then it contains Log Location section', () => {
      expect(docsContent).toMatch(/##?\s+Log.*Location/i);
      expect(docsContent).toMatch(/~\/\.claude\/audit\.log/);
    });

    it('When reading docs, Then it contains Rotation section', () => {
      expect(docsContent).toMatch(/##?\s+Rotation/i);
      expect(docsContent).toMatch(/10.*MB|max.*size/i);
    });

    it('When reading docs, Then it contains Analyzing Logs section', () => {
      expect(docsContent).toMatch(/##?\s+Analyzing.*Logs/i);
      expect(docsContent).toMatch(/jq/i);
    });

    it('When reading docs, Then it contains Privacy & Security section', () => {
      expect(docsContent).toMatch(/##?\s+Privacy.*Security/i);
      expect(docsContent).toMatch(/metadata.*only|no.*content/i);
    });
  });

  describe('Given configuration examples (Scenario: Valid JSON syntax)', () => {
    let docsContent: string;

    beforeAll(() => {
      if (fs.existsSync(AUDIT_DOCS_PATH)) {
        docsContent = fs.readFileSync(AUDIT_DOCS_PATH, 'utf8');
      }
    });

    it('When extracting JSON examples, Then all JSON is syntactically valid', () => {
      // Extract JSON code blocks
      const jsonBlocks = extractCodeBlocks(docsContent, 'json');

      expect(jsonBlocks.length).toBeGreaterThan(0);

      jsonBlocks.forEach((block, idx) => {
        expect(() => JSON.parse(block)).not.toThrow(
          `JSON block ${idx + 1} should be valid JSON`
        );
      });
    });

    it('When extracting JSON examples, Then they include audit_logging config', () => {
      const jsonBlocks = extractCodeBlocks(docsContent, 'json');
      const hasAuditConfig = jsonBlocks.some(block => {
        try {
          const parsed = JSON.parse(block);
          return parsed.audit_logging !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasAuditConfig).toBe(true);
    });

    it('When extracting JSON examples, Then they match config.ts schema', () => {
      const jsonBlocks = extractCodeBlocks(docsContent, 'json');
      const auditConfigs = jsonBlocks
        .map(block => {
          try {
            const parsed = JSON.parse(block);
            return parsed.audit_logging;
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      expect(auditConfigs.length).toBeGreaterThan(0);

      auditConfigs.forEach(config => {
        // Should only have valid keys
        const validKeys = ['enabled', 'log_path', 'max_size_mb', 'keep_backups'];
        const configKeys = Object.keys(config);

        configKeys.forEach(key => {
          expect(validKeys).toContain(key);
        });

        // Type checks
        if (config.enabled !== undefined) {
          expect(typeof config.enabled).toBe('boolean');
        }
        if (config.log_path !== undefined) {
          expect(typeof config.log_path).toBe('string');
        }
        if (config.max_size_mb !== undefined) {
          expect(typeof config.max_size_mb).toBe('number');
          expect(config.max_size_mb).toBeGreaterThan(0);
        }
        if (config.keep_backups !== undefined) {
          expect(typeof config.keep_backups).toBe('number');
          expect(config.keep_backups).toBeGreaterThanOrEqual(0);
        }
      });
    });
  });

  describe('Given log format examples (Scenario: Valid log entry structure)', () => {
    let docsContent: string;

    beforeAll(() => {
      if (fs.existsSync(AUDIT_DOCS_PATH)) {
        docsContent = fs.readFileSync(AUDIT_DOCS_PATH, 'utf8');
      }
    });

    it('When extracting log entry examples, Then they are valid JSON', () => {
      const jsonBlocks = extractCodeBlocks(docsContent, 'json');

      // Find blocks that look like log entries (have timestamp, model, tokens)
      const logEntries = jsonBlocks.filter(block => {
        try {
          const parsed = JSON.parse(block);
          return parsed.timestamp && parsed.model && parsed.input_tokens;
        } catch {
          return false;
        }
      });

      expect(logEntries.length).toBeGreaterThan(0);

      logEntries.forEach(entry => {
        const parsed = JSON.parse(entry);
        expect(parsed).toHaveProperty('timestamp');
        expect(parsed).toHaveProperty('model');
        expect(parsed).toHaveProperty('input_tokens');
        expect(parsed).toHaveProperty('output_tokens');
      });
    });

    it('When extracting log entry examples, Then timestamp is ISO 8601 format', () => {
      const jsonBlocks = extractCodeBlocks(docsContent, 'json');
      const logEntries = jsonBlocks.filter(block => {
        try {
          const parsed = JSON.parse(block);
          return parsed.timestamp && parsed.model;
        } catch {
          return false;
        }
      });

      expect(logEntries.length).toBeGreaterThan(0);

      logEntries.forEach(entry => {
        const parsed = JSON.parse(entry);
        // ISO 8601 format: 2026-02-04T23:30:15Z
        expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
      });
    });

    it('When extracting log entry examples, Then model names match expected format', () => {
      const jsonBlocks = extractCodeBlocks(docsContent, 'json');
      const logEntries = jsonBlocks.filter(block => {
        try {
          const parsed = JSON.parse(block);
          return parsed.model;
        } catch {
          return false;
        }
      });

      expect(logEntries.length).toBeGreaterThan(0);

      logEntries.forEach(entry => {
        const parsed = JSON.parse(entry);
        // Model format: claude-<model>-<version>-<date>
        expect(parsed.model).toMatch(/^claude-/);
      });
    });

    it('When extracting log entry examples, Then token counts are positive numbers', () => {
      const jsonBlocks = extractCodeBlocks(docsContent, 'json');
      const logEntries = jsonBlocks.filter(block => {
        try {
          const parsed = JSON.parse(block);
          return parsed.input_tokens !== undefined;
        } catch {
          return false;
        }
      });

      expect(logEntries.length).toBeGreaterThan(0);

      logEntries.forEach(entry => {
        const parsed = JSON.parse(entry);
        expect(parsed.input_tokens).toBeGreaterThan(0);
        expect(parsed.output_tokens).toBeGreaterThan(0);
        expect(Number.isInteger(parsed.input_tokens)).toBe(true);
        expect(Number.isInteger(parsed.output_tokens)).toBe(true);
      });
    });
  });

  describe('Given jq/grep examples (Scenario: Command validity)', () => {
    let docsContent: string;
    let tmpLogFile: string;

    beforeAll(() => {
      if (fs.existsSync(AUDIT_DOCS_PATH)) {
        docsContent = fs.readFileSync(AUDIT_DOCS_PATH, 'utf8');
      }

      // Create temporary log file with sample data
      tmpLogFile = path.join(__dirname, 'test-audit.log');
      fs.writeFileSync(tmpLogFile, SAMPLE_AUDIT_LOG_DATA, 'utf8');
    });

    afterAll(() => {
      // Clean up temp file
      if (fs.existsSync(tmpLogFile)) {
        fs.unlinkSync(tmpLogFile);
      }
    });

    it('When extracting bash examples, Then they contain jq commands', () => {
      const bashBlocks = extractCodeBlocks(docsContent, 'bash');

      expect(bashBlocks.length).toBeGreaterThan(0);
      expect(bashBlocks.some(block => block.includes('jq'))).toBe(true);
    });

    it('When testing "total tokens" example, Then jq command executes successfully', () => {
      const bashBlocks = extractCodeBlocks(docsContent, 'bash');
      const totalTokensCmd = bashBlocks.find(block =>
        block.toLowerCase().includes('total') && block.includes('jq')
      );

      expect(totalTokensCmd).toBeDefined();

      // Adapt command to use test log file
      const testCmd = adaptCommandForTest(totalTokensCmd!, tmpLogFile);

      expect(() => {
        const result = execSync(testCmd, { encoding: 'utf8' });
        const total = parseInt(result.trim());
        expect(total).toBeGreaterThan(0);
      }).not.toThrow();
    });

    it('When testing "tokens by model" example, Then jq command executes successfully', () => {
      const bashBlocks = extractCodeBlocks(docsContent, 'bash');
      const byModelCmd = bashBlocks.find(block =>
        block.toLowerCase().includes('by.*model|group.*model') && block.includes('jq')
      );

      expect(byModelCmd).toBeDefined();

      const testCmd = adaptCommandForTest(byModelCmd!, tmpLogFile);

      expect(() => {
        const result = execSync(testCmd, { encoding: 'utf8' });
        const parsed = JSON.parse(result);
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed.length).toBeGreaterThan(0);
      }).not.toThrow();
    });

    it('When testing "average tokens" example, Then jq command executes successfully', () => {
      const bashBlocks = extractCodeBlocks(docsContent, 'bash');
      const avgCmd = bashBlocks.find(block =>
        block.toLowerCase().includes('average') && block.includes('jq')
      );

      expect(avgCmd).toBeDefined();

      const testCmd = adaptCommandForTest(avgCmd!, tmpLogFile);

      expect(() => {
        const result = execSync(testCmd, { encoding: 'utf8' });
        const avg = parseFloat(result.trim());
        expect(avg).toBeGreaterThan(0);
      }).not.toThrow();
    });

    it('When testing grep date filter, Then command executes successfully', () => {
      const bashBlocks = extractCodeBlocks(docsContent, 'bash');
      const grepCmd = bashBlocks.find(block =>
        block.includes('grep') && block.includes('date')
      );

      if (grepCmd) {
        // Test that grep works with sample data
        const testCmd = `cat ${tmpLogFile} | grep "2026-02-04"`;

        expect(() => {
          const result = execSync(testCmd, { encoding: 'utf8' });
          expect(result.length).toBeGreaterThan(0);
        }).not.toThrow();
      }
    });
  });

  describe('Given configuration documentation (Scenario: Schema accuracy)', () => {
    let docsContent: string;
    let configModuleContent: string;

    beforeAll(() => {
      if (fs.existsSync(AUDIT_DOCS_PATH)) {
        docsContent = fs.readFileSync(AUDIT_DOCS_PATH, 'utf8');
      }
      if (fs.existsSync(CONFIG_MODULE_PATH)) {
        configModuleContent = fs.readFileSync(CONFIG_MODULE_PATH, 'utf8');
      }
    });

    it('When comparing docs to config.ts, Then enabled field is documented', () => {
      expect(docsContent).toMatch(/enabled.*boolean|boolean.*enabled/i);
      expect(configModuleContent).toMatch(/enabled.*boolean|boolean.*enabled/);
    });

    it('When comparing docs to config.ts, Then log_path field is documented', () => {
      expect(docsContent).toMatch(/log_path.*string|string.*log_path/i);
      expect(configModuleContent).toMatch(/log_path.*string|string.*log_path/);
    });

    it('When comparing docs to config.ts, Then max_size_mb field is documented', () => {
      expect(docsContent).toMatch(/max_size_mb.*number|number.*max_size_mb/i);
      expect(configModuleContent).toMatch(/max_size_mb.*number|number.*max_size_mb/);
    });

    it('When comparing docs to config.ts, Then keep_backups field is documented', () => {
      expect(docsContent).toMatch(/keep_backups.*number|number.*keep_backups/i);
      expect(configModuleContent).toMatch(/keep_backups.*number|number.*keep_backups/);
    });

    it('When checking default values, Then docs match config.ts defaults', () => {
      // Extract default values from config.ts
      const enabledMatch = configModuleContent.match(/ENABLED:\s*(true|false)/);
      const logPathMatch = configModuleContent.match(/LOG_PATH:\s*['"]([^'"]+)['"]/);
      const maxSizeMatch = configModuleContent.match(/MAX_SIZE_MB:\s*(\d+)/);
      const backupsMatch = configModuleContent.match(/KEEP_BACKUPS:\s*(\d+)/);

      expect(enabledMatch).toBeTruthy();
      expect(logPathMatch).toBeTruthy();
      expect(maxSizeMatch).toBeTruthy();
      expect(backupsMatch).toBeTruthy();

      // Check docs mention these defaults
      expect(docsContent).toMatch(/default.*false|false.*default/i);
      expect(docsContent).toMatch(/~\/\.claude\/audit\.log/);
      expect(docsContent).toMatch(/10.*MB/i);
    });

    it('When checking validation constraints, Then docs mention size limits', () => {
      // config.ts has MIN_SIZE_MB and MAX_SIZE_MB_LIMIT
      const minSizeMatch = configModuleContent.match(/MIN_SIZE_MB:\s*(\d+)/);
      const maxSizeLimitMatch = configModuleContent.match(/MAX_SIZE_MB_LIMIT:\s*(\d+)/);

      if (minSizeMatch && maxSizeLimitMatch) {
        // Docs should mention these limits
        expect(docsContent).toMatch(/minimum.*size|min.*MB/i);
        expect(docsContent).toMatch(/maximum.*size|max.*MB|1000.*MB/i);
      }
    });
  });

  describe('Given source file links (Scenario: Link accuracy)', () => {
    let docsContent: string;

    beforeAll(() => {
      if (fs.existsSync(AUDIT_DOCS_PATH)) {
        docsContent = fs.readFileSync(AUDIT_DOCS_PATH, 'utf8');
      }
    });

    it('When extracting links to src/audit/, Then files exist', () => {
      // Extract markdown links: [text](path)
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      const links: string[] = [];
      let match;

      while ((match = linkRegex.exec(docsContent)) !== null) {
        links.push(match[2]);
      }

      // Only check relative paths (skip http/https URLs)
      const auditLinks = links.filter(link =>
        link.includes('src/audit') && !link.startsWith('http')
      );

      if (auditLinks.length > 0) {
        auditLinks.forEach(link => {
          // Convert relative path to absolute
          const absolutePath = path.join(PROJECT_ROOT, link);
          expect(fs.existsSync(absolutePath)).toBe(true);
        });
      }
    });

    it('When docs mention config.ts, Then file exists', () => {
      if (docsContent.includes('config.ts')) {
        expect(fs.existsSync(CONFIG_MODULE_PATH)).toBe(true);
      }
    });

    it('When docs mention other audit modules, Then files exist', () => {
      const auditModules = ['capture', 'format', 'writer', 'index'];
      const mentionedModules = auditModules.filter(mod =>
        docsContent.includes(`${mod}.ts`)
      );

      mentionedModules.forEach(mod => {
        const modulePath = path.join(PROJECT_ROOT, 'src/audit', `${mod}.ts`);
        expect(fs.existsSync(modulePath)).toBe(true);
      });
    });
  });

  describe('Given example requirements (Scenario: All examples present)', () => {
    let docsContent: string;

    beforeAll(() => {
      if (fs.existsSync(AUDIT_DOCS_PATH)) {
        docsContent = fs.readFileSync(AUDIT_DOCS_PATH, 'utf8');
      }
    });

    it('When checking examples, Then "enable audit logging" example exists', () => {
      expect(docsContent).toMatch(/enabled.*true/i);
    });

    it('When checking examples, Then "custom log path" example exists', () => {
      expect(docsContent).toMatch(/log_path/i);
      // Should show an example path different from default
      const hasCustomPath = /log_path["']?\s*:\s*["'](?!~\/\.claude\/audit\.log)/.test(
        docsContent
      );
      expect(hasCustomPath || docsContent.includes('custom')).toBe(true);
    });

    it('When checking examples, Then "custom max size" example exists', () => {
      expect(docsContent).toMatch(/max_size_mb/i);
      // Should show a value different from default (10)
      const hasDifferentSize = /max_size_mb["']?\s*:\s*(?!10\D)/.test(docsContent);
      expect(hasDifferentSize || docsContent.includes('5') || docsContent.includes('20')).toBe(true);
    });

    it('When checking examples, Then "total tokens used today" example exists', () => {
      expect(docsContent.toLowerCase()).toMatch(/total.*token.*today|today.*total.*token/);
    });

    it('When checking examples, Then "tokens by model" example exists', () => {
      expect(docsContent.toLowerCase()).toMatch(/token.*by.*model|model.*token/);
    });

    it('When checking examples, Then "average tokens per request" example exists', () => {
      expect(docsContent.toLowerCase()).toMatch(/average.*token.*request/);
    });

    it('When checking examples, Then "cost calculation" example or mention exists', () => {
      expect(docsContent.toLowerCase()).toMatch(/cost|pricing/);
    });
  });

  describe('Given privacy & security section (Scenario: Clear documentation)', () => {
    let docsContent: string;

    beforeAll(() => {
      if (fs.existsSync(AUDIT_DOCS_PATH)) {
        docsContent = fs.readFileSync(AUDIT_DOCS_PATH, 'utf8');
      }
    });

    it('When reading privacy section, Then it states metadata only is logged', () => {
      expect(docsContent.toLowerCase()).toMatch(/metadata.*only|only.*metadata/);
    });

    it('When reading privacy section, Then it states no message content is logged', () => {
      expect(docsContent.toLowerCase()).toMatch(/no.*content|content.*not.*logged/);
    });

    it('When reading privacy section, Then it lists what IS logged', () => {
      expect(docsContent).toMatch(/timestamp/i);
      expect(docsContent).toMatch(/model/i);
      expect(docsContent).toMatch(/token.*count/i);
    });

    it('When reading privacy section, Then it mentions opt-in nature', () => {
      expect(docsContent.toLowerCase()).toMatch(/opt-in|disabled.*default|enable.*manually/);
    });
  });
});

// Helper functions

/**
 * Extracts code blocks of a specific language from markdown
 */
function extractCodeBlocks(markdown: string, language: string): string[] {
  const regex = new RegExp(`\`\`\`${language}\\s*\\n([\\s\\S]*?)\\n\`\`\``, 'g');
  const blocks: string[] = [];
  let match;

  while ((match = regex.exec(markdown)) !== null) {
    blocks.push(match[1].trim());
  }

  return blocks;
}

/**
 * Adapts a command from docs to use test log file
 */
function adaptCommandForTest(command: string, logFilePath: string): string {
  // Replace ~/.claude/audit.log with test file path
  let adapted = command.replace(/~\/\.claude\/audit\.log/g, logFilePath);
  adapted = adapted.replace(/\$HOME\/\.claude\/audit\.log/g, logFilePath);

  // Remove date filtering (our test data has specific dates)
  adapted = adapted.replace(/grep\s+\$\(date[^)]+\)\s+[^|]+\|/g, `cat ${logFilePath} |`);

  // Ensure we use the test file
  if (!adapted.includes(logFilePath)) {
    adapted = `cat ${logFilePath} | ${adapted}`;
  }

  return adapted;
}

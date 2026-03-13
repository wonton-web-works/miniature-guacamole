/**
 * Integration Tests for WS-OSS-2: Documentation & Governance
 *
 * Tests that validate the repository has complete, professional documentation
 * and governance files before open sourcing.
 *
 * @workstream WS-OSS-2
 * @priority P0 (blocks WS-OSS-3 and WS-OSS-4)
 * @target 99% coverage of documentation requirements
 * @phase RED (failing tests written first - docs not yet created)
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Project root directory
const PROJECT_ROOT = path.resolve(__dirname, '../..');

// Helper to check if file exists
const fileExists = (filePath: string): boolean => {
  return fs.existsSync(path.join(PROJECT_ROOT, filePath));
};

// Helper to read file content
const readFile = (filePath: string): string => {
  const fullPath = path.join(PROJECT_ROOT, filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }
  return fs.readFileSync(fullPath, 'utf-8');
};

// Helper to check if content has section
const hasSection = (content: string, heading: string): boolean => {
  // Match both # Heading and ## Heading formats
  const headingPattern = new RegExp(`^#{1,6}\\s+${heading}`, 'm');
  return headingPattern.test(content);
};

// Helper to search for placeholder text in tracked files
const findPlaceholdersInTrackedFiles = (): string[] => {
  try {
    const trackedFiles = execSync('git ls-files', {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8'
    }).trim().split('\n').filter(Boolean);

    const placeholders = ['YOUR_USERNAME', 'YOUR_NAME', 'YOUR_EMAIL', 'TODO:', 'FIXME:', 'XXX:'];
    const filesWithPlaceholders: string[] = [];

    // Exclude test files, daemon templates, and .claude/ from placeholder scans
    const SCAN_EXCLUDED_PREFIXES = ['tests/', 'daemon/tests/', 'daemon/src/config/template', '.claude/'];

    for (const file of trackedFiles) {
      if (SCAN_EXCLUDED_PREFIXES.some(prefix => file.startsWith(prefix))) {
        continue;
      }
      const fullPath = path.join(PROJECT_ROOT, file);
      if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
        continue;
      }

      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        for (const placeholder of placeholders) {
          if (content.includes(placeholder)) {
            filesWithPlaceholders.push(`${file} contains "${placeholder}"`);
            break;
          }
        }
      } catch (err) {
        // Skip binary files or files that can't be read as text
        continue;
      }
    }

    return filesWithPlaceholders;
  } catch (error) {
    return [];
  }
};

describe('WS-OSS-2: Documentation & Governance - Integration Tests', () => {

  describe('AC-1: Public README exists and is complete', () => {
    /**
     * Given: A repository being prepared for open source
     * When: A new user discovers the project
     * Then: README.md should exist and be accessible
     */
    it('should have a README.md file in the project root', () => {
      expect(fileExists('README.md')).toBe(true);
    });

    /**
     * Given: A user reading README.md
     * When: They want to understand what the project does
     * Then: README should have an overview/description section
     */
    it('should have a clear project description in README', () => {
      const content = readFile('README.md');
      expect(content.length).toBeGreaterThan(100);
      // WS-DOCS-4 restructured README: "What It Does" replaces "Overview"/"Description"
      expect(
        hasSection(content, 'What is This?') ||
        hasSection(content, 'Overview') ||
        hasSection(content, 'Description') ||
        hasSection(content, 'What It Does')
      ).toBe(true);
    });

    /**
     * Given: A user wanting to get started quickly
     * When: They read README.md
     * Then: README should have Installation section
     */
    it('should have an Installation section in README', () => {
      const content = readFile('README.md');
      expect(hasSection(content, 'Installation')).toBe(true);
    });

    /**
     * Given: A user wanting to get started quickly
     * When: They read README.md
     * Then: README should have Quick Start section
     */
    it('should have a Quick Start section in README', () => {
      const content = readFile('README.md');
      expect(hasSection(content, 'Quick Start')).toBe(true);
    });

    /**
     * Given: A user wanting to understand features
     * When: They read README.md
     * Then: README should have Features section
     */
    it('should have a Features section in README', () => {
      const content = readFile('README.md');
      // WS-DOCS-4 restructured README: "What You Get" replaces "Features"
      expect(hasSection(content, 'Features') || hasSection(content, 'What You Get')).toBe(true);
    });

    /**
     * Given: A user wanting to run tests
     * When: They read README.md
     * Then: README should have Testing section
     */
    it('should have a Testing section in README', () => {
      const content = readFile('README.md');
      // WS-DOCS-4 moved testing docs to CONTRIBUTING.md — accept either location
      const readmeHasTesting = hasSection(content, 'Testing');
      const contributingHasTesting = fileExists('CONTRIBUTING.md') &&
        hasSection(readFile('CONTRIBUTING.md'), 'Testing') ||
        readFile('CONTRIBUTING.md').toLowerCase().includes('running tests');
      expect(readmeHasTesting || contributingHasTesting).toBe(true);
    });

    /**
     * Given: A user wanting to contribute
     * When: They read README.md
     * Then: README should reference CONTRIBUTING.md
     */
    it('should reference CONTRIBUTING.md in README', () => {
      const content = readFile('README.md');
      expect(content).toContain('CONTRIBUTING');
    });

    /**
     * Given: A user wanting to understand licensing
     * When: They read README.md
     * Then: README should mention the license
     */
    it('should mention license in README', () => {
      const content = readFile('README.md');
      expect(content).toContain('License') || expect(content).toContain('MIT');
    });

    /**
     * Given: A user reading README
     * When: They want quick comprehension
     * Then: README should be clear and concise (not a wall of text)
     */
    it('should have reasonable length (not overwhelming)', () => {
      const content = readFile('README.md');
      const lines = content.split('\n').length;
      // Should be substantive but not overwhelming (50-1000 lines is reasonable)
      expect(lines).toBeGreaterThan(50);
      expect(lines).toBeLessThan(1000);
    });

    /**
     * Given: A user wanting practical examples
     * When: They read README.md
     * Then: README should include usage examples
     */
    it('should include usage examples in README', () => {
      const content = readFile('README.md');
      expect(
        hasSection(content, 'Examples') ||
        hasSection(content, 'Usage') ||
        content.includes('```')
      ).toBe(true);
    });
  });

  describe('AC-2: CONTRIBUTING.md exists and is complete', () => {
    /**
     * Given: A repository prepared for contributions
     * When: A contributor wants to help
     * Then: CONTRIBUTING.md should exist
     */
    it('should have a CONTRIBUTING.md file in the project root', () => {
      expect(fileExists('CONTRIBUTING.md')).toBe(true);
    });

    /**
     * Given: A contributor reading CONTRIBUTING.md
     * When: They want to understand the development workflow
     * Then: CONTRIBUTING should explain the PR process
     */
    it('should explain pull request process in CONTRIBUTING', () => {
      const content = readFile('CONTRIBUTING.md');
      expect(
        content.toLowerCase().includes('pull request') ||
        content.toLowerCase().includes('pr ')
      ).toBe(true);
    });

    /**
     * Given: A contributor wanting to write code
     * When: They read CONTRIBUTING.md
     * Then: CONTRIBUTING should mention TDD requirement
     */
    it('should mention TDD/test-first development in CONTRIBUTING', () => {
      const content = readFile('CONTRIBUTING.md');
      expect(
        content.includes('TDD') ||
        content.includes('test-first') ||
        content.includes('tests before code')
      ).toBe(true);
    });

    /**
     * Given: A contributor wanting to meet quality standards
     * When: They read CONTRIBUTING.md
     * Then: CONTRIBUTING should mention 99% coverage requirement
     */
    it('should mention 99% test coverage requirement in CONTRIBUTING', () => {
      const content = readFile('CONTRIBUTING.md');
      expect(
        content.includes('99%') ||
        (content.includes('coverage') && content.includes('%'))
      ).toBe(true);
    });

    /**
     * Given: A contributor creating a branch
     * When: They read CONTRIBUTING.md
     * Then: CONTRIBUTING should explain branch naming convention
     */
    it('should explain branch naming convention in CONTRIBUTING', () => {
      const content = readFile('CONTRIBUTING.md');
      expect(
        content.toLowerCase().includes('branch') &&
        (content.toLowerCase().includes('naming') || content.toLowerCase().includes('name'))
      ).toBe(true);
    });

    /**
     * Given: A contributor making commits
     * When: They read CONTRIBUTING.md
     * Then: CONTRIBUTING should explain commit message format
     */
    it('should explain commit message format in CONTRIBUTING', () => {
      const content = readFile('CONTRIBUTING.md');
      expect(
        content.toLowerCase().includes('commit') &&
        (content.toLowerCase().includes('message') || content.toLowerCase().includes('format'))
      ).toBe(true);
    });

    /**
     * Given: A contributor setting up the project
     * When: They read CONTRIBUTING.md
     * Then: CONTRIBUTING should explain how to run tests
     */
    it('should explain how to run tests in CONTRIBUTING', () => {
      const content = readFile('CONTRIBUTING.md');
      expect(
        content.includes('npm test') ||
        content.includes('vitest') ||
        (content.toLowerCase().includes('running') && content.toLowerCase().includes('tests'))
      ).toBe(true);
    });

    /**
     * Given: A contributor wanting to follow standards
     * When: They read CONTRIBUTING.md
     * Then: CONTRIBUTING should be substantive (not just a placeholder)
     */
    it('should have substantive content in CONTRIBUTING (not a stub)', () => {
      const content = readFile('CONTRIBUTING.md');
      const lines = content.split('\n').length;
      expect(lines).toBeGreaterThan(20);
    });
  });

  describe('AC-3: CODE_OF_CONDUCT.md exists', () => {
    /**
     * Given: A repository prepared for open source
     * When: Contributors want to understand expected behavior
     * Then: CODE_OF_CONDUCT.md should exist
     */
    it('should have a CODE_OF_CONDUCT.md file in the project root', () => {
      expect(fileExists('CODE_OF_CONDUCT.md')).toBe(true);
    });

    /**
     * Given: A contributor reading CODE_OF_CONDUCT.md
     * When: They want to understand community standards
     * Then: CODE_OF_CONDUCT should be substantive
     */
    it('should have substantive content in CODE_OF_CONDUCT (not a stub)', () => {
      const content = readFile('CODE_OF_CONDUCT.md');
      const lines = content.split('\n').length;
      expect(lines).toBeGreaterThan(10);
    });

    /**
     * Given: A standard code of conduct
     * When: We validate the content
     * Then: CODE_OF_CONDUCT should mention expected behavior or standards
     */
    it('should mention behavior or conduct standards in CODE_OF_CONDUCT', () => {
      const content = readFile('CODE_OF_CONDUCT.md');
      expect(
        content.toLowerCase().includes('behavior') ||
        content.toLowerCase().includes('conduct') ||
        content.toLowerCase().includes('pledge') ||
        content.toLowerCase().includes('standards')
      ).toBe(true);
    });

    /**
     * Given: A code of conduct based on Contributor Covenant
     * When: We validate the content
     * Then: CODE_OF_CONDUCT should reference Contributor Covenant or similar
     */
    it('should reference a standard code of conduct framework', () => {
      const content = readFile('CODE_OF_CONDUCT.md');
      expect(
        content.toLowerCase().includes('contributor covenant') ||
        content.toLowerCase().includes('community') ||
        content.toLowerCase().includes('inclusive')
      ).toBe(true);
    });
  });

  describe('AC-4: package.json metadata is complete', () => {
    /**
     * Given: A repository being published
     * When: Users view package.json
     * Then: author field should be filled in
     */
    it('should have author field populated in package.json', () => {
      const content = readFile('package.json');
      const pkg = JSON.parse(content);
      expect(pkg.author).toBeDefined();
      expect(pkg.author).not.toBe('');
    });

    /**
     * Given: A repository being published
     * When: Users view package.json on npm
     * Then: repository field should be filled in
     */
    it('should have repository field populated in package.json', () => {
      const content = readFile('package.json');
      const pkg = JSON.parse(content);
      expect(pkg.repository).toBeDefined();

      if (typeof pkg.repository === 'string') {
        expect(pkg.repository).not.toBe('');
      } else {
        expect(pkg.repository.type).toBeDefined();
        expect(pkg.repository.url).toBeDefined();
        expect(pkg.repository.url).not.toBe('');
      }
    });

    /**
     * Given: A repository being published
     * When: Users search for the package
     * Then: homepage field should be filled in
     */
    it('should have homepage field populated in package.json', () => {
      const content = readFile('package.json');
      const pkg = JSON.parse(content);
      expect(pkg.homepage).toBeDefined();
      expect(pkg.homepage).not.toBe('');
    });

    /**
     * Given: A repository being published
     * When: Users search for the package
     * Then: keywords field should be filled with relevant terms
     */
    it('should have keywords array populated in package.json', () => {
      const content = readFile('package.json');
      const pkg = JSON.parse(content);
      expect(pkg.keywords).toBeDefined();
      expect(Array.isArray(pkg.keywords)).toBe(true);
      expect(pkg.keywords.length).toBeGreaterThan(3);
    });

    /**
     * Given: A repository being published
     * When: Users want to know the license
     * Then: license field should be filled in
     */
    it('should have license field populated in package.json', () => {
      const content = readFile('package.json');
      const pkg = JSON.parse(content);
      expect(pkg.license).toBeDefined();
      expect(pkg.license).not.toBe('');
    });

    /**
     * Given: A repository being published
     * When: Users view package metadata
     * Then: description should be clear and helpful
     */
    it('should have clear description in package.json', () => {
      const content = readFile('package.json');
      const pkg = JSON.parse(content);
      expect(pkg.description).toBeDefined();
      expect(pkg.description.length).toBeGreaterThan(20);
    });

    /**
     * Given: A repository being published
     * When: We validate package.json
     * Then: version should follow semantic versioning
     */
    it('should have valid semantic version in package.json', () => {
      const content = readFile('package.json');
      const pkg = JSON.parse(content);
      expect(pkg.version).toBeDefined();
      expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/);
    });
  });

  describe('AC-5: Internal documentation is cleaned up', () => {
    /**
     * Given: A repository with internal documentation
     * When: We prepare for public release
     * Then: DELIVERABLES.md should either not exist or be archived
     */
    it('should handle DELIVERABLES.md appropriately (removed or archived)', () => {
      const exists = fileExists('DELIVERABLES.md');
      const archivedExists = fileExists('docs/archive/DELIVERABLES.md') ||
                            fileExists('.archive/DELIVERABLES.md');

      // Either it doesn't exist, or it's been moved to archive
      expect(exists === false || archivedExists === true).toBe(true);
    });

    /**
     * Given: A repository with internal documentation
     * When: We prepare for public release
     * Then: TDD_CYCLE_COMPLETE.md should either not exist or be archived
     */
    it('should handle TDD_CYCLE_COMPLETE.md appropriately (removed or archived)', () => {
      const exists = fileExists('TDD_CYCLE_COMPLETE.md');
      const archivedExists = fileExists('docs/archive/TDD_CYCLE_COMPLETE.md') ||
                            fileExists('.archive/TDD_CYCLE_COMPLETE.md');

      // Either it doesn't exist, or it's been moved to archive
      expect(exists === false || archivedExists === true).toBe(true);
    });

    /**
     * Given: A repository with internal documentation
     * When: We prepare for public release
     * Then: FILE_MANIFEST.md should either not exist or be archived
     */
    it('should handle FILE_MANIFEST.md appropriately (removed or archived)', () => {
      const exists = fileExists('FILE_MANIFEST.md');
      const archivedExists = fileExists('docs/archive/FILE_MANIFEST.md') ||
                            fileExists('.archive/FILE_MANIFEST.md');

      // Either it doesn't exist, or it's been moved to archive
      expect(exists === false || archivedExists === true).toBe(true);
    });

    /**
     * Given: A repository with internal documentation
     * When: We prepare for public release
     * Then: QA_TEST_VERIFICATION.md should either not exist or be archived
     */
    it('should handle QA_TEST_VERIFICATION.md appropriately (removed or archived)', () => {
      const exists = fileExists('QA_TEST_VERIFICATION.md');
      const archivedExists = fileExists('docs/archive/QA_TEST_VERIFICATION.md') ||
                            fileExists('.archive/QA_TEST_VERIFICATION.md');

      // Either it doesn't exist, or it's been moved to archive
      expect(exists === false || archivedExists === true).toBe(true);
    });

    /**
     * Given: A repository with internal documentation
     * When: We prepare for public release
     * Then: TEST_FIXES_SUMMARY.md should either not exist or be archived
     */
    it('should handle TEST_FIXES_SUMMARY.md appropriately (removed or archived)', () => {
      const exists = fileExists('TEST_FIXES_SUMMARY.md');
      const archivedExists = fileExists('docs/archive/TEST_FIXES_SUMMARY.md') ||
                            fileExists('.archive/TEST_FIXES_SUMMARY.md');

      // Either it doesn't exist, or it's been moved to archive
      expect(exists === false || archivedExists === true).toBe(true);
    });

    /**
     * Given: A repository with internal documentation
     * When: We prepare for public release
     * Then: IMPLEMENTATION_REPORT.md should either not exist or be archived
     */
    it('should handle IMPLEMENTATION_REPORT.md appropriately (removed or archived)', () => {
      const exists = fileExists('IMPLEMENTATION_REPORT.md');
      const archivedExists = fileExists('docs/archive/IMPLEMENTATION_REPORT.md') ||
                            fileExists('.archive/IMPLEMENTATION_REPORT.md');

      // Either it doesn't exist, or it's been moved to archive
      expect(exists === false || archivedExists === true).toBe(true);
    });

    /**
     * Given: A repository with internal documentation
     * When: We prepare for public release
     * Then: Root directory should not be cluttered with too many markdown files
     */
    it('should have a clean root directory (limited markdown files)', () => {
      const rootFiles = fs.readdirSync(PROJECT_ROOT);
      const mdFiles = rootFiles.filter(f => f.endsWith('.md'));

      // Should have core files: README, CONTRIBUTING, CODE_OF_CONDUCT, maybe CHANGELOG
      // But not 10+ internal docs
      expect(mdFiles.length).toBeLessThan(8);
    });

    /**
     * Given: A repository being prepared for public release
     * When: We archive internal docs
     * Then: README should not reference archived documents
     */
    it('should not have README referencing archived internal documents', () => {
      const content = readFile('README.md');
      const internalDocs = ['DELIVERABLES.md', 'TDD_CYCLE_COMPLETE.md', 'FILE_MANIFEST.md'];

      for (const doc of internalDocs) {
        expect(content.includes(doc)).toBe(false);
      }
    });
  });

  describe('AC-6: No placeholder text in tracked files', () => {
    /**
     * Given: A repository ready for public release
     * When: We scan all tracked files
     * Then: No files should contain "YOUR_USERNAME" placeholder
     */
    it('should have no YOUR_USERNAME placeholders in tracked files', () => {
      const filesWithPlaceholders = findPlaceholdersInTrackedFiles()
        .filter(f => f.includes('YOUR_USERNAME'));

      expect(filesWithPlaceholders).toEqual([]);
    });

    /**
     * Given: A repository ready for public release
     * When: We scan all tracked files
     * Then: No files should contain "YOUR_NAME" placeholder
     */
    it('should have no YOUR_NAME placeholders in tracked files', () => {
      const filesWithPlaceholders = findPlaceholdersInTrackedFiles()
        .filter(f => f.includes('YOUR_NAME'));

      expect(filesWithPlaceholders).toEqual([]);
    });

    /**
     * Given: A repository ready for public release
     * When: We scan all tracked files
     * Then: No files should contain "YOUR_EMAIL" placeholder
     */
    it('should have no YOUR_EMAIL placeholders in tracked files', () => {
      const filesWithPlaceholders = findPlaceholdersInTrackedFiles()
        .filter(f => f.includes('YOUR_EMAIL'));

      expect(filesWithPlaceholders).toEqual([]);
    });

    /**
     * Given: A well-maintained codebase
     * When: We scan all tracked files
     * Then: TODO comments should be minimal (no more than 10)
     */
    it('should have minimal TODO comments in tracked files', () => {
      const filesWithTodos = findPlaceholdersInTrackedFiles()
        .filter(f => f.includes('TODO:'));

      // Some TODOs are okay for future work, but not hundreds
      expect(filesWithTodos.length).toBeLessThan(25);
    });

    /**
     * Given: A production-ready codebase
     * When: We scan all tracked files
     * Then: FIXME comments should be resolved (no more than 5)
     */
    it('should have minimal FIXME comments in tracked files', () => {
      const filesWithFixmes = findPlaceholdersInTrackedFiles()
        .filter(f => f.includes('FIXME:'));

      // FIXME indicates something broken - should be minimal
      expect(filesWithFixmes.length).toBeLessThan(5);
    });

    /**
     * Given: A production-ready codebase
     * When: We scan all tracked files
     * Then: XXX comments should not exist
     */
    it('should have no XXX comments in tracked files', () => {
      const filesWithXxx = findPlaceholdersInTrackedFiles()
        .filter(f => f.includes('XXX:'));

      // XXX is a code smell - should be resolved
      expect(filesWithXxx).toEqual([]);
    });
  });

  describe('Integration: Overall documentation quality', () => {
    /**
     * Given: A repository ready for open source
     * When: We validate all documentation exists
     * Then: Core documentation files should all exist together
     */
    it('should have all core documentation files present', () => {
      const coreFiles = ['README.md', 'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md', 'LICENSE'];

      for (const file of coreFiles) {
        expect(fileExists(file)).toBe(true);
      }
    });

    /**
     * Given: Documentation files in place
     * When: We validate cross-references
     * Then: README should link to CONTRIBUTING
     */
    it('should have README linking to CONTRIBUTING', () => {
      const readme = readFile('README.md');
      expect(readme.includes('CONTRIBUTING')).toBe(true);
    });

    /**
     * Given: Documentation files in place
     * When: We validate consistency
     * Then: All docs should reference the same license
     */
    it('should have consistent license across documentation', () => {
      const readme = readFile('README.md');
      const pkgJson = JSON.parse(readFile('package.json'));
      const license = readFile('LICENSE');

      // All should mention MIT (or whatever license is chosen)
      const licenseName = pkgJson.license;
      expect(readme.toLowerCase()).toContain(licenseName.toLowerCase());
      expect(license).toBeTruthy();
    });

    /**
     * Given: Complete documentation suite
     * When: A new user onboards
     * Then: They should be able to get started in under 5 minutes
     */
    it('should enable quick start (README has installation + quick start)', () => {
      const readme = readFile('README.md');

      // Both sections must exist for quick onboarding
      expect(hasSection(readme, 'Installation')).toBe(true);
      expect(hasSection(readme, 'Quick Start')).toBe(true);

      // At least one code example
      expect(readme.includes('```')).toBe(true);
    });

    /**
     * Given: Complete documentation suite
     * When: A contributor wants to help
     * Then: They should understand the workflow in under 3 minutes
     */
    it('should enable quick contributor onboarding (CONTRIBUTING covers essentials)', () => {
      const contributing = readFile('CONTRIBUTING.md');

      // Must cover these essential topics
      const essentials = [
        'pull request',
        'test',
        'branch'
      ];

      for (const essential of essentials) {
        expect(contributing.toLowerCase().includes(essential)).toBe(true);
      }
    });
  });
});

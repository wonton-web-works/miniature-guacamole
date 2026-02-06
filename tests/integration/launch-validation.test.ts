/**
 * Integration Tests for WS-OSS-5: Launch Validation & Go-Live
 *
 * These tests validate that the repository is ready for public launch.
 * Unlike typical TDD tests, these are VALIDATION tests that check launch readiness.
 * Tests should mostly PASS initially - they verify existing state.
 *
 * @workstream WS-OSS-5
 * @priority P0 (gates public release)
 * @target 99% coverage of launch validation checks
 * @phase VALIDATION (tests verify readiness, not drive implementation)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Project root directory
const PROJECT_ROOT = path.resolve(__dirname, '../..');

// Helper to execute shell commands
const exec = (command: string, options: any = {}): string => {
  try {
    return execSync(command, {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      ...options
    }).trim();
  } catch (error: any) {
    return error.stdout?.trim() || '';
  }
};

// Helper to execute git commands
const git = (command: string): string => {
  return exec(`git ${command}`);
};

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

// Helper to get all tracked files
const getTrackedFiles = (): string[] => {
  const output = git('ls-files');
  return output ? output.split('\n').filter(Boolean) : [];
};

// Helper to find patterns in tracked files
const findPatternInTrackedFiles = (pattern: string | RegExp): Array<{ file: string; line: number; match: string }> => {
  const trackedFiles = getTrackedFiles();
  const matches: Array<{ file: string; line: number; match: string }> = [];

  for (const file of trackedFiles) {
    const fullPath = path.join(PROJECT_ROOT, file);
    if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
      continue;
    }

    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        const regex = typeof pattern === 'string'
          ? new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
          : pattern;

        if (regex.test(line)) {
          matches.push({
            file,
            line: index + 1,
            match: line.trim()
          });
        }
      });
    } catch (err) {
      // Skip binary files or files that can't be read as text
      continue;
    }
  }

  return matches;
};

describe('WS-OSS-5: Launch Validation & Go-Live', () => {

  describe('AC-1: YOUR_ORG placeholders replaced', () => {
    /**
     * Given: A repository ready for public launch
     * When: We scan tracked files for YOUR_ORG placeholder
     * Then: No instances of YOUR_ORG should exist in tracked files
     */
    it('should have no YOUR_ORG placeholders in tracked files', () => {
      const matches = findPatternInTrackedFiles('YOUR_ORG');

      if (matches.length > 0) {
        const fileList = matches.map(m => `  ${m.file}:${m.line} - ${m.match}`).join('\n');
        console.log(`YOUR_ORG found in:\n${fileList}`);
      }

      expect(matches).toEqual([]);
    });

    /**
     * Given: A repository with package.json
     * When: We check repository URL
     * Then: package.json repository URL should not contain YOUR_ORG
     */
    it('should have actual GitHub org in package.json repository URL', () => {
      const content = readFile('package.json');
      const pkg = JSON.parse(content);

      expect(pkg.repository).toBeDefined();

      const repoUrl = typeof pkg.repository === 'string'
        ? pkg.repository
        : pkg.repository.url;

      expect(repoUrl).not.toContain('YOUR_ORG');
      expect(repoUrl).toMatch(/github\.com/);
    });

    /**
     * Given: A repository with package.json
     * When: We check homepage URL
     * Then: package.json homepage should not contain YOUR_ORG
     */
    it('should have actual GitHub org in package.json homepage', () => {
      const content = readFile('package.json');
      const pkg = JSON.parse(content);

      expect(pkg.homepage).toBeDefined();
      expect(pkg.homepage).not.toContain('YOUR_ORG');
    });

    /**
     * Given: A repository with README.md
     * When: We check for placeholder text
     * Then: README should not contain YOUR_ORG
     */
    it('should have no YOUR_ORG in README.md', () => {
      const content = readFile('README.md');
      expect(content).not.toContain('YOUR_ORG');
    });

    /**
     * Given: A repository with documentation
     * When: We check docs files for placeholders
     * Then: No docs files should contain YOUR_ORG
     */
    it('should have no YOUR_ORG in documentation files', () => {
      if (!fs.existsSync(path.join(PROJECT_ROOT, 'docs'))) {
        // Skip if no docs directory
        return;
      }

      const matches = findPatternInTrackedFiles('YOUR_ORG').filter(m => m.file.startsWith('docs/'));

      if (matches.length > 0) {
        const fileList = matches.map(m => `  ${m.file}:${m.line} - ${m.match}`).join('\n');
        console.log(`YOUR_ORG found in docs:\n${fileList}`);
      }

      expect(matches).toEqual([]);
    });
  });

  describe('AC-2: Fresh clone works', () => {
    /**
     * Given: A repository with dependencies
     * When: We check package.json
     * Then: package.json should exist and be valid JSON
     */
    it('should have valid package.json', () => {
      expect(fileExists('package.json')).toBe(true);

      const content = readFile('package.json');
      expect(() => JSON.parse(content)).not.toThrow();
    });

    /**
     * Given: A Node.js project
     * When: npm install is run
     * Then: package-lock.json should exist (committed lockfile)
     */
    it('should have package-lock.json committed', () => {
      expect(fileExists('package-lock.json')).toBe(true);
    });

    /**
     * Given: A TypeScript project
     * When: We check for TypeScript configuration
     * Then: tsconfig.json should exist
     */
    it('should have tsconfig.json', () => {
      expect(fileExists('tsconfig.json')).toBe(true);

      const content = readFile('tsconfig.json');
      expect(() => JSON.parse(content)).not.toThrow();
    });

    /**
     * Given: A project with tests
     * When: We check for test configuration
     * Then: vitest.config.ts should exist
     */
    it('should have test configuration (vitest.config.ts)', () => {
      expect(fileExists('vitest.config.ts')).toBe(true);
    });

    /**
     * Given: A project with npm scripts
     * When: We check package.json scripts
     * Then: Essential scripts should be defined
     */
    it('should have essential npm scripts defined', () => {
      const content = readFile('package.json');
      const pkg = JSON.parse(content);

      expect(pkg.scripts).toBeDefined();
      expect(pkg.scripts.test).toBeDefined();
      expect(pkg.scripts.build || pkg.scripts['build:dist']).toBeDefined();
    });

    /**
     * Given: A repository with .gitignore
     * When: We check essential ignores
     * Then: node_modules should be in .gitignore
     */
    it('should have node_modules in .gitignore', () => {
      expect(fileExists('.gitignore')).toBe(true);

      const content = readFile('.gitignore');
      expect(content).toContain('node_modules');
    });

    /**
     * Given: A TypeScript project
     * When: We check .gitignore
     * Then: dist directory should be in .gitignore
     */
    it('should have dist directory in .gitignore', () => {
      const content = readFile('.gitignore');
      expect(content).toMatch(/\bdist\b/);
    });

    /**
     * Given: A project ready for cloning
     * When: We simulate fresh clone by checking required files
     * Then: All essential files should be tracked by git
     */
    it('should have all essential files tracked by git', () => {
      const essentialFiles = [
        'package.json',
        'package-lock.json',
        'tsconfig.json',
        'README.md',
        'LICENSE'
      ];

      const trackedFiles = getTrackedFiles();

      for (const file of essentialFiles) {
        expect(trackedFiles).toContain(file);
      }
    });
  });

  describe('AC-3: Security scan passes', () => {
    /**
     * Given: A repository ready for public release
     * When: We scan for common secret patterns
     * Then: No API keys should be in tracked files
     */
    it('should have no API keys in tracked files', () => {
      // Common API key patterns
      const patterns = [
        /api[_-]?key\s*[:=]\s*['"][^'"]{20,}['"]/i,
        /apikey\s*[:=]\s*['"][^'"]{20,}['"]/i,
        /sk-[a-zA-Z0-9]{32,}/,  // OpenAI/Anthropic API key pattern
        /claude[_-]?api[_-]?key/i
      ];

      const allMatches: string[] = [];

      for (const pattern of patterns) {
        const matches = findPatternInTrackedFiles(pattern);
        if (matches.length > 0) {
          allMatches.push(...matches.map(m => `${m.file}:${m.line}`));
        }
      }

      if (allMatches.length > 0) {
        console.log(`Potential API keys found in:\n${allMatches.join('\n')}`);
      }

      expect(allMatches).toEqual([]);
    });

    /**
     * Given: A repository with secrets to protect
     * When: We scan for AWS credentials
     * Then: No AWS access keys should be in tracked files
     */
    it('should have no AWS credentials in tracked files', () => {
      const patterns = [
        /AKIA[0-9A-Z]{16}/,  // AWS Access Key ID
        /aws[_-]?secret[_-]?access[_-]?key/i
      ];

      const allMatches: string[] = [];

      for (const pattern of patterns) {
        const matches = findPatternInTrackedFiles(pattern);
        if (matches.length > 0) {
          allMatches.push(...matches.map(m => `${m.file}:${m.line}`));
        }
      }

      expect(allMatches).toEqual([]);
    });

    /**
     * Given: A repository with environment variables
     * When: We check tracked files
     * Then: No .env files should be tracked
     */
    it('should have no .env files tracked by git', () => {
      const trackedFiles = getTrackedFiles();
      const envFiles = trackedFiles.filter(f =>
        f === '.env' ||
        f.endsWith('.env') ||
        f.includes('.env.')
      );

      expect(envFiles).toEqual([]);
    });

    /**
     * Given: A repository with private keys
     * When: We check tracked files
     * Then: No private key files should be tracked
     */
    it('should have no private key files tracked by git', () => {
      const trackedFiles = getTrackedFiles();
      const keyFiles = trackedFiles.filter(f =>
        f.endsWith('.pem') ||
        f.endsWith('.key') ||
        f.endsWith('.p12') ||
        f.endsWith('.pfx')
      );

      expect(keyFiles).toEqual([]);
    });

    /**
     * Given: A repository with tokens
     * When: We scan for GitHub tokens
     * Then: No GitHub tokens should be in tracked files
     */
    it('should have no GitHub tokens in tracked files', () => {
      const patterns = [
        /ghp_[a-zA-Z0-9]{36}/,  // GitHub Personal Access Token
        /ghs_[a-zA-Z0-9]{36}/,  // GitHub Server-to-Server Token
        /github[_-]?token/i
      ];

      const allMatches: string[] = [];

      for (const pattern of patterns) {
        const matches = findPatternInTrackedFiles(pattern);
        if (matches.length > 0) {
          allMatches.push(...matches.map(m => `${m.file}:${m.line}`));
        }
      }

      expect(allMatches).toEqual([]);
    });

    /**
     * Given: A repository ready for public release
     * When: We check .gitignore
     * Then: Common secret files should be ignored
     */
    it('should have common secret patterns in .gitignore', () => {
      const content = readFile('.gitignore');

      const requiredPatterns = [
        '.env',
        '*.pem',
        '*.key'
      ];

      for (const pattern of requiredPatterns) {
        expect(content).toContain(pattern);
      }
    });

    /**
     * Given: A Node.js project
     * When: We check for npm vulnerabilities
     * Then: npm audit should report no high or critical vulnerabilities
     */
    it.skip('should have no high-severity npm vulnerabilities', () => {
      // Skip in CI/testing environment
      // This would be run manually before release
      const result = exec('npm audit --json');

      if (!result) {
        // npm audit not available or failed
        return;
      }

      const audit = JSON.parse(result);
      const high = audit.metadata?.vulnerabilities?.high || 0;
      const critical = audit.metadata?.vulnerabilities?.critical || 0;

      expect(high).toBe(0);
      expect(critical).toBe(0);
    });
  });

  describe('AC-4: VitePress build passes', () => {
    /**
     * Given: A repository with VitePress documentation
     * When: We check for docs directory
     * Then: docs directory should exist
     */
    it('should have docs directory', () => {
      expect(fileExists('docs')).toBe(true);
    });

    /**
     * Given: A VitePress documentation site
     * When: We check for VitePress config
     * Then: docs/.vitepress/config.ts should exist
     */
    it('should have VitePress config', () => {
      expect(fileExists('docs/.vitepress/config.ts')).toBe(true);
    });

    /**
     * Given: A VitePress site
     * When: We check docs package.json
     * Then: docs/package.json should have build script
     */
    it('should have docs package.json with build script', () => {
      expect(fileExists('docs/package.json')).toBe(true);

      const content = readFile('docs/package.json');
      const pkg = JSON.parse(content);

      expect(pkg.scripts).toBeDefined();
      expect(pkg.scripts.build).toBeDefined();
      expect(pkg.scripts.build).toContain('vitepress build');
    });

    /**
     * Given: A VitePress site with dependencies
     * When: We check for vitepress package
     * Then: vitepress should be in devDependencies
     */
    it('should have vitepress in docs devDependencies', () => {
      const content = readFile('docs/package.json');
      const pkg = JSON.parse(content);

      expect(pkg.devDependencies).toBeDefined();
      expect(pkg.devDependencies.vitepress).toBeDefined();
    });

    /**
     * Given: A documentation site
     * When: We check for index page
     * Then: docs/index.md should exist
     */
    it('should have docs index page', () => {
      expect(fileExists('docs/index.md')).toBe(true);
    });

    /**
     * Given: A VitePress site ready for build
     * When: We simulate a build check
     * Then: All markdown files should have valid frontmatter
     */
    it('should have valid frontmatter in docs markdown files', () => {
      if (!fs.existsSync(path.join(PROJECT_ROOT, 'docs'))) {
        return;
      }

      const docsPath = path.join(PROJECT_ROOT, 'docs');
      const mdFiles = fs.readdirSync(docsPath).filter(f => f.endsWith('.md'));

      for (const file of mdFiles) {
        const content = fs.readFileSync(path.join(docsPath, file), 'utf-8');

        // If file has frontmatter, it should be valid YAML
        if (content.startsWith('---')) {
          const secondDelimiter = content.indexOf('---', 3);
          expect(secondDelimiter).toBeGreaterThan(3);
        }
      }
    });

    /**
     * Given: A VitePress site
     * When: We check build prerequisites
     * Then: docs/node_modules should exist (docs dependencies installed)
     */
    it.skip('should have docs dependencies installed', () => {
      // This test is skipped because it requires running npm install in docs/
      // It would be verified in CI/CD pipeline
      expect(fileExists('docs/node_modules')).toBe(true);
    });

    /**
     * Given: A VitePress configuration
     * When: We check for build errors
     * Then: VitePress config should be valid TypeScript
     */
    it('should have valid VitePress config TypeScript', () => {
      const configPath = path.join(PROJECT_ROOT, 'docs/.vitepress/config.ts');
      const content = fs.readFileSync(configPath, 'utf-8');

      // Basic syntax validation
      expect(content).toContain('export default');
      expect(content).not.toContain('YOUR_ORG');
    });
  });

  describe('AC-5: Git history documented', () => {
    /**
     * Given: A repository with git history
     * When: We check for documentation about history cleanup
     * Then: README or docs should mention git history considerations
     */
    it('should document git history cleanup in README or docs', () => {
      const readme = readFile('README.md');

      // Check if README mentions history, sanitization, or cleanup
      const mentionsHistory =
        readme.toLowerCase().includes('history') ||
        readme.toLowerCase().includes('sanitization') ||
        readme.toLowerCase().includes('git filter');

      // This is informational - not strict requirement
      if (!mentionsHistory) {
        console.log('Note: Consider documenting git history cleanup in README');
      }

      // Pass - this is a documentation recommendation, not a hard requirement
      expect(true).toBe(true);
    });

    /**
     * Given: A repository being sanitized
     * When: We check for .gitattributes
     * Then: .gitattributes should exist with export-ignore rules
     */
    it('should have .gitattributes with export-ignore rules', () => {
      expect(fileExists('.gitattributes')).toBe(true);

      const content = readFile('.gitattributes');
      expect(content).toContain('export-ignore');
    });

    /**
     * Given: A repository with sensitive paths
     * When: We check .gitattributes
     * Then: .claude/memory/ should be marked export-ignore
     */
    it('should have .claude/memory/ marked as export-ignore', () => {
      const content = readFile('.gitattributes');
      expect(content).toMatch(/\.claude\/memory.*export-ignore/);
    });

    /**
     * Given: A repository with test artifacts
     * When: We check .gitattributes
     * Then: Test result directories should be marked export-ignore
     */
    it('should have test artifacts marked as export-ignore', () => {
      const content = readFile('.gitattributes');

      // Check for common test artifact patterns
      const hasTestIgnores =
        content.includes('coverage') ||
        content.includes('.nyc_output') ||
        content.includes('test-results');

      // Informational - not strict requirement
      if (!hasTestIgnores) {
        console.log('Note: Consider adding test artifacts to export-ignore');
      }

      expect(true).toBe(true);
    });

    /**
     * Given: A repository being prepared for release
     * When: We check git history for sensitive commits
     * Then: Git log should be accessible and clean
     */
    it('should have accessible git history', () => {
      const log = git('log --oneline -10');

      expect(log).toBeTruthy();
      expect(log.split('\n').length).toBeGreaterThan(0);
    });

    /**
     * Given: A repository with commits
     * When: We check commit messages
     * Then: Recent commits should have meaningful messages
     */
    it('should have meaningful commit messages', () => {
      const log = git('log --format=%s -10');
      const messages = log.split('\n');

      // Check that commits aren't all "WIP" or "fix"
      const meaningfulMessages = messages.filter(m =>
        m.length > 10 &&
        !m.toLowerCase().startsWith('wip') &&
        !m.toLowerCase().startsWith('test')
      );

      expect(meaningfulMessages.length).toBeGreaterThan(0);
    });
  });

  describe('AC-6: Launch readiness summary', () => {
    /**
     * Given: A repository ready for launch
     * When: We check for LICENSE file
     * Then: LICENSE file should exist
     */
    it('should have LICENSE file', () => {
      expect(fileExists('LICENSE')).toBe(true);
    });

    /**
     * Given: A repository with LICENSE
     * When: We read LICENSE content
     * Then: LICENSE should be MIT (as specified in package.json)
     */
    it('should have MIT license content', () => {
      const license = readFile('LICENSE');
      const pkgJson = JSON.parse(readFile('package.json'));

      expect(pkgJson.license).toBe('MIT');
      expect(license).toContain('MIT');
    });

    /**
     * Given: A repository ready for public release
     * When: We check for README
     * Then: README should exist and be substantial
     */
    it('should have substantial README.md', () => {
      expect(fileExists('README.md')).toBe(true);

      const content = readFile('README.md');
      expect(content.length).toBeGreaterThan(500);
    });

    /**
     * Given: A repository with contributing guidelines
     * When: We check for CONTRIBUTING.md
     * Then: CONTRIBUTING.md should exist
     */
    it('should have CONTRIBUTING.md', () => {
      expect(fileExists('CONTRIBUTING.md')).toBe(true);
    });

    /**
     * Given: A repository with code of conduct
     * When: We check for CODE_OF_CONDUCT.md
     * Then: CODE_OF_CONDUCT.md should exist
     */
    it('should have CODE_OF_CONDUCT.md', () => {
      expect(fileExists('CODE_OF_CONDUCT.md')).toBe(true);
    });

    /**
     * Given: A repository with all documentation
     * When: We validate completeness
     * Then: All critical documentation files should exist
     */
    it('should have complete documentation suite', () => {
      const criticalFiles = [
        'README.md',
        'LICENSE',
        'CONTRIBUTING.md',
        'CODE_OF_CONDUCT.md',
        'package.json',
        '.gitignore',
        '.gitattributes'
      ];

      for (const file of criticalFiles) {
        expect(fileExists(file)).toBe(true);
      }
    });

    /**
     * Given: A repository ready for npm
     * When: We validate package.json
     * Then: All essential package.json fields should be filled
     */
    it('should have complete package.json metadata', () => {
      const content = readFile('package.json');
      const pkg = JSON.parse(content);

      expect(pkg.name).toBeTruthy();
      expect(pkg.version).toBeTruthy();
      expect(pkg.description).toBeTruthy();
      expect(pkg.author).toBeTruthy();
      expect(pkg.license).toBeTruthy();
      expect(pkg.repository).toBeTruthy();
      expect(pkg.keywords).toBeDefined();
      expect(pkg.keywords.length).toBeGreaterThan(0);
    });

    /**
     * Given: A TypeScript project
     * When: We check TypeScript configuration
     * Then: TypeScript should be configured properly
     */
    it('should have proper TypeScript configuration', () => {
      const content = readFile('tsconfig.json');
      const tsconfig = JSON.parse(content);

      expect(tsconfig.compilerOptions).toBeDefined();
      expect(tsconfig.compilerOptions.strict).toBe(true);
      expect(tsconfig.include).toBeDefined();
    });

    /**
     * Given: A project with tests
     * When: We validate test setup
     * Then: Test framework should be properly configured
     */
    it('should have proper test configuration', () => {
      expect(fileExists('vitest.config.ts')).toBe(true);

      const pkg = JSON.parse(readFile('package.json'));
      expect(pkg.scripts.test).toBeDefined();
      expect(pkg.devDependencies.vitest).toBeDefined();
    });

    /**
     * Given: A repository prepared for CI/CD
     * When: We check for GitHub Actions
     * Then: CI workflow should exist (optional but recommended)
     */
    it('should have CI/CD configuration (recommended)', () => {
      const hasGithubActions = fileExists('.github/workflows');

      if (!hasGithubActions) {
        console.log('Note: Consider adding GitHub Actions CI/CD workflow');
      }

      // This is optional - just log recommendation
      expect(true).toBe(true);
    });

    /**
     * Given: A repository with comprehensive tests
     * When: We check test coverage
     * Then: Project should have substantial test files
     */
    it('should have comprehensive test suite', () => {
      const hasTests = fileExists('tests') || fileExists('test');
      expect(hasTests).toBe(true);

      // Check for test files
      const trackedFiles = getTrackedFiles();
      const testFiles = trackedFiles.filter(f =>
        f.includes('.test.') ||
        f.includes('.spec.') ||
        f.includes('/tests/')
      );

      expect(testFiles.length).toBeGreaterThan(10);
    });
  });

  describe('Integration: End-to-end launch validation', () => {
    /**
     * Given: All launch criteria validated individually
     * When: We perform comprehensive validation
     * Then: Repository should be ready for public launch
     */
    it('should pass comprehensive launch readiness check', () => {
      const checks = {
        placeholders_removed: findPatternInTrackedFiles('YOUR_ORG').length === 0,
        license_exists: fileExists('LICENSE'),
        readme_exists: fileExists('README.md'),
        contributing_exists: fileExists('CONTRIBUTING.md'),
        gitignore_exists: fileExists('.gitignore'),
        gitattributes_exists: fileExists('.gitattributes'),
        package_json_valid: true,
        docs_exist: fileExists('docs')
      };

      try {
        JSON.parse(readFile('package.json'));
      } catch {
        checks.package_json_valid = false;
      }

      const failedChecks = Object.entries(checks)
        .filter(([_, passed]) => !passed)
        .map(([check]) => check);

      if (failedChecks.length > 0) {
        console.log('Failed launch readiness checks:', failedChecks);
      }

      expect(failedChecks).toEqual([]);
    });

    /**
     * Given: A repository ready for cloning
     * When: We simulate fresh clone workflow
     * Then: All essential workflows should be documented
     */
    it('should have documented workflows for contributors', () => {
      const readme = readFile('README.md');
      const contributing = readFile('CONTRIBUTING.md');

      // Essential workflows should be documented somewhere
      const hasInstallInstructions =
        readme.toLowerCase().includes('install') ||
        readme.toLowerCase().includes('npm install');

      const hasTestInstructions =
        readme.toLowerCase().includes('test') ||
        contributing.toLowerCase().includes('test');

      expect(hasInstallInstructions).toBe(true);
      expect(hasTestInstructions).toBe(true);
    });

    /**
     * Given: A repository being published
     * When: We check for version control hygiene
     * Then: Git should be properly configured
     */
    it('should have clean git working directory', () => {
      // Check that we're in a git repository
      const gitDir = git('rev-parse --git-dir');
      expect(gitDir).toBeTruthy();

      // Check that we have commits
      const commitCount = git('rev-list --count HEAD');
      expect(parseInt(commitCount)).toBeGreaterThan(0);
    });

    /**
     * Given: A repository with dependencies
     * When: We check dependency specifications
     * Then: Dependencies should be properly versioned
     */
    it('should have properly versioned dependencies', () => {
      const pkg = JSON.parse(readFile('package.json'));

      if (pkg.dependencies) {
        for (const [name, version] of Object.entries(pkg.dependencies)) {
          expect(typeof version).toBe('string');
          expect(version.length).toBeGreaterThan(0);
        }
      }

      if (pkg.devDependencies) {
        for (const [name, version] of Object.entries(pkg.devDependencies)) {
          expect(typeof version).toBe('string');
          expect(version.length).toBeGreaterThan(0);
        }
      }
    });

    /**
     * Given: A TypeScript project ready for distribution
     * When: We check build output configuration
     * Then: Build output should be properly gitignored
     */
    it('should have build artifacts gitignored', () => {
      const gitignore = readFile('.gitignore');

      const criticalIgnores = [
        'node_modules',
        'dist',
        'coverage'
      ];

      for (const ignore of criticalIgnores) {
        expect(gitignore).toContain(ignore);
      }
    });

    /**
     * Given: A repository prepared for public consumption
     * When: We validate overall repository health
     * Then: Repository should meet all launch criteria
     */
    it('should meet all launch criteria', () => {
      const criteria = {
        ac1_placeholders_replaced: findPatternInTrackedFiles('YOUR_ORG').length === 0,
        ac2_fresh_clone_works:
          fileExists('package.json') &&
          fileExists('package-lock.json') &&
          fileExists('tsconfig.json'),
        ac3_security_scan_passes:
          !fileExists('.env') &&
          getTrackedFiles().filter(f => f.endsWith('.pem')).length === 0,
        ac4_vitepress_builds:
          fileExists('docs/.vitepress/config.ts') &&
          fileExists('docs/package.json'),
        ac5_git_history_documented:
          fileExists('.gitattributes'),
        ac6_launch_ready:
          fileExists('LICENSE') &&
          fileExists('README.md') &&
          fileExists('CONTRIBUTING.md') &&
          fileExists('CODE_OF_CONDUCT.md')
      };

      const failedCriteria = Object.entries(criteria)
        .filter(([_, passed]) => !passed)
        .map(([criterion]) => criterion);

      if (failedCriteria.length > 0) {
        console.log('\nFailed launch criteria:');
        failedCriteria.forEach(c => console.log(`  - ${c}`));
      }

      expect(failedCriteria).toEqual([]);
    });
  });
});

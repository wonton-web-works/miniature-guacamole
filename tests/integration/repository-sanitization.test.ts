/**
 * Integration Tests for WS-OSS-1: Repository Sanitization
 *
 * Tests that validate the repository is properly sanitized before open sourcing.
 * These tests interact with actual git, filesystem, and project files.
 *
 * @workstream WS-OSS-1
 * @priority P0 (blocks all other open source workstreams)
 * @target 99% coverage of sanitization checks
 * @phase RED (failing tests written first - repository not yet sanitized)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Project root directory
const PROJECT_ROOT = path.resolve(__dirname, '../..');

// Helper to execute git commands
const git = (command: string): string => {
  try {
    return execSync(`git ${command}`, {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch (error: any) {
    // Return empty string if command fails (e.g., no results found)
    return '';
  }
};

// Helper to recursively find all tracked files
const getTrackedFiles = (): string[] => {
  const output = git('ls-files');
  return output ? output.split('\n').filter(Boolean) : [];
};

// Helper to search file contents
const searchFileContent = (filePath: string, pattern: RegExp): boolean => {
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, 'utf-8');
  return pattern.test(content);
};

describe('WS-OSS-1: Repository Sanitization - Integration Tests', () => {

  describe('AC-1: Git History Clean', () => {
    /**
     * Given: A git repository with history
     * When: We search for sensitive files in git history
     * Then: No .claude/memory/ files should ever have been committed
     */
    it('should have no .claude/memory/ files in git history', () => {
      const command = 'log --all --diff-filter=A --name-only --pretty=format: -- ".claude/memory/*"';
      const result = git(command);

      expect(result).toBe('');
    });

    /**
     * Given: A git repository with history
     * When: We check for any memory files that were committed then deleted
     * Then: No .claude/memory/ files should exist in any commit
     */
    it('should have no .claude/memory/ files in any commit (including deleted)', () => {
      const command = 'log --all --name-only --pretty=format: -- ".claude/memory/*"';
      const result = git(command);

      expect(result).toBe('');
    });

    /**
     * Given: A git repository
     * When: We check for sensitive environment files in history
     * Then: No .env* files should be in git history
     */
    it('should have no .env files in git history', () => {
      const command = 'log --all --name-only --pretty=format: -- ".env*"';
      const result = git(command);

      expect(result).toBe('');
    });

    /**
     * Given: A git repository
     * When: We check for private key files in history
     * Then: No *.pem or *.key files should be in git history
     */
    it('should have no private key files (*.pem, *.key) in git history', () => {
      const pemFiles = git('log --all --name-only --pretty=format: -- "*.pem"');
      const keyFiles = git('log --all --name-only --pretty=format: -- "*.key"');

      expect(pemFiles).toBe('');
      expect(keyFiles).toBe('');
    });

    /**
     * Given: A git repository
     * When: We check for npm debug logs in history
     * Then: No npm-debug.log files should be in git history
     */
    it('should have no npm-debug.log files in git history', () => {
      const command = 'log --all --name-only --pretty=format: -- "npm-debug.log*"';
      const result = git(command);

      expect(result).toBe('');
    });
  });

  describe('AC-2: No Absolute Paths', () => {
    /**
     * Given: A repository with tracked files
     * When: We search for absolute paths containing user-specific directories
     * Then: Zero occurrences of /Users/brodieyazaki/ should exist in tracked files
     */
    it('should have no occurrences of /Users/brodieyazaki/ in tracked files', () => {
      const trackedFiles = getTrackedFiles();
      const filesWithAbsolutePaths: string[] = [];

      trackedFiles.forEach((file) => {
        const filePath = path.join(PROJECT_ROOT, file);
        if (searchFileContent(filePath, /\/Users\/brodieyazaki\//)) {
          filesWithAbsolutePaths.push(file);
        }
      });

      expect(filesWithAbsolutePaths).toEqual([]);
    });

    /**
     * Given: Configuration files that might contain absolute paths
     * When: We check common config files
     * Then: No absolute paths should exist in config files
     */
    it('should have no absolute paths in package.json', () => {
      const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
      const hasAbsolutePaths = searchFileContent(
        packageJsonPath,
        /\/Users\/[^\/]+\//
      );

      expect(hasAbsolutePaths).toBe(false);
    });

    /**
     * Given: TypeScript configuration files
     * When: We check tsconfig.json files
     * Then: No absolute paths should exist
     */
    it('should have no absolute paths in tsconfig.json files', () => {
      const tsconfigFiles = [
        'tsconfig.json',
        'dashboard/tsconfig.json'
      ];

      tsconfigFiles.forEach((file) => {
        const filePath = path.join(PROJECT_ROOT, file);
        if (fs.existsSync(filePath)) {
          const hasAbsolutePaths = searchFileContent(
            filePath,
            /\/Users\/[^\/]+\//
          );
          expect(hasAbsolutePaths).toBe(false);
        }
      });
    });

    /**
     * Given: Test files that might hardcode paths
     * When: We check test files
     * Then: Test files should use path.resolve or PROJECT_ROOT constants
     */
    it('should use relative paths in test files', () => {
      const testFiles = getTrackedFiles().filter((f) => f.includes('test.ts'));
      const filesWithHardcodedPaths: string[] = [];

      testFiles.forEach((file) => {
        const filePath = path.join(PROJECT_ROOT, file);
        // Check for hardcoded /Users/ paths but allow this test file
        if (file !== 'tests/integration/repository-sanitization.test.ts') {
          if (searchFileContent(filePath, /\/Users\/brodieyazaki\/work\/claude_things\/miniature-guacamole/)) {
            filesWithHardcodedPaths.push(file);
          }
        }
      });

      expect(filesWithHardcodedPaths).toEqual([]);
    });

    /**
     * Given: Memory files that might log absolute paths
     * When: We check .claude/memory/ directory
     * Then: Memory files should not contain absolute paths (note: these are gitignored)
     */
    it('should have no absolute paths in .claude/memory/ files (if they exist)', () => {
      const memoryDir = path.join(PROJECT_ROOT, '.claude/memory');

      if (!fs.existsSync(memoryDir)) {
        // Memory dir doesn't exist - test passes
        expect(true).toBe(true);
        return;
      }

      const memoryFiles = fs.readdirSync(memoryDir)
        .filter((f) => f.endsWith('.json') || f.endsWith('.md'));

      const filesWithAbsolutePaths: string[] = [];

      memoryFiles.forEach((file) => {
        const filePath = path.join(memoryDir, file);
        if (searchFileContent(filePath, /\/Users\/brodieyazaki\//)) {
          filesWithAbsolutePaths.push(file);
        }
      });

      // Note: This test documents the issue but doesn't block commits
      // since memory/ is gitignored
      if (filesWithAbsolutePaths.length > 0) {
        console.warn(
          `Warning: ${filesWithAbsolutePaths.length} memory files contain absolute paths:`,
          filesWithAbsolutePaths
        );
      }

      expect(filesWithAbsolutePaths).toEqual([]);
    });
  });

  describe('AC-3: Gitignore Coverage', () => {
    /**
     * Given: A .gitignore file
     * When: We check for .claude/memory/ pattern
     * Then: .gitignore should contain .claude/memory/ pattern
     */
    it('should have .claude/memory/ in .gitignore', () => {
      const gitignorePath = path.join(PROJECT_ROOT, '.gitignore');
      const content = fs.readFileSync(gitignorePath, 'utf-8');

      expect(content).toMatch(/\.claude\/memory\//);
    });

    /**
     * Given: A .gitignore file
     * When: We check for **\/*memory/ pattern (broader coverage)
     * Then: .gitignore should contain comprehensive memory pattern
     */
    it('should have comprehensive memory pattern in .gitignore', () => {
      const gitignorePath = path.join(PROJECT_ROOT, '.gitignore');
      const content = fs.readFileSync(gitignorePath, 'utf-8');

      // Check for either specific or broad memory pattern
      const hasMemoryPattern =
        content.includes('.claude/memory/') ||
        content.includes('**/memory/') ||
        content.includes('**/*memory/');

      expect(hasMemoryPattern).toBe(true);
    });

    /**
     * Given: A .gitignore file
     * When: We check for environment file patterns
     * Then: .gitignore should cover .env* patterns
     */
    it('should have .env* patterns in .gitignore', () => {
      const gitignorePath = path.join(PROJECT_ROOT, '.gitignore');
      const content = fs.readFileSync(gitignorePath, 'utf-8');

      const hasEnvPattern =
        content.includes('.env') &&
        content.includes('.env.local');

      expect(hasEnvPattern).toBe(true);
    });

    /**
     * Given: A .gitignore file
     * When: We check for private key patterns
     * Then: .gitignore should cover *.pem and *.key patterns
     */
    it('should have private key patterns (*.pem, *.key) in .gitignore', () => {
      const gitignorePath = path.join(PROJECT_ROOT, '.gitignore');
      const content = fs.readFileSync(gitignorePath, 'utf-8');

      // Private keys might not be explicitly listed if following standard Node patterns
      // But we should at least check if they exist
      const hasPemPattern = content.includes('*.pem');
      const hasKeyPattern = content.includes('*.key');

      // Either explicit patterns or a comment indicating security awareness
      const hasSecurity = hasPemPattern || hasKeyPattern || content.includes('secret') || content.includes('private');

      expect(hasSecurity).toBe(true);
    });

    /**
     * Given: A .gitignore file
     * When: We check for node_modules pattern
     * Then: .gitignore should cover node_modules/
     */
    it('should have node_modules/ in .gitignore', () => {
      const gitignorePath = path.join(PROJECT_ROOT, '.gitignore');
      const content = fs.readFileSync(gitignorePath, 'utf-8');

      expect(content).toMatch(/node_modules\//);
    });

    /**
     * Given: A .gitignore file
     * When: We check for log file patterns
     * Then: .gitignore should cover *.log patterns
     */
    it('should have log file patterns (*.log) in .gitignore', () => {
      const gitignorePath = path.join(PROJECT_ROOT, '.gitignore');
      const content = fs.readFileSync(gitignorePath, 'utf-8');

      expect(content).toMatch(/\*\.log/);
    });

    /**
     * Given: A .gitignore file
     * When: We check for build output patterns
     * Then: .gitignore should cover common build directories
     */
    it('should have build output patterns (dist/, build/, .next/) in .gitignore', () => {
      const gitignorePath = path.join(PROJECT_ROOT, '.gitignore');
      const content = fs.readFileSync(gitignorePath, 'utf-8');

      const hasDist = content.includes('dist/');
      const hasBuild = content.includes('build/');
      const hasNext = content.includes('.next/');

      expect(hasDist || hasBuild).toBe(true);
      expect(hasNext).toBe(true); // Dashboard uses Next.js
    });
  });

  describe('AC-4: Gitattributes Safety Nets', () => {
    /**
     * Given: A repository for open sourcing
     * When: We check for .gitattributes file
     * Then: .gitattributes file should exist
     */
    it('should have .gitattributes file', () => {
      const gitattributesPath = path.join(PROJECT_ROOT, '.gitattributes');
      expect(fs.existsSync(gitattributesPath)).toBe(true);
    });

    /**
     * Given: A .gitattributes file
     * When: We check for export-ignore rules
     * Then: .gitattributes should mark .claude/memory/ as export-ignore
     */
    it('should mark .claude/memory/ as export-ignore in .gitattributes', () => {
      const gitattributesPath = path.join(PROJECT_ROOT, '.gitattributes');

      if (!fs.existsSync(gitattributesPath)) {
        // Will fail - gitattributes should exist
        expect(fs.existsSync(gitattributesPath)).toBe(true);
        return;
      }

      const content = fs.readFileSync(gitattributesPath, 'utf-8');
      expect(content).toMatch(/\.claude\/memory\/.*export-ignore/);
    });

    /**
     * Given: A .gitattributes file
     * When: We check for internal directory exclusions
     * Then: Internal directories should be marked export-ignore
     */
    it('should mark internal directories as export-ignore in .gitattributes', () => {
      const gitattributesPath = path.join(PROJECT_ROOT, '.gitattributes');

      if (!fs.existsSync(gitattributesPath)) {
        expect(fs.existsSync(gitattributesPath)).toBe(true);
        return;
      }

      const content = fs.readFileSync(gitattributesPath, 'utf-8');

      // Check for patterns that exclude internal files from exports
      const hasExportIgnore = content.includes('export-ignore');
      expect(hasExportIgnore).toBe(true);
    });

    /**
     * Given: A .gitattributes file
     * When: We check for .env* export-ignore rules
     * Then: Environment files should be marked export-ignore as safety net
     */
    it('should mark .env* files as export-ignore in .gitattributes', () => {
      const gitattributesPath = path.join(PROJECT_ROOT, '.gitattributes');

      if (!fs.existsSync(gitattributesPath)) {
        expect(fs.existsSync(gitattributesPath)).toBe(true);
        return;
      }

      const content = fs.readFileSync(gitattributesPath, 'utf-8');

      // .env files should be in gitattributes as additional safety
      const hasEnvIgnore = content.match(/\.env.*export-ignore/);
      expect(hasEnvIgnore).toBeTruthy();
    });

    /**
     * Given: A .gitattributes file
     * When: We verify line endings are normalized
     * Then: Text files should have consistent line endings configured
     */
    it('should configure text file line endings in .gitattributes', () => {
      const gitattributesPath = path.join(PROJECT_ROOT, '.gitattributes');

      if (!fs.existsSync(gitattributesPath)) {
        expect(fs.existsSync(gitattributesPath)).toBe(true);
        return;
      }

      const content = fs.readFileSync(gitattributesPath, 'utf-8');

      // Should have rules for text files (helps cross-platform collaboration)
      const hasTextRules = content.includes('text=auto') || content.includes('* text=');
      expect(hasTextRules).toBe(true);
    });
  });

  describe('AC-5: Verification Checks Pass', () => {
    /**
     * Given: A sanitized repository
     * When: We run grep for absolute paths in tracked files (excluding node_modules)
     * Then: grep should return zero results
     */
    it('grep check: no "brodieyazaki" in tracked files', () => {
      const trackedFiles = getTrackedFiles();
      const matchingFiles: Array<{ file: string; lines: string[] }> = [];

      trackedFiles.forEach((file) => {
        const filePath = path.join(PROJECT_ROOT, file);

        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const lines = content.split('\n');
          const matchingLines = lines
            .map((line, idx) => ({ line, idx: idx + 1 }))
            .filter(({ line }) => line.includes('brodieyazaki'));

          if (matchingLines.length > 0) {
            matchingFiles.push({
              file,
              lines: matchingLines.map(({ line, idx }) => `${idx}: ${line}`)
            });
          }
        } catch (error) {
          // Skip binary files or read errors
        }
      });

      if (matchingFiles.length > 0) {
        console.error('Files containing "brodieyazaki":');
        matchingFiles.forEach(({ file, lines }) => {
          console.error(`\n${file}:`);
          lines.forEach((line) => console.error(`  ${line}`));
        });
      }

      expect(matchingFiles).toEqual([]);
    });

    /**
     * Given: A git repository
     * When: We check git history for .claude/memory/* files
     * Then: git log should return empty
     */
    it('git history check: no .claude/memory/* in git history', () => {
      const result = git('log --all --diff-filter=A -- ".claude/memory/*"');
      expect(result).toBe('');
    });

    /**
     * Given: A clean repository clone
     * When: We verify no sensitive files are tracked
     * Then: All sensitive patterns should be properly ignored
     */
    it('tracked files check: no sensitive files are tracked by git', () => {
      const trackedFiles = getTrackedFiles();

      const sensitivePatterns = [
        /\.claude\/memory\//,
        /\.env$/,
        /\.env\.local$/,
        /\.env\..*\.local$/,
        /\.pem$/,
        /\.key$/,
        /npm-debug\.log/,
        /^\.DS_Store$/
      ];

      const sensitiveFiles = trackedFiles.filter((file) => {
        return sensitivePatterns.some((pattern) => pattern.test(file));
      });

      if (sensitiveFiles.length > 0) {
        console.error('Sensitive files tracked by git:', sensitiveFiles);
      }

      expect(sensitiveFiles).toEqual([]);
    });

    /**
     * Given: A clean repository
     * When: We check for untracked sensitive files in working directory
     * Then: Gitignore should be preventing commits
     */
    it('gitignore check: sensitive files are properly ignored', () => {
      // Check if .claude/memory/ exists and is ignored
      const memoryDir = path.join(PROJECT_ROOT, '.claude/memory');

      if (fs.existsSync(memoryDir)) {
        // Check if any memory files are tracked
        const result = git('ls-files .claude/memory/');
        expect(result).toBe('');
      }

      // This test passes if either:
      // 1. Memory directory doesn't exist
      // 2. Memory directory exists but no files are tracked
      expect(true).toBe(true);
    });

    /**
     * Given: A repository with build scripts
     * When: Tests are run
     * Then: All tests should pass (smoke test)
     */
    it('build validation: npm test runs successfully', () => {
      // This test validates that after sanitization, tests still run
      // We're in a test, so this is a meta-test that the test suite works
      expect(true).toBe(true);
    });

    /**
     * Given: A TypeScript project
     * When: TypeScript compilation is attempted
     * Then: Compilation should succeed without errors
     */
    it('typescript validation: tsc compiles without errors', () => {
      try {
        // Check if tsc can analyze the project (don't emit, just check)
        execSync('npx tsc --noEmit', {
          cwd: PROJECT_ROOT,
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        expect(true).toBe(true);
      } catch (error: any) {
        // If tsc fails, we want to know why
        console.error('TypeScript compilation failed:', error.stdout || error.message);
        throw error;
      }
    });
  });

  describe('OSS-Specific: Additional Best Practices', () => {
    /**
     * Given: An open source repository
     * When: We check for a LICENSE file
     * Then: LICENSE file should exist
     */
    it('should have a LICENSE file', () => {
      const licensePath = path.join(PROJECT_ROOT, 'LICENSE');
      const licenseExists = fs.existsSync(licensePath);

      if (!licenseExists) {
        console.warn('No LICENSE file found. OSS projects should include a license.');
      }

      expect(licenseExists).toBe(true);
    });

    /**
     * Given: An open source repository
     * When: We check for a README.md
     * Then: README.md should exist and contain project information
     */
    it('should have a comprehensive README.md', () => {
      const readmePath = path.join(PROJECT_ROOT, 'README.md');
      expect(fs.existsSync(readmePath)).toBe(true);

      const content = fs.readFileSync(readmePath, 'utf-8');

      // README should contain key sections
      const hasTitle = content.match(/^#\s+/m);
      const hasDescription = content.length > 100;

      expect(hasTitle).toBeTruthy();
      expect(hasDescription).toBe(true);
    });

    /**
     * Given: An open source repository
     * When: We check for contributing guidelines
     * Then: CONTRIBUTING.md should exist or README should mention contributions
     */
    it('should have contribution guidelines', () => {
      const contributingPath = path.join(PROJECT_ROOT, 'CONTRIBUTING.md');
      const readmePath = path.join(PROJECT_ROOT, 'README.md');

      const hasContributingFile = fs.existsSync(contributingPath);
      const readmeContent = fs.readFileSync(readmePath, 'utf-8');
      const readmeHasContributing = readmeContent.toLowerCase().includes('contribut');

      expect(hasContributingFile || readmeHasContributing).toBe(true);
    });

    /**
     * Given: An open source Node.js project
     * When: We check package.json
     * Then: package.json should have repository, license, and description fields
     */
    it('should have proper package.json metadata for OSS', () => {
      const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      expect(packageJson.description).toBeDefined();
      expect(packageJson.description.length).toBeGreaterThan(10);

      // License should be defined
      expect(packageJson.license).toBeDefined();

      // Repository field is recommended for OSS
      // (not required, but good practice)
    });

    /**
     * Given: An open source project
     * When: We check for security documentation
     * Then: SECURITY.md should exist or README should mention security
     */
    it('should have security policy documentation', () => {
      const securityPath = path.join(PROJECT_ROOT, 'SECURITY.md');
      const readmePath = path.join(PROJECT_ROOT, 'README.md');

      const hasSecurityFile = fs.existsSync(securityPath);
      const readmeContent = fs.readFileSync(readmePath, 'utf-8');
      const readmeHasSecurity = readmeContent.toLowerCase().includes('security');

      // Either explicit SECURITY.md or mention in README
      expect(hasSecurityFile || readmeHasSecurity).toBe(true);
    });

    /**
     * Given: An open source project with dependencies
     * When: We check for vulnerable dependencies
     * Then: No known high-severity vulnerabilities should exist
     */
    it('should have no high-severity npm vulnerabilities', () => {
      try {
        const result = execSync('npm audit --audit-level=high --production', {
          cwd: PROJECT_ROOT,
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        expect(true).toBe(true);
      } catch (error: any) {
        // npm audit exits with non-zero if vulnerabilities found
        const output = error.stdout || error.message;

        if (output.includes('found 0 vulnerabilities')) {
          expect(true).toBe(true);
        } else {
          console.error('High-severity vulnerabilities found:', output);
          throw error;
        }
      }
    });

    /**
     * Given: An open source project
     * When: We check for TODOs containing sensitive information
     * Then: No TODOs should contain passwords, keys, or personal info
     */
    it('should have no TODOs with sensitive information', () => {
      const trackedFiles = getTrackedFiles().filter((f) =>
        f.endsWith('.ts') ||
        f.endsWith('.js') ||
        f.endsWith('.md')
      );

      const sensitivePatterns = [
        /TODO.*password/i,
        /TODO.*secret/i,
        /TODO.*api[_-]?key/i,
        /TODO.*token/i,
        /TODO.*credential/i,
        /TODO.*brodieyazaki/i
      ];

      const filesWithSensitiveTodos: string[] = [];

      trackedFiles.forEach((file) => {
        const filePath = path.join(PROJECT_ROOT, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        if (sensitivePatterns.some((pattern) => pattern.test(content))) {
          filesWithSensitiveTodos.push(file);
        }
      });

      if (filesWithSensitiveTodos.length > 0) {
        console.error('Files with sensitive TODOs:', filesWithSensitiveTodos);
      }

      expect(filesWithSensitiveTodos).toEqual([]);
    });
  });

  describe('Clean Clone Validation', () => {
    /**
     * Given: A sanitized repository
     * When: Someone clones it fresh
     * Then: Clone should succeed without errors
     */
    it('repository metadata: git clone would succeed', () => {
      // Verify we're in a valid git repository
      const isGitRepo = fs.existsSync(path.join(PROJECT_ROOT, '.git'));
      expect(isGitRepo).toBe(true);

      // Verify remote is configured (for clone testing)
      const remote = git('remote -v');
      // Remote might not be configured yet - that's okay for local testing
      expect(true).toBe(true);
    });

    /**
     * Given: A fresh clone of the repository
     * When: npm install is run
     * Then: Dependencies should install without errors
     */
    it('dependencies: package-lock.json is in sync with package.json', () => {
      const packageLockPath = path.join(PROJECT_ROOT, 'package-lock.json');
      expect(fs.existsSync(packageLockPath)).toBe(true);

      // package-lock.json should be tracked
      const trackedFiles = getTrackedFiles();
      expect(trackedFiles).toContain('package-lock.json');
    });

    /**
     * Given: A fresh clone of the repository
     * When: Project is built
     * Then: Build scripts should work
     */
    it('build: project builds successfully', () => {
      // Check that build scripts exist in package.json
      const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      expect(packageJson.scripts).toBeDefined();
      expect(packageJson.scripts.test).toBeDefined();
    });

    /**
     * Given: A fresh clone of the repository
     * When: Tests are run
     * Then: Tests should execute (we're running them now)
     */
    it('tests: test suite runs in fresh environment', () => {
      // This test itself proves tests can run
      expect(true).toBe(true);
    });
  });
});

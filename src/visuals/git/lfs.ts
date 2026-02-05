/**
 * WS-21: Git Integration and LFS Support - LFS Module
 *
 * Git LFS prerequisite checks and file tracking.
 * AC-2: Git LFS tracks PNG files >1MB
 * AC-5: LFS prerequisite checks
 */

import { execFileSync } from 'child_process';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const LFS_THRESHOLD = 1048576; // 1MB in bytes

/**
 * Helper to convert execSync result to string (handles both Buffer and string)
 */
function toString(result: string | Buffer): string {
  return typeof result === 'string' ? result : result.toString('utf8');
}

/**
 * Checks if Git LFS is installed.
 * AC-5a: Check if Git LFS is installed
 */
export async function isLfsInstalled(): Promise<{ installed: boolean; version: string | null }> {
  try {
    const result = execFileSync('git', ['lfs', 'version'], { encoding: 'utf8' });
    const output = toString(result);
    const versionMatch = output.match(/git-lfs\/([\d.]+)/);
    return {
      installed: true,
      version: versionMatch ? versionMatch[1] : output.trim(),
    };
  } catch (error: any) {
    return {
      installed: false,
      version: null,
    };
  }
}

/**
 * Checks if Git LFS is initialized in the repository.
 * AC-5b: Check if LFS is initialized in repo
 */
export async function isLfsInitialized(
  options?: { checkHooks?: boolean }
): Promise<{ initialized: boolean; hooks_configured?: boolean }> {
  try {
    execFileSync('git', ['lfs', 'env'], { encoding: 'utf8' });

    if (options?.checkHooks) {
      // Check for LFS hooks in .git/hooks directory
      const hookPath = path.resolve(process.cwd(), '.git', 'hooks', 'pre-push');
      const hooksConfigured = fs.existsSync(hookPath);

      return {
        initialized: true,
        hooks_configured: hooksConfigured,
      };
    }

    return { initialized: true };
  } catch (error: any) {
    return { initialized: false };
  }
}

/**
 * Checks all LFS prerequisites.
 * Runs both installation and initialization checks.
 */
export async function checkLfsPrerequisites(): Promise<{
  ready: boolean;
  lfs_installed: boolean;
  lfs_initialized: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  const installCheck = await isLfsInstalled();
  const initCheck = installCheck.installed ? await isLfsInitialized() : { initialized: false };

  if (!installCheck.installed) {
    errors.push('Git LFS is not installed');
  }

  if (!initCheck.initialized && installCheck.installed) {
    errors.push('Git LFS is not initialized in this repository');
  }

  return {
    ready: installCheck.installed && initCheck.initialized,
    lfs_installed: installCheck.installed,
    lfs_initialized: initCheck.initialized,
    errors,
  };
}

/**
 * Checks if a file should use LFS based on size.
 * AC-2: Check if file size >1MB
 */
export async function shouldUseLfs(
  filePath: string,
  options?: { threshold?: number }
): Promise<{
  should_use_lfs: boolean;
  file_size: number;
  threshold: number;
}> {
  const threshold = options?.threshold || LFS_THRESHOLD;

  try {
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    return {
      should_use_lfs: fileSize > threshold,
      file_size: fileSize,
      threshold,
    };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    }
    throw error;
  }
}

/**
 * Tracks a file with Git LFS.
 */
export async function trackFileWithLfs(
  filePath: string,
  options?: { usePattern?: boolean }
): Promise<{
  tracked: boolean;
  file_path?: string;
  pattern?: string;
}> {
  try {
    const target = filePath;
    // Use execFileSync with argument array to prevent command injection
    const result = execFileSync('git', ['lfs', 'track', target], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    toString(result); // Ensure result is consumed

    if (options?.usePattern) {
      return {
        tracked: true,
        pattern: filePath,
      };
    }

    return {
      tracked: true,
      file_path: filePath,
    };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error('Git LFS is not installed');
    }
    const msg = error?.message || String(error);
    throw new Error(`Failed to track file with LFS: ${msg}`);
  }
}

/**
 * Configures .gitattributes for LFS tracking.
 * AC-2: Configure .gitattributes for PNG tracking
 */
export async function configureGitAttributes(
  options: { pattern?: string; patterns?: string[] }
): Promise<{
  configured: boolean;
  action: 'created' | 'updated' | 'already_configured';
}> {
  const gitattributesPath = path.resolve(process.cwd(), '.gitattributes');
  const patterns = options.patterns || [options.pattern || '*.png'];

  const lfsRules = patterns.map(
    pattern => `${pattern} filter=lfs diff=lfs merge=lfs -text`
  ).join('\n') + '\n';

  try {
    if (fs.existsSync(gitattributesPath)) {
      const content = await fs.promises.readFile(gitattributesPath, 'utf-8');
      const contentStr = String(content || '');

      // Check if all patterns already configured
      const allConfigured = patterns.every(pattern =>
        contentStr.includes(`${pattern} filter=lfs`)
      );

      if (allConfigured) {
        return {
          configured: true,
          action: 'already_configured',
        };
      }

      // Append missing rules
      await fs.promises.appendFile(gitattributesPath, lfsRules, 'utf-8');
      return {
        configured: true,
        action: 'updated',
      };
    } else {
      // Create new file
      await fs.promises.writeFile(gitattributesPath, lfsRules, 'utf-8');
      return {
        configured: true,
        action: 'created',
      };
    }
  } catch (error: any) {
    const msg = error?.message || '';
    if (msg.toLowerCase().includes('permission denied')) {
      throw new Error('Permission denied while writing .gitattributes');
    }
    throw error;
  }
}

/**
 * Ensures LFS tracking for a file.
 * Complete LFS setup workflow: check prerequisites, configure, track.
 */
export async function ensureLfsTracking(
  filePath: string,
  options?: { force?: boolean }
): Promise<{
  lfs_ready: boolean;
  file_requires_lfs?: boolean;
  file_tracked?: boolean;
  prerequisites_met?: boolean;
  gitattributes_configured?: boolean;
  errors?: string[];
  reason?: string;
}> {
  // Check if file requires LFS first (unless forced) - cheap operation
  if (!options?.force) {
    const sizeCheck = await shouldUseLfs(filePath);
    if (!sizeCheck.should_use_lfs) {
      return {
        lfs_ready: false,
        file_requires_lfs: false,
        reason: 'File size is below threshold',
      };
    }
  }

  // Check prerequisites
  const prereqs = await checkLfsPrerequisites();
  if (!prereqs.ready) {
    return {
      lfs_ready: false,
      file_requires_lfs: true,
      prerequisites_met: false,
      errors: prereqs.errors,
    };
  }

  // Configure .gitattributes
  const ext = path.extname(filePath);
  await configureGitAttributes({ pattern: `*${ext}` });

  // Track file
  await trackFileWithLfs(`*${ext}`, { usePattern: true });

  return {
    lfs_ready: true,
    file_requires_lfs: true,
    file_tracked: true,
    prerequisites_met: true,
    gitattributes_configured: true,
  };
}

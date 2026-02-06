/**
 * WS-21: Git Integration and LFS Support - Commit Module
 *
 * Git commit operations for approved visuals.
 * AC-1: Approved visuals auto-committed to git
 * AC-3: Commit includes updated metadata.json
 * AC-4: Handle git errors
 */

import { execFileSync } from 'child_process';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getMetadataById } from '../metadata/queries';
import { getApprovalRecord } from '../workflow/approvals';
import type { MetadataEntry } from '../metadata/types';
import { shouldUseLfs, checkLfsPrerequisites, configureGitAttributes, trackFileWithLfs } from './lfs';
import { validateVisualPath, validateVisualPaths } from './security';
import { registerTempFile, deregisterTempFile } from '../../lifecycle/index';

const METADATA_FILE = '.claude/visuals/metadata.json';

/**
 * Helper to convert execSync result to string (handles both Buffer and string)
 */
function toString(result: string | Buffer): string {
  return typeof result === 'string' ? result : result.toString('utf8');
}

/**
 * Validates that current directory is a git repository.
 * AC-4a: Handle git errors - not a repo
 */
export async function validateGitRepository(): Promise<{
  valid: boolean;
  git_dir?: string;
  reason?: string;
}> {
  try {
    const result = execFileSync('git', ['rev-parse', '--git-dir'], { encoding: 'utf8' });
    const gitDir = toString(result).trim();
    return {
      valid: true,
      git_dir: gitDir,
    };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return {
        valid: false,
        reason: 'Git is not installed',
      };
    }
    return {
      valid: false,
      reason: 'Not a git repository',
    };
  }
}

/**
 * Checks for uncommitted changes in the repository.
 * AC-4b: Handle git errors - uncommitted changes
 */
export async function checkUncommittedChanges(): Promise<{
  has_changes: boolean;
  files: string[];
}> {
  try {
    const result = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
    const output = toString(result);
    const trimmed = output.trim();

    // Empty output means clean
    if (trimmed.length === 0) {
      return {
        has_changes: false,
        files: [],
      };
    }

    // Filter lines that look like git status output
    // Valid git status porcelain format has specific patterns
    const lines = trimmed.split('\n').filter(line => {
      if (line.length === 0) return false;
      // If line looks like version info or other non-status output, skip it
      if (line.includes('git-lfs') || line.includes('version')) return false;
      // Valid status lines have specific formats, typically starting with status characters
      return true;
    });

    return {
      has_changes: lines.length > 0,
      files: lines,
    };
  } catch (error: any) {
    const msg = error?.message || String(error);
    throw new Error(`Failed to check git status: ${msg}`);
  }
}

/**
 * Builds a commit message for visual commits.
 */
export function buildCommitMessage(metadata: MetadataEntry[]): string {
  if (metadata.length === 0) {
    throw new Error('Cannot build commit message: no metadata provided');
  }

  if (metadata.length === 1) {
    const m = metadata[0];
    return `visual(${m.workstream_id}): Add approved ${m.component} v${m.version}`;
  }

  // Multiple visuals
  const workstreams = Array.from(new Set(metadata.map(m => m.workstream_id)));
  const workstreamStr = workstreams.join(', ');
  return `visual(${workstreamStr}): Add ${metadata.length} approved visuals`;
}

/**
 * Commits an approved visual to git.
 * AC-1: Auto-commit approved visuals
 * AC-3: Include updated metadata.json
 */
export async function commitApprovedVisual(
  visualId: string,
  options?: { message?: string; ensureLfs?: boolean }
): Promise<{
  success: boolean;
  visual_id: string;
  commit_hash?: string;
  lfs_enabled?: boolean;
}> {
  // Validate visual exists
  const metadata = await getMetadataById(visualId);
  if (!metadata) {
    throw new Error(`Visual not found: ${visualId}`);
  }

  // Validate visual is approved
  if (metadata.status !== 'approved') {
    throw new Error(`Visual is not approved: ${visualId}`);
  }

  // Validate file exists
  const filePath = path.resolve(process.cwd(), metadata.file_path);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Visual file not found: ${metadata.file_path}`);
  }

  // Check LFS prerequisites if enabled (before git operations)
  let needsLfs = false;
  if (options?.ensureLfs) {
    const sizeCheck = await shouldUseLfs(filePath);
    needsLfs = sizeCheck.should_use_lfs;

    if (needsLfs) {
      // Just check prerequisites, don't track yet
      const prereqs = await checkLfsPrerequisites();
      if (!prereqs.ready) {
        throw new Error('Git LFS is not installed');
      }
    }
  }

  // Validate git repository
  const gitValidation = await validateGitRepository();
  if (!gitValidation.valid) {
    throw new Error(gitValidation.reason || 'Not a git repository');
  }

  // Check for uncommitted changes
  const changesCheck = await checkUncommittedChanges();
  if (changesCheck.has_changes) {
    throw new Error('Repository has uncommitted changes');
  }

  // Set up LFS tracking if needed (after git validation)
  let lfsEnabled = false;
  if (needsLfs) {
    try {
      const ext = path.extname(filePath);
      await configureGitAttributes({ pattern: `*${ext}` });
      await trackFileWithLfs(`*${ext}`, { usePattern: true });
      lfsEnabled = true;
    } catch (error: any) {
      throw error;
    }
  }

  // Validate file paths for security
  validateVisualPath(metadata.file_path);

  // Build commit message
  const message = options?.message || buildCommitMessage([metadata]);

  try {
    // Add visual file and metadata.json using secure execFileSync
    const addResult = execFileSync('git', ['add', metadata.file_path, METADATA_FILE], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    toString(addResult);

    // Create commit with message file to prevent injection
    const tmpFile = path.join(os.tmpdir(), `commit-${Date.now()}-${Math.random()}.txt`);
    fs.writeFileSync(tmpFile, message, 'utf8');
    // Register temp file with lifecycle manager BEFORE git commit (AC-4)
    registerTempFile(tmpFile);
    try {
      const commitResult = execFileSync('git', ['commit', '-F', tmpFile], {
        cwd: process.cwd(),
        encoding: 'utf8',
      });
      toString(commitResult);
    } finally {
      // Always cleanup temp file
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
      // Deregister from lifecycle after cleanup
      deregisterTempFile(tmpFile);
    }

    // Get commit hash using secure execFileSync
    const hashResult = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const commitHash = toString(hashResult).trim();

    return {
      success: true,
      visual_id: visualId,
      commit_hash: commitHash,
      lfs_enabled: lfsEnabled,
    };
  } catch (error: any) {
    // Handle specific git errors
    const msg = error?.message || '';
    if (msg.includes('Permission denied') || error.code === 'EACCES') {
      throw new Error('EACCES: permission denied');
    }
    if (msg.includes('detached HEAD')) {
      throw new Error('fatal: You are in detached HEAD state');
    }
    throw error;
  }
}

/**
 * Commits multiple approved visuals in a single commit.
 */
export async function commitMultipleVisuals(
  visualIds: string[],
  options?: { message?: string; ensureLfs?: boolean }
): Promise<{
  success: boolean;
  committed_count: number;
  failed_count?: number;
  visual_ids?: string[];
  failed_ids?: string[];
  commit_hash?: string;
  lfs_files_count?: number;
  regular_files_count?: number;
}> {
  // Validate git repository
  const gitValidation = await validateGitRepository();
  if (!gitValidation.valid) {
    throw new Error(gitValidation.reason || 'Not a git repository');
  }

  // Check for uncommitted changes
  const changesCheck = await checkUncommittedChanges();
  if (changesCheck.has_changes) {
    throw new Error('Repository has uncommitted changes');
  }

  // Validate each visual
  const validMetadata: MetadataEntry[] = [];
  const failedIds: string[] = [];

  for (const visualId of visualIds) {
    try {
      const metadata = await getMetadataById(visualId);
      if (!metadata) {
        failedIds.push(visualId);
        continue;
      }

      if (metadata.status !== 'approved') {
        failedIds.push(visualId);
        continue;
      }

      const filePath = path.resolve(process.cwd(), metadata.file_path);
      if (!fs.existsSync(filePath)) {
        failedIds.push(visualId);
        continue;
      }

      validMetadata.push(metadata);
    } catch (error) {
      failedIds.push(visualId);
    }
  }

  if (validMetadata.length === 0) {
    throw new Error('No valid visuals to commit');
  }

  // Handle LFS if enabled
  let lfsFilesCount = 0;
  let regularFilesCount = 0;
  let needsLfsSetup = false;

  if (options?.ensureLfs) {
    // Check which files need LFS
    for (const metadata of validMetadata) {
      const filePath = path.resolve(process.cwd(), metadata.file_path);
      const sizeCheck = await shouldUseLfs(filePath);

      if (sizeCheck.should_use_lfs) {
        needsLfsSetup = true;
        lfsFilesCount++;
      } else {
        regularFilesCount++;
      }
    }

    // Check LFS prerequisites if any file needs it
    if (needsLfsSetup) {
      const prereqs = await checkLfsPrerequisites();
      if (!prereqs.ready) {
        throw new Error('Git LFS is not installed');
      }

      // Configure LFS for PNG files
      await configureGitAttributes({ pattern: '*.png' });
      await trackFileWithLfs('*.png', { usePattern: true });
    }
  }

  // Validate all file paths for security
  const filePaths = validMetadata.map(m => m.file_path);
  validateVisualPaths(filePaths);

  // Build commit message
  const message = options?.message || buildCommitMessage(validMetadata);

  try {
    // Build list of all files to add (visual files + metadata.json)
    const filesToAdd = validMetadata.map(m => m.file_path).concat(METADATA_FILE);

    // Add all files using secure execFileSync
    const addResult = execFileSync('git', ['add', ...filesToAdd], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    toString(addResult);

    // Create commit with message file to prevent injection
    const tmpFile = path.join(os.tmpdir(), `commit-${Date.now()}-${Math.random()}.txt`);
    fs.writeFileSync(tmpFile, message, 'utf8');
    // Register temp file with lifecycle manager BEFORE git commit (AC-4)
    registerTempFile(tmpFile);
    try {
      const commitResult = execFileSync('git', ['commit', '-F', tmpFile], {
        cwd: process.cwd(),
        encoding: 'utf8',
      });
      toString(commitResult);
    } finally {
      // Always cleanup temp file
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
      // Deregister from lifecycle after cleanup
      deregisterTempFile(tmpFile);
    }

    // Get commit hash using secure execFileSync
    const hashResult = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const commitHash = toString(hashResult).trim();

    return {
      success: true,
      committed_count: validMetadata.length,
      failed_count: failedIds.length,
      visual_ids: validMetadata.map(m => m.id),
      failed_ids: failedIds.length > 0 ? failedIds : undefined,
      commit_hash: commitHash,
      lfs_files_count: lfsFilesCount > 0 ? lfsFilesCount : undefined,
      regular_files_count: regularFilesCount > 0 ? regularFilesCount : undefined,
    };
  } catch (error: any) {
    // Handle specific git errors
    const msg = error?.message || '';
    if (msg.includes('Permission denied') || error.code === 'EACCES') {
      throw new Error('EACCES: permission denied');
    }
    throw error;
  }
}

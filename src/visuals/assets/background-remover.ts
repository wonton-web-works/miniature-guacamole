/**
 * Asset Generation Pipeline — Background Remover
 *
 * Removes image backgrounds by shelling out to rembg (Python).
 * rembg must be installed separately: pip install rembg
 */

import { execFile } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { RemoveBackgroundOptions } from './types';

/**
 * Builds the rembg argument list from options.
 */
function buildRembgArgs(
  inputPath: string,
  outputPath: string,
  options: RemoveBackgroundOptions
): string[] {
  const args: string[] = ['i'];

  if (options.model) {
    args.push('-m', options.model);
  }

  if (options.alphaMatte === true) {
    args.push('-a');
  }

  args.push(inputPath, outputPath);
  return args;
}

/**
 * Wraps execFile in a promise.
 */
function runRembg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile('rembg', args, (err, _stdout, _stderr) => {
      if (err) {
        const isNotFound =
          (err as any).code === 127 ||
          err.message.includes('command not found') ||
          err.message.includes('ENOENT');

        if (isNotFound) {
          reject(
            new Error(
              'rembg is not installed or not on PATH. Install it with: pip install rembg'
            )
          );
        } else {
          reject(err);
        }
        return;
      }
      resolve();
    });
  });
}

/**
 * Removes the background from an image file.
 * Returns the output path.
 */
export async function removeBackground(
  inputPath: string,
  outputPath: string,
  options: RemoveBackgroundOptions = {}
): Promise<string> {
  const args = buildRembgArgs(inputPath, outputPath, options);
  await runRembg(args);
  return outputPath;
}

/**
 * Removes the background from an in-memory buffer.
 * Writes to a temp file, runs rembg, reads result, cleans up.
 * Returns the processed Buffer.
 */
export async function removeBackgroundFromBuffer(
  buffer: Buffer,
  options: RemoveBackgroundOptions = {}
): Promise<Buffer> {
  const tmpDir = os.tmpdir();
  const id = `rembg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const inputTmp = path.join(tmpDir, `${id}-in.png`);
  const outputTmp = path.join(tmpDir, `${id}-out.png`);

  try {
    fs.writeFileSync(inputTmp, buffer);
    await removeBackground(inputTmp, outputTmp, options);
    const result = fs.readFileSync(outputTmp) as Buffer;
    return result;
  } finally {
    try { fs.unlinkSync(inputTmp); } catch { /* ignore */ }
    try { fs.unlinkSync(outputTmp); } catch { /* ignore */ }
  }
}

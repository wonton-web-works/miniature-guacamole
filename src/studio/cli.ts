/**
 * Studio CLI Entry Point
 *
 * Usage: npx mg-studio compile <script-path> [output-dir]
 * WS-STUDIO-1: YouTube production pipeline tooling
 *
 * Exports main(argv) for testability.
 */

import * as path from 'path';
import { compile } from './compiler';

const USAGE = `
Usage: mg-studio <subcommand> [options]

Subcommands:
  compile <script-path> [output-dir]
    Compile a script.yaml file into a VHS .tape file.

    <script-path>   Path to the script.yaml file (required)
    [output-dir]    Directory for the output .tape file (default: script directory)

Examples:
  npx mg-studio compile scripts/ep02/script.yaml
  npx mg-studio compile scripts/ep02/script.yaml dist/
`.trim();

export async function main(argv: string[]): Promise<void> {
  // argv is expected to be process.argv-style: [node, script, subcommand, ...args]
  const args = argv.slice(2);

  if (args.length === 0) {
    process.stderr.write(`Error: No subcommand provided.\n\n${USAGE}\n`);
    process.exit(1);
  }

  const [subcommand, ...rest] = args;

  if (subcommand !== 'compile') {
    process.stderr.write(`Error: Unknown subcommand '${subcommand}'.\n\n${USAGE}\n`);
    process.exit(1);
  }

  // compile subcommand
  const scriptPath = rest[0];
  const outputDir = rest[1];

  if (!scriptPath) {
    process.stderr.write(`Error: script path is required for the compile subcommand.\n\n${USAGE}\n`);
    process.exit(1);
  }

  // Derive output path
  const resolvedScriptPath = path.resolve(scriptPath);
  const scriptBasename = path.basename(resolvedScriptPath, path.extname(resolvedScriptPath));
  const tapeName = `${scriptBasename}.tape`;

  let outputPath: string;
  if (outputDir) {
    outputPath = path.join(path.resolve(outputDir), tapeName);
  } else {
    outputPath = path.join(path.dirname(resolvedScriptPath), tapeName);
  }

  let result;
  try {
    result = await compile(resolvedScriptPath, outputPath);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Error: ${message}\n`);
    process.exit(1);
    return;
  }

  process.stdout.write(`Compiled ${result.sceneCount} scene(s) → ${result.tapePath}\n`);
  process.exit(0);
}

// Run when executed directly (not imported)
if (
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('cli.ts') ||
    process.argv[1].endsWith('cli.js') ||
    process.argv[1].includes('mg-studio'))
) {
  main(process.argv).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Fatal: ${message}\n`);
    process.exit(1);
  });
}

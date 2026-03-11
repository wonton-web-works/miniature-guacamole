/**
 * Quick script to generate narration MP3s for an episode.
 * Usage: npx tsx scripts/generate-narration.ts <episode-id>
 * Example: npx tsx scripts/generate-narration.ts ep01
 */

import * as fs from 'fs';
import * as path from 'path';
import * as jsYaml from 'js-yaml';
import { loadStudioConfig, generateNarration } from '../src/studio/elevenlabs';
import type { Script } from '../src/studio/types';

async function main() {
  const episodeId = process.argv[2];
  if (!episodeId) {
    console.error('Usage: npx tsx scripts/generate-narration.ts <episode-id>');
    process.exit(1);
  }

  const scriptPath = path.resolve(`scripts/${episodeId}/script.yaml`);
  const outputDir = path.resolve(`output/${episodeId}`);
  const configPath = path.resolve('studio-config.local.yaml');

  if (!fs.existsSync(scriptPath)) {
    console.error(`Script not found: ${scriptPath}`);
    process.exit(1);
  }

  // Load config and script
  const config = await loadStudioConfig(configPath);
  const yaml = fs.readFileSync(scriptPath, 'utf-8');
  const script = jsYaml.load(yaml) as Script;

  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`Generating narration for ${episodeId} (${script.scenes.length} scenes)`);

  for (const scene of script.scenes) {
    console.log(`  Scene ${scene.scene_id} (${scene.narrator_agent}): "${scene.narration.slice(0, 60)}..."`);

    const result = await generateNarration(
      scene.narration,
      scene.narrator_agent,
      scene.scene_id,
      outputDir,
      config,
    );

    const status = result.cached ? 'cached' : 'generated';
    console.log(`    → ${status}: ${result.mp3Path}`);
  }

  console.log(`\nDone. MP3s in ${outputDir}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

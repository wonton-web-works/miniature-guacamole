/**
 * Asset Generation Pipeline — Orchestrator
 *
 * Coordinates: validate → (optional) background removal → (optional) post-process → metadata.
 * The actual image generation (Gemini via MCP) happens upstream; this module
 * receives a rawImagePath pointing to the already-generated file.
 */

import * as path from 'path';
import sharp from 'sharp';
import { removeBackground } from './background-remover';
import { postProcess } from './post-processor';
import type {
  AssetPipelineConfig,
  GenerateAssetRequest,
  GenerateAssetResult,
} from './types';

function validateRequest(request: GenerateAssetRequest): void {
  if (!request.name || request.name.trim() === '') {
    throw new Error('name is required');
  }
  if (!request.rawImagePath || request.rawImagePath.trim() === '') {
    throw new Error('rawImagePath (image path) is required');
  }
}

/**
 * Runs the full asset pipeline for a single asset.
 */
export async function runAssetPipeline(
  request: GenerateAssetRequest,
  config: AssetPipelineConfig
): Promise<GenerateAssetResult> {
  validateRequest(request);

  const format = config.defaultFormat ?? 'png';
  const outputDir = config.outputDir;

  let currentPath = request.rawImagePath;
  const originalPath = request.rawImagePath;

  // Step 1: Background removal
  if (request.removeBackground === true) {
    const bgRemovedPath = path.join(outputDir, `${request.name}-nobg.png`);
    currentPath = await removeBackground(currentPath, bgRemovedPath);
  }

  // Step 2: Post-processing
  if (request.postProcess) {
    const ext = request.postProcess.format ?? format;
    const finalPath = path.join(outputDir, `${request.name}.${ext}`);
    currentPath = await postProcess(currentPath, finalPath, request.postProcess);
  }

  // Step 3: Read final image metadata
  const meta = await sharp(currentPath).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const hasTransparency = meta.hasAlpha ?? false;
  const resultFormat = meta.format ?? format;

  // If no processing happened, processed path = original
  const processedPath = currentPath;

  return {
    originalPath,
    processedPath,
    format: resultFormat,
    width,
    height,
    hasTransparency,
  };
}

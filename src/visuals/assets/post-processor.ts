/**
 * Asset Generation Pipeline — Post Processor
 *
 * Image post-processing via sharp: resize, format conversion,
 * compositing overlays, and trimming transparent pixels.
 */

import sharp from 'sharp';
import type { PostProcessOptions } from './types';

/**
 * Post-processes an image file using the provided options.
 * Returns the output path.
 */
export async function postProcess(
  inputPath: string,
  outputPath: string,
  options: PostProcessOptions
): Promise<string> {
  let pipeline = sharp(inputPath);

  if (options.resize) {
    const { width, height, fit } = options.resize;
    pipeline = pipeline.resize({ width, height, ...(fit ? { fit } : {}) });
  }

  if (options.format) {
    const quality = options.quality;
    pipeline = pipeline.toFormat(options.format, quality !== undefined ? { quality } : {});
  }

  if (options.composite && options.composite.length > 0) {
    pipeline = pipeline.composite(
      options.composite.map(({ input, gravity, blend }) => ({
        input,
        ...(gravity ? { gravity } : {}),
        ...(blend ? { blend: blend as any } : {}),
      }))
    );
  }

  if (options.trim === true) {
    pipeline = pipeline.trim();
  }

  await pipeline.toFile(outputPath);
  return outputPath;
}

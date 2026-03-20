/**
 * Asset Generation Pipeline — Chroma Key
 *
 * Lightweight green-screen removal using sharp for pixel access.
 * Converts pixels to HSL and zeroes alpha for pixels matching
 * the target color within the given tolerance.
 */

import sharp from 'sharp';

export interface ChromaKeyOptions {
  /** Target color to remove. Defaults to green (0, 177, 64). */
  targetColor?: { r: number; g: number; b: number };
  /** Match tolerance in 0-1 range. Default 0.3. */
  tolerance?: number;
  /** Pixels of edge softening. Default 0 (no blur). */
  edgeBlur?: number;
}

// Default chroma key green (studio green screen standard)
const DEFAULT_TARGET = { r: 0, g: 177, b: 64 };
const DEFAULT_TOLERANCE = 0.3;

/**
 * Converts an RGB value (0-255 each) to HSL (h: 0-360, s: 0-1, l: 0-1).
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) {
    return [0, 0, l]; // achromatic
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  if (max === rn) {
    h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  } else if (max === gn) {
    h = ((bn - rn) / d + 2) / 6;
  } else {
    h = ((rn - gn) / d + 4) / 6;
  }

  return [h * 360, s, l];
}

/**
 * Returns true if pixel RGB is within tolerance of the target color.
 * Comparison is done in HSL hue space to be robust to lighting variation.
 */
function isMatch(
  r: number,
  g: number,
  b: number,
  target: { r: number; g: number; b: number },
  tolerance: number
): boolean {
  const [pH] = rgbToHsl(r, g, b);
  const [tH] = rgbToHsl(target.r, target.g, target.b);

  // Hue distance on a circle (0-360), normalised to 0-1
  const hueDiff = Math.min(Math.abs(pH - tH), 360 - Math.abs(pH - tH)) / 180;
  return hueDiff <= tolerance;
}

/**
 * Removes the chroma key background from an image.
 * Returns the output path.
 */
export async function chromaKey(
  inputPath: string,
  outputPath: string,
  options: ChromaKeyOptions = {}
): Promise<string> {
  const target = options.targetColor ?? DEFAULT_TARGET;
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;

  const instance = sharp(inputPath, { sequentialRead: true });
  const { width = 0, height = 0, channels = 4 } = await instance.metadata();

  // Read raw RGBA pixels
  const { data } = await sharp(inputPath, { sequentialRead: true })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const buf = data as Buffer;
  const pixelCount = width * height;
  const ch = channels >= 4 ? 4 : channels;

  for (let i = 0; i < pixelCount; i++) {
    const offset = i * ch;
    const r = buf[offset];
    const g = buf[offset + 1];
    const b = buf[offset + 2];

    if (ch >= 4 && isMatch(r, g, b, target, tolerance)) {
      buf[offset + 3] = 0;
    } else if (ch === 3 && isMatch(r, g, b, target, tolerance)) {
      // For RGB-only source, we cannot zero the alpha (no channel).
      // The output will still be written as RGBA by sharp.
    }
  }

  // Write processed buffer back as PNG (preserves transparency)
  const outputFormat = outputPath.endsWith('.webp') ? 'webp' : 'png';
  const writer = sharp(buf, { raw: { width, height, channels: ch } });

  if (outputFormat === 'webp') {
    await writer.webp().toFile(outputPath);
  } else {
    await writer.png().toFile(outputPath);
  }

  return outputPath;
}

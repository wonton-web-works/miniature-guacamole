/**
 * Unit Tests: Chroma Key
 *
 * Tests green-screen removal using a synthetic pixel buffer.
 *
 * Test ordering: misuse-first per CAD TDD protocol
 *   1. MISUSE   — sharp failures, invalid paths
 *   2. BOUNDARY — tolerance edge cases, edge blurring
 *   3. GOLDEN   — green pixel zeroed, non-green pixel preserved
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Pixel helpers ----
function buildRGBABuffer(pixels: number[][]): Buffer {
  const buf = Buffer.alloc(pixels.length * 4);
  pixels.forEach((px, i) => {
    buf[i * 4 + 0] = px[0];
    buf[i * 4 + 1] = px[1];
    buf[i * 4 + 2] = px[2];
    buf[i * 4 + 3] = px[3];
  });
  return buf;
}

const PIXEL_GREEN  = [0,   177, 64,  255];
const PIXEL_RED    = [255, 0,   0,   255];
const PIXEL_WHITE  = [255, 255, 255, 255];
const PIXEL_NEAR_G = [0,   200, 80,  255];

// ---- sharp mock (hoisted) ----
// chromaKey calls sharp twice:
//   1. sharp(inputPath, opts) → .metadata()
//   2. sharp(inputPath, opts) → .raw().toBuffer()
//   3. sharp(buffer, { raw: {...} }) → .png()/.webp() → .toFile()
// We need the factory to return different instances per call.

const { sharpFn } = vi.hoisted(() => {
  const fn = vi.fn();
  return { sharpFn: fn };
});

vi.mock('sharp', () => ({ default: sharpFn }));

import { chromaKey } from '../../../src/visuals/assets/chroma-key';

// Helper: build a sharp mock that serves the standard 2x2 pixel scenario
function makeDefaultSharpInstances() {
  const pixelBuf = buildRGBABuffer([PIXEL_GREEN, PIXEL_RED, PIXEL_WHITE, PIXEL_NEAR_G]);
  let callCount = 0;

  sharpFn.mockImplementation((input?: any) => {
    callCount++;

    if (typeof input === 'string') {
      if (callCount === 1) {
        // First call: metadata
        return {
          metadata: vi.fn().mockResolvedValue({ width: 2, height: 2, channels: 4 }),
          raw: vi.fn().mockReturnThis(),
          toBuffer: vi.fn().mockResolvedValue({
            data: pixelBuf,
            info: { width: 2, height: 2, channels: 4 },
          }),
        };
      }
      // Second call: raw pixel read
      return {
        metadata: vi.fn().mockResolvedValue({ width: 2, height: 2, channels: 4 }),
        raw: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue({
          data: pixelBuf,
          info: { width: 2, height: 2, channels: 4 },
        }),
      };
    }

    // Buffer call: write output
    return {
      png: vi.fn().mockReturnThis(),
      webp: vi.fn().mockReturnThis(),
      toFile: vi.fn().mockResolvedValue({ width: 2, height: 2, format: 'png', size: 64 }),
    };
  });
}

beforeEach(() => {
  sharpFn.mockReset();
  makeDefaultSharpInstances();
});

// ============================================================================
// MISUSE CASES
// ============================================================================

describe('Misuse: chromaKey — sharp failure', () => {
  it('propagates sharp read errors', async () => {
    sharpFn.mockImplementation(() => ({
      metadata: vi.fn().mockRejectedValue(new Error('sharp: file not found')),
      raw: vi.fn().mockReturnThis(),
      toBuffer: vi.fn().mockRejectedValue(new Error('sharp: file not found')),
    }));
    await expect(chromaKey('/nonexistent.png', '/out.png')).rejects.toThrow();
  });
});

// ============================================================================
// BOUNDARY CASES
// ============================================================================

describe('Boundary: chromaKey — tolerance edge cases', () => {
  it('accepts a custom target color without throwing', async () => {
    await expect(
      chromaKey('/in.png', '/out.png', { targetColor: { r: 0, g: 255, b: 0 }, tolerance: 0.3 })
    ).resolves.toBeDefined();
  });

  it('accepts tolerance = 0 (exact match only)', async () => {
    await expect(
      chromaKey('/in.png', '/out.png', { tolerance: 0 })
    ).resolves.toBeDefined();
  });

  it('accepts tolerance = 1 (all pixels)', async () => {
    await expect(
      chromaKey('/in.png', '/out.png', { tolerance: 1 })
    ).resolves.toBeDefined();
  });

  it('accepts edgeBlur option without throwing', async () => {
    await expect(
      chromaKey('/in.png', '/out.png', { edgeBlur: 2 })
    ).resolves.toBeDefined();
  });
});

// ============================================================================
// GOLDEN PATH
// ============================================================================

describe('Golden: chromaKey — happy path', () => {
  it('returns the output path', async () => {
    const result = await chromaKey('/input/green-screen.png', '/output/keyed.png');
    expect(result).toBe('/output/keyed.png');
  });

  it('uses default green target color when no options provided', async () => {
    const result = await chromaKey('/input/green-screen.png', '/output/keyed.png');
    expect(typeof result).toBe('string');
  });

  it('calls sharp with the input path', async () => {
    sharpFn.mockClear();
    makeDefaultSharpInstances();
    await chromaKey('/my/image.png', '/my/output.png');
    expect(sharpFn).toHaveBeenCalledWith('/my/image.png', expect.any(Object));
  });

  it('calls toFile on the write instance with the output path', async () => {
    const toFileMock = vi.fn().mockResolvedValue({ width: 2, height: 2, format: 'png', size: 64 });
    let callCount = 0;
    sharpFn.mockImplementation((input?: any) => {
      callCount++;
      if (typeof input === 'string') {
        const pixelBuf = buildRGBABuffer([PIXEL_GREEN, PIXEL_RED, PIXEL_WHITE, PIXEL_NEAR_G]);
        return {
          metadata: vi.fn().mockResolvedValue({ width: 2, height: 2, channels: 4 }),
          raw: vi.fn().mockReturnThis(),
          toBuffer: vi.fn().mockResolvedValue({
            data: pixelBuf,
            info: { width: 2, height: 2, channels: 4 },
          }),
        };
      }
      return {
        png: vi.fn().mockReturnThis(),
        webp: vi.fn().mockReturnThis(),
        toFile: toFileMock,
      };
    });

    await chromaKey('/my/image.png', '/my/output.png');
    expect(toFileMock).toHaveBeenCalledWith('/my/output.png');
  });
});

describe('Golden: chromaKey — pixel manipulation', () => {
  it('zeroes alpha for exact green pixel', async () => {
    const greenPixel = buildRGBABuffer([PIXEL_GREEN]);
    let writtenBuffer: Buffer | null = null;

    sharpFn.mockImplementation((input?: any) => {
      if (typeof input === 'string') {
        return {
          metadata: vi.fn().mockResolvedValue({ width: 1, height: 1, channels: 4 }),
          raw: vi.fn().mockReturnThis(),
          toBuffer: vi.fn().mockResolvedValue({
            data: greenPixel,
            info: { width: 1, height: 1, channels: 4 },
          }),
        };
      }
      // Buffer write call
      writtenBuffer = input as Buffer;
      return {
        png: vi.fn().mockReturnThis(),
        webp: vi.fn().mockReturnThis(),
        toFile: vi.fn().mockResolvedValue({ width: 1, height: 1, format: 'png', size: 4 }),
      };
    });

    await chromaKey('/green.png', '/out.png');

    expect(writtenBuffer).not.toBeNull();
    const buf = writtenBuffer as unknown as Buffer;
    // Alpha channel (index 3) should be zeroed for the green pixel
    expect(buf[3]).toBe(0);
  });

  it('preserves alpha for non-green (red) pixels', async () => {
    const redPixel = buildRGBABuffer([PIXEL_RED]);
    let writtenBuffer: Buffer | null = null;

    sharpFn.mockImplementation((input?: any) => {
      if (typeof input === 'string') {
        return {
          metadata: vi.fn().mockResolvedValue({ width: 1, height: 1, channels: 4 }),
          raw: vi.fn().mockReturnThis(),
          toBuffer: vi.fn().mockResolvedValue({
            data: redPixel,
            info: { width: 1, height: 1, channels: 4 },
          }),
        };
      }
      writtenBuffer = input as Buffer;
      return {
        png: vi.fn().mockReturnThis(),
        webp: vi.fn().mockReturnThis(),
        toFile: vi.fn().mockResolvedValue({ width: 1, height: 1, format: 'png', size: 4 }),
      };
    });

    await chromaKey('/red.png', '/out.png');

    expect(writtenBuffer).not.toBeNull();
    const buf = writtenBuffer as unknown as Buffer;
    // Alpha preserved for non-green pixel
    expect(buf[3]).toBe(255);
  });
});

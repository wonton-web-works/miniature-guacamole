/**
 * Unit Tests: Asset Pipeline
 *
 * Tests the main pipeline orchestrator.
 * Mocks removeBackground and postProcess to test flow logic only.
 *
 * Test ordering: misuse-first per CAD TDD protocol
 *   1. MISUSE   — invalid requests, downstream failures
 *   2. BOUNDARY — optional steps (bg removal, post-process)
 *   3. GOLDEN   — happy path full pipeline
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Hoisted mocks ----
const { sharpMetaMock, sharpFn } = vi.hoisted(() => {
  const meta = {
    metadata: vi.fn().mockResolvedValue({ width: 512, height: 512, hasAlpha: false, format: 'png' }),
  };
  const fn = vi.fn(() => meta);
  return { sharpMetaMock: meta, sharpFn: fn };
});

vi.mock('sharp', () => ({ default: sharpFn }));

vi.mock('../../../src/visuals/assets/background-remover', () => ({
  removeBackground: vi.fn().mockResolvedValue('/output/processed-bg.png'),
}));

vi.mock('../../../src/visuals/assets/post-processor', () => ({
  postProcess: vi.fn().mockResolvedValue('/output/processed-final.png'),
}));

import { runAssetPipeline } from '../../../src/visuals/assets/pipeline';
import { removeBackground } from '../../../src/visuals/assets/background-remover';
import { postProcess } from '../../../src/visuals/assets/post-processor';

const mockRemoveBackground = removeBackground as ReturnType<typeof vi.fn>;
const mockPostProcess = postProcess as ReturnType<typeof vi.fn>;

const BASE_CONFIG = {
  outputDir: '/output',
  defaultFormat: 'png' as const,
  defaultQuality: 90,
};

// ============================================================================
// MISUSE CASES
// ============================================================================

describe('Misuse: runAssetPipeline — missing required fields', () => {
  it('throws when request.name is empty', async () => {
    const request = {
      prompt: 'a red circle',
      name: '',
      rawImagePath: '/tmp/generated.png',
    };
    await expect(runAssetPipeline(request, BASE_CONFIG)).rejects.toThrow(/name.*required|required.*name/i);
  });

  it('throws when rawImagePath is missing', async () => {
    const request = {
      prompt: 'a red circle',
      name: 'red-circle',
      rawImagePath: '',
    };
    await expect(runAssetPipeline(request, BASE_CONFIG)).rejects.toThrow(
      /rawImagePath.*required|required.*rawImagePath|image.*path/i
    );
  });
});

describe('Misuse: runAssetPipeline — downstream step failure', () => {
  it('propagates background removal errors', async () => {
    mockRemoveBackground.mockRejectedValueOnce(new Error('rembg process failed'));
    const request = {
      prompt: 'a logo',
      name: 'logo',
      rawImagePath: '/tmp/logo.png',
      removeBackground: true,
    };
    await expect(runAssetPipeline(request, BASE_CONFIG)).rejects.toThrow('rembg process failed');
  });

  it('propagates post-processing errors', async () => {
    mockPostProcess.mockRejectedValueOnce(new Error('sharp: invalid format'));
    const request = {
      prompt: 'a banner',
      name: 'banner',
      rawImagePath: '/tmp/banner.png',
      postProcess: { format: 'webp' as const },
    };
    await expect(runAssetPipeline(request, BASE_CONFIG)).rejects.toThrow('sharp: invalid format');
  });
});

// ============================================================================
// BOUNDARY CASES
// ============================================================================

describe('Boundary: runAssetPipeline — removeBackground step', () => {
  beforeEach(() => {
    mockRemoveBackground.mockResolvedValue('/output/no-bg.png');
    mockPostProcess.mockResolvedValue('/output/final.png');
    sharpMetaMock.metadata.mockResolvedValue({ width: 512, height: 512, hasAlpha: true, format: 'png' });
  });

  it('calls removeBackground when removeBackground is true', async () => {
    const request = {
      prompt: 'a product shot',
      name: 'product',
      rawImagePath: '/tmp/product.png',
      removeBackground: true,
    };
    await runAssetPipeline(request, BASE_CONFIG);
    expect(mockRemoveBackground).toHaveBeenCalledWith(
      '/tmp/product.png',
      expect.any(String)
    );
  });

  it('skips removeBackground when removeBackground is false', async () => {
    const request = {
      prompt: 'a diagram',
      name: 'diagram',
      rawImagePath: '/tmp/diagram.png',
      removeBackground: false,
    };
    await runAssetPipeline(request, BASE_CONFIG);
    expect(mockRemoveBackground).not.toHaveBeenCalled();
  });

  it('skips removeBackground when removeBackground is omitted', async () => {
    const request = {
      prompt: 'a diagram',
      name: 'diagram',
      rawImagePath: '/tmp/diagram.png',
    };
    await runAssetPipeline(request, BASE_CONFIG);
    expect(mockRemoveBackground).not.toHaveBeenCalled();
  });
});

describe('Boundary: runAssetPipeline — postProcess step', () => {
  beforeEach(() => {
    mockRemoveBackground.mockResolvedValue('/output/no-bg.png');
    mockPostProcess.mockResolvedValue('/output/final.png');
    sharpMetaMock.metadata.mockResolvedValue({ width: 512, height: 512, hasAlpha: false, format: 'png' });
  });

  it('calls postProcess when postProcess options are provided', async () => {
    const request = {
      prompt: 'a banner',
      name: 'banner',
      rawImagePath: '/tmp/banner.png',
      postProcess: { format: 'webp' as const, quality: 85 },
    };
    await runAssetPipeline(request, BASE_CONFIG);
    expect(mockPostProcess).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ format: 'webp', quality: 85 })
    );
  });

  it('skips postProcess when postProcess options are omitted', async () => {
    const request = {
      prompt: 'simple image',
      name: 'simple',
      rawImagePath: '/tmp/simple.png',
    };
    await runAssetPipeline(request, BASE_CONFIG);
    expect(mockPostProcess).not.toHaveBeenCalled();
  });
});

describe('Boundary: runAssetPipeline — output path construction', () => {
  beforeEach(() => {
    mockRemoveBackground.mockResolvedValue('/output/no-bg.png');
    sharpMetaMock.metadata.mockResolvedValue({ width: 200, height: 200, hasAlpha: false, format: 'png' });
  });

  it('uses the name field in the bg-removed output filename', async () => {
    const request = {
      prompt: 'test',
      name: 'my-asset',
      rawImagePath: '/tmp/raw.png',
      removeBackground: true,
    };
    await runAssetPipeline(request, BASE_CONFIG);
    // bg-removed path should include the asset name
    expect(mockRemoveBackground).toHaveBeenCalledWith(
      '/tmp/raw.png',
      expect.stringContaining('my-asset')
    );
  });

  it('uses the outputDir from config in the bg-removed output path', async () => {
    const request = {
      prompt: 'test',
      name: 'my-asset',
      rawImagePath: '/tmp/raw.png',
      removeBackground: true,
    };
    await runAssetPipeline(request, { ...BASE_CONFIG, outputDir: '/custom/output' });
    expect(mockRemoveBackground).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('/custom/output')
    );
  });
});

// ============================================================================
// GOLDEN PATH
// ============================================================================

describe('Golden: runAssetPipeline — happy path without optional steps', () => {
  beforeEach(() => {
    sharpMetaMock.metadata.mockResolvedValue({ width: 1024, height: 768, hasAlpha: false, format: 'png' });
  });

  it('returns a GenerateAssetResult with all required fields', async () => {
    const request = {
      prompt: 'a mountain landscape',
      name: 'landscape',
      rawImagePath: '/tmp/landscape.png',
    };
    const result = await runAssetPipeline(request, BASE_CONFIG);

    expect(result).toMatchObject({
      originalPath: '/tmp/landscape.png',
      processedPath: expect.any(String),
      format: expect.any(String),
      width: expect.any(Number),
      height: expect.any(Number),
      hasTransparency: expect.any(Boolean),
    });
  });

  it('sets originalPath to rawImagePath', async () => {
    const request = {
      prompt: 'a mountain landscape',
      name: 'landscape',
      rawImagePath: '/tmp/landscape.png',
    };
    const result = await runAssetPipeline(request, BASE_CONFIG);
    expect(result.originalPath).toBe('/tmp/landscape.png');
  });

  it('sets hasTransparency to false when image has no alpha', async () => {
    sharpMetaMock.metadata.mockResolvedValue({ width: 100, height: 100, hasAlpha: false, format: 'png' });
    const request = { prompt: 'test', name: 'test', rawImagePath: '/tmp/test.png' };
    const result = await runAssetPipeline(request, BASE_CONFIG);
    expect(result.hasTransparency).toBe(false);
  });
});

describe('Golden: runAssetPipeline — happy path with bg removal + post-processing', () => {
  beforeEach(() => {
    mockRemoveBackground.mockResolvedValue('/output/landscape-nobg.png');
    mockPostProcess.mockResolvedValue('/output/landscape-final.webp');
    sharpMetaMock.metadata.mockResolvedValue({ width: 1024, height: 768, hasAlpha: true, format: 'webp' });
  });

  it('runs bg removal then post-processing in order', async () => {
    const callOrder: string[] = [];
    mockRemoveBackground.mockImplementation(async () => {
      callOrder.push('removeBackground');
      return '/output/no-bg.png';
    });
    mockPostProcess.mockImplementation(async () => {
      callOrder.push('postProcess');
      return '/output/final.webp';
    });

    const request = {
      prompt: 'product photo',
      name: 'product',
      rawImagePath: '/tmp/product.png',
      removeBackground: true,
      postProcess: { format: 'webp' as const },
    };
    await runAssetPipeline(request, BASE_CONFIG);

    expect(callOrder).toEqual(['removeBackground', 'postProcess']);
  });

  it('returns processedPath pointing to post-processed output', async () => {
    const request = {
      prompt: 'product photo',
      name: 'product',
      rawImagePath: '/tmp/product.png',
      removeBackground: true,
      postProcess: { format: 'webp' as const },
    };
    const result = await runAssetPipeline(request, BASE_CONFIG);
    expect(result.processedPath).toBe('/output/landscape-final.webp');
  });

  it('sets hasTransparency to true when image has alpha', async () => {
    const request = {
      prompt: 'logo with transparency',
      name: 'logo',
      rawImagePath: '/tmp/logo.png',
      removeBackground: true,
    };
    const result = await runAssetPipeline(request, BASE_CONFIG);
    expect(result.hasTransparency).toBe(true);
  });
});

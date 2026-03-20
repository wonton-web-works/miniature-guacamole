/**
 * Unit Tests: Post Processor
 *
 * Tests sharp-based image post-processing.
 *
 * Test ordering: misuse-first per CAD TDD protocol
 *   1. MISUSE   — bad options, sharp errors
 *   2. BOUNDARY — individual option paths
 *   3. GOLDEN   — happy path with full options
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- sharp mock (hoisted so vi.mock factory can reference it) ----
const { sharpChainMock, sharpMock } = vi.hoisted(() => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    resize: vi.fn(),
    toFormat: vi.fn(),
    composite: vi.fn(),
    trim: vi.fn(),
    toFile: vi.fn(),
  };
  chain.resize.mockReturnValue(chain);
  chain.toFormat.mockReturnValue(chain);
  chain.composite.mockReturnValue(chain);
  chain.trim.mockReturnValue(chain);
  chain.toFile.mockResolvedValue({ width: 100, height: 100, format: 'png', size: 1024 });

  const factory = vi.fn(() => chain);
  return { sharpChainMock: chain, sharpMock: factory };
});

vi.mock('sharp', () => ({ default: sharpMock }));

import { postProcess } from '../../../src/visuals/assets/post-processor';

function resetChain() {
  sharpChainMock.resize.mockReturnValue(sharpChainMock);
  sharpChainMock.toFormat.mockReturnValue(sharpChainMock);
  sharpChainMock.composite.mockReturnValue(sharpChainMock);
  sharpChainMock.trim.mockReturnValue(sharpChainMock);
  sharpChainMock.toFile.mockResolvedValue({ width: 100, height: 100, format: 'png', size: 1024 });
}

// ============================================================================
// MISUSE CASES
// ============================================================================

describe('Misuse: postProcess — sharp failure', () => {
  beforeEach(resetChain);

  it('propagates sharp errors to the caller', async () => {
    sharpChainMock.toFile.mockRejectedValueOnce(new Error('sharp: unsupported format'));
    await expect(postProcess('/in.png', '/out.png', {})).rejects.toThrow('sharp: unsupported format');
  });

  it('propagates sharp errors for resize operations', async () => {
    sharpChainMock.toFile.mockRejectedValueOnce(new Error('Invalid dimensions'));
    await expect(
      postProcess('/in.png', '/out.png', { resize: { width: -1, height: -1 } })
    ).rejects.toThrow('Invalid dimensions');
  });
});

// ============================================================================
// BOUNDARY CASES
// ============================================================================

describe('Boundary: postProcess — resize option', () => {
  beforeEach(() => {
    resetChain();
    sharpChainMock.toFile.mockResolvedValue({ width: 800, height: 600, format: 'png', size: 1024 });
  });

  it('calls sharp resize when resize option provided', async () => {
    await postProcess('/in.png', '/out.png', { resize: { width: 800, height: 600 } });
    expect(sharpChainMock.resize).toHaveBeenCalledWith(
      expect.objectContaining({ width: 800, height: 600 })
    );
  });

  it('passes fit option through to sharp resize', async () => {
    await postProcess('/in.png', '/out.png', { resize: { width: 800, height: 600, fit: 'contain' } });
    expect(sharpChainMock.resize).toHaveBeenCalledWith(
      expect.objectContaining({ fit: 'contain' })
    );
  });

  it('does not call resize when resize option is omitted', async () => {
    await postProcess('/in.png', '/out.png', { format: 'png' });
    expect(sharpChainMock.resize).not.toHaveBeenCalled();
  });
});

describe('Boundary: postProcess — format option', () => {
  beforeEach(() => {
    resetChain();
    sharpChainMock.toFile.mockResolvedValue({ width: 100, height: 100, format: 'webp', size: 512 });
  });

  it('calls toFormat with webp when format is webp', async () => {
    await postProcess('/in.png', '/out.webp', { format: 'webp', quality: 80 });
    expect(sharpChainMock.toFormat).toHaveBeenCalledWith('webp', expect.objectContaining({ quality: 80 }));
  });

  it('calls toFormat with avif when format is avif', async () => {
    sharpChainMock.toFile.mockResolvedValue({ width: 100, height: 100, format: 'avif', size: 256 });
    await postProcess('/in.png', '/out.avif', { format: 'avif', quality: 60 });
    expect(sharpChainMock.toFormat).toHaveBeenCalledWith('avif', expect.objectContaining({ quality: 60 }));
  });

  it('does not call toFormat when format is omitted', async () => {
    sharpChainMock.toFile.mockResolvedValue({ width: 100, height: 100, format: 'png', size: 256 });
    await postProcess('/in.png', '/out.png', {});
    expect(sharpChainMock.toFormat).not.toHaveBeenCalled();
  });
});

describe('Boundary: postProcess — composite option', () => {
  beforeEach(() => {
    resetChain();
    sharpChainMock.toFile.mockResolvedValue({ width: 100, height: 100, format: 'png', size: 1024 });
  });

  it('calls composite when composite layers are provided', async () => {
    await postProcess('/in.png', '/out.png', {
      composite: [{ input: '/overlay.png', gravity: 'center' }],
    });
    expect(sharpChainMock.composite).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ input: '/overlay.png' })])
    );
  });

  it('does not call composite when composite option is omitted', async () => {
    await postProcess('/in.png', '/out.png', {});
    expect(sharpChainMock.composite).not.toHaveBeenCalled();
  });
});

describe('Boundary: postProcess — trim option', () => {
  beforeEach(() => {
    resetChain();
    sharpChainMock.toFile.mockResolvedValue({ width: 100, height: 100, format: 'png', size: 512 });
  });

  it('calls trim when trim option is true', async () => {
    await postProcess('/in.png', '/out.png', { trim: true });
    expect(sharpChainMock.trim).toHaveBeenCalled();
  });

  it('does not call trim when trim is false', async () => {
    await postProcess('/in.png', '/out.png', { trim: false });
    expect(sharpChainMock.trim).not.toHaveBeenCalled();
  });

  it('does not call trim when trim is omitted', async () => {
    await postProcess('/in.png', '/out.png', {});
    expect(sharpChainMock.trim).not.toHaveBeenCalled();
  });
});

// ============================================================================
// GOLDEN PATH
// ============================================================================

describe('Golden: postProcess — happy path', () => {
  beforeEach(() => {
    resetChain();
    sharpChainMock.toFile.mockResolvedValue({ width: 800, height: 600, format: 'webp', size: 2048 });
  });

  it('calls sharp with the input path', async () => {
    await postProcess('/input/image.png', '/output/result.webp', { format: 'webp' });
    expect(sharpMock).toHaveBeenCalledWith('/input/image.png');
  });

  it('calls toFile with the output path', async () => {
    await postProcess('/input/image.png', '/output/result.webp', { format: 'webp' });
    expect(sharpChainMock.toFile).toHaveBeenCalledWith('/output/result.webp');
  });

  it('returns the output path', async () => {
    const result = await postProcess('/input/image.png', '/output/result.webp', { format: 'webp' });
    expect(result).toBe('/output/result.webp');
  });

  it('applies all options together: resize + format + composite + trim', async () => {
    await postProcess('/in.png', '/out.webp', {
      resize: { width: 800, height: 600, fit: 'cover' },
      format: 'webp',
      quality: 85,
      composite: [{ input: '/logo.png' }],
      trim: true,
    });

    expect(sharpChainMock.resize).toHaveBeenCalledWith(
      expect.objectContaining({ width: 800, height: 600, fit: 'cover' })
    );
    expect(sharpChainMock.toFormat).toHaveBeenCalledWith('webp', expect.objectContaining({ quality: 85 }));
    expect(sharpChainMock.composite).toHaveBeenCalled();
    expect(sharpChainMock.trim).toHaveBeenCalled();
  });
});

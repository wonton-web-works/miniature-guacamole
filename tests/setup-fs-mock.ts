/**
 * Vitest setup file that makes `fs` module spy-able.
 * This allows vi.spyOn(fsModule, 'existsSync') to work in tests
 * by wrapping the native fs module in a configurable proxy.
 */
import { vi } from 'vitest';

// Auto-mock fs with real implementations as defaults
// This makes all fs properties configurable so vi.spyOn works
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    default: actual,
  };
});

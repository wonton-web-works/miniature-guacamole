import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    environmentMatchGlobs: [
      ['tests/unit/components/**', 'jsdom'],
      ['tests/unit/hooks/**', 'jsdom'],
    ],
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.*',
        '.next/',
        'src/app/layout.tsx',
        'src/app/globals.css',
        'src/components/ui/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

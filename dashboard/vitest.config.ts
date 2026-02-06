import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.*',
        '.next/',
        'src/app/layout.tsx',
        'src/app/page.tsx',
        'src/app/globals.css',
      ],
      thresholds: {
        lines: 99,
        functions: 99,
        branches: 99,
        statements: 99,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

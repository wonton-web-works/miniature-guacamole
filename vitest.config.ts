/**
 * Vitest Configuration
 *
 * Configuration for unit and integration tests.
 * Targets 99% coverage for shared memory layer.
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Global test timeout (60 seconds for concurrent operations)
    testTimeout: 60000,

    // Hook timeout
    hookTimeout: 10000,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.ts',
        '**/*.spec.ts'
      ],
      // Target 99% coverage
      lines: 99,
      functions: 99,
      branches: 99,
      statements: 99,
      // Report coverage for these
      reportOnFailure: true,
      perFile: true
    },

    // Include patterns
    include: [
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts'
    ],

    // Exclude patterns
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
      'tests/e2e/**'
    ],

    // Globals
    globals: true,

    // Reporter
    reporters: ['verbose'],

    // Parallel execution
    threads: true,
    maxThreads: 4,
    minThreads: 1,

    // Retry failed tests
    retry: 0,

    // Setup files - enables vi.spyOn for built-in modules like fs
    setupFiles: ['./tests/setup-fs-mock.ts'],

    // Clear mock call history between tests.
    // Individual tests manage their own mock implementations via beforeEach.
    // mockReset and restoreMocks are intentionally disabled — they clear
    // vi.mock() factory implementations (e.g., pg Pool) which breaks adapter tests.
    clearMocks: true,
    mockReset: false,
    restoreMocks: false
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests')
    }
  }
});

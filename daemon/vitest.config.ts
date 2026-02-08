import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['node_modules/', 'tests/', '**/*.test.ts'],
      lines: 99,
      functions: 99,
      branches: 99,
      statements: 99,
      reportOnFailure: true,
      perFile: true
    },
    include: [
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts'
    ],
    exclude: ['node_modules', 'dist'],
    globals: true,
    reporters: ['verbose'],
    mockReset: true,
    restoreMocks: true,
    clearMocks: true
  }
});

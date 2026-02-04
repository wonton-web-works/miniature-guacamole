/**
 * Playwright Configuration
 *
 * Configuration for E2E tests for workstream persistence.
 * Tests workstream state across agent sessions.
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Match test files
  testMatch: '**/*.spec.ts',

  // Timeout for entire test
  timeout: 30000,

  // Global timeout
  globalTimeout: 600000,

  // Expect timeout
  expect: {
    timeout: 10000
  },

  // Parallel execution
  fullyParallel: true,

  // Fail on console errors
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  // Projects (browsers)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    }
  ],

  // Web server (if needed for API testing)
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI
  },

  // Reporter
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['junit', { outputFile: 'test-results/e2e-junit.xml' }]
  ],

  // Retry failed tests in CI
  retries: process.env.CI ? 2 : 0,

  // Workers in CI
  workers: process.env.CI ? 1 : undefined
});

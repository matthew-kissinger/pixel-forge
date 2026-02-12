import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E test configuration for Pixel Forge
 * 
 * Tests are located in the e2e/ directory at project root.
 * These tests use Playwright's test runner and are NOT picked up by vitest.
 * 
 * To run tests:
 *   npx playwright test
 * 
 * To install browsers:
 *   npx playwright install chromium
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:5173',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: '**/mobile-viewport.spec.ts',
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
      testMatch: '**/mobile-viewport.spec.ts',
    },
    {
      name: 'tablet',
      use: { ...devices['iPad (gen 7)'] },
      testMatch: '**/mobile-viewport.spec.ts',
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'bun run dev:client',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});

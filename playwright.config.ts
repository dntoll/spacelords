import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';

process.env.PW_TEST_SOURCE_TRANSFORM = fileURLToPath(
  new URL('./scripts/playwright-raw-assets.cjs', import.meta.url),
);
process.env.PW_TEST_SOURCE_TRANSFORM_SCOPE = fileURLToPath(
  new URL('./src/', import.meta.url),
);

export default defineConfig({
  // app-skal: each module keeps its browser tests in tests/<module>/browser.
  testDir: './tests',
  testMatch: ['*/browser/**/*.spec.ts'],
  fullyParallel: false,
  // utokad-testsvit: tablet waits until more platforms are chosen.
  workers: 6,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4178/spacelords/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // utokad-testsvit: six parallel workers slow Chromium by about half.
    {
      name: 'phone-chromium',
      use: { ...devices['Pixel 7'] },
      timeout: 45_000,
      metadata: { timeoutScale: 1.5 },
    },
    {
      name: 'desktop-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1000 },
      },
      timeout: 45_000,
      metadata: { timeoutScale: 1.5 },
    },
    // utokad-testsvit: WebKit runs about three times slower on Windows.
    {
      name: 'phone-webkit',
      use: { ...devices['iPhone 13'] },
      timeout: 90_000,
      metadata: { timeoutScale: 3 },
    },
  ],
  webServer: {
    command: 'node scripts/preview-pages.mjs',
    url: 'http://127.0.0.1:4178/spacelords/',
    reuseExistingServer: false,
    timeout: 15_000,
  },
});

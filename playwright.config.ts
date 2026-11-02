import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';

process.env.PW_TEST_SOURCE_TRANSFORM = fileURLToPath(
  new URL('./scripts/playwright-raw-assets.cjs', import.meta.url),
);
process.env.PW_TEST_SOURCE_TRANSFORM_SCOPE = fileURLToPath(
  new URL('./src/', import.meta.url),
);

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 2,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4178/spacelords/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'phone-chromium', use: { ...devices['Pixel 7'] } },
    {
      name: 'desktop-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1000 },
      },
    },
    { name: 'phone-webkit', use: { ...devices['iPhone 13'] } },
    { name: 'tablet-webkit', use: { ...devices['iPad Mini'] } },
  ],
  webServer: {
    command: 'node scripts/preview-pages.mjs',
    url: 'http://127.0.0.1:4178/spacelords/',
    reuseExistingServer: false,
    timeout: 15_000,
  },
});

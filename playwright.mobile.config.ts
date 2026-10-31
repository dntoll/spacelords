import { defineConfig } from '@playwright/test';
import base from './playwright.config.js';

const liveURL = process.env.SPACELORDS_SMOKE_URL;
if (liveURL && liveURL !== 'https://curiousengineerstudio.se/spacelords/')
  throw new Error('Unexpected live smoke URL.');

export default defineConfig({
  ...base,
  testMatch: ['**/mobile-smoke.spec.ts', '**/tactical-combat.spec.ts'],
  projects: base.projects!.filter((project) =>
    ['phone-chromium', 'phone-webkit'].includes(project.name!),
  ),
  reporter: [['list']],
  webServer: liveURL ? [] : base.webServer!,
  use: { ...base.use, baseURL: liveURL ?? 'http://127.0.0.1:4178/spacelords/' },
});

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  fullyParallel: true,
  workers: process.env.CI ? 1 : 10,
  snapshotPathTemplate: '{testDir}/screenshots/{arg}{ext}',
  use: {
    baseURL: 'http://localhost:3000',
  },
  reporter: [
    ['html'],
    ['list'],
    ...(process.env.CI ? [['github'] as const] : []),
  ],
  webServer: {
    command: 'yarn serve . -p 3000 -s',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
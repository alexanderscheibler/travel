import {test, devices, expect} from '@playwright/test';
import path from 'path';

// Sanitize device name for use as a filename
function sanitize(name: string): string {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

// Grab every device Playwright ships with
const allDevices = Object.entries(devices);

for (const [deviceName, deviceConfig] of allDevices) {
  test(`screenshot — ${deviceName}`, async ({ browser }) => {

    const context = await browser.newContext({
      ...deviceConfig,
    });

    const page = await context.newPage();
    await page.goto('/index.html');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot(`${sanitize(deviceName)}.png`, {
      fullPage: true,
      maxDiffPixels: 1,
    });

    await context.close();
  });
}
import { expect, test } from '@playwright/test';
import { startFirstSlot } from './save-helpers.js';

test('tre-sparplatser / sparat-spel / tomm-sparplats: reload, preview, isolation and confirmation', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await expect(
    page.getByRole('heading', { name: 'Saved games', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(3);
  await page.screenshot({
    path: testInfo.outputPath('save-slots-empty.png'),
    fullPage: true,
  });
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'End turn', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'End turn', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Saved games', exact: true }).click();
  const first = page.getByRole('article', { name: 'Save slot 1', exact: true });
  const second = page.getByRole('article', {
    name: 'Save slot 2',
    exact: true,
  });
  await expect(first.locator('time')).toBeVisible();
  await expect(first).toContainText('Year 2');
  await expect(
    first.locator('canvas[data-preview-rendered="true"]'),
  ).toBeVisible();
  await expect(second).toContainText('Empty slot');
  await page.screenshot({
    path: testInfo.outputPath('save-slots-progress.png'),
    fullPage: true,
  });
  await first.getByRole('button', { name: 'Clear slot' }).click();
  await expect(page.getByRole('dialog')).toContainText('cannot be undone');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(first).toContainText('Year 2');
  await page.reload();
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Saved games', exact: true }).click();
  await expect(first).toContainText('Year 2');
  await second.getByRole('button', { name: 'Start game' }).click();
  await page.getByRole('button', { name: 'Saved games', exact: true }).click();
  await first.getByRole('button', { name: 'Clear slot' }).click();
  await page.getByRole('button', { name: 'Delete saved game' }).click();
  await expect(first).toContainText('Empty slot');
  await expect(second).toContainText('Year 1');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Saved games', exact: true }).click();
  await expect(first).toContainText('Year 1');
  expect(errors).toEqual([]);
});

test('tomm-sparplats: destructive actions retain readable text contrast', async ({
  page,
}) => {
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Saved games', exact: true }).click();
  const clear = page
    .getByRole('article', { name: 'Save slot 1', exact: true })
    .getByRole('button', { name: 'Clear slot' });
  const contrast = await clear.evaluate((node) => {
    const style = getComputedStyle(node);
    const luminance = (color: string): number => {
      const channels = color
        .match(/\d+/g)!
        .slice(0, 3)
        .map(Number)
        .map((value) => {
          const channel = value / 255;
          return channel <= 0.04045
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4;
        });
      return (
        channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
      );
    };
    const foreground = luminance(style.color);
    const background = luminance(style.backgroundColor);
    return (
      (Math.max(foreground, background) + 0.05) /
      (Math.min(foreground, background) + 0.05)
    );
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
});

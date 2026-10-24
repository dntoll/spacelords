import { expect, test } from '@playwright/test';
import { endTurn, startFirstSlot } from './save-helpers.js';

test('snabb-mobilpublicering / viewport-game-layout / sparat-spel: touch navigation and saved progress survive reload', async ({
  page,
}, testInfo) => {
  test.skip(
    !testInfo.project.name.startsWith('phone-'),
    'The smoke suite targets phones.',
  );
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => errors.push(request.url()));
  page.on('response', (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
    const path = new URL(response.url()).pathname;
    if (path.startsWith('/assets/') || path.startsWith('/api/'))
      errors.push(path);
  });
  await page.goto('./');
  await startFirstSlot(page);
  const map = page.locator('canvas[data-rendered="true"]');
  await expect(map).toBeVisible();
  const bounds = (await map.boundingBox())!;
  expect(
    (bounds.width * bounds.height) /
      (page.viewportSize()!.width * page.viewportSize()!.height),
  ).toBeGreaterThan(0.8);
  await page.getByRole('button', { name: 'Open planet', exact: true }).tap();
  await expect(
    page.getByRole('heading', { name: 'Tellus', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Research', exact: true }).tap();
  await expect(
    page.getByRole('heading', { name: 'Research', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Fleets', exact: true }).tap();
  await expect(map).toHaveAttribute('aria-label', /^Fleets map\./);
  await page.getByRole('button', { name: 'Star map', exact: true }).tap();
  await expect(map).toHaveAttribute('aria-label', /^Star map\./);
  expect(
    await page.evaluate(() => ({
      horizontal: document.documentElement.scrollWidth > innerWidth,
      vertical: document.documentElement.scrollHeight > innerHeight,
    })),
  ).toEqual({ horizontal: false, vertical: false });
  // Live smoke stops after navigation; save/reload is covered before publishing.
  if (process.env.SPACELORDS_SMOKE_URL) {
    expect(errors).toEqual([]);
    return;
  }
  await endTurn(page);
  await page.getByRole('button', { name: 'Saved games', exact: true }).tap();
  const slot = page.getByRole('article', { name: 'Save slot 1', exact: true });
  await expect(slot).toContainText('Year 2');
  await page.waitForLoadState('networkidle');
  await page.reload();
  await expect(slot).toContainText('Year 2');
  await startFirstSlot(page);
  await expect(map).toBeVisible();
  expect(errors).toEqual([]);
});

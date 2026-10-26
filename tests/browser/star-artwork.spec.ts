import { expect, test } from '@playwright/test';
import { startFirstSlot } from './save-helpers.js';
import { selectMapHex } from './map-helpers.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';

test('stjarnornas-hexutseende / utokad-utzoomning: textured stars stay inside hexes and the galaxy can be viewed at 3 percent', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await startFirstSlot(page);
  const map = page.locator('canvas[data-rendered="true"]');
  await expect(map).toHaveAttribute('data-star-texture-ready', 'true');
  await selectMapHex(page, new HexCoordinate(0, 0));
  await map.press('ArrowLeft');
  await map.press('ArrowLeft');
  for (let step = 0; step < 5; step++) await map.press('+');
  await page.screenshot({
    path: testInfo.outputPath('textured-star-closeup.png'),
  });
  await map.press('Home');
  await expect(page.getByLabel('Map zoom')).toHaveText('100%');
  await selectMapHex(page, new HexCoordinate(2, -3));
  for (let step = 0; step < 22; step++) await map.press('-');
  await expect(page.getByLabel('Map zoom')).toHaveText('3%');
  await page.screenshot({ path: testInfo.outputPath('galaxy-overview.png') });
  await map.press('+');
  await expect(page.getByLabel('Map zoom')).toHaveText('4%');
  await map.press('Home');
  await expect(page.getByLabel('Map zoom')).toHaveText('100%');
  expect(errors).toEqual([]);
});

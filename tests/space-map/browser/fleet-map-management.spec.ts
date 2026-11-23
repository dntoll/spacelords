import { HexCoordinate } from '../../../src/client/common/HexCoordinate.js';
import { selectMapHex } from './map-helpers.js';
import { expect, test } from '@playwright/test';
import { startFirstSlot } from './save-helpers.js';

test('flottnamn-direktredigering / flottknappar-pa-kartan: rename the fleet and preview a route on the map, then restore the name', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await startFirstSlot(page);
  const panel = page.locator('.selection-panel');
  const camera = await page.getByTestId('camera-position').textContent();
  await expect(
    panel.getByRole('button', { name: 'Edit fleet', exact: true }),
  ).toHaveCount(0);
  await expect(
    panel.locator('.fleet-panel-sizing, .fleet-panel-help'),
  ).toHaveCount(0);
  const name = page.getByRole('textbox', { name: 'Fleet name', exact: true });
  await panel
    .getByRole('button', { name: 'Home Fleet', exact: true })
    .dblclick();
  await expect(name).toBeFocused();
  await name.fill('Vanguard');
  await name.press('Enter');
  await expect(
    panel.getByRole('heading', { name: 'Vanguard', exact: true }),
  ).toBeVisible();
  await panel.getByRole('button', { name: 'Vanguard', exact: true }).dblclick();
  await name.fill('Discard this');
  await name.press('Escape');
  await expect(
    panel.getByRole('heading', { name: 'Vanguard', exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('camera-position')).toHaveText(camera!);
  await selectMapHex(page, new HexCoordinate(0, 1));
  await expect(panel).toContainText('Select the hex again to travel.');
  const dimensions = await page.evaluate(() => ({
    overflow:
      document.documentElement.scrollWidth > innerWidth ||
      document.documentElement.scrollHeight > innerHeight,
    clipped: [
      ...document.querySelectorAll(
        '.map-fleet-management button:not(.fleet-name-button):not(.fleet-order-button):not(.fleet-order-status)',
      ),
    ].some(
      (node) =>
        node.getClientRects().length > 0 &&
        node.getBoundingClientRect().height < 44,
    ),
  }));
  expect(dimensions.overflow).toBe(false);
  expect(dimensions.clipped).toBe(false);
  await page.screenshot({
    path: testInfo.outputPath('map-fleet-management.png'),
  });
  await page.reload();
  await startFirstSlot(page);
  await expect(
    panel.getByRole('heading', { name: 'Vanguard', exact: true }),
  ).toBeVisible();
  // hexval-med-vag: a previewed route is not an order and is not restored.
  await expect(panel.locator('.fleet-card')).not.toHaveAttribute(
    'aria-description',
    /Destination:/,
  );
  expect(errors).toEqual([]);
});

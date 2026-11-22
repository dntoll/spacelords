import { expect, test, type Page } from '@playwright/test';
import type { GameState } from '../../../src/client/space-map/models/Game.js';
import { researchStationState } from '../../fixtures/research-station.js';
import { tradeNetworkState } from '../../fixtures/trade-network.js';
import { startFirstSlot } from './save-helpers.js';

async function start(page: Page, state: GameState) {
  await page.addInitScript((state) => {
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-27', state }),
    );
  }, state);
  await page.goto('./');
  await startFirstSlot(page);
}

for (const gesture of ['double click', 'double tap'] as const) {
  test(`dubbelklick-koar-forskning: ${gesture} queues once after inspecting the tile`, async ({
    page,
    isMobile,
  }) => {
    test.skip(
      gesture === 'double tap' && !isMobile,
      'Native touch requires a mobile device.',
    );
    await start(page, researchStationState());
    await page.getByRole('button', { name: 'Research', exact: true }).click();
    const tile = page.getByRole('button', {
      name: 'Inspect Rocket engine factory',
      exact: true,
    });
    await tile.focus();
    if (gesture === 'double click') await tile.dblclick();
    else {
      // Avoid locator actionability waits between the two touch inputs.
      const bounds = (await tile.boundingBox())!;
      const x = bounds.x + bounds.width / 2,
        y = bounds.y + bounds.height / 2;
      await page.touchscreen.tap(x, y);
      await page.touchscreen.tap(x, y);
    }
    await expect(page.locator('.research-queue-order')).toHaveCount(1);
    await expect(page.locator('.research-queue-order')).toContainText(
      'Rocket engine factory',
    );
  });
}

test('rutter-endast-i-connect: native touch connects planets in Factories', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'Native touch requires a mobile device.');
  await start(page, tradeNetworkState());
  await page.getByRole('button', { name: 'Factories', exact: true }).tap();
  await page.getByRole('button', { name: 'Connect Tellus', exact: true }).tap();
  await page.getByRole('button', { name: 'Connect Vesta', exact: true }).tap();
  await expect(page.locator('.factory-group')).toContainText('Tellus, Vesta');
  await expect(page.locator('.factory-group')).toContainText('1 link');
});

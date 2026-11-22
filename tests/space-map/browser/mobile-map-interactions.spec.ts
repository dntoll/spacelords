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

test('centrerat-kartfokus / kartpanel-till-events: Show centers Vesta above the production panel', async ({
  page,
  isMobile,
}, testInfo) => {
  test.skip(
    !isMobile,
    'Desktop places the panel beside the map, not below it.',
  );
  const state = tradeNetworkState();
  state.colonies[1]![1].projects = [];
  // produktionsbeslut-bara-for-skeppsfabrik: an idle ship factory asks for orders.
  state.colonies[1]![1].buildings.push({
    id: 'vesta-yard',
    type: 'Transport ship factory',
    slotIndex: 1,
    demolition: false,
  });
  await start(page, state);
  await page.getByRole('button', { name: 'Production', exact: true }).click();
  await page
    .getByRole('button', { name: /^Show decision: Vesta: choose production/ })
    .click();
  await expect(async () => {
    const map = (await page.locator('canvas').boundingBox())!;
    const panel = (await page.locator('.selection-panel').boundingBox())!;
    const origin = await page.locator('.production-ring').evaluate((ring) => {
      const rect = ring.getBoundingClientRect();
      return { x: rect.x, y: rect.y };
    });
    expect(Math.abs(origin.x - map.x - map.width / 2)).toBeLessThan(3);
    expect(Math.abs(origin.y - (map.y + panel.y - 8) / 2)).toBeLessThan(3);
    const footer = (await page.locator('.game-turn-actions').boundingBox())!;
    expect(footer.y - panel.y - panel.height).toBeLessThanOrEqual(12);
  }).toPass();
  await page.screenshot({ path: testInfo.outputPath('centered-vesta.png') });
});

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

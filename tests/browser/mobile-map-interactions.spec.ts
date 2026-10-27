import { expect, test, type Page } from '@playwright/test';
import type { GameState } from '../../src/client/models/Game.js';
import { HexGeometry } from '../../src/client/models/HexCoordinate.js';
import { Game } from '../../src/client/models/Game.js';
import { researchStationState } from '../fixtures/research-station.js';
import { tradeNetworkState } from '../fixtures/trade-network.js';
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
  }) => {
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
}, testInfo) => {
  const state = tradeNetworkState(false);
  state.colonies[1]![1].projects = [];
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

test('handelsrutt-skapande-pa-stjarnkartan: native touch drags an exposed selected planet into a route', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Native touch drag uses Chromium CDP.');
  const state = tradeNetworkState(false);
  await start(page, state);
  const [source, target] = Game.restore(state).ownedPlanetSnapshots();
  const a = HexGeometry.toPoint(source!.position),
    b = HexGeometry.toPoint(target!.position);
  const map = page.locator('canvas');
  await expect(map).toHaveAttribute('data-rendered', 'true');
  await expect
    .poll(async () => {
      const bounds = (await map.boundingBox())!;
      const camera = (await page.getByTestId('camera-position').textContent())!
        .match(/-?\d+/g)!
        .map(Number);
      const y = bounds.y + bounds.height / 2 + a.y - camera[1]!;
      return y < (await page.locator('.selection-panel').boundingBox())!.y - 20;
    })
    .toBe(true);
  const bounds = (await map.boundingBox())!;
  const camera = (await page.getByTestId('camera-position').textContent())!
    .match(/-?\d+/g)!
    .map(Number);
  const point = (world: { x: number; y: number }) => ({
    x: bounds.x + bounds.width / 2 + world.x - camera[0]!,
    y: bounds.y + bounds.height / 2 + world.y - camera[1]!,
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ ...point(a), id: 1 }],
  });
  for (let step = 1; step <= 8; step++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        {
          ...point({
            x: a.x + ((b.x - a.x) * step) / 8,
            y: a.y + ((b.y - a.y) * step) / 8,
          }),
          id: 1,
        },
      ],
    });
  }
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await expect(
    page.getByRole('complementary', { name: 'Selected route', exact: true }),
  ).toContainText('Tellus ↔ Vesta');
  await cdp.detach();
});

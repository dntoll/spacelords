import { selectMapHex } from './map-helpers.js';
import { HexCoordinate } from '../../../src/client/common/HexCoordinate.js';
import { expect, test } from '@playwright/test';
import { startFirstSlot, finishRound } from './save-helpers.js';
import { Game } from '../../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';

test.beforeEach(async ({ page }) => {
  const initial = new Game(createExampleGalaxy()).exportState();
  const state = {
    ...initial,
    explored: [...new Set([...initial.explored, '-2,0'])],
    world: {
      ...initial.world,
      terrain: initial.world.terrain?.filter(
        (cell) => cell.position.q !== -2 || cell.position.r !== 0,
      ),
    },
  };
  await page.addInitScript((state) => {
    if (localStorage.getItem('turn-console-seeded')) return;
    localStorage.setItem('turn-console-seeded', 'yes');
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-26', state }),
    );
  }, state);
});

for (const size of [
  { width: 320, height: 568 },
  { width: 393, height: 851 },
  { width: 844, height: 390 },
  { width: 667, height: 320 },
]) {
  test(`handelser-som-toppnotis / ap-pa-starmap: the selection fits without an Events list and rounds pass without End turn at ${size.width}x${size.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(size);
    await page.goto('./');
    await startFirstSlot(page);
    const panel = page.locator('.selection-panel');
    await expect(panel).toBeVisible();
    // handelser-som-toppnotis: events show as top notices, not in a list.
    await expect(page.locator('.turn-console')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'End turn' })).toHaveCount(0);
    await expect(
      page.getByRole('combobox', { name: 'Known objects' }),
    ).toHaveCount(0);
    await expect(page.getByRole('group', { name: 'Map controls' })).toHaveCount(
      0,
    );
    const selected = (await panel.boundingBox())!;
    const map = (await page.getByTestId('map-container').boundingBox())!;
    if (size.width > size.height) {
      // liggande-layout: details form a column beside the map in landscape.
      expect(selected.width).toBeLessThanOrEqual(size.width * 0.45);
      expect(selected.x + selected.width).toBeGreaterThan(size.width - 20);
      expect(selected.height).toBeGreaterThan(map.height * 0.5);
    } else {
      expect(selected.width).toBeGreaterThan(size.width - 30);
      expect(selected.height).toBeGreaterThan(map.height * 0.3);
    }
    expect(selected.y).toBeGreaterThan(map.y);
    expect(selected.y + selected.height).toBeLessThanOrEqual(
      map.y + map.height + 1,
    );
    await page.screenshot({
      path: testInfo.outputPath('selection-lower-area.png'),
    });

    await selectMapHex(page, new HexCoordinate(-2, 0));
    // hexval-med-vag: an empty hex shows the route there instead of nothing.
    await expect(panel).toContainText('Select the hex again to travel.');
    await expect(page.getByText('Empty space', { exact: true })).toHaveCount(0);
    await finishRound(page);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath('turn-actions.png'),
    });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollHeight <= innerHeight &&
          document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

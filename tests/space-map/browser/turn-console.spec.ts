import { selectMapHex, selectMapObject } from './map-helpers.js';
import { HexCoordinate } from '../../../src/client/common/HexCoordinate.js';
import { expect, test } from '@playwright/test';
import { startFirstSlot, endTurn } from './save-helpers.js';
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
  test(`end-turn-vid-kartval: selection leaves room for End turn at ${size.width}x${size.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(size);
    await page.goto('./');
    await startFirstSlot(page);
    const end = page.getByRole('button', { name: 'End turn', exact: true });
    const console = page.getByRole('region', { name: 'Turn console' });
    const log = page.getByRole('log', { name: 'Game events' });
    const panel = page.locator('.selection-panel');
    await expect(panel).toBeVisible();
    await expect(console).toBeVisible();
    await expect(end).toBeVisible();
    await expect(
      page.getByRole('combobox', { name: 'Known objects' }),
    ).toHaveCount(0);
    await expect(page.getByRole('group', { name: 'Map controls' })).toHaveCount(
      0,
    );
    await expect(page.locator('.map-order-legend')).toHaveCount(0);
    const selected = (await panel.boundingBox())!;
    const map = (await page.getByTestId('map-container').boundingBox())!;
    expect(selected.width).toBeGreaterThan(size.width - 30);
    expect(selected.height).toBeGreaterThan(map.height * 0.3);
    expect(selected.y).toBeGreaterThan(map.y);
    const selectedEnd = (await end.boundingBox())!;
    expect(selected.y + selected.height).toBeLessThanOrEqual(selectedEnd.y);
    await page.screenshot({
      path: testInfo.outputPath('selection-lower-area.png'),
    });

    await selectMapObject(page, 'Vesta');
    await selectMapHex(page, new HexCoordinate(-2, 0));
    // hexval-med-vag: an empty hex shows the route there instead of nothing.
    await expect(panel).toContainText('Select the hex again to travel.');
    await expect(console).toBeVisible();
    await expect(end).toBeVisible();
    await console.locator('summary').click();
    await expect(page.getByText('Empty space', { exact: true })).toHaveCount(0);
    await expect(
      page.getByText('Unexplored space', { exact: true }),
    ).toHaveCount(0);
    await endTurn(page);
    await expect(log).not.toContainText('arrived at');
    await expect(end).toBeEnabled();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(log).not.toContainText('moved to');
    const consoleBounds = (await console.boundingBox())!;
    const endBounds = (await end.boundingBox())!;
    expect(consoleBounds.x + consoleBounds.width).toBeLessThanOrEqual(
      endBounds.x,
    );

    // On short landscape screens the open log and the route summary leave
    // little map, so fold the log before choosing the next hex.
    await console.locator('summary').click();
    await selectMapObject(page, 'Vesta');
    await console.locator('summary').click();
    await expect(console).toBeVisible();
    await expect(end).toBeVisible();
    await expect(console).toBeVisible();
    await expect(log).not.toContainText('arrived at');
    await expect(
      log.getByRole('heading', { name: 'Round 1', exact: true }),
    ).toHaveCount(1);
    await expect(log.locator('.event-type-label')).toHaveCount(0);
    await endTurn(page);
    await expect(
      log.getByRole('heading', { name: 'Round 1', exact: true }),
    ).toHaveCount(0);
    await expect(log).not.toContainText('Home Fleet arrived at Vesta.');
    await expect(end).toBeEnabled();
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
    await page.reload();
    await startFirstSlot(page);
    if (!(await log.isVisible())) await console.locator('summary').click();
    await expect(log).not.toContainText('Home Fleet arrived at Vesta.');
  });
}

test('handelser: Events adapts to available screen space without a selection', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('./');
  await startFirstSlot(page);
  await selectMapHex(page, new HexCoordinate(-2, 0));
  for (let year = 0; year < 8; year++) await endTurn(page);
  const panel = page.getByRole('region', { name: 'Turn console' });
  await panel.locator('summary').click();
  const large = (await panel.boundingBox())!;
  expect(large.height).toBeLessThan(180);
  expect(large.width).toBeGreaterThan(320);
  await page.screenshot({ path: testInfo.outputPath('events-desktop.png') });
  for (const size of [
    { width: 1024, height: 768 },
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    const bounds = (await panel.boundingBox())!;
    const end = (await page
      .getByRole('button', { name: 'End turn', exact: true })
      .boundingBox())!;
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(end.x);
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(size.width);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
  }
});

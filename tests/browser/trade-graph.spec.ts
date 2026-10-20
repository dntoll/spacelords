import { expect, test } from '@playwright/test';
import { tradeNetworkState } from '../fixtures/trade-network.js';
import { connectTradePlanets, startFirstSlot } from './save-helpers.js';

test.beforeEach(async ({ page }) => {
  await page.addInitScript((saved) => {
    if (!localStorage.getItem('trade-graph-test-seeded')) {
      localStorage.setItem('spacelords.economy-v2-reset', 'done');
      localStorage.setItem(
        'spacelords.save.v2.1',
        JSON.stringify({ lastPlayed: '2026-10-20T10:00:00Z', state: saved }),
      );
      localStorage.setItem('trade-graph-test-seeded', 'yes');
    }
  }, tradeNetworkState(false));
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Trade routes', exact: true }).click();
});

test('handelsgraf / handelsgraf-planetoversikt / handelsgraf-flottboxar: connect planets, assign and release fleets on the graph', async ({
  page,
}, testInfo) => {
  const graph = page.getByRole('region', {
    name: 'Trade network',
    exact: true,
  });
  const stage = page.locator('.trade-graph-stage');
  await expect(page.locator('.trade-planet-node')).toHaveCount(2);
  await expect(page.locator('.trade-fleet-marker')).toHaveCount(3);
  const home = page.locator('.trade-planet-node[data-planet-id="sol-0"]');
  await expect(home.locator('[data-material="Iron"] .trade-stock')).toHaveText(
    '120',
  );
  await expect(
    home.locator('[data-material="Iron"] .trade-extraction'),
  ).toHaveText('10');
  await expect(
    page.locator(
      '.trade-planet-node[data-planet-id="sol-1"] [data-material="Iron"] .trade-shortage',
    ),
  ).toHaveText('5');
  await connectTradePlanets(page, 'Tellus', 'Vesta');
  await expect(page.locator('.trade-route-line')).toHaveCount(1);
  const bay = page.getByRole('complementary', { name: 'Trade fleets' });
  await expect(bay.locator('[data-fleet-id="freighters"]')).toContainText(
    'Tellus · HEX 1, 0',
  );
  await expect(
    bay.getByRole('button', {
      name: 'Assign Home Fleet to Tellus to Vesta',
      exact: true,
    }),
  ).toBeDisabled();
  await expect(
    bay.getByRole('button', {
      name: 'Assign Travellers to Tellus to Vesta',
      exact: true,
    }),
  ).toBeDisabled();
  const camera = await stage.getAttribute('style');
  await bay
    .getByRole('button', {
      name: 'Assign Freighters to Tellus to Vesta',
      exact: true,
    })
    .click();
  const dock = page.locator('.trade-route-dock');
  await expect(dock).toContainText('60 cargo capacity');
  await expect(
    dock.locator(
      '[data-fleet-id="freighters"] [data-ship="Transport ship"] figcaption',
    ),
  ).toHaveText('2');
  await expect(stage).toHaveAttribute('style', camera!);
  await page
    .getByRole('button', { name: 'Fit trade network', exact: true })
    .click();
  const dockBounds = (await dock.boundingBox())!;
  for (const node of await page.locator('.trade-planet-node').all()) {
    const bounds = (await node.boundingBox())!;
    expect(
      dockBounds.x + dockBounds.width <= bounds.x ||
        bounds.x + bounds.width <= dockBounds.x ||
        dockBounds.y + dockBounds.height <= bounds.y ||
        bounds.y + bounds.height <= dockBounds.y,
    ).toBe(true);
  }
  await page.screenshot({ path: testInfo.outputPath('trade-network.png') });
  const release = dock.getByRole('button', {
    name: 'Release Freighters',
    exact: true,
  });
  await release.focus();
  await release.click();
  await expect(dock).toContainText('No fleet assigned');
  await expect(
    bay.getByRole('button', {
      name: 'Assign Freighters to Tellus to Vesta',
      exact: true,
    }),
  ).toBeEnabled();
  await graph.focus();
  const beforePan = await stage.getAttribute('style');
  await page.keyboard.press('ArrowLeft');
  await expect(stage).not.toHaveAttribute('style', beforePan!);
  await page.keyboard.press('+');
  await page.getByRole('button', { name: 'Star map', exact: true }).click();
  await page.getByRole('button', { name: 'Trade routes', exact: true }).click();
  await expect(page.locator('.trade-route-line')).toHaveCount(1);
  await page.reload();
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Trade routes', exact: true }).click();
  await expect(page.locator('.trade-route-line')).toHaveCount(1);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= innerWidth &&
        document.documentElement.scrollHeight <= innerHeight,
    ),
  ).toBe(true);
});

test('handelsgraf-flottboxar / handelsgraf-navigation: mouse drag assigns a fleet and the graph supports wheel zoom', async ({
  page,
  isMobile,
}) => {
  test.skip(
    isMobile,
    'Click assignment and native touch navigation cover mobile.',
  );
  await connectTradePlanets(page, 'Tellus', 'Vesta');
  await page
    .getByRole('button', { name: 'Fit trade network', exact: true })
    .click();
  const source = page.locator('.trade-fleet-bay [data-fleet-id="freighters"]');
  await source.dragTo(page.locator('.trade-route-dock'));
  await expect(page.locator('.trade-route-dock')).toContainText(
    '60 cargo capacity',
  );
  const graph = page.locator('.trade-graph-viewport');
  const bounds = (await graph.boundingBox())!;
  const stage = page.locator('.trade-graph-stage');
  const before = await stage.getAttribute('style');
  await page.mouse.move(bounds.x + 10, bounds.y + 10);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 100, bounds.y + 60, { steps: 8 });
  await page.mouse.up();
  await expect(stage).not.toHaveAttribute('style', before!);
  const moved = await stage.getAttribute('style');
  await page.mouse.wheel(0, -180);
  await expect(stage).not.toHaveAttribute('style', moved!);
});

test('handelsgraf-navigation: native touch pinches and pans the network', async ({
  page,
  context,
  browserName,
  isMobile,
}) => {
  test.skip(
    browserName !== 'chromium' || !isMobile,
    'Native touch uses the mobile Chromium input channel.',
  );
  const graph = page.locator('.trade-graph-viewport');
  const stage = page.locator('.trade-graph-stage');
  const bounds = (await graph.boundingBox())!;
  const x = bounds.x + bounds.width / 2,
    y = bounds.y + 20;
  const cdp = await context.newCDPSession(page);
  const before = await stage.getAttribute('style');
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: x - 30, y, id: 1 },
      { x: x + 30, y, id: 2 },
    ],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [
      { x: x - 65, y, id: 1 },
      { x: x + 65, y, id: 2 },
    ],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await expect(stage).not.toHaveAttribute('style', before!);
  const zoomed = await stage.getAttribute('style');
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: x - 60, y, id: 1 }],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x, y: y + 40, id: 1 }],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await expect(stage).not.toHaveAttribute('style', zoomed!);
  await cdp.detach();
});

for (const size of [
  { width: 320, height: 568 },
  { width: 667, height: 320 },
]) {
  test(`handelsgraf-navigation: graph and fleet bay remain contained at ${size.width}x${size.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page
      .getByRole('button', { name: 'Fit trade network', exact: true })
      .click();
    const frame = (await page.locator('.trade-graph-viewport').boundingBox())!;
    expect(frame.height).toBeGreaterThan(40);
    expect(frame.width).toBeGreaterThan(200);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight,
      ),
    ).toBe(true);
    const fleet = page.locator('.trade-fleet-bay [data-fleet-id="empty"]');
    await fleet.scrollIntoViewIfNeeded();
    await expect(fleet).toContainText('No position');
  });
}

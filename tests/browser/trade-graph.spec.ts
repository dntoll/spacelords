import { expect, test } from '@playwright/test';
import {
  tradeNetworkState,
  distantTradeNetworkState,
} from '../fixtures/trade-network.js';
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
  await expect(page.locator('.trade-fleet-marker')).toHaveCount(4);
  await expect(page.locator('.trade-graph-stage .trade-materials')).toHaveCount(
    0,
  );
  const home = page.getByRole('complementary', { name: 'Selected object' });
  const tellus = page.getByRole('button', {
    name: 'Select planet Tellus',
    exact: true,
  });
  await tellus.focus();
  await tellus.click();
  await expect(
    home.getByRole('heading', { name: 'Tellus', exact: true }),
  ).toBeVisible();
  await expect(home.locator('[data-material="Iron"] .trade-stock')).toHaveText(
    '120',
  );
  await expect(
    home.locator('[data-material="Iron"] .trade-extraction'),
  ).toHaveText('10');
  await page.screenshot({
    path: testInfo.outputPath('trade-planet-selection.png'),
  });
  await tellus.click();
  const vesta = page.getByRole('button', {
    name: 'Select planet Vesta',
    exact: true,
  });
  await vesta.focus();
  await vesta.click();
  await expect(
    home.getByRole('heading', { name: 'Vesta', exact: true }),
  ).toBeVisible();
  await expect(
    home.locator('[data-material="Iron"] .trade-shortage'),
  ).toHaveText('5');
  await vesta.click();
  await connectTradePlanets(page, 'Tellus', 'Vesta');
  await expect(page.locator('.trade-route-line')).toHaveCount(1);
  const bay = page.getByRole('complementary', { name: 'Selected object' });
  await expect(
    page.locator(
      '.trade-graph-stage .trade-fleet-box[data-fleet-id="freighters"]',
    ),
  ).toContainText('Tellus · HEX 1, 0');
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
  await expect(bay).toContainText('Assigned fleets · 1');
  await expect(bay.locator('[data-fleet-id="freighters"]')).toContainText(
    'Tellus · HEX 1, 0',
  );
  const ships = page.getByRole('button', {
    name: 'Select ships of Freighters',
    exact: true,
  });
  await expect(ships).toHaveCount(1);
  await expect(
    page.locator(
      '.trade-graph-stage .trade-fleet-box[data-fleet-id="freighters"]',
    ),
  ).toHaveCount(1);
  await expect(
    page.locator('.trade-fleet-marker[data-fleet-id="freighters"]'),
  ).toHaveCount(0);
  await expect(
    dock.locator(
      '[data-fleet-id="freighters"] [data-ship="Transport ship"] figcaption',
    ),
  ).toHaveText('2');
  await expect(stage).toHaveAttribute('style', camera!);
  await ships.focus();
  await ships.click();
  await expect(
    bay.getByRole('heading', { name: 'Freighters', exact: true }),
  ).toBeVisible();
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
  const selectFleet = dock.getByRole('button', {
    name: 'Select trade fleet Freighters',
    exact: true,
  });
  await selectFleet.focus();
  await selectFleet.click();
  await expect(
    bay.getByRole('heading', { name: 'Freighters', exact: true }),
  ).toBeVisible();
  await expect(bay).toContainText('Trade route: Tellus');
  await page.screenshot({
    path: testInfo.outputPath('trade-fleet-selection.png'),
  });
  await expect(
    bay.getByRole('button', { name: 'Close route', exact: true }),
  ).toHaveCount(0);
  const release = dock.getByRole('button', {
    name: 'Release Freighters',
    exact: true,
  });
  await release.focus();
  await release.click();
  await expect(dock).toContainText('No fleet assigned');
  await expect(
    page.locator('.trade-fleet-marker[data-fleet-id="freighters"]'),
  ).toHaveCount(1);
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

test('handelsgraf-lasbarhet / handelsgraf-skeppspositioner: a distant network keeps readable names and assigned fleets at their actual positions', async ({
  page,
}, testInfo) => {
  await page.evaluate(
    (state) =>
      localStorage.setItem(
        'spacelords.save.v2.1',
        JSON.stringify({ lastPlayed: '2026-10-20T10:00:00Z', state }),
      ),
    distantTradeNetworkState(),
  );
  await page.reload();
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Trade routes', exact: true }).click();
  await expect(page.locator('.trade-planet-node')).toHaveCount(3);
  await expect(page.locator('.trade-ship-location')).toHaveCount(3);
  await expect(
    page.locator('.trade-fleet-marker[data-fleet-id="travellers"]'),
  ).toHaveCount(0);
  const route = page.getByRole('button', {
    name: 'Assign fleets to Tellus to Nadir II',
    exact: true,
  });
  await route.focus();
  await route.click();
  const panel = page.getByRole('complementary', { name: 'Selected object' });
  await expect(panel).toContainText('Assigned fleets · 1');
  await expect(panel.locator('[data-fleet-id="travellers"]')).toContainText(
    'Nadir II',
  );
  await expect(
    panel.locator(
      '[data-fleet-id="travellers"] [data-ship="Transport ship"] figcaption',
    ),
  ).toHaveText('1');
  await page
    .getByRole('button', { name: 'Fit trade network', exact: true })
    .click();
  await page.screenshot({
    path: testInfo.outputPath('distant-trade-network.png'),
  });
  const name = page.getByRole('button', {
    name: 'Select details for planet Tellus',
    exact: true,
  });
  await name.focus();
  await name.click();
  await expect(
    panel.getByRole('heading', { name: 'Tellus', exact: true }),
  ).toBeVisible();
});

test('handelsgraf-lasbarhet: planets scale while names stay above them and cards stay readable', async ({
  page,
}, testInfo) => {
  await connectTradePlanets(page, 'Tellus', 'Vesta');
  const sphere = page.locator('.trade-planet-sphere').first();
  const before = (await sphere.boundingBox())!.width;
  for (let i = 0; i < 5; i++)
    await page
      .getByRole('button', { name: 'Zoom out trade network', exact: true })
      .click();
  expect((await sphere.boundingBox())!.width).toBeCloseTo(before * 0.8 ** 5, 0);
  const title = page.locator('.trade-planet-label').first();
  const height = await title.evaluate((node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    return range.getBoundingClientRect().height;
  });
  expect(height).toBeGreaterThanOrEqual(16);
  const planetBounds = (await page
    .locator('.trade-planet-node')
    .first()
    .boundingBox())!;
  const titleBounds = (await title.boundingBox())!;
  expect(titleBounds.y + titleBounds.height).toBeLessThan(planetBounds.y);
  expect(titleBounds.x + titleBounds.width / 2).toBeCloseTo(
    planetBounds.x + planetBounds.width / 2,
    0,
  );
  await expect(
    page.locator('.trade-fleet-leader[data-object-key^="name:"]'),
  ).toHaveCount(0);
  expect(
    (await page.locator('.trade-route-dock').boundingBox())!.width,
  ).toBeCloseTo(270, 0);
  expect(
    (await page.locator('.trade-fleet-marker').first().boundingBox())!.width,
  ).toBeCloseTo(240, 0);
  await page
    .getByRole('button', { name: 'Fit trade network', exact: true })
    .click();
  await page.screenshot({
    path: testInfo.outputPath('readable-trade-network.png'),
  });
});

test('handelsgraf-lasbarhet: fleets outside the camera do not leave cards or ships in view', async ({
  page,
}) => {
  const graph = page.getByRole('region', {
    name: 'Trade network',
    exact: true,
  });
  await graph.focus();
  for (let i = 0; i < 25; i++) await page.keyboard.press('ArrowRight');
  const fleet = page.locator('.trade-fleet-marker').filter({
    has: page.getByRole('button', {
      name: 'Select trade fleet Home Fleet',
      exact: true,
    }),
  });
  await expect(fleet).toBeHidden();
  await expect(
    page.getByRole('button', {
      name: 'Select ships of Home Fleet',
      exact: true,
    }),
  ).toBeHidden();
  await page
    .getByRole('button', { name: 'Fit trade network', exact: true })
    .click();
  await expect(fleet).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: 'Select ships of Home Fleet',
      exact: true,
    }),
  ).toBeVisible();
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
  const source = page.locator(
    '.trade-graph-stage .trade-fleet-box[data-fleet-id="freighters"]',
  );
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
  test(`handelsgraf-valpanel / handelsgraf-navigation: graph and selection panel remain contained at ${size.width}x${size.height}`, async ({
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
    const fleet = page.locator('.trade-graph-stage [data-fleet-id="empty"]');
    const select = fleet.getByRole('button', {
      name: 'Select trade fleet Reserve',
      exact: true,
    });
    await select.focus();
    await select.click();
    const panel = page.getByRole('complementary', { name: 'Selected object' });
    await expect(panel).toContainText('No position');
    await expect(
      panel.getByRole('heading', { name: 'Reserve', exact: true }),
    ).toBeVisible();
  });
}

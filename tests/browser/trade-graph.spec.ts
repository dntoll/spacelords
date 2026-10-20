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

test('handelsgraf-kompakt-flottvy / handelsgraf-valpanel: select planets and ships, assign fleets and release them without graph cards', async ({
  page,
}, testInfo) => {
  await expect(page.locator('.trade-graph-stage .trade-fleet-box')).toHaveCount(
    0,
  );
  await expect(page.locator('.trade-route-dock')).toHaveCount(0);
  await expect(page.locator('.trade-ship-location')).toHaveCount(4);
  const panel = page.getByRole('complementary', { name: 'Selected object' });
  const tellus = page.getByRole('button', {
    name: 'Select planet Tellus',
    exact: true,
  });
  await tellus.focus();
  await tellus.click();
  await expect(
    panel.getByRole('heading', { name: 'Tellus', exact: true }),
  ).toBeVisible();
  await expect(panel.locator('[data-material="Iron"] .trade-stock')).toHaveText(
    '120',
  );
  await tellus.click();
  await connectTradePlanets(page, 'Tellus', 'Vesta');
  await expect(page.locator('.trade-route-line')).toHaveCount(1);
  await expect(
    panel.getByRole('button', {
      name: 'Assign Home Fleet to Tellus to Vesta',
      exact: true,
    }),
  ).toBeDisabled();
  await panel
    .getByRole('button', {
      name: 'Assign Freighters to Tellus to Vesta',
      exact: true,
    })
    .click();
  await expect(panel).toContainText('Assigned fleets · 1');
  await expect(
    panel.locator(
      '[data-fleet-id="freighters"] [data-ship="Transport ship"] figcaption',
    ),
  ).toHaveText('2');
  const ships = page.getByRole('button', {
    name: 'Select ships of Freighters',
    exact: true,
  });
  await ships.focus();
  await ships.click();
  await expect(
    panel.getByRole('heading', { name: 'Freighters', exact: true }),
  ).toBeVisible();
  await expect(panel).toContainText('Trade route: Tellus');
  await page
    .getByRole('button', { name: 'Fit trade network', exact: true })
    .click();
  await page.screenshot({
    path: testInfo.outputPath('compact-trade-network.png'),
  });
  await panel
    .getByRole('button', { name: 'Release Freighters', exact: true })
    .click();
  await expect(
    panel.getByRole('button', {
      name: 'Assign Freighters to Tellus to Vesta',
      exact: true,
    }),
  ).toBeEnabled();
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
  isMobile,
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
  await expect(page.locator('.trade-ship-location')).toHaveCount(4);
  await expect(
    page.locator('.trade-fleet-marker[data-fleet-id="travellers"]'),
  ).toHaveCount(0);
  const route = page.getByRole('button', {
    name: 'Select route Tellus to Nadir II',
    exact: true,
  });
  await route.focus();
  const point = await route.evaluate((element) => {
    const line = element as SVGLineElement;
    const center = new DOMPoint(
      (Number(line.getAttribute('x1')) + Number(line.getAttribute('x2'))) / 2,
      (Number(line.getAttribute('y1')) + Number(line.getAttribute('y2'))) / 2,
    ).matrixTransform(line.getScreenCTM()!);
    return { x: center.x, y: center.y };
  });
  if (isMobile) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
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
  await expect(title).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
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
  await expect(
    page.locator('.trade-graph-stage .trade-fleet-box, .trade-route-dock'),
  ).toHaveCount(0);
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
  const fleet = page.getByRole('button', {
    name: 'Select ships of Home Fleet',
    exact: true,
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

test('handelsgraf-kompakt-flottvy / handelsgraf-navigation: mouse drag assigns only on the line and the graph supports wheel zoom', async ({
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
    '.trade-ship-location[data-fleet-id="freighters"]',
  );
  const initial = (await source.boundingBox())!;
  const frame = (await page.locator('.trade-graph-viewport').boundingBox())!;
  await page.mouse.move(
    initial.x + initial.width / 2,
    initial.y + initial.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(frame.x + 5, frame.y + 5, { steps: 5 });
  await page.mouse.up();
  await expect(page.locator('.trade-fleet-drag-preview')).toHaveCount(0);
  await expect(
    page.getByRole('complementary', { name: 'Selected object' }),
  ).toContainText('0 cargo capacity');
  await source.dragTo(page.locator('.trade-route-line'));
  await expect(
    page.getByRole('complementary', { name: 'Selected object' }),
  ).toContainText('60 cargo capacity');
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

test('handelsgraf-kompakt-flottvy: touch drags ships directly to the route line', async ({
  page,
  context,
  browserName,
  isMobile,
}) => {
  test.skip(
    browserName !== 'chromium' || !isMobile,
    'Native touch uses mobile Chromium.',
  );
  await connectTradePlanets(page, 'Tellus', 'Vesta');
  await page
    .getByRole('button', { name: 'Fit trade network', exact: true })
    .click();
  const ships = page.getByRole('button', {
    name: 'Select ships of Freighters',
    exact: true,
  });
  await ships.focus();
  const box = (await ships.boundingBox())!;
  const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const target = await page.locator('.trade-route-line').evaluate((element) => {
    const line = element as SVGLineElement;
    const point = new DOMPoint(
      (Number(line.getAttribute('x1')) + Number(line.getAttribute('x2'))) / 2,
      (Number(line.getAttribute('y1')) + Number(line.getAttribute('y2'))) / 2,
    ).matrixTransform(line.getScreenCTM()!);
    return { x: point.x, y: point.y };
  });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ ...start, id: 1 }],
  });
  for (let i = 1; i <= 8; i++)
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        {
          x: start.x + ((target.x - start.x) * i) / 8,
          y: start.y + ((target.y - start.y) * i) / 8,
          id: 1,
        },
      ],
    });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await expect(
    page.getByRole('complementary', { name: 'Selected object' }),
  ).toContainText('60 cargo capacity');
  await expect(page.locator('.trade-fleet-drag-preview')).toHaveCount(0);
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
    const select = page.getByRole('button', {
      name: 'Select ships of Reserve',
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

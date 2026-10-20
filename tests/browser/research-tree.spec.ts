import { expect, test } from '@playwright/test';
import { startFirstSlot } from './save-helpers.js';

test('forsknings-tradnavigation: native touch pans and pinches the tree', async ({
  page,
  context,
  browserName,
  isMobile,
}) => {
  test.skip(
    browserName !== 'chromium' || !isMobile,
    'Native touch uses the mobile Chromium input channel.',
  );
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  const tree = page.getByRole('region', { name: 'Research tree', exact: true });
  const stage = page.locator('.research-tree-stage');
  const bounds = (await tree.boundingBox())!;
  const x = bounds.x + bounds.width / 2;
  const y = bounds.y + 30;
  const cdp = await context.newCDPSession(page);
  const initial = await stage.getAttribute('style');
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: x - 40, y, id: 1 },
      { x: x + 40, y, id: 2 },
    ],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [
      { x: x - 70, y, id: 1 },
      { x: x + 70, y, id: 2 },
    ],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await expect(stage).not.toHaveAttribute('style', initial!);
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
  await expect(page.locator('.research-queue article')).toHaveCount(0);
  await cdp.detach();
});

test('forsknings-tradnavigation: dependency arrows, navigation and research preserve the camera', async ({
  page,
}, testInfo) => {
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  const tree = page.getByRole('region', { name: 'Research tree', exact: true });
  const stage = page.locator('.research-tree-stage');
  await expect(page.locator('.research-node')).toHaveCount(7);
  await expect(page.locator('.research-edge')).toHaveCount(6);
  await expect(
    page.locator(
      '[data-from="Weapons module factory"][data-to="Fighter factory"]',
    ),
  ).toHaveAttribute('marker-end', 'url(#research-arrow)');
  await tree.focus();
  const initial = await stage.getAttribute('style');
  await page.keyboard.press('+');
  await expect(stage).not.toHaveAttribute('style', initial!);
  const zoomed = await stage.getAttribute('style');
  await page.keyboard.press('ArrowRight');
  await expect(stage).not.toHaveAttribute('style', zoomed!);
  const choose = page.getByRole('button', {
    name: 'Research Fighter factory',
    exact: true,
  });
  await choose.focus();
  const camera = await stage.getAttribute('style');
  await choose.click();
  await expect(page.locator('.research-queue article')).toHaveCount(4);
  await expect(stage).toHaveAttribute('style', camera!);
  await expect(
    page.locator('[data-technology="Fighter factory"]'),
  ).toHaveAttribute('data-state', 'queued');
  await expect(
    page.locator('[data-technology="Exploration ship factory"]'),
  ).toHaveAttribute('data-state', 'active');
  await page.screenshot({ path: testInfo.outputPath('research-tree.png') });
  await page
    .getByRole('button', { name: 'Fit research tree', exact: true })
    .click();
  const viewport = (await tree.boundingBox())!;
  await page.screenshot({
    path: testInfo.outputPath('research-tree-overview.png'),
  });
  for (const card of await page.locator('.research-node').all()) {
    const bounds = (await card.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(viewport.x - 1);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(
      viewport.x + viewport.width + 1,
    );
    expect(bounds.y).toBeGreaterThanOrEqual(viewport.y - 1);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(
      viewport.y + viewport.height + 1,
    );
  }
  await page.getByRole('button', { name: 'Star map', exact: true }).click();
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  await expect(page.locator('.research-queue article')).toHaveCount(4);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollHeight <= innerHeight &&
        document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test('forsknings-tradnavigation: mouse drag pans and wheel zooms without queueing', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Mouse gestures are covered on desktop.');
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  const tree = page.getByRole('region', { name: 'Research tree', exact: true });
  const stage = page.locator('.research-tree-stage');
  const bounds = (await tree.boundingBox())!;
  const initial = await stage.getAttribute('style');
  await page.mouse.move(bounds.x + 20, bounds.y + 20);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 140, bounds.y + 80, { steps: 8 });
  await page.mouse.up();
  await expect(stage).not.toHaveAttribute('style', initial!);
  const panned = await stage.getAttribute('style');
  await page.mouse.wheel(0, -180);
  await expect(stage).not.toHaveAttribute('style', panned!);
  await expect(page.locator('.research-queue article')).toHaveCount(0);
});

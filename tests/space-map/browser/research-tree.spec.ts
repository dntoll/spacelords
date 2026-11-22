import { researchStationState } from '../../fixtures/research-station.js';
import { expect, test } from '@playwright/test';
import { startFirstSlot } from './save-helpers.js';
import { Game } from '../../../src/client/space-map/models/Game.js';
import { ResearchTreeLayout } from '../../../src/client/space-map/models/research/ResearchTree.js';

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
  await page.addInitScript((state) => {
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-24T00:00:00Z', state }),
    );
  }, researchStationState());
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  const tree = page.getByRole('region', { name: 'Research tree', exact: true });
  const stage = page.locator('.research-tree-stage');
  const bounds = (await tree.boundingBox())!;
  expect(bounds.height).toBeGreaterThan(100);
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

test('forsknings-tradnavigation: dependency lines, navigation and research preserve the camera', async ({
  page,
}, testInfo) => {
  // The four-technology tree fits a large screen, so use a phone-sized view.
  await page.setViewportSize({ width: 360, height: 640 });
  await page.addInitScript((state) => {
    if (localStorage.getItem('research-station-seeded')) return;
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-24T00:00:00Z', state }),
    );
    localStorage.setItem('research-station-seeded', 'yes');
  }, researchStationState());
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  const tree = page.getByRole('region', { name: 'Research tree', exact: true });
  const stage = page.locator('.research-tree-stage');
  const layout = new ResearchTreeLayout(
    Game.restore(researchStationState()).research.available,
  );
  await expect(page.locator('.research-node')).toHaveCount(layout.nodes.length);
  await expect(page.locator('.research-edge')).toHaveCount(layout.edges.length);
  await expect(
    page.locator('[data-from="Armor"][data-to="Armored Fighter"]'),
  ).not.toHaveAttribute('marker-end');
  await tree.focus();
  const initial = await stage.getAttribute('style');
  await page.keyboard.press('+');
  await expect(stage).not.toHaveAttribute('style', initial!);
  const zoomed = await stage.getAttribute('style');
  for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp']) {
    await page.keyboard.press(key);
    if ((await stage.getAttribute('style')) !== zoomed) break;
  }
  await expect(stage).not.toHaveAttribute('style', zoomed!);
  const choose = page.getByRole('button', {
    name: 'Inspect Missiles',
    exact: true,
  });
  await choose.focus();
  const cameraOf = async () => {
    const [x, y, zoom] = (await stage.getAttribute('style'))!
      .match(/-?[\d.]+(?=px,|px\)|\))/g)!
      .map(Number);
    const height = (await tree.boundingBox())!.height;
    return { x: x!, y: y!, zoom: zoom!, height };
  };
  const camera = await cameraOf();
  await choose.click();
  await expect(page.locator('.research-queue article')).toHaveCount(0);
  await page
    .getByRole('button', {
      name: 'Research Missiles',
      exact: true,
    })
    .click();
  await expect(page.locator('.research-queue article')).toHaveCount(1);
  // The research guidance above the tree disappears once research is queued.
  // The tree may then grow, and the edge bound may shift it by that much only.
  const after = await cameraOf();
  expect(after.zoom).toBe(camera.zoom);
  expect(after.x).toBe(camera.x);
  expect(Math.abs(after.y - camera.y)).toBeLessThanOrEqual(
    Math.abs(after.height - camera.height) + 0.5,
  );
  await expect(page.locator('[data-technology="Missiles"]')).toHaveAttribute(
    'data-state',
    'active',
  );
  await expect(
    page.locator('[data-technology="Armored Fighter"]'),
  ).toHaveAttribute('data-identified', 'false');
  await page.screenshot({ path: testInfo.outputPath('research-tree.png') });
  await tree.press('0');
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
  await expect(page.locator('.research-queue article')).toHaveCount(1);
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
  // The four-technology tree fits a large screen, so use a phone-sized view.
  await page.setViewportSize({ width: 360, height: 640 });
  await page.addInitScript((state) => {
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-24T00:00:00Z', state }),
    );
  }, researchStationState());
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  const tree = page.getByRole('region', { name: 'Research tree', exact: true });
  const stage = page.locator('.research-tree-stage');
  const bounds = (await tree.boundingBox())!;
  const initial = await stage.getAttribute('style');
  // The whole tree fits a desktop screen and stays centred, so zoom in first.
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.wheel(0, -180);
  await expect(stage).not.toHaveAttribute('style', initial!);
  const zoomed = await stage.getAttribute('style');
  await page.mouse.move(bounds.x + 20, bounds.y + 20);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 140, bounds.y + 80, { steps: 8 });
  await page.mouse.up();
  await expect(stage).not.toHaveAttribute('style', zoomed!);
  await expect(page.locator('.research-queue article')).toHaveCount(0);
});

for (const size of [
  { width: 320, height: 568, font: false },
  { width: 320, height: 568, font: true },
  { width: 393, height: 851 },
  { width: 844, height: 390 },
]) {
  test(`forskningstradets-utrymme: the tree fills Research at ${size.width}x${size.height}${'font' in size && size.font ? ' with wider fonts' : ''}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(size);
    // forskning-utan-rubrikrad: the tree fills the page without a heading row.
    await page.addInitScript((state) => {
      localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
      localStorage.setItem(
        'spacelords.save.v2.1',
        JSON.stringify({ lastPlayed: '2026-10-24T00:00:00Z', state }),
      );
    }, researchStationState());
    await page.goto('./');
    await startFirstSlot(page);
    if ('font' in size && size.font)
      await page.addStyleTag({
        content: ':root { font-family: monospace; font-size: 18px; }',
      });
    await page.getByRole('button', { name: 'Research', exact: true }).click();
    const tree = page.getByRole('region', {
      name: 'Research tree',
      exact: true,
    });
    const pageBounds = (await page.locator('.research-page').boundingBox())!;
    // forskning-utan-rubrikrad: no heading row takes height from the tree.
    await expect(page.locator('.research-page .screen-header')).toHaveCount(0);
    const bounds = (await tree.boundingBox())!;
    // forskningsflikar: the tabs and their panel share the area below.
    const details = (await page.locator('.research-bottom').boundingBox())!;
    expect(bounds.width).toBeGreaterThanOrEqual(
      pageBounds.width - (size.width > 640 ? details.width + 8 : 0) - 26,
    );
    expect(bounds.height).toBeGreaterThanOrEqual(
      pageBounds.height - (size.width <= 640 ? details.height + 8 : 0) - 50,
    );
    expect(bounds.height).toBeGreaterThan(pageBounds.height * 0.3);
    await expect(
      page.locator('.research-tree-tools, .research-sidebar'),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /Zoom .*research tree/ }),
    ).toHaveCount(0);
    await expect(page.getByLabel('Research tree zoom')).toHaveCount(0);
    // forskningsflikar: switching to the Queue tab leaves the tree alone.
    const queue = page.locator('.research-queue');
    await expect(queue).toBeHidden();
    await page.locator('.research-tab[data-tab="queue"]').click();
    await expect(queue).toBeVisible();
    const opened = (await tree.boundingBox())!;
    expect(opened).toEqual(bounds);
    await page.locator('.research-tab[data-tab="selected"]').click();
    await page.screenshot({
      path: testInfo.outputPath('research-full-tree.png'),
    });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight,
      ),
    ).toBe(true);
  });
}

import { selectMapObject } from './map-helpers.js';
import { startFirstSlot } from './save-helpers.js';
import { expect, test, type Locator, type Page } from '@playwright/test';

async function canvas(page: Page): Promise<Locator> {
  const map = page.locator('canvas[data-rendered="true"]');
  await expect(map).toHaveCount(1);
  return map;
}

async function center(map: Locator): Promise<{ x: number; y: number }> {
  const box = await map.boundingBox();
  if (!box) throw new Error('Map is not visible.');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

const runtimeErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await startFirstSlot(page);
  await canvas(page);
});

test.afterEach(({ page }) => {
  expect(runtimeErrors.get(page) ?? []).toEqual([]);
});

test('hexkarta / lokal-sikt / synliga-stjarnor: paints a real canvas without hidden planet data', async ({
  page,
}, testInfo) => {
  const map = await canvas(page);
  const colors = await map.evaluate((node) => {
    const canvas = node as HTMLCanvasElement;
    const context = canvas.getContext('2d');
    if (!context) return 0;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const values = new Set<string>();
    for (let index = 0; index < pixels.length; index += 160) {
      values.add(`${pixels[index]},${pixels[index + 1]},${pixels[index + 2]}`);
    }
    return values.size;
  });
  expect(colors).toBeGreaterThan(10);
  await expect(
    page.getByRole('combobox', { name: 'Known objects' }),
  ).toHaveCount(0);
  expect(await page.locator('body').innerHTML()).not.toMatch(
    /Brontes|Nadir I|Aster I/,
  );
  await page.screenshot({
    path: testInfo.outputPath('starmap.png'),
    fullPage: true,
  });
  await selectMapObject(page, 'Vesta');
  await expect(
    page.getByRole('button', { name: 'Open planet', exact: true }),
  ).toHaveCount(0);
});

test('vynavigation: preserves the map camera through Research', async ({
  page,
}, testInfo) => {
  await page.locator('canvas[data-rendered="true"]').press('+');
  const zoom = await page.getByLabel('Map zoom').textContent();
  for (let count = 0; count < 3; count += 1) {
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('button', { name: 'Research', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Research', exact: true }),
    ).toBeVisible();
    // flottforskning-av-tekniker: the Queue tab explains the paused research.
    await expect(
      page.getByText('Research does not advance yet.'),
    ).toBeAttached();
    await expect(page.locator('canvas')).toHaveCount(0);
    if (count === 0)
      await page.screenshot({
        path: testInfo.outputPath('research.png'),
        fullPage: true,
      });
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('button', { name: 'Star map', exact: true })
      .click();
    await canvas(page);
  }
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(
    page.getByRole('heading', { name: 'Tellus', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Map zoom')).toHaveText(zoom ?? '');
  await page.reload();
  await startFirstSlot(page);
  await canvas(page);
  await expect(page.getByLabel('Map zoom')).toHaveText('100%');
});

test('inga-move-stop-knappar: Home Fleet has no Move or Stop', async ({
  page,
}) => {
  await expect(
    page.getByRole('button', { name: 'Move', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Stop', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Clear destination', exact: true }),
  ).toHaveCount(0);
});

test('kartnavigation: keyboard pans and zooms, canvas hit-testing selects the home planet', async ({
  page,
}) => {
  const map = await canvas(page);
  const position = page.getByTestId('camera-position');
  const before = await position.textContent();
  await map.focus();
  await map.press('ArrowRight');
  await expect(position).not.toHaveText(before ?? '');
  await map.press('+');
  await expect(page.getByLabel('Map zoom')).toHaveText('120%');
  await map.press('Home');
  await expect(position).toHaveText(before ?? '');
  await selectMapObject(page, 'Vesta');
  await selectMapObject(page, 'Tellus');
  await expect(page.locator('.planet-selection-details')).toContainText(
    'Tellus',
  );
});

test('kartnavigation: a mouse drag pans without changing selection; wheel zoom stays bounded', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Native touch is exercised in the touch scenario.');
  const map = await canvas(page);
  const point = await center(map);
  const position = page.getByTestId('camera-position');
  const before = await position.textContent();
  // handelsrutt-skapande-pa-stjarnkartan: pan from empty space, not the selected planet.
  const panStart = { x: point.x + 80, y: point.y - 60 };
  await page.mouse.move(panStart.x, panStart.y);
  await page.mouse.down();
  await page.mouse.move(panStart.x + 100, panStart.y + 40, { steps: 8 });
  await page.mouse.up();
  await expect(position).not.toHaveText(before ?? '');
  await expect(page.locator('.planet-selection-details')).toContainText(
    'Tellus',
  );
  await page.mouse.move(panStart.x, panStart.y);
  await page.mouse.wheel(0, -100);
  await expect(page.getByLabel('Map zoom')).not.toHaveText('100%');
  await page.locator('canvas[data-rendered="true"]').press('Home');
  await expect(position).toHaveText(before ?? '');
  await expect(page.getByLabel('Map zoom')).toHaveText('100%');
});

test('kartnavigation: native touch selects the planet', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'Touch is exercised by phone and tablet projects.');
  await canvas(page);
  await selectMapObject(page, 'Vesta');
  await selectMapObject(page, 'Tellus', 'touch');
  await expect(page.locator('.planet-selection-details')).toContainText(
    'Tellus',
  );
});

test('kartnavigation: native touch drag and pinch preserve the selected planet', async ({
  page,
  isMobile,
  browserName,
}) => {
  test.skip(
    !isMobile || browserName !== 'chromium',
    'Chromium exposes multi-touch input through CDP. WebKit tap and geometry are covered separately.',
  );
  const map = await canvas(page);
  const point = await center(map);
  const position = page.getByTestId('camera-position');
  const before = await position.textContent();
  const session = await page.context().newCDPSession(page);
  // handelsrutt-skapande-pa-stjarnkartan: the selected planet now starts a route;
  // navigation gestures begin on empty map space instead.
  const panStart = { x: point.x + 80, y: point.y - 60 };
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: panStart.x, y: panStart.y, id: 1 }],
  });
  for (let step = 1; step <= 5; step += 1) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: panStart.x + step * 12, y: panStart.y + step * 4, id: 1 },
      ],
    });
  }
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await expect(position).not.toHaveText(before ?? '');
  await expect(page.locator('.planet-selection-details')).toContainText(
    'Tellus',
  );
  const zoom = await page.getByLabel('Map zoom').textContent();
  const pinchY = point.y - 60;
  for (const x of [point.x - 40, point.x + 40]) {
    expect(
      await map.evaluate(
        (canvas, p) => document.elementFromPoint(p.x, p.y) === canvas,
        { x, y: pinchY },
      ),
    ).toBe(true);
  }
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: point.x - 40, y: pinchY, id: 1 },
      { x: point.x + 40, y: pinchY, id: 2 },
    ],
  });
  for (let step = 1; step <= 5; step += 1) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: point.x - 40 - step * 5, y: pinchY, id: 1 },
        { x: point.x + 40 + step * 5, y: pinchY, id: 2 },
      ],
    });
  }
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await session.detach();
  await expect(page.getByLabel('Map zoom')).not.toHaveText(zoom ?? '');
  await expect(page.locator('.planet-selection-details')).toContainText(
    'Tellus',
  );
});

test('flera-skarmstorlekar: canvas follows its container without horizontal overflow', async ({
  page,
  isMobile,
}) => {
  const map = await canvas(page);
  const container = page.getByTestId('map-container');
  const dimensions = await container.boundingBox();
  expect(dimensions).not.toBeNull();
  const bounds = await map.boundingBox();
  expect(bounds?.width).toBeCloseTo(dimensions?.width ?? 0, 0);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
  if (!isMobile) {
    await page.setViewportSize({ width: 1100, height: 800 });
    await expect
      .poll(async () => {
        const current = await container.boundingBox();
        const resized = await map.boundingBox();
        return Math.abs((current?.width ?? 0) - (resized?.width ?? 1));
      })
      .toBeLessThan(1);
    await expect(map).toHaveAttribute('data-rendered', 'true');
  }
  await selectMapObject(page, 'Tellus');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
});

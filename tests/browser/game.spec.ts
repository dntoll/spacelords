import { expect, test, type Locator, type Page } from '@playwright/test';

async function canvas(page: Page): Promise<Locator> {
  const map = page.locator('canvas[data-rendered="true"]');
  await expect(map).toHaveCount(1);
  return map;
}

async function center(map: Locator): Promise<{ x: number; y: number }> {
  await map.scrollIntoViewIfNeeded();
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
    page.getByRole('button', { name: 'Tellus', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Vesta', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Nadir', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Aster', exact: true }),
  ).toBeVisible();
  expect(await page.locator('body').innerHTML()).not.toMatch(
    /Brontes|Nadir I|Aster I/,
  );
  await page.screenshot({
    path: testInfo.outputPath('starmap.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Vesta', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Öppna planet', exact: true }),
  ).toHaveCount(0);
});

test('planetinformation / visa-byggalternativ / vynavigation: preserves camera through both views', async ({
  page,
}, testInfo) => {
  await page.getByRole('button', { name: 'Zooma in', exact: true }).click();
  const zoom = await page.getByLabel('Kartans zoom').textContent();
  await page.getByRole('button', { name: 'Öppna planet', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Tellus', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('42 enheter/år', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Bygg forskningsstation' }),
  ).toBeDisabled();
  await page.screenshot({
    path: testInfo.outputPath('planet.png'),
    fullPage: true,
  });
  await page
    .getByRole('button', { name: 'Tillbaka till kartan', exact: true })
    .click();
  await canvas(page);
  await expect(page.getByLabel('Kartans zoom')).toHaveText(zoom ?? '');
  for (let count = 0; count < 3; count += 1) {
    await page.getByRole('button', { name: 'Forskning', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Forskning', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('Forskning kommer senare', { exact: true }),
    ).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
    if (count === 0)
      await page.screenshot({
        path: testInfo.outputPath('research.png'),
        fullPage: true,
      });
    await page
      .getByRole('button', { name: 'Tillbaka till kartan', exact: true })
      .click();
    await canvas(page);
  }
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(
    page.getByRole('heading', { name: 'Tellus', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Kartans zoom')).toHaveText(zoom ?? '');
  await page.reload();
  await canvas(page);
  await expect(page.getByLabel('Kartans zoom')).toHaveText('100 %');
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
  await expect(page.getByLabel('Kartans zoom')).toHaveText('120 %');
  await map.press('Home');
  await expect(position).toHaveText(before ?? '');
  await page.getByRole('button', { name: 'Vesta', exact: true }).click();
  const point = await center(map);
  await page.mouse.click(point.x, point.y);
  await expect(
    page.getByRole('button', { name: 'Öppna planet', exact: true }),
  ).toBeVisible();
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
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 100, point.y + 40, { steps: 8 });
  await page.mouse.up();
  await expect(position).not.toHaveText(before ?? '');
  await expect(
    page.getByRole('button', { name: 'Öppna planet', exact: true }),
  ).toBeVisible();
  await page.mouse.wheel(0, -100);
  await expect(page.getByLabel('Kartans zoom')).not.toHaveText('100 %');
  await page.getByRole('button', { name: 'Hemplanet', exact: true }).click();
  await expect(position).toHaveText(before ?? '');
  await expect(page.getByLabel('Kartans zoom')).toHaveText('100 %');
});

test('kartnavigation: native touch selects the planet', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'Touch is exercised by phone and tablet projects.');
  const map = await canvas(page);
  await page.getByRole('button', { name: 'Vesta', exact: true }).tap();
  const point = await center(map);
  await page.touchscreen.tap(point.x, point.y);
  await expect(
    page.getByRole('button', { name: 'Öppna planet', exact: true }),
  ).toBeVisible();
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
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: point.x, y: point.y, id: 1 }],
  });
  for (let step = 1; step <= 5; step += 1) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: point.x + step * 12, y: point.y + step * 4, id: 1 }],
    });
  }
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await expect(position).not.toHaveText(before ?? '');
  await expect(
    page.getByRole('button', { name: 'Öppna planet', exact: true }),
  ).toBeVisible();
  const zoom = await page.getByLabel('Kartans zoom').textContent();
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: point.x - 40, y: point.y, id: 1 },
      { x: point.x + 40, y: point.y, id: 2 },
    ],
  });
  for (let step = 1; step <= 5; step += 1) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: point.x - 40 - step * 5, y: point.y, id: 1 },
        { x: point.x + 40 + step * 5, y: point.y, id: 2 },
      ],
    });
  }
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await session.detach();
  await expect(page.getByLabel('Kartans zoom')).not.toHaveText(zoom ?? '');
  await expect(
    page.getByRole('button', { name: 'Öppna planet', exact: true }),
  ).toBeVisible();
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
  await page.getByRole('button', { name: 'Öppna planet', exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
});

import { startFirstSlot, endTurn, chooseResearch } from './save-helpers.js';
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
  expect(
    await page
      .getByRole('combobox', { name: 'Known objects' })
      .locator('option')
      .allTextContents(),
  ).toEqual(
    expect.arrayContaining(['Tellus', 'Vesta', 'Sol', 'Nadir', 'Aster']),
  );
  expect(await page.locator('body').innerHTML()).not.toMatch(
    /Brontes|Nadir I|Aster I/,
  );
  await page.screenshot({
    path: testInfo.outputPath('starmap.png'),
    fullPage: true,
  });
  await page
    .getByRole('combobox', { name: 'Known objects' })
    .selectOption({ label: 'Vesta' });
  await expect(
    page.getByRole('button', { name: 'Open planet', exact: true }),
  ).toHaveCount(0);
});

test('planetinformation / visa-byggalternativ / vynavigation: preserves camera through both views', async ({
  page,
}, testInfo) => {
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  const zoom = await page.getByLabel('Map zoom').textContent();
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Tellus', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Stored 100 · Extracting 0/year', { exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Build building at site 1', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Build Research station' }),
  ).toBeEnabled();
  await page.screenshot({
    path: testInfo.outputPath('planet.png'),
    fullPage: true,
  });
  await page
    .getByRole('button', { name: 'Back to Overview', exact: true })
    .click();
  await page.getByRole('button', { name: 'Back to map', exact: true }).click();
  await canvas(page);
  await expect(page.getByLabel('Map zoom')).toHaveText(zoom ?? '');
  for (let count = 0; count < 3; count += 1) {
    await page.getByRole('button', { name: 'Research', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Research', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('Build a Research station to advance research.', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
    if (count === 0)
      await page.screenshot({
        path: testInfo.outputPath('research.png'),
        fullPage: true,
      });
    await page
      .getByRole('button', { name: 'Back to map', exact: true })
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

test('flottadministration / flottdestinationer: map orders and fleet-grid transfers preserve fleets', async ({
  page,
}) => {
  await page
    .getByRole('button', { name: 'Set destination', exact: true })
    .click();
  await expect(
    page.getByText('Choose a destination for Home Fleet.'),
  ).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Known objects' })
    .selectOption({ label: 'Vesta' });
  await expect(
    page.getByRole('button', { name: 'Clear destination', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Known objects' })
    .selectOption({ label: 'Tellus' });
  await page.getByRole('button', { name: 'Edit fleet', exact: true }).click();
  await page.getByRole('button', { name: 'Home Fleet', exact: true }).click();
  await page.getByRole('button', { name: 'New fleet', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Fleet 1', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Fighter 1 in Home Fleet' })
    .dragTo(page.getByRole('group', { name: 'Ships in Fleet 1', exact: true }));
  await expect(
    page.getByRole('button', { name: 'Fighter 1 in Fleet 1' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Exploration ship 1 in Home Fleet' })
    .click();
  await page.getByRole('button', { name: 'Move ship to Fleet 1' }).click();
  await expect(
    page.getByRole('button', { name: 'Exploration ship 1 in Fleet 1' }),
  ).toBeVisible();
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
  await page
    .getByRole('combobox', { name: 'Known objects' })
    .selectOption({ label: 'Vesta' });
  const point = await center(map);
  await page.mouse.click(point.x, point.y);
  await expect(
    page.getByRole('button', { name: 'Open planet', exact: true }),
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
  // handelsrutt-skapande-pa-stjarnkartan: pan from empty space, not the selected planet.
  const panStart = { x: point.x + 80, y: point.y - 60 };
  await page.mouse.move(panStart.x, panStart.y);
  await page.mouse.down();
  await page.mouse.move(panStart.x + 100, panStart.y + 40, { steps: 8 });
  await page.mouse.up();
  await expect(position).not.toHaveText(before ?? '');
  await expect(
    page.getByRole('button', { name: 'Open planet', exact: true }),
  ).toBeVisible();
  await page.mouse.wheel(0, -100);
  await expect(page.getByLabel('Map zoom')).not.toHaveText('100%');
  await page.getByRole('button', { name: 'Homeworld', exact: true }).click();
  await expect(position).toHaveText(before ?? '');
  await expect(page.getByLabel('Map zoom')).toHaveText('100%');
});

test('kartnavigation: native touch selects the planet', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'Touch is exercised by phone and tablet projects.');
  const map = await canvas(page);
  await page
    .getByRole('combobox', { name: 'Known objects' })
    .selectOption({ label: 'Vesta' });
  const point = await center(map);
  await page.touchscreen.tap(point.x, point.y);
  await expect(
    page.getByRole('button', { name: 'Open planet', exact: true }),
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
  await expect(
    page.getByRole('button', { name: 'Open planet', exact: true }),
  ).toBeVisible();
  const zoom = await page.getByLabel('Map zoom').textContent();
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
  await expect(page.getByLabel('Map zoom')).not.toHaveText(zoom ?? '');
  await expect(
    page.getByRole('button', { name: 'Open planet', exact: true }),
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
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
});

test('planetbyggplatser / fabrikskoer / forska-fram-fabriker / kolonisation: research, build ships and settle a new colony', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  const nextYear = async () => {
    await page.getByRole('button', { name: 'Star map', exact: true }).click();
    await endTurn(page);
    await expect(
      page.getByRole('button', { name: 'End turn', exact: true }),
    ).toBeEnabled();
  };
  const construction = async () => {
    await page
      .getByRole('button', { name: 'Open planet', exact: true })
      .click();
  };
  await expect(page.locator('.order-status')).toContainText(
    '10 empty building sites',
  );
  await construction();
  await page
    .getByRole('button', { name: 'Build building at site 1', exact: true })
    .click();
  await expect(page.locator('.building-menu .building-choice')).toHaveCount(4);
  await expect(
    page.getByRole('button', { name: 'Queue Colony ship', exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Build Research station', exact: true })
    .click();
  await nextYear();
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  const factorySource = await page
    .getByRole('img', { name: 'Colony ship factory', exact: true })
    .getAttribute('src');

  await chooseResearch(page, 'Colony ship factory');
  await expect(
    page.getByText('Researching · 0/1 points', { exact: true }),
  ).toBeVisible();
  await nextYear();
  await nextYear();
  await construction();
  await page
    .getByRole('button', { name: 'Build building at site 2', exact: true })
    .click();
  await expect(page.locator('.building-menu .building-choice')).toHaveCount(6);
  await expect(
    page.getByRole('img', { name: 'Colony ship factory', exact: true }),
  ).toHaveAttribute('src', factorySource!);

  await page
    .getByRole('button', { name: 'Build Colony ship factory', exact: true })
    .click();
  await nextYear();
  await expect(page.locator('.order-status')).toContainText(
    '1 idle planet build queue',
  );
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  await page.getByRole('button', { name: 'Home Fleet', exact: true }).click();
  await page.getByRole('button', { name: 'New fleet', exact: true }).click();
  await page.getByRole('button', { name: 'Star map', exact: true }).click();
  await construction();
  const yard = page.getByRole('article', {
    name: 'Building site 2',
    exact: true,
  });
  await expect(
    yard.getByRole('img', { name: 'Colony ship factory', exact: true }),
  ).toHaveAttribute('src', factorySource!);
  const planetQueue = page.getByRole('region', {
    name: 'Planet build queue',
    exact: true,
  });
  await expect(page.locator('.queue-slots')).toHaveCount(1);
  await expect(yard.locator('.queue-slots')).toHaveCount(0);
  // gemensam-planetko: factories expose order controls, not separate queues.
  const detailsBounds = (await yard.locator('.site-details').boundingBox())!;
  const queueBounds = (await yard
    .locator('.factory-production')
    .boundingBox())!;
  const contentWidth = await page
    .locator('.overview')
    .evaluate(
      (node) =>
        node.clientWidth -
        parseFloat(getComputedStyle(node).paddingLeft) -
        parseFloat(getComputedStyle(node).paddingRight),
    );
  if (contentWidth >= 720) {
    expect(queueBounds.x).toBeGreaterThan(
      detailsBounds.x + detailsBounds.width,
    );
    expect(Math.abs(queueBounds.y - detailsBounds.y)).toBeLessThan(2);
  } else
    expect(queueBounds.y).toBeGreaterThanOrEqual(
      detailsBounds.y + detailsBounds.height,
    );
  for (const action of await yard.locator('.site-actions button').all()) {
    const bounds = (await action.boundingBox())!;
    expect(bounds.width).toBeLessThan(detailsBounds.width);
    expect(bounds.height).toBeGreaterThanOrEqual(44);
  }
  await yard.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath('overview-factory-queue.png'),
  });

  await expect(
    yard.getByRole('button', { name: 'Build ships at site 2', exact: true }),
  ).toHaveCount(0);
  await expect(yard.locator('.factory-order')).toBeVisible();
  await expect(yard.locator('.factory-order')).toContainText(
    'Iron 6, Water 3, Oil 1 per ship',
  );
  await page
    .getByRole('combobox', {
      name: 'Destination fleet for Colony ship',
      exact: true,
    })
    .selectOption({ label: 'Fleet 1' });
  await page
    .getByRole('button', { name: 'Queue Colony ship', exact: true })
    .click();
  for (let index = 0; index < 4; index += 1)
    await page
      .getByRole('button', { name: 'Queue Colony ship', exact: true })
      .click();
  await expect(
    page.getByRole('button', { name: 'Queue Colony ship', exact: true }),
  ).toBeEnabled();
  await expect(planetQueue.locator('.queue-order')).toHaveCount(5);
  await planetQueue
    .locator('.queue-order')
    .nth(1)
    .getByRole('button', { name: /Move up/ })
    .click();
  await planetQueue
    .locator('.queue-order')
    .nth(1)
    .getByRole('button', { name: /Move up/ })
    .click();
  await page.screenshot({
    path: testInfo.outputPath('shipyard-queue.png'),
    fullPage: true,
  });
  await nextYear();
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Colony ship 1 in Fleet 1', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Star map', exact: true }).click();
  const fleet = page.locator('.fleet-summary').filter({
    has: page.getByRole('heading', { name: 'Fleet 1', exact: true }),
  });
  await fleet
    .getByRole('button', { name: 'Set destination', exact: true })
    .click();
  await page
    .getByRole('combobox', { name: 'Known objects', exact: true })
    .selectOption({ label: 'Vesta' });
  await nextYear();
  await page
    .getByRole('combobox', { name: 'Known objects', exact: true })
    .selectOption({ label: 'Vesta' });
  await page.getByRole('button', { name: 'Colonize', exact: true }).click();
  await expect(page.locator('.order-status')).toContainText(
    '6 empty building sites',
  );
  await page.screenshot({
    path: testInfo.outputPath('colonized-map.png'),
    fullPage: true,
  });
  await construction();
  await expect(
    page.getByRole('heading', { name: 'Vesta', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.building-site')).toHaveCount(6);
  await page
    .getByRole('button', { name: 'Build building at site 1', exact: true })
    .click();
  await expect(page.locator('.building-menu .cost-missing')).not.toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Build Research station', exact: true }),
  ).toBeEnabled();
});

import { expect, test } from '@playwright/test';
import { startFirstSlot, endTurn } from './save-helpers.js';

test('skeppsbilder / flottadministration / flottbyggar-minikarta: images, visual fleet boxes and keyboard transfers', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await startFirstSlot(page);
  const map = page.locator('canvas[data-rendered="true"]');
  await expect(map).toHaveCount(1);
  const camera = await page.getByTestId('camera-position').textContent();
  const bounds = (await map.boundingBox())!;
  await page.mouse.click(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2 - 18,
  );
  const panel = page.getByRole('complementary', { name: 'Selected fleet' });
  await expect(panel.locator('.ship-portrait img')).toHaveCount(2);
  const source = await panel
    .getByRole('img', { name: 'Fighter', exact: true })
    .getAttribute('src');
  for (const image of await panel.locator('.ship-portrait img').all())
    await expect
      .poll(() =>
        image.evaluate((node) => (node as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);
  await page.screenshot({
    path: testInfo.outputPath('selected-fleet-ships.png'),
  });
  await panel.getByRole('button', { name: 'Edit fleet', exact: true }).click();
  await expect(page.locator('[role="table"]')).toHaveCount(0);
  await expect(
    page.locator(
      '.fleet-location-map canvas[data-fleet-preview-rendered="true"]',
    ),
  ).toHaveAttribute('data-fleet-position', '1,0');
  await page.getByRole('button', { name: 'New fleet', exact: true }).click();
  await expect(page.locator('.coordinate-label')).toContainText('No position.');
  await expect(page.locator('.fleet-location-map canvas')).toHaveAttribute(
    'data-fleet-position',
    '',
  );
  const fighter = page.getByRole('button', {
    name: 'Fighter 1 in Home Fleet',
    exact: true,
  });
  await expect(fighter.getByRole('img')).toHaveAttribute('src', source!);
  await fighter.dragTo(
    page.getByRole('group', { name: 'Ships in Fleet 1', exact: true }),
  );
  await expect(
    page.getByRole('button', { name: 'Fighter 1 in Fleet 1', exact: true }),
  ).toBeVisible();
  const explorer = page.getByRole('button', {
    name: 'Exploration ship 1 in Home Fleet',
    exact: true,
  });
  await explorer.focus();
  await page.keyboard.press('Enter');
  const move = page.getByRole('button', {
    name: 'Move ship to Fleet 1',
    exact: true,
  });
  await move.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('button', {
      name: 'Exploration ship 1 in Fleet 1',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('group', { name: 'Ships in Home Fleet', exact: true }),
  ).toContainText('No ships');
  await expect(
    page.getByRole('img', { name: 'Fleet location: Fleet 1', exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(
      '.fleet-location-map canvas[data-fleet-preview-rendered="true"]',
    ),
  ).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath('fleet-builder.png') });
  await page.getByRole('button', { name: 'Home Fleet', exact: true }).click();
  await expect(page.locator('.coordinate-label')).toContainText('No position.');
  await expect(page.locator('.fleet-location-map canvas')).toHaveAttribute(
    'data-fleet-position',
    '',
  );
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth > innerWidth ||
      document.documentElement.scrollHeight > innerHeight,
  );
  expect(overflow).toBe(false);
  await page.getByRole('button', { name: 'Back to map', exact: true }).click();
  await expect(page.getByTestId('camera-position')).toHaveText(camera!);
  await expect(page.locator('.fleet-location-map')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('flottadministration: a ship can be dragged into a fleet box with native touch', async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(
    browserName !== 'chromium' || !isMobile,
    'Chromium exposes native touch dragging through CDP.',
  );
  await page.setViewportSize({ width: 600, height: 1000 });
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  await page.getByRole('button', { name: 'New fleet', exact: true }).click();
  const source = (await page
    .getByRole('button', { name: 'Fighter 1 in Home Fleet', exact: true })
    .boundingBox())!;
  const target = (await page
    .getByRole('group', { name: 'Ships in Fleet 1', exact: true })
    .boundingBox())!;
  const from = {
    x: source.x + source.width / 2,
    y: source.y + source.height / 2,
  };
  const to = {
    x: target.x + target.width / 2,
    y: target.y + target.height / 2,
  };
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ ...from, id: 1 }],
  });
  for (let step = 1; step <= 8; step++)
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        {
          x: from.x + ((to.x - from.x) * step) / 8,
          y: from.y + ((to.y - from.y) * step) / 8,
          id: 1,
        },
      ],
    });
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await expect(
    page.getByRole('button', { name: 'Fighter 1 in Fleet 1', exact: true }),
  ).toBeVisible();
});

test('flottbyggar-minikarta: the marker follows a fleet after travelling', async ({
  page,
}) => {
  await page.goto('./');
  await startFirstSlot(page);
  await page
    .getByRole('button', { name: 'Set destination', exact: true })
    .click();
  await page
    .getByRole('combobox', { name: 'Known objects' })
    .selectOption({ label: 'Vesta' });
  await endTurn(page);
  await expect(
    page.getByRole('button', { name: 'End turn', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  await expect(
    page.locator(
      '.fleet-location-map canvas[data-fleet-preview-rendered="true"]',
    ),
  ).toHaveAttribute('data-fleet-position', '0,1');
});

for (const size of [
  { width: 320, height: 568 },
  { width: 844, height: 390 },
  { width: 667, height: 320 },
]) {
  test(`flottadministration / flottbyggar-minikarta: larger text fits ${size.width}x${size.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(size);
    await page.goto('./');
    await startFirstSlot(page);
    await page.getByRole('button', { name: 'Fleets', exact: true }).click();
    await page.getByRole('button', { name: 'New fleet', exact: true }).click();
    await page.addStyleTag({ content: 'html { font-size: 125%; }' });
    await expect(page.locator('.fleet-location-map canvas')).toHaveCount(1);
    await expect(page.locator('.coordinate-label')).toContainText(
      'No position.',
    );
    const dimensions = await page.evaluate(() => ({
      overflow:
        document.documentElement.scrollWidth > innerWidth ||
        document.documentElement.scrollHeight > innerHeight,
      locationBottom: document
        .querySelector('.fleet-location-panel')!
        .getBoundingClientRect().bottom,
      viewportHeight: innerHeight,
      height: document.querySelector('.fleet-collection')!.clientHeight,
      width: document.querySelector('.fleet-collection')!.clientWidth,
    }));
    expect(dimensions.overflow).toBe(false);
    expect(dimensions.locationBottom).toBeLessThanOrEqual(
      dimensions.viewportHeight,
    );
    expect(dimensions.height).toBeGreaterThan(60);
    expect(dimensions.width).toBeGreaterThan(120);
    await page
      .getByRole('button', { name: 'Fighter 1 in Home Fleet', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Move ship to Fleet 1', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Fighter 1 in Fleet 1', exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('fleet-builder-larger-text.png'),
    });
  });
}

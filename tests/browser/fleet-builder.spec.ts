import { expect, test } from '@playwright/test';
import { startFirstSlot } from './save-helpers.js';
import { formFleet, selectMapFleet } from './fleet-helpers.js';

test('delad-kartkamera / flottfokuserad-kartvy: shares camera, shows fleet images and transfers ships by pointer and keyboard', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await startFirstSlot(page);
  const map = page.locator('canvas[data-rendered="true"]');
  await map.press('ArrowRight');
  await map.press('+');
  const camera = await page.getByTestId('camera-position').textContent();
  const zoom = await page.getByLabel('Map zoom').textContent();
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  await expect(page.getByTestId('camera-position')).toHaveText(camera!);
  await expect(page.getByLabel('Map zoom')).toHaveText(zoom!);
  await expect(
    page.locator('.fleet-location-map, .fleet-collection'),
  ).toHaveCount(0);
  await selectMapFleet(page);
  for (const image of await page.locator('.ship-token img').all())
    await expect
      .poll(() =>
        image.evaluate((node) => (node as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);
  await page
    .getByRole('button', { name: 'Fighter 1 in Home Fleet', exact: true })
    .dragTo(page.getByRole('group', { name: 'New fleet', exact: true }));
  await page
    .getByRole('textbox', { name: 'Fleet name', exact: true })
    .press('Escape');
  await expect(
    page.getByRole('button', { name: 'Fighter 1 in Fleet 1', exact: true }),
  ).toBeVisible();
  const explorer = page.getByRole('button', {
    name: 'Exploration ship 1 in Home Fleet',
    exact: true,
  });
  await explorer.focus();
  await explorer.press('Enter');
  const move = page.getByRole('button', {
    name: 'Move ship to Fleet 1',
    exact: true,
  });
  await move.focus();
  await move.press('Enter');
  await expect(
    page.getByRole('button', {
      name: 'Exploration ship 1 in Fleet 1',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('article', { name: 'Fleet Home Fleet', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.locator(
      'button[aria-label="New fleet"], button[aria-label="Delete fleet"]',
    ),
  ).toHaveCount(0);
  await map.press('ArrowDown');
  await map.press('-');
  const nextCamera = await page.getByTestId('camera-position').textContent();
  const nextZoom = await page.getByLabel('Map zoom').textContent();
  await page.getByRole('button', { name: 'Star map', exact: true }).click();
  await expect(page.getByTestId('camera-position')).toHaveText(nextCamera!);
  await expect(page.getByLabel('Map zoom')).toHaveText(nextZoom!);
  await expect(page.locator('.selected-fleet-card')).toContainText('Fleet 1');
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('fleet-focused-map.png') });
  expect(errors).toEqual([]);
});

test('flottfokuserad-kartvy / flottadministration: native touch forms a new fleet', async ({
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
  await selectMapFleet(page);
  const source = (await page
    .getByRole('button', { name: 'Fighter 1 in Home Fleet', exact: true })
    .boundingBox())!;
  const target = (await page
    .getByRole('group', { name: 'New fleet', exact: true })
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
  await page
    .getByRole('textbox', { name: 'Fleet name', exact: true })
    .press('Escape');
  await expect(
    page.getByRole('button', { name: 'Fighter 1 in Fleet 1', exact: true }),
  ).toBeVisible();
});

for (const size of [
  { width: 320, height: 568 },
  { width: 844, height: 390 },
  { width: 667, height: 320 },
]) {
  test(`flottfokuserad-kartvy / kompakta-flottkort: larger text fits ${size.width}x${size.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(size);
    await page.goto('./');
    await startFirstSlot(page);
    await page.getByRole('button', { name: 'Fleets', exact: true }).click();
    await page.addStyleTag({ content: 'html { font-size: 125%; }' });
    await formFleet(page);
    await page
      .getByRole('button', {
        name: 'Exploration ship 1 in Home Fleet',
        exact: true,
      })
      .click();
    await page
      .getByRole('button', { name: 'Move ship to Fleet 1', exact: true })
      .click();
    await expect(
      page.getByRole('button', {
        name: 'Exploration ship 1 in Fleet 1',
        exact: true,
      }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth > innerWidth ||
          document.documentElement.scrollHeight > innerHeight,
      ),
    ).toBe(false);
    await page.screenshot({
      path: testInfo.outputPath('fleet-map-larger-text.png'),
    });
  });
}

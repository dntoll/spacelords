import { chooseFleetDestination } from './fleet-helpers.js';
import { selectMapHex, selectMapObject } from './map-helpers.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
import { expect, test } from '@playwright/test';
import { startFirstSlot, endTurn } from './save-helpers.js';

for (const size of [
  { width: 320, height: 568 },
  { width: 393, height: 851 },
  { width: 844, height: 390 },
  { width: 667, height: 320 },
]) {
  test(`fokuserat-kartval / rundkontroller-i-decisions: selection and turn actions share the lower area at ${size.width}x${size.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(size);
    await page.goto('./');
    await startFirstSlot(page);
    const end = page.getByRole('button', { name: 'End turn', exact: true });
    const console = page.getByRole('region', { name: 'Turn console' });
    const log = page.getByRole('log', { name: 'Game events' });
    const panel = page.locator('.selection-panel');
    await expect(panel).toBeVisible();
    await expect(console).toBeHidden();
    await expect(end).toBeHidden();
    await expect(
      page.getByRole('combobox', { name: 'Known objects' }),
    ).toHaveCount(0);
    await expect(page.getByRole('group', { name: 'Map controls' })).toHaveCount(
      0,
    );
    await expect(page.locator('.map-order-legend')).toHaveCount(0);
    const selected = (await panel.boundingBox())!;
    const map = (await page.getByTestId('map-container').boundingBox())!;
    expect(selected.width).toBeGreaterThan(size.width - 30);
    expect(selected.height).toBeGreaterThan(map.height * 0.3);
    expect(selected.y).toBeGreaterThanOrEqual(map.y + map.height / 2);
    expect(selected.y + selected.height).toBeGreaterThan(size.height - 20);
    await page.screenshot({
      path: testInfo.outputPath('selection-lower-area.png'),
    });

    await chooseFleetDestination(page);
    await selectMapObject(page, 'Vesta');
    await selectMapHex(page, new HexCoordinate(-2, 0));
    await expect(panel).toBeHidden();
    await expect(console).toBeVisible();
    await expect(end).toBeVisible();
    await console.locator('summary').click();
    await expect(page.getByText('Empty space', { exact: true })).toHaveCount(0);
    await expect(
      page.getByText('Unexplored space', { exact: true }),
    ).toHaveCount(0);
    await endTurn(page);
    await expect(log).toContainText('Home Fleet arrived at Vesta.');
    await expect(end).toBeEnabled();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(log).not.toContainText('moved to');
    const consoleBounds = (await console.boundingBox())!;
    const endBounds = (await end.boundingBox())!;
    expect(consoleBounds.y + consoleBounds.height).toBeLessThanOrEqual(
      endBounds.y,
    );

    await selectMapObject(page, 'Vesta');
    await expect(console).toBeHidden();
    await expect(end).toBeHidden();
    await page.getByRole('button', { name: 'Decisions', exact: true }).click();
    await expect(console).toBeVisible();
    await expect(log).toContainText('Home Fleet arrived at Vesta.');
    await expect(
      log.getByRole('heading', { name: 'Year 1', exact: true }),
    ).toHaveCount(1);
    await expect(
      log.locator('.event-type-label', { hasText: 'Population changes:' }),
    ).toHaveCount(1);
    const before = await log.locator('[data-event-id]').count();
    await endTurn(page);
    await expect(log.locator('[data-event-id]')).toHaveCount(before + 1);
    await expect(end).toBeEnabled();
    await page.screenshot({
      path: testInfo.outputPath('decisions-turn-actions.png'),
    });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollHeight <= innerHeight &&
          document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.reload();
    await startFirstSlot(page);
    await page.getByRole('button', { name: 'Decisions', exact: true }).click();
    await console.locator('summary').click();
    await expect(log).toContainText('Home Fleet arrived at Vesta.');
  });
}

test('handelser: Events adapts to available screen space without a selection', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('./');
  await startFirstSlot(page);
  await selectMapHex(page, new HexCoordinate(-2, 0));
  for (let year = 0; year < 8; year++) await endTurn(page);
  const panel = page.getByRole('region', { name: 'Turn console' });
  await panel.locator('summary').click();
  const large = (await panel.boundingBox())!;
  expect(large.height).toBeGreaterThanOrEqual(180);
  expect(large.width).toBeGreaterThan(320);
  await page.screenshot({ path: testInfo.outputPath('events-desktop.png') });
  for (const size of [
    { width: 1024, height: 768 },
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    const bounds = (await panel.boundingBox())!;
    const end = (await page
      .getByRole('button', { name: 'End turn', exact: true })
      .boundingBox())!;
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(end.y);
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(size.width);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
  }
});

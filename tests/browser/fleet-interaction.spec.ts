import { formFleet } from './fleet-helpers.js';
import { Game } from '../../src/client/models/Game.js';
import { FleetMapLayout } from '../../src/client/models/FleetMapLayout.js';
import type { SavedGame } from '../../src/client/models/SaveRepository.js';
import { selectMapObject } from './map-helpers.js';
import { startFirstSlot } from './save-helpers.js';
import { expect, test, type Page } from '@playwright/test';

async function mapCenter(page: Page) {
  const canvas = page.locator('canvas[data-rendered="true"]');
  await expect(canvas).toHaveCount(1);
  const bounds = (await canvas.boundingBox())!;
  return {
    canvas,
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

test('flottval-pa-kartan / dra-flottdestination: selects a fleet, previews a snapped arrow and commits on release', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await startFirstSlot(page);
  const { canvas } = await mapCenter(page);
  await selectMapObject(page, 'Vesta');
  const saved = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as SavedGame,
  );
  const marker = FleetMapLayout.markers(
    Game.restore(saved.state).fleetSnapshots(),
  ).find((item) => item.fleet.name === 'Home Fleet')!;
  const bounds = (await canvas.boundingBox())!;
  const camera = await page.getByTestId('camera-position').textContent();
  const [cameraX, cameraY] = camera!.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  const zoom =
    Number(
      (await page.getByLabel('Map zoom').textContent())!.replace('%', ''),
    ) / 100;
  const x = bounds.x + bounds.width / 2 + (marker.point.x - cameraX!) * zoom;
  const y = bounds.y + bounds.height / 2 + (marker.point.y - cameraY!) * zoom;
  await page.mouse.move(x, y);
  await expect(canvas).toHaveCSS('cursor', 'pointer');
  await page.mouse.click(x, y);
  const panel = page.getByRole('complementary', { name: 'Selected fleet' });
  await expect(
    panel.getByRole('heading', { name: 'Home Fleet', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('combobox', { name: 'Known objects' }),
  ).toHaveCount(0);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + Math.sqrt(3) * 36, y, { steps: 8 });
  await expect(panel.locator('.selected-fleet-card')).toHaveAttribute(
    'aria-description',
    /Destination preview on map/,
  );
  await expect(canvas).toHaveCSS('cursor', 'grabbing');
  await expect(page.getByTestId('camera-position')).toHaveText(camera!);
  await page.screenshot({
    path: testInfo.outputPath('fleet-destination-preview.png'),
  });
  await page.mouse.up();
  await expect(panel.locator('.selected-fleet-card')).toHaveAttribute(
    'aria-description',
    /Destination: selected location on map/,
  );
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - Math.sqrt(3) * 36, y, { steps: 8 });
  await expect(panel.locator('.selected-fleet-card')).toHaveAttribute(
    'aria-description',
    /Destination preview on map/,
  );
  await canvas.press('Escape');
  await page.mouse.up();
  await expect(panel.locator('.selected-fleet-card')).toHaveAttribute(
    'aria-description',
    /Destination: selected location on map/,
  );
  expect(errors).toEqual([]);
});

test('kartflottor / flottval-pa-kartan: colocated fleets occupy separate positions within the hex', async ({
  page,
}, testInfo) => {
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  await formFleet(page);
  await page.getByRole('button', { name: 'Star map', exact: true }).click();
  const { canvas } = await mapCenter(page);
  const saved = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as SavedGame,
  );
  const markers = FleetMapLayout.markers(
    Game.restore(saved.state).fleetSnapshots(),
  );
  const bounds = (await canvas.boundingBox())!;
  const [cameraX, cameraY] = (await page
    .getByTestId('camera-position')
    .textContent())!
    .match(/-?\d+(?:\.\d+)?/g)!
    .map(Number);
  const zoom =
    Number(
      (await page.getByLabel('Map zoom').textContent())!.replace('%', ''),
    ) / 100;
  const point = (name: string) => {
    const marker = markers.find((item) => item.fleet.name === name)!;
    return {
      x: bounds.x + bounds.width / 2 + (marker.point.x - cameraX!) * zoom,
      y: bounds.y + bounds.height / 2 + (marker.point.y - cameraY!) * zoom,
    };
  };
  const first = point('Fleet 1');
  const home = point('Home Fleet');
  expect(Math.hypot(first.x - home.x, first.y - home.y)).toBeGreaterThan(0);
  for (const position of [first, home]) {
    expect(
      await canvas.evaluate(
        (element, p) => document.elementFromPoint(p.x, p.y) === element,
        position,
      ),
    ).toBe(true);
  }
  await page.mouse.click(first.x, first.y);
  const panel = page.getByRole('complementary', { name: 'Selected fleet' });
  await expect(
    panel.getByRole('heading', { name: 'Fleet 1', exact: true }),
  ).toBeVisible();
  await page.mouse.click(home.x, home.y);
  await expect(
    panel.getByRole('heading', { name: 'Home Fleet', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('colocated-fleets.png') });
  await page.mouse.click((first.x + home.x) / 2, (first.y + home.y) / 2);
  await expect(
    page.getByRole('complementary', { name: 'Selected hex' }),
  ).toContainText('Tellus');
});

import { Game } from '../../../src/client/space-map/models/Game.js';
import { FleetMapLayout } from '../../../src/client/space-map/models/star-map/FleetMapLayout.js';
import type { SavedGame } from '../../../src/client/space-map/models/saves/SaveRepository.js';
import { selectMapPoint } from './map-helpers.js';
import { expect, type Page } from '@playwright/test';

export async function chooseFleetDestination(
  page: Page,
  name = 'Home Fleet',
): Promise<void> {
  const card = page.locator('.map-fleet-cards .fleet-card').filter({
    has: page.getByRole('heading', { name, exact: true }),
  });

  await card
    .getByRole('button', {
      name: `Choose destination for ${name}`,
      exact: true,
    })
    .click();
}

export async function selectMapFleet(
  page: Page,
  name = 'Home Fleet',
): Promise<void> {
  const record = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as SavedGame,
  );
  const game = Game.restore(record.state);
  const fleets = game.fleetSnapshots();
  const marker = FleetMapLayout.markers(fleets).find(
    (marker) => marker.fleet.name === name || marker.fleet.ownName === name,
  );
  if (!marker) throw new Error(`No positioned fleet: ${name}`);
  await selectMapPoint(page, marker.point);
  await expect(
    page.locator('.selected-fleet-card .fleet-name-button'),
  ).toHaveText(marker.fleet.name);
}

export async function fleetMarkerPoint(
  page: Page,
  name: string,
): Promise<{ x: number; y: number }> {
  const record = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as SavedGame,
  );
  const game = Game.restore(record.state);
  const canvas = page.locator('canvas[data-rendered="true"]');
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
  const marker = FleetMapLayout.markers(game.fleetSnapshots()).find(
    (item) => item.fleet.name === name || item.fleet.ownName === name,
  );
  if (!marker) throw new Error(`No positioned fleet: ${name}`);
  return {
    x: bounds.x + bounds.width / 2 + (marker.point.x - cameraX!) * zoom,
    y: bounds.y + bounds.height / 2 + (marker.point.y - cameraY!) * zoom,
  };
}

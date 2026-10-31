import { expect, test, type Page } from '@playwright/test';
import { Game, type GameState } from '../../src/client/models/Game.js';
import { FleetMapLayout } from '../../src/client/models/FleetMapLayout.js';
import { tradeNetworkState } from '../fixtures/trade-network.js';
import { selectMapFleet } from './fleet-helpers.js';
import { selectMapObject, selectMapPoint } from './map-helpers.js';
import { startFirstSlot, endTurn } from './save-helpers.js';

async function seed(page: Page, routed = true): Promise<GameState> {
  const original = tradeNetworkState();
  original.colonies[0]![1].buildings.push({
    id: 'transport-factory',
    type: 'Transport ship factory',
    slotIndex: 2,
    demolition: false,
  });
  const state: GameState = {
    ...original,
    pirates: [],
    researched: [
      ...original.researched,
      'Automated exploration',
      'Automated transport',
    ],
    fleets: original.fleets.map((fleet) =>
      routed && fleet.id === 'freighters'
        ? { ...fleet, routeId: 'route-test' }
        : fleet,
    ),
  };
  await page.addInitScript((state) => {
    if (localStorage.getItem('orders-seeded')) return;
    localStorage.setItem('orders-seeded', 'yes');
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-31', state }),
    );
  }, state);
  await page.goto('./');
  await startFirstSlot(page);
  return state;
}
async function saved(page: Page): Promise<GameState> {
  return page.evaluate(
    () =>
      (
        JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as {
          state: GameState;
        }
      ).state,
  );
}

test('egen-ordervy / flottval-pa-orderkarta / patrullcentrum-vid-order: uses readable orders, chooses a Patrol center and joins a fleet on the map', async ({
  page,
}, testInfo) => {
  const state = await seed(page);
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  await selectMapFleet(page);
  const toolbar = page.locator('.selected-fleet-card .fleet-primary-orders');
  await expect(toolbar.getByRole('button')).toHaveText([
    'Move',
    'Stop',
    'Orders',
  ]);
  await toolbar.getByRole('button', { name: 'Orders', exact: true }).click();
  await expect(page.locator('.orders-view')).toContainText(
    'Explore unknown hexes',
  );
  await expect(
    page
      .locator('.orders-view')
      .getByRole('button', { name: 'Move', exact: true }),
  ).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('orders-mobile.png') });
  await page.getByRole('button', { name: 'Patrol', exact: true }).click();
  await selectMapObject(page, 'Vesta');
  expect((await saved(page)).fleets[0]!.patrol!.center).toEqual({ q: 0, r: 1 });
  await page
    .locator('.selected-fleet-card')
    .getByRole('button', { name: 'Cancel patrol', exact: true })
    .click();
  await page
    .locator('.selected-fleet-card')
    .getByRole('button', { name: 'Orders', exact: true })
    .click();
  await page.getByRole('button', { name: 'Join fleet', exact: true }).click();
  await expect(
    page
      .getByRole('combobox', { name: 'Fleet target' })
      .locator('option[value="freighters"]'),
  ).toHaveCount(0);
  const marker = FleetMapLayout.markers(
    Game.restore(state)
      .fleetSnapshots()
      .filter((fleet) => !fleet.routeId),
  ).find((marker) => marker.fleet.id === 'travellers')!;
  await selectMapPoint(page, marker.point);
  await expect(
    page.getByRole('combobox', { name: 'Fleet target' }),
  ).toHaveValue('travellers');
  const joinBox = (await page
    .getByRole('button', { name: 'Join Travellers', exact: true })
    .boundingBox())!;
  const panelBox = (await page
    .getByRole('complementary', { name: 'Orders', exact: true })
    .boundingBox())!;
  expect(joinBox.y + joinBox.height).toBeLessThanOrEqual(
    panelBox.y + panelBox.height,
  );
  await page.screenshot({
    path: testInfo.outputPath('join-fleet-map-mobile.png'),
  });
  await page
    .getByRole('button', { name: 'Join Travellers', exact: true })
    .click();
  expect((await saved(page)).fleets[0]!.joinFleetId).toBe('travellers');
});

test('startorder-for-nybyggda-skepp / ruttval-for-order: chooses a route before building and starts only the new transport on it after reload', async ({
  page,
}, testInfo) => {
  test.setTimeout(45_000);
  const state = await seed(page, false);
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  await page
    .locator('.planet-tabs')
    .getByRole('button', { name: 'Production', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Show Transport ship', exact: true })
    .click();
  await page.getByRole('button', { name: 'Orders', exact: true }).click();
  await page.getByRole('button', { name: 'Join route', exact: true }).click();
  const route = page
    .locator('.orders-view')
    .getByRole('button', { name: 'Tellus ↔ Vesta', exact: true });
  await expect(route).toContainText('hex away');
  await expect(route).toContainText('No ships assigned');
  await page.screenshot({
    path: testInfo.outputPath('start-order-route-mobile.png'),
  });
  await route.click();
  await expect(page.locator('.production-order')).toContainText(
    'Start order: Join route',
  );
  await page
    .getByRole('button', { name: 'Queue Transport ship', exact: true })
    .click();
  expect((await saved(page)).colonies[0]![1].projects[0]!.initialOrder).toEqual(
    { kind: 'join-route', routeId: 'route-test' },
  );
  await page.reload();
  await startFirstSlot(page);
  await endTurn(page);
  const result = await saved(page);
  expect(
    result.fleets.find((fleet) => fleet.id === 'fleet-home')!.ships,
  ).toEqual(state.fleets[0]!.ships);
  expect(
    result.fleets.filter(
      (fleet) =>
        !state.fleets.some((old) => old.id === fleet.id) &&
        fleet.routeId === 'route-test',
    ),
  ).toHaveLength(1);
});

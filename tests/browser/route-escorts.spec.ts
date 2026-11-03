import { expect, test } from '@playwright/test';
import { routeEscortState } from '../fixtures/route-escorts.js';
import { assignFleetToRoute, startFirstSlot } from './save-helpers.js';
import { selectMapFleet } from './fleet-helpers.js';
import { Game, type GameState } from '../../src/client/models/Game.js';
import { FleetMapLayout } from '../../src/client/models/FleetMapLayout.js';
import { selectMapPoint } from './map-helpers.js';

test('unika-flottnamn / rutt-eskortfordelning / ruttflottor-pa-kartan: assign fighters and select their carrier at the route midpoint', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript((state) => {
    if (localStorage.getItem('route-escorts-seeded')) return;
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-24T00:00:00Z', state }),
    );
    localStorage.setItem('route-escorts-seeded', 'yes');
  }, routeEscortState());
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Route', exact: true }).click();
  await expect(page.locator('.map-route-legend')).toContainText(
    'Available transports',
  );
  await selectMapFleet(page, 'Fighters');
  const card = page.locator('.fleet-card[data-fleet-id="fighters"]');
  await card
    .getByRole('button', { name: 'Rename Fighters', exact: true })
    .click();
  const name = page.getByRole('textbox', { name: 'Fleet name', exact: true });
  await name.fill('Carrier A');
  await name.press('Enter');
  await expect(page.locator('.game-notice')).toContainText(
    'Fleet names must be unique',
  );
  await name.press('Escape');
  await card.getByRole('button', { name: 'Orders', exact: true }).click();
  await page.getByRole('button', { name: 'Join route', exact: true }).click();
  await expect(
    page.locator('.orders-view').getByRole('button', {
      name: 'Tellus ↔ Vesta',
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByRole('button', { name: 'Back to orders', exact: true })
    .click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await assignFleetToRoute(page, 'Carrier A', 'Tellus', 'Vesta');
  await assignFleetToRoute(page, 'Carrier B', 'Tellus', 'Vesta');
  await assignFleetToRoute(page, 'Fighters', 'Tellus', 'Vesta');
  const state = await page.evaluate(
    () =>
      (
        JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as {
          state: GameState;
        }
      ).state,
  );
  const game = Game.restore(state);
  expect(game.fleet('carrier-a')!.ships.Fighter).toBe(3);
  expect(game.fleet('carrier-b')!.ships.Fighter).toBe(2);
  await page.getByRole('button', { name: 'Route', exact: true }).click();
  const marker = FleetMapLayout.markers(
    game.fleetSnapshots(),
    game.tradeRoutes,
  ).find((m) => m.fleet.id === 'carrier-a')!;
  await selectMapPoint(page, marker.point);
  await expect(
    page.locator('.selected-fleet-card .fleet-name-button'),
  ).toHaveText('Route Tellus <> Vesta');
  await page.screenshot({ path: testInfo.outputPath('route-escorts.png') });
  await page.reload();
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Route', exact: true }).click();
  await selectMapFleet(page, 'Carrier B');
  await expect(page.locator('.selected-fleet-card')).toContainText(
    'Route Tellus <> Vesta',
  );
  expect(errors).toEqual([]);
});

import { expect, test } from '@playwright/test';
import { routeEscortState } from '../../fixtures/route-escorts.js';
import { startFirstSlot } from './save-helpers.js';
import { selectMapFleet } from './fleet-helpers.js';
import {
  Game,
  type GameState,
} from '../../../src/client/space-map/models/Game.js';

test('unika-flottnamn / eskort-pa-routes / spelnotis-synlig: assign an armed fleet from Factories and retain its escort after reload', async ({
  page,
}) => {
  const initial = routeEscortState();
  const state = {
    ...initial,
    fleets: initial.fleets.map((fleet) =>
      fleet.id === 'carrier-a' ? { ...fleet, routeId: 'route-test' } : fleet,
    ),
  };
  await page.addInitScript((state) => {
    if (localStorage.getItem('route-escorts-seeded')) return;
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-24T00:00:00Z', state }),
    );
    localStorage.setItem('route-escorts-seeded', 'yes');
  }, state);
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  await selectMapFleet(page, 'Fighters');
  const card = page.locator('.fleet-card[data-fleet-id="fighters"]');
  await card.getByRole('button', { name: 'Fighters', exact: true }).dblclick();
  const name = page.getByRole('textbox', { name: 'Fleet name', exact: true });
  await name.fill('Carrier A');
  await name.press('Enter');
  const notice = page.locator('.game-notice');
  await expect(notice).toContainText('Fleet names must be unique');
  await expect(notice).toBeInViewport({ ratio: 1 });
  expect(
    await notice.evaluate((node) => {
      const bounds = node.getBoundingClientRect();
      return node.contains(
        document.elementFromPoint(
          bounds.left + bounds.width / 2,
          bounds.top + bounds.height / 2,
        ),
      );
    }),
  ).toBe(true);
  await name.press('Escape');
  await page.getByRole('button', { name: 'Factories', exact: true }).click();
  await page
    .getByRole('button', { name: 'Links and escorts in Tellus, Vesta' })
    .click();
  await page.getByRole('button', { name: 'Escort Tellus–Vesta' }).click();
  await page
    .getByRole('button', { name: 'Assign Fighters to Tellus–Vesta' })
    .click();
  const saved = await page.evaluate(
    () =>
      (
        JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as {
          state: GameState;
        }
      ).state,
  );
  expect(Game.restore(saved).fleet('carrier-a')!.ships.Fighter).toBe(5);
  await page.reload();
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Factories', exact: true }).click();
  await page
    .getByRole('button', { name: 'Links and escorts in Tellus, Vesta' })
    .click();
  await expect(page.getByText('Escort: 5 armed ships')).toBeVisible();
});

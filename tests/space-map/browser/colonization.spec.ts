import { expect, test } from '@playwright/test';
import type { GameState } from '../../../src/client/space-map/models/Game.js';
import { colonizationState } from '../../fixtures/colonization.js';
import { endTurn, startFirstSlot } from './save-helpers.js';
import { selectMapObject } from './map-helpers.js';
import { chooseFleetOrder, selectMapFleet } from './fleet-helpers.js';

test('koloniseringsorder: Colonize chooses a planet, survives reload and settles automatically after travel', async ({
  page,
}, testInfo) => {
  await page.addInitScript((state) => {
    if (localStorage.getItem('colonization-seeded')) return;
    localStorage.setItem('colonization-seeded', 'yes');
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-30', state }),
    );
  }, colonizationState());
  const saved = () =>
    page.evaluate(
      () =>
        (
          JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as {
            state: GameState;
          }
        ).state,
    );
  await page.goto('../../browser/');
  await startFirstSlot(page);
  await selectMapFleet(page, 'Home Fleet');
  await chooseFleetOrder(page, 'Colonize');
  await expect(page.locator('.orders-view')).toContainText(
    'Choose a known uninhabited planet on the map.',
  );
  await page.screenshot({
    path: testInfo.outputPath('choose-colonization-planet.png'),
  });
  await page
    .getByRole('button', { name: 'Back to orders', exact: true })
    .click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  expect((await saved()).fleets[0]!.colonizationTargetId).toBeUndefined();
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  await selectMapFleet(page, 'Home Fleet');
  await chooseFleetOrder(page, 'Colonize');
  await selectMapObject(page, 'Vesta');
  await expect(page.locator('.orders-view')).toHaveCount(0);
  expect((await saved()).fleets[0]!.colonizationTargetId).toBe('sol-1');
  expect((await saved()).colonies.some(([id]) => id === 'sol-1')).toBe(false);
  await page.reload();
  await startFirstSlot(page);
  expect((await saved()).fleets[0]!.colonizationTargetId).toBe('sol-1');
  await endTurn(page);
  const result = await saved();
  expect(result.colonies.some(([id]) => id === 'sol-1')).toBe(true);
  expect(result.fleets[0]!.ships['Colony ship']).toBe(1);
  expect(result.fleets[0]!.colonizationTargetId).toBeUndefined();
  expect(
    result.events.filter((event) => event.text.includes('was colonized')),
  ).toHaveLength(1);
  await selectMapObject(page, 'Vesta');
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Vesta', exact: true }),
  ).toBeVisible();
});

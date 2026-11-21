import { scenarioTimeout } from '../../browser-timeouts.js';
import { expect, test } from '@playwright/test';
import {
  Game,
  TECHNOLOGIES,
} from '../../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';
import { selectMapObject } from './map-helpers.js';
import { endTurn, startFirstSlot } from './save-helpers.js';

test('delar-tillverkas-pa-behov / produktionsflikar: a Fighter order makes its parts and survives reload', async ({
  page,
}) => {
  scenarioTimeout(90_000);
  const state = new Game(createExampleGalaxy()).exportState();
  const colony = state.colonies[0]![1];
  colony.population = 30000;
  colony.stock = { ...colony.stock, Iron: 1000, Water: 1000, Oil: 1000 };
  colony.buildings = (
    [
      'Rocket engine factory',
      'Weapons module factory',
      'Fighter factory',
    ] as const
  ).map((type, slotIndex) => ({
    id: `factory-${slotIndex}`,
    type,
    slotIndex,
    demolition: false,
  }));
  const initial = { ...state, researched: TECHNOLOGIES };
  await page.addInitScript((saved) => {
    if (localStorage.getItem('local-fighter-seeded')) return;
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-24T10:00:00Z', state: saved }),
    );
    localStorage.setItem('local-fighter-seeded', 'yes');
  }, initial);
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Production', exact: true }).click();
  await selectMapObject(page, 'Tellus');
  await page.getByRole('button', { name: 'Show Fighter', exact: true }).click();
  const controls = page.getByRole('complementary', {
    name: 'Production controls',
  });
  await controls.getByRole('button', { name: 'Build', exact: true }).click();
  await controls.getByRole('tab', { name: 'Queue · 1' }).click();
  await expect(
    page.getByRole('list', { name: 'Parts for Fighter' }),
  ).toContainText('Rocket engine');
  await expect(
    page.getByRole('list', { name: 'Parts for Fighter' }),
  ).toContainText('Weapons module');
  await page.reload();
  await startFirstSlot(page);
  for (let round = 0; round < 6; round++) await endTurn(page);
  const saved = await page.evaluate(
    () =>
      (
        JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as {
          state: typeof initial;
        }
      ).state,
  );
  expect(saved.colonies[0]![1].projects).toEqual([]);
  expect(
    saved.fleets.reduce(
      (count, fleet) => count + (fleet.ships.Fighter ?? 0),
      0,
    ),
  ).toBe(2);
});

import { scenarioTimeout } from '../../browser-timeouts.js';
import { expect, test } from '@playwright/test';
import {
  TECHNOLOGIES,
  type BuildType,
  type GameState,
} from '../../../src/client/space-map/models/Game.js';
import { emptyStock } from '../../../src/client/space-map/models/Economy.js';
import { tradeNetworkState } from '../../fixtures/trade-network.js';
import { selectMapObject } from './map-helpers.js';
import { endTurn, startFirstSlot } from './save-helpers.js';

function initialState() {
  const state = tradeNetworkState();
  state.researched = [...TECHNOLOGIES];
  for (const [index, [, colony]] of state.colonies.entries()) {
    colony.population = 10000;
    colony.stock = { ...emptyStock(), Iron: 1000, Water: 1000, Oil: 1000 };
    colony.projects = [];
    const types: BuildType[] =
      index === 0
        ? ['Rocket engine factory', 'Weapons module factory']
        : ['Fighter factory'];
    colony.buildings = types.map((type, slotIndex) => ({
      id: `factory-${index}-${slotIndex}`,
      type,
      slotIndex,
      demolition: false,
    }));
  }
  state.fleets.find((fleet) => fleet.id === 'freighters')!.routeId =
    'route-test';
  return state;
}

async function openFighterOrder(
  page: import('@playwright/test').Page,
  state: GameState,
) {
  await page.addInitScript((state) => {
    if (localStorage.getItem('components-seeded')) return;
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-23T10:00:00Z', state }),
    );
    localStorage.setItem('components-seeded', 'yes');
  }, state);
  await page.goto('./');
  await startFirstSlot(page);
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'Production', exact: true })
    .click();
  await selectMapObject(page, 'Vesta');
  await page.getByRole('button', { name: 'Show Fighter', exact: true }).click();
  await page
    .getByRole('complementary', { name: 'Production controls' })
    .getByRole('button', { name: 'Build', exact: true })
    .click();
  await page.getByRole('tab', { name: 'Queue · 1' }).click();
}

test('delar-tillverkas-pa-behov / delat-lager-i-natverket: a Fighter order receives automatically made parts across a link', async ({
  page,
}) => {
  scenarioTimeout(90_000);
  const initial = initialState();
  await openFighterOrder(page, initial);
  await expect(page.locator('.map-queue-row')).toContainText('Fighter');
  await expect(
    page.getByRole('list', { name: 'Parts for Fighter' }),
  ).toContainText('Rocket engine');
  await expect(
    page.getByRole('list', { name: 'Parts for Fighter' }),
  ).toContainText('Weapons module');
  await page.reload();
  await startFirstSlot(page);
  for (let year = 0; year < 6; year++) await endTurn(page);
  const saved = await page.evaluate(
    () =>
      (
        JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as {
          state: GameState;
        }
      ).state,
  );
  expect(saved.version).toBe(initial.version);
  expect(saved.colonies[1]![1].projects).toEqual([]);
  expect(
    saved.fleets.reduce((n, fleet) => n + (fleet.ships.Fighter ?? 0), 0),
  ).toBe(3);
});

test('byggkons-framsteg: a queued Fighter explains that a part factory is missing', async ({
  page,
}) => {
  const state = initialState();
  state.colonies[0]![1].buildings.pop();
  await openFighterOrder(page, state);
  await expect(
    page.getByRole('list', { name: 'Parts for Fighter' }),
  ).toContainText('Weapons module · no factory in group');
});

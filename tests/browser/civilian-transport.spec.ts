import { expect, test } from '@playwright/test';
import { Game, type GameState } from '../../src/client/models/Game.js';
import { tradeNetworkState } from '../fixtures/trade-network.js';
import { chooseResearch, endTurn, startFirstSlot } from './save-helpers.js';
import { selectMapFleet } from './fleet-helpers.js';

test('civil-skyttelforskning / civil-skytteltillverkning / civiltrafik-sparning: research, build and operate passenger traffic', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const state = tradeNetworkState();
  const home = state.colonies[0]![1];
  home.population = 4000;
  home.buildings.push(
    {
      id: 'factory',
      type: 'Transport ship factory',
      slotIndex: 2,
      demolition: false,
    },
    {
      id: 'research',
      type: 'Research station',
      slotIndex: 3,
      demolition: false,
    },
  );
  state.colonies[1]![1].buildings = [
    {
      id: 'remote-1',
      type: 'Research station',
      slotIndex: 1,
      demolition: false,
    },
    {
      id: 'remote-2',
      type: 'Research station',
      slotIndex: 2,
      demolition: false,
    },
    {
      id: 'remote-3',
      type: 'Research station',
      slotIndex: 3,
      demolition: false,
    },
  ];
  const homeName = state.world.systems
    .flatMap((s) => s.planets)
    .find((p) => p.id === 'sol-0')!.name;
  await page.addInitScript((initial) => {
    if (localStorage.getItem('spacelords.save.v2.1')) return;
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-30T12:00:00Z', state: initial }),
    );
  }, state);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await startFirstSlot(page);
  await chooseResearch(page, 'Civilian transport');
  await endTurn(page);
  await page.getByRole('button', { name: 'Star map', exact: true }).click();
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Planet pages' })
    .getByRole('button', { name: 'Production', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Show Civilian shuttle', exact: true })
    .click();
  await expect(page.locator('.planet-production')).toContainText(
    '500 passengers',
  );
  await expect(
    page.getByRole('combobox', {
      name: 'Destination fleet for Civilian shuttle',
    }),
  ).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Queue Civilian shuttle', exact: true })
    .click();
  await endTurn(page);
  await page.getByRole('button', { name: 'Star map', exact: true }).click();
  await selectMapFleet(page, `${homeName} Civilian transport`);
  const card = page.locator('.map-fleet-cards .selected-fleet-card');
  await expect(card).toContainText('Civilian transport');
  await expect(card).toContainText('0 passengers aboard');
  await expect(
    card.getByRole('button', { name: 'Civilian transport', exact: true }),
  ).toBeVisible();
  await endTurn(page);
  const saved = await page.evaluate(
    () =>
      (
        JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as {
          state: GameState;
        }
      ).state,
  );
  expect(
    saved.events.some(
      (e) => e.text.includes('boarded') && e.text.includes('passengers'),
    ),
  ).toBe(true);
  expect(saved.fleets.some((f) => f.civilian)).toBe(true);
  expect(() => Game.restore(saved)).not.toThrow();
  await page.reload();
  await startFirstSlot(page);
  await selectMapFleet(page, `${homeName} Civilian transport`);
  await expect(
    page.locator('.map-fleet-cards .selected-fleet-card'),
  ).toContainText('Civilian transport');
  expect(errors).toEqual([]);
});

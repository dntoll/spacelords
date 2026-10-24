import { expect, test } from '@playwright/test';
import {
  type BuildType,
  type GameState,
} from '../../src/client/models/Game.js';
import { emptyStock } from '../../src/client/models/Economy.js';
import { tradeNetworkState } from '../fixtures/trade-network.js';
import { selectMapObject } from './map-helpers.js';
import { endTurn, startFirstSlot } from './save-helpers.js';

function initialState() {
  const state = tradeNetworkState();
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

test('automatiska-delorder: orders remote production through the UI and preserves supply until a Fighter is assembled', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript((state) => {
    if (localStorage.getItem('components-seeded')) return;
    localStorage.setItem('spacelords.economy-v2-reset', 'done');
    localStorage.setItem('spacelords.terraforming-v5-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-23T10:00:00Z', state }),
    );
    localStorage.setItem('components-seeded', 'yes');
  }, initialState());
  await page.goto('./');
  await startFirstSlot(page);
  await selectMapObject(page, 'Vesta');
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  await page
    .getByRole('button', { name: 'Queue Fighter', exact: true })
    .click();
  await expect(page.locator('.queue-order')).toHaveCount(1);
  await page
    .getByRole('button', { name: 'Supply & production', exact: true })
    .click();
  const target = page.locator('[data-planet-id="sol-1"]');
  await expect(target.locator('.supply-status')).toHaveText('Waiting');
  await target
    .getByRole('button', { name: 'Supply details for Vesta', exact: true })
    .click();
  await expect(target.locator('[data-material="Rocket engine"]')).toContainText(
    'Ordered production1',
  );
  await expect(
    target.locator('[data-material="Weapons module"]'),
  ).toContainText('Ordered production1');
  await expect(target.locator('.supply-delivery')).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath('ordered-component-production.png'),
  });
  await page.reload();
  await startFirstSlot(page);
  await page
    .getByRole('button', { name: 'Supply & production', exact: true })
    .click();
  await expect(target.locator('.supply-status')).toHaveText('Waiting');
  for (let year = 0; year < 6; year++) await endTurn(page);
  await page
    .getByRole('button', { name: 'Supply & production', exact: true })
    .click();
  await expect(target.locator('.supply-status')).toHaveText('Idle');
  const saved = await page.evaluate(
    () =>
      (
        JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as {
          state: GameState;
        }
      ).state,
  );
  expect(saved.version).toBe(5);
  expect(saved.componentOrders).toEqual([]);
  expect(saved.colonies[0]![1].projects).toEqual([]);
  expect(saved.fleets.reduce((n, fleet) => n + fleet.ships.Fighter, 0)).toBe(3);
  expect(errors).toEqual([]);
});

test('automatiska-delorder: explains a missing part and leaves the saved order state unchanged', async ({
  page,
}) => {
  const state = initialState();
  state.colonies[0]![1].buildings.pop();
  await page.addInitScript((state) => {
    localStorage.setItem('spacelords.economy-v2-reset', 'done');
    localStorage.setItem('spacelords.terraforming-v5-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-23T10:00:00Z', state }),
    );
  }, state);
  await page.goto('./');
  await startFirstSlot(page);
  await selectMapObject(page, 'Vesta');
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  const before = await page.evaluate(() =>
    localStorage.getItem('spacelords.save.v2.1'),
  );
  await page
    .getByRole('button', { name: 'Queue Fighter', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText(
    'Cannot order Weapons module',
  );
  await expect(page.locator('.queue-order')).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem('spacelords.save.v2.1')),
  ).toBe(before);
});

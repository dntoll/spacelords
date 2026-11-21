import { expect, test } from '@playwright/test';
import { Game } from '../../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';
import { startFirstSlot } from './save-helpers.js';

function seededGame() {
  const state = {
    ...new Game(createExampleGalaxy()).exportState(),
    researched: [
      'Exploration ship factory',
      'Fighter factory',
      'Rocket engine factory',
      'Weapons module factory',
    ] as const,
  };
  const colony = state.colonies[0]![1];
  colony.stock = { ...colony.stock, Iron: 1000, Water: 1000, Oil: 1000 };
  colony.buildings = [
    'Fighter factory',
    'Fighter factory',
    'Rocket engine factory',
    'Weapons module factory',
  ].map((type, slotIndex) => ({
    id: `factory-${slotIndex}`,
    type: type as
      'Fighter factory' | 'Rocket engine factory' | 'Weapons module factory',
    slotIndex,
    demolition: false,
  }));
  const game = Game.restore(state);
  for (let i = 0; i < 25; i++)
    game.scheduleShip(game.galaxy.homePlanet, 'Fighter');
  return game.exportState();
}

test('planetsida-informerar / planetundersidor: overview and building sites remain informative', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript((state) => {
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-24T10:00:00Z', state }),
    );
  }, seededGame());
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  await expect(page.locator('[aria-current="page"]')).toHaveText('Overview');
  await expect(page.locator('.planet-building-inventory')).toContainText(
    'Fighter factory ×2',
  );
  const navigation = page.getByRole('navigation', { name: 'Planet pages' });
  await expect(navigation.getByRole('button')).toHaveText([
    'Overview',
    'Building sites',
  ]);
  await navigation.getByRole('button', { name: 'Building sites' }).click();
  const sites = page.locator('.building-sites-grid');
  await expect(sites.locator('.building-site')).toHaveCount(10);
  await expect(
    page.getByText('Build, upgrade and cancel construction in Factories.'),
  ).toBeVisible();
  const first = sites.locator('.building-site').first();
  await expect(first).toContainText('Fighter factory');
  await first.getByRole('button', { name: 'Demolish' }).click();
  await expect(first).toContainText('Demolition scheduled');
  await first.getByRole('button', { name: 'Keep' }).click();
  await expect(first.getByRole('button', { name: 'Demolish' })).toBeVisible();
  expect(errors).toEqual([]);
});

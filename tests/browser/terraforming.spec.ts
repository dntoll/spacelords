import { expect, test } from '@playwright/test';
import { Game } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import { selectMapObject } from './map-helpers.js';
import { chooseResearch, endTurn, startFirstSlot } from './save-helpers.js';

function initialState() {
  const state = new Game(createExampleGalaxy()).exportState();
  const home = state.colonies[0]![1];
  home.buildings = [
    {
      id: 'research',
      type: 'Research station',
      slotIndex: 0,
      demolition: false,
    },
  ];
  return {
    ...state,
    colonies: [
      ...state.colonies,
      [
        'sol-1',
        {
          ...structuredClone(home),
          population: 1_000,
          habitability: 75,
          buildings: [],
          homeFleetId: null,
        },
      ],
    ],
  };
}

test('planettypsforskning / domes-per-byggplats / terraformning / andningsbar-atmosfar: discovers, researches and develops a colony', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript((state) => {
    if (localStorage.getItem('terraforming-seeded')) return;
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-24T10:00:00Z', state }),
    );
    localStorage.setItem('terraforming-seeded', 'yes');
  }, initialState());
  await page.goto('./');
  await startFirstSlot(page);
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'Research', exact: true })
    .click();
  await expect(page.locator('[data-technology="Ice dome"]')).toHaveCount(0);
  await chooseResearch(page, 'Desert terraforming factory');
  for (let year = 0; year < 2; year++) {
    await page.getByRole('button', { name: 'Star map', exact: true }).click();
    await endTurn(page);
  }
  const openColony = async () => {
    await page.getByRole('button', { name: 'Star map', exact: true }).click();
    await selectMapObject(page, 'Vesta');
    await page
      .getByRole('button', { name: 'Open planet', exact: true })
      .click();
  };
  const nextYear = async () => {
    await page.getByRole('button', { name: 'Star map', exact: true }).click();
    await endTurn(page);
    await openColony();
  };
  await openColony();
  await expect(page.locator('.planet-stats')).toContainText('Unbreathable');
  await page
    .getByRole('button', { name: 'Building sites', exact: true })
    .click();
  const first = page.getByRole('article', {
    name: 'Building site 1',
    exact: true,
  });
  await expect(
    first.getByRole('button', {
      name: 'Build building at site 1',
      exact: true,
    }),
  ).toBeDisabled();
  await first
    .getByRole('button', { name: 'Build dome at site 1', exact: true })
    .click();
  await nextYear();
  await page
    .getByRole('button', { name: 'Building sites', exact: true })
    .click();
  await expect(first).toContainText('Dome ready');
  await first
    .getByRole('button', { name: 'Build building at site 1', exact: true })
    .click();
  await expect(
    page.getByRole('button', {
      name: 'Show Ice terraforming factory',
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole('button', {
      name: 'Show Desert terraforming factory',
      exact: true,
    })
    .click();
  await page
    .getByRole('button', {
      name: 'Build Desert terraforming factory',
      exact: true,
    })
    .click();
  await nextYear();
  await expect(page.locator('.planet-stats')).toContainText('75%');
  await nextYear();
  await expect(page.locator('.planet-stats')).toContainText('80%');
  await expect(page.locator('.planet-stats')).toContainText('Breathable');
  await page
    .getByRole('button', { name: 'Building sites', exact: true })
    .click();
  await expect(
    page
      .getByRole('article', { name: 'Building site 2', exact: true })
      .getByRole('button', { name: 'Build building at site 2', exact: true }),
  ).toBeEnabled();
  await page.screenshot({
    path: testInfo.outputPath('terraforming-colony.png'),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.reload();
  await startFirstSlot(page);
  await openColony();
  await expect(page.locator('.planet-stats')).toContainText('80%');
  await page
    .getByRole('button', { name: 'Building sites', exact: true })
    .click();
  await expect(first).toContainText('Dome ready');
  expect(errors).toEqual([]);
});

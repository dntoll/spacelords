import { expect, test } from '@playwright/test';
import { Game } from '../../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';
import { startFirstSlot, endTurn } from './save-helpers.js';

test('senaste-teknik-i-byggval / uppgradera-delfabrik-i-factories / byggtid-per-byggnad: upgrade an occupied site, reload and finish in place', async ({
  page,
}, testInfo) => {
  const initial = new Game(createExampleGalaxy()).exportState();
  const colony = initial.colonies[0]![1];
  colony.population = 300;
  colony.stock = { ...colony.stock, Iron: 100, Water: 100, Oil: 100 };
  colony.buildings = [
    {
      id: 'old-telescope',
      type: 'Telescope I factory',
      slotIndex: 0,
      demolition: false,
    },
  ];
  const state = {
    ...initial,
    researched: [
      'Telescope I factory',
      'Telescope II factory',
      'Telescope III factory',
    ],
  };
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript((state) => {
    if (localStorage.getItem('factory-upgrades-seeded')) return;
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-31T12:00:00Z', state }),
    );
    localStorage.setItem('factory-upgrades-seeded', 'yes');
  }, state);
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Factories', exact: true }).click();
  await page
    .getByRole('button', { name: 'Empty site 2 on Tellus', exact: true })
    .click();
  await expect(
    page.locator('.factory-option-title', { hasText: 'Telescope III factory' }),
  ).toHaveCount(1);
  await expect(
    page.locator('.factory-option-title', { hasText: /^Telescope I factory$/ }),
  ).toHaveCount(0);
  await expect(
    page.locator('.factory-option-title', {
      hasText: /^Telescope II factory$/,
    }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  const site = page.getByRole('button', {
    name: /^Telescope I factory on Tellus/,
  });
  await expect(site).toContainText('Upgrade to');
  await site.click();
  await page
    .getByRole('button', {
      name: 'Upgrade to Telescope III factory',
      exact: true,
    })
    .click();
  await page.reload();
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Factories', exact: true }).click();
  await page
    .getByRole('button', { name: /^Telescope I factory on Tellus/ })
    .click();
  await expect(
    page.getByRole('button', { name: 'Cancel upgrade', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Cancel upgrade', exact: true })
    .click();
  await page
    .getByRole('button', { name: /^Telescope I factory on Tellus/ })
    .click();
  await page
    .getByRole('button', {
      name: 'Upgrade to Telescope III factory',
      exact: true,
    })
    .click();
  for (let round = 0; round < 3; round++) await endTurn(page);
  const completed = await page.evaluate(
    () =>
      (
        JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as {
          state: {
            colonies: [
              string,
              {
                buildings: { id: string; type: string; slotIndex: number }[];
                projects: unknown[];
                stock: { Iron: number; Water: number; Oil: number };
              },
            ][];
          };
        }
      ).state,
  );
  expect(completed.colonies[0]![1].buildings).toEqual([
    {
      id: 'old-telescope',
      type: 'Telescope III factory',
      slotIndex: 0,
      demolition: false,
    },
  ]);
  expect(completed.colonies[0]![1].projects).toEqual([]);
  expect(completed.colonies[0]![1].stock).toMatchObject({
    Iron: 76,
    Water: 88,
    Oil: 94,
  });
  await page.getByRole('button', { name: 'Factories', exact: true }).click();
  await expect(
    page.getByRole('button', { name: /^Telescope III factory on Tellus/ }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('factory-upgrade-mobile.png'),
  });
  expect(errors).toEqual([]);
});

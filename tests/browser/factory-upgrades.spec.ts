import { expect, test } from '@playwright/test';
import { Game } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import { startFirstSlot, endTurn } from './save-helpers.js';

test('senaste-teknik-i-byggval / uppgradera-obsoleta-fabriker: upgrade an occupied site, reload and finish in place', async ({
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
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  await page
    .getByRole('button', { name: 'Building sites', exact: true })
    .click();
  const site = page.getByRole('article', {
    name: 'Building site 1',
    exact: true,
  });
  await expect(
    site.getByRole('button', {
      name: 'Upgrade to Telescope III factory',
      exact: true,
    }),
  ).toBeEnabled();
  await site
    .getByRole('button', {
      name: 'Upgrade to Telescope III factory',
      exact: true,
    })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath('factory-upgrade-mobile.png'),
  });
  // The build catalog must hide predecessors even though the existing factory still operates.
  await page
    .getByRole('article', { name: 'Building site 2', exact: true })
    .getByRole('button', { name: 'Build building at site 2', exact: true })
    .click();
  await expect(
    page.getByRole('button', {
      name: 'Show Telescope III factory',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Show Telescope I factory', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', {
      name: 'Show Telescope II factory',
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Back to Building sites', exact: true })
    .click();
  await site
    .getByRole('button', {
      name: 'Upgrade to Telescope III factory',
      exact: true,
    })
    .click();
  await expect(site).toContainText('Upgrade queued: Telescope III factory');
  await expect(
    site.getByRole('button', { name: 'Demolish', exact: true }),
  ).toBeDisabled();
  await page.reload();
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  await page
    .getByRole('button', { name: 'Building sites', exact: true })
    .click();
  await expect(site).toContainText('Upgrade queued: Telescope III factory');
  await site
    .getByRole('button', { name: 'Cancel upgrade', exact: true })
    .click();
  await site
    .getByRole('button', {
      name: 'Upgrade to Telescope III factory',
      exact: true,
    })
    .click();
  await endTurn(page);
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
  await page.getByRole('button', { name: 'Star map', exact: true }).click();
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Planet pages' })
    .getByRole('button', { name: 'Production', exact: true })
    .click();
  await page.getByRole('button', { name: 'Components', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Show Telescope III', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Show Telescope I', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Show Telescope II', exact: true }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});

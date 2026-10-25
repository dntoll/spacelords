import { selectMapFleet } from './fleet-helpers.js';
import { expect, test } from '@playwright/test';
import { Game } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import { emptyStock } from '../../src/client/models/Economy.js';
import { chooseResearch, endTurn, startFirstSlot } from './save-helpers.js';

test('motorbehov-for-alla-skepp / ion-pulse-engine / automatisk-motormontering: research, manufacture, fit and retain mixed engines on mobile', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  const state = new Game(createExampleGalaxy()).exportState();
  const colony = state.colonies[0]![1];
  colony.population = 30000;
  colony.stock = {
    ...emptyStock(),
    Iron: 1000,
    Water: 1000,
    Oil: 1000,
    'Rocket engine': 2,
  };
  colony.buildings = (
    [
      'Research station',
      'Colony ship factory',
      'Rocket engine factory',
    ] as const
  ).map((type, slotIndex) => ({
    id: `building-${slotIndex}`,
    type,
    slotIndex,
    demolition: false,
  }));
  const initial = {
    ...state,
    researched: [
      'Rocket engine factory',
      'Exploration ship factory',
      'Colony ship factory',
    ],
  };
  await page.addInitScript((saved) => {
    if (localStorage.getItem('spacelords.save.v2.1')) return;
    localStorage.setItem('spacelords.terraforming-v5-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-24T10:00:00Z', state: saved }),
    );
  }, initial);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  await chooseResearch(page, 'Ion pulse engine factory');
  await expect(page.locator('.research-queue article')).toHaveCount(1);
  await endTurn(page);
  await page.getByRole('button', { name: 'Star map', exact: true }).click();
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  await page
    .getByRole('button', { name: 'Building sites', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Build building at site 4', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Show Ion pulse engine factory', exact: true })
    .click();
  await page
    .getByRole('button', {
      name: 'Build Ion pulse engine factory',
      exact: true,
    })
    .click();
  await endTurn(page);
  await page.getByRole('button', { name: 'Star map', exact: true }).click();
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Planet pages' })
    .getByRole('button', { name: 'Production', exact: true })
    .click();
  await page.getByRole('button', { name: 'Components', exact: true }).click();
  await page
    .getByRole('button', { name: 'Show Ion pulse engine', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Queue Ion pulse engine', exact: true })
    .click();
  await endTurn(page);
  await page.getByRole('button', { name: 'Star map', exact: true }).click();
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Planet pages' })
    .getByRole('button', { name: 'Production', exact: true })
    .click();
  await page.getByRole('button', { name: 'Ships', exact: true }).click();
  await page
    .getByRole('button', { name: 'Show Colony ship', exact: true })
    .click();
  await expect(page.locator('.planet-production')).toContainText('3 engines');
  await page
    .getByRole('button', { name: 'Queue Colony ship', exact: true })
    .click();
  await page.screenshot({
    path: testInfo.outputPath('mixed-engine-production.png'),
  });
  await endTurn(page);
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  await selectMapFleet(page, 'Home Fleet');
  const card = page.locator('.fleet-card').filter({
    has: page.getByRole('button', {
      name: 'Colony ship 1 in Home Fleet',
      exact: true,
    }),
  });
  await expect(card.locator('.ship-engine-details')).toHaveCount(0);
  await expect(card.locator('.fleet-speed')).toHaveText('S: 3 hex');
  await card
    .getByRole('button', { name: 'Colony ship 1 in Home Fleet', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Move ship to new fleet', exact: true })
    .click();
  await page.reload();
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  await selectMapFleet(page, 'Fleet 1');
  const moved = page
    .locator('.fleet-card')
    .filter({ has: page.locator('[data-ship="Colony ship"]') });
  await expect(moved.locator('.fleet-speed')).toHaveText('S: 3 hex');
  const installed = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as {
      state: {
        fleets: {
          name: string;
          shipUnits: { type: string; engines: Record<string, number> }[];
        }[];
      };
    };
    return saved.state.fleets
      .find((fleet) => fleet.name === 'Fleet 1')!
      .shipUnits.find((unit) => unit.type === 'Colony ship')!.engines;
  });
  expect(installed).toEqual({ 'Rocket engine': 2, 'Ion pulse engine': 1 });
  await page.screenshot({
    path: testInfo.outputPath('mixed-engine-fleet.png'),
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

import { expect, test } from '@playwright/test';
import { Game } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import { startFirstSlot } from './save-helpers.js';

function seededGame() {
  const state = new Game(createExampleGalaxy()).exportState();
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
  for (let i = 0; i < 24; i++)
    game.scheduleComponent(game.galaxy.homePlanet, 'Rocket engine');
  game.scheduleShip(game.galaxy.homePlanet, 'Fighter');
  return game.exportState();
}

test('planetundersidor / planetgemensamt-produktval / kompakt-produktionsko / projektens-forsorjningssteg: long queue and product orders stay usable', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript((state) => {
    if (localStorage.getItem('planet-pages-seeded')) return;
    localStorage.setItem('spacelords.terraforming-v5-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-24T10:00:00Z', state }),
    );
    localStorage.setItem('planet-pages-seeded', 'yes');
  }, seededGame());
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  await expect(page.locator('[aria-current="page"]')).toHaveText('Overview');
  await expect(page.locator('.planet-building-inventory')).toContainText(
    'Fighter factory ×2',
  );
  await page
    .getByRole('button', { name: 'Building sites', exact: true })
    .click();
  const sites = page.locator('.building-sites-grid');
  await expect(sites.locator('.building-site')).toHaveCount(10);
  await expect(sites.getByRole('button', { name: /^Queue / })).toHaveCount(0);
  await page.getByRole('button', { name: 'Production', exact: true }).click();
  await expect(
    page
      .getByRole('combobox', { name: 'Production product', exact: true })
      .locator('option'),
  ).toHaveText(['Fighter']);
  await expect(page.locator('.compact-queue-item').first()).toContainText(
    'Rocket engine ×24',
  );
  await page
    .getByRole('combobox', { name: 'Production category' })
    .selectOption('Components');
  await page
    .getByRole('combobox', { name: 'Production product', exact: true })
    .selectOption('Rocket engine');
  await page
    .getByRole('button', { name: 'Queue Rocket engine', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Queue Rocket engine', exact: true })
    .click();
  await expect(
    page.getByRole('combobox', { name: 'Production product', exact: true }),
  ).toHaveValue('Rocket engine');
  const lastGroup = page.locator('.compact-queue-item').last();
  await expect(lastGroup).toContainText('Rocket engine ×2');
  await lastGroup.click();
  await expect(page.locator('[aria-current="page"]')).toHaveText('Build queue');
  const rows = page.locator('.queue-order');
  await expect(rows).toHaveCount(28);
  await expect(rows.nth(26)).toBeFocused();
  const fighter = rows.filter({
    has: page.locator('.queue-details > p', { hasText: 'Fighter' }),
  });
  await fighter.locator('.project-supply > summary').click();
  await expect(fighter.locator('.project-supply')).toContainText(
    'Produce 1 Rocket engine at Tellus',
  );
  await expect(fighter.locator('.project-supply')).toContainText(
    'Produce 1 Weapons module at Tellus',
  );
  await expect(fighter.locator('.project-supply')).toContainText('Require');
  await fighter.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath('planet-project-supply.png'),
  });
  await fighter
    .getByRole('button', { name: 'View production', exact: true })
    .first()
    .click();
  await expect(rows.first()).toBeFocused();
  await expect(rows.first().locator('.project-supply')).toHaveAttribute(
    'open',
    '',
  );
  await page.getByRole('button', { name: 'Production', exact: true }).click();
  await expect(
    page.getByRole('combobox', { name: 'Production product', exact: true }),
  ).toHaveValue('Rocket engine');
  await page.screenshot({ path: testInfo.outputPath('planet-production.png') });
  expect(
    await page.evaluate(() => ({
      horizontal: document.documentElement.scrollWidth > innerWidth,
      vertical: document.documentElement.scrollHeight > innerHeight,
    })),
  ).toEqual({ horizontal: false, vertical: false });
  await page.reload();
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  await page.getByRole('button', { name: 'Build queue', exact: true }).click();
  await expect(rows).toHaveCount(28);
  await rows
    .last()
    .getByRole('button', { name: /^Cancel:/ })
    .click();
  await expect(rows).toHaveCount(27);
  expect(errors).toEqual([]);
});

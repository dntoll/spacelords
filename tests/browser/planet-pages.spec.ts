import { expect, test } from '@playwright/test';
import { Game } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
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
    page.getByRole('list', { name: 'Product list' }).getByRole('button'),
  ).toHaveText(['Fighter']);
  await expect(page.locator('.compact-queue-item').first()).toContainText(
    'Rocket engine ×24',
  );
  await page
    .getByRole('group', { name: 'Production categories' })
    .getByRole('button', { name: 'Components', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Show Rocket engine', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Queue Rocket engine', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Show Rocket engine', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Queue Rocket engine', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Show Rocket engine', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
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
    page.getByRole('button', { name: 'Show Rocket engine', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
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

test('byggkategorier / symbolbaserade-kataloger: icon categories and compact lists reveal complete details with keyboard focus', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript((state) => {
    localStorage.setItem('spacelords.terraforming-v5-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-24T10:00:00Z', state }),
    );
  }, seededGame());
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  await page
    .getByRole('button', { name: 'Building sites', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Build building at site 5', exact: true })
    .click();
  const categories = page.getByRole('group', { name: 'Building categories' });
  await expect(page.locator('.catalog-details')).toHaveCount(0);
  for (const category of await categories.getByRole('button').all()) {
    await expect(category).toHaveText('');
    await expect(category.locator('svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    const bounds = (await category.boundingBox())!;
    expect(bounds.width).toBeGreaterThanOrEqual(44);
    expect(bounds.height).toBeGreaterThanOrEqual(44);
  }
  const researchCategory = categories.getByRole('button', {
    name: 'Research',
    exact: true,
  });
  await researchCategory.focus();
  await researchCategory.press('Enter');
  await expect(researchCategory).toBeFocused();
  await categories
    .getByRole('button', { name: 'Shipyards', exact: true })
    .click();
  await expect(page.locator('.catalog-item-button')).toHaveText([
    'Exploration ship factory',
    'Fighter factory',
  ]);
  await page.screenshot({
    path: testInfo.outputPath('building-catalog-list.png'),
  });
  const fighter = page.getByRole('button', {
    name: 'Show Fighter factory',
    exact: true,
  });
  await fighter.focus();
  await fighter.press('Enter');
  await expect(page.locator('.catalog-details h2')).toBeFocused();
  await expect(
    page.getByRole('navigation', { name: 'Main navigation' }),
  ).toBeInViewport({ ratio: 1 });
  await expect(page.locator('.catalog-details')).toContainText(
    'Shipyard: builds Fighters for your fleets.',
  );
  await expect(page.locator('.catalog-details')).toContainText('800 workers');
  await expect(page.locator('.building-inventory dd')).toHaveText(['2', '2']);
  await page.screenshot({
    path: testInfo.outputPath('building-catalog-details.png'),
  });
  await page
    .getByRole('button', { name: 'Back to buildings', exact: true })
    .click();
  await expect(fighter).toBeFocused();
  await categories
    .getByRole('button', { name: 'Components', exact: true })
    .click();
  await expect(page.locator('.catalog-item-button')).toHaveText([
    'Rocket engine factory',
    'Weapons module factory',
  ]);
  await expect(page.locator('.catalog-item svg')).toHaveCount(2);
  await page
    .getByRole('searchbox', { name: 'Search buildings' })
    .fill('weapons');
  await expect(page.locator('.catalog-item-button')).toHaveText([
    'Weapons module factory',
  ]);
  await page.getByRole('searchbox', { name: 'Search buildings' }).fill('');
  await page
    .getByRole('button', { name: 'Show Rocket engine factory', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Build Rocket engine factory', exact: true })
    .click();
  await expect(page.locator('[data-site-index="4"]')).toBeFocused();
  await expect(page.locator('[data-site-index="4"]')).toContainText(
    'Rocket engine factory',
  );
  await page.getByRole('button', { name: 'Production', exact: true }).click();
  const saved = await page.evaluate(() =>
    localStorage.getItem('spacelords.save.v2.1'),
  );
  await page
    .getByRole('group', { name: 'Production categories' })
    .getByRole('button', { name: 'Components', exact: true })
    .click();
  await expect(page.locator('.catalog-details')).toHaveCount(0);
  const product = page.getByRole('button', {
    name: 'Show Weapons module',
    exact: true,
  });
  await product.focus();
  await product.press('Enter');
  await expect(page.locator('.catalog-details h2')).toBeFocused();
  await expect(
    page.getByRole('navigation', { name: 'Main navigation' }),
  ).toBeInViewport({ ratio: 1 });
  await expect(page.locator('.production-details')).toContainText(
    'Iron 2, Water 1, Oil 1',
  );
  await expect(page.locator('.production-details')).toContainText(
    'Factory staff:',
  );
  await expect(page.locator('.production-details')).toContainText('Stored');
  await expect(page.locator('.compact-build-queue')).toHaveCount(1);
  await expect(page.getByRole('combobox')).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath('production-catalog-details.png'),
  });
  await page
    .getByRole('button', { name: 'Back to products', exact: true })
    .click();
  await expect(product).toBeFocused();
  await page.screenshot({
    path: testInfo.outputPath('production-catalog-list.png'),
  });
  expect(
    await page.evaluate(() => localStorage.getItem('spacelords.save.v2.1')),
  ).toBe(saved);
  expect(
    await page.evaluate(() => ({
      horizontal: document.documentElement.scrollWidth > innerWidth,
      vertical: document.documentElement.scrollHeight > innerHeight,
    })),
  ).toEqual({ horizontal: false, vertical: false });
  expect(errors).toEqual([]);
});

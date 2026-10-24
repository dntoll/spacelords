import { expect, test } from '@playwright/test';
import { tradeNetworkState } from '../fixtures/trade-network.js';
import { startFirstSlot } from './save-helpers.js';

test('flottadministration / skeppsbilder / viewport-game-layout: long fleet lists stay bounded and the selected fleet is reachable', async ({
  page,
}) => {
  const initial = tradeNetworkState(false);
  const original = initial.fleets[0]!;
  const state = {
    ...initial,
    fleets: [
      { ...original, ships: { ...original.ships, Fighter: 500 } },
      ...Array.from({ length: 24 }, (_, index) => ({
        ...original,
        id: `patrol-${index + 1}`,
        name: `Patrol ${index + 1}`,
        ships: {
          Fighter: 1,
          'Colony ship': 0,
          'Exploration ship': 0,
          'Transport ship': 0,
        },
      })),
    ],
  };
  await page.addInitScript((saved) => {
    localStorage.setItem('spacelords.economy-v2-reset', 'done');
    localStorage.setItem('spacelords.terraforming-v5-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-21T10:00:00Z', state: saved }),
    );
  }, state);
  await page.goto('./');
  await startFirstSlot(page);
  const panel = page.locator('.selection-panel');
  await expect(panel.locator('.fleet-card')).toHaveCount(25);
  const home = panel.getByRole('article', {
    name: 'Fleet Home Fleet',
    exact: true,
  });
  expect(await home.locator('.ship-token').count()).toBeLessThan(16);
  await expect(home).toContainText('+488 Fighter');
  await panel
    .getByRole('button', { name: 'Rename Patrol 24', exact: true })
    .click();
  const name = page.getByRole('textbox', { name: 'Fleet name', exact: true });
  await name.fill('Sentinel');
  await name.press('Enter');
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  expect(
    await page
      .getByRole('article', { name: 'Fleet Home Fleet', exact: true })
      .locator('.ship-token')
      .count(),
  ).toBeLessThan(5);
  await page
    .getByRole('button', { name: 'Show on map: Sentinel', exact: true })
    .click();
  await expect(panel.locator('.selected-fleet-card')).toContainText('Sentinel');
  await expect(
    panel.locator('.selected-fleet-card .fleet-name-button'),
  ).toBeInViewport();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth > innerWidth ||
        document.documentElement.scrollHeight > innerHeight,
    ),
  ).toBe(false);
  expect(
    await panel.evaluate((node) => node.scrollHeight > node.clientHeight),
  ).toBe(true);
});

test('kompakta-flottkort: four ships fit in one row and fleet actions remain touch accessible', async ({
  page,
}) => {
  const initial = tradeNetworkState(false);
  const original = initial.fleets[0]!;
  const state = {
    ...initial,
    fleets: Array.from({ length: 3 }, (_, index) => ({
      ...original,
      id: `compact-${index}`,
      name: `Compact ${index}`,
      ships: {
        Fighter: 3,
        'Transport ship': 1,
        'Colony ship': 0,
        'Exploration ship': 0,
      },
    })),
  };
  await page.addInitScript((saved) => {
    localStorage.setItem('spacelords.economy-v2-reset', 'done');
    localStorage.setItem('spacelords.terraforming-v5-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-23T10:00:00Z', state: saved }),
    );
  }, state);
  await page.goto('./');
  await startFirstSlot(page);
  const card = page.locator('.map-fleet-cards .fleet-card').first();
  await expect(card).toBeVisible();
  const layout = await card.evaluate((node) => ({
    height: node.getBoundingClientRect().height,
    width: node.getBoundingClientRect().width,
    shipRows: [...node.querySelectorAll('.ship-token')].map(
      (token) => token.getBoundingClientRect().top,
    ),
    targets: [...node.querySelectorAll('button, summary')].map(
      (target) => target.getBoundingClientRect().height,
    ),
  }));
  expect(layout.height).toBeLessThanOrEqual(280);
  if (layout.width >= 276) expect(new Set(layout.shipRows).size).toBe(1);
  else expect(new Set(layout.shipRows).size).toBeLessThanOrEqual(2);
  expect(layout.targets.every((height) => height >= 44)).toBe(true);
  await card.locator('.fleet-orders > summary').click();
  await expect(
    card.getByRole('button', {
      name: 'Choose destination for Compact 0',
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/compact-fleets-${test.info().project.name}.png`,
  });
});

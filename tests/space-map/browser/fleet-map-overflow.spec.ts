import { selectMapFleet } from './fleet-helpers.js';
import { expect, test } from '@playwright/test';
import { tradeNetworkState } from '../../fixtures/trade-network.js';
import { startFirstSlot } from './save-helpers.js';

test('skeppsbilder / viewport-game-layout / enda-spelarflottan: a large fleet stays bounded and can be renamed', async ({
  page,
}) => {
  const initial = tradeNetworkState();
  const original = initial.fleets[0]!;
  const state = {
    ...initial,
    fleets: [{ ...original, ships: { ...original.ships, Fighter: 500 } }],
  };
  await page.addInitScript((saved) => {
    localStorage.setItem('spacelords.economy-v2-reset', 'done');
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-21T10:00:00Z', state: saved }),
    );
  }, state);
  await page.goto('./');
  await startFirstSlot(page);
  const panel = page.locator('.selection-panel');
  await expect(panel.locator('.fleet-card')).toHaveCount(1);
  const home = panel.getByRole('article', {
    name: 'Fleet Home Fleet',
    exact: true,
  });
  expect(await home.locator('.ship-token').count()).toBeLessThan(16);
  await expect(home).toContainText('+488 Fighter');
  await panel
    .getByRole('button', { name: 'Home Fleet', exact: true })
    .dblclick();
  const name = page.getByRole('textbox', { name: 'Fleet name', exact: true });
  await name.fill('Sentinel');
  await name.press('Enter');
  await selectMapFleet(page, 'Sentinel');
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
});

test('kompakt-flottkort-med-order: fleet stats share the hangar and compact controls remain accessible', async ({
  page,
}) => {
  const initial = tradeNetworkState();
  const original = initial.fleets[0]!;
  const state = {
    ...initial,
    fleets: Array.from({ length: 1 }, (_, index) => ({
      ...original,
      id: `compact-${index}`,
      name: `Compact ${index}`,
      ships: {
        Fighter: 3,
        'Transport ship': 1,
        'Civilian shuttle': 0,
        'Space pirate': 0,
        'Salvage ship': 0,
        Raptor: 0,
        'Colony ship': 0,
        'Exploration ship': 0,
      },
    })),
  };
  await page.addInitScript((saved) => {
    localStorage.setItem('spacelords.economy-v2-reset', 'done');
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
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
    nameWidth: node.querySelector('.fleet-name-button')!.getBoundingClientRect()
      .width,
    shipRows: [...node.querySelectorAll('.ship-token')].map(
      (token) => token.getBoundingClientRect().top,
    ),
    targets: [...node.querySelectorAll('button, summary')]
      .filter((target) => target.getClientRects().length > 0)
      .map((target) => {
        const { width, height } = target.getBoundingClientRect();
        return { width, height };
      }),
  }));
  expect(new Set(layout.shipRows).size).toBeLessThanOrEqual(2);
  expect(layout.nameWidth).toBeGreaterThanOrEqual(88);
  await expect(card.locator('.fleet-hangar .fleet-stats')).toBeVisible();
  await expect(
    card.getByRole('button', {
      name: 'Choose destination for Compact 0',
      exact: true,
    }),
  ).toHaveCount(0);
  expect(
    layout.targets.every(({ width, height }) => width > 0 && height > 0),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/compact-fleets-${test.info().project.name}.png`,
  });
});

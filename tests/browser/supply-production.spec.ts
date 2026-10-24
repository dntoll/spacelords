import { expect, test } from '@playwright/test';
import { tradeNetworkState } from '../fixtures/trade-network.js';
import { startFirstSlot } from './save-helpers.js';
import type { GameState } from '../../src/client/models/Game.js';

test.beforeEach(async ({ page }) => {
  await page.addInitScript((state) => {
    if (localStorage.getItem('supply-seeded')) return;
    localStorage.setItem('spacelords.economy-v2-reset', 'done');
    localStorage.setItem('spacelords.terraforming-v5-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-21T10:00:00Z', state }),
    );
    localStorage.setItem('supply-seeded', 'yes');
  }, tradeNetworkState());
  await page.goto('./');
  await startFirstSlot(page);
  await page
    .getByRole('button', { name: 'Supply & production', exact: true })
    .click();
});

test('forsorjningsoversikt / relevanta-material / produktionsformaga / materialoversikt: inspect shortages and capabilities with keyboard and touch-sized controls', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('supply-overview.png') });
  await expect(page.locator('.supply-planet').first()).toHaveAttribute(
    'data-planet-id',
    'sol-1',
  );
  const vesta = page.getByRole('button', {
    name: 'Supply details for Vesta',
    exact: true,
  });
  await vesta.focus();
  await vesta.press('Enter');
  await expect(vesta).toBeFocused();
  await expect(
    page.locator('[data-planet-id="sol-1"] [data-material="Iron"]'),
  ).toContainText('Unprovided5');
  await expect(
    page.locator('[data-planet-id="sol-1"] [data-material="Rocket engine"]'),
  ).toHaveCount(0);
  const search = page.getByRole('searchbox', { name: 'Find a material' });
  await search.fill('Weapons');
  await page
    .getByRole('button', { name: 'Weapons module', exact: true })
    .click();
  await expect(
    page.getByText('No relevant planets', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'All planets', exact: true }).click();
  await search.fill('Rock');
  await search.press('e');
  await search.press('t');
  await expect(search).toHaveValue('Rocket');
  await expect(search).toBeFocused();
  await page
    .getByRole('button', { name: 'Rocket engine', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Rocket engine', exact: true }),
  ).toBeFocused();
  await expect(page.locator('.supply-planet')).toHaveCount(1);
  await expect(page.locator('.supply-capabilities')).toContainText(
    'Can produce · 0 queued',
  );
  await page.getByRole('button', { name: 'Open Tellus', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Tellus', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Supply & production', exact: true })
    .click();
  await expect(page.locator('.supply-material-heading')).toContainText(
    'Rocket engine',
  );
  await page.getByRole('button', { name: 'All planets', exact: true }).click();
  await page
    .getByRole('button', { name: 'Supply details for Tellus', exact: true })
    .click();
  await page
    .locator('[data-planet-id="sol-0"]')
    .getByRole('button', { name: 'Show inventory', exact: true })
    .click();
  await expect(
    page.locator('[data-planet-id="sol-0"] [data-material="Rocket engine"]'),
  ).toContainText('Available here3');
  await page.locator('.supply-content').evaluate((node) => {
    node.scrollTop = 0;
  });
  await page.screenshot({ path: testInfo.outputPath('supply-production.png') });
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= innerWidth &&
        document.documentElement.scrollHeight <= innerHeight,
    ),
  ).toBe(true);
  const controls = await page
    .locator('.supply-page button:visible, .supply-page input')
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect().height),
    );
  expect(controls.every((height) => height >= 44)).toBe(true);
  await page
    .getByRole('button', { name: 'Open route Tellus to Vesta', exact: true })
    .first()
    .click();
  await expect(
    page.getByRole('complementary', { name: 'Selected route', exact: true }),
  ).toContainText('Tellus ↔ Vesta');
  expect(errors).toEqual([]);
});

test('leveransfloden / forsorjningsstatus: shows physical cargo, project purpose, route navigation and preserved saves', async ({
  page,
}) => {
  const original = tradeNetworkState();
  original.fleets.find((f) => f.id === 'freighters')!.routeId = 'route-test';
  const shipments: GameState['shipments'] = [
    {
      id: 'delivery',
      resource: 'Iron',
      amount: 5,
      path: ['sol-0', 'sol-1'],
      stage: 0,
      recipient: 'sol-1',
      projectId: 'vesta-mine',
      fleetId: 'freighters',
      committed: true,
    },
  ];
  const state = { ...original, shipments };
  await page.evaluate(
    (state) =>
      localStorage.setItem(
        'spacelords.save.v2.1',
        JSON.stringify({ lastPlayed: '2026-10-21T10:00:00Z', state }),
      ),
    state,
  );
  await page.reload();
  await startFirstSlot(page);
  await page
    .getByRole('button', { name: 'Supply & production', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Supply details for Vesta', exact: true })
    .click();
  const planet = page.locator('[data-planet-id="sol-1"]');
  await expect(planet.locator('.supply-status')).toHaveText('Waiting');
  await expect(planet.locator('.supply-delivery')).toContainText(
    '5 Iron · Tellus → Vesta',
  );
  await expect(planet.locator('.supply-delivery')).toContainText('In transit');
  await expect(planet.locator('.supply-delivery')).toContainText(
    'For Iron mine',
  );
  await planet.getByRole('button', { name: 'View fleet', exact: true }).click();
  await expect(
    page.getByRole('article', { name: 'Fleet Freighters', exact: true }),
  ).toContainText('Trade route: Tellus ↔ Vesta');
  await page.reload();
  await startFirstSlot(page);
  await page
    .getByRole('button', { name: 'Supply & production', exact: true })
    .click();
  await expect(
    page.locator('[data-planet-id="sol-1"] .supply-status'),
  ).toHaveText('Waiting');
});

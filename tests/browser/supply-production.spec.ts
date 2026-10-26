import { expect, test } from '@playwright/test';
import { tradeNetworkState } from '../fixtures/trade-network.js';
import { startFirstSlot, assignFleetToRoute } from './save-helpers.js';
import { selectMapObject } from './map-helpers.js';

test('forsorjningsproblem-pa-kartan / forsorjningsstatus / leveransfloden: resolves a problem to Waiting and shows only ordered supply on the production map', async ({
  page,
}) => {
  await page.addInitScript((state) => {
    if (localStorage.getItem('route-map-seeded')) return;
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-24T00:00:00Z', state }),
    );
    localStorage.setItem('route-map-seeded', 'yes');
  }, tradeNetworkState());
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Route', exact: true }).click();
  await selectMapObject(page, 'Vesta');
  await expect(page.locator('.route-supply-summary')).toContainText(
    'Needs attention',
  );
  await page.getByRole('button', { name: 'Decisions', exact: true }).click();
  await page
    .locator('[data-decision-id="supply-sol-1"]')
    .getByRole('button', { name: 'Mute', exact: true })
    .click();
  await page.getByRole('button', { name: 'Route', exact: true }).click();
  await selectMapObject(page, 'Tellus');
  await assignFleetToRoute(page, 'Freighters', 'Tellus', 'Vesta');
  await page.getByRole('button', { name: 'Route', exact: true }).click();
  await selectMapObject(page, 'Vesta');
  await expect(page.locator('.route-supply-summary')).toContainText('Waiting');
  await expect(
    page.locator('[data-screen="route"] .nav-attention'),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Open in Production' }).click();
  await expect(
    page.getByRole('region', { name: 'Selected project supply chain' }),
  ).toContainText('Awaiting pickup');
  await expect(
    page.getByRole('region', { name: 'Selected project supply chain' }),
  ).toContainText('Tellus');
  await page.reload();
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Route', exact: true }).click();
  await selectMapObject(page, 'Vesta');
  await expect(page.locator('.route-supply-summary')).toContainText('Waiting');
});

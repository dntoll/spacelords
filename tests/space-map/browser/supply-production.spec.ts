import { expect, test } from '@playwright/test';
import { tradeNetworkState } from '../../fixtures/trade-network.js';
import { startFirstSlot } from './save-helpers.js';

test('produktionsnatverk / fraktskepp-ger-forbindelse: connects two groups and keeps the link after reload', async ({
  page,
}) => {
  await page.addInitScript((state) => {
    if (localStorage.getItem('network-seeded')) return;
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-24T00:00:00Z', state }),
    );
    localStorage.setItem('network-seeded', 'yes');
  }, tradeNetworkState(false));
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Factories', exact: true }).click();
  await page
    .getByRole('button', { name: 'Connect Tellus', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Connect Vesta', exact: true })
    .click();
  await expect(page.locator('.factory-group')).toContainText('Tellus, Vesta');
  await expect(page.locator('.factory-group')).toContainText('1 link');
  await page.reload();
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Factories', exact: true }).click();
  await expect(page.locator('.factory-group')).toContainText('Tellus, Vesta');
  await expect(page.locator('.factory-group')).toContainText('1 link');
});

import { expect, test } from '@playwright/test';
import { TECHNOLOGIES } from '../../../src/client/space-map/models/Game.js';
import { tradeNetworkState } from '../../fixtures/trade-network.js';
import { startFirstSlot } from './save-helpers.js';

test('rekommenderade-fabriker / fabriksstatus-i-byggval: Factories shows missing inputs and allows construction', async ({
  page,
}, testInfo) => {
  const state = { ...tradeNetworkState(), researched: TECHNOLOGIES };
  state.colonies[1]![1].projects = [];
  state.colonies[1]![1].buildings = [
    { id: 'water', type: 'Water extractor', slotIndex: 0, demolition: false },
  ];
  await page.addInitScript((saved) => {
    if (localStorage.getItem('production-priorities-seeded')) return;
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-24T00:00:00Z', state: saved }),
    );
    localStorage.setItem('production-priorities-seeded', 'yes');
  }, state);
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Factories', exact: true }).click();
  await page
    .getByRole('button', { name: 'Empty site 3 on Tellus', exact: true })
    .click();
  const fighter = page
    .locator('.factory-option')
    .filter({
      has: page.locator('.factory-option-title', {
        hasText: /^Fighter factory$/,
      }),
    });
  await expect(fighter).toContainText('Weapons module');
  await expect(
    fighter.getByRole('button', { name: /^(Build|Queue) Fighter factory$/ }),
  ).toBeEnabled();
  await page.screenshot({
    path: testInfo.outputPath('factory-dependencies.png'),
  });
});

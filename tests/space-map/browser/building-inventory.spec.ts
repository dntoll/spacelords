import { expect, test } from '@playwright/test';
import { startFirstSlot, endTurn } from './save-helpers.js';

test('planetsida-informerar / byggtid-per-byggnad: overview counts completed buildings after construction in Factories', async ({
  page,
}) => {
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Factories', exact: true }).click();
  await page
    .getByRole('button', { name: 'Empty site 1 on Tellus', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Build Research station', exact: true })
    .click();
  await page.getByRole('button', { name: 'Star map', exact: true }).click();
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  await expect(page.locator('.planet-building-inventory')).not.toContainText(
    'Research station',
  );
  for (let round = 0; round < 3; round++) await endTurn(page);
  await expect(page.locator('.planet-building-inventory')).toContainText(
    'Research station',
  );
});

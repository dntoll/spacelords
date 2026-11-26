import { expect, test } from '@playwright/test';
import { startFirstSlot } from './save-helpers.js';

test('crew-med-utrustning-och-skeppsbyte: move a person and keep the new ship after reload', async ({
  page,
}) => {
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Crew', exact: true }).click();
  const select = page.getByLabel('Avery ship');
  await expect(page.locator('.crew-person')).toHaveCount(12);
  await select.selectOption({ label: 'Fighter' });
  await expect(page.getByLabel('Avery ship')).toHaveValue(/Fighter/);
  await page.reload();
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Crew', exact: true }).click();
  await expect(
    page.getByLabel('Avery ship').locator('option:checked'),
  ).toHaveText('Fighter');
  await page.getByRole('button', { name: 'Fleet', exact: true }).click();
  await expect(
    page.locator('.fleet-ship').filter({
      has: page.getByRole('heading', { name: 'Fighter', exact: true }),
    }),
  ).toContainText('Avery');
});

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

test('fleet-besattningsrutor: crew has portrait slots like Storage on a phone', async ({
  page,
}) => {
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Fleet', exact: true }).click();
  const raptor = page.locator('.fleet-ship').filter({
    has: page.getByRole('heading', { name: 'Raptor', exact: true }),
  });
  const crew = raptor.getByRole('group', { name: 'Crew' });
  const slots = crew.locator('.fleet-crew-slot');
  await expect(slots).toHaveCount(7);
  const pilot = crew.getByRole('button', { name: 'Raptor Pilot: Avery' });
  const portrait = pilot.locator('.crew-slot-portrait');
  await expect(portrait).toBeVisible();
  await expect(portrait).toHaveCSS('background-size', '400% 300%');
  await expect(portrait).toHaveCSS('background-position', '0% 0%');
  await expect(
    crew
      .getByRole('button', { name: 'Raptor Engineer: Morgan' })
      .locator('.crew-slot-portrait'),
  ).toHaveCSS('background-position', '33.3333% 0%');
  const bounds = await pilot.boundingBox();
  expect(bounds).not.toBeNull();
  expect(Math.abs(bounds!.width - bounds!.height)).toBeLessThan(1);
  await pilot.click();
  const details = page.getByLabel('Selected slot details');
  await expect(details.getByRole('heading', { name: 'Avery' })).toBeVisible();
  await expect(details.getByLabel('Avery ship')).toBeVisible();
});

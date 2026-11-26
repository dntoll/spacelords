import { expect, test } from '@playwright/test';
import { startFirstSlot } from './save-helpers.js';

test('dragbar-besattning: drag between crew roles and swap their occupants', async ({
  page,
}) => {
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Fleet', exact: true }).click();
  const pilot = page.getByRole('button', { name: 'Raptor Pilot: Avery' });
  const engineer = page.getByRole('button', {
    name: 'Raptor Engineer: Morgan',
  });
  await pilot.scrollIntoViewIfNeeded();
  await pilot.dragTo(engineer);
  await expect(
    page.getByRole('button', { name: 'Raptor Pilot: Morgan' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Raptor Engineer: Avery' }),
  ).toBeVisible();
});

test('dragbar-personlig-utrustning / besattningsstaplar: select matching equipment slots and show stats', async ({
  page,
}) => {
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Crew', exact: true }).click();
  const source = page.getByRole('button', {
    name: 'Jordan gadget: frag-grenade',
  });
  const target = page.getByRole('button', { name: 'Avery gadget: Empty' });
  await expect(page.getByLabel('Jordan HP')).toBeVisible();
  await source.click();
  await target.click();
  await expect(
    page.getByRole('button', { name: 'Avery gadget: frag-grenade' }),
  ).toBeVisible();
});

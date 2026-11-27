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

test('dragbar-personlig-utrustning: the dragged item follows the pointer and swaps with another person', async ({
  page,
}) => {
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Crew', exact: true }).click();
  const source = page.getByRole('button', {
    name: 'Jordan gadget: frag-grenade',
  });
  await source.scrollIntoViewIfNeeded();
  const start = await source.boundingBox();
  if (!start) throw new Error('Missing gadget slot');
  const x = start.x + start.width / 2;
  const y = start.y + start.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 40, y + 40, { steps: 5 });
  const ghost = await page.locator('.fleet-drag-ghost').boundingBox();
  if (!ghost) throw new Error('Missing drag ghost');
  // A ghost that does not follow the finger looks like a broken drag.
  expect(Math.abs(ghost.x + ghost.width / 2 - (x + 40))).toBeLessThan(2);
  expect(Math.abs(ghost.y + ghost.height / 2 - (y + 40))).toBeLessThan(2);
  const target = page.getByRole('button', {
    name: 'Taylor gadget: smoke-grenade',
  });
  const end = await target.boundingBox();
  if (!end) throw new Error('Missing target slot');
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, {
    steps: 5,
  });
  await page.mouse.up();
  await expect(
    page.getByRole('button', { name: 'Jordan gadget: smoke-grenade' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Taylor gadget: frag-grenade' }),
  ).toBeVisible();
});

test('dragbar-personlig-utrustning: equipment slots sit below their labels', async ({
  page,
}) => {
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Crew', exact: true }).click();
  const cell = page.locator('.crew-equipment > div').first();
  const label = await cell.locator('span').boundingBox();
  const slot = await cell.locator('button').boundingBox();
  if (!label || !slot) throw new Error('Missing equipment cell');
  expect(slot.y).toBeGreaterThanOrEqual(label.y + label.height - 1);
});

test('dragbar-personlig-utrustning: drop equipment on another person in Fleet', async ({
  page,
}) => {
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Fleet', exact: true }).click();
  await page.getByRole('button', { name: 'Raptor Boarder 1: Jordan' }).click();
  const source = page.getByRole('button', {
    name: 'Jordan gadget: frag-grenade',
  });
  const target = page.getByRole('button', { name: 'Raptor Pilot: Avery' });
  await target.scrollIntoViewIfNeeded();
  await source.dragTo(target);
  await page.getByRole('button', { name: 'Raptor Pilot: Avery' }).click();
  await expect(
    page.getByRole('button', { name: 'Avery gadget: frag-grenade' }).first(),
  ).toBeVisible();
});

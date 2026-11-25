import { expect, test } from '@playwright/test';
import { startFirstSlot } from './save-helpers.js';

test('fleet-motorer-och-last: dragging swaps engines between ships', async ({
  page,
}) => {
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Fleet', exact: true }).click();
  const source = page.getByRole('button', {
    name: 'Transport ship Cargo 1: Ion pulse engine',
  });
  const target = page.getByRole('button', {
    name: 'Raptor Engine: Rocket engine',
  });
  await source.scrollIntoViewIfNeeded();
  const start = await source.boundingBox();
  await target.scrollIntoViewIfNeeded();
  const end = await target.boundingBox();
  // Both ships need to be in view to drag across them.
  if (!start || !end) throw new Error('Missing equipment slot');
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(
    page.getByRole('button', { name: 'Raptor Engine: Ion pulse engine' }),
  ).toBeVisible();
});

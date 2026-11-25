import { expect, test } from '@playwright/test';
import { startFirstSlot } from './save-helpers.js';

test('fleet-drag-och-rullning: engine follows pointer while scrolling to another ship', async ({
  page,
}) => {
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Fleet', exact: true }).click();
  const list = page.locator('.fleet-ships');
  const source = page.getByRole('button', {
    name: 'Transport ship Cargo 1: Ion pulse engine',
  });
  const target = page.getByRole('button', {
    name: 'Raptor Engine: Rocket engine',
  });
  await source.scrollIntoViewIfNeeded();
  const start = await source.boundingBox();
  const bounds = await list.boundingBox();
  if (!start || !bounds) throw new Error('Missing equipment slot');
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height - 12,
    { steps: 8 },
  );
  const ghost = page.locator('.fleet-item-ghost');
  await expect(ghost).toBeVisible();
  const ghostBounds = await ghost.boundingBox();
  expect(ghostBounds!.x + ghostBounds!.width / 2).toBeCloseTo(
    bounds.x + bounds.width / 2,
    0,
  );
  expect(ghostBounds!.y + ghostBounds!.height / 2).toBeCloseTo(
    bounds.y + bounds.height - 12,
    0,
  );
  await expect
    .poll(async () => list.evaluate((node) => node.scrollTop))
    .toBeGreaterThan(50);
  await expect
    .poll(async () => {
      const box = await target.boundingBox();
      const viewport = await list.boundingBox();
      return (
        !!box &&
        !!viewport &&
        box.y >= viewport.y &&
        box.y + box.height <= viewport.y + viewport.height - 20
      );
    })
    .toBe(true);
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  const end = await target.boundingBox();
  if (!end) throw new Error('Missing target slot');
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(
    page.getByRole('button', { name: 'Raptor Engine: Ion pulse engine' }),
  ).toBeVisible();
  await expect(page.locator('.fleet-item-ghost')).toHaveCount(0);
});

test('fleet-skeppsordning: ship order is saved and can be changed with the keyboard', async ({
  page,
}) => {
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Fleet', exact: true }).click();
  await page.getByRole('button', { name: 'Move Raptor up' }).click();
  await expect(page.locator('.fleet-ship h2').first()).toHaveText('Raptor');
  await page.reload();
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Fleet', exact: true }).click();
  await expect(page.locator('.fleet-ship h2').first()).toHaveText('Raptor');
  const down = page.getByRole('button', { name: 'Move Raptor down' });
  await down.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.fleet-ship h2').first()).toHaveText(
    'Transport ship',
  );
});

test('fleet-skeppsordning: drag a ship down while the list scrolls', async ({
  page,
}) => {
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Fleet', exact: true }).click();
  const list = page.locator('.fleet-ships');
  const handle = page.getByRole('button', {
    name: 'Drag Transport ship to reorder',
  });
  const target = page.locator('.fleet-ship').nth(1);
  const start = await handle.boundingBox();
  const bounds = await list.boundingBox();
  if (!start || !bounds) throw new Error('Missing ship drag handle');
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height - 10,
    { steps: 8 },
  );
  await expect(page.locator('.fleet-ship-ghost')).toBeVisible();
  await expect
    .poll(async () =>
      list.evaluate(
        (node) => node.scrollTop + node.clientHeight >= node.scrollHeight - 2,
      ),
    )
    .toBe(true);
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  const end = await target.boundingBox();
  if (!end) throw new Error('Missing destination ship');
  await page.mouse.move(
    end.x + end.width / 2,
    Math.min(end.y + end.height - 20, bounds.y + bounds.height - 20),
  );
  await page.mouse.up();
  await expect(page.locator('.fleet-ship h2').first()).toHaveText('Raptor');
});

test('fleet-platsinformation: slot labels and selected engine details remain visible on mobile', async ({
  page,
}) => {
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Fleet', exact: true }).click();
  const source = page.getByRole('button', {
    name: 'Transport ship Cargo 1: Ion pulse engine',
  });
  await expect(source.locator('..').locator('.fleet-slot-label')).toHaveText(
    'Storage',
  );
  await source.click();
  const panel = page.getByLabel('Selected slot details');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('Ion pulse engine');
  await expect(panel).toContainText('Star map speed bonus: +1');
  await expect(panel).toContainText('Battle speed bonus: +1');
  await expect(panel.locator('img')).toBeVisible();
  const target = page.getByRole('button', {
    name: 'Raptor Engine: Rocket engine',
  });
  await expect(target.locator('..').locator('.fleet-slot-label')).toHaveText(
    'Engine',
  );
  await target.click();
  await expect(
    page.getByRole('button', { name: 'Raptor Engine: Ion pulse engine' }),
  ).toBeVisible();
});

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
  await page.getByRole('button', { name: 'Move Raptor up' }).click();
  await expect(page.locator('.fleet-ship h2').first()).toHaveText('Raptor');
  await page.reload();
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Fleet', exact: true }).click();
  await expect(page.locator('.fleet-ship h2').first()).toHaveText('Raptor');
  const down = page.getByRole('button', { name: 'Move Raptor down' });
  await down.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.fleet-ship h2').first()).toHaveText('Fighter');
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
  const target = page
    .locator('.fleet-ship')
    .filter({ has: page.getByRole('heading', { name: 'Raptor' }) });
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
  await expect(page.locator('.fleet-ship h2').nth(1)).toHaveText('Raptor');
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
  await expect(
    source
      .locator('xpath=ancestor::div[contains(@class,"fleet-storage")]')
      .locator('.fleet-storage-title'),
  ).toHaveText('Storage');
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
  await expect(target).toHaveAttribute('aria-pressed', 'true');
  await expect(panel).toContainText('Rocket engine');
  await expect(source).toHaveAttribute('aria-pressed', 'false');
});

test('fleet-vapenplatser: fighter weapon can be stored and re-equipped', async ({
  page,
}) => {
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Fleet', exact: true }).click();
  const cannon = page.getByRole('button', { name: 'Fighter Weapon 1: Cannon' });
  await cannon.click();
  await expect(page.getByLabel('Selected slot details')).toContainText(
    'Cannon',
  );
  await expect(page.getByLabel('Selected slot details')).toContainText(
    'Range: 1–3',
  );
  await page
    .getByRole('button', { name: 'Transport ship Cargo 3: Empty' })
    .click();
  await page
    .getByRole('button', { name: 'Transport ship Cargo 3: Cannon' })
    .click();
  await page.getByRole('button', { name: 'Fighter Weapon 2: Empty' }).click();
  await expect(
    page.getByRole('button', { name: 'Fighter Weapon 2: Cannon' }),
  ).toBeVisible();
});

test('fleet-vapenplatser: drag a weapon into storage while scrolling', async ({
  page,
}) => {
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Fleet', exact: true }).click();
  const list = page.locator('.fleet-ships');
  const source = page.getByRole('button', { name: 'Fighter Weapon 1: Cannon' });
  const target = page.getByRole('button', {
    name: 'Transport ship Cargo 3: Empty',
  });
  const start = await source.boundingBox();
  const bounds = await list.boundingBox();
  if (!start || !bounds) throw new Error('Missing weapon or fleet');
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height - 10,
    { steps: 8 },
  );
  await expect(page.locator('.fleet-item-ghost')).toBeVisible();
  await expect
    .poll(async () => {
      const box = await target.boundingBox();
      return (
        !!box &&
        box.y >= bounds.y &&
        box.y + box.height < bounds.y + bounds.height - 20
      );
    })
    .toBe(true);
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  const end = await target.boundingBox();
  if (!end) throw new Error('Missing destination');
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(
    page.getByRole('button', { name: 'Transport ship Cargo 3: Cannon' }),
  ).toBeVisible();
});

test('fleet-kompakta-skepp: ship picture sits beside equipment', async ({
  page,
}) => {
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Fleet', exact: true }).click();
  const ship = page
    .locator('.fleet-ship')
    .filter({ has: page.getByRole('heading', { name: 'Fighter' }) });
  const picture = await ship.locator('.fleet-ship-picture').boundingBox();
  const equipment = await ship.locator('.fleet-ship-image').boundingBox();
  expect(picture).not.toBeNull();
  expect(equipment).not.toBeNull();
  expect(picture!.x + picture!.width).toBeLessThanOrEqual(equipment!.x);
});

test('fleet-kompakt-skeppsyta: ship images leave less vertical space and equipment remains inside', async ({
  page,
}) => {
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Fleet', exact: true }).click();
  const fighter = page
    .locator('.fleet-ship')
    .filter({ has: page.getByRole('heading', { name: 'Fighter' }) });
  const image = await fighter.locator('.fleet-ship-image').boundingBox();
  const slots = await fighter.locator('.fleet-equipment-slot').all();
  if (!image) throw new Error('Missing ship image');
  for (const slot of slots) {
    const bounds = await slot.boundingBox();
    if (!bounds) throw new Error('Missing equipment slot');
    expect(bounds.y).toBeGreaterThanOrEqual(image.y);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(
      image.y + image.height,
    );
  }
});

test('fleet-placering-vapen-och-motor: weapon slots flank storage and engine sits at the rear', async ({
  page,
}) => {
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Fleet', exact: true }).click();
  const fighter = page
    .locator('.fleet-ship')
    .filter({ has: page.getByRole('heading', { name: 'Fighter' }) });
  const image = await fighter.locator('.fleet-ship-image').boundingBox();
  const engine = await fighter
    .getByRole('button', { name: 'Fighter Engine: Rocket engine' })
    .boundingBox();
  const upper = await fighter
    .getByRole('button', { name: 'Fighter Weapon 1: Cannon' })
    .boundingBox();
  const lower = await fighter
    .getByRole('button', { name: 'Fighter Weapon 2: Empty' })
    .boundingBox();
  if (!image || !engine || !upper || !lower)
    throw new Error('Missing equipment layout');
  const center = (r: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
  expect((center(engine).x - image.x) / image.width).toBeLessThan(0.2);
  expect((center(engine).y - image.y) / image.height).toBeCloseTo(0.5, 1);
  expect(center(upper).x).toBeGreaterThan(center(engine).x);
  expect(center(lower).x).toBeCloseTo(center(upper).x, 0);
  expect((center(upper).y - image.y) / image.height).toBeLessThan(0.3);
  expect((center(lower).y - image.y) / image.height).toBeGreaterThan(0.7);
});

test('fleet-direktmarkering: another occupied slot becomes selected and background clears it', async ({
  page,
}) => {
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Fleet', exact: true }).click();
  const first = page.getByRole('button', { name: 'Fighter Weapon 1: Cannon' });
  const second = page.getByRole('button', {
    name: 'Raptor Engine: Rocket engine',
  });
  await first.click();
  await expect(page.getByLabel('Selected slot details')).toContainText(
    'Cannon',
  );
  await expect(first.locator('img')).toHaveJSProperty('complete', true);
  expect(
    await first
      .locator('img')
      .evaluate((img: HTMLImageElement) => img.naturalWidth),
  ).toBeGreaterThan(0);
  await second.click();
  await expect(first).toHaveAttribute('aria-pressed', 'false');
  await expect(second).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Selected slot details')).toContainText(
    'Rocket engine',
  );
  await page.getByRole('heading', { name: 'Fleet', exact: true }).click();
  await expect(second).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByLabel('Selected slot details')).toBeHidden();
});

import { expect, test } from '@playwright/test';

function hexPoint(
  width: number,
  height: number,
  q: number,
  r: number,
): { x: number; y: number } {
  const size = 36;
  const world = (hexQ: number, hexR: number) => ({
    x: Math.sqrt(3) * size * (hexQ + hexR / 2),
    y: size * 1.5 * hexR,
  });
  const first = world(0, 0);
  const last = world(16, 10);
  const minX = first.x - size;
  const maxX = last.x + size;
  const minY = first.y - size;
  const maxY = last.y + size;
  const padding = 18;
  const scale = Math.max(
    0.08,
    Math.min(
      2,
      (width - padding * 2) / (maxX - minX),
      (height - padding * 2) / (maxY - minY),
    ),
  );
  const offset = {
    x: width / 2 - ((minX + maxX) / 2) * scale,
    y: height / 2 - ((minY + maxY) / 2) * scale,
  };
  const point = world(q, r);
  return {
    x: offset.x + point.x * scale,
    y: offset.y + point.y * scale,
  };
}

test('fristaende-bordningsprototyp / miljomal-och-forstorelse: targets a door without changing saves', async ({
  page,
}) => {
  await page.goto('./');
  const before = await page.evaluate(() => ({ ...localStorage }));
  await page
    .getByRole('button', { name: 'Test boarding (cheat)', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Boarding combat' });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Turn left 60°', exact: true }),
  ).toBeVisible();

  const canvas = dialog.locator('canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await canvas.click({
    position: hexPoint(box!.width, box!.height, 3, 9),
  });
  const shoot = dialog.getByRole('button', { name: /^Shoot · \d+%$/ });
  await expect(shoot).toBeEnabled();
  await shoot.click();
  await shoot.click();
  await expect(dialog.locator('.boarding-log')).toContainText(/Rifle.*door/i);
  await expect(
    dialog.getByRole('button', { name: 'Shoot', exact: true }),
  ).toBeDisabled();

  await dialog
    .getByRole('button', { name: 'Close boarding', exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Test boarding (cheat)', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(before);
});

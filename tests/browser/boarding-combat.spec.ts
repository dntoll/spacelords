import { expect, test } from '@playwright/test';
import { boardingIsoHexPoint } from '../../src/client/views/BoardingProjection.js';

test('fristaende-bordningsprototyp / miljomal-och-forstorelse / tydlig-bordningsstatus / isometrisk-bordningsvy / spelmassigt-bordningsgranssnitt: uses the tactical HUD, targets a door and advances a hidden defender without changing saves', async ({
  page,
}) => {
  await page.goto('./');
  const before = await page.evaluate(() => ({ ...localStorage }));
  await page
    .getByRole('button', { name: 'Test boarding (cheat)', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Boarding combat' });
  await expect(dialog).toBeVisible();
  const team = dialog.getByRole('region', { name: 'Boarding team' });
  await expect(team.getByRole('progressbar')).toHaveCount(4);
  await expect(team.locator('.boarding-unit-active')).toContainText(
    /^Boarder \d/,
  );
  await expect(dialog.getByLabel('Map legend')).toContainText(
    /Half cover.*Facing/,
  );
  const turnLeft = dialog.getByRole('button', {
    name: 'Turn left 60°',
    exact: true,
  });
  await expect(turnLeft).toBeVisible();
  const dialogBox = (await dialog.boundingBox())!;
  const boardBox = (await dialog.locator('.boarding-board').boundingBox())!;
  const actionBox = (await turnLeft.boundingBox())!;
  expect(boardBox.height / dialogBox.height).toBeGreaterThan(0.85);
  expect(actionBox.width).toBeLessThanOrEqual(44);
  expect(actionBox.height).toBeLessThanOrEqual(44);

  const canvas = dialog.locator('canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await canvas.click({
    position: boardingIsoHexPoint(
      { width: 17, height: 11 },
      { width: box!.width, height: box!.height },
      { q: 3, r: 9 },
    ),
  });
  const shoot = dialog.getByRole('button', { name: /^Shoot · \d+%$/ });
  await expect(shoot).toBeEnabled();
  await shoot.click();
  await shoot.click();
  await expect(dialog.locator('.boarding-log')).toContainText(/Rifle.*door/i);
  await expect(
    dialog.getByRole('button', { name: 'Shoot', exact: true }),
  ).toBeDisabled();
  const defendersActing = dialog.getByText('Defenders are acting…', {
    exact: true,
  });
  for (let index = 0; index < 4; index++) {
    if (await defendersActing.isVisible()) break;
    await dialog
      .getByRole('button', { name: 'End soldier turn', exact: true })
      .click();
  }
  await expect(defendersActing).toBeVisible();
  await dialog.getByText('Combat details', { exact: true }).click();
  await expect(dialog.locator('.boarding-activity')).toContainText(
    'A defender is acting',
  );
  await expect(dialog.locator('.boarding-log')).toContainText(/A defender /);

  await dialog
    .getByRole('button', { name: 'Close boarding', exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Test boarding (cheat)', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(before);
});

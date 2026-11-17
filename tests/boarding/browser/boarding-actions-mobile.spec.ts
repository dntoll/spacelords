import { expect, test } from '@playwright/test';

test('bordningshud-i-botten: compact equipment and contextual soldier actions fit on mobile', async ({
  page,
}) => {
  await page.goto('./');
  await page
    .getByRole('button', { name: 'Test boarding (cheat)', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Boarding combat' });
  const controls = dialog.getByRole('region', { name: 'Soldier actions' });
  await expect(controls.locator('.boarding-equipment > button')).toHaveCount(2);
  await dialog.locator('.boarding-unit-active').click();
  const turn = dialog.getByRole('button', { name: 'Turn left 45°' });
  await expect(turn).toBeVisible();
  await expect(turn).toHaveText('↶');
  const bounds = await controls.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    bottom: element.getBoundingClientRect().bottom,
    height: window.innerHeight,
  }));
  expect(bounds.scrollHeight).toBeLessThanOrEqual(bounds.clientHeight);
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.height);
  const button = (await turn.boundingBox())!;
  expect(button.width).toBeGreaterThanOrEqual(44);
  expect(button.height).toBeGreaterThanOrEqual(44);
  const menu = (await dialog.locator('.boarding-context-menu').boundingBox())!;
  const board = (await dialog.locator('.boarding-board').boundingBox())!;
  const dock = (await controls.boundingBox())!;
  expect(menu.x).toBeGreaterThanOrEqual(board.x);
  expect(menu.x + menu.width).toBeLessThanOrEqual(board.x + board.width);
  expect(menu.y + menu.height).toBeLessThanOrEqual(dock.y);
});

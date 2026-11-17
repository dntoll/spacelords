import { expect, test } from '@playwright/test';

test('bordningshud-i-botten: compact equipment and contextual soldier actions fit on mobile', async ({
  page,
  browserName,
}) => {
  await page.goto('./');
  await page
    .getByRole('button', { name: 'Test boarding (cheat)', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Boarding combat' });
  const fullscreen = dialog.getByRole('button', {
    name: /^(Enter|Exit) fullscreen$/,
  });
  if (browserName === 'chromium' && (await fullscreen.isVisible())) {
    if ((await fullscreen.getAttribute('aria-label')) === 'Exit fullscreen')
      await fullscreen.click();
    await dialog.getByRole('button', { name: 'Enter fullscreen' }).click();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.fullscreenElement === document.documentElement,
        ),
      )
      .toBe(true);
    await dialog.getByRole('button', { name: 'Exit fullscreen' }).click();
    await expect
      .poll(() => page.evaluate(() => document.fullscreenElement === null))
      .toBe(true);
  }
  const controls = dialog.getByRole('region', { name: 'Soldier actions' });
  const fourth = dialog
    .getByRole('region', { name: 'Boarding team' })
    .getByRole('button', { name: /^Boarder 4,/ });
  await fourth.click();
  await expect(fourth).toHaveClass(/boarding-unit-active/);
  const originalViewport = page.viewportSize()!;
  await page.setViewportSize({ width: 844, height: 390 });
  const first = dialog
    .getByRole('region', { name: 'Boarding team' })
    .getByRole('button', { name: /^Boarder 1,/ });
  await first.click();
  await expect(first).toHaveClass(/boarding-unit-active/);
  await fourth.click();
  await expect(fourth).toHaveClass(/boarding-unit-active/);
  await page.setViewportSize(originalViewport);
  await expect(controls.locator('.boarding-equipment > button')).toHaveCount(2);
  await dialog.locator('.boarding-unit-active').click();
  const turn = dialog.getByRole('button', { name: 'Turn left 45°' });
  await expect(turn).toBeVisible();
  await expect(turn.locator('.boarding-action-art')).toBeVisible();
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

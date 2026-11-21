import { expect, test } from '@playwright/test';

test('bordningshud-i-botten / ihopfallbar-bordningslogg: controls fit and a scrolled log can close on mobile', async ({
  page,
}) => {
  await page.goto('./');
  await page.locator('.save-tests summary').click();
  await page
    .getByRole('button', { name: 'Test boarding', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Boarding combat' });
  // helskarm-fran-sparade-spel: fullscreen is only offered on Saved games.
  await expect(
    dialog.getByRole('button', { name: /fullscreen$/i }),
  ).toHaveCount(0);
  const controls = dialog.getByRole('region', { name: 'Soldier actions' });
  await expect(dialog.locator('.boarding-heading')).toHaveCount(0);
  await expect(controls.getByRole('button', { name: 'Crouch' })).toBeVisible();
  await expect(
    controls.getByRole('button', { name: 'Overwatch' }),
  ).toBeVisible();
  const logBox = (await dialog.locator('.boarding-log-overlay').boundingBox())!;
  const cornerBox = (await dialog
    .getByRole('button', { name: 'Close boarding' })
    .boundingBox())!;
  expect(logBox.x).toBeLessThan(20);
  expect(logBox.y).toBeLessThan(20);
  expect(cornerBox.y).toBeLessThan(20);
  expect(cornerBox.x + cornerBox.width).toBeGreaterThan(
    page.viewportSize()!.width - 20,
  );
  const details = dialog.locator('.boarding-details');
  await details.locator('summary').click();
  await details.locator('.boarding-log').evaluate((log) => {
    log.textContent = Array.from(
      { length: 80 },
      (_, index) => `Event ${index}`,
    ).join('\n');
  });
  await details.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect
    .poll(() => details.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
  await details.locator('summary').click();
  await expect(details).not.toHaveAttribute('open', '');
  const fourth = dialog
    .getByRole('region', { name: 'Boarding team' })
    .getByRole('button', { name: /^Boarder 4,/ });
  await fourth.click();
  await expect(fourth).toHaveClass(/boarding-unit-active/);
  const originalViewport = page.viewportSize()!;
  // Chromium cannot resize its emulated viewport while its window is fullscreen.
  await page.evaluate(async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
  });
  await page.setViewportSize({ width: 844, height: 390 });
  const first = dialog
    .getByRole('region', { name: 'Boarding team' })
    .getByRole('button', { name: /^Boarder 1,/ });
  await first.click();
  await expect(first).toHaveClass(/boarding-unit-active/);
  await fourth.click();
  await expect(fourth).toHaveClass(/boarding-unit-active/);
  await page.setViewportSize(originalViewport);
  await expect(controls.locator('.boarding-equipment > button')).toHaveCount(4);
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

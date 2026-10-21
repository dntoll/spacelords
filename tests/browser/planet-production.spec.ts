import { expect, test, type Page } from '@playwright/test';
import { endTurn, startFirstSlot, chooseResearch } from './save-helpers.js';

async function nextYear(page: Page) {
  await page.getByRole('button', { name: 'Star map', exact: true }).click();
  await endTurn(page);
}
async function home(page: Page) {
  await page.getByRole('button', { name: 'Star map', exact: true }).click();
  await page.locator('canvas[data-rendered="true"]').press('Home');
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
}
async function build(page: Page, site: number, type: string) {
  await page
    .getByRole('button', {
      name: `Build building at site ${site}`,
      exact: true,
    })
    .click();
  await page
    .getByRole('button', { name: `Build ${type}`, exact: true })
    .click();
}

test('gemensam-planetko / delfabriker / automatiska-delorder: research, manufacture parts and assemble a Fighter in one saved queue', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await startFirstSlot(page);
  await home(page);
  await build(page, 1, 'Research station');
  await nextYear(page);
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  await chooseResearch(page, 'Fighter factory');
  await expect(page.locator('.research-queue article')).toHaveCount(4);
  for (let year = 0; year < 4; year++) await nextYear(page);
  await home(page);
  for (const [index, type] of [
    'Rocket engine factory',
    'Weapons module factory',
    'Fighter factory',
  ].entries())
    await build(page, index + 2, type);
  for (let year = 0; year < 3; year++) await nextYear(page);
  await home(page);
  await expect(page.locator('.factory-production')).toHaveCount(3);
  await expect(page.locator('.queue-slots')).toHaveCount(1);
  await page
    .getByRole('button', { name: 'Queue Fighter', exact: true })
    .click();
  const queue = page.getByRole('region', {
    name: 'Planet build queue',
    exact: true,
  });
  await expect(queue.locator('.queue-order')).toHaveCount(3);
  for (const [index, type] of [
    'Rocket engine',
    'Weapons module',
    'Fighter',
  ].entries())
    await expect(queue.locator('.queue-order').nth(index)).toContainText(type);
  await build(page, 5, 'Research station');
  await page.reload();
  await startFirstSlot(page);
  await home(page);
  await expect(queue.locator('.queue-order')).toHaveCount(4);
  await queue.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath('shared-planet-queue.png'),
  });
  await nextYear(page);
  await home(page);
  await expect(page.locator('[data-component="Rocket engine"]')).toContainText(
    'Stored 1',
  );
  await expect(queue.locator('.queue-order')).toHaveCount(3);
  await nextYear(page);
  await home(page);
  await expect(page.locator('[data-component="Weapons module"]')).toContainText(
    'Stored 1',
  );
  await nextYear(page);
  await home(page);
  await expect(page.locator('[data-component="Rocket engine"]')).toContainText(
    'Stored 0',
  );
  await expect(queue.locator('.queue-order')).toHaveCount(1);
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  await expect(
    page.getByRole('group', { name: 'Ships in Home Fleet', exact: true }),
  ).toContainText('+1 Fighter');
  await page
    .getByRole('button', { name: 'Show on map: Home Fleet', exact: true })
    .click();
  await expect(
    page
      .getByRole('group', { name: 'Ships in Home Fleet', exact: true })
      .getByRole('button', { name: /Fighter \d in Home Fleet/ }),
  ).toHaveCount(2);
  expect(errors).toEqual([]);
});

import { scenarioTimeout } from '../../browser-timeouts.js';
import { expect, test } from '@playwright/test';
import { endTurn, startFirstSlot, chooseResearch } from './save-helpers.js';

test('utvinningsbyggnader / parallella-byggen / forskningsflikar: build extraction and a station, then queue research', async ({
  page,
}) => {
  scenarioTimeout(120_000);
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Factories', exact: true }).click();
  for (const [site, type] of [
    [1, 'Iron mine'],
    [2, 'Water extractor'],
    [3, 'Oil extractor'],
    [4, 'Research station'],
  ] as const) {
    await page
      .getByRole('button', {
        name: `Empty site ${site} on Tellus`,
        exact: true,
      })
      .click();
    await page
      .getByRole('button', { name: `Build ${type}`, exact: true })
      .click();
  }
  for (let round = 0; round < 3; round++) await endTurn(page);
  await page.getByRole('button', { name: 'Star map', exact: true }).click();
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  await expect(page.locator('[data-resource="Iron"]')).toContainText(
    'Extracting 10/round',
  );
  await chooseResearch(page, 'Rocket engine factory');
  await chooseResearch(page, 'Telescope I factory');
  await page.getByRole('tab', { name: 'Queue · 2' }).click();
  await expect(page.locator('.research-queue article')).toHaveCount(2);
  await page.reload();
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  await page.getByRole('tab', { name: 'Queue · 2' }).click();
  await expect(page.locator('.research-queue article')).toHaveCount(2);
});

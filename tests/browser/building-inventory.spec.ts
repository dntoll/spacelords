import { expect, test } from '@playwright/test';
import { startFirstSlot, endTurn } from './save-helpers.js';

test('byggnadsantal-lokalt-och-globalt: Build selection counts completed buildings and excludes queued projects', async ({
  page,
}, testInfo) => {
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  await page
    .getByRole('button', { name: 'Building sites', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Build building at site 1', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Show Research station', exact: true })
    .click();
  const inventory = page.locator(
    '[data-building-type="Research station"] .building-inventory',
  );
  await expect(inventory).toContainText('Already built');
  await expect(inventory).toContainText('On Tellus');
  await expect(inventory).toContainText('All your planets');
  await expect(inventory.locator('dd')).toHaveText(['0', '0']);
  await page
    .getByRole('button', { name: 'Show Research station', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Build Research station', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Building sites', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Build building at site 2', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Show Research station', exact: true })
    .click();
  await expect(inventory.locator('dd')).toHaveText(['0', '0']);
  await page.getByRole('button', { name: 'Star map', exact: true }).click();
  await endTurn(page);
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  await page
    .getByRole('button', { name: 'Building sites', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Build building at site 2', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Show Research station', exact: true })
    .click();
  await expect(inventory.locator('dd')).toHaveText(['1', '1']);
  await inventory.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath('building-inventory.png'),
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

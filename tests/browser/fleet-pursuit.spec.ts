import { chooseFleetDestination } from './fleet-helpers.js';
import { expect, test } from '@playwright/test';
import { startFirstSlot, endTurn } from './save-helpers.js';

test('skepp-till-rorlig-flotta: reinforcements survive reload and catch a moving fleet', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  await page.getByRole('button', { name: 'New fleet', exact: true }).click();
  await page
    .getByRole('button', { name: 'Fighter 1 in Home Fleet', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Move ship to Fleet 1', exact: true })
    .click();
  await page.getByRole('button', { name: 'Back to map', exact: true }).click();
  await chooseFleetDestination(page, 'Fleet 1');
  await page
    .getByRole('combobox', { name: 'Known objects' })
    .selectOption({ label: 'Vesta' });
  await endTurn(page);
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  await page
    .getByRole('button', {
      name: 'Exploration ship 1 in Home Fleet',
      exact: true,
    })
    .click();
  await page
    .getByRole('button', { name: 'Move ship to Fleet 1', exact: true })
    .click();
  await expect(
    page.getByRole('article', { name: 'Fleet Fleet 2', exact: true }),
  ).toContainText('En route to Fleet 1');
  await expect(
    page.getByRole('button', { name: 'Cancel reinforcement', exact: true }),
  ).toBeEnabled();
  await page.reload();
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  await expect(
    page.getByRole('article', { name: 'Fleet Fleet 2', exact: true }),
  ).toContainText('En route to Fleet 1');
  await page
    .getByRole('button', { name: 'Cancel reinforcement', exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath('reinforcements-en-route.png'),
  });
  await page.getByRole('button', { name: 'Back to map', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Known objects' })
    .selectOption({ label: 'Vesta' });
  await chooseFleetDestination(page, 'Fleet 1');
  await page
    .getByRole('combobox', { name: 'Known objects' })
    .selectOption({ label: 'Nadir' });
  await endTurn(page);
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  await expect(
    page.getByRole('button', {
      name: 'Exploration ship 1 in Fleet 1',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('article', { name: 'Fleet Fleet 2', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('article', { name: 'Fleet Home Fleet', exact: true }),
  ).toContainText('No ships');
  expect(errors).toEqual([]);
});

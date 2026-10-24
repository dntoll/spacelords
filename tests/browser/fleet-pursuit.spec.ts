import { selectMapObject } from './map-helpers.js';
import {
  chooseFleetDestination,
  formFleet,
  selectMapFleet,
  receiveShip,
} from './fleet-helpers.js';
import { expect, test } from '@playwright/test';
import { startFirstSlot, endTurn } from './save-helpers.js';

test('skepp-till-rorlig-flotta: reinforcements survive reload and catch a moving fleet', async ({
  page,
}, testInfo) => {
  // utokad-testsvit: allow two turns, reload and map interactions on WebKit.
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  await formFleet(page);
  await chooseFleetDestination(page, 'Fleet 1');
  await selectMapObject(page, 'Vesta');
  await endTurn(page);
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  await selectMapFleet(page);
  await page
    .getByRole('button', {
      name: 'Exploration ship 1 in Home Fleet',
      exact: true,
    })
    .click();
  await receiveShip(page, 'Fleet 1');
  await expect(
    page.getByRole('article', { name: 'Fleet Fleet 2', exact: true }),
  ).toContainText('En route to Fleet 1');
  await expect(
    page.getByRole('button', { name: 'Cancel reinforcement', exact: true }),
  ).toBeEnabled();
  await page.reload();
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  await selectMapFleet(page, 'Fleet 2');
  await expect(
    page.getByRole('article', { name: 'Fleet Fleet 2', exact: true }),
  ).toContainText('En route to Fleet 1');
  await page
    .getByRole('button', { name: 'Cancel reinforcement', exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath('reinforcements-en-route.png'),
  });
  await page.getByRole('button', { name: 'Star map', exact: true }).click();
  await selectMapObject(page, 'Vesta');
  await chooseFleetDestination(page, 'Fleet 1');
  await selectMapObject(page, 'Nadir');
  await endTurn(page);
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  await selectMapFleet(page, 'Fleet 1');
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
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});

import { scenarioTimeout } from '../../browser-timeouts.js';
import { expect, test } from '@playwright/test';
import { domeProductionState } from '../../fixtures/production-dome.js';
import { startFirstSlot, endTurn } from './save-helpers.js';

test('produktionsvagledning-till-factories / domes-per-byggplats: Factories builds a Dome before offering factories', async ({
  page,
}) => {
  scenarioTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript((state) => {
    if (localStorage.getItem('production-domes-seeded')) return;
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-24T00:00:00Z', state }),
    );
    localStorage.setItem('production-domes-seeded', 'yes');
  }, domeProductionState());
  await page.goto('./');
  await startFirstSlot(page);
  const production = page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'Production', exact: true });
  await production.click();
  const options = page.getByRole('group', { name: 'Build options' });
  await expect(
    options.getByRole('button', { name: /dome|factory/i }),
  ).toHaveCount(0);
  await expect(page.locator('.production-guidance')).toContainText('Factories');
  await page.getByRole('button', { name: 'Factories', exact: true }).click();
  await page
    .getByRole('button', { name: 'Site 1 on Tellus needs a Dome', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Build Desert dome', exact: true })
    .click();
  for (let round = 0; round < 2; round++) await endTurn(page);
  await page.getByRole('button', { name: 'Factories', exact: true }).click();
  await page
    .getByRole('button', { name: 'Empty site 1 on Tellus', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Build Rocket engine factory', exact: true })
    .click();
  const project = await page.evaluate(
    () =>
      (
        JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as {
          state: {
            colonies: [
              string,
              { projects: { type: string; slotIndex: number }[] },
            ][];
          };
        }
      ).state.colonies[0]![1].projects[0],
  );
  expect(project).toMatchObject({
    type: 'Rocket engine factory',
    slotIndex: 0,
  });
  expect(errors).toEqual([]);
});

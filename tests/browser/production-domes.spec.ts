import { expect, test } from '@playwright/test';
import { domeProductionState } from '../fixtures/production-dome.js';
import { startFirstSlot, endTurn } from './save-helpers.js';

test('dome-fore-fabriksforslag / domes-per-byggplats: Production builds a Dome before offering factories for its prepared site', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript((state) => {
    if (localStorage.getItem('production-domes-seeded')) return;
    localStorage.setItem('spacelords.terraforming-v5-reset', 'done');
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
  await expect(options.getByRole('button').first()).toHaveAccessibleName(
    'Show Desert dome',
  );
  await expect(options.getByRole('button', { name: /factory/ })).toHaveCount(0);
  await expect(page.locator('.production-guidance')).toContainText(
    'Build a Desert dome',
  );
  await page
    .getByRole('button', { name: 'Prepare building site', exact: true })
    .click();
  await expect(
    page.getByRole('region', { name: 'Build details' }),
  ).toContainText('Desert dome');
  await page.getByRole('button', { name: 'Build', exact: true }).click();
  await expect(page.locator('.map-queue-row')).toContainText('Desert dome');
  await endTurn(page);
  await production.click();
  const factory = options.getByRole('button', {
    name: 'Show Rocket engine factory',
  });
  if (!(await factory.isVisible())) {
    await page.getByRole('button', { name: 'Next build options' }).click();
  }
  await factory.click();
  await expect(
    page.getByRole('button', { name: 'Build', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Build', exact: true }).click();
  await expect(page.locator('.map-queue-row')).toContainText(
    'Rocket engine factory',
  );
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

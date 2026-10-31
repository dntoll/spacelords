import { expect, test } from '@playwright/test';
import { upgradeState } from '../fixtures/fleet-upgrades.js';
import { startFirstSlot, endTurn } from './save-helpers.js';
import { selectMapFleet } from './fleet-helpers.js';
import type { GameState } from '../../src/client/models/Game.js';

test('flottorder-upgrade / spara-flottuppgradering: orders on touch, reloads during the trip and installs equipment at the shipyard', async ({
  page,
}, testInfo) => {
  const state = upgradeState();
  await page.addInitScript((state) => {
    if (localStorage.getItem('upgrade-seeded')) return;
    localStorage.setItem('upgrade-seeded', 'yes');
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-31', state }),
    );
  }, state);
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  await selectMapFleet(page);
  const upgrade = page.getByRole('button', { name: 'Upgrade', exact: true });
  await expect(upgrade).toBeEnabled();
  if (testInfo.project.use.hasTouch) await upgrade.tap();
  else await upgrade.click();
  await expect(
    page.getByRole('button', { name: 'Cancel Upgrade', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.fleet-upgrade-status')).toContainText('Tellus');
  const box = (await upgrade.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(44);
  expect(box.width).toBeGreaterThanOrEqual(44);
  await page.screenshot({
    path: testInfo.outputPath('upgrade-order-mobile.png'),
  });
  await page.reload();
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  await selectMapFleet(page);
  await expect(
    page.getByRole('button', { name: 'Cancel Upgrade', exact: true }),
  ).toBeVisible();
  await endTurn(page);
  await expect(page.locator('.fleet-upgrade-status')).toHaveCount(0);
  const saved = await page.evaluate(
    () =>
      (
        JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as {
          state: GameState;
        }
      ).state,
  );
  expect(saved.fleets[0]!.shipUnits![0]).toMatchObject({
    id: 'explorer',
    telescope: 3,
    engines: { 'Rocket engine': 0, 'Ion pulse engine': 2 },
  });
  expect(saved.fleets[0]!.upgrade).toBeUndefined();
  await expect(upgrade).toHaveCount(0);
});

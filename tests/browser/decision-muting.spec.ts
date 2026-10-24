import { researchStationState } from '../fixtures/research-station.js';
import { expect, test } from '@playwright/test';
import { startFirstSlot } from './save-helpers.js';

test('tysta-beslut / beslutsmarkering-pa-flikar / tystade-beslut-sist: Mute persists across turns and reload, Unmute restores warnings', async ({
  page,
}, testInfo) => {
  await page.addInitScript((state) => {
    if (localStorage.getItem('decision-station-seeded')) return;
    localStorage.setItem('spacelords.terraforming-v5-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-24T00:00:00Z', state }),
    );
    localStorage.setItem('decision-station-seeded', 'yes');
  }, researchStationState());
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Decisions', exact: true }).click();
  await expect(
    page.locator('[data-screen="fleets"] .nav-attention'),
  ).toHaveCount(1);
  await expect(
    page.locator('[data-screen="research"] .nav-attention'),
  ).toHaveCount(1);
  await expect(
    page.locator('[data-screen="production"] .nav-attention'),
  ).toHaveCount(1);
  await expect(
    page.locator('[data-screen="route"] .nav-attention'),
  ).toHaveCount(0);
  for (const id of [
    'research-empty',
    'building-empty-sol-0',
    'fleet-idle-fleet-home',
  ]) {
    await page
      .locator(`[data-decision-id="${id}"]`)
      .getByRole('button', { name: 'Mute', exact: true })
      .click();
    await expect(page.locator('[data-decision-id]').last()).toHaveAttribute(
      'data-decision-id',
      id,
    );
  }
  await expect(
    page.locator('[data-screen="fleets"] .nav-attention'),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Next decision', exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('.decision-counter')).toHaveText('Decisions (0)');
  await page.getByRole('button', { name: 'Star map', exact: true }).click();
  await page.getByRole('button', { name: 'Decisions', exact: true }).click();
  await page.getByRole('button', { name: 'End turn', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Decisions', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Unmute', exact: true }),
  ).toHaveCount(3);
  const fleet = page.locator('[data-decision-id="fleet-idle-fleet-home"]');
  await expect(fleet).toContainText('Muted for future turns');
  await fleet.getByRole('button', { name: 'Unmute', exact: true }).click();
  await expect(page.locator('.decision-counter')).toHaveText('Decisions (1)');
  await expect(
    page.locator('[data-screen="fleets"] .nav-attention'),
  ).toHaveCount(1);
  await expect(page.locator('[data-decision-id]').first()).toHaveAttribute(
    'data-decision-id',
    'fleet-idle-fleet-home',
  );
  await page.screenshot({ path: testInfo.outputPath('decision-muting.png') });
  await page.getByRole('button', { name: 'Star map', exact: true }).click();
  await page.getByRole('button', { name: 'Decisions', exact: true }).click();
  await page.getByRole('button', { name: 'End turn', exact: true }).click();
  const warning = page.getByRole('dialog', { name: 'Decisions remaining' });
  await expect(warning.locator('li')).toHaveCount(1);
  await expect(warning).toContainText('Home Fleet: choose an assignment');
  await warning.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Decisions', exact: true }).click();
  await page
    .locator('[data-decision-id="fleet-idle-fleet-home"]')
    .getByRole('button', { name: 'Review', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Fleets', exact: true }),
  ).toBeVisible();
});

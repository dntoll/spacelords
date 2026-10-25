import { expect, test } from '@playwright/test';
import { researchStationState } from '../fixtures/research-station.js';
import { startFirstSlot } from './save-helpers.js';

test('beslutsvagledning-i-vyn: navigation warnings lead to highlighted controls and actionable help', async ({
  page,
}, testInfo) => {
  await page.addInitScript((state) => {
    localStorage.setItem('spacelords.terraforming-v5-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-24T00:00:00Z', state }),
    );
  }, researchStationState());
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  const guidance = page.getByRole('complementary', {
    name: 'Decisions in this view',
  });
  await expect(guidance).toContainText('Home Fleet');
  await expect(guidance).toContainText('Orders');
  await guidance
    .getByRole('button', {
      name: 'Show decision: Home Fleet: choose an assignment',
      exact: true,
    })
    .click();
  const fleet = page.locator('.selected-fleet-card.decision-target');
  await expect(fleet).toContainText('Home Fleet');
  await expect(
    fleet.locator('.fleet-order-toolbar .fleet-order-button').first(),
  ).toHaveClass(/decision-target/);
  await page.screenshot({
    path: testInfo.outputPath('fleet-decision-guidance.png'),
  });
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  await expect(guidance).toContainText('Choose a technology');
  await expect(
    page.getByRole('region', { name: 'Research tree', exact: true }),
  ).toHaveClass(/decision-target/);
  await page
    .getByRole('button', {
      name: 'Research Rocket engine factory',
      exact: true,
    })
    .click();
  await expect(guidance).toHaveCount(0);
  await expect(
    page.locator('[data-screen="research"] .nav-attention'),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Production', exact: true }).click();
  await expect(guidance).toContainText('queue a build');
  await expect(
    page.getByRole('button', { name: 'Show Iron mine', exact: true }),
  ).toHaveClass(/decision-target/);
  await expect(async () => {
    const help = (await guidance.boundingBox())!;
    const choices = await page.locator('.radial-build-option').all();
    for (const choice of choices) {
      const bounds = (await choice.boundingBox())!;
      expect(bounds.y).toBeGreaterThanOrEqual(help.y + help.height);
    }
  }).toPass();
  await page.screenshot({
    path: testInfo.outputPath('production-guidance.png'),
  });
  await page
    .getByRole('button', { name: 'Show Iron mine', exact: true })
    .dblclick();
  await expect(guidance).toHaveCount(0);
  await expect(
    page.locator('[data-screen="production"] .nav-attention'),
  ).toHaveCount(0);
});

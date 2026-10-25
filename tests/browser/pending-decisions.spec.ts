import { expect, test } from '@playwright/test';
import { domeProductionState } from '../fixtures/production-dome.js';
import { startFirstSlot } from './save-helpers.js';

test('beslut-vantar-pa-paborjad-atgard: queued Dome research removes production reminders across reload', async ({
  page,
}, testInfo) => {
  const state = domeProductionState(false);
  state.researchQueue = ['Desert dome'];
  state.colonies[1]![1].buildings.push({
    id: 'research',
    type: 'Research station',
    slotIndex: 1,
    demolition: false,
  });
  await page.addInitScript((saved) => {
    if (localStorage.getItem('spacelords.save.v2.1')) return;
    localStorage.setItem('spacelords.terraforming-v5-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-25T00:00:00Z', state: saved }),
    );
  }, state);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Production', exact: true }).click();
  await expect(page.locator('.production-guidance')).toHaveText(
    'Waiting for Desert dome research.',
  );
  await expect(
    page.locator('[data-screen="production"] .nav-attention'),
  ).toHaveCount(0);
  await expect(page.locator('.decision-guidance')).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath('dome-research-waiting.png'),
  });
  await page.getByRole('button', { name: /^Decisions/ }).click();
  await expect(
    page.locator('[data-decision-id="building-empty-sol-0"]'),
  ).toHaveCount(0);
  await page.reload();
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  await page.locator('.research-queue > summary').click();
  await page
    .getByRole('button', { name: 'Remove Desert dome', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Remove research', exact: true })
    .click();
  await expect(
    page.locator('[data-screen="production"] .nav-attention'),
  ).toHaveCount(1);
  await page.getByRole('button', { name: 'Production', exact: true }).click();
  await expect(page.locator('.decision-guidance')).toContainText(
    'choose production',
  );
  await expect(page.locator('.production-guidance')).toHaveText(
    'Research Desert dome before preparing a building site.',
  );
  await page.screenshot({
    path: testInfo.outputPath('dome-research-cancelled.png'),
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  expect(errors).toEqual([]);
});

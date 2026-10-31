import { expect, test } from '@playwright/test';
import { researchStationState } from '../fixtures/research-station.js';
import { startFirstSlot } from './save-helpers.js';

test('forskningsstatus-med-tydliga-farger: unresearched colors stay distinct from completed research, including selection', async ({
  page,
}, testInfo) => {
  await page.addInitScript(
    (state) => {
      localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
      localStorage.setItem(
        'spacelords.save.v2.1',
        JSON.stringify({ lastPlayed: '2026-10-31T12:00:00Z', state }),
      );
    },
    {
      ...researchStationState(),
      researched: ['Rocket engine factory', 'Telescope I factory'],
      researchQueue: ['Telescope II factory', 'Telescope III factory'],
    },
  );
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  const completed = page.locator('[data-technology="Rocket engine factory"]');
  const available = page.locator('[data-technology="Colony ship factory"]');
  const rgb = (value: string) => value.match(/[\d.]+/g)!.map(Number);
  const green = rgb(
    await completed.evaluate((node) => getComputedStyle(node).backgroundColor),
  );
  const blue = rgb(
    await available.evaluate((node) => getComputedStyle(node).backgroundColor),
  );
  expect(
    green[1]! - green[2]!,
    'Completed research is distinctly green',
  ).toBeGreaterThanOrEqual(15);
  expect(
    blue[2]! - blue[1]!,
    'Available research is distinctly blue',
  ).toBeGreaterThanOrEqual(15);
  for (const [type, state] of [
    ['Rocket engine factory', 'completed'],
    ['Colony ship factory', 'available'],
    ['Telescope II factory', 'active'],
    ['Telescope III factory', 'queued'],
    ['Fighter factory', 'locked'],
  ] as const) {
    const node = page.locator(`[data-technology="${type}"]`);
    await expect(node).toHaveAttribute('data-state', state);
    const button = node.locator('button');
    const background = await node.evaluate(
      (node) => getComputedStyle(node).backgroundColor,
    );
    if (state !== 'completed')
      expect(background).not.toBe(
        await completed.evaluate(
          (node) => getComputedStyle(node).backgroundColor,
        ),
      );
    await button.focus();
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    const selectedBackground = await button.evaluate(
      (node) => getComputedStyle(node).backgroundColor,
    );
    expect(selectedBackground, 'Selection preserves the status color').toBe(
      'rgba(0, 0, 0, 0)',
    );
    expect(
      await node.evaluate((node) => getComputedStyle(node).backgroundColor),
    ).toBe(background);
  }
  await available.locator('button').focus();
  await available.locator('button').click();
  await page.screenshot({
    path: testInfo.outputPath('research-status-colors.png'),
  });
});

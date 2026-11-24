import { scenarioTimeout } from '../../browser-timeouts.js';
import { expect, test } from '@playwright/test';
import { HexCoordinate } from '../../../src/client/common/HexCoordinate.js';
import { selectMapHex } from './map-helpers.js';
import { discoveryState } from '../../fixtures/exploration.js';
import type { SavedGame } from '../../../src/client/space-map/models/saves/SaveRepository.js';
import { startFirstSlot } from './save-helpers.js';
import { Game } from '../../../src/client/space-map/models/Game.js';

test('centrerade-handelseval-pa-dator / upptacktsbesked-utan-pausmening: event choices stay near the desktop map center when resized', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop-chromium',
    'Desktop positioning has a dedicated viewport check.',
  );
  const game = Game.restore(discoveryState());
  game.startTurn();
  while (game.phase === 'simulating') game.applyFrame(game.nextTurnFrame()!);
  await page.addInitScript((state) => {
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-30', state }),
    );
  }, game.exportState());
  await page.setViewportSize({ width: 1920, height: 1200 });
  await page.goto('./');
  await startFirstSlot(page);
  const notice = page.locator('.game-notice');
  await expect(notice).toBeVisible();
  await expect(notice).not.toContainText('Handle');
  await expect(
    page.getByRole('button', { name: 'Handle', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Ignore', exact: true }),
  ).toHaveCount(0);
  const box = (await notice.boundingBox())!;
  expect(box.y).toBeLessThan(160);
  await page.screenshot({
    path: testInfo.outputPath('centered-desktop-event.png'),
  });
});

test('gemensamt-handelseflode: event information and keyboard actions fit on small phones across rotation', async ({
  page,
}, testInfo) => {
  const game = Game.restore(discoveryState());
  game.startTurn();
  while (game.phase === 'simulating') game.applyFrame(game.nextTurnFrame()!);
  await page.addInitScript((state) => {
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-27', state }),
    );
  }, game.exportState());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await startFirstSlot(page);
  const notice = page.locator('.game-notice');
  await expect(notice).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Handle', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Ignore', exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth > innerWidth ||
        document.documentElement.scrollHeight > innerHeight,
    ),
  ).toBe(false);
  await page.screenshot({
    path: testInfo.outputPath('event-choice-320.png'),
  });
});

test('gemensamt-handelseflode / upptacktsavbrott / spara-avbrutet-ar / strid-i-samma-hex: a pirate contact pauses the round before combat and is saved', async ({
  page,
}) => {
  scenarioTimeout(120_000);
  await page.addInitScript((state) => {
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    if (!localStorage.getItem('spacelords.save.v2.1'))
      localStorage.setItem(
        'spacelords.save.v2.1',
        JSON.stringify({ lastPlayed: '2026-10-25T00:00:00Z', state }),
      );
  }, discoveryState());
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await startFirstSlot(page);
  // hexval-med-vag / strid-i-samma-hex: two taps send the fleet into the
  // pirate's hex, so the contact pauses the journey before the combat.
  const lair = discoveryState().pirates[0]!.position;
  const destination = new HexCoordinate(lair.q, lair.r);
  await selectMapHex(page, destination);
  await selectMapHex(page, destination);
  // Earlier discoveries are queued as notices before the pirate's.
  await expect(page.locator('.game-notice')).toContainText(
    'Pirate ship in sight',
    { timeout: 20_000 },
  );
  await expect(
    page.getByRole('button', { name: 'Handle', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Ignore', exact: true }),
  ).toHaveCount(0);
  const saved = async () =>
    (
      await page.evaluate(
        () =>
          JSON.parse(
            localStorage.getItem('spacelords.save.v2.1')!,
          ) as SavedGame,
      )
    ).state;
  // One read: the paused round may resume right after its notices.
  await expect
    .poll(async () => {
      const state = await saved();
      return (
        state.phase === 'interrupted' &&
        !!state.simulation?.discoveries?.some(
          (discovery) => discovery.kind === 'pirate',
        )
      );
    })
    .toBe(true);
  // spara-avbrutet-ar: the paused round survives a reload and goes on to
  // the combat in the pirate's hex (boarding outcomes are not part of this).
  await page.reload();
  await startFirstSlot(page);
  await expect(
    page.getByRole('dialog', { name: 'Tactical combat' }),
  ).toBeVisible({ timeout: 20_000 });
  expect((await saved()).fleets[0]!.position).toEqual(lair);
  expect(errors).toEqual([]);
});

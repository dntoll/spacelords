import { scenarioTimeout } from '../../browser-timeouts.js';
import { expect, test } from '@playwright/test';
import { HexCoordinate } from '../../../src/client/common/HexCoordinate.js';
import { selectMapHex } from './map-helpers.js';
import { discoveryState } from '../../fixtures/exploration.js';
import type { SavedGame } from '../../../src/client/space-map/models/saves/SaveRepository.js';
import { startFirstSlot, ignoreEventsUntil } from './save-helpers.js';
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

test('gemensamt-handelseflode / upptacktsavbrott / order-under-upptacktsavbrott / spara-avbrutet-ar / stridsresultat-utan-upprepning: a pirate contact pauses the round before combat and is saved', async ({
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
  // hexval-med-vag: two taps on the saved destination start the journey.
  const destination = new HexCoordinate(10, -4);
  await selectMapHex(page, destination);
  await selectMapHex(page, destination);
  await expect(
    page.getByRole('button', { name: 'Handle', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Ignore', exact: true }),
  ).toHaveCount(0);
  await ignoreEventsUntil(page);
  await expect(
    page.getByRole('dialog', { name: 'Battle report', exact: true }),
  ).toHaveCount(0);
  await expect
    .poll(async () => {
      const saved = await page.evaluate(
        () =>
          JSON.parse(
            localStorage.getItem('spacelords.save.v2.1')!,
          ) as SavedGame,
      );
      return saved.state.round;
    })
    .toBe(2);
  const completed = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as SavedGame,
  );
  const combatText = completed.state.events.find((event) =>
    event.text.startsWith('Combat at'),
  )!.text;
  expect(combatText.match(/Lost /g)).toHaveLength(1);
  expect(combatText.match(/Survivors:/g)).toHaveLength(1);
  expect(
    completed.state.events.filter((event) =>
      event.text.startsWith('Combat at'),
    ),
  ).toHaveLength(1);
  expect(errors).toEqual([]);
});

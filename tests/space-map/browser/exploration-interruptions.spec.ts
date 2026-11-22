import { scenarioTimeout } from '../../browser-timeouts.js';
import { expect, test } from '@playwright/test';
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
  const announcement = page.locator('.event-announcement-interactive');
  await expect(announcement).toHaveAttribute('data-stage', 'awaiting-choice');
  await expect(announcement).not.toContainText(
    'The round is paused. Fleets already sharing a hex will fight before the next movement.',
  );
  const eventId = await announcement.getAttribute('data-announcement-id');
  for (const viewport of [
    { width: 1920, height: 1200 },
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
  ]) {
    await page.setViewportSize(viewport);
    await expect
      .poll(async () => {
        const card = (await announcement.boundingBox())!;
        const map = (await page.getByTestId('map-container').boundingBox())!;
        const center = (card.y + card.height / 2 - map.y) / map.height;
        return (
          center > 0.35 &&
          center < 0.65 &&
          card.y + card.height <= map.y + map.height
        );
      })
      .toBe(true);
    await expect(
      announcement.getByRole('button', { name: 'Handle', exact: true }),
    ).toBeInViewport();
    await expect(
      announcement.getByRole('button', { name: 'Ignore', exact: true }),
    ).toBeInViewport();
  }
  await expect(announcement).toHaveAttribute('data-announcement-id', eventId!);
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
  const announcement = page.locator('.event-announcement-interactive');
  await expect(announcement).toHaveAttribute('data-stage', 'awaiting-choice');
  const eventId = await announcement.getAttribute('data-announcement-id');
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 667, height: 320 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(
      announcement.getByRole('button', { name: 'Handle', exact: true }),
    ).toBeInViewport();
    await expect(
      announcement.getByRole('button', { name: 'Ignore', exact: true }),
    ).toBeInViewport();
    await expect
      .poll(async () => {
        const card = (await announcement.boundingBox())!;
        const end = (await page
          .getByRole('button', { name: 'End turn', exact: true })
          .boundingBox())!;
        return (
          card.y + card.height <= end.y &&
          card.x >= 0 &&
          card.x + card.width <= viewport.width
        );
      })
      .toBe(true);
    for (const button of await announcement.getByRole('button').all()) {
      const box = (await button.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth > innerWidth ||
          document.documentElement.scrollHeight > innerHeight,
      ),
    ).toBe(false);
    await page.screenshot({
      path: testInfo.outputPath(`event-choice-${viewport.width}.png`),
    });
  }
  await expect(announcement).toHaveAttribute('data-announcement-id', eventId!);
  const ignore = announcement.getByRole('button', {
    name: 'Ignore',
    exact: true,
  });
  await ignore.focus();
  await ignore.press('Enter');
  await expect(announcement).not.toHaveAttribute(
    'data-announcement-id',
    eventId!,
  );
  const log = page.getByRole('log', { name: 'Game events' });
  await expect(log.locator(`[data-event-id="${eventId}"]`)).toHaveCount(1);
});

test('gemensamt-handelseflode / upptacktsavbrott / order-under-upptacktsavbrott / spara-avbrutet-ar / stridsresultat-utan-upprepning: a pirate contact pauses the round before combat and is saved', async ({
  page,
}, testInfo) => {
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
  await page.getByRole('button', { name: 'End turn', exact: true }).click();
  const announcement = page.locator('.event-announcement-interactive');
  await ignoreEventsUntil(page, announcement.filter({ hasText: 'Pirate' }));
  await expect(announcement).toHaveAttribute('data-stage', 'awaiting-choice');
  await expect(announcement).toContainText('Pirate');
  const checkpoint = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as SavedGame,
  );
  expect(checkpoint.state.phase).toBe('interrupted');
  expect(
    checkpoint.state.events.some((event) => event.text.startsWith('Combat at')),
  ).toBe(false);
  await page.reload();
  await startFirstSlot(page);
  await expect(announcement).toHaveAttribute('data-stage', 'awaiting-choice');
  await announcement
    .getByRole('button', { name: 'Handle', exact: true })
    .click();
  const controls = page.getByRole('region', {
    name: 'Interrupted round',
    exact: true,
  });
  await expect(controls).toContainText('Round 1 paused');
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(
    controls.getByRole('button', { name: 'Continue', exact: true }),
  ).toBeInViewport();
  await page.reload();
  await startFirstSlot(page);
  await expect(announcement).toHaveCount(0);
  await expect(controls).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('discovery-handling.png'),
  });
  await controls.getByRole('button', { name: 'Continue', exact: true }).click();
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

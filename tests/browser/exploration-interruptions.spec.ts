import { expect, test } from '@playwright/test';
import { discoveryState } from '../fixtures/exploration.js';
import type { SavedGame } from '../../src/client/models/SaveRepository.js';
import { startFirstSlot, endTurn, ignoreEventsUntil } from './save-helpers.js';
import { selectMapFleet } from './fleet-helpers.js';
import { Game } from '../../src/client/models/Game.js';

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

test('gemensamt-handelseflode / upptacktsavbrott / order-under-upptacktsavbrott / spara-avbrutet-ar: Handle edits another fleet, reload restores the pause and Continue resolves contact once', async ({
  page,
}, testInfo) => {
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
  await page.getByRole('button', { name: /^Decisions/ }).click();
  await page.getByRole('button', { name: 'End turn', exact: true }).click();
  const warning = page.getByRole('dialog', { name: 'Decisions remaining' });
  if (await warning.isVisible())
    await warning
      .getByRole('button', { name: 'End turn anyway', exact: true })
      .click();
  const dialog = page.getByRole('dialog', {
    name: 'Wreck discovered',
    exact: true,
  });
  await expect(dialog).toBeVisible();
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
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Handle', exact: true }).click();
  const controls = page.getByRole('region', {
    name: 'Interrupted year',
    exact: true,
  });
  await expect(controls).toContainText('Home Fleet · 2 hex remaining');
  await page.setViewportSize({ width: 844, height: 390 });
  await controls
    .getByRole('button', { name: 'Give orders to other fleets', exact: true })
    .click();
  await controls
    .getByRole('combobox', { name: 'Fleet to give orders', exact: true })
    .selectOption('other');
  await page
    .getByRole('button', { name: 'Choose destination for Other', exact: true })
    .click();
  await page
    .getByRole('combobox', { name: 'Destination hex', exact: true })
    .selectOption('2,0');
  await expect(
    controls.getByRole('button', { name: 'Continue', exact: true }),
  ).toBeInViewport();
  await page.reload();
  await startFirstSlot(page);
  await expect(dialog).toHaveCount(0);
  await expect(controls).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('discovery-handling.png'),
  });
  await controls.getByRole('button', { name: 'Continue', exact: true }).click();
  await ignoreEventsUntil(
    page,
    page.getByRole('dialog', { name: 'Battle report', exact: true }),
  );
  await expect(
    page.getByRole('dialog', { name: 'Battle report', exact: true }),
  ).toContainText('wrecks remain');
  await ignoreEventsUntil(page);
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
  expect(
    completed.state.fleets.find((fleet) => fleet.id === 'other')!.position,
  ).toEqual({ q: 2, r: 0 });
  expect(
    completed.state.events.filter((event) =>
      event.text.startsWith('Combat at'),
    ),
  ).toHaveLength(1);
  expect(errors).toEqual([]);
});

test('automatisk-stjarnutforskning / flottorder-som-symboler: explores persistently from the compact card and saves the order', async ({
  page,
}) => {
  await page.goto('./');
  await startFirstSlot(page);
  await selectMapFleet(page);
  const explore = page.getByRole('button', {
    name: 'Explore stars',
    exact: true,
  });
  await explore.click();
  await expect(explore).toHaveAttribute('aria-pressed', 'true');
  await endTurn(page);
  const saved = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as SavedGame,
  );
  expect(saved.state.fleets[0]!.exploration).toBe('explore-stars');
  expect(saved.state.explored.length).toBeGreaterThan(7);
  await page.reload();
  await startFirstSlot(page);
  await selectMapFleet(page);
  await expect(explore).toHaveAttribute('aria-pressed', 'true');
});

test('produktionsorder-aterkoppling: double-click gives a visible receipt while the queue is below the selected details', async ({
  page,
}) => {
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Production', exact: true }).click();
  await page
    .getByRole('button', { name: 'Show Research station', exact: true })
    .dblclick();
  const receipt = page.locator('.production-receipt[role="status"]');
  await expect(receipt).toHaveText('Queued Research station · #1');
  await expect(receipt).toBeInViewport();
  const saved = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as SavedGame,
  );
  expect(saved.state.colonies[0]![1].projects).toHaveLength(1);
  await expect(receipt).toHaveCount(0, { timeout: 5000 });
});

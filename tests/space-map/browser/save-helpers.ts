import { finishTacticalCombat } from './battle-helpers.js';
import { expect, type Page, type Locator } from '@playwright/test';
import {
  PREREQUISITES,
  TECHNOLOGIES,
} from '../../../src/client/space-map/models/research/Research.js';
import {
  Game,
  type GameState,
} from '../../../src/client/space-map/models/Game.js';
import { HexCoordinate } from '../../../src/client/common/HexCoordinate.js';
import type { SavedGame } from '../../../src/client/space-map/models/saves/SaveRepository.js';
import { selectMapHex } from './map-helpers.js';

export async function chooseResearch(
  page: Page,
  technology: string,
): Promise<void> {
  const target = TECHNOLOGIES.find((type) => type === technology);
  if (!target) throw new Error(`Unknown research: ${technology}`);
  const saved = () =>
    page.evaluate(() => {
      const slot = JSON.parse(
        localStorage.getItem('spacelords.save.v2.1')!,
      ) as { state: GameState };
      return {
        completed: slot.state.researched,
        queue: slot.state.researchQueue,
      };
    });
  const state = await saved();
  if (state.completed.includes(target) || state.queue.includes(target)) return;
  // forskningens-avslojande: campaigns research through the visible frontier.
  for (const prerequisite of PREREQUISITES[target]) {
    if ((await saved()).completed.includes(prerequisite)) continue;
    await chooseResearch(page, prerequisite);
    for (
      let turn = 0;
      !(await saved()).completed.includes(prerequisite);
      turn++
    ) {
      if (turn >= TECHNOLOGIES.length)
        throw new Error(`Research stalled: ${prerequisite}`);
      await finishRound(page);
    }
  }
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'Research', exact: true })
    .click();
  const inspect = page.getByRole('button', {
    name: `Inspect ${technology}`,
    exact: true,
  });
  await inspect.focus();
  await inspect.click();
  const choose = page.getByRole('button', {
    name: `Research ${technology}`,
    exact: true,
  });
  await choose.focus();
  await choose.click();
}

/** Stores a saved game in slot 1 before the page loads and starts it. */
export async function seedGame(page: Page, state: GameState): Promise<void> {
  await page.addInitScript((saved) => {
    if (!localStorage.getItem('spacelords.save.v2.1'))
      localStorage.setItem(
        'spacelords.save.v2.1',
        JSON.stringify({ lastPlayed: '2026-11-22T00:00:00Z', state: saved }),
      );
  }, state);
  await page.goto('./');
  await startFirstSlot(page);
}

export async function startFirstSlot(page: Page): Promise<void> {
  await page
    .getByRole('article', { name: 'Save slot 1', exact: true })
    .getByRole('button', { name: /Start game|Continue game/ })
    .click();
}

/**
 * ap-pa-starmap: there is no End turn, so a round ends when the fleet spends
 * its AP. Send it further than its AP reach and wait for the next round.
 */
export async function finishRound(page: Page): Promise<void> {
  const saved = async () =>
    (
      await page.evaluate(
        () =>
          JSON.parse(
            localStorage.getItem('spacelords.save.v2.1')!,
          ) as SavedGame,
      )
    ).state;
  const state = await saved();
  const game = Game.restore(state);
  const fleet = game.fleetSnapshot();
  if (!fleet?.position) throw new Error('No fleet can travel.');
  const reach = (fleet.actionPoints ?? fleet.speed) + 1;
  const target = HexCoordinate.disk(reach + 3)
    .map(
      (offset) =>
        new HexCoordinate(
          fleet.position!.q + offset.q,
          fleet.position!.r + offset.r,
        ),
    )
    .filter(
      (hex) =>
        fleet.position!.distanceTo(hex) >= reach &&
        game.routePreview(fleet.id, hex).length >= reach,
    )
    // The nearest such hex stays in view on small screens. Among those,
    // heading inward keeps repeated rounds away from the galaxy's edge.
    .sort(
      (a, b) =>
        fleet.position!.distanceTo(a) - fleet.position!.distanceTo(b) ||
        a.distanceTo(new HexCoordinate(0, 0)) -
          b.distanceTo(new HexCoordinate(0, 0)),
    )[0];
  if (!target) throw new Error('No hex beyond the fleet’s AP.');
  await selectMapHex(page, target);
  await selectMapHex(page, target);
  for (let wait = 0; wait < 200; wait++) {
    if ((await saved()).round > state.round) break;
    await ignoreEventsUntil(page);
  }
  await expect
    .poll(async () => (await saved()).round)
    .toBeGreaterThan(state.round);
  await expect(page.locator('[data-turn-idle="true"]')).toHaveCount(1);
}

/** gemensamt-handelseflode: acknowledge individual events until the requested checkpoint. */
export async function ignoreEventsUntil(
  page: Page,
  stop?: Locator,
): Promise<void> {
  for (let count = 0; count < 128; count++) {
    const status = async () => {
      if (stop && (await stop.isVisible())) return 'stop';
      if (
        await page.getByRole('dialog', { name: 'Tactical combat' }).isVisible()
      )
        return 'battle';
      if (
        await page
          .locator('.event-announcement[data-stage="awaiting-choice"]')
          .isVisible()
      )
        return 'event';
      const noticeText =
        // textContent() would wait for a notice that may never appear.
        (await page.locator('.game-notice').allTextContents()).join(' ');
      if (
        /Pirate ship in sight|Star explored|Planet discovered|Planet explored|Wreck discovered/.test(
          noticeText,
        )
      )
        return 'discovery';
      return (await page.locator('[data-turn-idle="true"]').count())
        ? 'planning'
        : 'running';
    };
    await expect.poll(status, { timeout: 25000 }).not.toBe('running');
    if ((await status()) === 'battle') {
      await finishTacticalCombat(page);
      continue;
    }
    if ((await status()) === 'discovery') {
      const text = (await page.locator('.game-notice').allTextContents()).join(
        ' ',
      );
      const destination = text.includes('Pirate ship in sight')
        ? null
        : await pausedDestination(page);
      if (!destination) {
        // Queued notices follow each other and an interrupted round without
        // a destination resumes by itself, so wait for this one to go.
        await expect
          .poll(
            async () =>
              (await page.locator('.game-notice').allTextContents()).join(' '),
            { timeout: 8000 },
          )
          .not.toBe(text);
        continue;
      }
      // upptackt-stannar-resan: the destination is still selected, so one
      // tap on it continues the round.
      await selectMapHex(page, destination);
      continue;
    }
    if ((await status()) !== 'event') return;
    const announcement = page.locator(
      '.event-announcement[data-stage="awaiting-choice"]',
    );
    const id = await announcement.getAttribute('data-announcement-id');
    await announcement
      .getByRole('button', { name: 'Ignore', exact: true })
      .click();
    await expect(
      page.locator(
        `.event-announcement[data-announcement-id="${id}"][data-stage="awaiting-choice"]`,
      ),
    ).toHaveCount(0);
  }
  throw new Error('Event review did not complete.');
}

async function pausedDestination(page: Page): Promise<HexCoordinate | null> {
  const state = (
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as SavedGame,
    )
  ).state;
  const destination = state.fleets.find(
    (fleet) => fleet.destination,
  )?.destination;
  return destination ? new HexCoordinate(destination.q, destination.r) : null;
}

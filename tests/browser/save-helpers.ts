import { finishTacticalCombat } from './battle-helpers.js';
import { selectMapFleet } from './fleet-helpers.js';
import { selectMapObject } from './map-helpers.js';
import { expect, type Page, type Locator } from '@playwright/test';
import {
  PREREQUISITES,
  TECHNOLOGIES,
} from '../../src/client/models/Research.js';
import type { GameState } from '../../src/client/models/Game.js';

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
        recovered: slot.state.recoveredResearch ?? [],
      };
    });
  const state = await saved();
  if (state.completed.includes(target) || state.queue.includes(target)) return;
  // forskningens-avslojande: campaigns research through the visible frontier.
  if (!state.recovered.includes(target))
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
        await endTurn(page);
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

export async function connectTradePlanets(
  page: Page,
  from: string,
  to: string,
): Promise<void> {
  await page.getByRole('button', { name: 'Star map', exact: true }).click();
  await selectMapObject(page, from);
  await page.locator('canvas[data-rendered="true"]').press('r');
  await selectMapObject(page, to);
}

export async function startFirstSlot(page: Page): Promise<void> {
  await page
    .getByRole('article', { name: 'Save slot 1', exact: true })
    .getByRole('button', { name: /Start game|Continue game/ })
    .click();
}

export async function assignFleetToRoute(
  page: Page,
  fleet: string,
  from: string,
  to: string,
): Promise<void> {
  await page.getByRole('button', { name: 'Star map', exact: true }).click();
  await selectMapFleet(page, fleet);
  const card = page.locator('.map-fleet-cards .selected-fleet-card');
  const routes = card.locator('.fleet-route-menu > summary');
  await routes.focus();
  await routes.press('Enter');
  const assign = card.getByRole('button', {
    name: `Assign ${fleet} to ${from} to ${to}`,
    exact: true,
  });
  await assign.focus();
  await assign.press('Enter');
}

export async function endTurn(page: Page): Promise<void> {
  const onMap = (await page.locator('.map-page').count()) > 0;
  if (
    !(await page
      .getByRole('button', { name: 'End turn', exact: true })
      .isVisible())
  )
    await page.getByRole('button', { name: /^Decisions/ }).click();
  await page.getByRole('button', { name: 'End turn', exact: true }).click();
  const warning = page.getByRole('dialog', { name: 'Decisions remaining' });
  if (await warning.isVisible())
    await warning
      .getByRole('button', { name: 'End turn anyway', exact: true })
      .click();
  await ignoreEventsUntil(page);
  await expect(
    page.getByRole('button', { name: 'End turn', exact: true }),
  ).toBeEnabled();
  if (onMap && !(await page.locator('.map-page').count()))
    await page.getByRole('button', { name: 'Star map', exact: true }).click();
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
      return (await page
        .getByRole('button', { name: 'End turn', exact: true })
        .isEnabled())
        ? 'planning'
        : 'running';
    };
    await expect.poll(status, { timeout: 25000 }).not.toBe('running');
    if ((await status()) === 'battle') {
      await finishTacticalCombat(page);
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

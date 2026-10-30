import { expect, test } from '@playwright/test';
import { Game } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import type { SavedGame } from '../../src/client/models/SaveRepository.js';
import { selectMapFleet } from './fleet-helpers.js';
import { endTurn, startFirstSlot } from './save-helpers.js';

for (const screen of ['Star map', 'Fleets']) {
  test(`flottpatrullering: ${screen} patrols, persists and cancels with compact accessible controls`, async ({
    page,
  }, testInfo) => {
    const state = {
      ...new Game(createExampleGalaxy()).exportState(),
      researched: ['Fleet patrol'] as const,
    };
    await page.addInitScript(
      (state) => {
        localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
        if (!localStorage.getItem('spacelords.save.v2.1'))
          localStorage.setItem(
            'spacelords.save.v2.1',
            JSON.stringify({ lastPlayed: '2026-10-25T00:00:00Z', state }),
          );
      },
      { ...state, pirates: [] },
    );
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('./');
    await startFirstSlot(page);
    await page.getByRole('button', { name: screen, exact: true }).click();
    await selectMapFleet(page);
    const card = page.locator('.selected-fleet-card');
    const patrol = card.getByRole('button', { name: 'Patrol', exact: true });
    await patrol.click();
    await expect(patrol).toHaveAttribute('aria-pressed', 'true');
    await expect(card).toHaveAttribute(
      'aria-description',
      /Patrol: range 3 hex/,
    );
    await expect(card.locator('.fleet-patrol-status')).toHaveText(
      'Patrol · R: 3',
    );
    const bounds = await patrol.boundingBox();
    expect(bounds!.width).toBeGreaterThanOrEqual(44);
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    expect((await card.boundingBox())!.height).toBeLessThanOrEqual(140);
    await endTurn(page);
    const record = await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as SavedGame,
    );
    expect(record.state.fleets[0]!.position).toEqual({ q: 1, r: -1 });
    expect(record.state.fleets[0]!.patrol?.center).toEqual({ q: 1, r: 0 });
    await page.reload();
    await startFirstSlot(page);
    await page.getByRole('button', { name: screen, exact: true }).click();
    await selectMapFleet(page);
    await expect(patrol).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({ path: testInfo.outputPath('fleet-patrol.png') });
    await card
      .getByRole('button', { name: 'Cancel patrol', exact: true })
      .click();
    await expect(patrol).toHaveAttribute('aria-pressed', 'false');
    const stopped = await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as SavedGame,
    );
    expect(stopped.state.fleets[0]!.patrol).toBeUndefined();
    expect(stopped.state.fleets[0]!.destination).toBeNull();
    expect(errors).toEqual([]);
  });
}

test('flottpatrullering: uses shared sight to catch a pirate, resumes its ring, and persists combat', async ({
  page,
}) => {
  const state = {
    ...new Game(createExampleGalaxy()).exportState(),
    researched: ['Fleet patrol'] as const,
  };
  const fighter = {
    ...state.fleets[0]!,
    position: { q: 5, r: -3 },
    ships: {
      Fighter: 1,
      'Exploration ship': 0,
      'Colony ship': 0,
      'Transport ship': 0,
      'Civilian shuttle': 0,
      'Salvage ship': 0,
    },
    shipUnits: [
      {
        id: 'fighter',
        type: 'Fighter' as const,
        engines: { 'Rocket engine': 1, 'Ion pulse engine': 0 },
      },
    ],
  };
  const prepared = {
    ...state,
    pirates: [
      {
        id: 'pirate-nadir',
        systemId: 'nadir',
        position: { q: 7, r: -4 },
        count: 1,
      },
    ],
    fleets: [
      fighter,
      {
        ...state.fleets[0]!,
        id: 'observer',
        name: 'Observer',
        position: { q: 7, r: -4 },
        ships: { ...fighter.ships, Fighter: 0, 'Exploration ship': 1 },
        shipUnits: [
          {
            id: 'observer-ship',
            type: 'Exploration ship' as const,
            telescope: 3 as const,
            engines: { 'Rocket engine': 2, 'Ion pulse engine': 0 },
          },
        ],
      },
    ],
  };
  await page.addInitScript((state) => {
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    if (!localStorage.getItem('spacelords.save.v2.1'))
      localStorage.setItem(
        'spacelords.save.v2.1',
        JSON.stringify({ lastPlayed: '2026-10-25T00:00:00Z', state }),
      );
  }, prepared);
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  await selectMapFleet(page);
  await page
    .locator('.selected-fleet-card')
    .getByRole('button', { name: 'Patrol', exact: true })
    .click();
  await expect(page.locator('.selected-fleet-card')).toHaveAttribute(
    'aria-description',
    /pursuing Space pirate/,
  );
  await endTurn(page);
  const saved = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as SavedGame,
  );
  expect(saved.state.pirates).toEqual([]);
  expect(saved.state.fleets[0]!.ships.Fighter).toBe(1);
  expect(saved.state.fleets[0]!.patrol?.center).toEqual({ q: 5, r: -3 });
  expect(saved.state.fleets[0]!.patrol?.targetPirateId).toBeUndefined();
  expect(
    saved.state.events.some((event) => event.text.startsWith('Combat at HEX')),
  ).toBe(true);
  await page.reload();
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  await selectMapFleet(page);
  await expect(
    page
      .locator('.selected-fleet-card')
      .getByRole('button', { name: 'Patrol', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
});

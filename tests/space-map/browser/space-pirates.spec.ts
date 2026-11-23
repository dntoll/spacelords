import { scenarioTimeout } from '../../browser-timeouts.js';
import { expect, test } from '@playwright/test';
import { Game } from '../../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';
import { pirateAsFleet } from '../../../src/client/space-map/models/PirateFleet.js';
import { FleetMapLayout } from '../../../src/client/space-map/models/star-map/FleetMapLayout.js';
import { selectMapPoint } from './map-helpers.js';
import {
  finishRound,
  ignoreEventsUntil,
  startFirstSlot,
} from './save-helpers.js';
import { HexCoordinate } from '../../../src/client/common/HexCoordinate.js';
import type { SavedGame } from '../../../src/client/space-map/models/saves/SaveRepository.js';

for (const screen of ['Star map', 'Fleets']) {
  test(`rymdpirater-per-stjarna / flottstrid-per-hex / rymdpiraters-sparning: ${screen} shows hostile read-only pirates and persists combat`, async ({
    page,
  }, testInfo) => {
    scenarioTimeout(60_000);
    const state = new Game(createExampleGalaxy()).exportState();
    const fleet = state.fleets[0]!;
    const system = createExampleGalaxy().systems[1]!;
    const pirates = state
      .pirates!.filter((pirate) => pirate.systemId === 'nadir')
      .map((pirate) => ({ ...pirate, transports: 0 }));
    const lair = new HexCoordinate(
      pirates[0]!.position.q,
      pirates[0]!.position.r,
    );
    // strid-i-samma-hex: the fleet starts next to the pirate and enters its hex.
    const start = lair
      .neighbors()
      .find((hex) => Game.restore(state).galaxy.isPassable(hex))!;
    const prepared = {
      ...state,
      pirates,
      // Fighters have no telescope, so the pirate is already charted.
      chartedPirates: ['pirate-nadir'],
      explored: [
        ...state.explored,
        ...system.star.position.neighbors().map((position) => position.key),
      ],
      fleets: [
        {
          ...fleet,
          position: { q: start.q, r: start.r },
          // Armed ships only, so the pirate has nothing unarmed to board.
          ships: { ...fleet.ships, Fighter: 3, 'Exploration ship': 0 },
          shipUnits: [1, 2, 3].map((copy) => ({
            ...fleet.shipUnits!.find((unit) => unit.type === 'Fighter')!,
            id: `escort-${copy}`,
          })),
        },
      ],
    };
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript((state) => {
      localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
      if (!localStorage.getItem('spacelords.save.v2.1'))
        localStorage.setItem(
          'spacelords.save.v2.1',
          JSON.stringify({ lastPlayed: '2026-10-24T00:00:00Z', state }),
        );
    }, prepared);
    await page.goto('./');
    await startFirstSlot(page);
    if (screen === 'Fleets')
      await page.getByRole('button', { name: 'Fleets', exact: true }).click();
    const game = Game.restore(prepared);
    const marker = FleetMapLayout.markers([
      game.fleetSnapshot(),
      ...game.pirateSnapshots().map(pirateAsFleet),
    ]).find((marker) => marker.fleet.id === 'pirate-nadir')!;
    await selectMapPoint(page, marker.point);
    const pirate = page.getByRole('article', {
      name: 'Space pirate',
      exact: true,
    });
    await expect(pirate).toBeVisible();
    await expect(
      pirate.getByRole('img', { name: 'Space pirate', exact: true }),
    ).toBeVisible();
    await expect(pirate).toContainText('Hostile');
    await expect(
      pirate.locator('button, input, select, [draggable="true"]'),
    ).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('space-pirate.png') });
    // A second tap on the selected pirate travels into its hex.
    await selectMapPoint(page, marker.point);
    await ignoreEventsUntil(page);
    const saved = await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as SavedGame,
    );
    expect(saved.state.pirates).toEqual([]);
    // rymdpiraters-sparning: the combat outcome depends on the tactical
    // battle, so check that whatever survived is what the save keeps.
    const fighters = saved.state.fleets[0]?.ships.Fighter ?? 0;
    expect(fighters).toBeLessThanOrEqual(3);
    // stridsresultat-utan-upprepning: one report, with each part once.
    const combats = saved.state.events.filter((event) =>
      event.text.startsWith("Combat:"),
    );
    expect(combats).toHaveLength(1);
    expect(combats[0]!.text.match(/Survivors:/g)).toHaveLength(1);
    await page.locator('.turn-console > summary').click();
    await expect(page.locator('[role="log"]')).toContainText(
      'versus Space pirate',
    );
    await expect(page.locator('[role="log"] .combat-event-log')).toHaveCount(1);
    await finishRound(page);
    await page.reload();
    await startFirstSlot(page);
    const reloaded = await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as SavedGame,
    );
    expect(reloaded.state.pirates).toEqual([]);
    expect(reloaded.state.round).toBe(2);
    expect(reloaded.state.fleets[0]?.ships.Fighter ?? 0).toBe(fighters);
    expect(errors).toEqual([]);
  });
}

test('piratflotta-med-lastfartyg: the pirate panel lists a transport and its cargo hold', async ({
  page,
}) => {
  const state = new Game(createExampleGalaxy()).exportState();
  const system = createExampleGalaxy().systems[1]!;
  const prepared = {
    ...state,
    pirates: state.pirates!.filter((pirate) => pirate.systemId === 'nadir'),
    chartedPirates: ['pirate-nadir'],
    explored: [
      ...state.explored,
      ...system.star.position.neighbors().map((position) => position.key),
    ],
    fleets: [{ ...state.fleets[0]!, position: { q: 0, r: 0 } }],
  };
  await page.addInitScript((state) => {
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    if (!localStorage.getItem('spacelords.save.v2.1'))
      localStorage.setItem(
        'spacelords.save.v2.1',
        JSON.stringify({ lastPlayed: '2026-10-24T00:00:00Z', state }),
      );
  }, prepared);
  await page.goto('./');
  await startFirstSlot(page);
  const game = Game.restore(prepared);
  const marker = FleetMapLayout.markers([
    game.fleetSnapshot(),
    ...game.pirateSnapshots().map(pirateAsFleet),
  ]).find((marker) => marker.fleet.id === 'pirate-nadir')!;
  await selectMapPoint(page, marker.point);
  const pirate = page.getByRole('article', {
    name: 'Space pirate',
    exact: true,
  });
  await expect(pirate).toBeVisible();
  await expect(pirate).toContainText('1 transport');
  await expect(pirate).toContainText('Cargo hold aboard the transport');
});

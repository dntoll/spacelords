import { HexCoordinate } from '../../../src/client/common/HexCoordinate.js';
import { selectMapHex } from './map-helpers.js';
import { expect, test, type Page } from '@playwright/test';
import {
  Game,
  type GameState,
} from '../../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';
import { FleetMapLayout } from '../../../src/client/space-map/models/star-map/FleetMapLayout.js';
import { pirateAsFleet } from '../../../src/client/space-map/models/PirateFleet.js';
import { selectMapPoint } from './map-helpers.js';
import { selectMapFleet } from './fleet-helpers.js';
import { endTurn, startFirstSlot } from './save-helpers.js';
import type { SavedGame } from '../../../src/client/space-map/models/saves/SaveRepository.js';

async function load(page: Page, state: GameState) {
  await page.addInitScript((state) => {
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    if (!localStorage.getItem('spacelords.save.v2.1'))
      localStorage.setItem(
        'spacelords.save.v2.1',
        JSON.stringify({ lastPlayed: '2026-10-25T12:00:00Z', state }),
      );
  }, state);
  await page.goto('./');
  await startFirstSlot(page);
}

async function saved(page: Page) {
  return page.evaluate(
    () =>
      (JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as SavedGame)
        .state,
  );
}

test('aktuell-detektionssikt / kartans-sikttillstand: losing sight removes pirate inspection while retaining explored hexes', async ({
  page,
}, testInfo) => {
  const state = new Game(createExampleGalaxy()).exportState();
  const prepared = {
    ...state,
    explored: [...state.explored, '3,2'],
    fleets: [{ ...state.fleets[0]!, position: { q: 8, r: -4 } }],
  };
  const game = Game.restore(prepared);
  const marker = FleetMapLayout.markers([
    ...game.fleetSnapshots(),
    ...game.pirateSnapshots().map(pirateAsFleet),
  ]).find((marker) => marker.fleet.id === 'pirate-nadir')!;
  await load(page, prepared);
  await selectMapPoint(page, marker.point);
  await expect(
    page.getByRole('article', { name: 'Space pirate', exact: true }),
  ).toBeVisible();
  await selectMapFleet(page);
  await page
    .getByRole('button', {
      name: 'Choose destination for Home Fleet',
      exact: true,
    })
    .click();
  await selectMapHex(page, new HexCoordinate(10, -4));
  await endTurn(page);
  // The pirate's former hex is still selected; tapping it again would travel
  // there (hexval-med-vag), so inspect the selection as it is.
  await expect(
    page.getByRole('article', { name: 'Space pirate', exact: true }),
  ).toHaveCount(0);
  const after = Game.restore(await saved(page));
  expect(after.pirateSnapshots()).toEqual([]);
  expect(
    after.mapSnapshot().find((cell) => cell.position.key === '8,-3'),
  ).toMatchObject({ explored: true, visible: false });
  expect(after.mapSnapshot().some((cell) => !cell.explored)).toBe(true);
  await expect(page.locator('canvas[data-rendered="true"]')).toHaveAttribute(
    'aria-description',
    /Dim hexes were explored earlier/,
  );
  await page.screenshot({
    path: testInfo.outputPath('current-sight-and-memory.png'),
  });
});

import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
import { selectMapHex } from './map-helpers.js';
import { expect, test, type Page } from '@playwright/test';
import { Game, type GameState } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import { FleetMapLayout } from '../../src/client/models/FleetMapLayout.js';
import { pirateAsFleet } from '../../src/client/models/PirateFleet.js';
import { selectMapPoint } from './map-helpers.js';
import { selectMapFleet } from './fleet-helpers.js';
import { endTurn, startFirstSlot, ignoreEventsUntil } from './save-helpers.js';
import type { SavedGame } from '../../src/client/models/SaveRepository.js';

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
  await selectMapPoint(page, marker.point);
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

test('teleskopfabriker / teleskop-i-exploration-ships: manufacture the best telescope and preserve individual levels after reload', async ({
  page,
}, testInfo) => {
  const state = new Game(createExampleGalaxy()).exportState();
  const colony = state.colonies[0]![1];
  colony.stock['Rocket engine'] = 2;
  colony.buildings.push(
    {
      id: 'yard',
      type: 'Exploration ship factory',
      slotIndex: 0,
      demolition: false,
    },
    {
      id: 'telescope',
      type: 'Telescope III factory',
      slotIndex: 1,
      demolition: false,
    },
  );
  await load(page, state);
  await page.getByRole('button', { name: 'Production', exact: true }).click();
  await page
    .getByRole('button', { name: 'Next build options', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Show Exploration ship', exact: true })
    .dblclick();
  let current = await saved(page);
  expect(
    current.colonies[0]![1].projects.map((project) => project.type),
  ).toEqual(['Telescope III', 'Exploration ship']);
  expect(current.colonies[0]![1].projects[1]!.parts!['Telescope III']).toBe(1);
  await endTurn(page);
  await endTurn(page);
  await page.reload();
  await startFirstSlot(page);
  current = await saved(page);
  expect(
    current.fleets[0]!.shipUnits!.filter(
      (ship) => ship.type === 'Exploration ship',
    ).map((ship) => ship.telescope),
  ).toEqual([1, 3]);
  await selectMapFleet(page);
  await expect(page.locator('.selected-fleet-card')).toContainText('D: 3 hex');
  const card = page.locator('.selected-fleet-card');
  expect((await card.boundingBox())!.height).toBeLessThanOrEqual(140);
  await page.screenshot({ path: testInfo.outputPath('telescope-fleet.png') });
});

test('spara-avbrutet-ar / aktuell-detektionssikt: an obsolete saved pirate warning becomes a resumable pause', async ({
  page,
}) => {
  const state = new Game(createExampleGalaxy()).exportState();
  await load(page, {
    ...state,
    version: 8,
    phase: 'interrupted',
    knownObjects: [...state.knownObjects!, 'nadir-0', 'pirate-nadir'],
    explored: [...state.explored, '8,-3'],
    simulation: {
      remaining: [
        ['fleet-home', 2],
        ['pirate-nadir', 0],
        ['pirate-aster', 0],
      ],
      awaitingCombat: true,
      handling: false,
      otherFleets: false,
      discoveries: [
        {
          id: 'pirate-nadir',
          kind: 'pirate',
          name: 'Space pirate',
          position: { q: 8, r: -3 },
          fleetId: null,
        },
      ],
    },
  });
  await expect(
    page.getByRole('dialog', { name: 'Pirate ship in sight', exact: true }),
  ).toHaveCount(0);
  const controls = page.getByRole('region', {
    name: 'Interrupted year',
    exact: true,
  });
  await expect(controls).toBeVisible();
  await controls.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect.poll(async () => (await saved(page)).phase).toBe('planning');
  expect((await saved(page)).round).toBe(2);
});

test('upptacktsavbrott / spara-avbrutet-ar: reload a year-end discovery without repeating production', async ({
  page,
}) => {
  const state = new Game(createExampleGalaxy()).exportState();
  state.colonies[0]![1].projects.push({
    id: 'detection-factory',
    type: 'Telescope II factory',
    slotIndex: 0,
    factoryId: null,
    destinationFleetId: null,
  });
  await load(page, state);
  await page.getByRole('button', { name: /^Decisions/ }).click();
  await page.getByRole('button', { name: 'End turn', exact: true }).click();
  const warning = page.getByRole('dialog', { name: 'Decisions remaining' });
  if (await warning.isVisible())
    await warning
      .getByRole('button', { name: 'End turn anyway', exact: true })
      .click();
  const dialog = page.getByRole('dialog', {
    name: 'Planet discovered',
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('No movement remains this year');
  const checkpoint = await saved(page);
  expect(checkpoint.simulation!.economyApplied).toBe(true);
  await page.reload();
  await startFirstSlot(page);
  await expect(dialog).toBeVisible();
  await ignoreEventsUntil(page);
  await expect.poll(async () => (await saved(page)).phase).toBe('planning');
  const after = await saved(page);
  expect(after.round).toBe(2);
  expect(after.colonies).toEqual(checkpoint.colonies);
});

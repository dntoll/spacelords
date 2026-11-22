import { expect, test } from '@playwright/test';
import { startFirstSlot } from './save-helpers.js';
import { selectMapHex } from './map-helpers.js';
import { Game } from '../../../src/client/space-map/models/Game.js';
import { Galaxy } from '../../../src/client/space-map/models/Galaxy.js';
import { HexCoordinate } from '../../../src/client/common/HexCoordinate.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';

test('asteroidbalten / nebulosornas-sikt: discovered terrain explains movement and concealment', async ({
  page,
}, testInfo) => {
  const example = createExampleGalaxy();
  const state = new Game(
    new Galaxy(example.player, example.systems, example.homePlanet.id, 10, [
      { position: { q: 5, r: -3 }, type: 'nebula' },
      { position: { q: 3, r: -3 }, type: 'dense-asteroids' },
      { position: { q: 3, r: -2 }, type: 'sparse-asteroids' },
    ]),
  ).exportState();
  const fixture = Game.restore({
    ...state,
    pirates: [
      {
        id: 'pirate-nadir',
        systemId: 'nadir',
        position: { q: 6, r: -3 },
        count: 1,
      },
    ],
    fleets: state.fleets.map((fleet) => ({
      ...fleet,
      position: { q: 4, r: -3 },
      shipUnits: fleet.shipUnits!.map((unit) =>
        unit.type === 'Exploration ship'
          ? { ...unit, telescope: 3 as const }
          : unit,
      ),
    })),
  }).exportState();
  await page.addInitScript((state) => {
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-26T00:00:00Z', state }),
    );
  }, fixture);
  await page.goto('./');
  await startFirstSlot(page);
  await selectMapHex(page, new HexCoordinate(5, -3));
  await expect(
    page.getByRole('heading', { name: 'Nebula', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Ships inside can only be detected from the same hex.', {
      exact: false,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('nebula-and-asteroids.png'),
  });
  await selectMapHex(page, new HexCoordinate(3, -3));
  await expect(
    page.getByRole('heading', { name: 'Dense asteroid belt', exact: true }),
  ).toBeVisible();
  await selectMapHex(page, new HexCoordinate(3, -2));
  await expect(
    page.getByRole('heading', { name: 'Sparse asteroid belt', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'Entering or leaving this hex uses a full round of movement, regardless of engine.',
      { exact: true },
    ),
  ).toBeVisible();
});

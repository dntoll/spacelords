import { expect, test } from '@playwright/test';
import { startFirstSlot, endTurn } from './save-helpers.js';
import { selectMapFleet } from './fleet-helpers.js';
import { selectMapHex } from './map-helpers.js';
import type { SavedGame } from '../../src/client/models/SaveRepository.js';
import { Game } from '../../src/client/models/Game.js';
import { Galaxy } from '../../src/client/models/Galaxy.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';

test('utokad-galax / stjarnornas-hexutseende / automatisk-stjarnutforskning: new galaxy and orbit survive reload on mobile', async ({
  page,
}, testInfo) => {
  // The three years include the full serial event announcements.
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await startFirstSlot(page);
  const saved = () =>
    page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as SavedGame,
    );
  const initial = await saved();
  expect(initial.state.world.radius).toBe(100);
  expect(initial.state.world.systems).toHaveLength(150);
  expect(initial.state.world.systems[0]!.planets[0]!.position).toEqual({
    q: 2,
    r: 0,
  });
  await page.evaluate(() => {
    const saved = JSON.parse(
      localStorage.getItem('spacelords.save.v2.1')!,
    ) as SavedGame;
    const next = {
      ...saved,
      state: {
        ...saved.state,
        researched: [...saved.state.researched, 'Automated exploration'],
      },
    };
    localStorage.setItem('spacelords.save.v2.1', JSON.stringify(next));
  });
  await page.reload();
  await startFirstSlot(page);
  await page.screenshot({ path: testInfo.outputPath('large-stars.png') });
  await selectMapFleet(page, 'Home Fleet');
  await page
    .getByRole('button', { name: 'Explore stars', exact: true })
    .click();
  await endTurn(page);
  const checkpoint = (await saved()).state.fleets.find(
    (fleet) => fleet.id === 'fleet-home',
  )!;
  expect(checkpoint.starSurvey?.starId).toBe('sol');
  await page.reload();
  await startFirstSlot(page);
  expect(
    (await saved()).state.fleets.find((fleet) => fleet.id === 'fleet-home')!
      .starSurvey,
  ).toEqual(checkpoint.starSurvey);
  await endTurn(page);
  await endTurn(page);
  const completed = await saved();
  for (const planet of completed.state.world.systems[0]!.planets)
    expect(completed.state.explored).toContain(
      `${planet.position.q},${planet.position.r}`,
    );
  const map = page.locator('canvas[data-rendered="true"]');
  await map.press('ArrowRight');
  await map.press('+');
  await map.press('Home');
  await page.screenshot({ path: testInfo.outputPath('explored-system.png') });
  expect(errors).toEqual([]);
});

test('asteroidbalten / nebulosornas-sikt: discovered terrain explains movement and concealment', async ({
  page,
}, testInfo) => {
  const example = createExampleGalaxy();
  const state = new Game(
    new Galaxy(example.player, example.systems, 10, [
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
      'Entering or leaving this hex uses a full year of movement, regardless of engine.',
      { exact: true },
    ),
  ).toBeVisible();
});

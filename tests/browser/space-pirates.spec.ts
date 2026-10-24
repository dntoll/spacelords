import { expect, test } from '@playwright/test';
import { Game } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import { pirateAsFleet } from '../../src/client/models/PirateFleet.js';
import { FleetMapLayout } from '../../src/client/models/FleetMapLayout.js';
import { selectMapPoint } from './map-helpers.js';
import { endTurn, startFirstSlot } from './save-helpers.js';
import type { SavedGame } from '../../src/client/models/SaveRepository.js';

for (const screen of ['Star map', 'Fleets']) {
  test(`rymdpirater-per-stjarna / flottstrid-per-hex / rymdpiraters-sparning: ${screen} shows hostile read-only pirates and persists combat`, async ({
    page,
  }, testInfo) => {
    const state = new Game(createExampleGalaxy()).exportState();
    const fleet = state.fleets[0]!;
    const system = createExampleGalaxy().systems[1]!;
    const prepared = {
      ...state,
      pirates: state.pirates!.filter((pirate) => pirate.systemId === 'nadir'),
      explored: [
        ...state.explored,
        ...system.star.position.neighbors().map((position) => position.key),
      ],
      fleets: [{ ...fleet, position: { q: 8, r: -4 } }],
    };
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript((state) => {
      localStorage.setItem('spacelords.terraforming-v5-reset', 'done');
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
      ...game.fleetSnapshots(),
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
    await endTurn(page);
    const saved = await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as SavedGame,
    );
    expect(saved.state.pirates).toEqual([]);
    expect(saved.state.fleets[0]!.ships.Fighter).toBe(1);
    expect(
      saved.state.events.some((event) =>
        event.text.startsWith('Combat at HEX 8,-4:'),
      ),
    ).toBe(true);
    await page.getByRole('button', { name: /^Decisions/ }).click();
    await page.locator('.turn-console > summary').click();
    await expect(page.locator('[role="log"]')).toContainText('Combat:');
    await page.reload();
    await startFirstSlot(page);
    const reloaded = await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as SavedGame,
    );
    expect(reloaded.state.pirates).toEqual([]);
    expect(reloaded.state.round).toBe(2);
    expect(errors).toEqual([]);
  });
}

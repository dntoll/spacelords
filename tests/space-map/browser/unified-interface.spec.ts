import { expect, test, type Page } from '@playwright/test';
import { type GameState } from '../../../src/client/space-map/models/Game.js';
import { HexCoordinate } from '../../../src/client/common/HexCoordinate.js';
import { researchStationState } from '../../fixtures/research-station.js';
import { selectMapHex, selectMapObject } from './map-helpers.js';
import { startFirstSlot } from './save-helpers.js';
import { selectMapFleet } from './fleet-helpers.js';

async function seed(page: Page, state: GameState = researchStationState()) {
  await page.addInitScript((saved) => {
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    if (!localStorage.getItem('spacelords.save.v2.1'))
      localStorage.setItem(
        'spacelords.save.v2.1',
        JSON.stringify({ lastPlayed: '2026-10-27T00:00:00Z', state: saved }),
      );
  }, state);
  await page.goto('./');
  await startFirstSlot(page);
}
async function saved(page: Page): Promise<GameState> {
  return page.evaluate(
    () =>
      (
        JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as {
          state: GameState;
        }
      ).state,
  );
}
test('skeppssprites-pa-kartan / genererade-skeppssprites: all ship sprites load and mixed fleets remain selectable in each map', async ({
  page,
}, testInfo) => {
  const initial = researchStationState();
  const homeFleet = { ...initial.fleets[0]! };
  delete homeFleet.shipUnits;
  const state = {
    ...initial,
    fleets: [
      {
        ...homeFleet,
        ships: {
          Fighter: 1,
          'Exploration ship': 1,
          'Colony ship': 1,
          'Transport ship': 1,
          'Civilian shuttle': 0,
          'Space pirate': 0,
          'Salvage ship': 1,
          Raptor: 0,
        },
      },
      ...initial.fleets.slice(1),
    ],
  };
  await seed(page, state);
  for (const screen of ['Star map']) {
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('button', { name: screen, exact: true })
      .click();
    await expect(page.locator('canvas')).toHaveAttribute(
      'data-ship-images-ready',
      '8',
    );
    await selectMapFleet(page);
    await expect(page.locator('.selected-fleet-card')).toContainText(
      'Home Fleet',
    );
    await page.screenshot({
      path: testInfo.outputPath(`${screen.replace(' ', '-')}-sprites.png`),
    });
  }
});
test('dragbara-koer: research dependencies reject invalid reordering without partial changes', async ({
  page,
}) => {
  const state = {
    ...researchStationState(),
    researchQueue: ['Armor', 'Armored Fighter'] as const,
  };
  await seed(page, state);
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  await page.locator('.research-tab[data-tab="queue"]').click();
  const handle = page.locator('.research-queue .queue-drag-handle').nth(1);
  await handle.focus();
  for (const key of ['Space', 'ArrowUp', 'Enter'])
    await page.keyboard.press(key);
  await expect(page.locator('.game-notice')).toContainText(
    /prerequisite|depend|before/i,
  );
  expect((await saved(page)).researchQueue).toEqual([
    'Armor',
    'Armored Fighter',
  ]);
});
test('planetinformation-pa-kartan / handelser-som-toppnotis: known facts across views without an Events list', async ({
  page,
}, testInfo) => {
  await seed(page, researchStationState());
  for (const label of ['Research', 'Fleet', 'Production', 'Star map']) {
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('button', { name: label, exact: true })
      .click();
    await expect(page.locator('.turn-console')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'End turn' })).toHaveCount(0);
  }
  await expect(page.locator('.planet-map-info')).toContainText('Habitability:');
  await page.getByRole('button', { name: 'Star map', exact: true }).click();
  await selectMapObject(page, 'Vesta');
  await expect(page.locator('.planet-map-info')).toContainText('Type:');
  await selectMapHex(page, new HexCoordinate(4, 4));
  await expect(page.locator('.selection-panel')).toContainText('Unexplored');
  await expect(page.locator('.planet-map-info')).toHaveCount(0);
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-ship-images-ready',
    '8',
  );
  await page.screenshot({ path: testInfo.outputPath('views.png') });
});

test('forskningskamerans-granser: Fit stops zoom and pan at content, including after resize', async ({
  page,
}, testInfo) => {
  await seed(page);
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  const tree = page.locator('.research-tree-viewport');
  const stage = page.locator('.research-tree-stage');
  for (const size of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    await tree.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await tree.focus();
    await page.keyboard.press('0');
    const fit = await stage.getAttribute('style');
    for (const key of [
      '-',
      '-',
      'ArrowLeft',
      'ArrowDown',
      'ArrowRight',
      'ArrowUp',
    ])
      await page.keyboard.press(key);
    await expect(stage).toHaveAttribute('style', fit!);
    const bounds = (await tree.boundingBox())!;
    for (const card of await page.locator('.research-node').all()) {
      const box = (await card.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(bounds.x + 15);
      expect(box.y).toBeGreaterThanOrEqual(bounds.y + 15);
      expect(box.x + box.width).toBeLessThanOrEqual(
        bounds.x + bounds.width - 15,
      );
      expect(box.y + box.height).toBeLessThanOrEqual(
        bounds.y + bounds.height - 15,
      );
    }
  }
  await expect(page.locator('.research-details')).toContainText(
    'Select a technology',
  );
  await page.screenshot({ path: testInfo.outputPath('bounded-research.png') });
});

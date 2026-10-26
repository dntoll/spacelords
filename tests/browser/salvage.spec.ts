import { expect, test, type Page } from '@playwright/test';
import { Game, type GameState } from '../../src/client/models/Game.js';
import { FleetMapLayout } from '../../src/client/models/FleetMapLayout.js';
import { salvageMarkers } from '../../src/client/models/SalvageMapLayout.js';
import { salvageState } from '../fixtures/salvage.js';
import { discoveryState } from '../fixtures/exploration.js';
import { selectMapPoint } from './map-helpers.js';
import { selectMapFleet } from './fleet-helpers.js';
import { endTurn, startFirstSlot } from './save-helpers.js';

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

test('bargningsorder / automatisk-vrakreparation / forskning-fran-bargade-delar: salvage, tow, reload, dock and research recovered parts', async ({
  page,
}, testInfo) => {
  const state = salvageState();
  const game = Game.restore(state);
  await load(page, state);
  await selectMapPoint(
    page,
    salvageMarkers(game.wrecks, game.shipyards, 1).find(
      (marker) => marker.kind === 'wreck',
    )!.point,
  );
  await expect(
    page.getByRole('heading', { name: 'Exploration ship wreck', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Salvage fleet', exact: true })
    .selectOption('fleet-home');
  await page
    .getByRole('button', { name: 'Salvage with selected fleet', exact: true })
    .click();
  await endTurn(page);
  await selectMapFleet(page);
  await expect(page.locator('.selected-fleet-card .fleet-speed')).toHaveText(
    'S: 1 hex',
  );
  await expect(
    page.getByText('Towing 1 wrecks', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await startFirstSlot(page);
  expect((await saved(page)).salvage!.wrecks[0]!.towedBy).toBe('fleet-home');
  await endTurn(page);
  await endTurn(page);
  const result = Game.restore(await saved(page));
  expect(result.wrecks).toHaveLength(0);
  expect(
    result.fleetSnapshots().some((fleet) => fleet.name === 'Orbit Tellus'),
  ).toBe(true);
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  const card = page.locator('[data-technology="Telescope III factory"]');
  await expect(card).toContainText('Recovered technology');
  await card
    .getByRole('button', {
      name: 'Research Telescope III factory',
      exact: true,
    })
    .focus();
  await card
    .getByRole('button', {
      name: 'Research Telescope III factory',
      exact: true,
    })
    .click();
  expect((await saved(page)).researchQueue).toEqual(['Telescope III factory']);
  await page.screenshot({
    path: testInfo.outputPath('recovered-research.png'),
  });
});

test('bargningsorder: drag a wreck marker onto a fleet', async ({ page }) => {
  const state = salvageState();
  const game = Game.restore(state);
  await load(page, state);
  const canvas = page.locator('canvas[data-rendered="true"]');
  await canvas.press('ArrowRight');
  await canvas.press('ArrowRight');
  const bounds = (await canvas.boundingBox())!;
  const camera = (await page.getByTestId('camera-position').textContent())!
    .match(/-?\d+/g)!
    .map(Number);
  const screen = (point: { x: number; y: number }) => ({
    x: bounds.x + bounds.width / 2 + point.x - camera[0]!,
    y: bounds.y + bounds.height / 2 + point.y - camera[1]!,
  });
  const start = screen(
    salvageMarkers(game.wrecks, game.shipyards, 1).find(
      (marker) => marker.kind === 'wreck',
    )!.point,
  );
  const end = screen(FleetMapLayout.markers(game.fleetSnapshots())[0]!.point);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await page.mouse.up();
  expect((await saved(page)).salvage!.orders[0]!.targets).toEqual([
    'advanced-wreck',
  ]);
});

test('orbitalt-varv: choose a neighboring station hex before queuing construction', async ({
  page,
}, testInfo) => {
  const state = salvageState();
  state.salvage.yards = [];
  state.colonies[0]![1].buildings.shift();
  await load(page, state);
  await page.getByRole('button', { name: 'Production', exact: true }).click();
  await page
    .getByRole('button', { name: 'Show Orbital shipyard', exact: true })
    .dblclick();
  await expect(
    page.getByRole('heading', { name: 'Place orbital shipyard', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Shipyard hex', exact: true })
    .selectOption('2,0');
  await page.getByRole('button', { name: 'Build here', exact: true }).click();
  expect(
    (await saved(page)).colonies[0]![1].projects[0]!.stationPosition,
  ).toEqual({ q: 2, r: 0 });
  await endTurn(page);
  const game = Game.restore(await saved(page));
  await selectMapPoint(
    page,
    salvageMarkers(game.wrecks, game.shipyards, 1).find(
      (marker) => marker.kind === 'yard',
    )!.point,
  );
  await expect(
    page.getByRole('heading', { name: 'Shipyard · Tellus', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('orbital-shipyard.png') });
});

test('stridsrapport-i-dialog / spara-bargning-och-stridsavbrott: battle report survives reload and Continue completes the year', async ({
  page,
}, testInfo) => {
  await load(page, discoveryState());
  await page.getByRole('button', { name: /^Decisions/ }).click();
  await page.getByRole('button', { name: 'End turn', exact: true }).click();
  const warning = page.getByRole('dialog', { name: 'Decisions remaining' });
  if (await warning.isVisible())
    await warning
      .getByRole('button', { name: 'End turn anyway', exact: true })
      .click();
  await page
    .locator('.discovery-dialog[open]')
    .getByRole('button', { name: 'Ignore', exact: true })
    .click();
  const report = page.getByRole('dialog', {
    name: 'Battle report',
    exact: true,
  });
  await expect(report).toContainText('wrecks remain');
  await page.reload();
  await startFirstSlot(page);
  await expect(
    page.getByRole('dialog', { name: 'Battle report', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('battle-report.png') });
  await page
    .getByRole('dialog', { name: 'Battle report', exact: true })
    .getByRole('button', { name: 'Continue', exact: true })
    .click();
  await page.getByRole('button', { name: /^Decisions/ }).click();
  await expect(
    page.getByRole('button', { name: 'End turn', exact: true }),
  ).toBeEnabled();
  expect((await saved(page)).round).toBe(2);
  expect(Game.restore(await saved(page)).wrecks.length).toBeGreaterThan(0);
});

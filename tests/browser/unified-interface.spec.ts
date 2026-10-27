import { expect, test, type Page } from '@playwright/test';
import { Game, type GameState } from '../../src/client/models/Game.js';
import { salvageMarkers } from '../../src/client/models/SalvageMapLayout.js';
import { salvageState, advancedExplorer } from '../fixtures/salvage.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
import { researchStationState } from '../fixtures/research-station.js';
import {
  selectMapHex,
  selectMapObject,
  selectMapPoint,
} from './map-helpers.js';
import { startFirstSlot } from './save-helpers.js';
import { selectMapFleet } from './fleet-helpers.js';

async function seed(page: Page, state = researchStationState()) {
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
test('skeppssprites-pa-kartan: mixed fleets load all five existing sprites and remain selectable in each map', async ({
  page,
}, testInfo) => {
  const state = researchStationState();
  state.fleets[0]!.ships = {
    Fighter: 1,
    'Exploration ship': 1,
    'Colony ship': 1,
    'Transport ship': 1,
    'Salvage ship': 1,
  };
  delete state.fleets[0]!.shipUnits;
  await seed(page, state);
  for (const screen of ['Star map', 'Fleets', 'Route']) {
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('button', { name: screen, exact: true })
      .click();
    await expect(page.locator('canvas')).toHaveAttribute(
      'data-ship-images-ready',
      '5',
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
test('omordningsbar-reparationsko: Shipyard uses the shared handle and persists the chosen repair order', async ({
  page,
}) => {
  const state = salvageState();
  state.salvage.wrecks[0]!.position = new HexCoordinate(2, 0);
  state.salvage.wrecks.push({
    ...structuredClone(state.salvage.wrecks[0]!),
    id: 'second',
    ship: { ...advancedExplorer, id: 'second-ship' },
  });
  for (const wreck of state.salvage.wrecks) wreck.yardId = 'yard';
  state.salvage.yards[0]!.queue = ['advanced-wreck', 'second'];
  const game = Game.restore(state);
  await seed(page, state);
  const point = salvageMarkers(game.wrecks, game.shipyards, 1).find(
    (marker) => marker.kind === 'yard',
  )!.point;
  await selectMapPoint(page, point);
  const rows = page.locator('.repair-queue .queue-item');
  await expect(rows).toHaveCount(2);
  await rows.first().locator('.queue-drag-handle').focus();
  for (const key of ['Space', 'ArrowDown', 'Enter'])
    await page.keyboard.press(key);
  expect((await saved(page)).salvage!.yards[0]!.queue).toEqual([
    'second',
    'advanced-wreck',
  ]);
  await page.reload();
  await startFirstSlot(page);
  await selectMapPoint(page, point);
  await expect(rows.first()).toHaveAttribute('data-queue-item-id', 'second');
});
test('dragbara-koer: research dependencies reject invalid reordering without partial changes', async ({
  page,
}) => {
  const state = {
    ...researchStationState(),
    researchQueue: [
      'Rocket engine factory',
      'Exploration ship factory',
    ] as const,
  };
  await seed(page, state);
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  await page.locator('.research-queue summary').click();
  const handle = page.locator('.research-queue .queue-drag-handle').nth(1);
  await handle.focus();
  for (const key of ['Space', 'ArrowUp', 'Enter'])
    await page.keyboard.press(key);
  await expect(page.locator('.game-notice')).toContainText(
    /prerequisite|depend|before/i,
  );
  expect((await saved(page)).researchQueue).toEqual([
    'Rocket engine factory',
    'Exploration ship factory',
  ]);
});
test('gemensam-events-panel / planetinformation-pa-kartan: persistent footer, reading position and known facts across all views', async ({
  page,
}, testInfo) => {
  const state = {
    ...researchStationState(),
    round: 8,
    events: Array.from({ length: 60 }, (_, i) => ({
      id: `log-${i}`,
      round: 7,
      text: `Historical event ${i}`,
    })),
  };
  await seed(page, state);
  const panel = page.locator('.turn-console');
  await expect(panel).not.toHaveAttribute('open', '');
  const identity = await panel.elementHandle();
  await panel.locator('summary').click();
  const log = panel.locator('[role="log"]');
  await log.evaluate((node) => (node.scrollTop = 40));
  const position = await log.evaluate((node) => node.scrollTop);
  for (const label of [
    'Research',
    'Decisions',
    'Fleets',
    'Route',
    'Production',
    'Star map',
  ]) {
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('button', { name: label, exact: true })
      .click();
    await expect(panel).toBeVisible();
    expect(
      await panel.evaluate((node, original) => node === original, identity),
    ).toBe(true);
    expect(await log.evaluate((node) => node.scrollTop)).toBe(position);
    await expect(
      page.getByRole('button', { name: 'End turn', exact: true }),
    ).toBeVisible();
  }
  await expect(page.locator('.planet-map-info')).toContainText('Habitability:');
  await panel.locator('summary').click();
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  for (const label of [
    'Production',
    'Build queue',
    'Overview',
    'Building sites',
  ]) {
    await page
      .getByRole('navigation', { name: 'Planet pages' })
      .getByRole('button', { name: label, exact: true })
      .click();
    expect(
      await panel.evaluate((node, original) => node === original, identity),
    ).toBe(true);
  }
  await page
    .getByRole('button', { name: 'Build building at site 2', exact: true })
    .click();
  await expect(page.locator('.build-selection-page')).toBeVisible();
  await expect(panel).toBeVisible();
  await page.getByRole('button', { name: 'Star map', exact: true }).click();
  await selectMapObject(page, 'Vesta');
  await expect(page.locator('.planet-map-info')).toContainText('Type:');
  await selectMapHex(page, new HexCoordinate(4, 4));
  await expect(page.locator('.selection-panel')).toContainText('Unexplored');
  await expect(page.locator('.planet-map-info')).toHaveCount(0);
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-ship-images-ready',
    '5',
  );
  await page.screenshot({ path: testInfo.outputPath('shared-footer.png') });
});

test('dragbara-koer: handles support pointer, keyboard, cancellation and save reload', async ({
  page,
  context,
  browserName,
  isMobile,
}, testInfo) => {
  const state = researchStationState();
  state.colonies[0]![1].projects = [1, 2, 3].map((index) => ({
    id: `project-${index}`,
    type: 'Research station',
    slotIndex: index,
    factoryId: null,
    destinationFleetId: null,
  }));
  await seed(page, state);
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  await page.getByRole('button', { name: 'Build queue', exact: true }).click();
  const rows = page.locator('.queue-order');
  const first = rows.first().locator('.queue-drag-handle');
  await first.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  expect((await saved(page)).colonies[0]![1].projects[0]!.id).toBe('project-1');
  await page.keyboard.press('Escape');
  expect((await saved(page)).colonies[0]![1].projects[0]!.id).toBe('project-1');
  const from = (await first.boundingBox())!;
  const to = (await rows.nth(1).locator('.queue-drag-handle').boundingBox())!;
  if (isMobile && browserName === 'chromium') {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: from.x + 22, y: from.y + 22, id: 1 }],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: to.x + 22, y: to.y + to.height - 1, id: 1 }],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    await cdp.detach();
  } else {
    await page.mouse.move(from.x + 22, from.y + 22);
    await page.mouse.down();
    await page.mouse.move(to.x + 22, to.y + to.height - 1, { steps: 10 });
    await page.mouse.up();
  }
  expect(
    (await saved(page)).colonies[0]![1].projects.map((project) => project.id),
  ).toEqual(['project-2', 'project-1', 'project-3']);
  const handle = rows.first().locator('.queue-drag-handle');
  await handle.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  expect((await saved(page)).colonies[0]![1].projects[0]!.id).toBe('project-1');
  await page.screenshot({ path: testInfo.outputPath('shared-queue.png') });
  await page.reload();
  await startFirstSlot(page);
  expect(
    (await saved(page)).colonies[0]![1].projects.map((project) => project.id),
  ).toEqual(['project-1', 'project-2', 'project-3']);
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
  await expect(page.locator('.research-details')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('bounded-research.png') });
});

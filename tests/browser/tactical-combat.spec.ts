import { expect, test, type Page } from '@playwright/test';
import { encounterGame, arrangeBattle } from '../fixtures/battle-checkpoint.js';
import { startFirstSlot, ignoreEventsUntil } from './save-helpers.js';
import type { SavedGame } from '../../src/client/models/SaveRepository.js';
import { battleHex } from '../../src/client/models/TacticalBattle.js';
import { createTestBattle } from '../../src/client/models/TestBattle.js';
import { ShipFootprint } from '../../src/client/models/ShipFootprint.js';

import { battlePoint, showBattleHex, tapBattleHex } from './battle-helpers.js';
import { HexGeometry } from '../../src/client/models/HexCoordinate.js';

async function saved(page: Page): Promise<SavedGame> {
  return page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as SavedGame,
  );
}
async function prepare(
  page: Page,
  state: SavedGame['state'],
): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript((state) => {
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    if (!localStorage.getItem('spacelords.save.v2.1'))
      localStorage.setItem(
        'spacelords.save.v2.1',
        JSON.stringify({ lastPlayed: '2026-10-31', state }),
      );
  }, state);
  await page.goto('./');
  await startFirstSlot(page);
  await expect(
    page.getByRole('dialog', { name: 'Tactical combat' }),
  ).toBeVisible();
  await expect(page.getByLabel(/^Battle hex map/)).toBeVisible();
  return errors;
}

test('stridsutplacering / sparad-taktisk-strid: deploys all ships and resumes an unfinished activation without rerolling', async ({
  page,
}, testInfo) => {
  const game = encounterGame();
  const errors = await prepare(page, game.exportState());
  const dialog = page.getByRole('dialog', { name: 'Tactical combat' });
  await expect(
    dialog.getByRole('button', { name: 'Start combat', exact: true }),
  ).toBeDisabled();
  await dialog
    .getByRole('button', { name: 'Auto deploy', exact: true })
    .click();
  await expect(
    dialog.getByRole('button', { name: 'Start combat', exact: true }),
  ).toBeEnabled();
  await dialog
    .getByRole('button', { name: 'Turn left 60°', exact: true })
    .click();
  await page.screenshot({ path: testInfo.outputPath('battle-deployment.png') });
  const deployment = (await saved(page)).state.simulation!.tacticalBattles![0]!;
  expect(deployment.pieces.every((p) => p.position)).toBe(true);
  await page.reload();
  await startFirstSlot(page);
  expect((await saved(page)).state.simulation!.tacticalBattles![0]).toEqual(
    deployment,
  );
  expect(deployment.pieces.find((p) => p.side === 'player')!.facing).toBe(1);
  await dialog
    .getByRole('button', { name: 'Start combat', exact: true })
    .click();
  const fighter = deployment.pieces.find((p) => p.type === 'Fighter')!;
  await expect(dialog).toHaveAttribute('data-active-ship', fighter.id);
  await expect(
    dialog.getByRole('button', { name: 'Activate ship', exact: true }),
  ).toHaveCount(0);
  await dialog
    .getByRole('button', { name: 'Turn left 60°', exact: true })
    .click();
  const checkpoint = (await saved(page)).state.simulation!.tacticalBattles![0]!;
  await page.screenshot({ path: testInfo.outputPath('battle-activation.png') });
  await page.reload();
  await startFirstSlot(page);
  expect((await saved(page)).state.simulation!.tacticalBattles![0]).toEqual(
    checkpoint,
  );
  await expect(
    dialog.getByRole('button', { name: 'End ship turn', exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(
    dialog.getByRole('button', { name: /Zoom|Fit battle/ }),
  ).toHaveCount(0);
  await expect(page.getByLabel(/^Battle hex map/)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('battle-landscape.png') });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test('begransad-stridskamera / fullskarms-stridskarta / skeppsnara-stridskontroller / vapensymboler-i-strid / avfyra-pa-markerat-mal / automatiskt-skeppsval-i-strid / synligt-stridsresultat / stridsorder-utan-mobilscroll / skeppets-framat-foljer-spriten / riktning-och-vapen / oppna-stridstarningar: selects, fires and moves without scrolling for ship orders', async ({
  page,
}, testInfo) => {
  const game = arrangeBattle(encounterGame(), (state) => ({
    ...state,
    asteroids: [],
    phase: 'fighting',
    round: 2,
    turn: 'player',
    random: 1,
    pieces: state.pieces.map((p, i) => ({
      ...p,
      position:
        p.side === 'enemy'
          ? { q: 4, r: 4 }
          : p.type === 'Fighter' &&
              i === state.pieces.findIndex((a) => a.type === 'Fighter')
            ? { q: 1, r: 4 }
            : { q: 7, r: i },
      facing: p.side === 'enemy' ? 3 : 0,
    })),
  }));
  const errors = await prepare(page, game.exportState());
  const dialog = page.getByRole('dialog', { name: 'Tactical combat' });
  const fighter = game.tacticalBattle!.pieces.find(
    (p) => p.type === 'Fighter',
  )!;
  await expect(dialog).toHaveAttribute('data-active-ship', fighter.id);
  expect(
    (await saved(page)).state.simulation!.tacticalBattles![0]!.activation?.id,
  ).toBe(fighter.id);
  for (const size of [
    ...(testInfo.project.name === 'desktop-chromium'
      ? [{ width: 1440, height: 1000 }]
      : []),
    { width: 320, height: 568 },
    { width: 844, height: 390 },
    { width: 393, height: 851 },
  ]) {
    await page.setViewportSize(size);
    await expect(page.getByLabel(/^Battle hex map/)).toHaveCSS(
      'width',
      `${size.width}px`,
    );
    await expect(page.getByLabel(/^Battle hex map/)).toHaveCSS(
      'height',
      `${size.height}px`,
    );
    const canvas = page.getByLabel(/^Battle hex map/);
    for (const deltaY of [-900, 12000])
      await canvas.dispatchEvent('wheel', {
        deltaY,
        clientX: size.width / 2,
        clientY: size.height / 2,
      });
    const camera = await dialog.locator('.battle-canvas').evaluate((node) => ({
      scale: Number((node as HTMLElement).dataset.cameraScale),
      minScale: Number((node as HTMLElement).dataset.cameraMinScale),
    }));
    expect(camera.scale).toBeCloseTo(camera.minScale);
    const first = await battlePoint(page, battleHex(0, 0));
    const right = await battlePoint(
      page,
      battleHex(game.tacticalBattle!.width - 1, 1),
    );
    const bottom = await battlePoint(
      page,
      battleHex(0, game.tacticalBattle!.height - 1),
    );
    const halfWidth = (Math.sqrt(3) * HexGeometry.size * camera.scale) / 2;
    const radius = HexGeometry.size * camera.scale;
    expect(first.x - halfWidth).toBeGreaterThanOrEqual(-0.001);
    expect(first.y - radius).toBeGreaterThanOrEqual(-0.001);
    expect(right.x + halfWidth).toBeLessThanOrEqual(size.width + 0.001);
    expect(bottom.y + radius).toBeLessThanOrEqual(size.height + 0.001);
    expect(
      Math.min(
        Math.abs(right.x + halfWidth - first.x + halfWidth - size.width),
        Math.abs(bottom.y + radius - first.y + radius - size.height),
      ),
    ).toBeLessThan(0.001);
    expect(
      (await saved(page)).state.simulation!.tacticalBattles![0]!.lastShot,
    ).toBeUndefined();
    const orders = dialog.getByRole('region', { name: 'Ship orders' });
    for (const label of [
      'Turn left 60°',
      'Forward / escape',
      'Turn right 60°',
      'End ship turn',
    ]) {
      const control = orders.getByRole('button', { name: label, exact: true });
      const bounds = (await control.boundingBox())!;
      expect(bounds.y, label).toBeGreaterThanOrEqual(0);
      expect(bounds.y + bounds.height, label).toBeLessThanOrEqual(size.height);
      expect(bounds.x, label).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width, label).toBeLessThanOrEqual(size.width);
      expect(bounds.height, label).toBeGreaterThanOrEqual(44);
      expect(bounds.width, label).toBeGreaterThanOrEqual(44);
    }
    const board = (await page.getByLabel(/^Battle hex map/).boundingBox())!;
    expect(board).toMatchObject({
      x: 0,
      y: 0,
      width: size.width,
      height: size.height,
    });
    await expect(dialog.locator('select')).toHaveCount(0);
    await expect(
      dialog.getByRole('button', { name: 'Fire weapon', exact: true }),
    ).toHaveCount(0);
    await expect(
      dialog.getByRole('button', { name: 'Cannon', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({
      path: testInfo.outputPath(`battle-orders-${size.width}.png`),
    });
  }
  await dialog
    .getByRole('button', { name: 'Combat details', exact: true })
    .click();
  await expect(dialog.locator('.battle-shot-preview')).toContainText(
    '2D6, hit 4+',
  );
  await dialog
    .getByRole('button', { name: 'Combat details', exact: true })
    .click();
  await tapBattleHex(page, { q: 4, r: 4 });
  await expect(dialog.locator('.battle-feedback')).toBeVisible();
  await expect(dialog.locator('.battle-feedback')).toContainText(
    'Miss · 0 damage',
  );
  await expect(
    dialog.getByRole('button', { name: 'Cannon', exact: true }),
  ).toBeDisabled();
  await dialog
    .getByRole('button', { name: 'Combat details', exact: true })
    .click();
  await expect(dialog.locator('.battle-latest-roll')).toContainText(
    '2D6 [1, 1]',
  );
  await dialog
    .getByRole('button', { name: 'Combat details', exact: true })
    .click();
  await showBattleHex(page, fighter.position!);
  await page.screenshot({
    path: testInfo.outputPath('battle-forward-before.png'),
  });
  await dialog
    .getByRole('button', { name: 'Forward / escape', exact: true })
    .click();
  const checkpoint = (await saved(page)).state.simulation!.tacticalBattles![0]!;
  expect(checkpoint.pieces.find((p) => p.id === fighter.id)!.position).toEqual({
    q: 2,
    r: 4,
  });
  await page.screenshot({
    path: testInfo.outputPath('battle-forward-after.png'),
  });
  await page.reload();
  await startFirstSlot(page);
  expect((await saved(page)).state.simulation!.tacticalBattles![0]).toEqual(
    checkpoint,
  );
  expect(errors).toEqual([]);
});

test('skeppsvis-retratt / gemensamt-handelseflode: escapes each ship, regroups the fleet and resumes the paused year', async ({
  page,
}, testInfo) => {
  const game = arrangeBattle(encounterGame(), (state) => ({
    ...state,
    asteroids: [],
    phase: 'fighting',
    round: 2,
    turn: 'player',
    pieces: state.pieces.map((p) => {
      if (p.side !== 'player')
        return {
          ...p,
          position: battleHex(state.width - 1, Math.floor(state.height / 2)),
          facing: 3,
        };
      const players = state.pieces.filter((piece) => piece.side === 'player');
      const index = players.findIndex((piece) => piece.id === p.id);
      const top = index < 3;
      const col = Math.floor(state.width / 2) - 1 + (index % 3);
      const large = ShipFootprint.length(p.type, true) === 3;
      return {
        ...p,
        position: battleHex(
          col,
          top ? (large ? 1 : 0) : state.height - (large ? 2 : 1),
        ),
        facing: top ? 2 : 5,
        movement: large ? 3 : p.movement,
      };
    }),
  }));
  const errors = await prepare(page, game.exportState());
  const dialog = page.getByRole('dialog', { name: 'Tactical combat' });
  const initial = game.tacticalBattle!;
  for (
    let i = 0;
    i < initial.pieces.filter((p) => p.side === 'player').length;
    i++
  ) {
    await expect(dialog).toHaveAttribute('data-active-ship', /.+/);
    const activeId = (await dialog.getAttribute('data-active-ship'))!;
    const active = initial.pieces.find((piece) => piece.id === activeId)!;
    const steps = ShipFootprint.length(active.type, true);
    await expect(
      dialog.getByRole('button', { name: 'Forward / escape', exact: true }),
    ).toBeEnabled();
    for (let step = 0; step < steps; step++)
      await dialog
        .getByRole('button', { name: 'Forward / escape', exact: true })
        .click();
  }
  await expect(dialog.locator('.battle-outcome')).toContainText(
    'Retreat complete',
  );
  await expect(dialog).toHaveCount(0);
  const result = (await saved(page)).state;
  expect(
    result.events.filter((e) => e.text.startsWith('Combat at HEX')),
  ).toHaveLength(1);
  expect(
    result.events.find((e) => e.text.startsWith('Combat at HEX'))!.text,
  ).toContain('4 ships escaped');
  expect(result.fleets[0]!.position).toEqual(
    initial.fleets.find((f) => f.side === 'player')!.retreat,
  );
  await ignoreEventsUntil(page);
  await expect.poll(async () => (await saved(page)).state.round).toBe(2);
  await page.screenshot({ path: testInfo.outputPath('battle-result.png') });
  expect(errors).toEqual([]);
});

test('fuskknapp-for-teststrid: opens combat from the main menu and leaves save slots untouched', async ({
  page,
}, testInfo) => {
  await page.goto('./');
  const before = await page.evaluate(() => ({ ...localStorage }));
  await page
    .getByRole('button', { name: 'Test battle (cheat)', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Tactical combat' });
  await expect(
    dialog.getByRole('heading', { name: 'Deploy fleet', exact: true }),
  ).toBeVisible();
  const start = dialog.getByRole('button', {
    name: 'Start combat',
    exact: true,
  });
  await expect(start).toBeDisabled();
  await expect(
    dialog.getByRole('button', { name: /Select Transport ship/ }),
  ).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: /Select Colony ship/ }),
  ).toBeVisible();
  expect(createTestBattle().snapshot.asteroids.length).toBeGreaterThan(0);
  await dialog
    .getByRole('button', { name: 'Auto deploy', exact: true })
    .click();
  const checkpoint = createTestBattle();
  checkpoint.command({ type: 'auto-deploy' });
  const large = checkpoint.snapshot.pieces.find(
    (piece) => piece.type === 'Transport ship',
  )!;
  const stern = ShipFootprint.cells(large, true)[0]!;
  await tapBattleHex(page, stern);
  await expect(dialog).toHaveAttribute('data-active-ship', large.id);
  await page.screenshot({
    path: testInfo.outputPath('test-battle-large-setup.png'),
  });
  await expect(start).toBeEnabled();
  await start.click();
  await expect(dialog.getByRole('heading', { name: /^Round/ })).toBeVisible();
  await dialog
    .getByRole('button', { name: 'Save and close', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Saved games', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(before);
});

test('autoaim-med-manuellt-mal: acquires, loses and reacquires a target and respects manual aim through rotation', async ({
  page,
}, testInfo) => {
  const game = arrangeBattle(encounterGame(2), (state) => {
    const enemies = state.pieces.filter((piece) => piece.side === 'enemy');
    const fighter = state.pieces.find((piece) => piece.type === 'Fighter')!;
    return {
      ...state,
      phase: 'fighting',
      round: 2,
      turn: 'player',
      asteroids: [],
      pieces: state.pieces.map((piece, index) => ({
        ...piece,
        position:
          piece.id === fighter.id
            ? { q: 1, r: 4 }
            : piece.id === enemies[0]!.id
              ? { q: 4, r: 4 }
              : piece.id === enemies[1]!.id
                ? { q: 3, r: 3 }
                : { q: 7, r: index },
        facing: piece.side === 'player' ? 0 : 3,
      })),
    };
  });
  const errors = await prepare(page, game.exportState());
  const dialog = page.getByRole('dialog', { name: 'Tactical combat' });
  const aim = dialog.locator('.battle-aim');
  const aimed = async (q: string, r: string) => {
    await expect(aim).toHaveAttribute('data-aim-q', q);
    await expect(aim).toHaveAttribute('data-aim-r', r);
  };
  await aimed('3', '3');
  await expect(aim).toHaveAttribute('data-can-fire', 'true');
  for (let turn = 0; turn < 2; turn++)
    await dialog
      .getByRole('button', { name: 'Turn right 60°', exact: true })
      .click();
  await expect(aim).toContainText('No target');
  await expect(aim).toHaveAttribute('data-can-fire', 'false');
  for (let turn = 0; turn < 2; turn++)
    await dialog
      .getByRole('button', { name: 'Turn left 60°', exact: true })
      .click();
  await aimed('4', '4');
  await tapBattleHex(page, { q: 3, r: 3 });
  expect(
    (await saved(page)).state.simulation!.tacticalBattles![0]!.lastShot,
  ).toBeUndefined();
  await aimed('3', '3');
  await page.setViewportSize({ width: 844, height: 390 });
  await aimed('3', '3');
  await page.screenshot({
    path: testInfo.outputPath('manual-autoaim-large-ships.png'),
  });
  await tapBattleHex(page, { q: 3, r: 3 });
  expect(
    (await saved(page)).state.simulation!.tacticalBattles![0]!.lastShot!.at,
  ).toEqual({ q: 3, r: 3 });
  expect(errors).toEqual([]);
});

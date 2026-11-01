import { expect, type Page } from '@playwright/test';
import {
  TacticalBattle,
  battleWeapons,
  type BattleCommand,
  type BattleHex,
} from '../../src/client/models/TacticalBattle.js';
import {
  HexGeometry,
  HexCoordinate,
} from '../../src/client/models/HexCoordinate.js';
import type { SavedGame } from '../../src/client/models/SaveRepository.js';

/** Project using the actual camera; field gestures remain real pointer input. */
export async function battlePoint(page: Page, at: BattleHex) {
  const world = HexGeometry.toPoint(new HexCoordinate(at.q, at.r));
  return page.locator('.battle-canvas').evaluate((node, world) => {
    const data = (node as HTMLElement).dataset;
    return {
      x: world.x * Number(data.cameraScale) + Number(data.cameraOffsetX),
      y: world.y * Number(data.cameraScale) + Number(data.cameraOffsetY),
      width: node.clientWidth,
      height: node.clientHeight,
    };
  }, world);
}
export async function showBattleHex(page: Page, at: BattleHex): Promise<void> {
  const surface = page.locator('.battle-canvas');
  for (let attempt = 0; attempt < 20; attempt++) {
    const point = await battlePoint(page, at);
    if (
      point.x >= 26 &&
      point.x <= point.width - 26 &&
      point.y >= 105 &&
      point.y <= point.height - 100
    )
      return;
    const bounds = (await surface.boundingBox())!;
    const start = await surface.evaluate((node) => {
      const bounds = node.getBoundingClientRect();
      for (const [x, y] of [
        [0.5, 0.5],
        [0.3, 0.5],
        [0.7, 0.6],
        [0.5, 0.7],
      ]) {
        const at = {
          x: bounds.x + bounds.width * x!,
          y: bounds.y + bounds.height * y!,
        };
        if (document.elementFromPoint(at.x, at.y)?.tagName === 'CANVAS')
          return at;
      }
      throw new Error('No unobscured camera drag origin.');
    });
    const dx = Math.max(
      -point.width / 3,
      Math.min(point.width / 3, point.width / 2 - point.x),
    );
    const dy = Math.max(
      -point.height / 3,
      Math.min(point.height / 3, point.height / 2 - point.y),
    );
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(
      Math.max(
        bounds.x + 20,
        Math.min(bounds.x + bounds.width - 20, start.x + dx),
      ),
      Math.max(
        bounds.y + 90,
        Math.min(bounds.y + bounds.height - 85, start.y + dy),
      ),
      { steps: 2 },
    );
    await page.mouse.up();
    const next = await battlePoint(page, at);
    if (Math.abs(next.x - point.x) + Math.abs(next.y - point.y) < 1)
      await surface.locator('canvas').dispatchEvent('wheel', {
        deltaY: -240,
        clientX: point.width / 2,
        clientY: point.height / 2,
      });
  }
}
export async function tapBattleHex(page: Page, at: BattleHex): Promise<void> {
  await showBattleHex(page, at);
  const point = await battlePoint(page, at);
  await page
    .locator('.battle-canvas canvas')
    .click({ position: { x: point.x, y: point.y } });
}
export async function fireAtBattleHex(
  page: Page,
  at: BattleHex,
): Promise<void> {
  await tapBattleHex(page, at);
  const aim = page.locator('.battle-aim');
  if ((await aim.getAttribute('data-can-fire')) === 'true')
    await tapBattleHex(page, at);
}

/** Exercise actual controls while other browser scenarios use a reproducible pilot. */
export async function finishTacticalCombat(page: Page): Promise<void> {
  const current = async () =>
    (
      await page.evaluate(
        () =>
          JSON.parse(
            localStorage.getItem('spacelords.save.v2.1')!,
          ) as SavedGame,
      )
    ).state.simulation?.tacticalBattles?.[0];
  const dialog = page.getByRole('dialog', { name: 'Tactical combat' });
  for (let activation = 0; activation < 200; activation++) {
    await expect(dialog.locator('.battle-outcome')).toBeHidden();
    const state = await current();
    if (!state) {
      await expect(dialog).toHaveCount(0);
      return;
    }
    if (state.phase === 'deployment') {
      await dialog
        .getByRole('button', { name: 'Auto deploy', exact: true })
        .click();
      await dialog
        .getByRole('button', { name: 'Start combat', exact: true })
        .click();
      continue;
    }
    if (state.turn === 'enemy') {
      await expect
        .poll(async () => (await current())?.turn !== 'enemy', {
          timeout: 10000,
        })
        .toBe(true);
      continue;
    }
    const commands: BattleCommand[] = [];
    const battle = TacticalBattle.restore(state);
    const original = battle.command.bind(battle);
    battle.command = (command, side) => {
      commands.push(command);
      original(command, side);
    };
    const piece = state.activation
      ? state.pieces.find((p) => p.id === state.activation!.id)!
      : (state.pieces.find(
          (p) =>
            p.side === 'player' &&
            p.status === 'active' &&
            !p.activated &&
            p.type === 'Fighter',
        ) ??
        state.pieces.find(
          (p) => p.side === 'player' && p.status === 'active' && !p.activated,
        )!);
    if (!state.activation) battle.command({ type: 'activate', id: piece.id });
    if (battleWeapons(piece.type, piece.hasMissiles).length)
      battle.actAutomatically();
    else battle.command({ type: 'end-activation' });
    for (const command of commands) {
      switch (command.type) {
        case 'activate':
          await tapBattleHex(
            page,
            state.pieces.find((piece) => piece.id === command.id)!.position!,
          );
          break;
        case 'turn':
          await dialog
            .getByRole('button', {
              name:
                command.direction === 1 ? 'Turn left 60°' : 'Turn right 60°',
              exact: true,
            })
            .click();
          break;
        case 'forward':
          await dialog
            .getByRole('button', { name: 'Forward / escape', exact: true })
            .click();
          break;
        case 'fire': {
          await dialog
            .getByRole('button', { name: command.weapon, exact: true })
            .click();
          await fireAtBattleHex(page, command.at);
          break;
        }
        case 'end-activation':
          await dialog
            .getByRole('button', { name: 'End ship turn', exact: true })
            .click();
          break;
        default:
          throw new Error('Unexpected pilot command.');
      }
    }
  }
  throw new Error('Combat did not finish.');
}

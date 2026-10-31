import { expect, type Page } from '@playwright/test';
import {
  TacticalBattle,
  battleWeapons,
  type BattleCommand,
} from '../../src/client/models/TacticalBattle.js';
import type { SavedGame } from '../../src/client/models/SaveRepository.js';

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
    if (battleWeapons(piece.type).length) battle.actAutomatically();
    else battle.command({ type: 'end-activation' });
    for (const command of commands) {
      switch (command.type) {
        case 'activate':
          await dialog
            .getByLabel('Your ship', { exact: true })
            .selectOption(command.id);
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
        case 'fire':
          await dialog
            .getByLabel('Weapon', { exact: true })
            .selectOption(command.weapon);
          await dialog
            .getByLabel('Target', { exact: true })
            .selectOption(command.targetId);
          await dialog
            .getByRole('button', { name: 'Fire weapon', exact: true })
            .click();
          break;
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

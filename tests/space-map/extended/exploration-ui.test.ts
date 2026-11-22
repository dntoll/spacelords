import { Game } from '../../../src/client/space-map/models/Game.js';
// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { MasterController } from '../../../src/client/app/controllers/MasterController.js';
import { AppView } from '../../../src/client/app/views/AppView.js';
import type { SavedGame } from '../../../src/client/space-map/models/saves/SaveRepository.js';
import {
  encounterGame,
  arrangeBattle,
} from '../../fixtures/battle-checkpoint.js';

afterEach(() => vi.useRealTimers());

it('skeppsval-startar-stridstur / vaxelvisa-skeppsaktiveringar / riktning-och-vapen: controller saves selection immediately and restores the same unfinished ship turn', () => {
  vi.useFakeTimers();
  const game = arrangeBattle(encounterGame(), (state) => ({
    ...state,
    asteroids: [],
    phase: 'fighting',
    round: 2,
    turn: 'player',
    pieces: state.pieces.map((p, i) => ({
      ...p,
      position: { q: i + 1, r: i + 1 },
      facing: p.side === 'player' ? 0 : 3,
    })),
  }));
  let saved: SavedGame = {
    lastPlayed: '2026-10-31',
    state: game.exportState(),
  };
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  const model = new AppModel(undefined, {
    load: () => saved,
    save: (_id, next) => {
      saved = structuredClone(next);
    },
    clear() {},
  });
  model.startSlot(1);
  const view = new AppView(root, () => ({ render() {}, dispose() {} }));
  const controller = new MasterController(model, view);
  controller.start();
  const fighter = model.snapshot.tacticalBattle!.pieces.find(
    (p) => p.type === 'Fighter',
  )!;
  expect(saved.state.simulation!.tacticalBattles![0]!.activation?.id).toBe(
    fighter.id,
  );
  const turnLeft = () =>
    [...root.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      button.getAttribute('aria-label')?.endsWith('facing 1, speed 0'),
    );
  turnLeft()!.click();
  turnLeft()!.click();
  const checkpoint = saved.state.simulation!.tacticalBattles![0]!;
  expect(checkpoint.pieces.find((p) => p.id === fighter.id)!.facing).toBe(1);
  expect(checkpoint.activation!.remaining).toBe(1);
  expect(Game.restore(saved.state).tacticalBattle).toEqual(
    model.snapshot.tacticalBattle,
  );
  expect(
    root.querySelector('dialog[aria-label="Tactical combat"][open]'),
  ).not.toBeNull();
  controller.dispose();
});

it('stridsutplacering / sparad-taktisk-strid: the facing control reflects a saved deployment and Auto deploy resets it', () => {
  const game = encounterGame();
  game.commandBattle({ type: 'auto-deploy' });
  const first = game.tacticalBattle!.pieces[0]!;
  game.commandBattle({
    type: 'place',
    id: first.id,
    position: first.position!,
    facing: 3,
  });
  let saved: SavedGame = {
    lastPlayed: '2026-10-31',
    state: game.exportState(),
  };
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  const model = new AppModel(undefined, {
    load: () => saved,
    save: (_id, next) => {
      saved = structuredClone(next);
    },
    clear() {},
  });
  model.startSlot(1);
  const controller = new MasterController(
    model,
    new AppView(root, () => ({ render() {}, dispose() {} })),
  );
  controller.start();
  expect(
    saved.state.simulation!.tacticalBattles![0]!.pieces.find(
      (piece) => piece.id === first.id,
    )!.facing,
  ).toBe(3);
  expect(root.querySelector('select')).toBeNull();
  root
    .querySelector<HTMLButtonElement>('button[aria-label="Auto deploy"]')!
    .click();

  expect(
    saved.state.simulation!.tacticalBattles![0]!.pieces.find(
      (p) => p.id === first.id,
    )!.facing,
  ).toBe(0);
  controller.dispose();
});

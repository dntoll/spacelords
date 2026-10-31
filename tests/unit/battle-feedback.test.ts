// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { AppModel } from '../../src/client/models/AppModel.js';
import { AppController } from '../../src/client/controllers/AppController.js';
import { BattleView } from '../../src/client/views/BattleView.js';
import { renderSaveSlots } from '../../src/client/views/SaveSlotsView.js';
import type { SaveRepository } from '../../src/client/models/SaveRepository.js';
import type {
  AppIntent,
  AppPort,
} from '../../src/client/views/ViewContracts.js';
import { TacticalBattle } from '../../src/client/models/TacticalBattle.js';
import { arrangeBattle, encounterGame } from '../fixtures/battle-checkpoint.js';

afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
});

function setup() {
  const game = arrangeBattle(encounterGame(), (state) => ({
    ...state,
    phase: 'fighting',
    round: 2,
    turn: 'player',
    asteroids: [],
    random: 12345,
    pieces: state.pieces.map((p, i) => ({
      ...p,
      position:
        p.side === 'enemy'
          ? { q: 3, r: 4 }
          : i === 1
            ? { q: 1, r: 4 }
            : { q: i + 1, r: 6 },
      facing: p.side === 'player' ? 0 : 3,
      hull: p.side === 'enemy' ? 1 : p.hull,
    })),
  }));
  const repo: SaveRepository = {
    load: () => ({ lastPlayed: '2026-10-31', state: game.exportState() }),
    save: vi.fn(),
    clear: vi.fn(),
  };
  const model = new AppModel(undefined, repo);
  model.startSlot(1);
  let emit: (intent: AppIntent) => void = () => {};
  const view: AppPort = {
    bind: (handler) => {
      emit = handler;
    },
    render: vi.fn(),
    dispose() {},
  };
  const controller = new AppController(model, view);
  controller.start();
  return { model, controller, emit, repo };
}

it('automatiskt-skeppsval-i-strid: activates an available player ship on entry and preserves a resumed activation', () => {
  const { model, controller, emit } = setup();
  const active = model.snapshot.tacticalBattle!.activation;
  expect(active?.id).toBeTruthy();
  emit({ type: 'battle-command', command: { type: 'turn', direction: 1 } });
  expect(model.snapshot.tacticalBattle!.activation?.id).toBe(active!.id);
  expect(model.snapshot.tacticalBattle!.activation?.remaining).toBe(
    active!.remaining - 1,
  );
  controller.dispose();
});

it('synliga-fiendemanovrer: each automatic step moves at most one hex or turns once and can resume from a save', () => {
  // Use the full checkpoint; the deployment snapshot intentionally hides enemies.
  const game = encounterGame();
  const initial = game.exportState().simulation!.tacticalBattles![0]!;
  const automatic = TacticalBattle.restore(initial);
  automatic.actAutomatically();
  let state = automatic.snapshot;
  for (let step = 0; step < 12 && state.phase === 'fighting'; step++) {
    const restored = TacticalBattle.restore(state);
    restored.actAutomatically(true);
    const next = restored.snapshot;
    const changed = next.pieces.filter(
      (p, i) =>
        JSON.stringify(p.position) !==
          JSON.stringify(state.pieces[i]!.position) ||
        p.facing !== state.pieces[i]!.facing,
    );
    expect(changed.length).toBeLessThanOrEqual(1);
    for (const p of changed) {
      const old = state.pieces.find((other) => other.id === p.id)!;
      if (old.position && p.position) {
        const dq = old.position.q - p.position.q,
          dr = old.position.r - p.position.r;
        expect(
          Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr)),
        ).toBeLessThanOrEqual(1);
        if (dq || dr) expect(p.facing).toBe(old.facing);
      }
    }
    state = next;
  }
});

it.each(['0 damage', '2 damage, destroyed'])(
  'synligt-stridsresultat: keeps %s visible outside Combat details, including the final shot',
  (result) => {
    const battle = TacticalBattle.restore(
      encounterGame().exportState().simulation!.tacticalBattles![0]!,
    );
    battle.actAutomatically();
    const initial = battle.snapshot;
    const view = new BattleView(document.body, vi.fn());
    const shot = `Fighter 1: Cannon → Space pirate 1. 2D6 [1, 2], hit 4+: ${result}.`;
    view.render({
      ...initial,
      phase: result.startsWith('2') ? 'complete' : 'fighting',
      log: [shot, 'Battle complete. Surviving ships regroup.'],
    });
    const feedback = document.querySelector('.battle-feedback')!;
    expect(feedback).not.toBeNull();
    expect(feedback.closest('details')).toBeNull();
    expect(feedback.textContent).toContain(
      result.startsWith('0') ? 'Miss' : 'Hit',
    );
    expect(feedback.textContent).toContain(result);
    if (result.startsWith('2'))
      expect(document.querySelector('.battle-outcome')?.textContent).toContain(
        'Battle',
      );
    view.dispose();
  },
);

it('stridsrapport-i-dialog / synligt-stridsslut: shows the completed board before continuing and never offers a report decision', () => {
  const { model, controller, emit } = setup();
  const state = model.snapshot.tacticalBattle!;
  const fighter = state.pieces.find(
    (p) => p.side === 'player' && p.type === 'Fighter',
  )!;
  if (!state.activation)
    model.commandBattle({ type: 'activate', id: fighter.id });
  emit({
    type: 'battle-command',
    command: {
      type: 'fire',
      weapon: 'Cannon',
      at: state.pieces.find((p) => p.side === 'enemy')!.position!,
    },
  });
  expect(model.snapshot.battleFeedback?.phase).toBe('complete');
  expect(
    model.snapshot.battleFeedback?.log.some((line) => line.includes('damage')),
  ).toBe(true);
  model.finishBattleFeedback();
  expect(model.snapshot.battleFeedback).toBeNull();
  expect(
    model.snapshot.eventPlayback?.events.some(
      (event) => event.decision?.title === 'Battle report',
    ),
  ).not.toBe(true);
  controller.dispose();
});

it('fuskknapp-for-teststrid: starts repeatable combat from the menu without writing any save slot', () => {
  const save = vi.fn();
  const repo: SaveRepository = {
    load: () => null,
    save,
    clear: vi.fn(),
  };
  const model = new AppModel(undefined, repo);
  model.startSlot(1);
  model.openSaves();
  save.mockClear();
  let emit: (intent: AppIntent) => void = () => {};
  const controller = new AppController(model, {
    bind: (handler) => {
      emit = handler;
    },
    render() {},
    dispose() {},
  });
  controller.start();
  const menu = renderSaveSlots(model.snapshot, emit);
  document.body.append(menu);
  const button = [...menu.querySelectorAll('button')].find(
    (node) => node.textContent === 'Test battle (cheat)',
  );
  expect(button).toBeDefined();
  button!.click();
  expect(model.snapshot.tacticalBattle?.phase).toBe('fighting');
  model.save();
  emit({ type: 'open-saves' });
  expect(model.snapshot.screen).toBe('saves');
  expect(model.snapshot.tacticalBattle).toBeNull();
  button!.click();
  expect(model.snapshot.tacticalBattle?.phase).toBe('fighting');
  expect(save).not.toHaveBeenCalled();
  controller.dispose();
});

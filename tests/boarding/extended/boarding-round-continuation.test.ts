import { afterEach, describe, expect, it, vi } from 'vitest';
import { MasterController } from '../../../src/client/app/controllers/MasterController.js';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { playerNoticeText } from '../../../src/client/app/views/playerNoticeText.js';
import type { IntentHandler } from '../../../src/client/app/views/ViewContracts.js';
import { Game } from '../../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';
import { emptyStock } from '../../../src/client/space-map/models/Economy.js';
import { BrowserSaveRepository } from '../../../src/client/space-map/storage/BrowserSaveRepository.js';
import { arrangeBattle } from '../../fixtures/battle-checkpoint.js';

afterEach(() => {
  vi.useRealTimers();
});

function gameInBoarding(): Game {
  const state = new Game(createExampleGalaxy()).exportState();
  const nadir = state.pirates!.find((pirate) => pirate.id === 'pirate-nadir')!;
  const aster = state.pirates!.find((pirate) => pirate.id === 'pirate-aster')!;
  let game = Game.restore({
    ...state,
    pirates: [
      {
        ...nadir,
        position: { q: 8, r: -3 },
        count: 0,
        transports: 1,
        hold: { ...emptyStock(), Iron: 7 },
      },
      aster,
    ],
    fleets: [
      {
        ...state.fleets[0]!,
        position: { q: 8, r: -4 },
        shipUnits: [],
        ships: {
          ...state.fleets[0]!.ships,
          Fighter: 0,
          'Exploration ship': 0,
          Raptor: 0,
          'Space pirate': 1,
          'Transport ship': 0,
        },
      },
    ],
  });
  game.startTurn();
  for (let step = 0; !game.tacticalBattle && step < 20; step++) {
    if (game.phase === 'interrupted') game.continueTurn();
    const frame = game.nextTurnFrame();
    if (!frame) throw new Error('No encounter occurred.');
    game.applyFrame(frame);
  }
  game.commandBattle({ type: 'auto-deploy' });
  game.commandBattle({ type: 'start' });
  const snapshot = game.tacticalBattle!;
  const attacker = snapshot.pieces.find(
    (piece) => piece.side === 'player' && piece.type === 'Space pirate',
  )!;
  const defender = snapshot.pieces.find(
    (piece) => piece.side === 'enemy' && piece.type === 'Transport ship',
  )!;
  game = arrangeBattle(game, (battle) => ({
    ...battle,
    turn: 'player',
    activation: null,
    pieces: battle.pieces.map((piece) => ({
      ...piece,
      activated: false,
      facing:
        piece.id === attacker.id || piece.id === defender.id ? 0 : piece.facing,
      position:
        piece.id === attacker.id
          ? { q: 3, r: 4 }
          : piece.id === defender.id
            ? { q: 4, r: 3 }
            : piece.position,
    })),
  }));
  game.commandBattle({ type: 'activate', id: attacker.id });
  game.commandBattle({ type: 'dock', targetId: defender.id });
  if (game.tacticalBattle?.activation)
    game.commandBattle({ type: 'end-activation' });
  if (game.tacticalBattle?.turn === 'enemy')
    game.playBattleActivation(false, { allowDock: false });
  if (!game.boardingBattle) throw new Error('Boarding did not start.');
  for (let step = 0; game.boardingDefenderActing && step < 40; step++)
    game.playBoardingActivation(true);
  return game;
}

describe('bordning under avbruten runda', () => {
  it('bordning-utan-avbrott: resumes the space battle when boarding ends', () => {
    const game = gameInBoarding();
    game.finishBoarding('aborted');
    expect(game.boardingBattle).toBeNull();
    expect(game.tacticalBattle?.phase).toBe('fighting');
  });
  it('bordning-utan-avbrott: keeps boarding active after another round ends', () => {
    const game = gameInBoarding();
    const saved = game.exportState();
    const engagement = saved.simulation!.boarding!;
    const player = engagement.battle.people.find(
      (person) => person.side === 'player' && person.status === 'active',
    )!;
    const battle = saved.simulation!.tacticalBattles![0]!;
    const restored = Game.restore({
      ...saved,
      simulation: {
        ...saved.simulation!,
        tacticalBattles: [
          { ...battle, shift: { kind: 'boarding', remaining: 1 } },
        ],
        boarding: {
          ...engagement,
          battle: {
            ...engagement.battle,
            currentActorId: player.id,
            activation: { id: player.id, remaining: 12 },
            initiativeOrder: [player.id],
            initiativeIndex: 0,
            finishedActors: [],
            postponed: [],
          },
        },
      },
    });
    const before = restored.boardingBattle!.round;
    restored.commandBoarding({ type: 'end-activation' });
    expect(restored.boardingBattle?.round).toBeGreaterThan(before);
    expect(restored.tacticalBattle).toBeNull();
  });

  it('bordning-utan-avbrott: resumes boarding from an old save paused in space combat', () => {
    const saved = gameInBoarding().exportState();
    const battle = saved.simulation!.tacticalBattles![0]!;
    const restored = Game.restore({
      ...saved,
      simulation: {
        ...saved.simulation!,
        tacticalBattles: [
          { ...battle, shift: { kind: 'space', remaining: 2 } },
        ],
      },
    });
    expect(restored.boardingBattle).not.toBeNull();
    expect(restored.tacticalBattle).toBeNull();
    expect(Game.restore(restored.exportState()).boardingBattle).not.toBeNull();
  });
  it('sparad-forsvarartur-aterhamtas: resolves a save when its last defender is already incapacitated', () => {
    const game = gameInBoarding();
    for (
      let step = 0;
      !game.boardingDefenderActing && game.boardingBattle && step < 8;
      step++
    )
      game.commandBoarding({ type: 'end-activation' });
    const state = game.exportState();
    const engagement = state.simulation!.boarding!;
    const restored = Game.restore({
      ...state,
      simulation: {
        ...state.simulation!,
        boarding: {
          ...engagement,
          battle: {
            ...engagement.battle,
            people: engagement.battle.people.map((person) =>
              person.side === 'defender'
                ? { ...person, status: 'incapacitated' as const, hitPoints: 0 }
                : person,
            ),
          },
        },
      },
    });
    expect(restored.boardingBattle).toBeNull();
    expect(restored.fleet('fleet-home')!.ships['Transport ship']).toBe(1);
  });
  it.each(['inactive', 'missing activation', 'missing actor'] as const)(
    'sparad-forsvarartur-aterhamtas: repairs a saved defender turn with %s',
    (problem) => {
      const game = gameInBoarding();
      for (
        let step = 0;
        !game.boardingDefenderActing && game.boardingBattle && step < 8;
        step++
      )
        game.commandBoarding({ type: 'end-activation' });
      expect(game.boardingDefenderActing).toBe(true);
      const saved = game.exportState();
      const engagement = saved.simulation!.boarding!;
      const battle = engagement.battle;
      const defender = battle.people.find(
        (person) => person.id === battle.currentActorId,
      )!;
      const player = battle.people.find(
        (person) => person.side === 'player' && person.status === 'active',
      )!;
      const broken = {
        ...saved,
        simulation: {
          ...saved.simulation!,
          boarding: {
            ...engagement,
            battle: {
              ...battle,
              initiativeOrder: [defender.id, player.id],
              initiativeIndex: 0,
              finishedActors: [],
              postponed: [],
              currentActorId:
                problem === 'missing actor' ? null : battle.currentActorId,
              activation:
                problem === 'missing activation' || problem === 'missing actor'
                  ? null
                  : battle.activation,
              people: battle.people.map((person) =>
                problem === 'inactive' && person.id === defender.id
                  ? {
                      ...person,
                      status: 'incapacitated' as const,
                      hitPoints: 0,
                    }
                  : person,
              ),
            },
          },
        },
      };
      const restored = Game.restore(broken);
      expect(restored.boardingBattle?.currentActorId).toBe(player.id);
      expect(
        Game.restore(restored.exportState()).boardingBattle?.currentActorId,
      ).toBe(player.id);
    },
  );
  it('forsvarartur-fastnar-inte: resumes a saved defender turn and returns control to a soldier', async () => {
    const game = gameInBoarding();
    for (
      let step = 0;
      !game.boardingDefenderActing && game.boardingBattle && step < 8;
      step++
    )
      game.commandBoarding({ type: 'end-activation' });
    expect(game.boardingDefenderActing).toBe(true);
    const storage = new Map<string, string>();
    const saves = new BrowserSaveRepository({
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => void storage.set(key, value),
      removeItem: (key) => void storage.delete(key),
    });
    saves.save(1, {
      lastPlayed: new Date().toISOString(),
      state: game.exportState(),
    });
    const model = new AppModel(createExampleGalaxy(), saves);
    model.startSlot(1);
    vi.useFakeTimers();
    const controller = new MasterController(model, {
      bind() {},
      render() {},
      dispose() {},
    });
    controller.start();
    for (let step = 0; step < 80; step++) {
      const battle = model.snapshot.boardingBattle;
      if (
        !battle ||
        battle.phase !== 'fighting' ||
        battle.people.some(
          (person) =>
            person.id === battle.currentActorId && person.side === 'player',
        )
      )
        break;
      await vi.advanceTimersByTimeAsync(500);
    }
    const battle = model.snapshot.boardingBattle;
    expect(
      !battle ||
        battle.phase !== 'fighting' ||
        battle.people.some(
          (person) =>
            person.id === battle.currentActorId && person.side === 'player',
        ),
    ).toBe(true);
    controller.dispose();
  });
  it('keeps boarding clicks from being replaced by continuing the round', async () => {
    const game = gameInBoarding();
    const boarding = game.boardingBattle!;
    const actor = boarding.people.find(
      (person) => person.id === boarding.currentActorId,
    );
    expect(actor?.side).toBe('player');
    const values = new Map<string, string>();
    const saves = new BrowserSaveRepository({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value);
      },
      removeItem: (key) => {
        values.delete(key);
      },
    });
    saves.save(1, {
      lastPlayed: '2026-11-22T18:00:00.000Z',
      state: game.exportState(),
    });
    const model = new AppModel(createExampleGalaxy(), saves);
    model.startSlot(1);
    vi.useFakeTimers();
    let emit!: IntentHandler;
    const controller = new MasterController(model, {
      bind(handler) {
        emit = handler;
      },
      render() {},
      dispose() {},
    });
    controller.start();
    await vi.advanceTimersByTimeAsync(1);
    expect(playerNoticeText(model.snapshot.notice)).toBeNull();
    const before = model.snapshot.boardingBattle!.currentActorId;
    emit({ type: 'boarding-command', command: { type: 'end-activation' } });
    await vi.advanceTimersByTimeAsync(1);
    expect(playerNoticeText(model.snapshot.notice)).toBeNull();
    expect(model.snapshot.phase).toBe('interrupted');
    expect(model.snapshot.boardingBattle).not.toBeNull();
    expect(model.snapshot.boardingBattle!.currentActorId).not.toBe(before);
    controller.dispose();
  });
});

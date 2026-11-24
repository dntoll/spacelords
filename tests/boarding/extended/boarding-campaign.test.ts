import { BoardingEngagement } from '../../../src/client/boarding/models/battle/BoardingEngagement.js';
import { describe, expect, it } from 'vitest';
import { composeBoardingMaps } from '../../../src/client/boarding/models/map/BoardingComposer.js';
import { BoardingBattle } from '../../../src/client/boarding/models/battle/BoardingBattle.js';
import {
  TacticalBattle,
  SHIP_PROFILES,
  battleWeapons,
} from '../../../src/client/space-battle/models/TacticalBattle.js';
import { Game, SHIPS } from '../../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';
import { emptyStock } from '../../../src/client/space-map/models/Economy.js';
import { HexCoordinate } from '../../../src/client/common/HexCoordinate.js';
import { arrangeBattle } from '../../fixtures/battle-checkpoint.js';

describe('tva-skepp-pa-bordningskartan', () => {
  it('advances a hidden cockpit defender so autoplay does not stall', () => {
    const composed = composeBoardingMaps('Space pirate', 'Transport ship');
    const battle = BoardingBattle.createCampaign(
      composed,
      false,
      3,
      'Space pirate',
      'Transport ship',
    );
    const cockpit = battle.snapshot.people.find((person) => person.cockpit)!;
    const restored = BoardingBattle.restore(composed.map, {
      ...battle.snapshot,
      currentActorId: cockpit.id,
      activation: { id: cockpit.id, remaining: 12 },
      initiativeOrder: [cockpit.id],
      initiativeIndex: 0,
    });
    expect(
      restored.visibleSnapshot.people.find(
        (person) => person.id === cockpit.id,
      ),
    ).toBeUndefined();
    expect(restored.actAutomatically(true)).toBe(true);
  });

  it('forsvarare-och-civilister: a failed defender command still yields the turn', () => {
    const composed = composeBoardingMaps('Space pirate', 'Transport ship');
    const battle = BoardingBattle.createCampaign(
      composed,
      true,
      11,
      'Space pirate',
      'Transport ship',
    );
    const defender = battle.snapshot.people.find(
      (person) => person.side === 'defender',
    )!;
    const restored = BoardingBattle.restore(composed.map, {
      ...battle.snapshot,
      currentActorId: defender.id,
      activation: { id: defender.id, remaining: 12 },
      initiativeOrder: [defender.id],
      initiativeIndex: 0,
    });
    const original = restored.command.bind(restored);
    let once = true;
    restored.command = (command) => {
      if (once && command.type !== 'end-activation') {
        once = false;
        throw new Error('Choose an enemy.');
      }
      original(command);
    };
    expect(restored.actAutomatically(true)).toBe(true);
    expect(restored.snapshot.currentActorId).not.toBe(defender.id);
  });

  it('forsvarare-och-civilister: campaign autoplay returns to the player without stalling', () => {
    for (const playerIsAttacker of [true, false]) {
      const composed = composeBoardingMaps('Space pirate', 'Transport ship');
      const battle = BoardingBattle.createCampaign(
        composed,
        playerIsAttacker,
        11,
        'Space pirate',
        'Transport ship',
      );
      let steps = 0;
      let seenDefender = false;
      while (steps < 80) {
        const state = battle.snapshot;
        expect(state.phase).toBe('fighting');
        const actor = state.people.find(
          (person) => person.id === state.currentActorId,
        );
        if (actor?.side === 'player') {
          if (seenDefender) break;
          battle.command({ type: 'end-activation' });
        } else {
          seenDefender = true;
          expect(
            battle.actAutomatically(true),
            `defender autoplay stalled at step ${steps} actor=${actor?.label ?? state.currentActorId}`,
          ).toBe(true);
        }
        steps += 1;
      }
      const actor = battle.snapshot.people.find(
        (person) => person.id === battle.snapshot.currentActorId,
      );
      expect(seenDefender).toBe(true);
      expect(actor?.side).toBe('player');
      expect(steps).toBeLessThan(80);
    }
  });
});

describe('avbryt-bordning-i-egna-skepp', () => {
  it('landgang-med-bordningsstart: starts attackers in the gangway so abort is not legal yet', () => {
    const composed = composeBoardingMaps('Space pirate', 'Transport ship');
    const battle = BoardingBattle.createCampaign(
      composed,
      true,
      99,
      'Space pirate',
      'Transport ship',
    );
    expect(battle.canAbort()).toBe(false);
    const players = battle.snapshot.people.filter(
      (person) => person.side === 'player',
    );
    expect(players).toHaveLength(4);
    expect(
      players.every(
        (person) =>
          composed.map.zoneAt(person.position) === 'bridge' &&
          person.facing === 3,
      ),
    ).toBe(true);
    expect(
      battle.snapshot.people.some((person) => person.cockpit === true),
    ).toBe(true);
  });

  it('unika-startpositioner-vid-bordning: places each living person on their own floor tile', () => {
    const composed = composeBoardingMaps('Space pirate', 'Transport ship');
    for (const playerIsAttacker of [true, false]) {
      const battle = BoardingBattle.createCampaign(
        composed,
        playerIsAttacker,
        11,
        'Space pirate',
        'Transport ship',
      );
      const living = battle.snapshot.people.filter(
        (person) => person.status === 'active',
      );
      const boarders = living.filter((person) =>
        playerIsAttacker
          ? person.side === 'player'
          : person.side === 'defender' && !person.cockpit,
      );
      expect(
        boarders.every(
          (person) =>
            composed.map.zoneAt(person.position) === 'bridge' &&
            person.facing === 3,
        ),
      ).toBe(true);
      const keys = living.map(
        (person) => `${person.position.q},${person.position.r}`,
      );
      expect(new Set(keys).size).toBe(keys.length);
      expect(
        living.every(
          (person) => composed.map.terrainAt(person.position) === 'floor',
        ),
      ).toBe(true);
    }
  });
});

describe('lassta-dockade-skepp / docka-babord-styrbord', () => {
  it('locks both ships after Dock and rejects a second boarding', () => {
    const created = TacticalBattle.create(
      'dock-test',
      { q: 8, r: -4 },
      [
        {
          id: 'friendly',
          side: 'player',
          retreat: { q: 7, r: -4 },
          ships: [{ id: 'hauler', type: 'Transport ship', ion: false }],
        },
        {
          id: 'enemy',
          side: 'enemy',
          retreat: { q: 8, r: -3 },
          ships: [{ id: 'raider', type: 'Space pirate', ion: false }],
        },
      ],
      7,
    ).snapshot;
    const battle = TacticalBattle.restore({
      ...created,
      phase: 'fighting',
      round: 1,
      turn: 'enemy',
      asteroids: [],
      pieces: created.pieces.map((piece) =>
        piece.id === 'hauler'
          ? { ...piece, position: { q: 3, r: 4 }, facing: 0 }
          : { ...piece, position: { q: 4, r: 3 }, facing: 0 },
      ),
    });
    expect(battle.dockIssue('raider', 'hauler')).toBeNull();
    battle.command({ type: 'activate', id: 'raider' }, 'enemy');
    battle.command({ type: 'dock', targetId: 'hauler' }, 'enemy');
    expect(
      battle.snapshot.pieces.find((piece) => piece.id === 'raider')?.dockedWith,
    ).toBe('hauler');
    expect(battle.forwardIssue('raider')).toContain('locked');
    expect(battle.pendingBoarding).toEqual({
      attackerId: 'raider',
      defenderId: 'hauler',
    });
    // nasta-skepp-vid-slut-pa-handlingar: docking spends the action, so the
    // defender's activation finishes the round and opens the boarding.
    expect(battle.snapshot.turn).toBe('player');
    expect(battle.snapshot.activation).toBeNull();
    battle.command({ type: 'activate', id: 'hauler' }, 'player');
    expect(battle.boardingReady).toBe(true);
    expect(battle.consumeBoardingReady()).toEqual({
      attackerId: 'raider',
      defenderId: 'hauler',
    });
  });

  it('lets pirate AI choose Dock when side contact is legal', () => {
    const created = TacticalBattle.create(
      'dock-ai',
      { q: 8, r: -4 },
      [
        {
          id: 'friendly',
          side: 'player',
          retreat: { q: 7, r: -4 },
          ships: [{ id: 'hauler', type: 'Transport ship', ion: false }],
        },
        {
          id: 'enemy',
          side: 'enemy',
          retreat: { q: 8, r: -3 },
          ships: [{ id: 'raider', type: 'Space pirate', ion: false }],
        },
      ],
      9,
    ).snapshot;
    const battle = TacticalBattle.restore({
      ...created,
      phase: 'fighting',
      round: 1,
      turn: 'enemy',
      asteroids: [],
      pieces: created.pieces.map((piece) =>
        piece.id === 'hauler'
          ? { ...piece, position: { q: 3, r: 4 }, facing: 0 }
          : { ...piece, position: { q: 4, r: 3 }, facing: 0 },
      ),
    });
    battle.actAutomatically();
    expect(
      battle.snapshot.pieces.find((piece) => piece.id === 'raider')?.dockedWith,
    ).toBe('hauler');
  });
});

describe('bordning-tva-rundor-skift', () => {
  it('switches space and boarding every two finished rounds', () => {
    const battle = TacticalBattle.create(
      'shift-test',
      { q: 0, r: 0 },
      [
        {
          id: 'friendly',
          side: 'player',
          retreat: { q: -1, r: 0 },
          ships: [{ id: 'hauler', type: 'Transport ship', ion: false }],
        },
        {
          id: 'enemy',
          side: 'enemy',
          retreat: { q: 1, r: 0 },
          ships: [{ id: 'raider', type: 'Space pirate', ion: false }],
        },
      ],
      3,
    );
    battle.setShift('boarding', 2);
    expect(battle.tickShiftRound()).toBe('boarding');
    expect(battle.shift).toEqual({ kind: 'boarding', remaining: 1 });
    expect(battle.tickShiftRound()).toBe('space');
    expect(battle.shift).toEqual({ kind: 'space', remaining: 2 });
    expect(battle.tickShiftRound()).toBe('space');
    expect(battle.tickShiftRound()).toBe('boarding');
  });
});

describe('erovra-skepp-via-bordning', () => {
  it('transfers a captured ship to the winner in the same battle', () => {
    const created = TacticalBattle.create(
      'capture-test',
      { q: 8, r: -4 },
      [
        {
          id: 'friendly',
          side: 'player',
          retreat: { q: 7, r: -4 },
          ships: [{ id: 'hauler', type: 'Transport ship', ion: false }],
        },
        {
          id: 'enemy',
          side: 'enemy',
          retreat: { q: 8, r: -3 },
          ships: [{ id: 'raider', type: 'Space pirate', ion: false }],
        },
      ],
      4,
    );
    created.transferPiece('hauler', 'enemy', 'enemy');
    const captured = created.snapshot.pieces.find(
      (piece) => piece.id === 'hauler',
    );
    expect(captured).toMatchObject({
      fleetId: 'enemy',
      side: 'enemy',
    });
    expect(captured).not.toHaveProperty('dockedWith');
  });
});

describe('avbryt-bordning-i-egna-skepp', () => {
  it('lets the cockpit soldier abort once every living fighter is back in their own hull', () => {
    const composed = composeBoardingMaps('Space pirate', 'Transport ship');
    const battle = BoardingBattle.createCampaign(
      composed,
      true,
      21,
      'Space pirate',
      'Transport ship',
    );
    const snapshot = battle.snapshot;
    const playerHome = composed.attackerAirlock[0]!;
    const restored = BoardingBattle.restore(composed.map, {
      ...snapshot,
      people: snapshot.people.map((person) =>
        person.side === 'player'
          ? { ...person, position: playerHome, status: 'active' as const }
          : person.cockpit
            ? person
            : { ...person, status: 'dead' as const, hitPoints: 0 },
      ),
    });
    expect(restored.canAbort()).toBe(true);
    restored.command({ type: 'abort' });
    expect(restored.snapshot.outcome).toBe('aborted');
    expect(
      restored.snapshot.people.find((person) => person.cockpit)?.status,
    ).toBe('active');
  });
});

describe('bordningsbeloning-last-teknik-karta', () => {
  it('gives a Raptor light cannon stats', () => {
    expect(SHIPS.Raptor).toEqual({ crew: 50, speed: 2 });
    expect(SHIP_PROFILES.Raptor).toEqual({ size: 1, hull: 7, movement: 3 });
    expect(battleWeapons('Raptor')).toEqual(['Light cannon']);
  });

  it('captures hold cargo and reveals a disk of 4 around the nearest other pirate', () => {
    const galaxy = createExampleGalaxy();
    const state = new Game(galaxy).exportState();
    const nadir = state.pirates!.find(
      (pirate) => pirate.id === 'pirate-nadir',
    )!;
    const aster = state.pirates!.find(
      (pirate) => pirate.id === 'pirate-aster',
    )!;
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
          piece.id === attacker.id || piece.id === defender.id
            ? 0
            : piece.facing,
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
    expect(game.boardingBattle).not.toBeNull();
    const before = new Set(game.exportState().explored);
    game.finishBoarding('victory');
    expect(game.fleet(state.fleets[0]!.id)?.cargo?.Iron).toBe(7);
    expect(
      game.tacticalBattle!.pieces.find((piece) => piece.id === defender.id)
        ?.side,
    ).toBe('player');
    const charted = game
      .pirateMemories()
      .find((memory) => memory.pirate.id === aster.id);
    expect(charted).toBeDefined();
    const origin = new HexCoordinate(charted!.position.q, charted!.position.r);
    for (const offset of HexCoordinate.disk(4)) {
      const hex = new HexCoordinate(origin.q + offset.q, origin.r + offset.r);
      if (game.galaxy.cellAt(hex))
        expect(game.exportState().explored).toContain(hex.key);
    }
    const far = new HexCoordinate(origin.q + 5, origin.r);
    if (game.galaxy.cellAt(far) && !before.has(far.key))
      expect(game.exportState().explored).not.toContain(far.key);
  });
});

it('ljuskallestyrd-bordningsbelysning: restores existing engagement state and derives lamps without new saved fields', () => {
  const engagement = BoardingEngagement.start(
    'attacker',
    'defender',
    'Space pirate',
    'Transport ship',
    true,
    11,
  );
  const saved = JSON.parse(JSON.stringify(engagement.snapshot())) as ReturnType<
    BoardingEngagement['snapshot']
  >;
  expect(saved).not.toHaveProperty('lights');
  expect(saved.battle).not.toHaveProperty('lights');
  const restored = BoardingEngagement.restore(saved);
  expect(restored.battle.snapshot).toEqual(engagement.battle.snapshot);
  expect(restored.composed.map.lights).toEqual(engagement.composed.map.lights);
});

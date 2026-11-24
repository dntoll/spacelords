import { describe, expect, it, vi } from 'vitest';
import {
  BoardingBattle,
  BOARDING_HEARING_RANGE,
  boardingTurnsToward,
  type BoardingBattleState,
  type BoardingPerson,
} from '../../../src/client/boarding/models/battle/BoardingBattle.js';
import { chooseDefenderCommand } from '../../../src/client/boarding/models/battle/BoardingAI.js';
import {
  BoardingMap,
  type BoardingTerrain,
} from '../../../src/client/boarding/models/map/BoardingMap.js';

/** A long open deck: a boarder at the west end, two guards facing east. */
function deck() {
  const width = 34;
  const terrain = new Map<string, BoardingTerrain>();
  for (let r = 0; r < 3; r++)
    for (let q = 0; q < width; q++) terrain.set(`${q},${r}`, 'floor');
  const map = new BoardingMap('Deck', width, 3, terrain, new Map(), [], {
    player: [{ q: 1, r: 1 }],
    defender: [
      { q: 12, r: 1 },
      { q: 32, r: 1 },
    ],
    civilian: [],
  });
  const initial = BoardingBattle.create(map, 11).snapshot;
  const boarder = initial.people.find((person) => person.side === 'player')!;
  const [near, far] = initial.people.filter(
    (person) => person.side === 'defender',
  );
  const restore = (
    actorId: string,
    change: (person: BoardingPerson) => BoardingPerson = (person) => person,
  ) => {
    const state: BoardingBattleState = {
      ...initial,
      people: initial.people.map((person) => change({ ...person, facing: 0 })),
      currentActorId: actorId,
      activation: { id: actorId, remaining: 12 },
      initiativeOrder: [actorId],
      initiativeIndex: 0,
      postponed: [],
      finishedActors: [],
      lastKnownEnemies: [],
      defenderLastKnownEnemies: [],
      noiseMarkers: [],
    };
    return BoardingBattle.restore(map, state);
  };
  return { boarder, near: near!, far: far!, restore };
}

const find = (battle: BoardingBattle, id: string) =>
  battle.snapshot.people.find((person) => person.id === id)!;

describe('fiender-reagerar-pa-ljud', () => {
  it('turns a guard within earshot towards an explosion behind it', () => {
    const { boarder, near, restore } = deck();
    const battle = restore(boarder.id);
    battle.command({ type: 'grenade', grenade: 'frag', at: { q: 6, r: 1 } });
    const guard = find(battle, near.id);
    expect(guard.heardAt).toBeDefined();
    // Facing the blast, no longer with its back to it.
    expect(
      boardingTurnsToward(guard.position, guard.facing, guard.heardAt!),
    ).toEqual([]);
  });

  it('leaves a guard out of earshot unaware and unturned', () => {
    const { boarder, far, restore } = deck();
    const battle = restore(boarder.id);
    battle.command({ type: 'grenade', grenade: 'frag', at: { q: 6, r: 1 } });
    const guard = find(battle, far.id);
    expect(32 - 6).toBeGreaterThan(BOARDING_HEARING_RANGE.explosion);
    expect(guard.heardAt).toBeUndefined();
    expect(guard.facing).toBe(0);
  });

  it('carries an explosion further than a rifle shot', () => {
    expect(BOARDING_HEARING_RANGE.explosion).toBeGreaterThan(
      BOARDING_HEARING_RANGE.shot,
    );
    expect(BOARDING_HEARING_RANGE.shot).toBeGreaterThan(
      BOARDING_HEARING_RANGE.melee,
    );
  });

  it('keeps a guard that heard nothing where it is', () => {
    const { far, restore } = deck();
    const battle = restore(far.id);
    const command = chooseDefenderCommand(battle, find(battle, far.id));
    expect(command.type).not.toBe('walk');
    expect(command.type).not.toBe('move');
  });
});

describe('fiender-soker-upp-bordare', () => {
  it('forsvarartur-fastnar-inte: yields a defender turn when route planning fails', () => {
    const { far, restore } = deck();
    const battle = restore(far.id, (person) =>
      person.id === far.id ? { ...person, heardAt: { q: 3, r: 1 } } : person,
    );
    vi.spyOn(battle, 'pathTo').mockImplementation(() => {
      throw new Error('Route unavailable');
    });
    expect(() => battle.actAutomatically(true)).not.toThrow();
    expect(battle.snapshot.currentActorId).not.toBe(far.id);
  });
  it('heads for a heard sound even when it lies beyond this activation', () => {
    const { far, restore } = deck();
    const battle = restore(far.id, (person) =>
      person.id === far.id ? { ...person, heardAt: { q: 3, r: 1 } } : person,
    );
    const command = chooseDefenderCommand(battle, find(battle, far.id));
    expect(command.type).toBe('walk');
    battle.command(command);
    // It sets off towards the sound; on this open deck turning round
    // already shows it the boarder, which stops the walk.
    const guard = find(battle, far.id);
    expect(guard.facing).not.toBe(0);
    expect(guard.destination).toBeDefined();
  });

  it('stops chasing a sound once it has reached the spot', () => {
    const { far, restore } = deck();
    const battle = restore(far.id, (person) =>
      person.id === far.id ? { ...person, heardAt: { q: 31, r: 1 } } : person,
    );
    battle.actAutomatically(true);
    expect(find(battle, far.id).heardAt).toBeUndefined();
  });
});

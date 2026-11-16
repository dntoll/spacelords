import { describe, expect, it } from 'vitest';
import {
  BoardingBattle,
  boardingTurnsToward,
  type BoardingBattleState,
} from '../../../src/client/boarding/models/battle/BoardingBattle.js';
import {
  BoardingMap,
  type BoardingTerrain,
} from '../../../src/client/boarding/models/map/BoardingMap.js';

/**
 * An L-shaped corridor: row 2 from q 0 to 5, then column 5 down to row 4.
 * The only route from 1,2 to 5,4 is four steps east, two right turns and two
 * steps south. A defender waits out of sight in a sealed cell.
 */
function corridor() {
  const terrain = new Map<string, BoardingTerrain>();
  for (let q = 0; q <= 5; q++) terrain.set(`${q},2`, 'floor');
  for (let r = 3; r <= 4; r++) terrain.set(`5,${r}`, 'floor');
  terrain.set('11,0', 'floor');
  const map = new BoardingMap('L corridor', 12, 5, terrain, new Map(), [], {
    player: [
      { q: 1, r: 2 },
      { q: 0, r: 2 },
    ],
    defender: [{ q: 11, r: 0 }],
    civilian: [],
  });
  const initial = BoardingBattle.create(map, 17).snapshot;
  const [actor, other] = initial.people.filter(
    (person) => person.side === 'player',
  );
  const enemy = initial.people.find((person) => person.side === 'defender')!;
  const restore = (remaining: number) =>
    BoardingBattle.restore(map, {
      ...initial,
      people: initial.people.map((person) => ({ ...person, facing: 0 })),
      currentActorId: actor!.id,
      activation: { id: actor!.id, remaining },
      initiativeOrder: [actor!.id, enemy.id, other!.id],
      initiativeIndex: 0,
      postponed: [],
      finishedActors: [],
    } satisfies BoardingBattleState);
  return { map, actor: actor!, restore };
}

const personIn = (battle: BoardingBattle, id: string) =>
  battle.snapshot.people.find((person) => person.id === id)!;

describe('vand-mot-vald-ruta', () => {
  it('turns the shortest way towards a chosen tile, a quarter AP per turn', () => {
    const { actor, restore } = corridor();
    const north = restore(12);
    north.command({ type: 'face', toward: { q: 1, r: 0 } });
    expect(personIn(north, actor.id).facing).toBe(1);
    expect(north.snapshot.activation?.remaining).toBe(11.5);

    const southWest = restore(12);
    southWest.command({ type: 'face', toward: { q: 0, r: 3 } });
    expect(personIn(southWest, actor.id).facing).toBe(6);
    expect(southWest.snapshot.activation?.remaining).toBe(11.25);
  });

  it('turns only as far as the remaining AP allows', () => {
    const { restore } = corridor();
    const battle = restore(1.5);
    expect(boardingTurnsToward({ q: 1, r: 2 }, 0, { q: 0, r: 3 })).toEqual([
      -1, -1, -1,
    ]);
    battle.command({ type: 'face', toward: { q: 0, r: 3 } });
    expect(battle.snapshot.activation?.remaining).toBe(0.75);
  });

  it('needs no turn towards a tile straight ahead', () => {
    expect(boardingTurnsToward({ q: 1, r: 2 }, 0, { q: 6, r: 2 })).toEqual([]);
    expect(boardingTurnsToward({ q: 1, r: 2 }, 0, { q: 1, r: 2 })).toEqual([]);
  });
});

describe('vandning-mot-nasta-steg', () => {
  it('spends AP left after the last step on turning towards the next step', () => {
    const { actor, restore } = corridor();
    const battle = restore(9.5);
    battle.command({ type: 'walk', to: { q: 5, r: 4 } });
    const walker = personIn(battle, actor.id);
    expect(walker.position).toEqual({ q: 5, r: 2 });
    expect(walker.facing).toBe(3);
  });

  it('turns as far as the AP allows when it cannot finish the turn', () => {
    const { actor, restore } = corridor();
    const battle = restore(8.25);
    battle.command({ type: 'walk', to: { q: 5, r: 4 } });
    expect(personIn(battle, actor.id).facing).toBe(7);
    expect(battle.snapshot.currentActorId).not.toBe(actor.id);
    expect(personIn(battle, actor.id).carriedAp ?? 0).toBe(0);
  });
});

describe('ap-fraktion-sparas', () => {
  it('ends the turn on a fraction of AP and adds it to the next round', () => {
    const { actor, restore } = corridor();
    const battle = restore(8.75);
    battle.command({ type: 'walk', to: { q: 5, r: 4 } });
    expect(personIn(battle, actor.id).facing).toBe(3);
    expect(battle.snapshot.currentActorId).not.toBe(actor.id);
    expect(personIn(battle, actor.id).carriedAp).toBe(0.25);
    expect(battle.actionPointsRemaining(actor.id)).toBe(0);
    const round = battle.snapshot.round;
    while (battle.snapshot.round === round)
      battle.command({ type: 'end-activation' });
    expect(battle.actionPointsRemaining(actor.id)).toBe(12.25);
    while (battle.snapshot.currentActorId !== actor.id)
      battle.command({ type: 'end-activation' });
    expect(battle.snapshot.activation?.remaining).toBe(12.25);
    expect(personIn(battle, actor.id).carriedAp ?? 0).toBe(0);
  });

  it('saves anything below the cost of the next step, not only fractions', () => {
    const { actor, restore } = corridor();
    const battle = restore(10.25);
    battle.command({ type: 'walk', to: { q: 5, r: 4 } });
    expect(personIn(battle, actor.id).facing).toBe(3);
    // 1.75 AP is left, less than the 2 AP the next step costs.
    expect(battle.snapshot.currentActorId).not.toBe(actor.id);
    expect(personIn(battle, actor.id).carriedAp).toBe(1.75);
  });

  it('saves the AP when the first step is already out of reach', () => {
    const { actor, restore } = corridor();
    const battle = restore(1.5);
    battle.command({ type: 'walk', to: { q: 3, r: 2 } });
    expect(personIn(battle, actor.id).position).toEqual({ q: 1, r: 2 });
    expect(battle.snapshot.currentActorId).not.toBe(actor.id);
    expect(personIn(battle, actor.id).carriedAp).toBe(1.5);
  });

  it('ends the turn on a fraction even when no step or turn is affordable', () => {
    const { actor, restore } = corridor();
    const battle = restore(0.5);
    battle.command({ type: 'walk', to: { q: 3, r: 2 } });
    expect(battle.snapshot.currentActorId).not.toBe(actor.id);
    expect(personIn(battle, actor.id).carriedAp).toBe(0.5);
  });
});

describe('sparad-gangdestination', () => {
  it('remembers an unreached destination and forgets it on arrival', () => {
    const { actor, restore } = corridor();
    const battle = restore(8.75);
    battle.command({ type: 'walk', to: { q: 5, r: 4 } });
    expect(personIn(battle, actor.id).destination).toEqual({ q: 5, r: 4 });
    while (battle.snapshot.currentActorId !== actor.id)
      battle.command({ type: 'end-activation' });
    battle.command({ type: 'walk', to: { q: 5, r: 4 } });
    expect(personIn(battle, actor.id).position).toEqual({ q: 5, r: 4 });
    expect(personIn(battle, actor.id).destination).toBeUndefined();
  });

  it('keeps the destination while the soldier only turns', () => {
    const { actor, restore } = corridor();
    const battle = restore(9.5);
    battle.command({ type: 'walk', to: { q: 5, r: 4 } });
    expect(personIn(battle, actor.id).destination).toBeDefined();
    while (battle.snapshot.currentActorId !== actor.id)
      battle.command({ type: 'end-activation' });
    battle.command({ type: 'turn', direction: 1 });
    battle.command({ type: 'turn', direction: 1 });
    battle.command({ type: 'face', toward: { q: 4, r: 2 } });
    expect(personIn(battle, actor.id).destination).toBeDefined();
  });

  it('a full move to another tile clears the saved destination', () => {
    const { actor, restore } = corridor();
    const battle = restore(9.5);
    battle.command({ type: 'walk', to: { q: 5, r: 4 } });
    while (battle.snapshot.currentActorId !== actor.id)
      battle.command({ type: 'end-activation' });
    battle.command({ type: 'move', to: { q: 5, r: 3 } });
    expect(personIn(battle, actor.id).destination).toBeUndefined();
  });
});

describe('fast-soldatordning', () => {
  it('gives the player soldiers their initiative slots in fixed order', () => {
    const terrain = new Map<string, BoardingTerrain>();
    for (let q = 0; q < 12; q++)
      for (let r = 0; r < 5; r++) terrain.set(`${q},${r}`, 'floor');
    const map = new BoardingMap('Open deck', 12, 5, terrain, new Map(), [], {
      player: [0, 1, 2, 3].map((r) => ({ q: 0, r })),
      defender: [0, 1, 2].map((r) => ({ q: 11, r })),
      civilian: [],
    });
    for (let seed = 1; seed <= 25; seed++) {
      const battle = BoardingBattle.create(map, seed);
      for (let round = 0; round < 2; round++) {
        const players = battle.snapshot.initiativeOrder.filter((id) =>
          id.startsWith('player-'),
        );
        expect(players).toEqual([
          'player-1',
          'player-2',
          'player-3',
          'player-4',
        ]);
        const current = battle.snapshot.round;
        while (battle.snapshot.round === current)
          battle.command({ type: 'end-activation' });
      }
    }
  });
});

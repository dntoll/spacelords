import { describe, expect, it } from 'vitest';
import {
  attackChance,
  resolveAttack,
  TacticalBattle,
  type BattleFleet,
} from '../../../src/client/space-battle/models/TacticalBattle.js';

// rymdstrid-med-d20 / besattningsvarden-i-rymdstrid: the battle receives crew
// values as fleet facts and resolves shots like boarding does.
function duel(
  fighter: Partial<BattleFleet['ships'][number]>,
  facing = 3,
): TacticalBattle {
  const created = TacticalBattle.create(
    'battle-crew',
    { q: 8, r: -4 },
    [
      {
        id: 'friendly',
        side: 'player',
        retreat: null,
        ships: [{ id: 'fighter', type: 'Fighter', ion: false, ...fighter }],
      },
      {
        id: 'enemy',
        side: 'enemy',
        retreat: null,
        ships: [{ id: 'pirate', type: 'Space pirate', ion: false }],
      },
    ],
    12345,
  ).snapshot;
  return TacticalBattle.restore({
    ...created,
    phase: 'fighting',
    round: 2,
    turn: 'player',
    asteroids: [],
    pieces: created.pieces.map((piece) => ({
      ...piece,
      position: { q: piece.id === 'fighter' ? 1 : 3, r: 4 },
      facing: piece.id === 'fighter' ? 0 : facing,
    })),
  });
}

describe('rymdstrid-med-d20', () => {
  it('hits on D20 plus bonus against defense, with natural 1 and 20 deciding alone', () => {
    expect(resolveAttack(11, 4, 15)).toEqual({
      hit: true,
      damage: 1,
      critical: false,
    });
    expect(resolveAttack(10, 4, 15)).toEqual({
      hit: false,
      damage: 0,
      critical: false,
    });
    // A natural 1 misses and a natural 20 hits twice as hard, as in boarding.
    expect(resolveAttack(1, 30, 15).hit).toBe(false);
    expect(resolveAttack(20, -10, 15)).toEqual({
      hit: true,
      damage: 2,
      critical: true,
    });
  });

  it('shows the same chance as boarding, between 5 and 95 percent', () => {
    expect(attackChance(4, 15)).toBe(50);
    expect(attackChance(1, 15)).toBe(35);
    expect(attackChance(30, 15)).toBe(95);
    expect(attackChance(-30, 15)).toBe(5);
  });

  it('keeps the old odds: a plain cannon hits half the time and the rear is easier', () => {
    const front = duel({}).shot('fighter', 'pirate', 'Cannon');
    expect(front).toMatchObject({ dice: 2, bonus: 4, defense: 15, chance: 50 });
    const rear = duel({}, 0).shot('fighter', 'pirate', 'Cannon');
    expect(rear).toMatchObject({ bonus: 7, chance: 65, rear: true });
    const raider = duel({}).shot('pirate', 'fighter', 'Raider cannon');
    expect(raider).toMatchObject({ bonus: 1, defense: 15, chance: 35 });
  });
});

describe('besattningsvarden-i-rymdstrid', () => {
  it('adds the gunner accuracy to the ship’s attacks', () => {
    expect(
      duel({ accuracy: 6 }).shot('fighter', 'pirate', 'Cannon'),
    ).toMatchObject({
      bonus: 6,
      chance: 60,
    });
  });

  it('uses the pilot’s defense for shots against the ship', () => {
    expect(
      duel({ defense: 17 }).shot('pirate', 'fighter', 'Raider cannon').chance,
    ).toBe(25);
    expect(
      duel({ defense: 13 }).shot('pirate', 'fighter', 'Raider cannon').chance,
    ).toBe(45);
  });

  it('keeps crew values across saves and rejects corrupt values', () => {
    const saved = duel({ accuracy: 6, defense: 13 }).snapshot;
    const restored = TacticalBattle.restore(structuredClone(saved));
    expect(restored.shot('fighter', 'pirate', 'Cannon').bonus).toBe(6);
    expect(restored.shot('pirate', 'fighter', 'Cannon').defense).toBe(13);
    for (const value of [-1, 0.5, 31, '6'])
      expect(() =>
        TacticalBattle.restore({
          ...saved,
          pieces: saved.pieces.map((piece) =>
            piece.id === 'fighter'
              ? { ...piece, accuracy: value as number }
              : piece,
          ),
        }),
      ).toThrow();
  });
});

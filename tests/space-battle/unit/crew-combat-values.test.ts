import { describe, expect, it } from 'vitest';
import {
  TacticalBattle,
  type BattleFleet,
} from '../../../src/client/space-battle/models/TacticalBattle.js';

// besattningsvarden-i-rymdstrid: the battle receives crew effects as fleet
// facts and applies them to every hit requirement.
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

describe('besattningsvarden-i-rymdstrid', () => {
  it('lets a skilled gunner hit on one lower and a poor gunner on one higher', () => {
    expect(duel({}).shot('fighter', 'pirate', 'Cannon').threshold).toBe(4);
    expect(duel({ aim: 1 }).shot('fighter', 'pirate', 'Cannon').threshold).toBe(
      3,
    );
    expect(
      duel({ aim: -1 }).shot('fighter', 'pirate', 'Cannon').threshold,
    ).toBe(5);
  });

  it('makes a skilled pilot harder and a poor pilot easier to hit', () => {
    const shot = (evasion: number) =>
      duel({ evasion }).shot('pirate', 'fighter', 'Raider cannon').threshold;
    expect(shot(0)).toBe(5);
    expect(shot(1)).toBe(6);
    expect(shot(-1)).toBe(4);
  });

  it('keeps every hit requirement between 2+ and 6+', () => {
    // A rear shot from a skilled gunner would otherwise need 2+ or less.
    expect(
      duel({ aim: 1 }, 0).shot('fighter', 'pirate', 'Cannon').threshold,
    ).toBe(2);
    const battle = duel({ evasion: 1, aim: -1 });
    expect(battle.shot('pirate', 'fighter', 'Raider cannon').threshold).toBe(6);
  });

  it('keeps the effects across saves and rejects corrupt values', () => {
    const saved = duel({ aim: 1, evasion: -1 }).snapshot;
    const restored = TacticalBattle.restore(structuredClone(saved));
    expect(restored.shot('fighter', 'pirate', 'Cannon').threshold).toBe(3);
    expect(restored.shot('pirate', 'fighter', 'Raider cannon').threshold).toBe(
      4,
    );
    for (const value of [2, 0.5, '1'])
      expect(() =>
        TacticalBattle.restore({
          ...saved,
          pieces: saved.pieces.map((piece) =>
            piece.id === 'fighter' ? { ...piece, aim: value as 1 } : piece,
          ),
        }),
      ).toThrow();
  });
});

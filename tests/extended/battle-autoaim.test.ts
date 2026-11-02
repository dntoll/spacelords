import { expect, it } from 'vitest';
import { TacticalBattle } from '../../src/client/models/TacticalBattle.js';

function aimedBattle() {
  const initial = TacticalBattle.create(
    'aim',
    { q: 0, r: 0 },
    [
      {
        id: 'friendly',
        side: 'player',
        retreat: null,
        ships: [{ id: 'fighter', type: 'Fighter', ion: false }],
      },
      {
        id: 'hostile',
        side: 'enemy',
        retreat: null,
        ships: ['off-axis', 'farther', 'front', 'behind', 'outside'].map(
          (id) => ({ id, type: 'Space pirate' as const, ion: false }),
        ),
      },
    ],
    12345,
  ).snapshot;
  const positions: Record<string, { q: number; r: number }> = {
    fighter: { q: 1, r: 4 },
    'off-axis': { q: 3, r: 3 },
    farther: { q: 4, r: 4 },
    front: { q: 3, r: 4 },
    behind: { q: 0, r: 4 },
    outside: { q: 6, r: 4 },
  };
  return TacticalBattle.restore({
    ...initial,
    phase: 'fighting',
    round: 2,
    turn: 'player',
    asteroids: [],
    pieces: initial.pieces.map((piece) => ({
      ...piece,
      position: positions[piece.id]!,
    })),
  });
}

it('autoaim-med-manuellt-mal: chooses the nearest hittable enemy, then straightest ahead, while retaining a valid player choice', () => {
  const battle = aimedBattle();
  const before = battle.snapshot;
  expect(battle.autoTarget('fighter', 'Cannon')).toEqual({
    id: 'front',
    at: { q: 3, r: 4 },
  });
  expect(battle.autoTarget('fighter', 'Cannon', 'farther')?.id).toBe('farther');
  expect(battle.autoTarget('fighter', 'Cannon', 'behind')?.id).toBe('front');
  expect(battle.autoTarget('fighter', 'Cannon', 'outside')?.id).toBe('front');
  expect(battle.snapshot).toEqual(before);
});

it('autoaim-med-manuellt-mal: loses blocked, destroyed and escaped targets and clears all targets when no usable weapon remains', () => {
  const initial = aimedBattle().snapshot;
  const blocked = TacticalBattle.restore({
    ...initial,
    asteroids: [{ q: 2, r: 4 }],
  });
  expect(blocked.autoTarget('fighter', 'Cannon', 'front')?.id).not.toBe(
    'front',
  );
  const gone = TacticalBattle.restore({
    ...initial,
    pieces: initial.pieces.map((piece) =>
      piece.id === 'front'
        ? { ...piece, hull: 0, status: 'destroyed' }
        : piece.id === 'farther'
          ? { ...piece, position: null, status: 'escaped' }
          : piece,
    ),
  });
  expect(gone.autoTarget('fighter', 'Cannon', 'front')?.id).toBe('off-axis');
  const empty = TacticalBattle.restore({
    ...initial,
    pieces: initial.pieces.map((piece) =>
      piece.id === 'fighter' ? { ...piece, missiles: 0 } : piece,
    ),
  });
  expect(empty.autoTarget('fighter', 'Missiles')).toBeNull();
  const rear = TacticalBattle.restore({
    ...initial,
    pieces: initial.pieces.map((piece) =>
      piece.id === 'fighter' ? { ...piece, facing: 2 } : piece,
    ),
  });
  expect(rear.autoTarget('fighter', 'Cannon')?.id).not.toBe('front');
});

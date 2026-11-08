import { expect, it } from 'vitest';
import { TacticalBattle } from '../../src/client/models/TacticalBattle.js';

function largeBattle(enemyTransport = false) {
  const battle = TacticalBattle.create(
    'large-ships',
    { q: 0, r: 0 },
    [
      {
        id: 'player',
        side: 'player',
        retreat: { q: -1, r: 0 },
        ships: [
          { id: 'fighter', type: 'Fighter', ion: false },
          ...(!enemyTransport
            ? [{ id: 'large', type: 'Transport ship' as const, ion: false }]
            : []),
        ],
      },
      {
        id: 'enemy',
        side: 'enemy',
        retreat: { q: 1, r: 0 },
        ships: [
          {
            id: 'hostile',
            type: enemyTransport ? 'Transport ship' : 'Space pirate',
            ion: false,
          },
        ],
      },
    ],
    12345,
  );
  const legacy = structuredClone(battle.snapshot);
  delete (legacy as { maneuverSystem?: boolean }).maneuverSystem;
  return TacticalBattle.restore({
    ...legacy,
    phase: 'fighting',
    round: 2,
    turn: 'player',
    asteroids: [],
    pieces: battle.snapshot.pieces.map((piece) => ({
      ...piece,
      position:
        piece.id === 'fighter'
          ? { q: enemyTransport ? 1 : 2, r: 4 }
          : piece.id === 'large'
            ? { q: 4, r: 4 }
            : { q: enemyTransport ? 5 : 9, r: 4 },
      facing: 0,
    })),
  });
}

it('stora-skepp-over-flera-hex: blocks entry into a large ship end rather than only its center', () => {
  const battle = largeBattle();
  expect(battle.forwardIssue('fighter')).toContain('occupied');
  battle.command({ type: 'activate', id: 'fighter' });
  const before = battle.snapshot;
  expect(() => battle.command({ type: 'forward' })).toThrow('occupied');
  expect(battle.snapshot).toEqual(before);
});

it('stora-skepp-over-flera-hex: can hit the stern when the ship center is beyond cannon range', () => {
  const battle = largeBattle(true);
  expect(battle.impact('fighter', { q: 4, r: 4 }, 'Cannon')).toMatchObject({
    reason: null,
    hits: [{ id: 'hostile' }],
  });
});

it('stora-skepp-over-flera-hex: rejects a blocked turn without spending movement and rotates all occupied cells together', () => {
  const state = largeBattle().snapshot;
  const blocked = TacticalBattle.restore({
    ...state,
    asteroids: [{ q: 5, r: 3 }],
  });
  blocked.command({ type: 'activate', id: 'large' });
  const before = blocked.snapshot;
  expect(() => blocked.command({ type: 'turn', direction: 1 })).toThrow(
    'occupied',
  );
  expect(blocked.snapshot).toEqual(before);
  const clear = largeBattle();
  clear.command({ type: 'activate', id: 'large' });
  clear.command({ type: 'turn', direction: 1 });
  expect(clear.occupiedHexes('large')).toEqual([
    { q: 3, r: 5 },
    { q: 4, r: 4 },
    { q: 5, r: 3 },
  ]);
});

it('stora-skepp-over-flera-hex: the stern blocks fire even when the ship center is outside the firing line', () => {
  const state = largeBattle().snapshot;
  const battle = TacticalBattle.restore({
    ...state,
    pieces: state.pieces.map((piece) => ({
      ...piece,
      position:
        piece.id === 'fighter'
          ? { q: 1, r: 4 }
          : piece.id === 'large'
            ? { q: 3, r: 3 }
            : { q: 4, r: 4 },
      facing: piece.id === 'large' ? 1 : piece.facing,
    })),
  });
  expect(battle.impact('fighter', { q: 4, r: 4 }, 'Cannon').reason).toContain(
    'blocked',
  );
});

it('stora-skepp-over-flera-hex: missile overlap damages one ship once and records the impacted hull hex', () => {
  const battle = largeBattle(true);
  const preview = battle.impact('fighter', { q: 4, r: 4 }, 'Missiles');
  expect(preview.reason).toBeNull();
  expect(preview.hits.map((hit) => hit.id)).toEqual(['hostile']);
  battle.command({ type: 'activate', id: 'fighter' });
  battle.command({ type: 'fire', at: { q: 4, r: 4 }, weapon: 'Missiles' });
  expect(battle.snapshot.lastShot!.impacts).toHaveLength(1);
  expect(battle.snapshot.lastShot!.impacts[0]!.position).toEqual({
    q: 4,
    r: 4,
  });
});

it('stora-skepp-over-flera-hex: restores legacy one-hex battles without changing their geometry', () => {
  const state = largeBattle().snapshot;
  const legacy = { ...state };
  delete legacy.largeShipFootprints;
  const battle = TacticalBattle.restore(legacy);
  expect(battle.occupiedHexes('large')).toHaveLength(1);
  expect(battle.forwardIssue('fighter')).toBeNull();
  expect(battle.snapshot).not.toHaveProperty('largeShipFootprints');
  expect(TacticalBattle.restore(battle.snapshot).snapshot).toEqual(
    battle.snapshot,
  );
});

it('stora-skepp-over-flera-hex: auto deploy fits many large hulls fully inside their zones without overlap', () => {
  const battle = TacticalBattle.create(
    'large-deployment',
    { q: 0, r: 0 },
    [
      {
        id: 'player',
        side: 'player',
        retreat: null,
        ships: Array.from({ length: 30 }, (_, index) => ({
          id: `large-${index}`,
          type:
            index % 2 ? ('Transport ship' as const) : ('Colony ship' as const),
          ion: false,
        })),
      },
      {
        id: 'enemy',
        side: 'enemy',
        retreat: null,
        ships: [{ id: 'pirate', type: 'Space pirate', ion: false }],
      },
    ],
    12345,
  );
  battle.command({ type: 'auto-deploy' });
  const occupied = battle.snapshot.pieces.flatMap((piece) =>
    battle.occupiedHexes(piece.id).map((at) => {
      expect(battle.isDeployment(at, piece.side)).toBe(true);
      return `${at.q},${at.r}`;
    }),
  );
  expect(new Set(occupied).size).toBe(occupied.length);
  expect(TacticalBattle.restore(battle.snapshot).snapshot).toEqual(
    battle.snapshot,
  );
});

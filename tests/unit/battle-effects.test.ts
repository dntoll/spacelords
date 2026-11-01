import { expect, it } from 'vitest';
import {
  BattleEffects,
  BATTLE_SHOT_DURATION,
} from '../../src/client/views/BattleEffects.js';
import { createTestBattle } from '../../src/client/models/TestBattle.js';
import {
  TacticalBattle,
  type BattleShot,
} from '../../src/client/models/TacticalBattle.js';

const salvo: BattleShot = {
  id: 'shot',
  weapon: 'Missiles',
  from: { q: 1, r: 3 },
  at: { q: 4, r: 3 },
  impacts: [
    {
      id: 'pirate',
      position: { q: 4, r: 3 },
      damage: 2,
      previousHull: 2,
      destroyed: true,
    },
  ],
};

it('animerade-stridsskott / skadepartiklar-i-strid: separates flight, impact and expiration with a bounded particle pool', () => {
  const effects = new BattleEffects(salvo);
  const flight = effects.sample(100);
  expect(flight.projectile).not.toBeNull();
  expect(flight.impacted).toBe(false);
  expect(flight.rings).toHaveLength(0);
  const impact = effects.sample(250);
  expect(impact.impacted).toBe(true);
  expect(impact.projectile).toBeNull();
  expect(impact.rings).toHaveLength(7);
  expect(impact.particles.length).toBeGreaterThan(20);
  expect(effects.sample(BATTLE_SHOT_DURATION)).toMatchObject({
    complete: true,
    particles: [],
    rings: [],
    trail: [],
  });
  const crowded = new BattleEffects({
    ...salvo,
    impacts: Array.from({ length: 30 }, (_, i) => ({
      ...salvo.impacts[0]!,
      id: `ship-${i}`,
    })),
  });
  expect(crowded.sample(250).particles.length).toBeLessThanOrEqual(128);
  const miss = new BattleEffects({
    ...salvo,
    weapon: 'Cannon',
    impacts: [{ ...salvo.impacts[0]!, damage: 0, destroyed: false }],
  }).sample(250);
  expect(miss.rings).toHaveLength(1);
  expect(miss.particles).toHaveLength(0);
});

it.each(['player', 'enemy'] as const)(
  'animerade-stridsskott: exposes immutable shot facts for %s without changing dice or combat results',
  (side) => {
    const setup = createTestBattle().snapshot;
    const positions: Record<string, { q: number; r: number }> = {
      'test-fighter-1': { q: 1, r: 3 },
      'test-fighter-2': { q: 1, r: 5 },
      'test-explorer': { q: 1, r: 7 },
      'test-transport': { q: 7, r: 5 },
      'test-colonizer': { q: 7, r: 7 },
      'test-pirate-1': { q: 4, r: 3 },
      'test-pirate-2': { q: 4, r: 5 },
    };
    const initial = {
      ...setup,
      phase: 'fighting' as const,
      round: 1,
      pieces: setup.pieces.map((piece) => ({
        ...piece,
        position: positions[piece.id]!,
      })),
    };
    const battle = TacticalBattle.restore({
      ...initial,
      turn: side,
      random: 12345,
    });
    const source = side === 'player' ? 'test-fighter-1' : 'test-pirate-1';
    const target = side === 'player' ? 'test-pirate-1' : 'test-fighter-1';
    const before = battle.snapshot;
    battle.command({ type: 'activate', id: source }, side);
    battle.command(
      {
        type: 'fire',
        weapon: side === 'player' ? 'Cannon' : 'Raider cannon',
        at: before.pieces.find((piece) => piece.id === target)!.position!,
      },
      side,
    );
    const after = battle.snapshot;
    const shot = after.lastShot!;
    const hit = shot.impacts[0]!;
    expect(shot.from).toEqual(
      before.pieces.find((piece) => piece.id === source)!.position,
    );
    expect(
      hit.previousHull -
        after.pieces.find((piece) => piece.id === target)!.hull,
    ).toBe(hit.damage);
    expect(Object.isFrozen(shot.impacts)).toBe(true);
    expect(TacticalBattle.restore(after).snapshot.lastShot).toEqual(shot);
    expect(TacticalBattle.restore(before).snapshot.lastShot).toBeUndefined();
  },
);

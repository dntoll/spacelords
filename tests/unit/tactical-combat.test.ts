import { describe, expect, it } from 'vitest';
import {
  TacticalBattle,
  SHIP_PROFILES,
  type BattleState,
} from '../../src/client/models/TacticalBattle.js';

function battle(): TacticalBattle {
  return TacticalBattle.create(
    'battle-test',
    { q: 8, r: -4 },
    [
      {
        id: 'friendly',
        side: 'player',
        retreat: { q: 7, r: -4 },
        ships: [
          { id: 'fighter', type: 'Fighter', ion: false },
          { id: 'transport', type: 'Transport ship', ion: false },
        ],
      },
      {
        id: 'enemy',
        side: 'enemy',
        retreat: { q: 8, r: -3 },
        ships: [{ id: 'pirate', type: 'Space pirate', ion: false }],
      },
    ],
    12345,
  );
}

function positioned(overrides: Partial<BattleState> = {}): TacticalBattle {
  const state = battle().snapshot;
  return TacticalBattle.restore({
    ...state,
    phase: 'fighting',
    round: 2,
    turn: 'player',
    asteroids: [],
    pieces: state.pieces.map((piece, index) => ({
      ...piece,
      position: { q: index === 2 ? 5 : index === 1 ? 3 : 1, r: 4 },
      facing: index === 2 ? 3 : 0,
    })),
    ...overrides,
  });
}

describe('tactical combat', () => {
  it('taktisk-stridskarta / stridsutplacering: fits every individual ship and keeps connected clear deployment zones', () => {
    const game = battle();
    expect(game.snapshot.pieces).toHaveLength(3);
    expect(game.snapshot.width).toBeGreaterThanOrEqual(13);
    game.command({ type: 'auto-deploy' });
    expect(
      game.snapshot.pieces
        .filter((p) => p.side === 'player')
        .every((p) => p.position),
    ).toBe(true);
    expect(game.visibleSnapshot.pieces.every((p) => p.side === 'player')).toBe(
      true,
    );
    game.command({ type: 'start' });
    expect(game.snapshot.phase).toBe('fighting');
    expect(game.snapshot.log.join(' ')).toContain('Initiative');
  });

  it('vaxelvisa-skeppsaktiveringar: spends movement on turns, alternates sides, and rejects repeat activation', () => {
    const game = positioned();
    game.command({ type: 'activate', id: 'fighter' });
    game.command({ type: 'turn', direction: 1 });
    expect(game.snapshot.activation!.remaining).toBe(3);
    game.command({ type: 'end-activation' });
    expect(game.snapshot.turn).toBe('enemy');
    expect(() => game.command({ type: 'activate', id: 'fighter' })).toThrow();
  });

  it('skyddande-stridshinder: a large ship blocks both friendly and enemy fire without absorbing the attack', () => {
    const game = positioned();
    expect(game.shot('fighter', 'pirate', 'Missiles').reason).toContain(
      'blocked',
    );
    const state = game.snapshot;
    const clear = TacticalBattle.restore({
      ...state,
      pieces: state.pieces.map((p) =>
        p.id === 'transport' ? { ...p, position: { q: 3, r: 6 } } : p,
      ),
    });
    expect(clear.shot('fighter', 'pirate', 'Missiles').reason).toBeNull();
    expect(game.snapshot.pieces.find((p) => p.id === 'transport')!.hull).toBe(
      SHIP_PROFILES['Transport ship'].hull,
    );
  });

  it('riktning-och-vapen: enforces minimum range, arc and rear vulnerability', () => {
    const state = positioned().snapshot;
    const game = TacticalBattle.restore({
      ...state,
      pieces: state.pieces
        .filter((p) => p.id !== 'transport')
        .map((p) =>
          p.id === 'pirate' ? { ...p, position: { q: 3, r: 4 }, facing: 0 } : p,
        ),
    });
    expect(game.shot('fighter', 'pirate', 'Cannon').threshold).toBe(3);
    expect(game.shot('pirate', 'fighter', 'Raider cannon').reason).toContain(
      'arc',
    );
    const adjacent = TacticalBattle.restore({
      ...game.snapshot,
      pieces: game.snapshot.pieces.map((p) =>
        p.id === 'pirate' ? { ...p, position: { q: 2, r: 4 } } : p,
      ),
    });
    expect(adjacent.shot('fighter', 'pirate', 'Missiles').reason).toContain(
      'range',
    );
  });

  it('oppna-stridstarningar / sparad-taktisk-strid: resumes exactly the same dice and permits shooting then moving', () => {
    const state = positioned().snapshot;
    const game = TacticalBattle.restore({
      ...state,
      pieces: [
        ...state.pieces
          .filter((p) => p.id !== 'transport')
          .map((p) =>
            p.id === 'pirate' ? { ...p, position: { q: 4, r: 4 } } : p,
          ),
        { ...state.pieces[2]!, id: 'other-pirate', position: { q: 9, r: 4 } },
      ],
    });
    game.command({ type: 'activate', id: 'fighter' });
    const restored = TacticalBattle.restore(
      JSON.parse(JSON.stringify(game.snapshot)) as BattleState,
    );
    for (const subject of [game, restored]) {
      subject.command({ type: 'fire', targetId: 'pirate', weapon: 'Cannon' });
      if (subject.snapshot.phase === 'fighting')
        subject.command({ type: 'forward' });
    }
    expect(restored.snapshot).toEqual(game.snapshot);
    expect(game.snapshot.log.join(' ')).toMatch(/D6.*\[/);
    expect(
      game.snapshot.pieces.find((p) => p.id === 'fighter')!.position,
    ).toEqual({ q: 2, r: 4 });
  });

  it('vaxelvisa-skeppsaktiveringar: moving before firing closes movement and firing twice never consumes dice', () => {
    const state = positioned().snapshot;
    const game = TacticalBattle.restore({
      ...state,
      pieces: state.pieces
        .filter((p) => p.id !== 'transport')
        .map((p) =>
          p.id === 'pirate' ? { ...p, position: { q: 5, r: 4 } } : p,
        ),
    });
    game.command({ type: 'activate', id: 'fighter' });
    game.command({ type: 'forward' });
    game.command({ type: 'fire', targetId: 'pirate', weapon: 'Cannon' });
    expect(() => game.command({ type: 'forward' })).toThrow();
    const rng = game.snapshot.random;
    expect(() =>
      game.command({ type: 'fire', targetId: 'pirate', weapon: 'Cannon' }),
    ).toThrow();
    expect(game.snapshot.random).toBe(rng);
  });

  it('skeppsvis-retratt: only exits the own edge after round one and preserves an escaped ship', () => {
    const state = positioned().snapshot;
    const game = TacticalBattle.restore({
      ...state,
      pieces: state.pieces.map((p) =>
        p.id === 'fighter' ? { ...p, position: { q: -2, r: 4 }, facing: 3 } : p,
      ),
    });
    game.command({ type: 'activate', id: 'fighter' });
    game.command({ type: 'forward' });
    expect(game.snapshot.pieces.find((p) => p.id === 'fighter')!.status).toBe(
      'escaped',
    );
    expect(game.snapshot.pieces.find((p) => p.id === 'fighter')!.hull).toBe(3);
  });
});

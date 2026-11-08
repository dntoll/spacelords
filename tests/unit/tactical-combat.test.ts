import { describe, expect, it } from 'vitest';
import {
  battleEscapeHexes,
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
  const state = structuredClone(battle().snapshot);
  const copy = { ...state };
  if (overrides.maneuverSystem !== true)
    delete (copy as { maneuverSystem?: boolean }).maneuverSystem;
  return TacticalBattle.restore({
    ...copy,
    phase: 'fighting',
    round: 2,
    turn: 'player',
    asteroids: [],
    pieces: copy.pieces.map((piece, index) => ({
      ...piece,
      position: { q: index === 2 ? 5 : index === 1 ? 3 : 1, r: 4 },
      facing: index === 2 ? 3 : 0,
    })),
    ...overrides,
  });
}

describe('tactical combat', () => {
  it('skyddande-stridshinder: asteroid edge touches block fire, while a nearby asteroid does not', () => {
    const state = positioned().snapshot;
    const pieces = state.pieces
      .filter((p) => p.id !== 'transport')
      .map((p) => (p.id === 'pirate' ? { ...p, position: { q: 3, r: 3 } } : p));
    const clear = TacticalBattle.restore({
      ...state,
      pieces,
      asteroids: [{ q: 2, r: 5 }],
    });
    expect(clear.shot('fighter', 'pirate', 'Missiles').reason).toBeNull();
    const touching = TacticalBattle.restore({
      ...state,
      pieces,
      asteroids: [{ q: 2, r: 4 }],
    });
    expect(touching.shot('fighter', 'pirate', 'Missiles').reason).toContain(
      'blocked',
    );
  });

  it('riktning-och-vapen: spends one missile salvo and rejects an empty launcher without consuming random state', () => {
    const state = positioned().snapshot;
    const pieces = state.pieces
      .filter((p) => p.id !== 'transport')
      .map((p) =>
        p.id === 'pirate'
          ? { ...p, type: 'Colony ship' as const, hull: 8, movement: 2 }
          : p,
      );
    const game = TacticalBattle.restore({ ...state, pieces });
    game.command({ type: 'activate', id: 'fighter' });
    game.command({ type: 'fire', weapon: 'Missiles', at: { q: 5, r: 4 } });
    expect(game.snapshot.pieces.find((p) => p.id === 'fighter')!.missiles).toBe(
      1,
    );
    const empty = TacticalBattle.restore({
      ...state,
      pieces: pieces.map((p) =>
        p.id === 'fighter' ? { ...p, missiles: 0 } : p,
      ),
    });
    empty.command({ type: 'activate', id: 'fighter' });
    const checkpoint = empty.snapshot;
    expect(() =>
      empty.command({ type: 'fire', weapon: 'Missiles', at: { q: 5, r: 4 } }),
    ).toThrow('salvos');
    expect(empty.snapshot).toEqual(checkpoint);
  });

  it('skeppsvis-retratt: rejects round-one exits and unavailable strategic retreat destinations', () => {
    const state = positioned().snapshot;
    const pieces = state.pieces.map((p) =>
      p.id === 'fighter' ? { ...p, position: { q: 7, r: 0 }, facing: 2 } : p,
    );
    const early = TacticalBattle.restore({ ...state, pieces, round: 1 });
    early.command({ type: 'activate', id: 'fighter' });
    expect(() => early.command({ type: 'forward' })).toThrow('round two');
    const blocked = TacticalBattle.restore({
      ...state,
      pieces,
      fleets: state.fleets.map((f) => ({ ...f, retreat: null })),
    });
    blocked.command({ type: 'activate', id: 'fighter' });
    expect(() => blocked.command({ type: 'forward' })).toThrow('safe retreat');
  });

  it('stridsutplacering: rejects overlap and out-of-zone placement without moving a deployed ship', () => {
    const game = battle();
    game.command({ type: 'auto-deploy' });
    const before = game.snapshot;
    const occupied = before.pieces.find((p) => p.id === 'transport')!.position!;
    expect(() =>
      game.command({
        type: 'place',
        id: 'fighter',
        position: occupied,
        facing: 0,
      }),
    ).toThrow();
    expect(() =>
      game.command({
        type: 'place',
        id: 'fighter',
        position: { q: 7, r: 0 },
        facing: 0,
      }),
    ).toThrow();
    expect(game.snapshot).toEqual(before);
  });

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
      subject.command({ type: 'fire', at: { q: 4, r: 4 }, weapon: 'Cannon' });
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
    game.command({ type: 'fire', at: { q: 5, r: 4 }, weapon: 'Cannon' });
    expect(() => game.command({ type: 'forward' })).toThrow();
    const rng = game.snapshot.random;
    expect(() =>
      game.command({ type: 'fire', at: { q: 5, r: 4 }, weapon: 'Cannon' }),
    ).toThrow();
    expect(game.snapshot.random).toBe(rng);
  });

  it('skeppsvis-retratt: only exits the own edge after round one and preserves an escaped ship', () => {
    const state = positioned().snapshot;
    const legacy = structuredClone(state);
    Reflect.deleteProperty(legacy, 'escapeZones');
    const game = TacticalBattle.restore({
      ...legacy,
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

  it('pirater-skyddar-bordade-skepp: another pirate does not fire on the ship carrying its boarders', () => {
    const state = positioned().snapshot;
    const dockedPieces = [
      {
        ...state.pieces.find((p) => p.id === 'transport')!,
        position: { q: 5, r: 4 },
        facing: 0,
        dockedWith: 'boarder',
      },
      {
        ...state.pieces.find((p) => p.id === 'pirate')!,
        id: 'boarder',
        position: { q: 5, r: 5 },
        facing: 0,
        dockedWith: 'transport',
        activated: true,
      },
      {
        ...state.pieces.find((p) => p.id === 'pirate')!,
        id: 'gunner',
        position: { q: 8, r: 4 },
        facing: 3,
      },
    ];
    const game = TacticalBattle.restore({
      ...state,
      turn: 'enemy',
      pieces: dockedPieces,
    });
    const before = game.snapshot.pieces.find((p) => p.id === 'transport')!.hull;
    game.actAutomatically();
    expect(game.snapshot.pieces.find((p) => p.id === 'transport')!.hull).toBe(
      before,
    );
    expect(game.snapshot.log.join(' ')).not.toContain('Raider cannon');

    const alternative = TacticalBattle.restore({
      ...state,
      turn: 'enemy',
      pieces: [
        ...dockedPieces,
        {
          ...state.pieces.find((p) => p.id === 'fighter')!,
          position: { q: 6, r: 3 },
        },
      ],
    });
    alternative.actAutomatically();
    expect(alternative.snapshot.log.join(' ')).toContain('Raider cannon');
  });

  it('flyktzoner-i-rymdstrid: exposes the centered top and bottom three hexes and rejects every other edge', () => {
    const generated = battle().snapshot;
    const generatedZones = battleEscapeHexes(generated);
    expect(
      generated.asteroids.some((asteroid) =>
        generatedZones.some(
          (zone) => zone.q === asteroid.q && zone.r === asteroid.r,
        ),
      ),
    ).toBe(false);
    const state = positioned().snapshot;
    const zones = battleEscapeHexes({ ...state, escapeZones: true });
    expect(zones).toEqual([
      { q: 6, r: 0 },
      { q: 7, r: 0 },
      { q: 8, r: 0 },
      { q: 2, r: 8 },
      { q: 3, r: 8 },
      { q: 4, r: 8 },
    ]);
    const game = TacticalBattle.restore({
      ...state,
      escapeZones: true,
      pieces: state.pieces.map((p) =>
        p.id === 'fighter' ? { ...p, position: { q: -2, r: 4 }, facing: 3 } : p,
      ),
    });
    game.command({ type: 'activate', id: 'fighter' });
    expect(() => game.command({ type: 'forward' })).toThrow('Escape');
  });

  it('flyktzoner-i-rymdstrid: a small ship escapes outward from a marked hex from round two', () => {
    const state = positioned().snapshot;
    const game = TacticalBattle.restore({
      ...state,
      escapeZones: true,
      pieces: state.pieces.map((p) =>
        p.id === 'fighter' ? { ...p, position: { q: 6, r: 0 }, facing: 2 } : p,
      ),
    });
    game.command({ type: 'activate', id: 'fighter' });
    game.command({ type: 'forward' });
    expect(game.snapshot.pieces.find((p) => p.id === 'fighter')).toMatchObject({
      position: null,
      status: 'escaped',
    });
  });

  it('flyktzoner-i-rymdstrid: a large ship remains targetable and committed until its whole hull has left', () => {
    const state = positioned().snapshot;
    const game = TacticalBattle.restore({
      ...state,
      escapeZones: true,
      pieces: state.pieces.map((p) =>
        p.id === 'transport'
          ? { ...p, position: { q: 6, r: 1 }, facing: 2 }
          : p.id === 'fighter'
            ? { ...p, position: { q: 1, r: 6 } }
            : { ...p, position: { q: 6, r: 3 }, facing: 2 },
      ),
    });
    game.command({ type: 'activate', id: 'transport' });
    game.command({ type: 'forward' });
    expect(
      game.snapshot.pieces.find((p) => p.id === 'transport'),
    ).toMatchObject({ status: 'active', escapeEdge: 'top' });
    expect(() => game.command({ type: 'turn', direction: 1 })).toThrow(
      'committed',
    );
    expect(() =>
      game.command({ type: 'fire', at: { q: 6, r: 3 }, weapon: 'Cannon' }),
    ).toThrow('committed');
    expect(game.shot('pirate', 'transport', 'Raider cannon').reason).toBeNull();
    game.command({ type: 'forward' });
    const partial = TacticalBattle.restore(
      JSON.parse(JSON.stringify(game.snapshot)) as BattleState,
    ).snapshot;
    expect(partial.pieces.find((p) => p.id === 'transport')).toMatchObject({
      position: { q: 6, r: -1 },
      status: 'active',
      escapeEdge: 'top',
    });
    const resumed = TacticalBattle.restore({
      ...partial,
      turn: 'player',
      activation: null,
      pieces: partial.pieces.map((p) =>
        p.id === 'transport' ? { ...p, activated: false } : p,
      ),
    });
    resumed.command({ type: 'activate', id: 'transport' });
    resumed.command({ type: 'forward' });
    expect(
      resumed.snapshot.pieces.find((p) => p.id === 'transport'),
    ).toMatchObject({ position: null, status: 'escaped' });
  });
});

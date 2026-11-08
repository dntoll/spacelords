import { describe, expect, it } from 'vitest';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
import {
  hullLossOutcome,
  maneuverPath,
  maneuverPoints,
} from '../../src/client/models/battle/Maneuver.js';
import {
  battleEscapeHexes,
  TacticalBattle,
} from '../../src/client/models/TacticalBattle.js';

describe('space maneuvering', () => {
  it('manoverpoang-och-hastighet: small ships have two maneuver points and large ships have one', () => {
    expect(maneuverPoints('Fighter')).toBe(2);
    expect(maneuverPoints('Exploration ship')).toBe(2);
    expect(maneuverPoints('Transport ship')).toBe(1);
    expect(maneuverPoints('Colony ship')).toBe(1);
    const created = TacticalBattle.create(
      'points',
      { q: 0, r: 0 },
      [
        {
          id: 'friendly',
          side: 'player',
          retreat: null,
          ships: [
            { id: 'fighter', type: 'Fighter', ion: false },
            { id: 'hauler', type: 'Transport ship', ion: false },
          ],
        },
        {
          id: 'enemy',
          side: 'enemy',
          retreat: null,
          ships: [{ id: 'pirate', type: 'Space pirate', ion: false }],
        },
      ],
      3,
    );
    created.command({ type: 'auto-deploy' });
    created.command({ type: 'start' });
    const fighter = created.snapshot.pieces.find((p) => p.id === 'fighter')!;
    created.command({ type: 'activate', id: fighter.id });
    expect(created.snapshot.activation?.remaining).toBe(2);
    created.command({ type: 'maneuver', speed: 1, direction: 0 });
    expect(
      created.snapshot.pieces.find((p) => p.id === fighter.id),
    ).toMatchObject({
      speed: 1,
    });
    expect(
      new HexCoordinate(fighter.position!.q, fighter.position!.r).distanceTo(
        new HexCoordinate(
          created.snapshot.pieces.find((p) => p.id === fighter.id)!.position!.q,
          created.snapshot.pieces.find((p) => p.id === fighter.id)!.position!.r,
        ),
      ),
    ).toBe(1);
  });

  it('ingen-avslut-med-fart-och-manoverpoang: done is refused while speed and maneuver points both remain', () => {
    const created = TacticalBattle.create(
      'must-move',
      { q: 0, r: 0 },
      [
        {
          id: 'friendly',
          side: 'player',
          retreat: null,
          ships: [{ id: 'fighter', type: 'Fighter', ion: false }],
        },
        {
          id: 'enemy',
          side: 'enemy',
          retreat: null,
          ships: [{ id: 'pirate', type: 'Space pirate', ion: false }],
        },
      ],
      4,
    );
    created.command({ type: 'auto-deploy' });
    created.command({ type: 'start' });
    const fighter = created.snapshot.pieces.find(
      (piece) => piece.id === 'fighter',
    )!;
    created.command({ type: 'activate', id: fighter.id });
    created.command({ type: 'maneuver', speed: 1, direction: 0 });
    const moving = created.snapshot.pieces.find(
      (piece) => piece.id === 'fighter',
    )!;
    expect(moving.speed).toBeGreaterThan(0);
    expect(created.snapshot.activation?.remaining).toBeGreaterThan(0);
    expect(created.endIssue(fighter.id)).toMatch(/speed/);
    expect(() => created.command({ type: 'end-activation' })).toThrow(/speed/);
    expect(created.snapshot.activation?.id).toBe(fighter.id);
  });

  it('beskjut-asteroid / skott-mellan-manoverpoang: a shot breaks an asteroid and still requires the other maneuver point', () => {
    const created = TacticalBattle.create(
      'asteroid-shot',
      { q: 0, r: 0 },
      [
        {
          id: 'friendly',
          side: 'player',
          retreat: null,
          ships: [{ id: 'fighter', type: 'Fighter', ion: false }],
        },
        {
          id: 'enemy',
          side: 'enemy',
          retreat: null,
          ships: [{ id: 'pirate', type: 'Space pirate', ion: false }],
        },
      ],
      4,
    ).snapshot;
    const battle = TacticalBattle.restore({
      ...created,
      phase: 'fighting',
      round: 2,
      turn: 'player',
      asteroids: [{ q: 3, r: 4 }],
      pieces: created.pieces.map((piece) => ({
        ...piece,
        speed: 0,
        position: piece.id === 'pirate' ? { q: 8, r: 4 } : { q: 1, r: 4 },
        facing: 0,
      })),
    });
    battle.command({ type: 'activate', id: 'fighter' });
    battle.command({ type: 'maneuver', speed: 0, direction: 0 });
    expect(battle.snapshot.activation?.remaining).toBe(1);
    battle.command({ type: 'fire', at: { q: 3, r: 4 }, weapon: 'Cannon' });
    expect(battle.snapshot.asteroids).toEqual([]);
    expect(battle.snapshot.log.at(-1)).toMatch(/Asteroid at 3,4 breaks/);
    expect(battle.snapshot.phase).toBe('fighting');
    expect(battle.snapshot.round).toBe(2);
    expect(battle.snapshot.turn).toBe('player');
    expect(battle.snapshot.activation).toMatchObject({
      id: 'fighter',
      remaining: 1,
      fired: true,
    });
    expect(battle.endIssue('fighter')).toMatch(/firing/);
    expect(() => battle.command({ type: 'end-activation' })).toThrow(/firing/);
    battle.command({ type: 'maneuver', speed: 0, direction: 0 });
    expect(battle.snapshot.activation).toBeNull();
  });

  it('svang-vid-hastighet: a faster ship travels farther forward before the heading changes', () => {
    const tight = maneuverPath({ q: 0, r: 0 }, 0, 1, 1);
    const wide = maneuverPath({ q: 0, r: 0 }, 0, 4, 1);
    expect(tight).toEqual([{ position: { q: 1, r: -1 }, facing: 1 }]);
    expect(wide.map((step) => step.position)).toEqual([
      { q: 1, r: 0 },
      { q: 2, r: 0 },
      { q: 3, r: -1 },
      { q: 4, r: -2 },
    ]);
    expect(wide.at(-1)?.facing).toBe(1);
    expect(maneuverPath({ q: 2, r: 2 }, 0, 0, -1)).toEqual([
      { position: { q: 2, r: 2 }, facing: 5 },
    ]);
  });

  it('skrovslut-vrak-eller-splitter: engine loss is always a wreck and hull loss is mostly an explosion', () => {
    expect(hullLossOutcome(true, 2, 0.95)).toBe('wreck');
    expect(hullLossOutcome(false, 2, 0.01)).toBe('active');
    expect(hullLossOutcome(false, 0, 0.09)).toBe('wreck');
    expect(hullLossOutcome(false, 0, 0.1)).toBe('exploded');
    const outcomes = new Set<string>();
    for (let seed = 1; seed < 80 && outcomes.size < 2; seed++) {
      const created = TacticalBattle.create(
        `fate-${seed}`,
        { q: 0, r: 0 },
        [
          {
            id: 'friendly',
            side: 'player',
            retreat: { q: -1, r: 0 },
            ships: [{ id: 'fighter', type: 'Fighter', ion: false }],
          },
          {
            id: 'enemy',
            side: 'enemy',
            retreat: { q: 1, r: 0 },
            ships: [{ id: 'pirate', type: 'Space pirate', ion: false }],
          },
        ],
        seed,
      ).snapshot;
      const battle = TacticalBattle.restore({
        ...created,
        phase: 'fighting',
        round: 2,
        turn: 'player',
        random: seed,
        asteroids: [],
        pieces: created.pieces.map((piece) => ({
          ...piece,
          speed: piece.id === 'fighter' ? 3 : 0,
          position: piece.id === 'pirate' ? { q: 2, r: 4 } : { q: 1, r: 4 },
          facing: 0,
        })),
      });
      battle.command({ type: 'activate', id: 'fighter' });
      battle.command({ type: 'maneuver', speed: 0, direction: 0 });
      const pirate = battle.snapshot.pieces.find(
        (piece) => piece.id === 'pirate',
      )!;
      outcomes.add(pirate.status);
    }
    expect(outcomes.has('wreck')).toBe(true);
    expect(outcomes.has('destroyed')).toBe(true);
  });

  it('krock-med-skepp-och-asteroid: ramming damages both ships and an asteroid breaks', () => {
    const created = TacticalBattle.create(
      'ram',
      { q: 0, r: 0 },
      [
        {
          id: 'friendly',
          side: 'player',
          retreat: { q: -1, r: 0 },
          ships: [{ id: 'fighter', type: 'Fighter', ion: false }],
        },
        {
          id: 'enemy',
          side: 'enemy',
          retreat: { q: 1, r: 0 },
          ships: [{ id: 'pirate', type: 'Space pirate', ion: false }],
        },
      ],
      4,
    ).snapshot;
    const ram = TacticalBattle.restore({
      ...created,
      phase: 'fighting',
      round: 2,
      turn: 'player',
      asteroids: [],
      pieces: created.pieces.map((piece) => ({
        ...piece,
        speed: 1,
        position: piece.id === 'pirate' ? { q: 2, r: 4 } : { q: 1, r: 4 },
        facing: 0,
      })),
    });
    ram.command({ type: 'activate', id: 'fighter' });
    ram.command({ type: 'maneuver', speed: 0, direction: 0 });
    const fighter = ram.snapshot.pieces.find(
      (piece) => piece.id === 'fighter',
    )!;
    const pirate = ram.snapshot.pieces.find((piece) => piece.id === 'pirate')!;
    expect(fighter.position).toEqual({ q: 1, r: 4 });
    expect(fighter.hull).toBeLessThan(3);
    expect(pirate.hull).toBeLessThan(2);
    const asteroid = TacticalBattle.restore({
      ...created,
      phase: 'fighting',
      round: 2,
      turn: 'player',
      asteroids: [{ q: 2, r: 4 }],
      pieces: created.pieces.map((piece) => ({
        ...piece,
        speed: 1,
        position: piece.id === 'pirate' ? { q: 6, r: 4 } : { q: 1, r: 4 },
        facing: 0,
      })),
    });
    asteroid.command({ type: 'activate', id: 'fighter' });
    asteroid.command({ type: 'maneuver', speed: 0, direction: 0 });
    expect(asteroid.snapshot.asteroids).toEqual([]);
    expect(
      asteroid.snapshot.pieces.find((piece) => piece.id === 'fighter'),
    ).toMatchObject({ position: { q: 2, r: 4 }, hull: 2 });
  });

  it('vrak-blockerar-och-sprangs: a wreck stays, blocks movement, and explodes when shot as a last resort', () => {
    const created = TacticalBattle.create(
      'wreck',
      { q: 0, r: 0 },
      [
        {
          id: 'friendly',
          side: 'player',
          retreat: { q: -1, r: 0 },
          ships: [{ id: 'fighter', type: 'Fighter', ion: false }],
        },
        {
          id: 'enemy',
          side: 'enemy',
          retreat: { q: 1, r: 0 },
          ships: [
            { id: 'pirate', type: 'Space pirate', ion: false },
            { id: 'watcher', type: 'Space pirate', ion: false },
          ],
        },
      ],
      6,
    ).snapshot;
    const battle = TacticalBattle.restore({
      ...created,
      phase: 'fighting',
      round: 2,
      turn: 'player',
      asteroids: [],
      pieces: created.pieces.map((piece) => ({
        ...piece,
        speed: 1,
        status: piece.id === 'pirate' ? ('wreck' as const) : piece.status,
        hull: piece.id === 'pirate' ? 1 : piece.hull,
        position:
          piece.id === 'pirate'
            ? { q: 2, r: 4 }
            : piece.id === 'watcher'
              ? { q: 10, r: 4 }
              : { q: 1, r: 4 },
        facing: 0,
      })),
    });
    battle.command({ type: 'activate', id: 'fighter' });
    expect(() =>
      battle.command({ type: 'maneuver', speed: 0, direction: 0 }),
    ).toThrow('wreck');
    expect(battle.impact('fighter', { q: 2, r: 4 }, 'Cannon').reason).toContain(
      'enemy',
    );
    battle.command({ type: 'maneuver', speed: -1, direction: 0 });
    battle.command({ type: 'maneuver', speed: 0, direction: 1 });
    expect(battle.snapshot.activation?.remaining).toBe(0);
    expect(
      battle.impact('fighter', { q: 2, r: 4 }, 'Cannon').hits[0],
    ).toMatchObject({
      id: 'pirate',
      wreck: true,
    });
    battle.command({ type: 'fire', at: { q: 2, r: 4 }, weapon: 'Cannon' });
    expect(
      battle.snapshot.pieces.find((piece) => piece.id === 'pirate'),
    ).toMatchObject({
      status: 'destroyed',
      hull: 0,
    });
  });

  it('nasta-skepp-vid-slut-pa-handlingar: an unarmed ship with no maneuver points left yields the turn', () => {
    const created = TacticalBattle.create(
      'queue',
      { q: 0, r: 0 },
      [
        {
          id: 'friendly',
          side: 'player',
          retreat: { q: -1, r: 0 },
          ships: [{ id: 'shuttle', type: 'Civilian shuttle', ion: false }],
        },
        {
          id: 'enemy',
          side: 'enemy',
          retreat: { q: 1, r: 0 },
          ships: [{ id: 'pirate', type: 'Space pirate', ion: false }],
        },
      ],
      8,
    ).snapshot;
    const battle = TacticalBattle.restore({
      ...created,
      phase: 'fighting',
      round: 2,
      turn: 'player',
      asteroids: [],
      pieces: created.pieces.map((piece) => ({
        ...piece,
        position: piece.side === 'player' ? { q: 1, r: 4 } : { q: 8, r: 4 },
        facing: piece.side === 'player' ? 0 : 3,
      })),
    });
    battle.command({ type: 'activate', id: 'shuttle' });
    battle.command({ type: 'maneuver', speed: 0, direction: 0 });
    battle.command({ type: 'maneuver', speed: 0, direction: 0 });
    expect(battle.snapshot.activation).toBeNull();
    expect(battle.snapshot.turn).toBe('enemy');
  });

  it('flykt-mot-escape-zon: an unarmed enemy closes on an escape hex instead of turning back to the old edge', () => {
    const created = TacticalBattle.create(
      'flee',
      { q: 0, r: 0 },
      [
        {
          id: 'friendly',
          side: 'player',
          retreat: { q: -1, r: 0 },
          ships: [{ id: 'fighter', type: 'Fighter', ion: false }],
        },
        {
          id: 'enemy',
          side: 'enemy',
          retreat: { q: 1, r: 0 },
          ships: [{ id: 'shuttle', type: 'Civilian shuttle', ion: false }],
        },
      ],
      11,
    ).snapshot;
    const start = { q: 4, r: 4 };
    const battle = TacticalBattle.restore({
      ...created,
      phase: 'fighting',
      round: 2,
      turn: 'enemy',
      asteroids: [],
      pieces: created.pieces.map((piece) => ({
        ...piece,
        position: piece.side === 'enemy' ? start : { q: 1, r: 7 },
        facing: piece.side === 'enemy' ? 3 : 0,
        activated: piece.side === 'player',
      })),
    });
    battle.actAutomatically();
    const shuttle = battle.snapshot.pieces.find(
      (piece) => piece.id === 'shuttle',
    )!;
    const zones = battleEscapeHexes(battle.snapshot);
    const nearest = (at: { q: number; r: number }) =>
      Math.min(
        ...zones.map((zone) =>
          new HexCoordinate(at.q, at.r).distanceTo(
            new HexCoordinate(zone.q, zone.r),
          ),
        ),
      );
    expect(shuttle.facing).not.toBe(0);
    expect(shuttle.position).toBeTruthy();
    expect(nearest(shuttle.position!)).toBeLessThan(nearest(start));
  });
});

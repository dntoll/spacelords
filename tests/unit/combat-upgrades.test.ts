import { describe, expect, it } from 'vitest';
import { upgradeState } from '../fixtures/fleet-upgrades.js';
import { finishYear } from '../fixtures/salvage.js';
import { Game } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import { ResearchPlan } from '../../src/client/models/Research.js';
import { ShipUpgrades } from '../../src/client/models/ShipUpgrades.js';
import {
  TacticalBattle,
  combatDesignName,
  maxHull,
} from '../../src/client/models/TacticalBattle.js';

const ion = { 'Rocket engine': 0, 'Ion pulse engine': 1 } as const;

describe('utforskade-stridsuppgraderingar', () => {
  it('queues missiles and both armored hulls behind their prerequisites', () => {
    const missiles = new ResearchPlan();
    missiles.add('Missiles');
    expect(missiles.queue).toEqual([
      'Rocket engine factory',
      'Weapons module factory',
      'Fighter factory',
      'Missiles',
    ]);
    const armor = new ResearchPlan();
    armor.add('Armored Fighter');
    armor.add('Armored Transport');
    expect(armor.queue).toEqual([
      'Rocket engine factory',
      'Weapons module factory',
      'Armor',
      'Fighter factory',
      'Armored Fighter',
      'Transport ship factory',
      'Armored Transport',
    ]);
  });

  it('installs two missile salvos and armor only after the specific research, and keeps older fighters armed', () => {
    const plain = {
      id: 'fighter',
      type: 'Fighter' as const,
      missiles: 0,
      engines: ion,
    };
    expect(ShipUpgrades.targets([plain], new Set(['Armor']))).toEqual([]);
    expect(ShipUpgrades.targets([plain], new Set(['Missiles']))).toEqual([
      {
        shipId: 'fighter',
        ionEngines: 0,
        telescope: null,
        missiles: true,
        armored: false,
      },
    ]);
    expect(
      ShipUpgrades.targets(
        [{ id: 'legacy', type: 'Fighter', engines: ion }],
        new Set(['Missiles', 'Armored Fighter']),
      ),
    ).toEqual([
      {
        shipId: 'legacy',
        ionEngines: 0,
        telescope: null,
        missiles: false,
        armored: true,
      },
    ]);
    const state = upgradeState();
    const game = Game.restore({
      ...state,
      researched: [
        ...state.researched,
        'Weapons module factory',
        'Fighter factory',
        'Transport ship factory',
        'Missiles',
        'Armor',
        'Armored Fighter',
        'Armored Transport',
      ],
      fleets: state.fleets.map((fleet) => ({
        ...fleet,
        ships: {
          ...fleet.ships,
          'Salvage ship': 0,
          'Exploration ship': 0,
          Fighter: 1,
          'Transport ship': 1,
        },
        shipUnits: [
          { ...plain },
          {
            id: 'hauler',
            type: 'Transport ship' as const,
            engines: ion,
          },
        ],
      })),
    });
    const before = game.fleet('fleet-home')!.shipUnits;
    game.upgradeFleet('fleet-home');
    finishYear(game);
    expect(game.fleet('fleet-home')!.shipUnits).toEqual([
      { ...before![0], missiles: 2, armored: true },
      { ...before![1], armored: true },
    ]);
    const fresh = new Game(createExampleGalaxy());
    expect(
      fresh.fleet('fleet-home')!.shipUnits!.find((unit) => unit.type === 'Fighter'),
    ).toMatchObject({ missiles: 0 });
  });
});

describe('missilernas-omradeseffekt / pansar-i-strid', () => {
  it('gives armored hulls and spends one salvo on every ship in the impact area', () => {
    const battle = TacticalBattle.create(
      'area',
      { q: 0, r: 0 },
      [
        {
          id: 'friendly',
          side: 'player',
          retreat: { q: -1, r: 0 },
          ships: [
            {
              id: 'fighter',
              type: 'Fighter',
              ion: false,
              missiles: 2,
              armored: true,
            },
            {
              id: 'hauler',
              type: 'Transport ship',
              ion: false,
              armored: true,
            },
          ],
        },
        {
          id: 'enemy',
          side: 'enemy',
          retreat: { q: 1, r: 0 },
          ships: [
            { id: 'pirate', type: 'Space pirate', ion: false },
            { id: 'wing', type: 'Space pirate', ion: false },
          ],
        },
      ],
      1,
    );
    const fighter = battle.snapshot.pieces.find((piece) => piece.id === 'fighter')!;
    const hauler = battle.snapshot.pieces.find((piece) => piece.id === 'hauler')!;
    expect(fighter.hull).toBe(5);
    expect(maxHull(fighter)).toBe(5);
    expect(combatDesignName(fighter)).toBe('Armored Fighter');
    expect(hauler.hull).toBe(9);
    expect(combatDesignName(hauler)).toBe('Armored Transport');
    expect(fighter.movement).toBe(4);
    expect(hauler.movement).toBe(2);
    const fighting = TacticalBattle.restore({
      ...battle.snapshot,
      phase: 'fighting',
      round: 1,
      turn: 'player',
      asteroids: [],
      pieces: battle.snapshot.pieces.map((piece) => ({
        ...piece,
        facing: piece.side === 'player' ? 0 : 3,
        position:
          piece.id === 'fighter'
            ? { q: 0, r: 4 }
            : piece.id === 'hauler'
              ? { q: 4, r: 5 }
              : piece.id === 'pirate'
                ? { q: 4, r: 4 }
                : { q: 5, r: 4 },
      })),
    });
    const aimed = fighting.impact('fighter', { q: 4, r: 4 }, 'Missiles');
    expect(aimed.reason).toBeNull();
    expect(aimed.hits.map((hit) => hit.id).sort()).toEqual([
      'hauler',
      'pirate',
      'wing',
    ]);
    fighting.command({ type: 'activate', id: 'fighter' });
    const random = fighting.snapshot.random;
    fighting.command({ type: 'fire', weapon: 'Missiles', at: { q: 2, r: 4 } });
    expect(fighting.snapshot.random).toBe(random);
    expect(fighting.snapshot.pieces.find((piece) => piece.id === 'fighter')!.missiles).toBe(1);
    expect(fighting.snapshot.log.at(-1)).toContain('No ships in the area');
    fighting.command({ type: 'end-activation' });
    const again = TacticalBattle.restore({
      ...fighting.snapshot,
      turn: 'player',
      pieces: fighting.snapshot.pieces.map((piece) =>
        piece.id === 'fighter' ? { ...piece, activated: false } : piece,
      ),
    });
    again.command({ type: 'activate', id: 'fighter' });
    again.command({ type: 'fire', weapon: 'Missiles', at: { q: 4, r: 4 } });
    const line = again.snapshot.log.at(-1)!;
    expect(line).toContain('Armored Transport');
    expect(line).toContain('Space pirate 1');
    expect(line).toContain('Space pirate 2');
    expect(line).toMatch(/Area: \d+ damage/);
    expect(again.snapshot.pieces.find((piece) => piece.id === 'fighter')!.missiles).toBe(0);
    expect(again.snapshot.pieces.find((piece) => piece.id === 'hauler')!.hull).toBeLessThanOrEqual(9);
    expect(again.snapshot.pieces.find((piece) => piece.id === 'pirate')!.hull).toBeLessThanOrEqual(2);
  });
});

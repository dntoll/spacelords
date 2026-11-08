import { describe, expect, it } from 'vitest';
import { Game } from '../../src/client/models/Game.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import { completeTacticalBattles } from '../fixtures/tactical-combat.js';

const emptyShips = {
  Fighter: 0,
  'Exploration ship': 0,
  'Colony ship': 0,
  'Transport ship': 0,
  'Civilian shuttle': 0,
  'Space pirate': 0,
  'Salvage ship': 0,
  Raptor: 0,
};

describe('utforskningsko-som-avstickare', () => {
  it('temporarily assigns an Explore fleet and preserves its automatic order', () => {
    const game = new Game(createExampleGalaxy());
    const target = game.galaxy.systems
      .flatMap((system) => system.planets)
      .find(
        (planet) =>
          !planet.colony &&
          game.planetIntel(planet.position)?.surveyed === false,
      )!;

    game.setExploration('fleet-home', 'explore');
    game.addPlanetToQueue('exploration', target.id);

    expect(game.fleet('fleet-home')).toMatchObject({
      exploration: 'explore',
      explorationTargetId: target.id,
      detour: { kind: 'explore-planet', targetId: target.id },
    });
  });

  it('restores the saved Explore order after the queued planet is surveyed', () => {
    const game = new Game(createExampleGalaxy());
    const target = game.galaxy.systems
      .flatMap((system) => system.planets)
      .find(
        (planet) =>
          !planet.colony &&
          game.planetIntel(planet.position)?.surveyed === false,
      )!;
    const state = game.exportState();
    const restored = Game.restore({
      ...state,
      fleets: [
        {
          ...state.fleets[0]!,
          position: target.position,
          ships: { ...emptyShips, 'Exploration ship': 1 },
          shipUnits: [],
        },
      ],
    });
    restored.setExploration('fleet-home', 'explore');
    restored.addPlanetToQueue('exploration', target.id);
    restored.startTurn();
    while (restored.phase === 'simulating') {
      const frame = restored.nextTurnFrame();
      if (!frame) break;
      restored.applyFrame(frame);
    }

    expect(restored.planetIntel(target.position)?.surveyed).toBe(true);
    expect(restored.fleet('fleet-home')).toMatchObject({
      exploration: 'explore',
    });
    expect(restored.fleet('fleet-home')!.detour).toBeUndefined();
  });
});

describe('anfallsko-for-pirater / anfallsko-som-avstickare', () => {
  it('assigns a visible pirate to the closest Patrol fleet without replacing Patrol', () => {
    const base = new Game(createExampleGalaxy()).exportState();
    const pirate = base.pirates![0]!;
    const game = Game.restore({
      ...base,
      fleets: [
        {
          ...base.fleets[0]!,
          position: pirate.position,
          ships: { ...emptyShips, Fighter: 1 },
          shipUnits: [],
        },
        {
          ...base.fleets[0]!,
          id: 'observer',
          name: 'Observer',
          position: pirate.position,
          ships: { ...emptyShips, 'Exploration ship': 1 },
          shipUnits: [],
        },
      ],
    });
    game.setPatrol('fleet-home', new HexCoordinate(5, -3));

    game.addPirateToAttackQueue(pirate.id);

    expect(game.attackQueue).toEqual([
      expect.objectContaining({
        pirateId: pirate.id,
        assignedFleetId: 'fleet-home',
      }),
    ]);
    expect(game.fleet('fleet-home')).toMatchObject({
      patrol: { center: new HexCoordinate(5, -3) },
      detour: { kind: 'attack-pirate', targetId: pirate.id },
    });
    const restored = Game.restore(game.exportState());
    expect(restored.attackQueue[0]).toMatchObject({
      pirateId: pirate.id,
      assignedFleetId: 'fleet-home',
    });
    expect(restored.fleet('fleet-home')?.patrol).toBeDefined();
  });

  it('removes a target that is no longer in current sight and resumes Patrol', () => {
    const base = new Game(createExampleGalaxy()).exportState();
    const pirate = base.pirates![0]!;
    const home = base.fleets[0]!.position!;
    const game = Game.restore({
      ...base,
      attackQueue: [pirate.id],
      fleets: [
        {
          ...base.fleets[0]!,
          ships: { ...emptyShips, Fighter: 1 },
          shipUnits: [],
          patrol: { center: home, nextIndex: 0 },
          detour: { kind: 'attack-pirate', targetId: pirate.id },
        },
      ],
    });

    expect(game.attackQueue).toEqual([]);
    expect(game.fleet('fleet-home')?.detour).toBeUndefined();
    expect(game.fleet('fleet-home')?.patrol).toBeDefined();
  });

  it('finishes the detour after the first tactical battle and resumes Patrol', () => {
    const base = new Game(createExampleGalaxy()).exportState();
    const pirate = base.pirates![0]!;
    const game = Game.restore({
      ...base,
      fleets: [
        {
          ...base.fleets[0]!,
          position: pirate.position,
          ships: { ...emptyShips, Fighter: 3 },
          shipUnits: [],
        },
        {
          ...base.fleets[0]!,
          id: 'observer',
          name: 'Observer',
          position: pirate.position,
          ships: { ...emptyShips, 'Exploration ship': 1 },
          shipUnits: [],
        },
      ],
    });
    game.setPatrol(
      'fleet-home',
      new HexCoordinate(pirate.position.q, pirate.position.r)
        .neighbors()
        .find((point) => game.galaxy.isPassable(point)),
    );
    game.addPirateToAttackQueue(pirate.id);
    game.startTurn();
    for (let step = 0; step < 10 && !game.tacticalBattle; step++) {
      const frame = game.nextTurnFrame();
      if (!frame) break;
      game.applyFrame(frame);
      if (game.phase === 'interrupted' && !game.tacticalBattle)
        game.continueTurn();
    }
    completeTacticalBattles(game);

    expect(game.attackQueue).toEqual([]);
    expect(game.fleet('fleet-home')?.detour).toBeUndefined();
    if (game.fleet('fleet-home')!.ships.Fighter)
      expect(game.fleet('fleet-home')?.patrol).toBeDefined();
  });
});

describe('riktad-koloniskeppsbestallning', () => {
  it('adds the target to the queue and creates one Colony ship with its Colonize start order', () => {
    const base = new Game(createExampleGalaxy()).exportState();
    const target = base.world.systems
      .flatMap((system) => system.planets)
      .find(
        (planet) => !planet.colony && base.knownObjects?.includes(planet.id),
      )!;
    const homeId = base.colonies[0]![0];
    const colony = base.colonies[0]![1];
    const game = Game.restore({
      ...base,
      surveyedPlanets: [...(base.surveyedPlanets ?? []), target.id],
      fleets: [
        {
          ...base.fleets[0]!,
          ships: { ...emptyShips, 'Exploration ship': 1, Fighter: 1 },
          shipUnits: [],
        },
      ],
      colonies: [
        [
          homeId,
          {
            ...colony,
            buildings: [
              {
                id: 'colony-factory',
                type: 'Colony ship factory',
                slotIndex: 0,
                demolition: false,
                queue: [],
              },
              {
                id: 'engine-factory',
                type: 'Rocket engine factory',
                slotIndex: 1,
                demolition: false,
                queue: [],
              },
            ],
          },
        ],
      ],
    });

    game.requestColonyShip(target.id);

    expect(game.planetQueues.colonization.map((item) => item.planetId)).toEqual(
      [target.id],
    );
    expect(
      game
        .planetSnapshot(game.galaxy.homePlanet)!
        .projects.find((project) => project.type === 'Colony ship'),
    ).toMatchObject({
      factoryId: 'colony-factory',
      initialOrder: { kind: 'colonize', planetId: target.id },
    });
    expect(() => game.requestColonyShip(target.id)).toThrow(
      'already being built',
    );
  });

  it('keeps the queue unchanged when no reachable factory can accept the request', () => {
    const base = new Game(createExampleGalaxy()).exportState();
    const target = base.world.systems
      .flatMap((system) => system.planets)
      .find(
        (planet) => !planet.colony && base.knownObjects?.includes(planet.id),
      )!;
    const game = Game.restore({
      ...base,
      surveyedPlanets: [...(base.surveyedPlanets ?? []), target.id],
      fleets: base.fleets.map((fleet) => ({
        ...fleet,
        ships: { ...emptyShips, 'Exploration ship': 1, Fighter: 1 },
        shipUnits: [],
      })),
    });

    expect(() => game.requestColonyShip(target.id)).toThrow(
      'No reachable completed Colony ship factory',
    );
    expect(game.planetQueues.colonization).toEqual([]);
  });
});

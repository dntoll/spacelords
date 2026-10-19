import { describe, expect, it } from 'vitest';
import { Game } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';

function setup() {
  const state = new Game(createExampleGalaxy()).exportState();
  const home = state.fleets[0]!;
  return Game.restore({
    ...state,
    world: {
      ...state.world,
      systems: state.world.systems.map((system) => ({
        ...system,
        planets: system.planets.map((planet) =>
          planet.id === 'sol-1'
            ? { ...planet, colony: { ownerId: 'player', population: 1000 } }
            : planet,
        ),
      })),
    },
    colonies: [
      ...state.colonies,
      [
        'sol-1',
        { ...structuredClone(state.colonies[0]![1]), homeFleetId: null },
      ],
    ],
    tradeRoutes: [{ id: 'route-test', a: 'sol-0', b: 'sol-1', closing: false }],
    fleets: [
      home,
      {
        ...home,
        id: 'freighters',
        name: 'Freighters',
        routeId: 'route-test',
        courseOrigin: home.position!,
        destination: { q: 0, r: 1 },
        ships: {
          ...home.ships,
          Fighter: 0,
          'Exploration ship': 0,
          'Transport ship': 1,
        },
      },
    ],
    shipments: [
      {
        id: 'cargo-test',
        resource: 'Iron',
        amount: 5,
        path: ['sol-0', 'sol-1'],
        stage: 0,
        projectId: 'project-test',
        recipient: 'sol-1',
        fleetId: 'freighters',
        committed: true,
      },
    ],
  });
}

describe('forstarka-ruttflotta', () => {
  it('catches a moving route fleet without interrupting its loaded shipment', () => {
    const state = setup().exportState();
    const destination = state.world.systems[1]!.planets[0]!.position;
    const game = Game.restore({
      ...state,
      world: {
        ...state.world,
        systems: state.world.systems.map((system) => ({
          ...system,
          planets: system.planets.map((planet) =>
            planet.id === 'nadir-0'
              ? { ...planet, colony: { ownerId: 'player', population: 1000 } }
              : planet,
          ),
        })),
      },
      colonies: [
        ...state.colonies,
        [
          'nadir-0',
          { ...structuredClone(state.colonies[0]![1]), homeFleetId: null },
        ],
      ],
      tradeRoutes: [{ ...state.tradeRoutes[0]!, b: 'nadir-0' }],
      shipments: state.shipments.map((shipment) => ({
        ...shipment,
        recipient: 'nadir-0',
        path: ['sol-0', 'nadir-0'],
      })),
      fleets: state.fleets.map((fleet) =>
        fleet.id === 'freighters'
          ? { ...fleet, destination }
          : { ...fleet, position: { q: 0, r: 0 } },
      ),
    });
    game.transferShips('fleet-home', 'Fighter', 1, 'freighters');
    for (const frame of game.startTurn()) game.applyFrame(frame);
    game.finishTurn();
    expect(game.fleet('freighters')).toMatchObject({
      routeId: 'route-test',
      destination,
      cargo: { Iron: 5 },
      ships: { Fighter: 1, 'Transport ship': 1 },
    });
    expect(game.fleetSnapshots().some((fleet) => fleet.joinFleetId)).toBe(
      false,
    );
  });

  it('adds a ship on the same hex without releasing the route or changing its cargo and course', () => {
    const game = setup();
    const before = game.fleet('freighters')!;
    game.transferShips('fleet-home', 'Fighter', 1, 'freighters');
    expect(game.fleet('freighters')).toMatchObject({
      routeId: before.routeId,
      position: before.position,
      destination: before.destination,
      cargo: before.cargo,
      ships: { Fighter: 1, 'Transport ship': 1 },
    });
    expect(game.fleet('fleet-home')!.ships.Fighter).toBe(0);
    const saved = game.exportState();
    expect(saved.fleets[1]!.courseOrigin).toEqual(before.position);
    expect(Game.restore(saved).exportState()).toEqual(saved);
  });

  it('keeps removal blocked but accepts remote reinforcements without interrupting the route', () => {
    const game = setup();
    game.setDestination(
      'fleet-home',
      game.galaxy.systems[0]!.planets[2]!.position,
    );
    for (const frame of game.startTurn()) game.applyFrame(frame);
    game.finishTurn();
    expect(game.fleet('fleet-home')!.position).not.toEqual(
      game.fleet('freighters')!.position,
    );
    const before = game.exportState();
    expect(() =>
      game.transferShips('freighters', 'Transport ship', 1, 'fleet-home'),
    ).toThrow('Release');
    expect(game.exportState()).toEqual(before);
    game.transferShips('fleet-home', 'Fighter', 1, 'freighters');
    expect(game.fleet('freighters')!.ships.Fighter).toBe(0);
    expect(
      game.fleetSnapshots().some((fleet) => fleet.joinFleetId === 'freighters'),
    ).toBe(true);
    for (const frame of game.startTurn()) game.applyFrame(frame);
    game.finishTurn();
    expect(game.fleet('freighters')!.ships.Fighter).toBe(1);
    expect(game.fleet('freighters')!.routeId).toBe('route-test');
  });
});

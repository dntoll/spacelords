import { turnFrames } from '../fixtures/turn-steps.js';
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
          'Civilian shuttle': 0,
          'Space pirate': 0,
          'Salvage ship': 0,
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
    for (const frame of turnFrames(game)) game.applyFrame(frame);
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

  it('accepts remote reinforcements without interrupting the route', () => {
    const game = setup();
    game.setDestination(
      'fleet-home',
      game.galaxy.systems[0]!.planets[2]!.position,
    );
    for (const frame of turnFrames(game)) game.applyFrame(frame);
    game.finishTurn();
    expect(game.fleet('fleet-home')!.position).not.toEqual(
      game.fleet('freighters')!.position,
    );
    game.transferShips('fleet-home', 'Fighter', 1, 'freighters');
    expect(game.fleet('freighters')!.ships.Fighter).toBe(0);
    expect(
      game.fleetSnapshots().some((fleet) => fleet.joinFleetId === 'freighters'),
    ).toBe(true);
    for (const frame of turnFrames(game)) game.applyFrame(frame);
    game.finishTurn();
    expect(game.fleet('freighters')!.ships.Fighter).toBe(1);
    expect(game.fleet('freighters')!.routeId).toBe('route-test');
  });
});

describe('skepp-ur-olastad-ruttflotta', () => {
  function unloaded(transports = 2) {
    const state = setup().exportState();
    return Game.restore({
      ...state,
      shipments: [],
      fleets: state.fleets.map((fleet) =>
        fleet.id === 'freighters'
          ? {
              ...fleet,
              ships: {
                ...fleet.ships,
                Fighter: 1,
                'Transport ship': transports,
              },
            }
          : fleet,
      ),
    });
  }

  it('moves ships out without changing the remaining trade fleet course or assignment', () => {
    const game = unloaded();
    const before = game.fleet('freighters')!;
    game.transferShips('freighters', 'Transport ship', 1, 'fleet-home');
    expect(game.fleet('freighters')).toMatchObject({
      routeId: before.routeId,
      position: before.position,
      destination: before.destination,
      ships: { Fighter: 1, 'Transport ship': 1 },
    });
    expect(game.fleet('fleet-home')!.ships['Transport ship']).toBe(1);
    const saved = game.exportState();
    expect(saved.fleets[1]!.courseOrigin).toEqual(before.position);
    expect(Game.restore(saved).exportState()).toEqual(saved);
  });

  it.each(['Fighter', 'Transport ship'] as const)(
    'blocks removing a %s while any cargo is aboard, without changing saved state',
    (ship) => {
      const game = setup();
      game.transferShips('fleet-home', 'Fighter', 1, 'freighters');
      const before = game.exportState();
      for (const target of ['fleet-home', null]) {
        expect(() => game.transferShips('freighters', ship, 1, target)).toThrow(
          'cargo',
        );
        expect(game.exportState()).toEqual(before);
      }
    },
  );

  it('releases the route when its last transport leaves, preserving the remaining ships and course', () => {
    const game = unloaded(1);
    const before = game.fleet('freighters')!;
    const received = game.transferShips(
      'freighters',
      'Transport ship',
      1,
      null,
    );
    expect(received.position).toEqual(before.position);
    expect(game.fleet('freighters')).toMatchObject({
      position: before.position,
      destination: before.destination,
      ships: { Fighter: 1, 'Transport ship': 0 },
    });
    expect(game.fleet('freighters')!.routeId).toBeUndefined();
    expect(game.fleet('freighters')!.releaseRequested).toBeUndefined();
    expect(game.tradeRoutes[0]!.fleetIds).toEqual([]);
  });

  it('leaves no route assignment or position when the last ship leaves', () => {
    const state = setup().exportState();
    const game = Game.restore({ ...state, shipments: [] });
    game.transferShips('freighters', 'Transport ship', 1, null);
    expect(game.fleet('freighters')).toMatchObject({
      position: null,
      destination: null,
    });
    expect(game.fleet('freighters')!.routeId).toBeUndefined();
    expect(game.exportState().fleets[1]!.courseOrigin).toBeUndefined();
  });

  it('sends unloaded ships to distant fleets as physical reinforcements', () => {
    const game = unloaded();
    game.setDestination(
      'fleet-home',
      game.galaxy.systems[0]!.planets[2]!.position,
    );
    for (const frame of turnFrames(game)) game.applyFrame(frame);
    game.finishTurn();
    const source = game.fleet('freighters')!;
    const received = game.transferShips(
      'freighters',
      'Fighter',
      1,
      'fleet-home',
    );
    expect(received.joinFleetId).toBe('fleet-home');
    expect(received.position).toEqual(source.position);
    expect(game.fleet('fleet-home')!.ships.Fighter).toBe(1);
    expect(game.fleet('freighters')!.routeId).toBe('route-test');
  });

  it('allows removal after delivery has unloaded the cargo', () => {
    const game = setup();
    for (const frame of turnFrames(game)) game.applyFrame(frame);
    game.finishTurn();
    expect(game.fleet('freighters')!.cargo!.Iron).toBe(0);
    expect(() =>
      game.transferShips('freighters', 'Transport ship', 1, null),
    ).not.toThrow();
  });

  it('does not mistake a waiting warehouse shipment for cargo aboard the fleet', () => {
    const state = setup().exportState();
    const game = Game.restore({
      ...state,
      shipments: state.shipments.map((shipment) => ({
        ...shipment,
        fleetId: null,
      })),
    });
    const waiting = game.exportState().shipments;
    game.transferShips('freighters', 'Transport ship', 1, 'fleet-home');
    expect(game.exportState().shipments).toEqual(waiting);
    expect(game.tradeRoutes[0]!.status).toBe('Needs transport fleet');
  });

  it('finishes closing the route when its last unloaded carrier loses its transport', () => {
    const game = unloaded(1);
    game.closeTradeRoute('route-test');
    expect(game.fleet('freighters')!.releaseRequested).toBe(true);
    game.transferShips('freighters', 'Transport ship', 1, null);
    expect(game.tradeRoutes).toEqual([]);
    expect(game.fleet('freighters')!.releaseRequested).toBeUndefined();
  });

  it('keeps manual course changes and transfers during simulation blocked', () => {
    const game = unloaded();
    expect(() => game.clearDestination('freighters')).toThrow('Release');
    game.startTurn();
    expect(() =>
      game.transferShips('freighters', 'Fighter', 1, null),
    ).toThrow();
    expect(game.fleet('freighters')!.ships.Fighter).toBe(1);
  });
});

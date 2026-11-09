import { describe, expect, it } from 'vitest';
import { Game, type ShipType } from '../../src/client/models/Game.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
import { tradeNetworkState } from '../fixtures/trade-network.js';
import { finishYear } from '../fixtures/salvage.js';
import {
  ShipOrders,
  type ShipOrder,
} from '../../src/client/models/ShipOrders.js';

describe('startorder-for-nybyggda-skepp / flottval-pa-orderkarta', () => {
  it.each([false, true])(
    'produktionsflotta-efter-kolonisering: uses an empty colonizer only when explicitly selected (%s)',
    (selected) => {
      const state = tradeNetworkState(false);
      const colony = state.colonies[0]![1];
      colony.stock = {
        ...colony.stock,
        Iron: 500,
        Water: 500,
        Oil: 500,
        'Rocket engine': 20,
      };
      colony.buildings.push({
        id: 'salvage-factory',
        type: 'Salvage ship factory',
        slotIndex: 2,
        demolition: false,
      });
      let game = Game.restore({
        ...state,
        pirates: [],
        fleets: state.fleets.map((fleet) =>
          fleet.id === 'fleet-home'
            ? {
                ...fleet,
                name: 'Colony ship Tellus 1',
                position: null,
                shipUnits: [],
                ships: Object.fromEntries(
                  Object.keys(fleet.ships).map((type) => [type, 0]),
                ),
              }
            : fleet,
        ),
      });
      game.scheduleShip(
        game.galaxy.homePlanet,
        'Salvage ship',
        selected ? 'fleet-home' : null,
        'salvage-factory',
      );
      game = Game.restore(game.exportState());
      finishYear(game);
      expect(game.fleet('fleet-home')!.ships['Salvage ship']).toBe(
        selected ? 1 : 0,
      );
      expect(
        game.fleetSnapshots().find((fleet) => fleet.ships['Salvage ship'] === 1)
          ?.name,
      ).toBe(selected ? 'Colony ship Tellus 1' : 'Salvage ship Tellus 1');
    },
  );
  it('lets an explicit manual order replace a pending start order', () => {
    const state = tradeNetworkState();
    const game = Game.restore({
      ...state,
      researched: [...state.researched],
      fleets: state.fleets.map((fleet) =>
        fleet.id === 'fleet-home'
          ? { ...fleet, pendingOrder: { kind: 'explore' } }
          : fleet,
      ),
    });
    game.setDestination('fleet-home', new HexCoordinate(3, 0));
    expect(game.fleet('fleet-home')!.pendingOrder).toBeUndefined();
    finishYear(game);
    expect(game.fleet('fleet-home')!.exploration).toBeUndefined();
  });
  it.each<{ ship: Exclude<ShipType, 'Space pirate'>; order: ShipOrder }>([
    { ship: 'Salvage ship', order: { kind: 'auto-salvage' } },
    { ship: 'Fighter', order: { kind: 'guard-routes' } },
    { ship: 'Exploration ship', order: { kind: 'explore' } },
    { ship: 'Exploration ship', order: { kind: 'explore-stars' } },
    { ship: 'Fighter', order: { kind: 'patrol', position: { q: 7, r: 0 } } },
    { ship: 'Civilian shuttle', order: { kind: 'civilian-transport' } },
  ])(
    'activates $order.kind for the new $ship only after construction',
    ({ ship, order }) => {
      const state = tradeNetworkState(false);
      const colony = state.colonies[0]![1];
      colony.stock = {
        ...colony.stock,
        Iron: 500,
        Water: 500,
        Oil: 500,
        'Rocket engine': 20,
        'Telescope I': 5,
        'Weapons module': 5,
      };
      colony.buildings.push({
        id: 'ship-factory',
        type:
          ship === 'Civilian shuttle'
            ? 'Transport ship factory'
            : `${ship} factory`,
        slotIndex: 2,
        demolition: false,
      });
      const game = Game.restore({
        ...state,
        researched: [
          ...state.researched,
          'Automated salvage',
          'Civilian transport',
        ],
        pirates: [],
      });
      const before = game.fleetSnapshots().map((fleet) => fleet.id);
      game.scheduleShip(
        game.galaxy.homePlanet,
        ship,
        null,
        'ship-factory',
        order,
      );
      expect(game.fleetSnapshots().map((fleet) => fleet.id)).toEqual(before);
      const resumed = Game.restore(game.exportState());
      finishYear(resumed);
      const fleet = resumed
        .fleetSnapshots()
        .find((fleet) => !before.includes(fleet.id))!;
      expect(fleet.ships[ship]).toBe(1);
      expect(fleet.name).toBe(`${ship} ${resumed.galaxy.homePlanet.name} 1`);
      expect(fleet.pendingOrder).toBeUndefined();
      if (order.kind === 'auto-salvage')
        expect(fleet.automation).toBe('salvage');
      else if (order.kind === 'guard-routes')
        expect(fleet.automation).toBe('guard');
      else if (order.kind === 'patrol')
        expect(fleet.patrol!.center).toEqual(order.position);
      else if (order.kind === 'civilian-transport')
        expect(fleet.civilian).toBeDefined();
      else expect(fleet.exploration).toBe(order.kind);
      expect(resumed.fleet('fleet-home')!.automation).toBeUndefined();
      expect(resumed.fleet('fleet-home')!.exploration).toBeUndefined();
      expect(Game.restore(resumed.exportState()).fleet(fleet.id)).toEqual(
        fleet,
      );
    },
  );

  it('produktionsflottors-automatiska-namn: persists a separate type-and-planet sequence across renaming and reload', () => {
    const state = tradeNetworkState(false);
    const colony = state.colonies[0]![1];
    colony.stock = {
      ...colony.stock,
      Iron: 500,
      Water: 500,
      Oil: 500,
      'Rocket engine': 20,
      'Telescope I': 5,
    };
    colony.buildings.push({
      id: 'exploration-factory',
      type: 'Exploration ship factory',
      slotIndex: 2,
      demolition: false,
    });
    let game = Game.restore({ ...state, pirates: [] });
    for (let index = 0; index < 2; index++)
      game.scheduleShip(
        game.galaxy.homePlanet,
        'Exploration ship',
        null,
        'exploration-factory',
        { kind: 'explore' },
      );
    finishYear(game);
    const first = game
      .fleetSnapshots()
      .find((fleet) => fleet.name === 'Exploration ship Tellus 1')!;
    expect(first).toBeDefined();
    game.renameFleet(first.id, 'First scouts');
    game = Game.restore(game.exportState());
    finishYear(game);
    expect(
      game
        .fleetSnapshots()
        .some((fleet) => fleet.name === 'Exploration ship Tellus 2'),
    ).toBe(true);
    expect(game.exportState().productionFleetSequences).toEqual(
      expect.objectContaining({
        '["sol-0","Exploration ship"]': 3,
      }),
    );
  });

  it('keeps the new ship safe and reports a receiving fleet that disappeared during construction', () => {
    const state = tradeNetworkState();
    state.colonies[0]![1].buildings.push({
      id: 'transport-yard',
      type: 'Transport ship factory',
      slotIndex: 2,
      demolition: false,
    });
    const game = Game.restore(state);
    game.scheduleShip(
      game.galaxy.homePlanet,
      'Transport ship',
      null,
      'transport-yard',
      { kind: 'join-fleet', fleetId: 'travellers' },
    );
    const saved = game.exportState();
    const resumed = Game.restore({
      ...saved,
      fleets: saved.fleets.filter((fleet) => fleet.id !== 'travellers'),
    });
    finishYear(resumed);
    const fleet = resumed
      .fleetSnapshots()
      .find((fleet) =>
        fleet.navigationIssue?.startsWith('Start order could not begin'),
      )!;
    expect(fleet.ships['Transport ship']).toBe(1);
    expect(fleet.pendingOrder).toBeUndefined();
    expect(
      resumed.events.some(
        (event) =>
          event.round === 1 &&
          event.text.includes('Start order could not begin'),
      ),
    ).toBe(true);
  });

  it('starts a new transport on its selected route while leaving the home fleet unchanged, including after reload', () => {
    const state = tradeNetworkState();
    state.colonies[0]![1].buildings.push({
      id: 'transport-yard',
      type: 'Transport ship factory',
      slotIndex: 2,
      demolition: false,
    });
    const game = Game.restore(state);
    const before = game.fleet('fleet-home')!;
    game.scheduleShip(
      game.galaxy.homePlanet,
      'Transport ship',
      null,
      'transport-yard',
      { kind: 'join-route', routeId: 'route-test' },
    );
    const restored = Game.restore(game.exportState());
    finishYear(restored);
    expect(restored.fleet('fleet-home')!.ships).toEqual(before.ships);
    const newFleet = restored
      .fleetSnapshots()
      .find(
        (fleet) => fleet.id !== 'fleet-home' && fleet.routeId === 'route-test',
      )!;
    expect(newFleet.ships['Transport ship']).toBe(1);
    expect(newFleet.position).toEqual(game.galaxy.homePlanet.position);
    expect(newFleet.pendingOrder).toBeUndefined();
  });

  it('joins a moving non-route fleet physically and rejects a route fleet as recipient', () => {
    const game = Game.restore(tradeNetworkState());
    game.issueFleetOrder('fleet-home', {
      kind: 'join-fleet',
      fleetId: 'travellers',
    });
    expect(game.fleet('fleet-home')!.joinFleetId).toBe('travellers');
    expect(game.fleet('fleet-home')!.position).not.toEqual(
      game.fleet('travellers')!.position,
    );
    const restored = Game.restore(game.exportState());
    finishYear(restored);
    expect(restored.fleet('fleet-home')).toBeNull();
    const state = tradeNetworkState();
    const routed = Game.restore({
      ...state,
      fleets: state.fleets.map((fleet) =>
        fleet.id === 'travellers' ? { ...fleet, routeId: 'route-test' } : fleet,
      ),
    });
    expect(() =>
      routed.issueFleetOrder('fleet-home', {
        kind: 'join-fleet',
        fleetId: 'travellers',
      }),
    ).toThrow();
  });
});

describe('patrullcentrum-vid-order', () => {
  it('travels to the chosen center before beginning patrol and keeps it across reload', () => {
    const state = tradeNetworkState();
    const game = Game.restore({ ...state, pirates: [] });
    const center = new HexCoordinate(7, 0);
    game.setPatrol('fleet-home', center);
    expect(game.fleet('fleet-home')!.destination).toEqual(center);
    expect(game.fleet('fleet-home')!.patrol!.center).toEqual(center);
    const restored = Game.restore(game.exportState());
    finishYear(restored);
    expect(restored.fleet('fleet-home')!.destination).toEqual(center);
    expect(restored.fleet('fleet-home')!.patrol!.center).toEqual(center);
  });
});

describe('ruttval-for-order', () => {
  it('sorts routes with the same ship type last, then by distance, and reports their ships', () => {
    const game = Game.restore(tradeNetworkState());
    const origin = new HexCoordinate(0, 0);
    const choices = ShipOrders.routes(
      'Transport ship',
      origin,
      [
        { ...game.tradeRoutes[0]!, id: 'near-served' },
        { ...game.tradeRoutes[0]!, id: 'far-unserved' },
        { ...game.tradeRoutes[0]!, id: 'near-unserved' },
      ],
      [{ ...game.fleet('freighters')!, routeId: 'near-served' }],
      (route) => (route.id === 'far-unserved' ? 8 : 1),
    );
    expect(choices.map((choice) => choice.route.id)).toEqual([
      'near-unserved',
      'far-unserved',
      'near-served',
    ]);
    expect(choices[2]!.ships['Transport ship']).toBe(2);
  });
});

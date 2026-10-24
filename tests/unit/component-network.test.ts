import { describe, expect, it } from 'vitest';
import { Game, type BuildType } from '../../src/client/models/Game.js';
import { emptyStock } from '../../src/client/models/Economy.js';
import { tradeNetworkState } from '../fixtures/trade-network.js';

function network(
  options: {
    factories?: BuildType[];
    stock?: number;
    ionStock?: number;
    active?: boolean;
    localEngine?: boolean;
  } = {},
) {
  const state = tradeNetworkState();
  const source = state.colonies[0]![1];
  const target = state.colonies[1]![1];
  source.stock = {
    ...emptyStock(),
    Iron: 1000,
    Water: 1000,
    Oil: 1000,
    'Rocket engine': options.stock ?? 0,
    'Ion pulse engine': options.ionStock ?? 0,
    'Weapons module': options.stock ?? 0,
  };
  source.population = 10000;
  source.projects = [];
  source.buildings = (
    options.factories ?? ['Rocket engine factory', 'Weapons module factory']
  ).map((type, slotIndex) => ({
    id: `source-${slotIndex}`,
    type,
    slotIndex,
    demolition: false,
  }));
  target.stock = { ...emptyStock(), Iron: 1000, Water: 1000, Oil: 1000 };
  target.population = 10000;
  target.projects = [];
  target.buildings = [
    'Fighter factory' as const,
    ...(options.localEngine ? ['Rocket engine factory' as const] : []),
  ].map((type, slotIndex) => ({
    id: `target-${slotIndex}`,
    type,
    slotIndex,
    demolition: false,
  }));
  const game = Game.restore({
    ...state,
    fleets: state.fleets.map((f) =>
      f.id === 'freighters' && options.active !== false
        ? { ...f, routeId: 'route-test' }
        : f,
    ),
  });
  const home = game.galaxy.homePlanet;
  const destination = game.galaxy.systems[0]!.planets[1]!;
  const types = (planet = home) =>
    game.planetSnapshot(planet)!.projects.map((p) => p.type);
  const turn = () => {
    for (const frame of game.startTurn()) game.applyFrame(frame);
    game.finishTurn();
  };
  return { game, home, destination, types, turn };
}

function thirdSource(game: Game, viaHome = false) {
  const state = game.exportState();
  const planet = state.world.systems[1]!.planets[0]!;
  const source = structuredClone(state.colonies[0]![1]);
  source.homeFleetId = null;
  source.projects = [];
  return {
    ...state,
    world: {
      ...state.world,
      systems: state.world.systems.map((system) => ({
        ...system,
        planets: system.planets.map((p) =>
          p.id === planet.id
            ? { ...p, colony: { ownerId: 'player', population: 10000 } }
            : p,
        ),
      })),
    },
    colonies: [...state.colonies, [planet.id, source] as const],
    tradeRoutes: [
      ...state.tradeRoutes,
      {
        id: 'route-third',
        a: planet.id,
        b: viaHome ? 'sol-0' : 'sol-1',
        closing: false,
      },
    ],
    fleets: [
      ...state.fleets,
      {
        ...state.fleets.find((f) => f.id === 'freighters')!,
        id: 'third-carrier',
        shipUnits: [],
        position: planet.position,
        destination: null,
        routeId: 'route-third',
      },
    ],
  };
}

describe('automatiska-delorder', () => {
  it('does not treat a local queued part as producible after its factory is marked for demolition', () => {
    const state = network({
      factories: [],
      localEngine: true,
    }).game.exportState();
    state.colonies[1]![1].stock['Weapons module'] = 1;
    const game = Game.restore(state);
    const target = game.galaxy.systems[0]!.planets[1]!;
    game.scheduleComponent(target, 'Rocket engine');
    game.toggleDemolition(target, 'target-1');
    const before = game.exportState();
    expect(() => game.scheduleShip(target, 'Fighter')).toThrow('Rocket engine');
    expect(game.exportState()).toEqual(before);
  });

  it('reports readiness when available parts cover a stalled production commitment', () => {
    const { game, destination } = network();
    game.scheduleShip(destination, 'Fighter');
    const state = game.exportState();
    state.colonies[0]![1].buildings = [];
    state.colonies[1]![1].stock['Rocket engine'] = 1;
    state.colonies[1]![1].stock['Weapons module'] = 1;
    const restored = Game.restore(state);
    expect(
      restored.supplyOverview().planets.find((p) => p.id === destination.id)!
        .status,
    ).toBe('Ready');
  });

  it('preserves already shipped parts when a relay is rerouted and the consumer is cancelled', () => {
    const state = thirdSource(network({ factories: [] }).game, true);
    state.colonies[2]![1].stock['Rocket engine'] = 1;
    state.colonies[2]![1].stock['Weapons module'] = 1;
    const game = Game.restore(state);
    const target = game.galaxy.systems[0]!.planets[1]!;
    game.scheduleShip(target, 'Fighter');
    for (
      let year = 0;
      year < 8 && !game.shipments.some((s) => s.locationId === 'sol-0');
      year++
    ) {
      for (const frame of game.startTurn()) game.applyFrame(frame);
      game.finishTurn();
    }
    expect(game.shipments.every((s) => s.locationId === 'sol-0')).toBe(true);
    game.closeTradeRoute('route-test');
    const route = game.createTradeRoute('sol-0', 'sol-1');
    game.assignTradeFleet(route, 'freighters');
    expect(game.shipments).toHaveLength(2);
    game.cancelProject(target, game.planetSnapshot(target)!.projects[0]!.id);
    expect(game.shipments).toHaveLength(2);
    expect(game.shipments.every((s) => s.projectId === null)).toBe(true);
  });

  it('uses remote inventory without requiring a component factory and rejects an uncovered second order', () => {
    const { game, destination, types } = network({ factories: [], stock: 1 });
    game.scheduleShip(destination, 'Fighter');
    expect(types()).toEqual([]);
    const before = game.exportState();
    expect(() => game.scheduleShip(destination, 'Fighter')).toThrow(
      'Rocket engine',
    );
    expect(game.exportState()).toEqual(before);
  });

  it('reuses incoming surplus from cancelled cargo without duplicating it', () => {
    const state = network({ factories: [] }).game.exportState();
    const target = state.world.systems[0]!.planets[1]!;
    const game = Game.restore({
      ...state,
      shipments: (['Rocket engine', 'Weapons module'] as const).map(
        (resource, index) => ({
          id: `cargo-${index}`,
          resource,
          amount: 2,
          path: ['sol-0', 'sol-1'],
          stage: 0,
          projectId: 'cancelled',
          recipient: target.id,
          fleetId: 'freighters',
          committed: true,
        }),
      ),
      fleets: state.fleets.map((fleet) =>
        fleet.id === 'freighters'
          ? { ...fleet, destination: target.position }
          : fleet,
      ),
    });
    const destination = game.galaxy.systems[0]!.planets[1]!;
    game.scheduleShip(destination, 'Fighter');
    game.scheduleShip(destination, 'Fighter');
    expect(game.shipments.reduce((n, shipment) => n + shipment.amount, 0)).toBe(
      4,
    );
    expect(game.exportState().colonies[0]![1].projects).toEqual([]);
    for (let year = 0; year < 2; year++) {
      for (const frame of game.startTurn()) game.applyFrame(frame);
      game.finishTurn();
    }
    expect(game.planetSnapshot(destination)!.projects).toHaveLength(0);
    expect(
      game.planetSnapshot(destination)!.economy.stock['Rocket engine'],
    ).toBe(0);
  });

  it('protects the source planet own queued component needs', () => {
    const state = network({ stock: 1 }).game.exportState();
    state.colonies[0]![1].buildings.push({
      id: 'source-yard',
      type: 'Fighter factory',
      slotIndex: 2,
      demolition: false,
    });
    const game = Game.restore(state);
    game.scheduleShip(game.galaxy.homePlanet, 'Fighter');
    const target = game.galaxy.systems[0]!.planets[1]!;
    game.scheduleShip(target, 'Fighter');
    expect(
      game.planetSnapshot(game.galaxy.homePlanet)!.projects.map((p) => p.type),
    ).toEqual(['Fighter', 'Rocket engine', 'Weapons module']);
    expect(game.shipments).toHaveLength(0);
  });

  it('reuses farther queued output before creating a new order at a closer factory', () => {
    const state = thirdSource(network().game);
    state.colonies[2]![1].projects = [
      {
        id: 'third-engine',
        type: 'Rocket engine',
        slotIndex: null,
        factoryId: 'source-0',
        destinationFleetId: null,
      },
      {
        id: 'third-weapons',
        type: 'Weapons module',
        slotIndex: null,
        factoryId: 'source-1',
        destinationFleetId: null,
      },
    ];
    const game = Game.restore(state);
    game.scheduleShip(game.galaxy.systems[0]!.planets[1]!, 'Fighter');
    expect(game.planetSnapshot(game.galaxy.homePlanet)!.projects).toHaveLength(
      0,
    );
    expect(
      game
        .exportState()
        .componentOrders!.map((order) => order.productionProjectId),
    ).toEqual(['third-engine', 'third-weapons']);
  });

  it('rejects a factory scheduled for demolition without changing any pending order', () => {
    const { game, home, destination } = network();
    game.toggleDemolition(home, 'source-1');
    const before = game.exportState();
    expect(() => game.scheduleShip(destination, 'Fighter')).toThrow(
      'Weapons module',
    );
    expect(game.exportState()).toEqual(before);
  });

  it.each(['resources', 'workers'])(
    'accepts %s shortages but reports the actual production obstacle',
    (shortage) => {
      const state = network().game.exportState();
      if (shortage === 'resources') {
        for (const [, colony] of state.colonies) colony.stock.Iron = 0;
      } else state.colonies[0]![1].population = 0;
      const game = Game.restore(state);
      const target = game.galaxy.systems[0]!.planets[1]!;
      game.scheduleShip(target, 'Fighter');
      const supply = game
        .supplyOverview()
        .planets.find((p) => p.id === target.id)!;
      expect(supply.status).toBe('Needs attention');
      expect(supply.summary).toContain(
        shortage === 'resources' ? 'Iron' : 'workers',
      );
      expect(game.planetSnapshot(target)!.projects).toHaveLength(1);
    },
  );

  it('reports a local producer moved behind its dependent ship instead of promising progress', () => {
    const { game, destination } = network({ localEngine: true });
    game.scheduleShip(destination, 'Fighter');
    const ship = game.planetSnapshot(destination)!.projects[1]!;
    game.moveProject(destination, ship.id, 0);
    const supply = game
      .supplyOverview()
      .planets.find((p) => p.id === destination.id)!;
    expect(supply.status).toBe('Needs attention');
    expect(supply.summary).toContain('before');
  });

  it('does not duplicate production on repeated loading of a version 3 order', () => {
    const state = network().game.exportState();
    state.colonies[1]![1].projects.push({
      id: 'legacy-ship',
      type: 'Fighter',
      factoryId: 'target-0',
      slotIndex: null,
      destinationFleetId: null,
    });
    const first = Game.restore({ ...state, version: 3 }).exportState();
    expect(first.colonies[0]![1].projects).toEqual([]);
    expect(first.componentOrders).toEqual([]);
    expect(Game.restore(first).exportState()).toEqual(first);
  });

  it('queues remote production, waits for it, and physically delivers parts before completing the ship', () => {
    const { game, destination, types, turn } = network();
    game.scheduleShip(destination, 'Fighter');
    expect(types()).toEqual(['Rocket engine', 'Weapons module']);
    expect(types(destination)).toEqual(['Fighter']);
    expect(game.shipments).toHaveLength(0);
    expect(
      game.supplyOverview().planets.find((p) => p.id === destination.id)!
        .status,
    ).toBe('Waiting');
    const saved = game.exportState();
    expect(saved.version).toBe(7);
    expect(
      Game.restore(
        JSON.parse(JSON.stringify(saved)) as typeof saved,
      ).exportState(),
    ).toEqual(saved);
    turn();
    expect(
      game.shipments.some(
        (s) => s.material === 'Rocket engine' && s.state === 'Awaiting pickup',
      ),
    ).toBe(true);
    expect(types(destination)).toEqual(['Fighter']);
    for (let year = 0; year < 8 && types(destination).length; year++) turn();
    expect(types(destination)).toEqual([]);
    expect(
      game.fleetSnapshots().reduce((n, fleet) => n + fleet.ships.Fighter, 0),
    ).toBe(3);
  });

  it('rejects an impossible order atomically even after finding a local producer for another part', () => {
    const { game, destination } = network({ factories: [], localEngine: true });
    const before = game.exportState();
    expect(() => game.scheduleShip(destination, 'Fighter')).toThrow(
      'Weapons module',
    );
    expect(game.exportState()).toEqual(before);
  });

  it('requires an active transport path even when a route and remote factories exist', () => {
    const { game, destination } = network({ active: false });
    const before = game.exportState();
    expect(() => game.scheduleShip(destination, 'Fighter')).toThrow(
      'Rocket engine',
    );
    expect(game.exportState()).toEqual(before);
  });

  it('reserves remote inventory for a later project without creating duplicate production or shipments', () => {
    const { game, destination, types } = network({ stock: 1 });
    game.scheduleBuild(destination, 'Research station');
    game.scheduleShip(destination, 'Fighter');
    expect(types()).toEqual([]);
    expect(game.shipments.map((s) => s.material).sort()).toEqual([
      'Rocket engine',
      'Weapons module',
    ]);
    game.scheduleShip(destination, 'Fighter');
    expect(types()).toEqual(['Rocket engine', 'Weapons module']);
    const saved = game.exportState();
    expect(Game.restore(saved).exportState()).toEqual(saved);
  });

  it('reuses unallocated queued production only once and preserves the source queue', () => {
    const { game, home, destination, types } = network();
    game.scheduleBuild(home, 'Research station');
    game.scheduleComponent(home, 'Rocket engine');
    game.scheduleComponent(home, 'Weapons module');
    game.scheduleShip(destination, 'Fighter');
    expect(types()).toEqual([
      'Research station',
      'Rocket engine',
      'Weapons module',
    ]);
    game.scheduleShip(destination, 'Fighter');
    expect(types()).toEqual([
      'Research station',
      'Rocket engine',
      'Weapons module',
      'Rocket engine',
      'Weapons module',
    ]);
  });

  it('keeps remote component orders but releases their reservations when the ship is cancelled', () => {
    const { game, destination, types } = network();
    game.scheduleShip(destination, 'Fighter');
    game.cancelProject(
      destination,
      game.planetSnapshot(destination)!.projects[0]!.id,
    );
    expect(types()).toEqual(['Rocket engine', 'Weapons module']);
    game.scheduleShip(destination, 'Fighter');
    expect(types()).toEqual(['Rocket engine', 'Weapons module']);
  });

  it('prefers existing remote engines over new local production', () => {
    const { game, destination, types } = network({
      stock: 1,
      localEngine: true,
    });
    game.scheduleShip(destination, 'Fighter');
    expect(types(destination)).toEqual(['Fighter']);
    expect(game.shipments.map((s) => s.material)).toEqual([
      'Rocket engine',
      'Weapons module',
    ]);
  });

  it('chooses the fastest delivery and breaks equal estimates by stable planet ID', () => {
    for (const q of [6, 9]) {
      const state = thirdSource(network({ stock: 1 }).game);
      const game = Game.restore({
        ...state,
        fleets: state.fleets.map((fleet) =>
          fleet.id === 'freighters'
            ? { ...fleet, position: { q, r: 0 } }
            : fleet,
        ),
      });
      const target = game.galaxy.systems[0]!.planets[1]!;
      game.scheduleShip(target, 'Fighter');
      expect(game.shipments.map((s) => s.sourceId)).toEqual([
        'nadir-0',
        'nadir-0',
      ]);
    }
  });

  it('takes remaining inventory from a second supplier before ordering new production', () => {
    const state = thirdSource(network({ stock: 1 }).game);
    state.colonies[0]![1].stock['Weapons module'] = 0;
    state.colonies[2]![1].stock['Rocket engine'] = 0;
    const game = Game.restore(state);
    game.scheduleShip(game.galaxy.systems[0]!.planets[1]!, 'Fighter');
    expect(game.shipments.map((s) => [s.material, s.sourceId])).toEqual([
      ['Rocket engine', 'sol-0'],
      ['Weapons module', 'nadir-0'],
    ]);
    expect(
      game
        .exportState()
        .colonies.every(([, c]) =>
          c.projects.every((p) => p.type === 'Fighter'),
        ),
    ).toBe(true);
  });

  it('delivers manufactured parts across two links without exposing relay stock to other orders', () => {
    const state = thirdSource(network({ factories: [] }).game, true);
    state.colonies[2]![1].buildings = [
      'Rocket engine factory',
      'Weapons module factory',
    ].map((type, slotIndex) => ({
      id: `third-${slotIndex}`,
      type: type as BuildType,
      slotIndex,
      demolition: false,
    }));
    const game = Game.restore(state);
    const target = game.galaxy.systems[0]!.planets[1]!;
    game.scheduleShip(target, 'Fighter');
    expect(
      game.exportState().colonies[2]![1].projects.map((p) => p.type),
    ).toEqual(['Rocket engine', 'Weapons module']);
    let relay = false;
    for (
      let year = 0;
      year < 24 && game.planetSnapshot(target)!.projects.length;
      year++
    ) {
      for (const frame of game.startTurn()) game.applyFrame(frame);
      game.finishTurn();
      relay ||= game.shipments.some(
        (s) => s.locationId === 'sol-0' && s.sourceId === 'nadir-0',
      );
      const saved = game.exportState();
      expect(Game.restore(saved).exportState()).toEqual(saved);
    }
    expect(relay).toBe(true);
    expect(game.planetSnapshot(target)!.projects).toHaveLength(0);
    expect(
      game.planetSnapshot(game.galaxy.homePlanet)!.economy.stock[
        'Rocket engine'
      ],
    ).toBe(0);
  });

  it('keeps accepted orders and reports missing transport or factory after planning', () => {
    const { game, home, destination } = network();
    game.scheduleShip(destination, 'Fighter');
    game.releaseTradeFleet('freighters');
    expect(game.planetSnapshot(destination)!.projects).toHaveLength(1);
    expect(
      game.supplyOverview().planets.find((p) => p.id === destination.id)!
        .status,
    ).toBe('Needs attention');
    game.assignTradeFleet('route-test', 'freighters');
    expect(
      game.supplyOverview().planets.find((p) => p.id === destination.id)!
        .status,
    ).toBe('Waiting');
    game.toggleDemolition(home, 'source-0');
    expect(
      game.supplyOverview().planets.find((p) => p.id === destination.id)!
        .status,
    ).toBe('Needs attention');
  });

  it('protects parts allocated to an earlier order after queue reordering', () => {
    const { game, destination, types, turn } = network({ stock: 1 });
    game.scheduleShip(destination, 'Fighter');
    game.scheduleShip(destination, 'Fighter');
    const second = game.planetSnapshot(destination)!.projects[1]!;
    game.moveProject(destination, second.id, 0);
    turn();
    expect(types(destination)).toEqual(['Fighter', 'Fighter']);
    expect(
      game.planetSnapshot(destination)!.economy.stock['Rocket engine'],
    ).toBe(1);
    for (let year = 0; year < 10 && types(destination).length; year++) turn();
    expect(types(destination)).toEqual([]);
  });
});

describe('streckade-rutter-utan-transporter', () => {
  it('tracks usable transport on assignment and release', () => {
    const { game } = network({ active: false });
    expect(game.tradeRoutes[0]).toMatchObject({ hasActiveTransport: false });
    game.assignTradeFleet('route-test', 'freighters');
    expect(game.tradeRoutes[0]).toMatchObject({ hasActiveTransport: true });
    game.releaseTradeFleet('freighters');
    expect(game.tradeRoutes[0]).toMatchObject({ hasActiveTransport: false });
  });
});

describe('automatisk-motormontering / automatiska-delorder', () => {
  it('takes remote Ion stock before manufacturing local Rocket engines', () => {
    const { game, destination, types } = network({
      factories: [],
      stock: 1,
      ionStock: 1,
      localEngine: true,
    });
    game.scheduleShip(destination, 'Fighter');
    expect(types(destination)).toEqual(['Fighter']);
    expect(game.shipments.map((shipment) => shipment.material)).toEqual([
      'Ion pulse engine',
      'Weapons module',
    ]);
  });

  it('chooses the local Rocket factory before a remote Ion factory', () => {
    const { game, destination, types } = network({
      factories: ['Ion pulse engine factory', 'Weapons module factory'],
      localEngine: true,
    });
    game.scheduleShip(destination, 'Fighter');
    expect(types(destination)).toEqual(['Rocket engine', 'Fighter']);
    expect(types()).toEqual(['Weapons module']);
  });

  it('chooses Ion when both motor factories have the same transport time', () => {
    const { game, destination, types } = network({
      factories: [
        'Rocket engine factory',
        'Ion pulse engine factory',
        'Weapons module factory',
      ],
    });
    game.scheduleShip(destination, 'Fighter');
    expect(types()).toEqual(['Ion pulse engine', 'Weapons module']);
  });

  it('delivers a remote Ion physically and preserves its speed bonus across reinforcement', () => {
    const { game, destination, turn } = network({
      factories: [],
      stock: 1,
      ionStock: 1,
    });
    const fleet = game.createFleet();
    game.scheduleShip(destination, 'Fighter', fleet.id);
    for (
      let year = 0;
      year < 8 && game.planetSnapshot(destination)!.projects.length;
      year++
    )
      turn();
    expect(game.fleet(fleet.id)!.speed).toBe(4);
    const upgraded = game.fleet(fleet.id)!.shipUnits![0]!;
    game.transferShips(fleet.id, 'Fighter', 1, 'fleet-home', upgraded.id);
    for (
      let year = 0;
      year < 8 && game.fleetSnapshots().some((f) => f.joinFleetId);
      year++
    )
      turn();
    expect(game.fleet('fleet-home')!.shipUnits).toContainEqual(upgraded);
    const saved = game.exportState();
    expect(Game.restore(saved).exportState()).toEqual(saved);
  });

  it('chooses nearer Rocket stock over farther Ion stock', () => {
    const state = thirdSource(network({ factories: [], stock: 1 }).game);
    state.colonies[2]![1].stock['Ion pulse engine'] = 1;
    state.colonies[2]![1].stock['Rocket engine'] = 0;
    const game = Game.restore(state);
    game.scheduleShip(game.galaxy.systems[0]!.planets[1]!, 'Fighter');
    expect(
      game
        .exportState()
        .componentOrders!.find((order) => order.component !== 'Weapons module'),
    ).toMatchObject({ source: 'sol-0', component: 'Rocket engine' });
  });
});

it('automatisk-motormontering: reuses motors still in transit after local Ion completes their original ship', () => {
  const initial = network({ factories: [], stock: 1 });
  initial.game.scheduleShip(initial.destination, 'Fighter');
  const state = initial.game.exportState();
  state.colonies[1]![1].stock['Ion pulse engine'] = 1;
  state.colonies[1]![1].stock['Weapons module'] = 1;
  for (const shipment of state.shipments) {
    shipment.fleetId = 'freighters';
    shipment.committed = true;
    state.colonies[0]![1].stock[shipment.resource] -= shipment.amount;
  }
  const game = Game.restore({
    ...state,
    fleets: state.fleets.map((fleet) =>
      fleet.id === 'freighters'
        ? {
            ...fleet,
            position: { q: 8, r: 0 },
            destination: state.world.systems[0]!.planets[1]!.position,
          }
        : fleet,
    ),
  });
  for (const frame of game.startTurn()) game.applyFrame(frame);
  game.finishTurn();
  const destination = game.galaxy.systems[0]!.planets[1]!;
  expect(game.planetSnapshot(destination)!.projects).toHaveLength(0);
  expect(game.shipments).toHaveLength(2);
  expect(() => game.scheduleShip(destination, 'Fighter')).not.toThrow();
  expect(game.shipments).toHaveLength(2);
  expect(game.planetSnapshot(game.galaxy.homePlanet)!.projects).toHaveLength(0);
});

it('byggprojektets-forsorjningskedja / automatisk-motormontering: projects expose only their committed remote part production and transport routes', () => {
  const { game, destination, home } = network({
    factories: ['Ion pulse engine factory', 'Weapons module factory'],
  });
  const before = game.exportState();
  const option = game
    .productionOptions(destination)
    .find((o) => o.type === 'Fighter')!;
  expect(option.blockedReason).toBeNull();
  expect(game.exportState()).toEqual(before);
  expect(game.supplyChain(null).projectIds).toEqual([]);
  game.scheduleShip(destination, 'Fighter');
  const fighter = game.planetSnapshot(destination)!.projects[0]!;
  const producers = game.planetSnapshot(home)!.projects;
  expect(producers.map((p) => p.type)).toEqual([
    'Ion pulse engine',
    'Weapons module',
  ]);
  const chain = game.supplyChain(fighter.id);
  expect(chain.projectIds).toEqual([fighter.id, ...producers.map((p) => p.id)]);
  expect(chain.routeIds).toEqual(['route-test']);
  expect(chain.planets.find((p) => p.id === home.id)!.roles).toContain(
    'Producer',
  );
  const saved = game.exportState();
  game.supplyChain(fighter.id);
  expect(game.exportState()).toEqual(saved);
});

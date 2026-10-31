import { turnFrames } from '../fixtures/turn-steps.js';
import { describe, expect, it } from 'vitest';
import {
  Game,
  type Technology,
  type BuildType,
} from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import { Colony, Planet } from '../../src/client/models/Planet.js';
import { Galaxy, StarSystem } from '../../src/client/models/Galaxy.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';

function setup(galaxy = createExampleGalaxy()) {
  const state = new Game(galaxy).exportState();
  for (const [, colony] of state.colonies) {
    colony.stock['Rocket engine'] = 100;
    colony.stock['Telescope I'] = 100;
  }
  const game = Game.restore(state);
  const planet = game.galaxy.homePlanet;
  const snapshot = () => game.planetSnapshot(planet)!;
  const turn = () => {
    for (const frame of turnFrames(game)) game.applyFrame(frame);
    game.finishTurn();
  };
  const unlock = (type: Technology) => {
    if (!game.research.stations) {
      game.scheduleBuild(planet, 'Research station');
      turn();
    }
    if (!game.research.completed.includes(type)) game.selectResearch(type);
    for (let attempt = 0; game.research.queue.length && attempt < 10; attempt++)
      turn();
    expect(game.research.completed).toContain(type);
  };
  const factory = (type: Technology) => {
    unlock(type);
    game.scheduleBuild(planet, type as BuildType);
    turn();
    return snapshot().buildings.find((b) => b.type === type)!;
  };
  return { game, planet, snapshot, turn, unlock, factory };
}

describe('planetbyggplatser / flera-byggnader-av-samma-typ', () => {
  it('assigns explicit sites and completes them in queue order', () => {
    const { game, planet, snapshot, turn } = setup();
    game.scheduleBuild(planet, 'Research station', 3);
    game.scheduleBuild(planet, 'Research station', 1);
    expect(snapshot().sites).toHaveLength(planet.buildSlots);
    expect(snapshot().sites[3]!.project?.type).toBe('Research station');
    expect(() => game.scheduleBuild(planet, 'Research station', 3)).toThrow(
      'No build slots',
    );
    expect(() => game.scheduleBuild(planet, 'Research station', -1)).toThrow();
    turn();
    expect(snapshot().buildings).toHaveLength(1);
    expect(snapshot().projects).toHaveLength(1);
    turn();
    expect(snapshot().buildings).toHaveLength(2);
    expect(snapshot().sites[3]!.building?.type).toBe('Research station');
    expect(snapshot().budget.reserved.Iron).toBe(0);
  });

  it('cancels construction and demolishes at the original site without moving other buildings', () => {
    const { game, planet, snapshot, turn } = setup();
    game.scheduleBuild(planet, 'Research station', 3);
    game.scheduleBuild(planet, 'Research station', 1);
    game.cancelProject(planet, snapshot().sites[1]!.project!.id);
    expect(snapshot().sites[1]!.project).toBeNull();
    turn();
    const building = snapshot().sites[3]!.building!;
    game.toggleDemolition(planet, building.id);
    expect(snapshot().budget.reservedWorkers).toBe(0);
    expect(() => game.scheduleBuild(planet, 'Research station', 3)).toThrow();
    game.toggleDemolition(planet, building.id);
    expect(snapshot().budget.reservedWorkers).toBe(600);
    game.toggleDemolition(planet, building.id);
    turn();
    expect(snapshot().sites[3]!.building).toBeNull();
    game.scheduleBuild(planet, 'Research station', 3);
  });
});

describe('forska-fram-fabriker / bygga-forskningsstation', () => {
  it('offers extraction and Research station initially and unlocks each permanent factory through actual research', () => {
    const { game, planet, snapshot, turn } = setup();
    expect(snapshot().buildOptions.map((option) => option.type)).toEqual([
      'Research station',
      'Iron mine',
      'Water extractor',
      'Oil extractor',
    ]);
    expect(() => game.scheduleBuild(planet, 'Colony ship factory')).toThrow(
      'Research',
    );
    expect(() => game.selectResearch('Colony ship factory')).toThrow(
      'Research station',
    );
    game.scheduleBuild(planet, 'Research station');
    turn();
    expect(game.research.completed).toEqual([]);
    game.selectResearch('Colony ship factory');
    turn();
    expect(game.research.completed).toEqual(['Rocket engine factory']);
    turn();
    turn();
    turn();
    expect(game.research.completed).toEqual([
      'Rocket engine factory',
      'Colony ship factory',
    ]);
    expect(game.research.selected).toBeNull();
    expect(snapshot().buildOptions.map((option) => option.type)).toContain(
      'Colony ship factory',
    );
    game.selectResearch('Fighter factory');
    game.selectResearch(null);
    turn();
    expect(game.research.completed).not.toContain('Fighter factory');
    expect(() => game.selectResearch('Colony ship factory')).toThrow();
    game.scheduleBuild(planet, 'Colony ship factory');
    turn();
    expect(
      snapshot().buildings.some((b) => b.type === 'Colony ship factory'),
    ).toBe(true);
    expect(game.fleet('fleet-home')!.ships['Colony ship']).toBe(0);
  });

  it('does not research using a station scheduled for demolition', () => {
    const { game, planet, snapshot, turn } = setup();
    game.scheduleBuild(planet, 'Research station');
    turn();
    game.selectResearch('Fighter factory');
    game.toggleDemolition(planet, snapshot().buildings[0]!.id);
    turn();
    expect(game.research.completed).toEqual([]);
    expect(game.research.selected).toBe('Rocket engine factory');
  });
});

describe('gemensam-planetko / fabrikskoer / skepp-i-byggko', () => {
  it.each([
    'Colony ship',
    'Exploration ship',
    'Transport ship',
    'Fighter',
    'Salvage ship',
  ] as const)(
    'ett-meddelande-per-skeppsbygge: reports a completed %s only once',
    (ship) => {
      const { game: original, planet, factory } = setup();
      const yard = factory(`${ship} factory`);
      const state = original.exportState();
      state.colonies[0]![1].stock['Weapons module'] = 100;
      const game = Game.restore(state);
      game.scheduleShip(planet, ship, null, yard.id);
      const year = game.round;
      const before = game.fleet('fleet-home')!.ships[ship];
      for (const frame of turnFrames(game)) game.applyFrame(frame);
      game.finishTurn();
      expect(game.fleet('fleet-home')!.ships[ship]).toBe(before + 1);
      const events = game.events.filter(
        (event) =>
          event.round === year && event.text.includes(`${ship} was produced`),
      );
      expect(events).toHaveLength(1);
      expect(
        events[0]!.text.split(`${ship} was produced at ${planet.name}.`),
      ).toHaveLength(2);
      expect(events[0]!.text).toContain(`Population on ${planet.name}`);
      expect(events[0]!.position).toEqual(planet.position);
    },
  );

  it('requires a matching completed shipyard and appends all orders to one uncapped planet queue', () => {
    const { game, planet, snapshot, factory } = setup();
    expect(() => game.scheduleShip(planet, 'Colony ship')).toThrow('shipyard');
    const yard = factory('Colony ship factory');
    for (let index = 0; index < 5; index += 1)
      game.scheduleShip(planet, 'Colony ship', null, yard.id);
    expect(snapshot().projects).toHaveLength(5);
    game.scheduleShip(planet, 'Colony ship', null, yard.id);
    expect(snapshot().projects).toHaveLength(6);
    expect(() => game.scheduleShip(planet, 'Fighter', null, yard.id)).toThrow(
      'matching',
    );
    expect(() =>
      game.scheduleShip(planet, 'Colony ship', null, 'missing'),
    ).toThrow('matching');
  });

  it('completes only the planet queue head, even with several factories and building orders', () => {
    const { game, planet, snapshot, turn, factory, unlock } = setup();
    const colony = factory('Colony ship factory');
    unlock('Exploration ship factory');
    game.scheduleBuild(planet, 'Exploration ship factory');
    turn();
    const explorer = snapshot().buildings.find(
      (b) => b.type === 'Exploration ship factory',
    )!;
    game.scheduleShip(planet, 'Colony ship', null, colony.id);
    game.scheduleShip(planet, 'Colony ship', null, colony.id);
    game.scheduleShip(planet, 'Exploration ship', null, explorer.id);
    game.scheduleBuild(planet, 'Research station');
    const before = game.fleet('fleet-home')!;
    turn();
    expect(game.fleet('fleet-home')!.ships['Colony ship']).toBe(
      before.ships['Colony ship'] + 1,
    );
    expect(game.fleet('fleet-home')!.ships['Exploration ship']).toBe(
      before.ships['Exploration ship'],
    );
    expect(snapshot().buildings).toHaveLength(3);
    expect(snapshot().projects.map((p) => p.type)).toEqual([
      'Colony ship',
      'Exploration ship',
      'Research station',
    ]);
    turn();
    turn();
    turn();
    expect(snapshot().buildings).toHaveLength(4);
    expect(snapshot().projects).toHaveLength(0);
  });

  it('reorders and cancels queues and rejects invalid positions or orders during simulation', () => {
    const { game, planet, snapshot, factory } = setup();
    factory('Colony ship factory');
    game.scheduleShip(planet, 'Colony ship');
    game.scheduleShip(planet, 'Colony ship');
    const [first, second] = snapshot().projects;
    game.moveProject(planet, second!.id, 0);
    expect(snapshot().projects[0]!.id).toBe(second!.id);
    expect(() => game.moveProject(planet, first!.id, -1)).toThrow();
    game.cancelProject(planet, second!.id);
    expect(snapshot().projects).toHaveLength(1);
    game.scheduleBuild(planet, 'Research station');
    expect(() =>
      game.moveProject(planet, snapshot().projects[0]!.id, 0),
    ).not.toThrow();
    game.startTurn();
    expect(() => game.moveProject(planet, first!.id, 0)).toThrow();
    expect(() => game.scheduleShip(planet, 'Fighter')).toThrow();
    expect(() => game.selectResearch('Exploration ship factory')).toThrow();
  });

  it('keeps production blocked after its only factory is demolished and resumes after rebuilding', () => {
    const { game, planet, snapshot, turn, factory } = setup();
    const yard = factory('Colony ship factory');
    game.scheduleShip(planet, 'Colony ship');
    game.toggleDemolition(planet, yard.id);
    expect(() =>
      game.scheduleShip(planet, 'Colony ship', null, yard.id),
    ).toThrow();
    turn();
    expect(snapshot().buildings.some((b) => b.id === yard.id)).toBe(false);
    expect(game.fleet('fleet-home')!.ships['Colony ship']).toBe(0);
    expect(snapshot().projects[0]!.blockedReason).toContain(
      'factory is required',
    );
    game.scheduleBuild(planet, 'Colony ship factory');
    game.moveProject(planet, snapshot().projects[1]!.id, 0);
    turn();
    turn();
    expect(game.fleet('fleet-home')!.ships['Colony ship']).toBe(1);
  });
});

describe('skepp-till-destinationsflotta', () => {
  it.each([false, true])(
    'nybyggda-skepp-utan-ruttflotta: excludes a route-assigned home fleet (explicit target: %s)',
    (explicit) => {
      const { game: original, planet, factory } = setup();
      factory('Transport ship factory');
      original.scheduleShip(
        planet,
        'Transport ship',
        explicit ? 'fleet-home' : null,
      );
      const state = original.exportState();
      const target = state.world.systems[0]!.planets.find(
        (item) => item.id !== planet.id,
      )!;
      const game = Game.restore({
        ...state,
        tradeRoutes: [
          { id: 'home-route', a: planet.id, b: target.id, closing: false },
        ],
        fleets: state.fleets.map((fleet) => ({
          ...fleet,
          routeId: 'home-route',
          ships: { ...fleet.ships, 'Transport ship': 1 },
        })),
        colonies: [
          ...state.colonies,
          [
            target.id,
            {
              ...structuredClone(state.colonies[0]![1]),
              projects: [],
              buildings: [],
              homeFleetId: null,
            },
          ],
        ],
      });
      for (const frame of turnFrames(game)) game.applyFrame(frame);
      game.finishTurn();
      expect(game.fleet('fleet-home')!.ships['Transport ship']).toBe(1);
      const receiver = game
        .fleetSnapshots()
        .find((fleet) => !fleet.routeId && fleet.ships['Transport ship'] === 1);
      expect(receiver?.position).toEqual(planet.position);
      expect(
        game.exportState().colonies.find(([id]) => id === planet.id)![1]
          .homeFleetId,
      ).toBe(receiver?.id);
      expect(() =>
        game.scheduleShip(planet, 'Transport ship', 'fleet-home'),
      ).toThrow('without a trade route');
      game.scheduleShip(planet, 'Transport ship');
      const project = game.planetSnapshot(planet)!.projects[0]!;
      expect(() =>
        game.setProjectFleet(planet, project.id, 'fleet-home'),
      ).toThrow('without a trade route');
      for (const frame of turnFrames(game)) game.applyFrame(frame);
      game.finishTurn();
      expect(game.fleet(receiver!.id)!.ships['Transport ship']).toBe(2);
      expect(game.fleet('fleet-home')!.ships['Transport ship']).toBe(1);
    },
  );

  it('delivers each queued ship to its chosen local fleet and permits destination changes', () => {
    const { game, planet, snapshot, turn, factory } = setup();
    const yard = factory('Colony ship factory');
    const target = game.createFleet('fleet-home');
    expect(() =>
      game.scheduleShip(planet, 'Colony ship', 'missing', yard.id),
    ).toThrow();
    game.scheduleShip(planet, 'Colony ship');
    game.setProjectFleet(planet, snapshot().projects[0]!.id, target.id);
    turn();
    expect(game.fleet(target.id)!.ships['Colony ship']).toBe(1);
  });

  it('falls back to a new local home fleet when the recipient is deleted and the previous home fleet leaves', () => {
    const { game, planet, turn, factory } = setup();
    factory('Colony ship factory');
    const target = game.createFleet('fleet-home');
    game.scheduleShip(planet, 'Colony ship', target.id);
    game.deleteFleet(target.id);
    game.setDestination('fleet-home', planet.position.neighbors()[0]!);
    turn();
    const local = game
      .fleetSnapshots()
      .find((f) => f.position?.key === planet.position.key)!;
    expect(local.ships['Colony ship']).toBe(1);
    expect(game.fleet('fleet-home')!.ships['Colony ship']).toBe(0);
  });
});

describe('planetlager / arbetskraft-och-besattning', () => {
  it('allows material shortages to be queued and leaves the head blocked without charging it', () => {
    const { game, planet, unlock } = setup();
    unlock('Colony ship factory');
    const saved = game.exportState();
    saved.colonies[0]![1].stock.Iron = 0;
    const restored = Game.restore(saved);
    restored.scheduleBuild(planet, 'Colony ship factory', 1);
    restored.scheduleBuild(planet, 'Research station', 2);
    expect(
      restored.planetSnapshot(planet)!.projects[0]!.blockedReason,
    ).toContain('Needs decision');
    for (const frame of turnFrames(restored)) restored.applyFrame(frame);
    restored.finishTurn();
    expect(restored.planetSnapshot(planet)!.projects).toHaveLength(2);
    expect(restored.planetSnapshot(planet)!.economy.stock.Iron).toBe(0);
  });

  it('reserves only active queue heads and never spends stored materials twice', () => {
    const { game, planet, factory, turn } = setup();
    factory('Colony ship factory');
    game.scheduleBuild(planet, 'Colony ship factory');
    turn();
    const saved = game.exportState();
    saved.colonies[0]![1].stock.Iron = 6;
    const restored = Game.restore(saved);
    const yards = restored
      .planetSnapshot(planet)!
      .buildings.filter((b) => b.type === 'Colony ship factory');
    for (const yard of yards) {
      restored.scheduleShip(planet, 'Colony ship', null, yard.id);
      restored.scheduleShip(planet, 'Colony ship', null, yard.id);
    }
    expect(restored.planetSnapshot(planet)!.budget.reserved.Iron).toBe(6);
    for (const frame of turnFrames(restored)) restored.applyFrame(frame);
    restored.finishTurn();
    expect(restored.fleet('fleet-home')!.ships['Colony ship']).toBe(1);
    expect(restored.planetSnapshot(planet)!.economy.stock.Iron).toBe(0);
    expect(restored.planetSnapshot(planet)!.projects).toHaveLength(3);
  });
});

describe('kartorderstatus', () => {
  it('counts truly empty sites and idle queues separately and updates on order cancellation', () => {
    const { game, planet, snapshot, factory } = setup();
    expect(game.planetOrders()[0]!.emptySites).toBe(10);
    const yard = factory('Exploration ship factory');
    expect(game.planetOrders()[0]).toMatchObject({
      emptySites: 8,
      emptyQueues: 1,
    });
    game.scheduleShip(planet, 'Exploration ship', null, yard.id);
    expect(game.planetOrders()[0]!.emptyQueues).toBe(0);
    const order = snapshot().projects[0]!;
    game.cancelProject(planet, order.id);
    expect(game.planetOrders()[0]!.emptyQueues).toBe(1);
  });
});

describe('kolonisation', () => {
  it('consumes exactly one Colony ship, creates a playable owned colony and reveals its surroundings', () => {
    const { game, planet, turn, factory } = setup();
    factory('Colony ship factory');
    game.scheduleShip(planet, 'Colony ship');
    game.scheduleShip(planet, 'Colony ship');
    turn();
    turn();
    const vesta = game.galaxy.systems[0]!.planets[1]!;
    game.setDestination('fleet-home', vesta.position);
    turn();
    expect(game.canColonize('fleet-home')).toBeNull();
    game.colonize('fleet-home');
    expect(game.fleet('fleet-home')!.ships['Colony ship']).toBe(1);
    expect(game.fleet('fleet-home')!.ships['Exploration ship']).toBe(1);
    expect(game.planetAt(vesta.position)?.id).toBe(vesta.id);
    expect(game.planetSnapshot(vesta)!.population).toBe(1000);
    expect(game.planetSnapshot(vesta)!.sites).toHaveLength(6);
    expect(
      game.mapSnapshot().find((c) => c.position.key === vesta.position.key)!
        .object?.owned,
    ).toBe(true);
    expect(game.planetOrders()).toHaveLength(2);
    expect(() => game.colonize('fleet-home')).toThrow('uninhabited');
    turn();
    expect(game.planetSnapshot(vesta)!.population).toBe(1025);
  });

  it('rejects colonization without a ship, on inhabited planets, empty space and during simulation', () => {
    const { game, planet, turn } = setup();
    expect(() => game.colonize('fleet-home')).toThrow('uninhabited');
    game.setDestination(
      'fleet-home',
      game.galaxy.systems[0]!.planets[1]!.position,
    );
    turn();
    expect(() => game.colonize('fleet-home')).toThrow('Colony ship');
    game.setDestination('fleet-home', new HexCoordinate(3, 0));
    turn();
    expect(() => game.colonize('fleet-home')).toThrow('uninhabited');
    game.startTurn();
    expect(() => game.colonize('fleet-home')).toThrow('locked');
    expect(game.planetAt(planet.position)).toBe(planet);
  });
});

describe('tomma-flottor-utan-position / skepp-till-destinationsflotta', () => {
  it('assigns the location on the first delivery and keeps later remote deliveries local', () => {
    const base = createExampleGalaxy();
    const remote = new Planet({
      ...base.homePlanet,
      id: 'remote',
      name: 'Remote',
      position: new HexCoordinate(0, 1),
      colony: new Colony(base.player.id, 20000),
    });
    const galaxy = new Galaxy(base.player, [
      new StarSystem(base.systems[0]!.star, [base.homePlanet, remote]),
    ]);
    const { game, planet, turn, factory } = setup(galaxy);
    factory('Exploration ship factory');
    game.scheduleBuild(remote, 'Exploration ship factory');
    turn();
    const target = game.createFleet();
    game.scheduleShip(planet, 'Exploration ship', target.id);
    game.scheduleShip(remote, 'Exploration ship', target.id);
    expect(game.fleet(target.id)!.position).toBeNull();
    turn();
    expect(game.fleet(target.id)!.position).toEqual(planet.position);
    expect(game.fleet(target.id)!.ships['Exploration ship']).toBe(1);
    const local = game
      .fleetSnapshots()
      .find((fleet) => fleet.position?.key === remote.position.key)!;
    expect(local.ships['Exploration ship']).toBe(1);
    expect(() =>
      game.scheduleShip(remote, 'Exploration ship', target.id),
    ).toThrow(/at this planet/);
  });
  it('releases a fleet location when its only ship establishes a colony', () => {
    const { game, planet, turn, factory } = setup();
    factory('Colony ship factory');
    const target = game.createFleet();
    game.scheduleShip(planet, 'Colony ship', target.id);
    turn();
    const vesta = game.galaxy.systems[0]!.planets[1]!;
    game.setDestination(target.id, vesta.position);
    turn();
    game.colonize(target.id);
    expect(game.fleet(target.id)!.position).toBeNull();
    expect(game.fleet(target.id)!.destination).toBeNull();
    expect(game.planetAt(vesta.position)).toBe(vesta);
  });
});

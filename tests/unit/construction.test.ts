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
  const game = new Game(galaxy);
  const planet = galaxy.homePlanet;
  const snapshot = () => game.planetSnapshot(planet)!;
  const turn = () => {
    for (const frame of game.startTurn()) game.applyFrame(frame);
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
    game.selectResearch('Colony ship factory');
    turn();
    expect(game.research.completed).toEqual([]);
    game.scheduleBuild(planet, 'Research station');
    turn();
    expect(game.research.completed).toEqual([]);
    turn();
    expect(game.research.completed).toEqual(['Exploration ship factory']);
    turn();
    expect(game.research.completed).toEqual([
      'Exploration ship factory',
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
    expect(game.research.selected).toBe('Exploration ship factory');
  });
});

describe('fabrikskoer / skepp-i-byggko', () => {
  it('requires a matching completed shipyard and enforces five queue slots without spilling to another factory', () => {
    const { game, planet, snapshot, factory } = setup();
    expect(() => game.scheduleShip(planet, 'Colony ship')).toThrow('shipyard');
    const yard = factory('Colony ship factory');
    for (let index = 0; index < 5; index += 1)
      game.scheduleShip(planet, 'Colony ship', null, yard.id);
    expect(
      snapshot().buildings.find((b) => b.id === yard.id)!.queue,
    ).toHaveLength(5);
    expect(() =>
      game.scheduleShip(planet, 'Colony ship', null, yard.id),
    ).toThrow('full');
    expect(() => game.scheduleShip(planet, 'Fighter', null, yard.id)).toThrow(
      'matching',
    );
    expect(() =>
      game.scheduleShip(planet, 'Colony ship', null, 'missing'),
    ).toThrow('matching');
  });

  it('completes one ship per factory, simultaneously with building construction, without consuming waiting orders', () => {
    const { game, planet, snapshot, turn, factory, unlock } = setup();
    const colony = factory('Fighter factory');
    unlock('Exploration ship factory');
    game.scheduleBuild(planet, 'Exploration ship factory');
    turn();
    const explorer = snapshot().buildings.find(
      (b) => b.type === 'Exploration ship factory',
    )!;
    game.scheduleShip(planet, 'Fighter', null, colony.id);
    game.scheduleShip(planet, 'Fighter', null, colony.id);
    game.scheduleShip(planet, 'Exploration ship', null, explorer.id);
    game.scheduleBuild(planet, 'Research station');
    const before = game.fleet('fleet-home')!;
    turn();
    expect(game.fleet('fleet-home')!.ships['Fighter']).toBe(
      before.ships['Fighter'] + 1,
    );
    expect(game.fleet('fleet-home')!.ships['Exploration ship']).toBe(
      before.ships['Exploration ship'] + 1,
    );
    expect(snapshot().buildings).toHaveLength(4);
    expect(
      snapshot().buildings.find((b) => b.id === colony.id)!.queue,
    ).toHaveLength(1);
    expect(
      snapshot().buildings.find((b) => b.id === explorer.id)!.queue,
    ).toHaveLength(0);
  });

  it('reorders and cancels queues and rejects invalid positions or orders during simulation', () => {
    const { game, planet, snapshot, factory } = setup();
    const yard = factory('Fighter factory');
    game.scheduleShip(planet, 'Fighter');
    game.scheduleShip(planet, 'Fighter');
    const [first, second] = snapshot().buildings.find(
      (b) => b.id === yard.id,
    )!.queue;
    game.moveProject(planet, second!.id, 0);
    expect(
      snapshot().buildings.find((b) => b.id === yard.id)!.queue[0]!.id,
    ).toBe(second!.id);
    expect(() => game.moveProject(planet, first!.id, -1)).toThrow();
    game.cancelProject(planet, second!.id);
    expect(
      snapshot().buildings.find((b) => b.id === yard.id)!.queue,
    ).toHaveLength(1);
    game.scheduleBuild(planet, 'Research station');
    expect(() =>
      game.moveProject(planet, snapshot().projects[0]!.id, 0),
    ).not.toThrow();
    game.startTurn();
    expect(() => game.moveProject(planet, first!.id, 0)).toThrow();
    expect(() => game.scheduleShip(planet, 'Fighter')).toThrow();
    expect(() => game.selectResearch('Exploration ship factory')).toThrow();
  });

  it('demolishes the shipyard and cancels its orders without producing ships', () => {
    const { game, planet, snapshot, turn, factory } = setup();
    const yard = factory('Fighter factory');
    game.scheduleShip(planet, 'Fighter');
    game.toggleDemolition(planet, yard.id);
    expect(() => game.scheduleShip(planet, 'Fighter', null, yard.id)).toThrow();
    turn();
    expect(snapshot().buildings.some((b) => b.id === yard.id)).toBe(false);
    expect(game.fleet('fleet-home')!.ships.Fighter).toBe(1);
  });
});

describe('skepp-till-destinationsflotta', () => {
  it('delivers each queued ship to its chosen local fleet and permits destination changes', () => {
    const { game, planet, snapshot, turn, factory } = setup();
    const yard = factory('Colony ship factory');
    const target = game.createFleet('fleet-home');
    expect(() =>
      game.scheduleShip(planet, 'Colony ship', 'missing', yard.id),
    ).toThrow();
    game.scheduleShip(planet, 'Colony ship');
    game.setProjectFleet(
      planet,
      snapshot().buildings.find((b) => b.id === yard.id)!.queue[0]!.id,
      target.id,
    );
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
    for (const frame of restored.startTurn()) restored.applyFrame(frame);
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
    for (const frame of restored.startTurn()) restored.applyFrame(frame);
    restored.finishTurn();
    expect(restored.fleet('fleet-home')!.ships['Colony ship']).toBe(1);
    expect(restored.planetSnapshot(planet)!.economy.stock.Iron).toBe(0);
    expect(
      restored
        .planetSnapshot(planet)!
        .buildings.filter((b) => b.type === 'Colony ship factory')
        .map((b) => b.queue.length),
    ).toEqual([1, 2]);
  });
});

describe('kartorderstatus', () => {
  it('counts truly empty sites and idle queues separately and updates on order cancellation', () => {
    const { game, planet, snapshot, factory } = setup();
    expect(game.planetOrders()[0]!.emptySites).toBe(10);
    const yard = factory('Fighter factory');
    expect(game.planetOrders()[0]).toMatchObject({
      emptySites: 8,
      emptyQueues: 1,
    });
    game.scheduleShip(planet, 'Fighter', null, yard.id);
    expect(game.planetOrders()[0]!.emptyQueues).toBe(0);
    const order = snapshot().buildings.find((b) => b.id === yard.id)!.queue[0]!;
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
    factory('Fighter factory');
    game.scheduleBuild(remote, 'Fighter factory');
    turn();
    const target = game.createFleet();
    game.scheduleShip(planet, 'Fighter', target.id);
    game.scheduleShip(remote, 'Fighter', target.id);
    expect(game.fleet(target.id)!.position).toBeNull();
    turn();
    expect(game.fleet(target.id)!.position).toEqual(planet.position);
    expect(game.fleet(target.id)!.ships.Fighter).toBe(1);
    const local = game
      .fleetSnapshots()
      .find((fleet) => fleet.position?.key === remote.position.key)!;
    expect(local.ships.Fighter).toBe(1);
    expect(() => game.scheduleShip(remote, 'Fighter', target.id)).toThrow(
      /at this planet/,
    );
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

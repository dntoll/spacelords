import { describe, expect, it } from 'vitest';
import { Game, type Technology } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import { Colony, Planet, Player } from '../../src/client/models/Planet.js';
import { Galaxy, Star, StarSystem } from '../../src/client/models/Galaxy.js';
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
    game.selectResearch(type);
    turn();
  };
  const factory = (type: Technology) => {
    unlock(type);
    game.scheduleBuild(planet, type);
    turn();
    return snapshot().buildings.find((b) => b.type === type)!;
  };
  return { game, planet, snapshot, turn, unlock, factory };
}

describe('planetbyggplatser / flera-byggnader-av-samma-typ', () => {
  it('assigns construction to explicit sites and completes independent sites in the same year', () => {
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
    expect(snapshot().buildings).toHaveLength(2);
    expect(snapshot().projects).toHaveLength(0);
    expect(snapshot().sites[3]!.building?.type).toBe('Research station');
    expect(snapshot().budget.reserved.Iron).toBe(4);
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
  it('offers only Research station initially and unlocks each permanent factory through actual research', () => {
    const { game, planet, snapshot, turn } = setup();
    expect(snapshot().buildOptions.map((option) => option.type)).toEqual([
      'Research station',
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
    expect(game.research.completed).toEqual(['Colony ship factory']);
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
    expect(game.research.selected).toBe('Fighter factory');
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

  it('reorders and cancels within a factory and rejects construction reorder or invalid positions', () => {
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
    ).toThrow();
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

describe('arsbudget / arbetskraft-och-besattning', () => {
  it('rejects unaffordable buildings and exposes the reason without reserving their site', () => {
    const { game, planet, snapshot, unlock } = setup();
    unlock('Colony ship factory');
    game.scheduleBuild(planet, 'Colony ship factory');
    expect(snapshot().budget.reservedCrew).toBe(0);
    expect(
      snapshot().buildOptions.find((o) => o.type === 'Colony ship factory')!
        .blockedReason,
    ).toContain('resource budget');
    expect(() => game.scheduleBuild(planet, 'Colony ship factory')).toThrow(
      'resource budget',
    );
    expect(snapshot().budget.reservedSlots).toBe(2);
  });

  it('reserves only the head of each queue and never spends the annual budget twice', () => {
    const base = createExampleGalaxy();
    const home = new Planet({
      ...base.homePlanet.snapshot,
      resources: base.homePlanet.resources.map((r) => ({
        ...r,
        perYear: r.name === 'Oil' ? 13 : r.perYear,
      })),
    });
    const galaxy = new Galaxy(base.player, [
      new StarSystem(base.systems[0]!.star, [home]),
    ]);
    const { game, planet, snapshot, turn, unlock } = setup(galaxy);
    unlock('Colony ship factory');
    game.scheduleBuild(planet, 'Colony ship factory');
    turn();
    game.toggleDemolition(
      planet,
      snapshot().buildings.find((b) => b.type === 'Research station')!.id,
    );
    turn();
    game.scheduleBuild(planet, 'Colony ship factory');
    turn();
    const yards = snapshot().buildings;
    for (const yard of yards) {
      game.scheduleShip(planet, 'Colony ship', null, yard.id);
      game.scheduleShip(planet, 'Colony ship', null, yard.id);
    }
    // Two yards use 36 Iron; only one ship fits in the remaining 6.
    expect(snapshot().budget.reserved.Iron).toBe(42);
    expect(snapshot().budget.reservedCrew).toBe(1000);
    expect(
      snapshot().buildings.filter((b) => b.queue[0]?.blockedReason),
    ).toHaveLength(1);
    turn();
    expect(game.fleet('fleet-home')!.ships['Colony ship']).toBe(1);
    expect(
      snapshot()
        .buildings.toSorted((a, b) => a.slotIndex - b.slotIndex)
        .map((b) => b.queue.length),
    ).toEqual([1, 2]);
  });

  it('greys out buildings when the colony lacks workers', () => {
    const home = new Planet({
      id: 'small',
      name: 'Small',
      type: 'solid',
      position: new HexCoordinate(1, 0),
      habitability: 100,
      buildSlots: 2,
      resources: [
        { name: 'Iron', perYear: 100 },
        { name: 'Water', perYear: 100 },
        { name: 'Oil', perYear: 100 },
      ],
      colony: new Colony('player', 500),
    });
    const galaxy = new Galaxy(new Player('player', 'Your empire'), [
      new StarSystem(new Star('sun', 'Sun', new HexCoordinate(0, 0)), [home]),
    ]);
    const { game, planet, snapshot } = setup(galaxy);
    expect(snapshot().buildOptions[0]!.blockedReason).toContain('population');
    expect(() => game.scheduleBuild(planet, 'Research station')).toThrow(
      'population',
    );
  });
});

describe('kartorderstatus', () => {
  it('counts truly empty sites and idle queues separately and updates on order cancellation', () => {
    const { game, planet, snapshot, factory } = setup();
    expect(game.planetOrders()[0]!.emptySites).toBe(6);
    const yard = factory('Fighter factory');
    expect(game.planetOrders()[0]).toMatchObject({
      emptySites: 4,
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
    expect(game.planetSnapshot(vesta)!.sites).toHaveLength(4);
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

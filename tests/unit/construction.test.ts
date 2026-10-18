import { describe, expect, it } from 'vitest';
import { Game } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';

function setup() {
  const galaxy = createExampleGalaxy();
  const game = new Game(galaxy);
  const planet = galaxy.homePlanet;
  const snapshot = () => game.planetSnapshot(planet)!;
  const turn = () => {
    for (const frame of game.startTurn()) game.applyFrame(frame);
    game.finishTurn();
    game.continuePlanning();
  };
  return { game, planet, snapshot, turn };
}

describe('flera-byggnader-av-samma-typ', () => {
  it('completes duplicate buildings over consecutive years with separate upkeep', () => {
    const { game, planet, snapshot, turn } = setup();
    game.scheduleBuild(planet, 'Research station');
    game.scheduleBuild(planet, 'Research station');
    turn();
    expect(snapshot().buildings).toHaveLength(1);
    expect(snapshot().projects).toHaveLength(1);
    turn();
    expect(snapshot().buildings).toHaveLength(2);
    expect(snapshot().budget.reserved.Iron).toBe(4);
  });
});

describe('gemensam-byggko', () => {
  it('reserves only the active work, preserves waiting orders and supports reorder and cancel', () => {
    const { game, planet, snapshot, turn } = setup();
    game.scheduleBuild(planet, 'Research station');
    game.scheduleBuild(planet, 'Colony ship factory');
    const [first, second] = snapshot().projects;
    expect(snapshot().budget.reserved.Iron).toBe(2);
    game.moveProject(planet, second!.id, 0);
    expect(snapshot().budget.reserved.Iron).toBe(18);
    turn();
    expect(snapshot().projects.map((p) => p.id)).toEqual([first!.id]);
    expect(snapshot().buildings).toHaveLength(0);
    game.cancelProject(planet, first!.id);
    expect(snapshot().budget.reserved.Iron).toBe(0);
  });

  it('does not bypass a blocked head or consume resources for waiting orders', () => {
    const { game, planet, snapshot, turn } = setup();
    game.scheduleShip(planet, 'Fighter');
    game.scheduleBuild(planet, 'Fighter factory');
    turn();
    expect(snapshot().projects).toHaveLength(2);
    expect(snapshot().buildings).toHaveLength(0);
    expect(game.events.some((event) => event.text.includes('waiting'))).toBe(
      true,
    );
    game.moveProject(planet, snapshot().projects[1]!.id, 0);
    turn();
    turn();
    expect(snapshot().projects).toHaveLength(0);
  });

  it('rejects queue mutation during simulation and invalid positions', () => {
    const { game, planet, snapshot } = setup();
    game.scheduleBuild(planet, 'Research station');
    const id = snapshot().projects[0]!.id;
    expect(() => game.moveProject(planet, id, -1)).toThrow();
    game.startTurn();
    expect(() => game.moveProject(planet, id, 0)).toThrow();
    expect(() => game.scheduleShip(planet, 'Colony ship')).toThrow();
  });
});

describe('skepp-i-byggko / skepp-till-destinationsflotta', () => {
  it('queues ships alongside buildings and assigns them to the chosen local fleet', () => {
    const { game, planet, snapshot, turn } = setup();
    const target = game.createFleet('fleet-home');
    game.scheduleBuild(planet, 'Research station');
    game.scheduleShip(planet, 'Exploration ship', target.id);
    game.scheduleShip(planet, 'Colony ship');
    turn();
    expect(game.fleet(target.id)!.ships['Exploration ship']).toBe(0);
    turn();
    expect(game.fleet(target.id)!.ships['Exploration ship']).toBe(1);
    expect(snapshot().projects).toHaveLength(1);
    turn();
    expect(game.fleet('fleet-home')!.ships['Colony ship']).toBe(1);
  });

  it('falls back to a local home fleet if the chosen fleet leaves or is deleted', () => {
    const { game, planet, turn } = setup();
    const target = game.createFleet('fleet-home');
    game.scheduleShip(planet, 'Colony ship', target.id);
    game.deleteFleet(target.id);
    game.setDestination('fleet-home', planet.position.neighbors()[0]!);
    turn();
    const local = game
      .fleetSnapshots()
      .find((fleet) => fleet.position.key === planet.position.key)!;
    expect(local.ships['Colony ship']).toBe(1);
    expect(game.fleet('fleet-home')!.ships['Colony ship']).toBe(0);
  });

  it('rejects an unknown destination and permits changing a queued destination', () => {
    const { game, planet, snapshot, turn } = setup();
    expect(() => game.scheduleShip(planet, 'Colony ship', 'missing')).toThrow();
    game.scheduleShip(planet, 'Colony ship');
    const target = game.createFleet('fleet-home');
    game.setProjectFleet(planet, snapshot().projects[0]!.id, target.id);
    turn();
    expect(game.fleet(target.id)!.ships['Colony ship']).toBe(1);
  });
});

describe('arsbudget / gemensam-byggko', () => {
  it('keeps unaffordable work queued until demolition releases upkeep', () => {
    const { game, planet, snapshot, turn } = setup();
    for (let index = 0; index < 5; index += 1)
      game.scheduleBuild(planet, 'Fighter factory');
    for (let index = 0; index < 5; index += 1) turn();
    game.scheduleShip(planet, 'Exploration ship');
    const before = game.fleet('fleet-home')!.ships['Exploration ship'];
    expect(snapshot().projects[0]!.blockedReason).toContain('resource budget');
    turn();
    expect(game.fleet('fleet-home')!.ships['Exploration ship']).toBe(before);
    expect(snapshot().projects).toHaveLength(1);
    game.toggleDemolition(planet, snapshot().buildings[0]!.id);
    turn();
    expect(game.fleet('fleet-home')!.ships['Exploration ship']).toBe(
      before + 1,
    );
    expect(snapshot().projects).toHaveLength(0);
  });

  it('limits queued buildings to slots while ship orders need no permanent slot', () => {
    const { game, planet, snapshot } = setup();
    for (let index = 0; index < planet.buildSlots; index += 1)
      game.scheduleBuild(planet, 'Research station');
    expect(() => game.scheduleBuild(planet, 'Research station')).toThrow(
      'No build slots',
    );
    game.scheduleShip(planet, 'Colony ship');
    expect(snapshot().budget.reservedSlots).toBe(planet.buildSlots);
    game.cancelProject(planet, snapshot().projects[0]!.id);
    game.scheduleBuild(planet, 'Research station');
    expect(snapshot().projects).toHaveLength(planet.buildSlots + 1);
  });
});

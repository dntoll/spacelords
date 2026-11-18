import { turnFrames } from '../../fixtures/turn-steps.js';
import { describe, expect, it } from 'vitest';
import {
  Game,
  projectCost,
  type BuildType,
  type ShipType,
} from '../../../src/client/space-map/models/Game.js';
import { HexCoordinate } from '../../../src/client/common/HexCoordinate.js';
import { emptyStock } from '../../../src/client/space-map/models/Economy.js';
import { ResearchPlan } from '../../../src/client/space-map/models/research/Research.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';

function prepared(rocket = 0, ion = 0) {
  const initial = new Game(createExampleGalaxy()).exportState();
  const state = {
    ...initial,
    surveyedPlanets: initial.world.systems
      .flatMap((system) => system.planets)
      .filter((planet) => initial.knownObjects?.includes(planet.id))
      .map((planet) => planet.id),
  };
  const colony = state.colonies[0]![1];
  colony.population = 30000;
  colony.stock = {
    ...emptyStock(),
    Iron: 1000,
    Water: 1000,
    Oil: 1000,
    'Rocket engine': rocket,
    'Ion pulse engine': ion,
  };
  colony.buildings = (
    [
      'Colony ship factory',
      'Exploration ship factory',
      'Transport ship factory',
      'Fighter factory',
    ] as BuildType[]
  ).map((type, slotIndex) => ({
    id: `yard-${slotIndex}`,
    type,
    slotIndex,
    demolition: false,
  }));
  colony.stock['Weapons module'] = 10;
  colony.stock['Telescope I'] = 10;
  return Game.restore(state);
}
function turn(game: Game) {
  for (const frame of turnFrames(game)) game.applyFrame(frame);
  game.finishTurn();
}

describe('motorbehov-for-alla-skepp', () => {
  it.each<[ShipType, number]>([
    ['Colony ship', 3],
    ['Exploration ship', 2],
    ['Transport ship', 1],
    ['Fighter', 1],
  ])('requires and consumes %s engines exactly once', (type, count) => {
    const game = prepared(count);
    expect(projectCost(type)['Rocket engine']).toBe(count);
    game.scheduleShip(game.galaxy.homePlanet, type);
    turn(game);
    expect(
      game.planetSnapshot(game.galaxy.homePlanet)!.economy.stock[
        'Rocket engine'
      ],
    ).toBe(0);
    expect(game.planetSnapshot(game.galaxy.homePlanet)!.projects).toHaveLength(
      0,
    );
    turn(game);
    expect(
      game.planetSnapshot(game.galaxy.homePlanet)!.economy.stock[
        'Rocket engine'
      ],
    ).toBe(0);
  });
  it('researches engines before any shipyard without a dependency cycle', () => {
    const plan = new ResearchPlan();
    plan.add('Fighter factory');
    plan.add('Colony ship factory');
    expect(plan.queue[0]).toBe('Rocket engine factory');
    expect(plan.queue.indexOf('Rocket engine factory')).toBeLessThan(
      plan.queue.indexOf('Colony ship factory'),
    );
  });
});

describe('ion-pulse-engine / automatisk-motormontering', () => {
  it('charges double Rocket resources for the upgraded motor', () => {
    expect(projectCost('Ion pulse engine')).toMatchObject({
      Iron: 6,
      Water: 2,
      Oil: 2,
    });
    expect(projectCost('Ion pulse engine factory')).toMatchObject({
      Iron: 16,
      Water: 8,
      Oil: 4,
    });
    const plan = new ResearchPlan();
    plan.add('Ion pulse engine factory');
    expect(plan.queue).toEqual([
      'Rocket engine factory',
      'Ion pulse engine factory',
    ]);
  });
});

describe('automatisk-motormontering / automatiska-delorder', () => {
  it('keeps the slowest individual speed and moves the selected upgraded ship rather than another of its type', () => {
    const game = prepared(1, 1);
    const home = game.galaxy.homePlanet;
    const fleet = game.createFleet();
    game.scheduleShip(home, 'Transport ship', fleet.id);
    game.scheduleShip(home, 'Transport ship', fleet.id);
    turn(game);
    turn(game);
    expect(game.fleet(fleet.id)!.speed).toBe(2);
    const upgraded = game
      .fleet(fleet.id)!
      .shipUnits!.find((u) => u.engines['Ion pulse engine'] > 0)!;
    const moved = game.transferShips(
      fleet.id,
      'Transport ship',
      1,
      null,
      upgraded.id,
    );
    expect(moved.speed).toBe(3);
    expect(moved.shipUnits![0]!.id).toBe(upgraded.id);
    expect(game.fleet(fleet.id)!.speed).toBe(2);
    const merged = game.transferShips(moved.id, 'Transport ship', 1, fleet.id);
    expect(merged.speed).toBe(2);
    expect(Game.restore(game.exportState()).fleet(fleet.id)!.shipUnits).toEqual(
      merged.shipUnits,
    );
  });
});

describe('avstamning-sparkompatibilitet / motorbehov-for-alla-skepp', () => {
  it.each([2, 3, 4, 5] as const)(
    'loads version %s without charging existing ships or deleting queued ships',
    (version) => {
      const state = prepared().exportState();
      for (const fleet of state.fleets) delete fleet.shipUnits;
      state.colonies[0]![1].projects.push({
        id: 'legacy-ship',
        type: 'Colony ship',
        slotIndex: null,
        factoryId: 'yard-0',
        destinationFleetId: null,
      });
      const game = Game.restore({
        ...state,
        version,
        researched: ['Exploration ship factory'],
      });
      expect(game.fleet('fleet-home')!.speed).toBe(3);
      expect(
        game
          .fleet('fleet-home')!
          .shipUnits!.every((u) => u.engines['Ion pulse engine'] === 0),
      ).toBe(true);
      expect(game.research.completed).toContain('Rocket engine factory');
      expect(
        game.planetSnapshot(game.galaxy.homePlanet)!.economy.stock.Iron,
      ).toBe(1000);
      expect(
        game.planetSnapshot(game.galaxy.homePlanet)!.projects,
      ).toHaveLength(1);
      expect(
        game.planetSnapshot(game.galaxy.homePlanet)!.projects[0]!.blockedReason,
      ).not.toBeNull();
      expect(game.exportState().version).toBe(17);
    },
  );

  it('inserts missing prerequisites into legacy research queues while preserving their dependent order', () => {
    const state = prepared().exportState();
    const game = Game.restore({
      ...state,
      version: 5,
      researched: [],
      researchQueue: ['Exploration ship factory', 'Colony ship factory'],
      researchTarget: 'Exploration ship factory',
    });
    expect(game.research.queue).toEqual([
      'Rocket engine factory',
      'Telescope I factory',
      'Exploration ship factory',
      'Colony ship factory',
    ]);
  });
});

describe('automatisk-motormontering / flottdestinationer / kolonisation', () => {
  it('travels three hexes in one year with an upgraded Transport ship', () => {
    const game = prepared(0, 1);
    const fleet = game.createFleet();
    game.scheduleShip(game.galaxy.homePlanet, 'Transport ship', fleet.id);
    turn(game);
    const destination = new HexCoordinate(3, 0);
    game.setDestination(fleet.id, destination);
    turn(game);
    expect(game.fleet(fleet.id)!.position).toEqual(destination);
    expect(game.fleet(fleet.id)!.destination).toBeNull();
  });
});

it('automatisk-motormontering: exposes immutable project reservations and ship loadouts', () => {
  const game = prepared(2, 1);
  const home = game.galaxy.homePlanet;
  game.scheduleShip(home, 'Colony ship');
  const project = game.planetSnapshot(home)!.projects[0]!;
  expect(Object.isFrozen(project.parts)).toBe(true);
  const fleet = game.fleet('fleet-home')!;
  expect(Object.isFrozen(fleet.shipUnits)).toBe(true);
  expect(Object.isFrozen(fleet.shipUnits![0]!.engines)).toBe(true);
});

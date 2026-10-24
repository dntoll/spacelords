import { describe, expect, it } from 'vitest';
import {
  Game,
  projectCost,
  type BuildType,
  type ShipType,
} from '../../src/client/models/Game.js';
import { emptyStock } from '../../src/client/models/Economy.js';
import { ResearchPlan } from '../../src/client/models/Research.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';

function prepared(rocket = 0, ion = 0) {
  const state = new Game(createExampleGalaxy()).exportState();
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
  return Game.restore(state);
}
function turn(game: Game) {
  for (const frame of game.startTurn()) game.applyFrame(frame);
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
      plan.queue.indexOf('Exploration ship factory'),
    );
  });
  it('rejects an uncovered order without consuming stock or sequence IDs', () => {
    const game = prepared(2);
    const before = game.exportState();
    expect(() =>
      game.scheduleShip(game.galaxy.homePlanet, 'Colony ship'),
    ).toThrow();
    expect(game.exportState()).toEqual(before);
  });
});

describe('ion-pulse-engine / automatisk-motormontering', () => {
  it('mixes engines, gives +1 with one Ion, and retains the loadout across transfer and save', () => {
    let game = prepared(2, 1);
    const target = game.createFleet();
    game.scheduleShip(game.galaxy.homePlanet, 'Colony ship', target.id);
    turn(game);
    expect(game.fleet(target.id)!.speed).toBe(3);
    expect(
      game.planetSnapshot(game.galaxy.homePlanet)!.economy.stock,
    ).toMatchObject({ 'Rocket engine': 0, 'Ion pulse engine': 0 });
    const moved = game.transferShips(target.id, 'Colony ship', 1, null);
    expect(moved.speed).toBe(3);
    game = Game.restore(game.exportState());
    expect(game.fleet(moved.id)!.speed).toBe(3);
  });
  it('prefers newly available local Ion at construction, leaving unused Rocket in stock', () => {
    let game = prepared(3);
    game.scheduleShip(game.galaxy.homePlanet, 'Colony ship');
    const state = game.exportState();
    state.colonies[0]![1].stock['Ion pulse engine'] = 1;
    game = Game.restore(state);
    turn(game);
    expect(
      game.planetSnapshot(game.galaxy.homePlanet)!.economy.stock,
    ).toMatchObject({ 'Rocket engine': 1, 'Ion pulse engine': 0 });
    expect(game.exportState().componentOrders).toEqual([]);
  });
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

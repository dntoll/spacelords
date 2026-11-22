import { turnFrames } from '../../fixtures/turn-steps.js';
import { describe, expect, it } from 'vitest';
import {
  Game,
  type BuildType,
} from '../../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';

function setup(
  types: readonly BuildType[] = [
    'Fighter factory',
    'Rocket engine factory',
    'Weapons module factory',
  ],
) {
  const state = new Game(createExampleGalaxy()).exportState();
  const colony = state.colonies[0]![1];
  const game = Game.restore({
    ...state,
    colonies: [
      [
        state.colonies[0]![0],
        {
          ...colony,
          stock: { ...colony.stock, Iron: 1000, Water: 1000, Oil: 1000 },
          buildings: types.map((type, index) => ({
            id: `factory-${index}`,
            type,
            slotIndex: index,
            demolition: false,
            queue: [],
          })),
        },
      ],
    ],
  });
  const home = game.galaxy.homePlanet;
  const snapshot = () => game.planetSnapshot(home)!;
  const turn = () => {
    for (const frame of turnFrames(game)) game.applyFrame(frame);
    game.finishTurn();
  };
  return { game, home, snapshot, turn };
}

describe('gemensam-planetko / delfabriker / automatiska-delorder', () => {
  it('delar-tillverkas-pa-behov: queues only the ships, never separate part orders', () => {
    const base = setup().game.exportState();
    const game = Game.restore({
      ...base,
      colonies: base.colonies.map(([id, colony]) => [
        id,
        {
          ...colony,
          stock: { ...colony.stock, 'Rocket engine': 1, 'Weapons module': 1 },
        },
      ]),
    });
    game.scheduleShip(game.galaxy.homePlanet, 'Fighter');
    expect(
      game.planetSnapshot(game.galaxy.homePlanet)!.projects.map((p) => p.type),
    ).toEqual(['Fighter']);
    game.scheduleShip(game.galaxy.homePlanet, 'Fighter');
    expect(
      game.planetSnapshot(game.galaxy.homePlanet)!.projects.map((p) => p.type),
    ).toEqual(['Fighter', 'Fighter']);
  });

  it('en-enhet-per-fabrik-och-runda / parallella-byggen: makes the parts in one round and the ship in the next while a building builds alongside', () => {
    const { game, home, snapshot, turn } = setup();
    game.scheduleShip(home, 'Fighter');
    game.scheduleBuild(home, 'Research station');
    expect(snapshot().projects.map((p) => p.type)).toEqual([
      'Fighter',
      'Research station',
    ]);
    turn();
    expect(snapshot().economy.stock['Rocket engine']).toBe(1);
    expect(snapshot().economy.stock['Weapons module']).toBe(1);
    expect(game.fleet('fleet-home')!.ships.Fighter).toBe(1);
    // byggtid-per-byggnad: the Research station needs three rounds.
    expect(snapshot().buildings).toHaveLength(3);
    expect(snapshot().projects.map((p) => p.type)).toEqual([
      'Fighter',
      'Research station',
    ]);
    turn();
    expect(game.fleet('fleet-home')!.ships.Fighter).toBe(2);
    expect(snapshot().economy.stock['Rocket engine']).toBe(0);
    expect(snapshot().economy.stock['Weapons module']).toBe(0);
    expect(snapshot().projects.map((p) => p.type)).toEqual([
      'Research station',
    ]);
    turn();
    expect(snapshot().economy.stock['Rocket engine']).toBe(0);
    expect(snapshot().buildings).toHaveLength(4);
    expect(snapshot().projects).toHaveLength(0);
  });

  it('does not count component orders as reserved building sites', () => {
    const { game, home, snapshot } = setup();
    for (let i = 0; i < 8; i++) game.scheduleShip(home, 'Fighter');
    expect(snapshot().budget.availableSlots).toBe(home.buildSlots - 3);
    expect(game.planetOrders()[0]!.emptySites).toBe(home.buildSlots - 3);
  });

  it('offers one production decision per idle planet rather than one per factory', () => {
    const { game, home } = setup();
    const production = () =>
      game.decisions.filter((decision) =>
        decision.id.startsWith('building-empty-'),
      );
    expect(production()).toHaveLength(1);
    game.scheduleShip(home, 'Fighter');
    expect(production()).toHaveLength(0);
  });

  it('does not mark an idle queue when a full planet has no production capability', () => {
    const { game } = setup(
      Array.from({ length: 10 }, () => 'Research station'),
    );
    expect(game.planetOrders()[0]).toMatchObject({
      emptySites: 0,
      emptyQueues: 0,
    });
  });
});

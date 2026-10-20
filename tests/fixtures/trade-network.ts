import { Game, type GameState } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import { emptyStock } from '../../src/client/models/Economy.js';

export function tradeNetworkState(withRoute = true): GameState {
  const state = new Game(createExampleGalaxy()).exportState();
  const home = state.colonies[0]![1];
  const fleet = state.fleets[0]!;
  const noShips = {
    Fighter: 0,
    'Exploration ship': 0,
    'Colony ship': 0,
    'Transport ship': 0,
  };
  return {
    ...state,
    researched: [
      'Exploration ship factory',
      'Transport ship factory',
      'Trade logistics',
      'Rocket engine factory',
    ],
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
      [
        'sol-0',
        {
          ...home,
          stock: {
            ...emptyStock(),
            Iron: 120,
            Water: 80,
            Oil: 40,
            'Rocket engine': 3,
          },
          buildings: [
            { id: 'mine', type: 'Iron mine', slotIndex: 0, demolition: false },
            {
              id: 'engine',
              type: 'Rocket engine factory',
              slotIndex: 1,
              demolition: false,
            },
          ],
        },
      ],
      [
        'sol-1',
        {
          ...structuredClone(home),
          stock: { ...emptyStock(), Water: 5 },
          population: 1000,
          buildings: [],
          homeFleetId: null,
          projects: [
            {
              id: 'vesta-mine',
              type: 'Iron mine',
              slotIndex: 0,
              factoryId: null,
              destinationFleetId: null,
            },
          ],
        },
      ],
    ],
    tradeRoutes: withRoute
      ? [{ id: 'route-test', a: 'sol-0', b: 'sol-1', closing: false }]
      : [],
    fleets: [
      fleet,
      {
        ...fleet,
        id: 'freighters',
        name: 'Freighters',
        ships: { ...noShips, 'Transport ship': 2, Fighter: 1 },
      },
      {
        ...fleet,
        id: 'travellers',
        name: 'Travellers',
        position: { q: 0, r: 0 },
        destination: { q: 0, r: 1 },
        ships: { ...noShips, 'Transport ship': 1 },
      },
      {
        ...fleet,
        id: 'empty',
        name: 'Reserve',
        position: null,
        destination: null,
        ships: noShips,
      },
    ],
  };
}

import {
  Game,
  type GameState,
} from '../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../src/client/space-map/models/exampleGalaxy.js';

/**
 * Four fleets around Tellus: the home fleet, two transport fleets and an
 * empty reserve. Trade routes and planet economies are gone
 * (`single-fleet-rensning`); the name is kept for existing callers.
 */
export function tradeNetworkState(): GameState {
  const state = new Game(createExampleGalaxy()).exportState();
  const fleet = state.fleets[0]!;
  const noShips = {
    Fighter: 0,
    'Exploration ship': 0,
    'Colony ship': 0,
    'Transport ship': 0,
    'Civilian shuttle': 0,
    'Space pirate': 0,
    'Salvage ship': 0,
    Raptor: 0,
  };
  return {
    ...state,
    fleets: [
      fleet,
      {
        ...fleet,
        id: 'freighters',
        shipUnits: [],
        name: 'Freighters',
        ships: { ...noShips, 'Transport ship': 2, Fighter: 1 },
      },
      {
        ...fleet,
        id: 'travellers',
        shipUnits: [],
        name: 'Travellers',
        position: { q: 0, r: 0 },
        destination: { q: 0, r: 1 },
        ships: { ...noShips, 'Transport ship': 1 },
      },
      {
        ...fleet,
        id: 'empty',
        shipUnits: [],
        name: 'Reserve',
        position: null,
        destination: null,
        ships: noShips,
      },
    ],
  };
}

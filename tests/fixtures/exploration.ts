import { Game } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';

export function discoveryState(fighters = 1) {
  const state = new Game(createExampleGalaxy()).exportState();
  const empty = {
    Fighter: 0,
    'Exploration ship': 0,
    'Colony ship': 0,
    'Transport ship': 0,
    'Civilian shuttle': 0,
    'Space pirate': 0,
    'Salvage ship': 0,
  };
  return {
    ...state,
    researched: [
      ...state.researched,
      'Fleet patrol',
      'Automated exploration',
    ] as const,
    pirates: [state.pirates![0]!],
    fleets: [
      {
        ...state.fleets[0]!,
        position: { q: 7, r: -4 },
        destination: { q: 10, r: -4 },
        shipUnits: [],
        ships: { ...empty, Fighter: fighters, 'Exploration ship': 1 },
      },
      {
        ...state.fleets[0]!,
        id: 'other',
        name: 'Other',
        shipUnits: [],
        ships: { ...empty, Fighter: 1 },
      },
    ],
  };
}

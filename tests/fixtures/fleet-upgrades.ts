import { type GameState } from '../../src/client/models/Game.js';
import { salvageState } from './salvage.js';

export function upgradeState(): GameState {
  const state = salvageState();
  const colony = state.colonies[0]![1];
  colony.stock['Ion pulse engine'] = 2;
  colony.stock['Telescope III'] = 1;
  return {
    ...state,
    researched: [
      ...state.researched,
      'Ion pulse engine factory',
      'Telescope III factory',
    ],
    fleets: state.fleets.map((fleet) => ({
      ...fleet,
      ships: { ...fleet.ships, 'Salvage ship': 0, 'Exploration ship': 1 },
      shipUnits: [
        {
          id: 'explorer',
          type: 'Exploration ship',
          telescope: 1,
          engines: { 'Rocket engine': 2, 'Ion pulse engine': 0 },
        },
      ],
    })),
  };
}

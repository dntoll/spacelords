import type { GameState } from '../../src/client/space-map/models/Game.js';

/**
 * startflotta-med-raptor: the game starts with a Raptor. Scenarios about
 * telescopes, speed 3 or two ships use the earlier Exploration ship and
 * Fighter instead.
 */
export function withScoutFleet<T extends GameState>(state: T): T {
  return {
    ...state,
    fleets: state.fleets.map((fleet) => ({
      ...fleet,
      ships: { ...fleet.ships, Raptor: 0, 'Exploration ship': 1, Fighter: 1 },
      shipUnits: [],
    })),
  };
}

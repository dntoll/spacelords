import { tradeNetworkState } from './trade-network.js';
import type { GameState } from '../../src/client/models/Game.js';

export function routePlaybackState(): GameState {
  const state = tradeNetworkState();
  const planets = state.world.systems.flatMap((system) => system.planets);
  const home = planets.find((planet) => planet.id === 'sol-0')!.position;
  const target = planets.find((planet) => planet.id === 'sol-1')!.position;
  return {
    ...state,
    pirates: [],
    fleets: state.fleets.map((fleet) =>
      fleet.id === 'freighters'
        ? { ...fleet, routeId: 'route-test', destination: target }
        : fleet.id === 'travellers'
          ? {
              ...fleet,
              routeId: 'route-test',
              position: target,
              destination: home,
            }
          : fleet,
    ),
  };
}

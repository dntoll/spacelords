import { Game } from '../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../src/client/space-map/models/exampleGalaxy.js';

/**
 * A new game whose discovered planets are also surveyed. The planet economy
 * and its Research stations are gone (`single-fleet-rensning`).
 */
export function researchStationState() {
  const state = new Game(createExampleGalaxy()).exportState();
  return {
    ...state,
    surveyedPlanets: state.world.systems
      .flatMap((system) => system.planets)
      .filter((planet) => state.knownObjects?.includes(planet.id))
      .map((planet) => planet.id),
  };
}

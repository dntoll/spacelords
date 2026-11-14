import { Game } from '../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../src/client/space-map/models/exampleGalaxy.js';

export function researchStationState() {
  const state = new Game(createExampleGalaxy()).exportState();
  state.colonies[0]![1].buildings.push({
    id: 'test-research-station',
    type: 'Research station',
    slotIndex: 0,
    demolition: false,
  });
  return {
    ...state,
    surveyedPlanets: state.world.systems
      .flatMap((system) => system.planets)
      .filter((planet) => state.knownObjects?.includes(planet.id))
      .map((planet) => planet.id),
  };
}

import { Game } from '../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../src/client/space-map/models/exampleGalaxy.js';

/**
 * Tellus with a Research station. `shipFactory` adds an idle Transport ship
 * factory, which is what makes Production ask for an order
 * (`produktionsbeslut-bara-for-skeppsfabrik`).
 */
export function researchStationState({ shipFactory = false } = {}) {
  const state = new Game(createExampleGalaxy()).exportState();
  state.colonies[0]![1].buildings.push({
    id: 'test-research-station',
    type: 'Research station',
    slotIndex: 0,
    demolition: false,
  });
  if (shipFactory)
    state.colonies[0]![1].buildings.push({
      id: 'test-yard',
      type: 'Transport ship factory',
      slotIndex: 1,
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

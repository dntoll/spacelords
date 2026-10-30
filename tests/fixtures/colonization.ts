import { Game, type GameState } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';

export function colonizationState(colonyShips = 2): GameState {
  const state = new Game(createExampleGalaxy()).exportState();
  return {
    ...state,
    researched: [
      ...state.researched,
      'Fleet patrol',
      'Automated exploration',
    ] as const,
    world: { ...state.world, terrain: [] },
    explored: [
      ...new Set([
        ...state.explored,
        ...state.world.systems.flatMap((system) =>
          system.planets.map(
            (planet) => `${planet.position.q},${planet.position.r}`,
          ),
        ),
      ]),
    ],
    pirates: [],
    knownObjects: [
      ...new Set([
        ...(state.knownObjects ?? []),
        ...state.world.systems.flatMap((system) => [
          system.star.id,
          ...system.planets.map((planet) => planet.id),
        ]),
      ]),
    ],
    fleets: [
      {
        ...state.fleets[0]!,
        ships: { ...state.fleets[0]!.ships, 'Colony ship': colonyShips },
        shipUnits: [],
      },
    ],
  };
}

import { tradeNetworkState } from './trade-network.js';

export function domeProductionState(researched = true, potential = 6) {
  const initial = tradeNetworkState();
  const state = {
    ...initial,
    researched: researched
      ? [...initial.researched, 'Desert dome' as const]
      : initial.researched,
    world: {
      ...initial.world,
      systems: initial.world.systems.map((system, index) =>
        index
          ? system
          : {
              ...system,
              planets: system.planets.map((planet, index) =>
                index
                  ? planet
                  : {
                      ...planet,
                      environment: 'Desert' as const,
                      habitability: 50,
                      buildSlots: potential,
                    },
              ),
            },
      ),
    },
  };
  state.colonies[0]![1].habitability = 50;
  state.colonies[0]![1].domes = [];
  state.colonies[0]![1].buildings = [];
  state.colonies[0]![1].projects = [];
  return state;
}

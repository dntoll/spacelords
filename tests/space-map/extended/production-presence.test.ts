import { describe, expect, it } from 'vitest';
import {
  Game,
  TECHNOLOGIES,
  type GameState,
  type ProjectType,
} from '../../../src/client/space-map/models/Game.js';
import { ProductionPresence } from '../../../src/client/space-map/models/ProductionPresence.js';
import { distantTradeNetworkState } from '../../fixtures/trade-network.js';

function networkState(): GameState {
  const state = distantTradeNetworkState();
  state.colonies[1]![1].projects = [];
  state.colonies[1]![1].buildings = [
    { id: 'water', type: 'Water extractor', slotIndex: 0, demolition: false },
  ];
  state.colonies[2]![1].buildings = [
    { id: 'oil', type: 'Oil extractor', slotIndex: 0, demolition: false },
  ];
  return {
    ...state,
    researched: TECHNOLOGIES,
    tradeRoutes: state.tradeRoutes.map((route) =>
      route.id === 'route-distant' ? { ...route, a: 'sol-1' } : route,
    ),
  };
}

function option(state: GameState, type: ProjectType) {
  const game = Game.restore(state);
  return game
    .productionOptions(game.galaxy.homePlanet)
    .find((entry) => entry.type === type)!;
}

describe('produktionsvalens-statusfarger', () => {
  it('counts ships at actual planets and applies local/network/queue precedence for all product types', () => {
    for (const type of [
      'Research station',
      'Rocket engine',
      'Transport ship',
    ] as const) {
      const local = {
        id: 'local',
        counts: new Map<ProjectType, number>(),
        queued: new Map<ProjectType, number>([[type, 1]]),
      };
      const remote = {
        id: 'remote',
        counts: new Map<ProjectType, number>(),
        queued: new Map<ProjectType, number>(),
      };
      const presence = new ProductionPresence(local, [remote]);
      expect(presence.snapshot(type).presence).toBe('queued');
      remote.counts.set(type, 2);
      expect(presence.snapshot(type).presence).toBe('network');
      local.counts.set(type, 1);
      expect(presence.snapshot(type).presence).toBe('local');
      expect(presence.snapshot(type).queuedLocalCount).toBe(1);
    }
    const state = networkState();
    state.colonies[0]![1].buildings.push({
      id: 'transport-factory',
      type: 'Transport ship factory',
      slotIndex: 2,
      demolition: false,
    });
    expect(option(state, 'Transport ship')).toMatchObject({
      presence: 'local',
      localCount: 2,
      networkCount: 1,
    });
  });
});

import { describe, expect, it } from 'vitest';
import {
  Game,
  TECHNOLOGIES,
} from '../../../src/client/space-map/models/Game.js';
import { RETIRED_ORDER_TECHNOLOGIES } from '../../../src/client/space-map/models/research/Research.js';
import { tradeNetworkState } from '../../fixtures/trade-network.js';

describe('fria-utforsknings-och-patrullorder', () => {
  it('lets Explore, Explore stars and Patrol start without the retired technologies', () => {
    const game = Game.restore({
      ...tradeNetworkState(),
      researched: [],
      pirates: [],
    });
    expect(() => game.setPatrol('fleet-home')).not.toThrow();
    const exploring = Game.restore({
      ...tradeNetworkState(),
      researched: [],
      pirates: [],
    });
    exploring.setExploration('fleet-home', 'explore');
    expect(exploring.fleet('fleet-home')!.exploration).toBe('explore');
    exploring.setExploration('fleet-home', 'explore-stars');
    expect(exploring.fleet('fleet-home')!.exploration).toBe('explore-stars');
  });

  it('drops retired order technologies from research and still loads the save', () => {
    const state = tradeNetworkState();
    const game = Game.restore({
      ...state,
      researched: [
        ...state.researched,
        'Automated transport',
        'Fleet patrol',
        'Automated exploration',
      ],
      researchQueue: ['Fleet patrol'],
      recoveredResearch: ['Automated exploration'],
    });
    for (const technology of RETIRED_ORDER_TECHNOLOGIES)
      expect(game.research.completed).not.toContain(technology);
    expect(game.research.queue).not.toContain('Fleet patrol');
    expect(TECHNOLOGIES).not.toContain('Automated transport');
  });
});

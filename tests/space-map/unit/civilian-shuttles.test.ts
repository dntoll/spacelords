import { describe, expect, it } from 'vitest';
import { Game } from '../../../src/client/space-map/models/Game.js';
import { ResearchPlan } from '../../../src/client/space-map/models/research/Research.js';
import { tradeNetworkState } from '../../fixtures/trade-network.js';

function shuttleState() {
  const state = tradeNetworkState();
  const home = state.colonies[0]![1];
  home.population = 3000;
  home.buildings.push({
    id: 'transport-factory',
    type: 'Transport ship factory',
    slotIndex: 2,
    demolition: false,
  });
  state.colonies[1]![1].buildings = [
    {
      id: 'research-1',
      type: 'Research station',
      slotIndex: 1,
      demolition: false,
    },
    {
      id: 'research-2',
      type: 'Research station',
      slotIndex: 2,
      demolition: false,
    },
  ];
  return {
    ...state,
    researched: [...state.researched, 'Civilian transport'] as const,
  };
}

describe('civil-skyttelforskning', () => {
  it('queues Trade logistics as a prerequisite and gates direct manufacture until completion', () => {
    const research = new ResearchPlan();
    research.add('Civilian transport');
    expect(research.queue.indexOf('Trade logistics')).toBeLessThan(
      research.queue.indexOf('Civilian transport'),
    );
    const state = shuttleState();
    const game = Game.restore({
      ...state,
      researched: state.researched.filter((t) => t !== 'Civilian transport'),
    });
    const planet = game.planetAt(game.fleetSnapshots()[0]!.position!)!;
    expect(() => game.scheduleShip(planet, 'Civilian shuttle')).toThrow(
      'Research Civilian transport first',
    );
    // byggval-bara-framforskat: no build choice until it is researched.
    expect(game.productionOptions(planet).map((o) => o.type)).not.toContain(
      'Civilian shuttle',
    );
  });
});

import { describe, expect, it } from 'vitest';
import { Game } from '../../src/client/models/Game.js';
import {
  ResearchPlan,
  type Technology,
} from '../../src/client/models/Research.js';
import {
  isResearchIdentified,
  ResearchTreeLayout,
} from '../../src/client/models/ResearchTree.js';
import { researchStationState } from '../fixtures/research-station.js';

describe('transport-ship-efter-rocket-engine', () => {
  it.each([
    [
      'Transport ship factory',
      ['Rocket engine factory', 'Transport ship factory'],
    ],
    [
      'Trade logistics',
      ['Rocket engine factory', 'Transport ship factory', 'Trade logistics'],
    ],
  ] as const)(
    'plans %s without adding exploration or telescopes',
    (technology, expected) => {
      const plan = new ResearchPlan();
      plan.add(technology);
      expect(plan.queue).toEqual(expected);
    },
  );

  it('reveals transport with Colony ship after engines and places their dependencies on the same tree level', () => {
    const state = {
      ...researchStationState(),
      researched: ['Rocket engine factory'] as const,
    };
    const research = Game.restore(state).research;
    expect(isResearchIdentified(research, 'Transport ship factory')).toBe(true);
    expect(isResearchIdentified(research, 'Colony ship factory')).toBe(true);
    expect(isResearchIdentified(research, 'Exploration ship factory')).toBe(
      false,
    );
    const tree = new ResearchTreeLayout(research.available);
    expect(
      tree.edges.filter((edge) => edge.to === 'Transport ship factory'),
    ).toEqual([
      { from: 'Rocket engine factory', to: 'Transport ship factory' },
    ]);
    expect(
      tree.nodes.find((node) => node.technology === 'Transport ship factory')!
        .x,
    ).toBe(
      tree.nodes.find((node) => node.technology === 'Colony ship factory')!.x,
    );
  });

  it('can prioritize transport ahead of exploration and removes only real dependents', () => {
    const plan = new ResearchPlan();
    plan.add('Exploration ship factory');
    plan.add('Trade logistics');
    plan.move('Transport ship factory', 1);
    plan.remove('Exploration ship factory');
    expect(plan.queue).toEqual([
      'Rocket engine factory',
      'Transport ship factory',
      'Telescope I factory',
      'Trade logistics',
    ]);
    plan.remove('Rocket engine factory');
    expect(plan.queue).toEqual(['Telescope I factory']);
  });

  it('preserves an older saved queue and allows exploration removal without losing transport or trade', () => {
    const legacyQueue: Technology[] = [
      'Rocket engine factory',
      'Telescope I factory',
      'Exploration ship factory',
      'Transport ship factory',
      'Trade logistics',
    ];
    const state = { ...researchStationState(), researchQueue: legacyQueue };
    const game = Game.restore(state);
    expect(game.research.queue).toEqual(legacyQueue);
    expect(game.exportState().version).toBe(state.version);
    game.removeResearch('Exploration ship factory');
    expect(game.research.queue).toEqual([
      'Rocket engine factory',
      'Telescope I factory',
      'Transport ship factory',
      'Trade logistics',
    ]);
    expect(Game.restore(game.exportState()).research.queue).toEqual(
      game.research.queue,
    );
    expect(state.researchQueue).toEqual(legacyQueue);
  });
});

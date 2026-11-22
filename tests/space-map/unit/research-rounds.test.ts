// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  Game,
  type GameState,
} from '../../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';
import {
  ResearchPlan,
  TECHNOLOGIES,
  researchRounds,
} from '../../../src/client/space-map/models/research/Research.js';
import {
  ResearchTreeLayout,
  researchEdgeCrossings,
} from '../../../src/client/space-map/models/research/ResearchTree.js';
import { renderResearch } from '../../../src/client/space-map/views/research/ResearchView.js';
import { renderResearchDetails } from '../../../src/client/space-map/views/research/ResearchDetailsView.js';

const allKnown = {
  available: TECHNOLOGIES,
  completed: ['Missiles', 'Armor'] as const,
  selected: null,
  queue: [],
};

describe('forskningstid', () => {
  it('takes one to three rounds by depth in the tree', () => {
    expect(researchRounds('Missiles')).toBe(1);
    expect(researchRounds('Armor')).toBe(1);
    expect(researchRounds('Armored Transport')).toBe(2);
    for (const technology of TECHNOLOGIES)
      expect([1, 2, 3]).toContain(researchRounds(technology));
  });

  it('advances only with research effort and forgets progress of removed research', () => {
    const plan = new ResearchPlan(new Set(['Armor']));
    plan.add('Armored Transport');
    expect(plan.advance(0)).toBeNull();
    expect(plan.progress.size).toBe(0);
    expect(plan.advance(1)).toBeNull();
    expect(plan.progress.get('Armored Transport')).toBe(1);
    plan.remove('Armored Transport');
    expect(plan.progress.size).toBe(0);
    plan.add('Armored Transport');
    expect(plan.advance(1)).toBeNull();
    expect(plan.advance(1)).toBe('Armored Transport');
  });

  it('keeps started research in a saved game and loads older saves without it', () => {
    const game = new Game(createExampleGalaxy());
    const state = game.exportState();
    const saved: GameState = {
      ...state,
      researched: ['Armor'],
      researchQueue: ['Armored Transport'],
      researchProgress: { 'Armored Transport': 1 },
    };
    expect(Game.restore(saved).research.progress).toEqual({
      'Armored Transport': 1,
    });
    expect(Game.restore(saved).exportState().researchProgress).toEqual({
      'Armored Transport': 1,
    });
    const older = { ...saved };
    delete (older as { researchProgress?: unknown }).researchProgress;
    expect(Game.restore(older).research.progress).toEqual({});
  });

  it('shows research time in the details and progress for the active technology', () => {
    const idle = renderResearchDetails(
      allKnown,
      'Armored Transport',
      false,
      () => {},
    );
    expect(idle.textContent).toContain('Research time: 2 rounds');
    const active = renderResearchDetails(
      {
        ...allKnown,
        queue: ['Armored Transport'],
        progress: { 'Armored Transport': 1 },
      },
      'Armored Transport',
      false,
      () => {},
    );
    expect(active.textContent).toContain('Researching · 1/2 rounds');
  });
});

describe('forskningstrad-utan-korsningar', () => {
  it('lays out the whole tree and a new game’s tree without crossing lines', () => {
    for (const technologies of [
      TECHNOLOGIES,
      new Game(createExampleGalaxy()).research.available,
    ]) {
      const layout = new ResearchTreeLayout(technologies);
      expect(researchEdgeCrossings(layout)).toBe(0);
      // Each dependency still runs left to right, and no cards overlap.
      for (const edge of layout.edges) {
        const from = layout.nodes.find((n) => n.technology === edge.from)!;
        const to = layout.nodes.find((n) => n.technology === edge.to)!;
        expect(to.x).toBeGreaterThan(from.x);
      }
      for (const [index, node] of layout.nodes.entries())
        for (const other of layout.nodes.slice(index + 1))
          expect(
            node.x !== other.x ||
              Math.abs(node.y - other.y) >= layout.cardHeight,
          ).toBe(true);
    }
  });

  it('forskningstrad-raka-linjer: keeps linked cards level, as with Armor and its armored hulls', () => {
    const layout = new ResearchTreeLayout(TECHNOLOGIES);
    const y = (type: string) =>
      layout.nodes.find((node) => node.technology === type)!.y;
    expect(y('Armored Transport')).toBeLessThan(y('Armored Fighter'));
    expect(
      Math.min(
        Math.abs(y('Armor') - y('Armored Transport')),
        Math.abs(y('Armor') - y('Armored Fighter')),
      ),
    ).toBeLessThan(layout.cardHeight);
    for (const node of layout.nodes)
      expect(Number.isInteger(node.y)).toBe(true);
  });

  it('counts a crossing between two lines', () => {
    expect(
      researchEdgeCrossings({
        cardWidth: 10,
        cardHeight: 0,
        edges: [
          { from: 'Missiles', to: 'Armored Transport' },
          { from: 'Armor', to: 'Armored Fighter' },
        ],
        nodes: [
          { technology: 'Missiles', x: 0, y: 0 },
          { technology: 'Armor', x: 0, y: 100 },
          { technology: 'Armored Transport', x: 50, y: 100 },
          { technology: 'Armored Fighter', x: 50, y: 0 },
        ],
      }),
    ).toBe(1);
  });

  it('names every technology in the tree, leaves included', () => {
    const view = renderResearch(allKnown, false, () => {});
    expect(
      view.querySelector(
        '[data-technology="Armored Fighter"] .research-node-name',
      )?.textContent,
    ).toBe('Armored Fighter');
  });
});

it('forskningsikon-i-detaljer: the details show the technology’s symbol beside its name', () => {
  const details = renderResearchDetails(allKnown, 'Missiles', false, () => {});
  const title = details.querySelector('.research-detail-title')!;
  expect(title.querySelector('img, svg')).not.toBeNull();
  expect(title.textContent).toContain('Missiles');
});

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
import { ResearchTreeLayout } from '../../../src/client/space-map/models/research/ResearchTree.js';
import { renderResearch } from '../../../src/client/space-map/views/research/ResearchView.js';
import { renderResearchDetails } from '../../../src/client/space-map/views/research/ResearchDetailsView.js';

const allKnown = {
  available: TECHNOLOGIES,
  completed: ['Rocket engine factory' as const],
  selected: null,
  stations: 1,
  builtStations: 1,
  queueBlockedReason: null,
  queue: [],
};

describe('forskningstid', () => {
  it('takes one to three rounds by depth in the tree', () => {
    expect(researchRounds('Rocket engine factory')).toBe(1);
    expect(researchRounds('Transport ship factory')).toBe(2);
    expect(researchRounds('Trade logistics')).toBe(3);
    expect(researchRounds('Automated salvage')).toBe(3);
    for (const technology of TECHNOLOGIES)
      expect([1, 2, 3]).toContain(researchRounds(technology));
  });

  it('needs an operating station every round and forgets progress of removed research', () => {
    const plan = new ResearchPlan(new Set(['Rocket engine factory']));
    plan.add('Transport ship factory');
    expect(plan.advance(0)).toBeNull();
    expect(plan.progress.size).toBe(0);
    expect(plan.advance(1)).toBeNull();
    expect(plan.progress.get('Transport ship factory')).toBe(1);
    plan.remove('Transport ship factory');
    expect(plan.progress.size).toBe(0);
    plan.add('Transport ship factory');
    expect(plan.advance(1)).toBeNull();
    expect(plan.advance(1)).toBe('Transport ship factory');
  });

  it('keeps started research in a saved game and loads older saves without it', () => {
    const game = new Game(createExampleGalaxy());
    const state = game.exportState();
    const saved: GameState = {
      ...state,
      researched: ['Rocket engine factory'],
      researchQueue: ['Transport ship factory'],
      researchProgress: { 'Transport ship factory': 1 },
    };
    expect(Game.restore(saved).research.progress).toEqual({
      'Transport ship factory': 1,
    });
    expect(Game.restore(saved).exportState().researchProgress).toEqual({
      'Transport ship factory': 1,
    });
    const older = { ...saved };
    delete (older as { researchProgress?: unknown }).researchProgress;
    expect(Game.restore(older).research.progress).toEqual({});
  });

  it('shows research time in the details and progress for the active technology', () => {
    const idle = renderResearchDetails(
      allKnown,
      'Transport ship factory',
      false,
      () => {},
    );
    expect(idle.textContent).toContain('Research time: 2 rounds');
    const active = renderResearchDetails(
      {
        ...allKnown,
        queue: ['Transport ship factory'],
        progress: { 'Transport ship factory': 1 },
      },
      'Transport ship factory',
      false,
      () => {},
    );
    expect(active.textContent).toContain('Researching · 1/2 rounds');
  });
});

describe('forskningslov-som-symbol', () => {
  it('draws leaves as square symbol tiles and keeps names on inner nodes', () => {
    const layout = new ResearchTreeLayout(TECHNOLOGIES);
    const node = (type: string) =>
      layout.nodes.find((item) => item.technology === type)!;
    expect(node('Trade logistics').leaf).toBe(false);
    expect(node('Civilian transport')).toMatchObject({
      leaf: true,
      width: layout.cardHeight,
    });
    expect(node('Rocket engine factory').width).toBe(layout.cardWidth);
    const view = renderResearch(allKnown, false, () => {});
    const leaf = view.querySelector('[data-technology="Colony ship factory"]')!;
    expect(leaf.classList).toContain('leaf');
    expect(leaf.querySelector('.research-node-name')).toBeNull();
    expect(leaf.querySelector('button')!.getAttribute('aria-label')).toBe(
      'Inspect Colony ship factory',
    );
    expect(
      view.querySelector(
        '[data-technology="Rocket engine factory"] .research-node-name',
      )?.textContent,
    ).toBe('Rocket engine');
  });
});

it('forskningsikon-i-detaljer: the details show the technology’s symbol beside its name', () => {
  const details = renderResearchDetails(
    allKnown,
    'Rocket engine factory',
    false,
    () => {},
  );
  const title = details.querySelector('.research-detail-title')!;
  expect(title.querySelector('img')).not.toBeNull();
  expect(title.textContent).toContain('Rocket engine factory');
});

// @vitest-environment jsdom
import { turnFrames } from '../fixtures/turn-steps.js';
import { TECHNOLOGIES } from '../../src/client/models/Research.js';
import { expect, it, vi } from 'vitest';
import { Game } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import { ResearchTreeLayout } from '../../src/client/models/ResearchTree.js';
import { renderResearch } from '../../src/client/views/ResearchView.js';

it('forsknings-tradnavigation: distinguishes completed, active, queued and unavailable technologies while preserving research commands', () => {
  const emit = vi.fn();
  const view = renderResearch(
    {
      available: TECHNOLOGIES,
      completed: ['Rocket engine factory', 'Exploration ship factory'],
      selected: 'Transport ship factory',
      stations: 1,
      queueBlockedReason: null,
      queue: ['Transport ship factory', 'Trade logistics'],
    },
    false,
    emit,
  );
  const node = (type: string) =>
    view.querySelector<HTMLElement>(`[data-technology="${type}"]`)!;
  expect(node('Exploration ship factory').dataset.state).toBe('completed');
  expect(
    node('Exploration ship factory').querySelector('button')!.disabled,
  ).toBe(false);
  expect(node('Transport ship factory').dataset.state).toBe('active');
  expect(node('Transport ship factory').querySelector('button')!.disabled).toBe(
    false,
  );
  expect(node('Trade logistics').dataset.state).toBe('queued');
  expect(node('Colony ship factory').dataset.state).toBe('available');
  expect(node('Fighter factory').dataset.state).toBe('locked');
  node('Fighter factory').querySelector('button')!.click();
  expect(emit).toHaveBeenLastCalledWith({
    type: 'inspect-research',
    technology: 'Fighter factory',
  });
  expect(view.querySelectorAll('.research-edge.unlocked')).toHaveLength(6);
  expect(
    view
      .querySelector(
        '[data-from="Rocket engine factory"][data-to="Orbital shipyard"]',
      )
      ?.classList.contains('unlocked'),
  ).toBe(true);
  const tree = view.querySelector<HTMLElement>('.research-tree-viewport')!;
  tree.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
  expect(emit).toHaveBeenLastCalledWith({
    type: 'research-pan',
    delta: { x: -64, y: 0 },
  });
});

it('forskning-fran-bargade-delar: shows recovered technology as available while ordinary prerequisite technologies stay unfinished', () => {
  const emit = vi.fn();
  const view = renderResearch(
    {
      available: TECHNOLOGIES,
      completed: [],
      selected: null,
      stations: 1,
      queueBlockedReason: null,
      queue: [],
      recovered: ['Telescope III factory'],
    },
    false,
    emit,
    'Telescope III factory',
  );
  const recovered = view.querySelector<HTMLElement>(
    '[data-technology="Telescope III factory"]',
  )!;
  expect(recovered.dataset.state).toBe('available');
  expect(recovered.textContent).toContain('Recovered');
  expect(
    view.querySelector<HTMLElement>('[data-technology="Telescope II factory"]')!
      .dataset.state,
  ).toBe('locked');
  view
    .querySelector<HTMLButtonElement>(
      '[aria-label="Research Telescope III factory"]',
    )!
    .click();
  expect(emit).toHaveBeenCalledWith({
    type: 'research',
    technology: 'Telescope III factory',
  });
});

it('planettypsforskning: omits hidden projects and sizes the diagram for only discovered technologies', () => {
  const research = new Game(createExampleGalaxy()).research;
  const view = renderResearch(research, false, vi.fn());
  const layout = new ResearchTreeLayout(research.available);
  expect(
    view.querySelector('.research-introduction-details')!.textContent,
  ).toContain('Dome');
  expect(view.querySelector('[data-technology="Ice dome"]')).toBeNull();
  expect(view.querySelector('[data-technology="Desert dome"]')).not.toBeNull();
  expect(view.querySelectorAll('[data-technology]')).toHaveLength(
    research.available.length,
  );
  expect(
    view.querySelector<HTMLElement>('.research-tree-stage')!.style.height,
  ).toBe(`${layout.height}px`);
  expect(
    view.querySelector(
      '[data-from="Desert dome"][data-to="Desert terraforming factory"]',
    ),
  ).not.toBeNull();
});

it('forskning-kraver-station: cannot queue research before a station is completed, but can queue afterwards and pauses when it is demolished', () => {
  const game = new Game(createExampleGalaxy());
  const before = game.exportState();
  expect(() => game.selectResearch('Colony ship factory')).toThrow(
    /Research station/,
  );
  expect(game.exportState()).toEqual(before);
  game.scheduleBuild(game.galaxy.homePlanet, 'Research station');
  expect(() => game.selectResearch('Colony ship factory')).toThrow(
    /Research station/,
  );
  for (const frame of turnFrames(game)) game.applyFrame(frame);
  game.finishTurn();
  game.selectResearch('Colony ship factory');
  const station = game.planetSnapshot(game.galaxy.homePlanet)!.buildings[0]!;
  game.toggleDemolition(game.galaxy.homePlanet, station.id);
  const queue = game.research.queue;
  expect(() => game.selectResearch('Fighter factory')).toThrow(
    /Research station/,
  );
  for (const frame of turnFrames(game)) game.applyFrame(frame);
  game.finishTurn();
  expect(game.research.completed).toEqual([]);
  expect(game.research.queue).toEqual(queue);
  expect(Game.restore(game.exportState()).research.queue).toEqual(queue);
});

it('forskning-kraver-station: explains the missing station and disables queue actions in the research tree', () => {
  const emit = vi.fn();
  const view = renderResearch(
    new Game(createExampleGalaxy()).research,
    false,
    emit,
    'Rocket engine factory',
  );
  for (const button of view.querySelectorAll<HTMLButtonElement>(
    '.research-details button:not(.research-details-close)',
  )) {
    expect(button.disabled).toBe(true);
    button.click();
  }
  expect(emit).not.toHaveBeenCalled();
  expect(
    view.querySelector('.research-station-required')?.textContent,
  ).toContain('Build a Research station');
});

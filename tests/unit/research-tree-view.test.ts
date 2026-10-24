// @vitest-environment jsdom
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
      completed: ['Exploration ship factory'],
      selected: 'Transport ship factory',
      stations: 1,
      queue: ['Transport ship factory', 'Trade logistics'],
    },
    false,
    emit,
  );
  const node = (type: string) =>
    view.querySelector<HTMLElement>(`[data-technology="${type}"]`)!;
  expect(node('Exploration ship factory').dataset.state).toBe('completed');
  expect(node('Exploration ship factory').querySelector('button')).toBeNull();
  expect(node('Transport ship factory').dataset.state).toBe('active');
  expect(node('Transport ship factory').querySelector('button')!.disabled).toBe(
    true,
  );
  expect(node('Trade logistics').dataset.state).toBe('queued');
  expect(node('Colony ship factory').dataset.state).toBe('available');
  expect(node('Fighter factory').dataset.state).toBe('locked');
  node('Fighter factory').querySelector('button')!.click();
  expect(emit).toHaveBeenLastCalledWith({
    type: 'research',
    technology: 'Fighter factory',
  });
  expect(view.querySelectorAll('.research-edge.unlocked')).toHaveLength(3);
  const tree = view.querySelector<HTMLElement>('.research-tree-viewport')!;
  tree.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
  expect(emit).toHaveBeenLastCalledWith({
    type: 'research-pan',
    delta: { x: -64, y: 0 },
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

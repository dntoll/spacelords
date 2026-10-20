// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { renderResearch } from '../../src/client/views/ResearchView.js';

it('forsknings-tradnavigation: distinguishes completed, active, queued and unavailable technologies while preserving research commands', () => {
  const emit = vi.fn();
  const view = renderResearch(
    {
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

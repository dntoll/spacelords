// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { AppController } from '../../src/client/controllers/AppController.js';
import { AppView } from '../../src/client/views/AppView.js';
import { isResearchIdentified } from '../../src/client/models/ResearchTree.js';
import { researchStationModel } from '../fixtures/research-station.js';
import { renderResearchTree } from '../../src/client/views/ResearchTreeView.js';

function setup() {
  const model = researchStationModel();
  model.openResearch();
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  const controller = new AppController(
    model,
    new AppView(root, () => ({ render() {}, dispose() {} })),
  );
  controller.start();
  const click = (label: string) => {
    const target = [...root.querySelectorAll<HTMLButtonElement>('button')].find(
      (node) => node.getAttribute('aria-label') === label,
    );
    expect(target, label).toBeDefined();
    target!.click();
  };
  return { model, root, click, controller };
}

describe('kompakt-forskningstrad / forskningens-avslojande / forskningsdetaljer-vid-val', () => {
  it('dubbelklick-koar-forskning: retains the tile through inspection and queues once on double click', () => {
    const { model, root, click, controller } = setup();
    const tile = root.querySelector<HTMLButtonElement>(
      '[aria-label="Inspect Rocket engine factory"]',
    )!;
    click('Inspect Rocket engine factory');
    expect(model.snapshot.research.queue).toEqual([]);
    expect(tile.isConnected).toBe(true);
    tile.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(model.snapshot.research.queue).toEqual(['Rocket engine factory']);
    controller.dispose();
  });
  it('dubbelklick-koar-forskning: touch queues once and never orders unknown, completed, queued or blocked research', () => {
    const { model, root, controller } = setup();
    Object.assign(root.querySelector('.research-tree-viewport')!, {
      hasPointerCapture: () => false,
    });
    for (let tap = 0; tap < 2; tap++) {
      const tile = root.querySelector<HTMLButtonElement>(
        '[aria-label="Inspect Rocket engine factory"]',
      )!;
      const pointer = new Event('pointerup', { bubbles: true });
      Object.defineProperty(pointer, 'pointerType', { value: 'touch' });
      tile.dispatchEvent(pointer);
      tile.click();
    }
    expect(model.snapshot.research.queue).toEqual(['Rocket engine factory']);
    const research = model.snapshot.research;
    for (const [state, locked, technology] of [
      [research, false, 'Rocket engine factory'],
      [research, false, 'Fighter factory'],
      [
        { ...research, queue: [], completed: ['Rocket engine factory'] },
        false,
        'Rocket engine factory',
      ],
      [
        {
          ...research,
          queue: [],
          queueBlockedReason: 'Build a Research station first.',
        },
        false,
        'Rocket engine factory',
      ],
      [{ ...research, queue: [] }, true, 'Rocket engine factory'],
    ] as const) {
      const intents: unknown[] = [];
      const tree = renderResearchTree(
        state,
        (intent) => intents.push(intent),
        null,
        locked,
      );
      tree
        .querySelector(`[data-technology="${technology}"] button`)!
        .dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      expect(intents).toEqual([]);
    }
    controller.dispose();
  });

  it('reveals only the completed prerequisite frontier, with queued and recovered exceptions', () => {
    const research = researchStationModel().snapshot.research;
    expect(isResearchIdentified(research, 'Rocket engine factory')).toBe(true);
    expect(isResearchIdentified(research, 'Fighter factory')).toBe(false);
    const partial = {
      ...research,
      completed: ['Rocket engine factory' as const],
    };
    expect(isResearchIdentified(partial, 'Exploration ship factory')).toBe(
      false,
    );
    expect(
      isResearchIdentified(
        {
          ...partial,
          completed: [...partial.completed, 'Telescope I factory'],
        },
        'Exploration ship factory',
      ),
    ).toBe(true);
    expect(
      isResearchIdentified(
        { ...research, queue: ['Fighter factory'] },
        'Fighter factory',
      ),
    ).toBe(true);
    expect(
      isResearchIdentified(
        { ...research, recovered: ['Telescope III factory'] },
        'Telescope III factory',
      ),
    ).toBe(true);
  });
  it('forskningsdetaljer-vid-val: selection updates the separate details while preserving the tile, viewport and camera', () => {
    const { model, root, click, controller } = setup();
    const camera = model.snapshot.researchCamera;
    const tile = root.querySelector(
      '[data-technology="Rocket engine factory"]',
    )!;
    const viewport = root.querySelector('.research-tree-viewport');
    click('Inspect Rocket engine factory');
    expect(model.snapshot.inspectedResearch).toBe('Rocket engine factory');
    expect(model.snapshot.research.queue).toEqual([]);
    expect(root.querySelector('.research-tree-viewport')).toBe(viewport);
    expect(tile.isConnected).toBe(true);
    expect(tile.querySelector('.research-node-details')).toBeNull();
    expect(root.querySelector('.research-details')!.textContent).toContain(
      'Produces Rocket engines',
    );
    click('Inspect Telescope I factory');
    expect(root.querySelector('.research-details')!.textContent).toContain(
      'Telescope I factory',
    );
    expect(root.querySelectorAll('.research-node-details')).toHaveLength(1);
    expect(model.snapshot.researchCamera).toEqual(camera);
    click('Inspect Rocket engine factory');
    click('Research Rocket engine factory');
    expect(model.snapshot.research.queue).toEqual(['Rocket engine factory']);
    expect(model.snapshot.researchCamera).toEqual(camera);
    root
      .querySelector('.research-page')!
      .dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    expect(model.snapshot.inspectedResearch).toBeNull();
    expect(document.activeElement?.getAttribute('aria-label')).toBe(
      'Inspect Rocket engine factory',
    );
    controller.dispose();
  });
  it('anonymous tiles expose no future name, image, description or research action', () => {
    const { root, model, controller } = setup();
    const tile = root.querySelector<HTMLElement>(
      '[data-technology="Fighter factory"]',
    )!;
    tile.querySelector('button')!.click();
    expect(tile.textContent).not.toContain('Fighter');
    expect(tile.querySelector('img')).toBeNull();
    expect(tile.querySelector('.research-node-details')).toBeNull();
    expect(tile.querySelectorAll('button')).toHaveLength(1);
    expect(model.snapshot.research.queue).toEqual([]);
    controller.dispose();
  });
  it('retains an open queue during inspection and order updates', () => {
    const { root, model, click, controller } = setup();
    root.querySelector<HTMLDetailsElement>('.research-queue')!.open = true;
    click('Inspect Rocket engine factory');
    expect(
      root.querySelector<HTMLDetailsElement>('.research-queue')!.open,
    ).toBe(true);
    model.research('Rocket engine factory');
    controller.start();
    expect(
      root.querySelector<HTMLDetailsElement>('.research-queue')!.open,
    ).toBe(true);
    controller.dispose();
  });
});

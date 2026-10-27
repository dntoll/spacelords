// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { AppController } from '../../src/client/controllers/AppController.js';
import { AppView } from '../../src/client/views/AppView.js';
import { isResearchIdentified } from '../../src/client/models/ResearchTree.js';
import { researchStationModel } from '../fixtures/research-station.js';

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
  it('opens details without placing an order and only the separate Research button queues', () => {
    const { model, root, click, controller } = setup();
    const camera = model.snapshot.researchCamera;
    click('Inspect Rocket engine factory');
    expect(model.snapshot.inspectedResearch).toBe('Rocket engine factory');
    expect(model.snapshot.research.queue).toEqual([]);
    expect(model.snapshot.research.selected).toBeNull();
    expect(document.activeElement).toBe(
      root.querySelector('.research-details'),
    );
    click('Research Rocket engine factory');
    expect(model.snapshot.research.queue).toEqual(['Rocket engine factory']);
    expect(model.snapshot.researchCamera).toEqual(camera);
    click('Close research details');
    expect(root.querySelector('.research-details')).toBeNull();
    expect(document.activeElement?.getAttribute('aria-label')).toBe(
      'Inspect Rocket engine factory',
    );
    controller.dispose();
  });
  it('anonymous tiles and their details expose no future name, image, description or research action', () => {
    const { root, model, controller } = setup();
    const tile = root.querySelector<HTMLElement>(
      '[data-technology="Fighter factory"]',
    )!;
    expect(tile.textContent).not.toContain('Fighter');
    expect(tile.querySelector('img')).toBeNull();
    expect(tile.querySelector('button')!.title).toBe('Unknown technology');
    tile.querySelector('button')!.click();
    const details = root.querySelector('.research-details')!;
    expect(details.textContent).not.toContain('Fighter');
    expect(details.querySelectorAll('button')).toHaveLength(1);
    expect(model.snapshot.research.queue).toEqual([]);
    details.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(root.querySelector('.research-details')).toBeNull();
    controller.dispose();
  });
  it('makes the queue and details mutually exclusive and retains an open queue on updates', () => {
    const { root, model, click, controller } = setup();
    root.querySelector<HTMLDetailsElement>('.research-queue')!.open = true;
    click('Inspect Rocket engine factory');
    expect(
      root.querySelector<HTMLDetailsElement>('.research-queue')!.open,
    ).toBe(false);
    const queue = root.querySelector<HTMLDetailsElement>('.research-queue')!;
    queue.open = true;
    queue.dispatchEvent(new Event('toggle'));
    expect(model.snapshot.inspectedResearch).toBeNull();
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

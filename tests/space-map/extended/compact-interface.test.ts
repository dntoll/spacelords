// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { researchStationModel } from '../../fixtures/research-station-model.js';
import { renderResearch } from '../../../src/client/space-map/views/research/ResearchView.js';
import { isResearchIdentified } from '../../../src/client/space-map/models/research/ResearchTree.js';
import { gameText } from '../../../src/client/space-map/views/turn/GameText.js';
import type { IntentHandler } from '../../../src/client/app/views/ViewContracts.js';

describe('kompakt-spelgranssnitt', () => {
  it('forskningsstatus-med-tydliga-farger: reserves the completion marker for researched technology while retaining queue and unknown states', () => {
    const research = {
      ...researchStationModel({ shipFactory: true }).snapshot.research,
      completed: ['Rocket engine factory', 'Telescope I factory'] as const,
      queue: ['Telescope II factory', 'Telescope III factory'] as const,
    };
    const page = renderResearch(
      research,
      false,
      vi.fn(),
      'Colony ship factory',
    );
    for (const [type, state, marker, description] of [
      ['Rocket engine factory', 'completed', '✓', 'Researched'],
      ['Colony ship factory', 'available', null, 'Available'],
      ['Telescope II factory', 'active', '▶', 'Researching'],
      ['Telescope III factory', 'queued', '2', 'Queued · 2'],
      ['Fighter factory', 'locked', null, 'Undiscovered'],
    ] as const) {
      const node = page.querySelector(`[data-technology="${type}"]`)!;
      expect(node.getAttribute('data-state')).toBe(state);
      expect(
        node.querySelector('.research-node-marker')?.textContent ?? null,
      ).toBe(marker);
      expect(
        node.querySelector('button')!.getAttribute('aria-description'),
      ).toBe(description);
    }
    expect(
      page.querySelector(
        '[data-technology="Fighter factory"] .research-node-name',
      )!.textContent,
    ).toBe('Unknown');
  });
  it('kompakt-forskningstrad: shortens only tile titles and exposes status without a visible status row', () => {
    const model = researchStationModel({ shipFactory: true });
    const emit = vi.fn();
    const page = renderResearch(
      model.snapshot.research,
      false,
      emit,
      'Rocket engine factory',
    );
    const tile = page.querySelector(
      '[data-technology="Rocket engine factory"]',
    )!;
    const choose = tile.querySelector<HTMLButtonElement>('button')!;
    expect(tile.querySelector('.research-node-name')!.textContent).toBe(
      'Rocket engine',
    );
    expect(tile.textContent).not.toContain('Available');
    expect(choose.getAttribute('aria-label')).toBe(
      'Inspect Rocket engine factory',
    );
    expect(choose.getAttribute('aria-description')).toBe('Available');
    expect(choose.title).toContain('Rocket engine factory');
    choose.click();
    expect(emit).toHaveBeenCalledWith({
      type: 'inspect-research',
      technology: 'Rocket engine factory',
    });
    expect(page.querySelector('.research-details h2')!.textContent).toBe(
      'Rocket engine factory',
    );
  });

  it.each(['tap', 'drag', 'cancel'] as const)(
    'research-med-ett-tryck: touch activation works without a synthetic click and cannot order after a drag or cancellation (%s)',
    (action) => {
      const model = researchStationModel({ shipFactory: true });
      const emit = vi.fn<IntentHandler>();
      const page = renderResearch(
        model.snapshot.research,
        false,
        emit,
        'Rocket engine factory',
      );
      Object.assign(page.querySelector('.research-tree-viewport')!, {
        hasPointerCapture: () => false,
        setPointerCapture: vi.fn(),
        releasePointerCapture: vi.fn(),
      });
      const choose = page.querySelector<HTMLButtonElement>(
        '[aria-label="Research Rocket engine factory"]',
      )!;
      const pointer = (type: string, x = 30) => {
        const event = new MouseEvent(type, {
          bubbles: true,
          clientX: x,
          clientY: 30,
        });
        Object.defineProperties(event, {
          pointerType: { value: 'touch' },
          pointerId: { value: 1 },
          isPrimary: { value: true },
        });
        choose.dispatchEvent(event);
      };
      pointer('pointerdown');
      if (action === 'drag') pointer('pointermove', 60);
      if (action === 'cancel') pointer('pointercancel');
      pointer('pointerup', action === 'drag' ? 60 : 30);
      const orders = () =>
        emit.mock.calls.filter(([intent]) => intent.type === 'research');
      expect(orders()).toHaveLength(action === 'tap' ? 1 : 0);
      choose.dispatchEvent(
        new MouseEvent('click', { bubbles: true, detail: 1 }),
      );
      expect(orders()).toHaveLength(action === 'tap' ? 1 : 0);
    },
  );

  it.each(['mouse', 'touch'])(
    'research-med-ett-tryck: the first button press after panning queues once (%s)',
    (pointerType) => {
      const model = researchStationModel({ shipFactory: true });
      const emit = vi.fn<IntentHandler>();
      const page = renderResearch(
        model.snapshot.research,
        false,
        emit,
        'Rocket engine factory',
      );
      const viewport = page.querySelector<HTMLElement>(
        '.research-tree-viewport',
      )!;
      Object.assign(viewport, {
        hasPointerCapture: () => false,
        setPointerCapture: vi.fn(),
        releasePointerCapture: vi.fn(),
      });
      const pointer = (target: Element, type: string, x: number) => {
        const event = new Event(type, { bubbles: true });
        Object.defineProperties(event, {
          button: { value: 0 },
          pointerId: { value: 1 },
          clientX: { value: x },
          clientY: { value: 30 },
          pointerType: { value: pointerType },
        });
        target.dispatchEvent(event);
      };
      pointer(viewport, 'pointerdown', 30);
      pointer(viewport, 'pointermove', 70);
      pointer(viewport, 'pointerup', 70);
      const choose = page.querySelector<HTMLButtonElement>(
        '[aria-label="Research Rocket engine factory"]',
      )!;
      emit.mockClear();
      pointer(choose, 'pointerdown', 70);
      pointer(choose, 'pointerup', 70);
      choose.dispatchEvent(
        new MouseEvent('click', { bubbles: true, detail: 1 }),
      );
      expect(
        emit.mock.calls.filter(([intent]) => intent.type === 'research'),
      ).toEqual([[{ type: 'research', technology: 'Rocket engine factory' }]]);
    },
  );

  it('inga-hexkoordinater: legacy event coordinates stay readable without changing saved text', () => {
    expect(gameText('Home Fleet arrived at HEX -3,12.')).toBe(
      'Home Fleet arrived at selected location.',
    );
    expect(gameText('Tellus · 2 wrecks')).toBe('Tellus · 2 wrecks');
  });

  it('colony-ship-efter-rocket-engine: reveals Colony ship after engines without requiring exploration or telescopes', () => {
    const model = researchStationModel({ shipFactory: true });
    model.research('Colony ship factory');
    expect(model.snapshot.research.queue).toEqual([
      'Rocket engine factory',
      'Colony ship factory',
    ]);
    expect(
      isResearchIdentified(
        {
          ...model.snapshot.research,
          queue: [],
          completed: ['Rocket engine factory'],
        },
        'Colony ship factory',
      ),
    ).toBe(true);
  });

  it('forskningsdetaljer-vid-val: only the selected technology has details and an explicit Research action outside the tree', () => {
    const model = researchStationModel({ shipFactory: true });
    const emit = vi.fn();
    const page = renderResearch(
      model.snapshot.research,
      false,
      emit,
      'Rocket engine factory',
    );
    // forskningsflikar: the details are the Selected tab below the tree.
    const details = page.querySelector(
      '.research-panel > .research-bottom > .research-details',
    )!;
    const rocket = page.querySelector(
      '[data-technology="Rocket engine factory"]',
    )!;
    expect(rocket.querySelector('.research-node-details')).toBeNull();
    expect(details.textContent).toContain('Rocket engine factory');
    expect(details.textContent).toContain('Produces Rocket engines');
    // forskningstid: Rocket engine factory has no prerequisites.
    expect(details.textContent).toContain('Research time: 1 round');
    expect(details.textContent).toContain('Requires:');
    expect(page.querySelectorAll('.research-node-details')).toHaveLength(1);
    details
      .querySelector<HTMLButtonElement>(
        '[aria-label="Research Rocket engine factory"]',
      )!
      .click();
    expect(emit).toHaveBeenCalledWith({
      type: 'research',
      technology: 'Rocket engine factory',
    });
    const unknown = page.querySelector('[data-technology="Fighter factory"]')!;
    expect(unknown.textContent).not.toContain('Fighter');
    expect(unknown.querySelector('.research-node-details')).toBeNull();
  });

  it('forskningsdetaljer-vid-val: keeps an empty selection area and hides the name and action of unknown research', () => {
    const research = researchStationModel({ shipFactory: true }).snapshot
      .research;
    const empty = renderResearch(research, false, vi.fn());
    expect(empty.querySelector('.research-details')!.textContent).toContain(
      'Select a technology',
    );
    expect(empty.querySelectorAll('.research-node-details')).toHaveLength(0);
    const unknown = renderResearch(research, false, vi.fn(), 'Fighter factory');
    const details = unknown.querySelector('.research-details')!;
    expect(details.textContent).toContain('Unknown technology');
    expect(details.textContent).not.toContain('Fighter');
    expect(details.querySelector('button')).toBeNull();
  });
});

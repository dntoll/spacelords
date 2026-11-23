// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { researchStationModel } from '../../fixtures/research-station-model.js';
import { renderResearch } from '../../../src/client/space-map/views/research/ResearchView.js';
import { gameText } from '../../../src/client/space-map/views/turn/GameText.js';
import type { IntentHandler } from '../../../src/client/app/views/ViewContracts.js';

describe('kompakt-spelgranssnitt', () => {
  it('forskningsstatus-med-tydliga-farger: reserves the completion marker for researched technology while retaining queue and unknown states', () => {
    const initial = researchStationModel().snapshot.research;
    const research = {
      ...initial,
      completed: ['Missiles', 'Armor'] as const,
      queue: ['Armored Transport', 'Armored Fighter'] as const,
    };
    const check = (
      page: HTMLElement,
      rows: readonly (readonly [string, string, string | null, string])[],
    ) => {
      for (const [type, state, marker, description] of rows) {
        const node = page.querySelector(`[data-technology="${type}"]`)!;
        expect(node.getAttribute('data-state')).toBe(state);
        expect(
          node.querySelector('.research-node-marker')?.textContent ?? null,
        ).toBe(marker);
        expect(
          node.querySelector('button')!.getAttribute('aria-description'),
        ).toBe(description);
      }
    };
    check(renderResearch(research, false, vi.fn(), 'Missiles'), [
      ['Missiles', 'completed', '✓', 'Researched'],
      ['Armored Transport', 'active', '▶', 'Researching'],
      ['Armored Fighter', 'queued', '2', 'Queued · 2'],
    ]);
    const fresh = renderResearch(initial, false, vi.fn());
    check(fresh, [
      ['Missiles', 'available', null, 'Available'],
      ['Armored Fighter', 'locked', null, 'Undiscovered'],
    ]);
    expect(
      fresh.querySelector(
        '[data-technology="Armored Fighter"] .research-node-name',
      )!.textContent,
    ).toBe('Unknown');
  });
  it('kompakt-forskningstrad: names the tile and exposes status without a visible status row', () => {
    const model = researchStationModel();
    const emit = vi.fn();
    const page = renderResearch(
      model.snapshot.research,
      false,
      emit,
      'Missiles',
    );
    const tile = page.querySelector('[data-technology="Missiles"]')!;
    const choose = tile.querySelector<HTMLButtonElement>('button')!;
    expect(tile.querySelector('.research-node-name')!.textContent).toBe(
      'Missiles',
    );
    expect(tile.textContent).not.toContain('Available');
    expect(choose.getAttribute('aria-label')).toBe('Inspect Missiles');
    expect(choose.getAttribute('aria-description')).toBe('Available');
    expect(choose.title).toContain('Missiles');
    choose.click();
    expect(emit).toHaveBeenCalledWith({
      type: 'inspect-research',
      technology: 'Missiles',
    });
    expect(page.querySelector('.research-details h2')!.textContent).toBe(
      'Missiles',
    );
  });

  it.each(['tap', 'drag', 'cancel'] as const)(
    'research-med-ett-tryck: touch activation works without a synthetic click and cannot order after a drag or cancellation (%s)',
    (action) => {
      const model = researchStationModel();
      const emit = vi.fn<IntentHandler>();
      const page = renderResearch(
        model.snapshot.research,
        false,
        emit,
        'Missiles',
      );
      Object.assign(page.querySelector('.research-tree-viewport')!, {
        hasPointerCapture: () => false,
        setPointerCapture: vi.fn(),
        releasePointerCapture: vi.fn(),
      });
      const choose = page.querySelector<HTMLButtonElement>(
        '[aria-label="Research Missiles"]',
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
      const model = researchStationModel();
      const emit = vi.fn<IntentHandler>();
      const page = renderResearch(
        model.snapshot.research,
        false,
        emit,
        'Missiles',
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
        '[aria-label="Research Missiles"]',
      )!;
      emit.mockClear();
      pointer(choose, 'pointerdown', 70);
      pointer(choose, 'pointerup', 70);
      choose.dispatchEvent(
        new MouseEvent('click', { bubbles: true, detail: 1 }),
      );
      expect(
        emit.mock.calls.filter(([intent]) => intent.type === 'research'),
      ).toEqual([[{ type: 'research', technology: 'Missiles' }]]);
    },
  );

  it('inga-hexkoordinater: legacy event coordinates stay readable without changing saved text', () => {
    expect(gameText('Home Fleet arrived at HEX -3,12.')).toBe(
      'Home Fleet arrived.',
    );
    expect(gameText('Combat at HEX 8,-3: Home Fleet versus Space pirate.')).toBe(
      'Combat: Home Fleet versus Space pirate.',
    );
    expect(gameText('Planet discovered: Brontes at selected location.')).toBe(
      'Planet discovered: Brontes.',
    );
    expect(gameText('Tellus · 2 wrecks')).toBe('Tellus · 2 wrecks');
  });

  it('forskningsdetaljer-vid-val: only the selected technology has details and an explicit Research action outside the tree', () => {
    const model = researchStationModel();
    const emit = vi.fn();
    const page = renderResearch(
      model.snapshot.research,
      false,
      emit,
      'Missiles',
    );
    // forskningsflikar: the details are the Selected tab below the tree.
    const details = page.querySelector(
      '.research-panel > .research-bottom > .research-details',
    )!;
    const missiles = page.querySelector('[data-technology="Missiles"]')!;
    expect(missiles.querySelector('.research-node-details')).toBeNull();
    expect(details.textContent).toContain('Missiles');
    expect(details.textContent).toContain('two missile salvos');
    // forskningstid: Missiles has no prerequisites.
    expect(details.textContent).toContain('Research time: 1 round');
    expect(details.textContent).toContain('Requires:');
    expect(page.querySelectorAll('.research-node-details')).toHaveLength(1);
    details
      .querySelector<HTMLButtonElement>('[aria-label="Research Missiles"]')!
      .click();
    expect(emit).toHaveBeenCalledWith({
      type: 'research',
      technology: 'Missiles',
    });
    const unknown = page.querySelector('[data-technology="Armored Fighter"]')!;
    expect(unknown.textContent).not.toContain('Armored');
    expect(unknown.querySelector('.research-node-details')).toBeNull();
  });

  it('forskningsdetaljer-vid-val: keeps an empty selection area and hides the name and action of unknown research', () => {
    const research = researchStationModel().snapshot.research;
    const empty = renderResearch(research, false, vi.fn());
    expect(empty.querySelector('.research-details')!.textContent).toContain(
      'Select a technology',
    );
    expect(empty.querySelectorAll('.research-node-details')).toHaveLength(0);
    const unknown = renderResearch(research, false, vi.fn(), 'Armored Fighter');
    const details = unknown.querySelector('.research-details')!;
    expect(details.textContent).toContain('Unknown technology');
    expect(details.textContent).not.toContain('Armored');
    expect(details.querySelector('button')).toBeNull();
  });
});

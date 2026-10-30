// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { researchStationModel } from '../fixtures/research-station.js';
import { AppView } from '../../src/client/views/AppView.js';
import { renderDecisionGuidance } from '../../src/client/views/DecisionGuidanceView.js';
import { renderProductionMapPanel } from '../../src/client/views/ProductionMapView.js';
import { renderResearch } from '../../src/client/views/ResearchView.js';
import { isResearchIdentified } from '../../src/client/models/ResearchTree.js';
import { gameText } from '../../src/client/views/GameText.js';
import type { IntentHandler } from '../../src/client/views/ViewContracts.js';

describe('kompakt-spelgranssnitt', () => {
  it('kompakt-forskningstrad: shortens only tile titles and exposes status without a visible status row', () => {
    const model = researchStationModel();
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
      const model = researchStationModel();
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
      const model = researchStationModel();
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

  it('korta-beslutsinstruktioner: retains the decision and action without repetitive instructions', () => {
    const model = researchStationModel();
    for (const open of [
      () => model.openProduction(),
      () => model.openFleets(),
      () => model.openResearch(),
    ]) {
      open();
      const guidance = renderDecisionGuidance(model.snapshot, vi.fn())!;
      for (const row of guidance.querySelectorAll('.decision-guidance-row')) {
        const label =
          row
            .querySelector('button')
            ?.getAttribute('aria-label')
            ?.replace('Show decision: ', '') ?? 'Choose research';
        expect(row.querySelector('p')!.textContent).toBe(`${label}.`);
      }
    }
  });

  it('produktionsdetaljer-utan-upprepning / forsorjningskedja-utan-rubrik: retains costs and orders while omitting repeated counts and explanatory headings', () => {
    const model = researchStationModel();
    model.openProduction();
    model.selectMapProductionOption('Research station');
    const panel = renderProductionMapPanel(model.snapshot, vi.fn());
    expect(panel.querySelector('.map-build-details')!.textContent).toContain(
      'Iron',
    );
    expect(panel.querySelector('.production-presence-detail')).toBeNull();
    expect(panel.textContent).not.toMatch(
      /All your planets|On this planet:|Queued locally:|Map highlights:|Supply chain/,
    );
    model.build('Iron mine');
    model.selectMapProject(model.snapshot.planet!.projects[0]!.id);
    const queue = renderProductionMapPanel(model.snapshot, vi.fn());
    expect(queue.querySelector('.map-supply-chain')).not.toBeNull();
    expect(queue.querySelector('.map-supply-chain h3')).toBeNull();
    expect(queue.textContent).not.toContain('Map highlights:');
  });

  it('inga-hexkoordinater: legacy event coordinates stay readable without changing saved text', () => {
    expect(gameText('Home Fleet arrived at HEX -3,12.')).toBe(
      'Home Fleet arrived at selected location.',
    );
    expect(gameText('Tellus · 2 wrecks')).toBe('Tellus · 2 wrecks');
  });

  it('flyttmal-pa-kartan / inga-hexkoordinater / uppmarksamhet-vid-titel: movement uses the map and the header warning disappears when attention is resolved', () => {
    const model = researchStationModel();
    model.openFleets();
    model.selectMapFleet('fleet-home');
    model.beginDestination('fleet-home');
    const root = document.createElement('div');
    const view = new AppView(root, () => ({ render() {}, dispose() {} }));
    view.render(model.snapshot);
    expect(root.querySelector('[aria-label="Destination hex"]')).toBeNull();
    expect(root.querySelector('.coordinate-label')).toBeNull();
    expect(root.textContent).not.toMatch(/Choose destination hex|HEX -?\d/);
    expect(
      root.querySelector('.app-header .map-attention-legend')?.textContent,
    ).toBe('! Needs attention');
    view.render({
      ...model.snapshot,
      attentionScreens: [],
      decisions: [],
      mapProblems: [],
    });
    expect(root.querySelector('.map-attention-legend')).toBeNull();
    view.dispose();
  });

  it('colony-ship-efter-rocket-engine: reveals Colony ship after engines without requiring exploration or telescopes', () => {
    const model = researchStationModel();
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
    const model = researchStationModel();
    const emit = vi.fn();
    const page = renderResearch(
      model.snapshot.research,
      false,
      emit,
      'Rocket engine factory',
    );
    const details = page.querySelector('.research-panel > .research-details')!;
    const rocket = page.querySelector(
      '[data-technology="Rocket engine factory"]',
    )!;
    expect(rocket.querySelector('.research-node-details')).toBeNull();
    expect(details.textContent).toContain('Rocket engine factory');
    expect(details.textContent).toContain('Produces Rocket engines');
    expect(details.textContent).toContain('1 research point');
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
    const research = researchStationModel().snapshot.research;
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

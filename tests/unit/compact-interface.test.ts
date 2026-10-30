// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { researchStationModel } from '../fixtures/research-station.js';
import { AppView } from '../../src/client/views/AppView.js';
import { renderDecisionGuidance } from '../../src/client/views/DecisionGuidanceView.js';
import { renderProductionMapPanel } from '../../src/client/views/ProductionMapView.js';
import { renderResearch } from '../../src/client/views/ResearchView.js';
import { isResearchIdentified } from '../../src/client/models/ResearchTree.js';
import { gameText } from '../../src/client/views/GameText.js';

describe('kompakt-spelgranssnitt', () => {
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

  it('forskningsdetaljer-vid-val: information and the explicit Research action live in the tree without revealing unknown technology', () => {
    const model = researchStationModel();
    const emit = vi.fn();
    const page = renderResearch(
      model.snapshot.research,
      false,
      emit,
      'Rocket engine factory',
    );
    expect(
      page.querySelector('.research-panel > .research-details'),
    ).toBeNull();
    const rocket = page.querySelector(
      '[data-technology="Rocket engine factory"]',
    )!;
    expect(rocket.textContent).toContain('Produces Rocket engines');
    expect(rocket.textContent).toContain('1 research point');
    expect(rocket.textContent).toContain('Requires:');
    rocket
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
});

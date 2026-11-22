// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { MasterController } from '../../../src/client/app/controllers/MasterController.js';
import { AppView } from '../../../src/client/app/views/AppView.js';
import { TECHNOLOGIES } from '../../../src/client/space-map/models/research/Research.js';
import { renderResearch } from '../../../src/client/space-map/views/research/ResearchView.js';
import { researchStationModel } from '../../fixtures/research-station-model.js';

// inga-overflodiga-navigeringsknappar: screens offer no buttons back to the
// map or to screens the main navigation already reaches.
const REDUNDANT = [
  'Back to map',
  'Open research',
  'Build a Research station',
  'Open in Production',
];

function mount(model: AppModel) {
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  const controller = new MasterController(
    model,
    new AppView(root, () => ({ render() {}, dispose() {} })),
  );
  controller.start();
  const labels = () =>
    [...root.querySelectorAll('main button')].map(
      (button) => button.getAttribute('aria-label') ?? button.textContent ?? '',
    );
  return { root, controller, labels };
}

describe('inga-overflodiga-navigeringsknappar', () => {
  it('Research has no way back to the map besides the main navigation', () => {
    for (const model of [new AppModel(), researchStationModel()]) {
      const { controller, labels, root } = mount(model);
      model.openResearch();
      controller.start();
      expect(root.querySelector('.main-nav')).not.toBeNull();
      for (const label of REDUNDANT) expect(labels()).not.toContain(label);
      controller.dispose();
    }
  });

  it('Production links to no main navigation screen', () => {
    const model = researchStationModel();
    const { controller, labels } = mount(model);
    model.openProduction();
    controller.start();
    expect(model.snapshot.screen).toBe('production');
    for (const label of REDUNDANT) expect(labels()).not.toContain(label);
    controller.dispose();
  });
});

it('forskningstrad-utan-pilspetsar: dependency lines end without arrowheads', () => {
  const view = renderResearch(
    {
      available: TECHNOLOGIES,
      completed: [],
      selected: null,
      queue: [],
    },
    false,
    () => {},
  );
  expect(view.querySelectorAll('.research-edge').length).toBeGreaterThan(0);
  expect(view.querySelector('marker')).toBeNull();
  expect(view.querySelector('[marker-end]')).toBeNull();
});

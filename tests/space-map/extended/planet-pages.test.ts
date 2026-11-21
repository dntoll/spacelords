// @vitest-environment jsdom
import { MasterController } from '../../../src/client/app/controllers/MasterController.js';
import type { IntentHandler } from '../../../src/client/app/views/ViewContracts.js';
import { describe, expect, it, vi } from 'vitest';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { completeConstruction } from '../../fixtures/construction.js';
import { renderPlanet } from '../../../src/client/space-map/views/planet/PlanetView.js';

function setup() {
  const model = new AppModel();
  model.openPlanet();
  const emit = vi.fn();
  const render = () =>
    renderPlanet(model.snapshot.planet!, 'You', emit, model.snapshot);
  return { model, emit, render };
}

describe('planetundersidor / byggplatsrutnat / planetsida-informerar', () => {
  it('opens Overview and shows Building sites without build, upgrade or cancel actions', () => {
    const { model, render } = setup();
    expect(model.snapshot.planetTab).toBe('overview');
    expect(
      [...render().querySelectorAll('.planet-tabs button')].map(
        (tab) => tab.textContent,
      ),
    ).toEqual(['Overview', 'Building sites']);
    expect(render().querySelector('.building-site')).toBeNull();
    model.build('Research station', 2);
    model.selectPlanetTab('sites');
    const page = render();
    expect(
      page.querySelectorAll('.building-sites-grid .building-site'),
    ).toHaveLength(model.snapshot.planet!.potentialBuildSlots);
    expect(page.querySelector('[data-site-index="2"] h3')?.textContent).toBe(
      'Research station',
    );
    const labels = [...page.querySelectorAll('button')].map(
      (control) => control.textContent ?? '',
    );
    for (const removed of [
      'Build building',
      'Build dome',
      'Cancel construction',
      'Cancel upgrade',
    ])
      expect(labels).not.toContain(removed);
    expect(labels.some((label) => label.startsWith('Upgrade to'))).toBe(false);
    expect(page.textContent).toContain(
      'Build, upgrade and cancel construction in Factories.',
    );
  });

  it('keeps Demolish for completed buildings', () => {
    const { model, emit, render } = setup();
    model.build('Research station', 2);
    completeConstruction(model, 'Research station');
    model.openPlanet();
    model.selectPlanetTab('sites');
    const building = model.snapshot.planet!.buildings[0]!;
    const demolish = [...render().querySelectorAll('button')].find(
      (control) => control.textContent === 'Demolish',
    )!;
    demolish.click();
    expect(emit).toHaveBeenCalledWith({
      type: 'toggle-demolition',
      id: building.id,
    });
  });
});

it('planetundersidor / sparat-spel: browsing planet pages never writes a saved game', () => {
  const save = vi.fn();
  const model = new AppModel(undefined, { load: () => null, save, clear() {} });
  model.startSlot(1);
  model.openPlanet();
  let emit: IntentHandler = () => {};
  const controller = new MasterController(model, {
    bind(handler) {
      emit = handler;
    },
    render() {},
    dispose() {},
  });
  controller.start();
  save.mockClear();
  emit({ type: 'planet-tab', tab: 'sites' });
  emit({ type: 'planet-tab', tab: 'overview' });
  expect(save).not.toHaveBeenCalled();
});

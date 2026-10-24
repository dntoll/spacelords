// @vitest-environment jsdom
import { AppController } from '../../src/client/controllers/AppController.js';
import type { IntentHandler } from '../../src/client/views/ViewContracts.js';
import { describe, expect, it, vi } from 'vitest';
import { AppModel } from '../../src/client/models/AppModel.js';
import { renderPlanet } from '../../src/client/views/PlanetView.js';
import { compactProjectGroups } from '../../src/client/views/PlanetProductionView.js';
import type { ConstructionProjectSnapshot } from '../../src/client/models/Game.js';

const project = (
  id: string,
  type: 'Fighter' | 'Rocket engine' = 'Fighter',
  destinationFleetId: string | null = null,
): ConstructionProjectSnapshot => ({
  id,
  type,
  destinationFleetId,
  slotIndex: null,
  factoryId: 'yard',
  blockedReason: null,
});
function setup() {
  const model = new AppModel();
  model.openPlanet();
  const emit = vi.fn();
  const render = () =>
    renderPlanet(
      model.snapshot.planet!,
      'You',
      emit,
      model.snapshot.fleets,
      model.snapshot,
    );
  return { model, emit, render };
}
describe('planetundersidor / byggplatsrutnat', () => {
  it('opens Overview, separates sites, and returns building selection to the chosen site', () => {
    const { model, render } = setup();
    expect(model.snapshot.planetTab).toBe('overview');
    expect(render().querySelector('.building-site')).toBeNull();
    model.selectPlanetTab('sites');
    expect(
      render().querySelectorAll('.building-sites-grid .building-site'),
    ).toHaveLength(model.snapshot.planet!.potentialBuildSlots);
    expect(render().querySelector('.factory-order')).toBeNull();
    model.openBuildSite(2);
    model.build('Research station', 2);
    expect(model.snapshot.planetTab).toBe('sites');
    expect(model.snapshot.returnSite).toBe(2);
    model.selectPlanetTab('queue');
    expect(render().querySelectorAll('.queue-order')).toHaveLength(1);
    expect(model.snapshot.projectSupply[0]?.projectId).toBe(
      model.snapshot.planet!.projects[0]?.id,
    );
  });
});
describe('planetgemensamt-produktval', () => {
  it('offers one product for duplicate factories and emits an order without selecting a factory', () => {
    const { model, emit } = setup();
    const planet = model.snapshot.planet!;
    const factories = [0, 1].map((slotIndex) => ({
      id: `yard-${slotIndex}`,
      type: 'Fighter factory' as const,
      slotIndex,
      scheduledForDemolition: false,
      operational: true,
    }));
    const view = renderPlanet(
      { ...planet, buildings: factories },
      'You',
      emit,
      model.snapshot.fleets,
      { ...model.snapshot, planetTab: 'production' },
    );
    expect(
      view.querySelectorAll('[aria-label="Production product"] option'),
    ).toHaveLength(1);
    view
      .querySelector<HTMLButtonElement>('[aria-label="Queue Fighter"]')!
      .click();
    expect(emit).toHaveBeenCalledWith({
      type: 'queue-ship',
      ship: 'Fighter',
      fleetId: null,
    });
    expect(view.querySelector('.building-site')).toBeNull();
  });
  it('preserves category, product and destination across orders and disables demolished capabilities', () => {
    const { model, emit } = setup();
    model.selectProduction('Components', 'Rocket engine');
    model.selectProductionFleet('fleet-home');
    expect(model.snapshot.productionProduct).toBe('Rocket engine');
    expect(model.snapshot.productionFleetId).toBe('fleet-home');
    const planet = model.snapshot.planet!;
    const view = renderPlanet(
      {
        ...planet,
        buildings: [
          {
            id: 'engine',
            type: 'Rocket engine factory',
            slotIndex: 0,
            scheduledForDemolition: true,
          },
        ],
      },
      'You',
      emit,
      [],
      { ...model.snapshot, planetTab: 'production' },
    );
    expect(
      view.querySelector<HTMLButtonElement>(
        '[aria-label="Queue Rocket engine"]',
      )?.disabled,
    ).toBe(true);
  });
});
describe('kompakt-produktionsko', () => {
  it('groups only adjacent compatible projects and links to their actual queue position', () => {
    const projects = [
      project('a'),
      project('b'),
      project('c', 'Rocket engine'),
      project('d'),
      project('e', 'Fighter', 'fleet-home'),
    ];
    expect(
      compactProjectGroups(projects).map((group) => group.map((p) => p.id)),
    ).toEqual([['a', 'b'], ['c'], ['d'], ['e']]);
    const { model, emit } = setup();
    const view = renderPlanet(
      { ...model.snapshot.planet!, projects },
      'You',
      emit,
      [],
      { ...model.snapshot, planetTab: 'production' },
    );
    const button = view.querySelector<HTMLButtonElement>(
      '.compact-queue-item',
    )!;
    expect(button.textContent).toContain('1–2. Fighter ×2');
    button.click();
    expect(emit).toHaveBeenCalledWith({
      type: 'open-planet-project',
      planetId: model.snapshot.planet!.id,
      projectId: 'a',
    });
    expect(projects.map((p) => p.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
});

it('planetundersidor / sparat-spel: browsing pages, products and supply steps never writes a saved game', () => {
  const save = vi.fn();
  const model = new AppModel(undefined, { load: () => null, save, clear() {} });
  model.startSlot(1);
  model.openPlanet();
  model.build('Research station', 0);
  const planet = model.snapshot.planet!;
  let emit: IntentHandler = () => {};
  const controller = new AppController(model, {
    bind(handler) {
      emit = handler;
    },
    render() {},
    dispose() {},
  });
  controller.start();
  save.mockClear();
  emit({ type: 'planet-tab', tab: 'production' });
  emit({
    type: 'production-selection',
    category: 'Components',
    product: 'Rocket engine',
  });
  emit({ type: 'production-fleet', id: 'fleet-home' });
  emit({
    type: 'open-planet-project',
    planetId: planet.id,
    projectId: planet.projects[0]!.id,
  });
  emit({ type: 'project-supply', id: planet.projects[0]!.id, open: false });
  expect(save).not.toHaveBeenCalled();
});

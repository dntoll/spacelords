// @vitest-environment jsdom
import { AppView } from '../../src/client/views/AppView.js';
import { AppController } from '../../src/client/controllers/AppController.js';
import type { IntentHandler } from '../../src/client/views/ViewContracts.js';
import { describe, expect, it, vi } from 'vitest';
import { AppModel } from '../../src/client/models/AppModel.js';
import { renderBuildSelection } from '../../src/client/views/BuildSelectionView.js';
import { renderPlanet } from '../../src/client/views/PlanetView.js';
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
      {
        ...model.snapshot,
        planetTab: 'production',
        productionProduct: 'Fighter',
      },
    );
    expect(
      view.querySelectorAll('[aria-label="Product list"] .catalog-item'),
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
  it('dragbara-koer: shows one row per project and links to its actual queue position', () => {
    const projects = [
      project('a'),
      project('b'),
      project('c', 'Rocket engine'),
      project('d'),
      project('e', 'Fighter', 'fleet-home'),
    ];
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
    expect(view.querySelectorAll('.queue-item')).toHaveLength(5);
    expect(button.textContent).toContain('1. Fighter');
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
  emit({ type: 'building-category', category: 'Resources' });
  emit({ type: 'building-selection', building: 'Iron mine' });
  emit({ type: 'build-search', query: 'Iron' });
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

describe('byggkategorier / symbolbaserade-kataloger', () => {
  it('filters building types by category and search, with symbol-only named category buttons', () => {
    const { model, emit } = setup();
    model.openBuildSite(0);
    const snapshot = model.snapshot;
    const options = [
      'Research station',
      'Iron mine',
      'Fighter factory',
      'Rocket engine factory',
    ] as const;
    const render = (
      buildingCategory: typeof snapshot.buildingCategory,
      buildSearch = '',
    ) =>
      renderBuildSelection(
        {
          ...snapshot,
          buildingCategory,
          buildSearch,
          planet: {
            ...snapshot.planet!,
            buildOptions: options.map((type) => ({
              type,
              blockedReason: null,
            })),
          },
        },
        emit,
      );
    const ships = render('Shipyards');
    expect(
      [
        ...ships.querySelectorAll('.catalog-item-button > span:first-of-type'),
      ].map((item) => item.textContent),
    ).toEqual(['Fighter factory']);
    const categories =
      ships.querySelectorAll<HTMLButtonElement>('.catalog-category');
    for (const category of categories) {
      expect(category.textContent).toBe('');
      expect(category.getAttribute('aria-label')).toBe(category.title);
      expect(category.querySelector('svg')?.getAttribute('aria-hidden')).toBe(
        'true',
      );
    }
    ships
      .querySelector<HTMLButtonElement>('[aria-label="Components"]')!
      .click();
    expect(emit).toHaveBeenCalledWith({
      type: 'building-category',
      category: 'Components',
    });
    expect(
      render('Resources', 'finite').querySelector(
        '.catalog-item-button > span:first-of-type',
      )?.textContent,
    ).toBe('Iron mine');
    expect(
      render('Research', 'Fighter').querySelector('.empty-results'),
    ).not.toBeNull();
  });
  it('keeps compact building rows free of order controls until selected and then shows full information', () => {
    const { model, emit } = setup();
    model.openBuildSite(0);
    const initial = renderBuildSelection(model.snapshot, emit);
    const choice = initial.querySelector<HTMLButtonElement>(
      '[aria-label="Show Research station"]',
    )!;
    expect(choice.querySelector('span')?.textContent).toBe('Research station');
    expect(choice.querySelector('.catalog-icon')).not.toBeNull();
    expect(initial.querySelector('.catalog-details')).toBeNull();
    choice.click();
    expect(emit).toHaveBeenCalledExactlyOnceWith({
      type: 'building-selection',
      building: 'Research station',
    });
    model.selectBuilding('Research station');
    const details = renderBuildSelection(model.snapshot, emit).querySelector(
      '.catalog-details',
    )!;
    expect(details.textContent).toContain('Contributes one research point');
    expect(details.textContent).toContain('600 workers');
    expect(details.textContent).toContain('Already built');
    expect(
      details.querySelector('[aria-label="Build Research station"]'),
    ).not.toBeNull();
    model.selectBuildingCategory('Resources');
    expect(model.snapshot.selectedBuilding).toBeNull();
    expect(
      renderBuildSelection(model.snapshot, emit).querySelector(
        '.catalog-details',
      ),
    ).toBeNull();
  });
  it('shows product details only on selection and preserves the separate compact queue', () => {
    const { model, emit } = setup();
    const planet = {
      ...model.snapshot.planet!,
      buildings: [
        {
          id: 'fighter',
          type: 'Fighter factory' as const,
          slotIndex: 0,
          scheduledForDemolition: false,
        },
      ],
    };
    const render = (productionProduct: string | null) =>
      renderPlanet(planet, 'You', emit, [], {
        ...model.snapshot,
        planetTab: 'production',
        productionProduct,
      });
    const initial = render(null);
    expect(initial.querySelectorAll('select')).toHaveLength(0);
    expect(initial.querySelector('.catalog-details')).toBeNull();
    const choice = initial.querySelector<HTMLButtonElement>(
      '[aria-label="Show Fighter"]',
    )!;
    expect(choice.textContent).toBe('Fighter');
    expect(choice.querySelector('svg')).not.toBeNull();
    choice.click();
    expect(emit).toHaveBeenCalledExactlyOnceWith({
      type: 'production-selection',
      category: 'Ships',
      product: 'Fighter',
    });
    const selected = render('Fighter');
    const details = selected.querySelector('.catalog-details')!;
    expect(details.textContent).toContain('Speed 3 hexes/year');
    expect(details.textContent).toContain('50 crew');
    expect(details.textContent).toContain('Rocket engine');
    expect(details.textContent).toContain('Weapons module');
    expect(selected.querySelector('.compact-build-queue')).not.toBeNull();
    expect(
      details.querySelector('[aria-label="Queue Fighter"]'),
    ).not.toBeNull();
  });
});

it('symbolbaserade-kataloger: keeps keyboard focus on a category that shares a name with main navigation', () => {
  const { model } = setup();
  model.openBuildSite(0);
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  const controller = new AppController(
    model,
    new AppView(root, () => ({ render() {}, dispose() {} })),
  );
  controller.start();
  const category = root.querySelector<HTMLButtonElement>(
    '.catalog-categories [aria-label="Research"]',
  )!;
  category.focus();
  category.click();
  expect(model.snapshot.buildingCategory).toBe('Research');
  expect(document.activeElement).toBe(
    root.querySelector('.catalog-categories [aria-label="Research"]'),
  );
  controller.dispose();
});

it('symbolbaserade-kataloger: returns focus to the list when a browser does not focus a clicked Back button', () => {
  const { model } = setup();
  model.openBuildSite(0);
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  const controller = new AppController(
    model,
    new AppView(root, () => ({ render() {}, dispose() {} })),
  );
  controller.start();
  root
    .querySelector<HTMLButtonElement>('[aria-label="Show Research station"]')!
    .click();
  expect(document.activeElement).toBe(
    root.querySelector('.catalog-details h2'),
  );
  (document.activeElement as HTMLElement).blur();
  root
    .querySelector<HTMLButtonElement>('[aria-label="Back to buildings"]')!
    .click();
  expect(document.activeElement).toBe(
    root.querySelector('[aria-label="Show Research station"]'),
  );
  controller.dispose();
});

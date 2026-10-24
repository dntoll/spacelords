import type { AppReadModel } from '../models/AppModel.js';
import { BUILDINGS, type BuildType } from '../models/Game.js';
import type { IntentHandler } from './ViewContracts.js';
import { buildingImage } from './BuildingImage.js';
import {
  BUILDING_CATEGORIES,
  buildingCategory,
  categoryButtons,
  catalogItem,
  catalogHeading,
} from './CatalogControls.js';
import { button, element, labelValue } from './dom.js';

export function renderBuildSelection(
  model: AppReadModel,
  emit: IntentHandler,
): HTMLElement {
  const planet = model.planet!;
  const page = element('section', 'planet-page build-selection-page');
  const header = element('div', 'screen-header');
  header.append(
    element('h1', '', 'Build selection'),
    button(
      'Back to Building sites',
      () => emit({ type: 'build-site', index: null }),
      'back-button',
    ),
  );
  const toolbar = element('div', 'build-toolbar');
  const label = element('label', 'build-search-label', 'Search buildings');
  const search = element('input');
  search.type = 'search';
  search.value = model.buildSearch;
  search.placeholder = 'Name or description';
  search.addEventListener('input', () =>
    emit({ type: 'build-search', query: search.value }),
  );
  label.append(search);
  toolbar.append(
    element(
      'p',
      '',
      `${planet.name} · Site ${(model.constructionSite ?? 0) + 1}`,
    ),
    label,
  );
  const grid = element(
    'section',
    'planet-content building-menu catalog-browser',
  );
  const categories = BUILDING_CATEGORIES.filter(
    (category) =>
      category === 'All' ||
      planet.buildOptions.some(
        (option) =>
          !BUILDINGS[option.type].sitePreparation &&
          buildingCategory(option.type) === category,
      ),
  );
  toolbar.append(
    categoryButtons(
      'Building categories',
      categories,
      model.buildingCategory,
      (category) => emit({ type: 'building-category', category }),
    ),
  );
  const list = element('ul', 'catalog-list');
  list.setAttribute('aria-label', 'Building list');
  grid.append(list);
  grid.setAttribute('aria-label', 'Available buildings');
  const query = model.buildSearch.trim().toLowerCase();
  const options = planet.buildOptions.filter((option) => {
    const definition = BUILDINGS[option.type];
    return (
      !definition.sitePreparation &&
      (model.buildingCategory === 'All' ||
        buildingCategory(option.type) === model.buildingCategory) &&
      `${option.type} ${definition.description}`.toLowerCase().includes(query)
    );
  });
  for (const option of options) {
    const item = catalogItem(
      option.type,
      `building:${option.type}`,
      model.selectedBuilding === option.type,
      () => emit({ type: 'building-selection', building: option.type }),
    );
    const { local, empireTotal } = buildingCounts(model, option.type);
    const inventory = element(
      'span',
      'building-list-inventory',
      `On ${planet.name}: ${local} · All your planets: ${empireTotal}`,
    );
    inventory.id = `building-list-counts-${list.children.length}`;
    const choice = item.querySelector('button')!;
    choice.append(inventory);
    choice.setAttribute('aria-describedby', inventory.id);
    list.append(item);
  }
  const selected = options.find(
    (option) => option.type === model.selectedBuilding,
  );
  if (selected) {
    const option = selected;
    const definition = BUILDINGS[option.type];
    const card = element('article', 'building-choice catalog-details');
    card.dataset.detailKey = `building:${option.type}`;
    card.dataset.buildingType = option.type;
    card.classList.toggle('unaffordable', !!option.blockedReason);
    card.append(
      catalogHeading(option.type),
      buildingImage(option.type),
      element('p', '', definition.description),
    );
    const inventory = element('div', 'building-inventory');
    const counts = element('dl');
    const { local, empireTotal } = buildingCounts(model, option.type);
    counts.append(
      labelValue(`On ${planet.name}`, String(local)),
      labelValue('All your planets', String(empireTotal)),
    );
    inventory.append(element('h3', '', 'Already built'), counts);
    card.append(inventory);
    const costs = element('div', 'building-costs');
    for (const resource of ['Iron', 'Water', 'Oil'] as const)
      costs.append(
        costIndicator(
          resource,
          definition.cost[resource],
          planet.budget.available[resource],
          'units at build start',
        ),
      );
    costs.append(
      costIndicator(
        'Staff',
        definition.workers,
        planet.budget.availableWorkers,
        'workers',
      ),
    );
    const order = button(`Build ${option.type}`, () =>
      emit({
        type: 'build',
        building: option.type,
        slotIndex: model.constructionSite!,
      }),
    );
    order.disabled = !!option.blockedReason || model.phase !== 'planning';
    card.append(
      costs,
      element(
        'p',
        'muted-note',
        'One shared build queue. One project completes per planet and year.',
      ),
      order,
      button(
        'Back to buildings',
        () => emit({ type: 'building-selection', building: null }),
        'button secondary-button',
      ),
    );
    if (option.blockedReason)
      card.append(element('p', 'blocked-reason', option.blockedReason));
    grid.append(card);
  } else if (!list.children.length)
    grid.append(
      element(
        'p',
        'empty-results',
        'No buildings match this category and search.',
      ),
    );
  else
    grid.append(
      element('p', 'muted-note', 'Select a building for full details.'),
    );

  page.append(header, toolbar, grid);
  return page;
}

// byggnadsantal-lokalt-och-globalt: list and details count the same completed buildings.
function buildingCounts(
  model: AppReadModel,
  type: BuildType,
): { local: number; empireTotal: number } {
  return {
    local: model.planet!.buildings.filter((building) => building.type === type)
      .length,
    empireTotal: model.ownedPlanets.reduce(
      (total, planet) =>
        total +
        planet.buildings.filter((building) => building.type === type).length,
      0,
    ),
  };
}

function costIndicator(
  label: string,
  required: number,
  available: number,
  unit: string,
): HTMLElement {
  const ok = available >= required;
  return element(
    'p',
    ok ? 'cost-ok' : 'cost-missing',
    `${label} ${required} ${unit} · Available ${available} · ${ok ? 'OK' : 'Missing'}`,
  );
}

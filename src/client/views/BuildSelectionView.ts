import type { AppReadModel } from '../models/AppModel.js';
import { BUILDINGS } from '../models/Game.js';
import type { IntentHandler } from './ViewContracts.js';
import { buildingImage } from './BuildingImage.js';
import { button, element } from './dom.js';

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
      'Back to Overview',
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
  const grid = element('section', 'planet-content building-menu');
  grid.setAttribute('aria-label', 'Available buildings');
  const query = model.buildSearch.trim().toLowerCase();
  for (const option of planet.buildOptions) {
    const definition = BUILDINGS[option.type];
    if (
      !`${option.type} ${definition.description}`.toLowerCase().includes(query)
    )
      continue;
    const card = element('article', 'building-choice');
    card.classList.toggle('unaffordable', !!option.blockedReason);
    card.append(
      buildingImage(option.type),
      element('h2', '', option.type),
      element('p', '', definition.description),
    );
    const costs = element('div', 'building-costs');
    for (const resource of ['Iron', 'Water', 'Oil'] as const)
      costs.append(
        costIndicator(
          resource,
          definition.cost[resource],
          planet.budget.available[resource],
          'units/year',
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
    card.append(costs, order);
    if (option.blockedReason)
      card.append(element('p', 'blocked-reason', option.blockedReason));
    grid.append(card);
  }
  if (!grid.children.length)
    grid.append(
      element('p', 'empty-results', 'No buildings match your search.'),
    );
  page.append(header, toolbar, grid);
  return page;
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

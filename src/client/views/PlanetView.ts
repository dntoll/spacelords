import type { PlanetTab } from '../models/AppModel.js';
import {
  BUILDINGS,
  type BuildType,
  type PlanetGameSnapshot,
  type Resource,
} from '../models/Game.js';
import type { IntentHandler } from './ViewContracts.js';
import { button, element, planetIllustration } from './dom.js';

const tabs = [
  ['overview', 'Overview'],
  ['construction', 'Construction'],
] as const;

export function renderPlanet(
  planet: PlanetGameSnapshot,
  owner: string,
  activeTab: PlanetTab,
  emit: IntentHandler,
): HTMLElement {
  const page = element('section', 'planet-page');
  const header = element('div', 'screen-header');
  header.append(
    element('h1', '', planet.name),
    button('Back to map', () => emit({ type: 'open-map' }), 'back-button'),
  );
  page.append(header);
  const navigation = element('div', 'planet-tabs');
  navigation.setAttribute('role', 'tablist');
  for (const [id, label] of tabs) {
    const tab = button(
      label,
      () => emit({ type: 'planet-tab', tab: id }),
      'tab-button',
    );
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', String(id === activeTab));
    navigation.append(tab);
  }
  const panel = element('section', `planet-content ${activeTab}`);
  panel.setAttribute('role', 'tabpanel');
  if (activeTab === 'overview')
    panel.append(overview(planet, owner), budgetPanel(planet));
  else panel.append(budgetPanel(planet), construction(planet, emit));
  page.append(navigation, panel);
  return page;
}

function overview(planet: PlanetGameSnapshot, owner: string): HTMLElement {
  const section = element('section', 'planet-overview');
  const stats = element('dl', 'planet-stats');
  for (const [label, value] of [
    ['Owner', owner],
    ['Population', planet.population.toLocaleString('en-GB')],
    ['Habitability', `${planet.habitability}%`],
    ['Buildings', String(planet.buildings.length)],
  ]) {
    const pair = element('div', 'stat');
    pair.append(
      element('dt', 'stat-label', label),
      element('dd', 'stat-value', value),
    );
    stats.append(pair);
  }
  const buildings = element('div', 'existing-buildings');
  buildings.append(element('h2', '', 'Buildings'));
  if (planet.buildings.length === 0)
    buildings.append(
      element('p', 'muted-note', 'No buildings have been completed.'),
    );
  for (const building of planet.buildings)
    buildings.append(
      element(
        'p',
        '',
        `${building.type}${building.scheduledForDemolition ? ' · demolition scheduled' : ''}`,
      ),
    );
  section.append(planetIllustration(true), stats, buildings);
  return section;
}

function budgetPanel(planet: PlanetGameSnapshot): HTMLElement {
  const section = element('section', 'budget-panel');
  section.append(element('h2', '', 'Annual budget'));
  const table = document.createElement('table');
  table.innerHTML =
    '<thead><tr><th>Category</th><th>Total</th><th>Used / Reserved</th><th>Available</th></tr></thead>';
  const body = document.createElement('tbody');
  for (const resource of ['Iron', 'Water', 'Oil'] as Resource[])
    budgetRow(
      body,
      resource,
      `${planet.budget.production[resource]} units/year`,
      `${planet.budget.reserved[resource]} units/year`,
      `${planet.budget.available[resource]} units/year`,
    );
  budgetRow(
    body,
    'Population',
    planet.budget.workers.toLocaleString('en-GB'),
    `${planet.budget.reservedWorkers.toLocaleString('en-GB')} workers · ${planet.budget.reservedCrew.toLocaleString('en-GB')} crew`,
    planet.budget.availableWorkers.toLocaleString('en-GB'),
  );
  budgetRow(
    body,
    'Build slots',
    String(planet.budget.slots),
    String(planet.budget.reservedSlots),
    String(planet.budget.availableSlots),
  );
  table.append(body);
  section.append(table);
  return section;
}

function budgetRow(
  body: HTMLTableSectionElement,
  category: string,
  total: string,
  reserved: string,
  available: string,
): void {
  const row = document.createElement('tr');
  for (const value of [category, total, reserved, available])
    row.append(element('td', '', value));
  body.append(row);
}

function construction(
  planet: PlanetGameSnapshot,
  emit: IntentHandler,
): HTMLElement {
  const box = element('section', 'building-panel');
  box.append(element('h2', '', 'Construction'));
  for (const building of planet.buildings) {
    const row = element(
      'div',
      'order-row',
      `${building.type}${building.scheduledForDemolition ? ' · demolition scheduled' : ''}`,
    );
    row.append(
      button(
        building.scheduledForDemolition ? 'Keep' : 'Demolish',
        () => emit({ type: 'toggle-demolition', id: building.id }),
        'button',
      ),
    );
    box.append(row);
  }
  for (const project of planet.projects) {
    const row = element('div', 'order-row', `${project.type} · ordered`);
    row.append(
      button(
        'Cancel',
        () => emit({ type: 'cancel-project', id: project.id }),
        'button',
      ),
    );
    box.append(row);
  }
  for (const type of Object.keys(BUILDINGS) as BuildType[]) {
    const definition = BUILDINGS[type];
    const card = element('div', 'station-card');
    card.append(
      element('h3', '', type),
      element(
        'p',
        '',
        `${definition.workers} workers · Iron ${definition.cost.Iron}, Water ${definition.cost.Water}, Oil ${definition.cost.Oil}`,
      ),
      button(
        `Build ${type}`,
        () => emit({ type: 'build', building: type }),
        'button',
      ),
    );
    box.append(card);
  }
  if (
    planet.buildings.some(
      (building) =>
        building.type === 'Fighter factory' && !building.scheduledForDemolition,
    )
  )
    box.append(
      button(
        'Produce Fighter',
        () => emit({ type: 'produce-fighter' }),
        'button',
      ),
    );
  return box;
}

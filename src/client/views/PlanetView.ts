import type { PlanetTab } from '../models/AppModel.js';
import {
  BUILDINGS,
  SHIPS,
  projectDefinition,
  type FleetSnapshot,
  type ShipType,
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
  fleets: readonly FleetSnapshot[] = [],
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
  else panel.append(budgetPanel(planet), construction(planet, emit, fleets));
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
        `${building.type}${building.scheduledForDemolition ? ' · demolition scheduled' : ''} · ${buildingUsage(building.type, building.scheduledForDemolition)}`,
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
  fleets: readonly FleetSnapshot[],
): HTMLElement {
  const box = element('section', 'building-panel');
  box.append(element('h2', '', 'Construction'));
  for (const building of planet.buildings) {
    const row = element(
      'div',
      'order-row',
      `${building.type}${building.scheduledForDemolition ? ' · demolition scheduled' : ''} · ${buildingUsage(building.type, building.scheduledForDemolition)}`,
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
  box.append(element('h2', '', 'Build queue'));
  box.append(
    element(
      'p',
      'muted-note',
      'One project per year. Drag orders or use Move up / Move down. Only the first project reserves annual resources and workers.',
    ),
  );
  if (!planet.projects.length)
    box.append(element('p', 'muted-note', 'The build queue is empty.'));
  planet.projects.forEach((project, index) => {
    const row = element('div', 'order-row queue-order');
    row.dataset.projectId = project.id;
    row.draggable = true;
    row.addEventListener('dragstart', (event) => {
      event.dataTransfer?.setData('text/plain', project.id);
    });
    row.addEventListener('dragover', (event) => event.preventDefault());
    row.addEventListener('drop', (event) => {
      event.preventDefault();
      const id = event.dataTransfer?.getData('text/plain');
      if (id && planet.projects.some((candidate) => candidate.id === id))
        emit({ type: 'move-project', id, index });
    });
    const details = element('div', 'queue-details');
    details.append(
      element(
        'p',
        '',
        `${index + 1}. ${project.type} · ${index === 0 ? 'next' : 'queued'}`,
      ),
    );
    if (project.blockedReason)
      details.append(
        element('p', 'muted-note', `Waiting: ${project.blockedReason}`),
      );
    if (projectDefinition(project.type).ship) {
      const select = fleetSelect(planet, fleets, project.destinationFleetId);
      select.addEventListener('change', () =>
        emit({
          type: 'project-fleet',
          id: project.id,
          fleetId: select.value || null,
        }),
      );
      details.append(select);
    }
    const actions = element('div', 'queue-actions');
    for (const [label, offset] of [
      ['Move up', -1],
      ['Move down', 1],
    ] as const) {
      const move = button(
        label,
        () =>
          emit({ type: 'move-project', id: project.id, index: index + offset }),
        'button',
      );
      move.disabled =
        index + offset < 0 || index + offset >= planet.projects.length;
      move.setAttribute(
        'aria-label',
        `${label}: ${project.type}, position ${index + 1}`,
      );
      actions.append(move);
    }
    actions.append(
      button(
        'Cancel',
        () => emit({ type: 'cancel-project', id: project.id }),
        'button',
      ),
    );
    row.append(details, actions);
    box.append(row);
  });
  box.append(element('h2', '', 'Buildings'));
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
  box.append(element('h2', '', 'Ships'));
  for (const ship of Object.keys(SHIPS) as ShipType[]) {
    const definition = projectDefinition(ship);
    const card = element('div', 'station-card');
    const select = fleetSelect(planet, fleets, null);
    select.setAttribute('aria-label', `Destination fleet for ${ship}`);
    card.append(
      element('h3', '', ship),
      element(
        'p',
        '',
        `${definition.workers} workers · ${definition.crew} crew · Iron ${definition.cost.Iron}, Water ${definition.cost.Water}, Oil ${definition.cost.Oil}`,
      ),
      ...(ship === 'Fighter'
        ? [
            element(
              'p',
              'muted-note',
              'Requires a completed Fighter factory. Its annual upkeep covers production.',
            ),
          ]
        : []),
      select,
      button(
        `Queue ${ship}`,
        () => emit({ type: 'queue-ship', ship, fleetId: select.value || null }),
        'button',
      ),
    );
    box.append(card);
  }
  return box;
}

function buildingUsage(type: BuildType, demolition: boolean): string {
  const definition = BUILDINGS[type];
  if (demolition) return 'No resources or workers reserved';
  return `Uses Iron ${definition.cost.Iron}, Water ${definition.cost.Water}, Oil ${definition.cost.Oil} units/year · ${definition.workers} workers`;
}

function fleetSelect(
  planet: PlanetGameSnapshot,
  fleets: readonly FleetSnapshot[],
  selected: string | null,
): HTMLSelectElement {
  const select = element('select');
  select.setAttribute('aria-label', 'Destination fleet');
  const home = element('option', '', 'Planet home fleet (default)');
  home.value = '';
  select.append(home);
  for (const fleet of fleets.filter(
    (fleet) => fleet.position.key === planet.position.key,
  )) {
    const option = element('option', '', fleet.name);
    option.value = fleet.id;
    select.append(option);
  }
  select.value = [...select.options].some((option) => option.value === selected)
    ? selected!
    : '';
  return select;
}

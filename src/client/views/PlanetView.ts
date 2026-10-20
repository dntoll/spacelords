import type { AppReadModel } from '../models/AppModel.js';
import {
  BUILDINGS,
  type BuildingSnapshot,
  type ConstructionProjectSnapshot,
  projectDefinition,
  type FleetSnapshot,
  type BuildType,
  type PlanetGameSnapshot,
  type Resource,
} from '../models/Game.js';
import { COMPONENTS } from '../models/Economy.js';
import type { IntentHandler } from './ViewContracts.js';
import { button, element, planetIllustration, queueButton } from './dom.js';
import { buildingImage } from './BuildingImage.js';

export function renderPlanet(
  planet: PlanetGameSnapshot,
  owner: string,
  emit: IntentHandler,
  fleets: readonly FleetSnapshot[] = [],
  menus: Pick<AppReadModel, 'phase'> = {
    phase: 'planning',
  },
): HTMLElement {
  const page = element('section', 'planet-page');
  const header = element('div', 'screen-header');
  header.append(
    element('h1', '', planet.name),
    button('Back to map', () => emit({ type: 'open-map' }), 'back-button'),
  );
  page.append(header);
  const panel = element('section', 'planet-content overview');
  panel.setAttribute('aria-label', 'Overview');
  const summary = element('div', 'planet-summary');
  summary.append(overview(planet, owner), budgetPanel(planet));
  panel.append(summary, construction(planet, emit, fleets, menus));
  page.append(panel);
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
  section.append(planetIllustration(true), stats);
  return section;
}

function budgetPanel(planet: PlanetGameSnapshot): HTMLElement {
  const section = element('section', 'budget-panel');
  section.append(element('h2', '', 'Resources'));
  const table = document.createElement('table');
  table.innerHTML =
    '<thead><tr><th>Category</th><th>Total</th><th>Used / Reserved</th><th>Available</th></tr></thead>';
  const body = document.createElement('tbody');
  for (const resource of ['Iron', 'Water', 'Oil'] as Resource[]) {
    const total = planet.economy.stock[resource];
    const used = planet.economy.demand[resource];
    const available = planet.economy.incoming[resource];
    const row = element('div', 'resource-budget');
    row.dataset.resource = resource;
    row.append(element('h3', '', resource));
    const values = element('div', 'budget-values');
    values.append(
      element(
        'span',
        'budget-total-label',
        `Stored ${total} · Extracting ${planet.economy.extraction[resource]}/year`,
      ),
      element(
        'span',
        'budget-used-label',
        `Demand ${used} · Deposit ${planet.economy.deposits[resource]}`,
      ),
      element('span', 'budget-available-label', `Incoming ${available}`),
    );
    const bar = element('div', 'budget-bar');
    bar.setAttribute('role', 'img');
    bar.setAttribute(
      'aria-label',
      `${resource}: Stored ${total}, Demand ${used}, Incoming ${available}, Deposit ${planet.economy.deposits[resource]}`,
    );
    for (const [name, value] of [
      ['used', used],
      ['available', available],
    ] as const) {
      const segment = element('span', `budget-${name}`);
      segment.style.width = `${total > 0 ? Math.max(0, Math.min(100, (value / total) * 100)) : 0}%`;
      bar.append(segment);
    }
    row.append(values, bar);
    section.append(row);
  }
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
  section.append(element('h3', '', 'Components'));
  for (const component of COMPONENTS) {
    const row = element(
      'p',
      'component-stock',
      `${component}: Stored ${planet.economy.stock[component]} · Demand ${planet.economy.demand[component]} · Incoming ${planet.economy.incoming[component]}`,
    );
    row.dataset.component = component;
    section.append(row);
  }
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
  menus: Pick<AppReadModel, 'phase'>,
): HTMLElement {
  const box = element('section', 'building-panel');
  const queue = element('section', 'planet-building-queue');
  queue.setAttribute('aria-label', 'Planet build queue');
  queue.append(
    element('h2', '', 'Build queue'),
    element(
      'p',
      'muted-note',
      'One shared queue for buildings, components and ships. One project completes per year.',
    ),
  );
  const list = element('ol', 'queue-slots');
  for (const [index, project] of planet.projects.entries()) {
    const row = element('li', 'order-row queue-order');
    renderQueueOrder(
      row,
      project,
      index,
      planet.projects,
      planet,
      fleets,
      emit,
      menus.phase !== 'planning',
    );
    list.append(row);
  }
  queue.append(list);
  if (!planet.projects.length)
    queue.append(
      element(
        'p',
        'muted-note',
        'No production queued. Choose a building site or order from a factory below.',
      ),
    );
  box.append(queue);
  box.append(element('h2', '', 'Building sites'));
  for (const site of planet.sites) {
    const card = element('article', 'building-site');
    card.setAttribute('aria-label', `Building site ${site.index + 1}`);
    card.dataset.siteIndex = String(site.index);
    card.tabIndex = -1;
    const details = element('div', 'site-details');
    const actions = element('div', 'site-actions');
    details.append(element('span', 'site-number', `SITE ${site.index + 1}`));
    if (site.building) {
      const building = site.building;
      const definition = BUILDINGS[building.type];
      details.append(
        buildingImage(building.type),
        element('h3', '', building.type),
        element(
          'p',
          'site-status',
          building.scheduledForDemolition
            ? 'Demolition scheduled'
            : building.operational === false
              ? 'Waiting for workers'
              : 'Operational',
        ),
        element('p', '', definition.description),
        element(
          'p',
          'muted-note',
          buildingUsage(building.type, building.scheduledForDemolition),
        ),
      );
      const demolish = button(
        building.scheduledForDemolition ? 'Keep' : 'Demolish',
        () => emit({ type: 'toggle-demolition', id: building.id }),
        'button secondary-button destructive-button',
      );
      demolish.disabled = menus.phase !== 'planning';
      actions.append(demolish);
      if (definition.ship || definition.component) {
        card.classList.add('factory-site');
        card.append(
          factoryProduction(
            planet,
            building,
            fleets,
            emit,
            menus.phase !== 'planning' || building.scheduledForDemolition,
          ),
        );
      }
    } else if (site.project) {
      details.append(
        buildingImage(site.project.type as BuildType),
        element('h3', '', site.project.type),
        element(
          'p',
          'muted-note',
          planet.projects[0]?.id === site.project.id
            ? 'Next building · completes when materials and workers are available'
            : 'Queued building',
        ),
      );
      if (site.project.blockedReason)
        details.append(element('p', 'muted-note', site.project.blockedReason));
      const cancel = button(
        'Cancel construction',
        () => emit({ type: 'cancel-project', id: site.project!.id }),
        'button secondary-button',
      );
      cancel.disabled = menus.phase !== 'planning';
      actions.append(cancel);
    } else {
      card.classList.add('empty-site');
      details.append(element('h3', '', 'Empty site'));
      const build = button(
        'Build building',
        () =>
          emit({
            type: 'build-site',
            index: site.index,
          }),
        'button',
      );
      build.setAttribute(
        'aria-label',
        `Build building at site ${site.index + 1}`,
      );

      build.disabled = menus.phase !== 'planning';
      actions.prepend(build);
    }
    details.append(actions);
    card.prepend(details);
    box.append(card);
  }
  if (!planet.sites.length)
    box.append(
      element('p', 'muted-note', 'This planet has no building sites.'),
    );
  return box;
}

function costText(cost: {
  readonly Iron: number;
  readonly Water: number;
  readonly Oil: number;
}): string {
  return `Iron ${cost.Iron}, Water ${cost.Water}, Oil ${cost.Oil}`;
}

function factoryProduction(
  planet: PlanetGameSnapshot,
  building: BuildingSnapshot,
  fleets: readonly FleetSnapshot[],
  emit: IntentHandler,
  locked: boolean,
): HTMLElement {
  const section = element('section', 'factory-production');
  section.setAttribute(
    'aria-label',
    `Production at site ${building.slotIndex + 1}`,
  );
  section.append(factoryOrder(planet, building, fleets, emit, locked));
  return section;
}

// gemensam-planetko: factories expose capabilities, never independent queues.
function factoryOrder(
  planet: PlanetGameSnapshot,
  building: BuildingSnapshot,
  fleets: readonly FleetSnapshot[],
  emit: IntentHandler,
  locked: boolean,
): HTMLElement {
  const factory = BUILDINGS[building.type];
  const product = (factory.ship ?? factory.component)!;
  const definition = projectDefinition(product);
  const order = element('div', 'factory-order');
  order.setAttribute('role', 'group');
  order.setAttribute(
    'aria-label',
    `Production order at site ${building.slotIndex + 1}`,
  );
  const reason = building.scheduledForDemolition
    ? 'Factory is scheduled for demolition.'
    : locked
      ? 'Orders are locked during simulation.'
      : null;
  const select = fleetSelect(planet, fleets, null);
  select.setAttribute('aria-label', `Destination fleet for ${product}`);
  select.disabled = !!reason;
  const destination = element('label', 'factory-destination');
  destination.append(element('span', '', 'Destination fleet'), select);
  const queue = button(`Queue ${product}`, () =>
    factory.ship
      ? emit({
          type: 'queue-ship',
          ship: factory.ship,
          fleetId: select.value || null,
          factoryId: building.id,
        })
      : emit({ type: 'queue-component', component: factory.component! }),
  );
  queue.disabled = !!reason;
  const actions = element('div', 'factory-order-actions');
  if (factory.ship) actions.append(destination);
  actions.append(queue);
  order.append(
    element(
      'p',
      'muted-note',
      `${costText(definition.cost)} per ${factory.ship ? 'ship' : 'component'}${factory.ship ? ` · ${definition.crew} crew` : ''}`,
    ),
    actions,
  );
  if (definition.parts)
    order.append(
      element(
        'p',
        'muted-note',
        `Requires ${Object.entries(definition.parts)
          .map(([part, count]) => `${count} ${part}`)
          .join(
            ', ',
          )}. Missing parts are queued first when local factories are available.`,
      ),
    );
  if (reason) {
    const status = element('p', 'muted-note', reason);
    status.setAttribute('role', 'status');
    order.append(status);
  }
  return order;
}

function renderQueueOrder(
  row: HTMLElement,
  project: ConstructionProjectSnapshot,
  index: number,
  projects: readonly ConstructionProjectSnapshot[],
  planet: PlanetGameSnapshot,
  fleets: readonly FleetSnapshot[],
  emit: IntentHandler,
  locked: boolean,
): void {
  row.dataset.projectId = project.id;
  row.draggable = !locked;
  row.addEventListener('dragstart', (event) =>
    event.dataTransfer?.setData('text/plain', project.id),
  );
  row.addEventListener('dragover', (event) => event.preventDefault());
  row.addEventListener('drop', (event) => {
    event.preventDefault();
    const id = event.dataTransfer?.getData('text/plain');
    if (!locked && id && projects.some((p) => p.id === id))
      emit({ type: 'move-project', id, index });
  });
  const details = element('div', 'queue-details');
  details.append(
    element(
      'p',
      '',
      `${index + 1}. ${project.type} · ${index === 0 ? 'next' : 'queued'}${project.slotIndex !== null ? ` · Site ${project.slotIndex + 1}` : ''}`,
    ),
  );
  if (project.blockedReason)
    details.append(element('p', 'muted-note', project.blockedReason));
  if (projectDefinition(project.type).ship) {
    const select = fleetSelect(planet, fleets, project.destinationFleetId);
    select.disabled = locked;
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
  for (const [symbol, label, offset] of [
    ['↑', 'Move up', -1],
    ['↓', 'Move down', 1],
  ] as const) {
    const move = queueButton(
      symbol,
      `${label}: ${project.type}, position ${index + 1}`,
      () =>
        emit({ type: 'move-project', id: project.id, index: index + offset }),
    );
    move.disabled =
      locked || index + offset < 0 || index + offset >= projects.length;
    actions.append(move);
  }
  const cancel = queueButton(
    '×',
    `Cancel: ${project.type}, position ${index + 1}`,
    () => emit({ type: 'cancel-project', id: project.id }),
  );
  cancel.disabled = locked;
  actions.append(cancel);
  row.append(details, actions);
}

function buildingUsage(type: BuildType, demolition: boolean): string {
  const definition = BUILDINGS[type];
  if (demolition) return 'Workers released when demolished';
  return `${definition.workers} workers · No recurring material cost`;
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
    (fleet) => !fleet.position || fleet.position.key === planet.position.key,
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

import type { AppReadModel } from '../models/AppModel.js';
import {
  BUILDINGS,
  QUEUE_CAPACITY,
  type BuildingSnapshot,
  type ConstructionProjectSnapshot,
  projectDefinition,
  type FleetSnapshot,
  type BuildType,
  type PlanetGameSnapshot,
  type Resource,
} from '../models/Game.js';
import type { IntentHandler } from './ViewContracts.js';
import { button, element, planetIllustration } from './dom.js';
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
  section.append(element('h2', '', 'Annual budget'));
  const table = document.createElement('table');
  table.innerHTML =
    '<thead><tr><th>Category</th><th>Total</th><th>Used / Reserved</th><th>Available</th></tr></thead>';
  const body = document.createElement('tbody');
  for (const resource of ['Iron', 'Water', 'Oil'] as Resource[]) {
    const total = planet.budget.production[resource];
    const used = planet.budget.reserved[resource];
    const available = planet.budget.available[resource];
    const row = element('div', 'resource-budget');
    row.dataset.resource = resource;
    row.append(element('h3', '', resource));
    const values = element('div', 'budget-values');
    values.append(
      element('span', 'budget-total-label', `Total ${total} units/year`),
      element('span', 'budget-used-label', `Used / Reserved ${used}`),
      element('span', 'budget-available-label', `Available ${available}`),
    );
    const bar = element('div', 'budget-bar');
    bar.setAttribute('role', 'img');
    bar.setAttribute(
      'aria-label',
      `${resource}: Total ${total}, Used / Reserved ${used}, Available ${available} units/year`,
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
      if (definition.ship) {
        card.classList.add('factory-site');
        card.append(
          factoryQueue(
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
          'Under construction · completes at the end of the year',
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

function factoryQueue(
  planet: PlanetGameSnapshot,
  building: BuildingSnapshot,
  fleets: readonly FleetSnapshot[],
  emit: IntentHandler,
  locked: boolean,
): HTMLElement {
  const section = element('section', 'factory-queue');
  section.setAttribute(
    'aria-label',
    `Build queue at site ${building.slotIndex + 1}`,
  );
  section.append(
    factoryOrder(planet, building, fleets, emit, locked),
    element(
      'h4',
      '',
      `Build queue · ${building.queue.length}/${QUEUE_CAPACITY}`,
    ),
  );
  const list = element('ol', 'queue-slots');
  for (let index = 0; index < QUEUE_CAPACITY; index += 1) {
    const project = building.queue[index];
    const row = element(
      'li',
      project ? 'order-row queue-order' : 'empty-queue-slot',
    );
    if (!project) row.append(element('span', 'muted-note', 'Empty queue slot'));
    else
      renderQueueOrder(
        row,
        project,
        index,
        building,
        planet,
        fleets,
        emit,
        locked,
      );
    list.append(row);
  }
  section.append(list);
  return section;
}

// fabrikskoer: ordering stays above its own factory queue, including when locked.
function factoryOrder(
  planet: PlanetGameSnapshot,
  building: BuildingSnapshot,
  fleets: readonly FleetSnapshot[],
  emit: IntentHandler,
  locked: boolean,
): HTMLElement {
  const ship = BUILDINGS[building.type].ship!;
  const definition = projectDefinition(ship);
  const order = element('div', 'factory-order');
  order.setAttribute('role', 'group');
  order.setAttribute(
    'aria-label',
    `Ship order at site ${building.slotIndex + 1}`,
  );
  const reason = building.scheduledForDemolition
    ? 'Shipyard is scheduled for demolition.'
    : locked
      ? 'Orders are locked during simulation.'
      : building.queue.length >= QUEUE_CAPACITY
        ? 'Queue full (5 orders).'
        : null;
  const select = fleetSelect(planet, fleets, null);
  select.setAttribute('aria-label', `Destination fleet for ${ship}`);
  select.disabled = !!reason;
  const destination = element('label', 'factory-destination');
  destination.append(element('span', '', 'Destination fleet'), select);
  const queue = button(`Queue ${ship}`, () =>
    emit({
      type: 'queue-ship',
      ship,
      fleetId: select.value || null,
      factoryId: building.id,
    }),
  );
  queue.disabled = !!reason;
  const actions = element('div', 'factory-order-actions');
  actions.append(destination, queue);
  order.append(
    element(
      'p',
      'muted-note',
      `${costText(definition.cost)} per ship · ${definition.crew} crew`,
    ),
    actions,
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
  building: BuildingSnapshot,
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
    if (!locked && id && building.queue.some((p) => p.id === id))
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
      locked || index + offset < 0 || index + offset >= building.queue.length;
    move.setAttribute(
      'aria-label',
      `${label}: ${project.type}, position ${index + 1}`,
    );
    actions.append(move);
  }
  const cancel = button(
    'Cancel',
    () => emit({ type: 'cancel-project', id: project.id }),
    'button',
  );
  cancel.disabled = locked;
  actions.append(cancel);
  row.append(details, actions);
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

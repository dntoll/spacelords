import type { AppReadModel, PlanetTab } from '../models/AppModel.js';
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
  menus: Pick<AppReadModel, 'constructionSite' | 'shipyardId' | 'phase'> = {
    constructionSite: null,
    shipyardId: null,
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
  else
    panel.append(
      budgetPanel(planet),
      construction(planet, emit, fleets, menus),
    );
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
  menus: Pick<AppReadModel, 'constructionSite' | 'shipyardId' | 'phase'>,
): HTMLElement {
  const box = element('section', 'building-panel');
  box.append(element('h2', '', 'Building sites'));
  for (const site of planet.sites) {
    const card = element('article', 'building-site');
    card.setAttribute('aria-label', `Building site ${site.index + 1}`);
    card.dataset.siteIndex = String(site.index);
    card.append(element('span', 'site-number', `SITE ${site.index + 1}`));
    if (site.building) {
      const building = site.building;
      const definition = BUILDINGS[building.type];
      card.append(
        element('h3', '', building.type),
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
        'button destructive-button',
      );
      demolish.disabled = menus.phase !== 'planning';
      card.append(demolish);
      if (definition.ship) {
        const build = button(
          'Build',
          () =>
            emit({
              type: 'shipyard-menu',
              id: menus.shipyardId === building.id ? null : building.id,
            }),
          'button',
        );
        build.setAttribute(
          'aria-label',
          `Build ships at site ${site.index + 1}`,
        );
        build.setAttribute(
          'aria-expanded',
          String(menus.shipyardId === building.id),
        );
        build.disabled =
          building.scheduledForDemolition ||
          menus.phase !== 'planning' ||
          building.queue.length >= QUEUE_CAPACITY;
        card.append(build);
        if (
          menus.shipyardId === building.id &&
          !building.scheduledForDemolition
        ) {
          const ship = definition.ship;
          const shipDefinition = projectDefinition(ship);
          const select = fleetSelect(planet, fleets, null);
          select.setAttribute('aria-label', `Destination fleet for ${ship}`);
          const queue = button(
            `Queue ${ship}`,
            () =>
              emit({
                type: 'queue-ship',
                ship,
                fleetId: select.value || null,
                factoryId: building.id,
              }),
            'button',
          );
          queue.disabled =
            building.queue.length >= QUEUE_CAPACITY ||
            menus.phase !== 'planning';
          card.append(
            element(
              'p',
              'muted-note',
              `${costText(shipDefinition.cost)} per ship · ${shipDefinition.crew} crew`,
            ),
            select,
            queue,
          );
        }
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
      card.append(
        element('h3', '', site.project.type),
        element(
          'p',
          'muted-note',
          'Under construction · completes at the end of the year',
        ),
      );
      if (site.project.blockedReason)
        card.append(element('p', 'muted-note', site.project.blockedReason));
      const cancel = button(
        'Cancel construction',
        () => emit({ type: 'cancel-project', id: site.project!.id }),
        'button',
      );
      cancel.disabled = menus.phase !== 'planning';
      card.append(cancel);
    } else {
      card.classList.add('empty-site');
      card.append(element('h3', '', 'Empty site'));
      const build = button(
        'Build building',
        () =>
          emit({
            type: 'build-site',
            index: menus.constructionSite === site.index ? null : site.index,
          }),
        'button',
      );
      build.setAttribute(
        'aria-label',
        `Build building at site ${site.index + 1}`,
      );
      build.setAttribute(
        'aria-expanded',
        String(menus.constructionSite === site.index),
      );
      build.disabled = menus.phase !== 'planning';
      card.append(build);
      if (menus.constructionSite === site.index) {
        const menu = element('section', 'building-menu');
        menu.setAttribute('aria-label', 'Available buildings');
        for (const option of planet.buildOptions) {
          const definition = BUILDINGS[option.type];
          const choice = element('article', 'building-choice');
          choice.classList.toggle('unaffordable', !!option.blockedReason);
          const image = element('div', 'building-placeholder', 'Image pending');
          image.setAttribute('role', 'img');
          image.setAttribute('aria-label', `${option.type} image placeholder`);
          const order = button(
            `Build ${option.type}`,
            () =>
              emit({
                type: 'build',
                building: option.type,
                slotIndex: site.index,
              }),
            'button',
          );
          order.disabled = !!option.blockedReason;
          choice.append(
            image,
            element('h4', '', option.type),
            element('p', '', definition.description),
            element(
              'p',
              'muted-note',
              `${costText(definition.cost)} units/year · ${definition.workers} workers`,
            ),
            order,
          );
          if (option.blockedReason)
            choice.append(element('p', 'muted-note', option.blockedReason));
          menu.append(choice);
        }
        menu.append(
          button(
            'Close building menu',
            () => emit({ type: 'build-site', index: null }),
            'back-button',
          ),
        );
        card.append(menu);
      }
    }
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

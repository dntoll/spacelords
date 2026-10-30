import type { AppReadModel } from '../models/AppModel.js';
import {
  BUILDINGS,
  type ConstructionProjectSnapshot,
  projectDefinition,
  type FleetSnapshot,
  type BuildType,
  type PlanetGameSnapshot,
  type Resource,
} from '../models/Game.js';
import { COMPONENTS } from '../models/Economy.js';
import type { SupplyStep } from '../models/ProjectSupply.js';
import { renderProduction, fleetSelect } from './PlanetProductionView.js';
import type { IntentHandler } from './ViewContracts.js';
import { button, element, planetIllustration, queueButton } from './dom.js';
import { buildingImage } from './BuildingImage.js';
import { bindQueueOrder, decorateQueueRow } from './QueueView.js';
import { catalogIcon } from './CatalogControls.js';

type PlanetMenus = Pick<AppReadModel, 'phase'> &
  Partial<
    Pick<
      AppReadModel,
      | 'planetTab'
      | 'productionCategory'
      | 'productionProduct'
      | 'productionFleetId'
      | 'expandedProjectIds'
      | 'projectSupply'
      | 'shipyards'
    >
  >;

export function renderPlanet(
  planet: PlanetGameSnapshot,
  owner: string,
  emit: IntentHandler,
  fleets: readonly FleetSnapshot[] = [],
  menus: PlanetMenus = {
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
  const tab = menus.planetTab ?? 'overview';
  const tabs = element('nav', 'planet-tabs');
  tabs.setAttribute('aria-label', 'Planet pages');
  for (const [id, label] of [
    ['overview', 'Overview'],
    ['sites', 'Building sites'],
    ['queue', 'Build queue'],
    ['production', 'Production'],
  ] as const) {
    const control = button(
      label,
      () => emit({ type: 'planet-tab', tab: id }),
      'button secondary-button',
    );
    control.setAttribute('aria-current', String(id === tab ? 'page' : 'false'));
    tabs.append(control);
  }
  page.append(tabs);
  for (const yard of menus.shipyards?.filter(
    (yard) => yard.planetId === planet.id,
  ) ?? [])
    page.append(
      button(
        yard.destroyed
          ? 'Shipyard station destroyed — inspect and rebuild'
          : `Inspect orbital shipyard · ${yard.queue.length} wrecks`,
        () => emit({ type: 'select-salvage', id: yard.id }),
      ),
    );
  const panel = element('section', 'planet-content overview');
  panel.dataset.planetTab = tab;
  panel.setAttribute(
    'aria-label',
    {
      overview: 'Overview',
      sites: 'Building sites',
      queue: 'Build queue',
      production: 'Production',
    }[tab],
  );
  if (tab === 'overview') {
    const summary = element('div', 'planet-summary');
    summary.append(overview(planet, owner), budgetPanel(planet));
    panel.append(summary);
    const inventory = element('section', 'planet-building-inventory');
    inventory.append(element('h2', '', 'Buildings'));
    const counts = new Map<string, number>();
    for (const building of planet.buildings)
      counts.set(building.type, (counts.get(building.type) ?? 0) + 1);
    for (const [type, count] of counts) {
      const row = element('p', 'planet-building-count');
      row.append(catalogIcon(type), element('span', '', `${type} ×${count}`));
      inventory.append(row);
    }
    if (!counts.size)
      inventory.append(element('p', 'muted-note', 'No buildings yet.'));
    panel.append(inventory);
  } else if (tab === 'production')
    panel.append(renderProduction(planet, fleets, emit, menus));
  else if (tab === 'queue')
    panel.append(buildQueue(planet, emit, fleets, menus));
  else panel.append(buildingSites(planet, emit, menus));
  page.append(panel);
  return page;
}

function overview(planet: PlanetGameSnapshot, owner: string): HTMLElement {
  const section = element('section', 'planet-overview');
  const stats = element('dl', 'planet-stats');
  for (const [label, value] of [
    ['Owner', owner],
    ['Type', planet.environment],
    [
      'Population',
      `${planet.population.toLocaleString('en-GB')} / ${planet.populationCapacity.toLocaleString('en-GB')}`,
    ],
    ['Atmosphere', planet.breathable ? 'Breathable' : 'Unbreathable'],
    ['Build slots', `${planet.buildSlots} / ${planet.potentialBuildSlots}`],
    ['Habitability', `${planet.habitability}%`],
    ['Detection range', `${planet.detectionRange ?? 1} hex`],
    ['Buildings', String(planet.buildings.length)],
  ]) {
    const pair = element('div', 'stat');
    pair.append(
      element('dt', 'stat-label', label),
      element('dd', 'stat-value', value),
    );
    stats.append(pair);
  }
  section.append(planetIllustration(true, planet.environment), stats);
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

function buildQueue(
  planet: PlanetGameSnapshot,
  emit: IntentHandler,
  fleets: readonly FleetSnapshot[],
  menus: PlanetMenus,
): HTMLElement {
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
  bindQueueOrder(
    list,
    planet.projects.map((project) => project.id),
    (id, index) => emit({ type: 'move-project', id, index }),
    menus.phase !== 'planning',
  );
  for (const [index, project] of planet.projects.entries()) {
    const row = element('li', 'order-row queue-order');
    renderQueueOrder(
      row,
      project,
      index,
      planet,
      fleets,
      emit,
      menus.phase !== 'planning',
    );
    const supply = menus.projectSupply?.find(
      (item) => item.projectId === project.id,
    );
    if (supply) {
      const details = element('details', 'project-supply');
      details.open =
        menus.expandedProjectIds?.includes(project.id) ?? index === 0;
      const summary = element('summary', '', 'Supply chain');
      summary.setAttribute(
        'aria-label',
        `Supply chain: ${project.type}, position ${index + 1}`,
      );
      details.append(summary, supplySteps(supply.requirements, emit));
      const renderedOpen = details.open;
      details.addEventListener('toggle', () => {
        if (details.isConnected && details.open !== renderedOpen)
          emit({ type: 'project-supply', id: project.id, open: details.open });
      });
      row.append(details);
    }
    list.append(row);
  }
  queue.append(list);
  if (!planet.projects.length)
    queue.append(
      element(
        'p',
        'muted-note',
        'No production queued. Choose a building in Building sites or a product in Production.',
      ),
    );
  return queue;
}

function buildingSites(
  planet: PlanetGameSnapshot,
  emit: IntentHandler,
  menus: PlanetMenus,
): HTMLElement {
  const box = element('section', 'building-panel');
  const grid = element('div', 'building-sites-grid');
  box.append(element('h2', '', 'Building sites'), grid);
  for (const site of planet.sites) {
    const card = element('article', 'building-site');
    card.setAttribute('aria-label', `Building site ${site.index + 1}`);
    card.dataset.siteIndex = String(site.index);
    card.tabIndex = -1;
    const details = element('div', 'site-details');
    const actions = element('div', 'site-actions');
    details.append(element('span', 'site-number', `SITE ${site.index + 1}`));
    if (site.hasDome) details.append(element('span', 'pill', 'Dome ready'));
    if (site.locked) {
      card.classList.add('locked-site');
      details.append(
        element('h3', '', 'Locked site'),
        element(
          'p',
          'muted-note',
          `Requires ${site.requiredHabitability}% habitability`,
        ),
      );
    } else if (site.building) {
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
      if (site.domeRequired && !site.hasDome) {
        details.append(
          element(
            'p',
            'muted-note',
            'A Dome is required before this site can be used.',
          ),
        );
        const dome = button('Build dome', () => {
          if (site.domeType)
            emit({
              type: 'build',
              building: site.domeType,
              slotIndex: site.index,
            });
        });
        dome.setAttribute('aria-label', `Build dome at site ${site.index + 1}`);
        dome.disabled = menus.phase !== 'planning' || !!site.domeBlockedReason;
        actions.append(dome);
        if (site.domeType)
          details.append(
            element(
              'p',
              'muted-note',
              `${site.domeType} · ${costText(BUILDINGS[site.domeType].cost)} · No permanent workers`,
            ),
          );
        if (site.domeBlockedReason)
          details.append(
            element('p', 'blocked-reason', site.domeBlockedReason),
          );
      }
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

      build.disabled =
        menus.phase !== 'planning' || (site.domeRequired && !site.hasDome);
      actions.prepend(build);
    }
    details.append(actions);
    card.prepend(details);
    grid.append(card);
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

function renderQueueOrder(
  row: HTMLElement,
  project: ConstructionProjectSnapshot,
  index: number,
  planet: PlanetGameSnapshot,
  fleets: readonly FleetSnapshot[],
  emit: IntentHandler,
  locked: boolean,
): void {
  row.dataset.projectId = project.id;
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
  if (
    projectDefinition(project.type).ship &&
    project.type !== 'Civilian shuttle'
  ) {
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
  const cancel = queueButton(
    '×',
    `Cancel: ${project.type}, position ${index + 1}`,
    () => emit({ type: 'cancel-project', id: project.id }),
  );
  cancel.disabled = locked;
  actions.append(cancel);
  row.append(details, actions);
  decorateQueueRow(
    row,
    project.id,
    `${project.type}, position ${index + 1}`,
    locked,
  );
}

function buildingUsage(type: BuildType, demolition: boolean): string {
  const definition = BUILDINGS[type];
  if (demolition) return 'Workers released when demolished';
  return `${definition.workers} workers · No recurring material cost`;
}

function supplySteps(
  steps: readonly SupplyStep[],
  emit: IntentHandler,
): HTMLOListElement {
  const list = element('ol', 'supply-steps');
  for (const step of steps) {
    const item = element('li', 'supply-step');
    item.append(element('span', '', `${step.label} · ${step.status}`));
    const links = element('div', 'supply-step-links');
    if (step.projectId && step.planetId)
      links.append(
        button(
          'View production',
          () =>
            emit({
              type: 'open-planet-project',
              planetId: step.planetId!,
              projectId: step.projectId!,
            }),
          'button secondary-button',
        ),
      );
    else if (step.planetId)
      links.append(
        button(
          'Open planet',
          () => emit({ type: 'open-planet', id: step.planetId! }),
          'button secondary-button',
        ),
      );
    if (step.routeId)
      links.append(
        button(
          'View route',
          () => emit({ type: 'supply-open-route', id: step.routeId! }),
          'button secondary-button',
        ),
      );
    if (step.fleetId)
      links.append(
        button(
          'View fleet',
          () => emit({ type: 'open-fleet', id: step.fleetId! }),
          'button secondary-button',
        ),
      );
    item.append(links);
    if (step.children.length) item.append(supplySteps(step.children, emit));
    list.append(item);
  }
  return list;
}

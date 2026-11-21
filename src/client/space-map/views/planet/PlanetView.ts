import type { AppReadModel } from '../../../app/models/AppModel.js';
import {
  BUILDINGS,
  type BuildType,
  type PlanetGameSnapshot,
  type Resource,
} from '../../models/Game.js';
import { COMPONENTS } from '../../models/Economy.js';
import type { IntentHandler } from '../../../app/views/ViewContracts.js';
import { button, element } from '../../../common/dom.js';
import { planetIllustration } from '../PlanetImages.js';
import { buildingImage } from '../BuildingImage.js';
import { catalogIcon } from '../CatalogControls.js';

type PlanetMenus = Pick<AppReadModel, 'phase'> &
  Partial<Pick<AppReadModel, 'planetTab' | 'shipyards'>>;

export function renderPlanet(
  planet: PlanetGameSnapshot,
  owner: string,
  emit: IntentHandler,
  menus: PlanetMenus = {
    phase: 'planning',
  },
): HTMLElement {
  const page = element('section', 'planet-page');
  const header = element('div', 'screen-header');
  // inga-overflodiga-navigeringsknappar: the main navigation leads back.
  header.append(element('h1', '', planet.name));
  page.append(header);
  const tab = menus.planetTab ?? 'overview';
  const tabs = element('nav', 'planet-tabs');
  tabs.setAttribute('aria-label', 'Planet pages');
  for (const [id, label] of [
    ['overview', 'Overview'],
    ['sites', 'Building sites'],
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
  } else panel.append(buildingSites(planet, emit, menus));
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
        `Stored ${total} · Extracting ${planet.economy.extraction[resource]}/round`,
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

function buildingSites(
  planet: PlanetGameSnapshot,
  emit: IntentHandler,
  menus: PlanetMenus,
): HTMLElement {
  const box = element('section', 'building-panel');
  const grid = element('div', 'building-sites-grid');
  // planetsida-informerar: building, upgrades and cancelling live in Factories.
  box.append(
    element('h2', '', 'Building sites'),
    element(
      'p',
      'muted-note',
      'Build, upgrade and cancel construction in Factories.',
    ),
    grid,
  );
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
      const upgradeProject =
        site.project?.upgradeBuildingId === building.id ? site.project : null;
      if (upgradeProject)
        details.append(
          element('p', 'muted-note', `Upgrade queued: ${upgradeProject.type}`),
        );
      demolish.disabled = menus.phase !== 'planning' || !!upgradeProject;
      if (upgradeProject)
        demolish.title = 'Cancel the queued upgrade in Factories first.';
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
    } else {
      card.classList.add('empty-site');
      details.append(element('h3', '', 'Empty site'));
      if (site.domeRequired && !site.hasDome)
        details.append(
          element(
            'p',
            'muted-note',
            'A Dome is required before this site can be used.',
          ),
        );
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

function buildingUsage(type: BuildType, demolition: boolean): string {
  const definition = BUILDINGS[type];
  if (demolition) return 'Workers released when demolished';
  return `${definition.workers} workers · No recurring material cost`;
}

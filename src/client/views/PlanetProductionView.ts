import type { AppReadModel } from '../models/AppModel.js';
import {
  BUILDINGS,
  factoryShips,
  projectDefinition,
  type PlanetGameSnapshot,
  type FleetSnapshot,
  type ShipType,
  SHIPS,
} from '../models/Game.js';
import type { Component } from '../models/Economy.js';
import type { IntentHandler } from './ViewContracts.js';
import {
  categoryButtons,
  catalogItem,
  catalogHeading,
} from './CatalogControls.js';
import { button, element } from './dom.js';
import { bindQueueOrder, decorateQueueRow } from './QueueView.js';

type Menus = Pick<AppReadModel, 'phase'> &
  Partial<
    Pick<
      AppReadModel,
      | 'research'
      | 'productionCategory'
      | 'productionProduct'
      | 'productionFleetId'
      | 'productionGuidance'
    >
  >;

export function renderProduction(
  planet: PlanetGameSnapshot,
  fleets: readonly FleetSnapshot[],
  emit: IntentHandler,
  menus: Menus,
): HTMLElement {
  const section = element('section', 'planet-production');
  const category = menus.productionCategory ?? 'Ships';
  const products =
    category === 'Components' && planet.availableComponents
      ? [...planet.availableComponents]
      : [
          ...new Set(
            planet.buildings.flatMap<ShipType | Component>((building) => {
              const definition = BUILDINGS[building.type];
              return category === 'Ships'
                ? factoryShips(building.type)
                : definition.component
                  ? [definition.component]
                  : [];
            }),
          ),
        ];
  const product = products.find((p) => p === menus.productionProduct) ?? null;
  const order = element('section', 'production-order');
  order.append(
    element('h2', '', 'Production'),
    categoryButtons(
      'Production categories',
      ['Ships', 'Components'] as const,
      category,
      (next) =>
        emit({ type: 'production-selection', category: next, product: null }),
    ),
  );
  const list = element('ul', 'catalog-list');
  list.setAttribute('aria-label', 'Product list');
  for (const value of products)
    list.append(
      catalogItem(value, `product:${value}`, value === product, () =>
        emit({ type: 'production-selection', category, product: value }),
      ),
    );
  order.append(list);
  if (product) {
    const detail = element('section', 'catalog-details production-details');
    detail.dataset.detailKey = `product:${product}`;
    detail.append(catalogHeading(product));
    const definition = projectDefinition(product);
    detail.append(element('p', '', definition.description));
    const matches = planet.buildings.filter(
      (b) =>
        factoryShips(b.type).includes(product as ShipType) ||
        BUILDINGS[b.type].component === product,
    );
    const active = matches.filter((b) => !b.scheduledForDemolition);
    const reason =
      menus.phase !== 'planning'
        ? 'Orders are locked during simulation.'
        : product === 'Civilian shuttle' &&
            !menus.research?.completed.includes('Civilian transport')
          ? 'Research Civilian transport first.'
          : !active.length
            ? 'Factory is scheduled for demolition.'
            : null;
    detail.append(
      element(
        'p',
        '',
        `${active.length} available ${active.length === 1 ? 'factory' : 'factories'} · Iron ${definition.cost.Iron}, Water ${definition.cost.Water}, Oil ${definition.cost.Oil}${definition.ship ? ` · ${definition.crew} crew` : ''}`,
      ),
    );
    if (definition.parts) {
      const requirements = Object.entries(definition.parts)
        .map(([part, count]) =>
          part === 'Rocket engine'
            ? `${count} ${count === 1 ? 'engine' : 'engines'} (Rocket engine or Ion pulse engine)`
            : part === 'Telescope I'
              ? `${count} telescope (best available: Telescope I, II or III)`
              : `${count} ${part}`,
        )
        .join(', ');
      detail.append(
        element(
          'p',
          'muted-note',
          `Requires ${requirements}. Missing parts are ordered automatically. Available Ion pulse engines are fitted first; at least one gives +1 speed.`,
        ),
      );
    }
    if (active.length && active.every((b) => b.operational === false))
      detail.append(
        element(
          'p',
          'muted-note',
          'Waiting for workers. Orders can be queued.',
        ),
      );
    const destination = fleetSelect(
      planet,
      fleets,
      menus.productionFleetId ?? null,
    );
    destination.setAttribute('aria-label', `Destination fleet for ${product}`);
    destination.disabled = !!reason;
    destination.addEventListener('change', () =>
      emit({ type: 'production-fleet', id: destination.value || null }),
    );
    if (definition.ship && product !== 'Civilian shuttle') {
      const destinationLabel = element(
        'label',
        'production-field',
        'Destination fleet',
      );
      destinationLabel.append(destination);
      detail.append(destinationLabel);
    }
    const queue = button(`Queue ${product}`, () =>
      definition.ship
        ? emit({
            type: 'queue-ship',
            ship: product as ShipType,
            fleetId:
              product === 'Civilian shuttle' ? null : destination.value || null,
          })
        : emit({ type: 'queue-component', component: product as Component }),
    );
    queue.disabled = !!reason;
    if (reason) detail.append(element('p', 'blocked-reason', reason));
    if (definition.ship)
      detail.append(
        element(
          'p',
          '',
          `Speed ${SHIPS[definition.ship].speed} hexes/year · ${definition.crew} crew`,
        ),
      );
    if (definition.component)
      detail.append(
        element(
          'p',
          '',
          `Stored ${planet.economy.stock[definition.component]} · Demand ${planet.economy.demand[definition.component]} · Incoming ${planet.economy.incoming[definition.component]}`,
        ),
      );
    detail.append(
      element(
        'p',
        'muted-note',
        `Factory staff: ${active.reduce((total, factory) => total + BUILDINGS[factory.type].workers, 0)} workers · Available workforce: ${planet.budget.availableWorkers}`,
      ),
      element(
        'p',
        'muted-note',
        'One shared build queue. One project completes per planet and year.',
      ),
      queue,
      button(
        'Back to products',
        () => emit({ type: 'production-selection', category, product: null }),
        'button secondary-button',
      ),
    );
    order.append(detail);
  } else if (!products.length)
    order.append(
      element(
        'p',
        'muted-note',
        `No ${category.toLowerCase()} can be produced here. ${menus.productionGuidance?.message ?? ''}`.trim(),
      ),
    );
  if (!products.length && menus.productionGuidance?.dome) {
    const dome = menus.productionGuidance.dome;
    order.append(
      button('Prepare building site', () => {
        emit({ type: 'open-production', planetId: planet.id });
        emit({ type: 'map-production-option', option: dome });
      }),
    );
  }
  if (!products.length && menus.productionGuidance?.kind === 'research')
    order.append(
      button('Open research', () => emit({ type: 'open-research' })),
    );
  if (products.length && !product)
    order.append(
      element('p', 'muted-note', 'Select a product for full details.'),
    );
  const queue = element('section', 'compact-build-queue');
  queue.setAttribute('aria-label', 'Compact build queue');
  queue.append(
    element('h2', '', 'Build queue'),
    button(
      'Open full queue',
      () => emit({ type: 'planet-tab', tab: 'queue' }),
      'button secondary-button',
    ),
  );
  const queueList = element('ol', 'compact-queue-list');
  bindQueueOrder(
    queueList,
    planet.projects.map((project) => project.id),
    (id, index) => emit({ type: 'move-project', id, index }),
    menus.phase !== 'planning',
  );
  for (const [index, first] of planet.projects.entries()) {
    const position = index + 1;
    const fleet = first.destinationFleetId
      ? (fleets.find((f) => f.id === first.destinationFleetId)?.name ??
        'Unknown fleet')
      : first.type === 'Civilian shuttle'
        ? 'New Civilian transport fleet'
        : 'Planet home fleet';
    const item = element('li');
    item.append(
      button(
        `${position}. ${first.type}${projectDefinition(first.type).ship ? ` · ${fleet}` : ''}${first.slotIndex === null ? '' : ` · Site ${first.slotIndex + 1}`}${first.blockedReason ? ` · ${first.blockedReason}` : ' · Queued'}`,
        () =>
          emit({
            type: 'open-planet-project',
            planetId: planet.id,
            projectId: first.id,
          }),
        'button secondary-button compact-queue-item',
      ),
    );
    decorateQueueRow(
      item,
      first.id,
      `${first.type}, position ${position}`,
      menus.phase !== 'planning',
    );
    queueList.append(item);
  }
  queue.append(queueList);
  if (!planet.projects.length)
    queue.append(element('p', 'muted-note', 'No production queued.'));
  section.append(order, queue);
  return section;
}

export function fleetSelect(
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
    (fleet) =>
      !fleet.routeId &&
      !fleet.civilian &&
      (!fleet.position || fleet.position.key === planet.position.key),
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

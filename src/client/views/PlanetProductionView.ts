import type { AppReadModel } from '../models/AppModel.js';
import {
  BUILDINGS,
  projectDefinition,
  type ConstructionProjectSnapshot,
  type PlanetGameSnapshot,
  type FleetSnapshot,
  type ShipType,
} from '../models/Game.js';
import type { Component } from '../models/Economy.js';
import type { IntentHandler } from './ViewContracts.js';
import { button, element } from './dom.js';

type Menus = Pick<AppReadModel, 'phase'> &
  Partial<
    Pick<
      AppReadModel,
      'productionCategory' | 'productionProduct' | 'productionFleetId'
    >
  >;

// kompakt-produktionsko: adjacent groups preserve actual order and fleet destinations.
export function compactProjectGroups(
  projects: readonly ConstructionProjectSnapshot[],
): readonly (readonly ConstructionProjectSnapshot[])[] {
  const groups: ConstructionProjectSnapshot[][] = [];
  for (const project of projects) {
    const last = groups.at(-1);
    if (
      last?.[0]?.type === project.type &&
      last[0].destinationFleetId === project.destinationFleetId &&
      last[0].slotIndex === project.slotIndex
    )
      last.push(project);
    else groups.push([project]);
  }
  return groups;
}

export function renderProduction(
  planet: PlanetGameSnapshot,
  fleets: readonly FleetSnapshot[],
  emit: IntentHandler,
  menus: Menus,
): HTMLElement {
  const section = element('section', 'planet-production');
  const category = menus.productionCategory ?? 'Ships';
  const products = [
    ...new Set(
      planet.buildings.flatMap((building) => {
        const definition = BUILDINGS[building.type];
        const product =
          category === 'Ships' ? definition.ship : definition.component;
        return product ? [product] : [];
      }),
    ),
  ];
  const product =
    products.find((p) => p === menus.productionProduct) ?? products[0] ?? null;
  const label = element('label', 'production-field', 'Category');
  const categories = element('select');
  categories.setAttribute('aria-label', 'Production category');
  for (const value of ['Ships', 'Components']) {
    const option = element('option', '', value);
    option.value = value;
    categories.append(option);
  }
  categories.value = category;
  categories.addEventListener('change', () =>
    emit({
      type: 'production-selection',
      category: categories.value as 'Ships' | 'Components',
      product: null,
    }),
  );
  label.append(categories);
  const productLabel = element('label', 'production-field', 'Product');
  const select = element('select');
  select.setAttribute('aria-label', 'Production product');
  for (const value of products) {
    const option = element('option', '', value);
    option.value = value;
    select.append(option);
  }
  select.disabled = !products.length;
  if (product) select.value = product;
  select.addEventListener('change', () =>
    emit({ type: 'production-selection', category, product: select.value }),
  );
  productLabel.append(select);
  const order = element('section', 'production-order');
  order.append(element('h2', '', 'Production'), label, productLabel);
  if (product) {
    const definition = projectDefinition(product);
    const matches = planet.buildings.filter(
      (b) =>
        BUILDINGS[b.type].ship === product ||
        BUILDINGS[b.type].component === product,
    );
    const active = matches.filter((b) => !b.scheduledForDemolition);
    const reason =
      menus.phase !== 'planning'
        ? 'Orders are locked during simulation.'
        : !active.length
          ? 'Factory is scheduled for demolition.'
          : null;
    order.append(
      element(
        'p',
        '',
        `${active.length} available ${active.length === 1 ? 'factory' : 'factories'} · Iron ${definition.cost.Iron}, Water ${definition.cost.Water}, Oil ${definition.cost.Oil}${definition.ship ? ` · ${definition.crew} crew` : ''}`,
      ),
    );
    if (definition.parts)
      order.append(
        element(
          'p',
          'muted-note',
          `Requires ${Object.entries(definition.parts)
            .map(([part, count]) => `${count} ${part}`)
            .join(', ')}. Missing parts are ordered automatically.`,
        ),
      );
    if (active.length && active.every((b) => b.operational === false))
      order.append(
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
    if (definition.ship) {
      const destinationLabel = element(
        'label',
        'production-field',
        'Destination fleet',
      );
      destinationLabel.append(destination);
      order.append(destinationLabel);
    }
    const queue = button(`Queue ${product}`, () =>
      definition.ship
        ? emit({
            type: 'queue-ship',
            ship: product as ShipType,
            fleetId: destination.value || null,
          })
        : emit({ type: 'queue-component', component: product as Component }),
    );
    queue.disabled = !!reason;
    order.append(queue);
    if (reason) order.append(element('p', 'blocked-reason', reason));
  } else
    order.append(
      element(
        'p',
        'muted-note',
        `No ${category.toLowerCase()} can be produced here. Build a matching factory in Building sites.`,
      ),
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
  const list = element('ol', 'compact-queue-list');
  let position = 1;
  for (const group of compactProjectGroups(planet.projects)) {
    const first = group[0]!;
    const lastPosition = position + group.length - 1;
    const fleet = first.destinationFleetId
      ? (fleets.find((f) => f.id === first.destinationFleetId)?.name ??
        'Unknown fleet')
      : 'Planet home fleet';
    const item = element('li');
    item.append(
      button(
        `${position}${lastPosition === position ? '' : `–${lastPosition}`}. ${first.type}${group.length > 1 ? ` ×${group.length}` : ''}${projectDefinition(first.type).ship ? ` · ${fleet}` : ''}${first.slotIndex === null ? '' : ` · Site ${first.slotIndex + 1}`}`,
        () =>
          emit({
            type: 'open-planet-project',
            planetId: planet.id,
            projectId: first.id,
          }),
        'button secondary-button compact-queue-item',
      ),
    );
    list.append(item);
    position = lastPosition + 1;
  }
  queue.append(list);
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

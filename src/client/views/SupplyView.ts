import type { AppReadModel } from '../models/AppModel.js';
import type { SupplyMaterial, SupplyPlanet } from '../models/SupplyOverview.js';
import type { ShipmentSnapshot } from '../models/Logistics.js';
import type { IntentHandler } from './ViewContracts.js';
import { button, element } from './dom.js';

function action(
  label: string,
  key: string,
  click: () => void,
): HTMLButtonElement {
  const control = button(label, click, 'button secondary-button');
  control.dataset.focusKey = key;
  return control;
}

export function renderSupply(
  model: AppReadModel,
  emit: IntentHandler,
): HTMLElement {
  const page = element('section', 'supply-page');
  const selection = model.supplySelection;
  const header = element('div', 'screen-header');
  header.append(element('h1', '', 'Supply & production'));
  page.append(header);
  const content = element('div', 'supply-content');
  content.setAttribute('role', 'region');
  content.setAttribute('aria-label', 'Supply overview');
  const toolbar = element('div', 'supply-toolbar');
  const label = element('label', 'supply-search-label', 'Find a material');
  const search = element('input');
  search.type = 'search';
  search.value = selection.query;
  search.placeholder = 'Search materials';
  search.setAttribute('aria-label', 'Find a material');
  search.dataset.focusKey = 'supply-search';
  search.addEventListener('input', () =>
    emit({ type: 'supply-search', query: search.value }),
  );
  label.append(search);
  toolbar.append(
    label,
    action('Open Star map', 'supply-map', () => emit({ type: 'open-map' })),
  );
  content.append(toolbar);
  if (selection.query.trim()) {
    const matches = model.supply.materials.filter((material) =>
      material.toLowerCase().includes(selection.query.trim().toLowerCase()),
    );
    const results = element('div', 'supply-search-results');
    results.setAttribute('aria-label', 'Material results');
    for (const material of matches)
      results.append(
        action(material, `material:${material}`, () =>
          emit({ type: 'supply-material', material }),
        ),
      );
    if (!matches.length)
      results.append(element('p', 'muted-note', 'No matching materials'));
    content.append(results);
  }
  const selectedMaterial = selection.material;
  if (selectedMaterial) {
    const heading = element('div', 'supply-material-heading');
    const title = element('h2', '', selectedMaterial);
    title.tabIndex = -1;
    heading.append(
      title,
      action('All planets', 'all-planets', () =>
        emit({ type: 'supply-material', material: null }),
      ),
    );
    content.append(heading);
  } else
    content.append(
      element(
        'p',
        'muted-note',
        'Next project on each planet · unresolved needs first',
      ),
    );
  const planets = selectedMaterial
    ? model.supply.planets.filter(
        (p) =>
          p.materials.some((m) => m.material === selectedMaterial) ||
          p.capabilities.some((c) => c.product === selectedMaterial),
      )
    : model.supply.planets;
  const list = element('div', 'supply-planets');
  for (const planet of planets) {
    const card = element('article', 'supply-planet');
    card.dataset.planetId = planet.id;
    card.dataset.status = planet.status;
    const expanded =
      selectedMaterial !== null || selection.expanded.includes(planet.id);
    const toggle = selectedMaterial
      ? element('div')
      : action(`Supply details for ${planet.name}`, `planet:${planet.id}`, () =>
          emit({ type: 'supply-toggle', id: planet.id }),
        );
    toggle.className = 'supply-planet-summary';
    if (!selectedMaterial) {
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.setAttribute('aria-controls', `supply-details-${planet.id}`);
    }
    const identity = element('span', 'supply-planet-identity');
    identity.append(
      element('strong', '', planet.name),
      element(
        'span',
        'supply-project',
        planet.project?.type ?? 'No project queued',
      ),
    );
    const state = element('span', 'supply-planet-state');
    state.append(
      element(
        'span',
        `supply-status supply-status-${planet.status.toLowerCase().replaceAll(' ', '-')}`,
        planet.status,
      ),
      element('span', 'supply-summary-text', planet.summary),
    );
    toggle.replaceChildren(identity, state);
    if (!selectedMaterial)
      toggle.append(element('span', 'supply-expand', expanded ? '−' : '+'));
    card.append(toggle);
    if (expanded) {
      const details = element('div', 'supply-details');
      details.id = `supply-details-${planet.id}`;
      const inventory = selection.inventories.includes(planet.id);
      const materials = planet.materials.filter((m) =>
        selectedMaterial
          ? m.material === selectedMaterial
          : inventory || m.required > 0 || m.incoming > 0,
      );
      if (materials.length)
        details.append(materialList(materials, emit, planet.id));
      else
        details.append(
          element(
            'p',
            'muted-note',
            'No materials required by a next project.',
          ),
        );
      if (!selectedMaterial)
        details.append(
          action(
            inventory ? 'Show project materials' : 'Show inventory',
            `inventory:${planet.id}`,
            () => emit({ type: 'supply-inventory', id: planet.id }),
          ),
        );
      if (planet.capabilities.length || selectedMaterial)
        details.append(capabilities(planet, selectedMaterial));
      const deliveries = model.shipments.filter(
        (s) =>
          (s.sourceId === planet.id ||
            s.recipientId === planet.id ||
            s.locationId === planet.id) &&
          (!selectedMaterial || s.material === selectedMaterial),
      );
      if (!selectedMaterial && deliveries.length)
        details.append(deliveryList(deliveries, emit));
      details.append(
        action(`Open ${planet.name}`, `open:${planet.id}`, () =>
          emit({ type: 'supply-open-planet', id: planet.id }),
        ),
      );
      const routes = model.tradeRoutes.filter(
        (r) => r.a === planet.id || r.b === planet.id,
      );
      for (const route of routes)
        details.append(
          action(
            `Open route ${route.from} to ${route.to}`,
            `route:${planet.id}:${route.id}`,
            () => emit({ type: 'supply-open-route', id: route.id }),
          ),
        );
      card.append(details);
    }
    list.append(card);
  }
  content.append(list);
  if (selectedMaterial) {
    const deliveries = model.shipments.filter(
      (s) => s.material === selectedMaterial,
    );
    content.append(deliveryList(deliveries, emit));
  }
  if (!planets.length)
    content.append(element('p', 'muted-note', 'No relevant planets'));
  page.append(content);
  return page;
}

function materialList(
  materials: readonly SupplyMaterial[],
  emit: IntentHandler,
  planetId: string,
): HTMLElement {
  const list = element('div', 'supply-materials');
  for (const material of materials) {
    const row = element('section', 'supply-material');
    row.dataset.material = material.material;
    row.append(
      action(
        material.material,
        `inspect:${planetId}:${material.material}`,
        () => emit({ type: 'supply-material', material: material.material }),
      ),
    );
    const values = element('dl', 'supply-quantities');
    const pair = (label: string, value: string, className = '') => {
      const group = element('div', className);
      group.append(element('dt', '', label), element('dd', '', value));
      values.append(group);
    };
    pair('Available here', String(material.available));
    if (material.required > 0) pair('Required', String(material.required));
    if (material.reserved > 0)
      pair('Stock / reserved', `${material.stock} / ${material.reserved}`);
    if (material.extraction > 0)
      pair(
        'Local extraction',
        `${material.extraction}/year · ${material.deposits} deposit`,
      );
    if (material.incoming > 0)
      pair(
        'Incoming',
        `${material.awaitingPickup} awaiting pickup · ${material.inTransit} in transit`,
      );
    if (material.ordered > 0)
      pair('Ordered production', String(material.ordered));
    if (material.required > 0)
      pair(
        'Unprovided',
        String(material.unprovided),
        material.unprovided > 0 ? 'supply-unprovided' : '',
      );
    if (material.localYears !== null)
      pair('Local supply estimate', `~${material.localYears} year(s)`);
    row.append(values);
    list.append(row);
  }
  return list;
}

function capabilities(
  planet: SupplyPlanet,
  material: string | null,
): HTMLElement {
  const section = element('section', 'supply-capabilities');
  const items = planet.capabilities.filter(
    (c) => !material || c.product === material,
  );
  section.append(element('h3', '', 'Production capabilities'));
  if (!items.length)
    section.append(element('p', 'muted-note', 'No matching factory'));
  for (const capability of items)
    section.append(
      element(
        'p',
        '',
        `${capability.product} · ${capability.available ? 'Can produce' : capability.reason} · ${capability.queued} queued`,
      ),
    );
  if (items.length)
    section.append(
      element(
        'p',
        'muted-note',
        'One shared Build queue · at most one project completed per year',
      ),
    );
  return section;
}

function deliveryList(
  shipments: readonly ShipmentSnapshot[],
  emit: IntentHandler,
): HTMLElement {
  const list = element('section', 'supply-deliveries');
  list.append(element('h3', '', 'Deliveries'));
  if (!shipments.length)
    list.append(element('p', 'muted-note', 'No deliveries arranged'));
  for (const shipment of shipments) {
    const entry = element('article', 'supply-delivery');
    entry.dataset.shipmentId = shipment.id;
    entry.append(
      element(
        'strong',
        '',
        `${shipment.amount} ${shipment.material} · ${shipment.source} → ${shipment.recipient}`,
      ),
      element(
        'p',
        '',
        `${shipment.state} · ${shipment.years === null ? 'Arrival unknown' : `estimated arrival ~${shipment.years} year(s)`}`,
      ),
      element(
        'p',
        'muted-note',
        `${shipment.state === 'In transit' ? 'Next stop' : 'Pickup at'}: ${shipment.state === 'In transit' ? shipment.nextStop : shipment.location} · ${shipment.project ? `For ${shipment.project}` : 'For stock (original project cancelled)'}`,
      ),
    );
    if (shipment.issue)
      entry.append(element('p', 'supply-unprovided', shipment.issue));
    if (shipment.routeId)
      entry.append(
        action('View route', `delivery-route:${shipment.id}`, () =>
          emit({ type: 'supply-open-route', id: shipment.routeId! }),
        ),
      );
    if (shipment.fleetId)
      entry.append(
        action('View fleet', `delivery-fleet:${shipment.id}`, () =>
          emit({ type: 'open-fleet', id: shipment.fleetId! }),
        ),
      );
    list.append(entry);
  }
  return list;
}

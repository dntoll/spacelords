import { button, element } from '../../../common/dom.js';
import type { Resource } from '../../models/Economy.js';
import type { FactoryTier } from '../../models/factory-screens/FactoryCatalog.js';
import type { MapPosition } from '../../models/factory-screens/FactoryNetwork.js';
import type {
  BuildOptionSnapshot,
  BuildScreenSnapshot,
  ConnectScreenSnapshot,
  FactoryGroupSnapshot,
  FactoryPlanetSnapshot,
  FactoryScreensAction,
  FactoryScreensSnapshot,
  FactorySiteSnapshot,
  LinksScreenSnapshot,
  OrderScreenSnapshot,
  TransportOptionSnapshot,
} from '../../models/factory-screens/FactoryScreensFacade.js';
import { BUILDING_SYMBOLS } from '../BuildingSymbols.js';
import { PLANET_IMAGES } from '../PlanetImages.js';
import { SHIP_IMAGES } from '../ShipImages.js';

// Klickbar prototyp av fabriksskärmarna; befintliga-symboler-i-nya-vyer.

type Emit = (action: FactoryScreensAction) => void;
type Part = HTMLElement | SVGSVGElement;

const SVG = 'http://www.w3.org/2000/svg';

const rounds = (count: number): string =>
  `${count} ${count === 1 ? 'round' : 'rounds'}`;
const list = (items: readonly string[]): string => items.join(', ');

function tag(text: string, tone = ''): HTMLElement {
  return element('span', `factory-tag ${tone}`.trim(), text);
}

function symbol(source: string, alt = ''): HTMLImageElement {
  const image = element('img', 'factory-symbol');
  image.src = source;
  image.alt = alt;
  image.decoding = 'async';
  return image;
}

function costText(cost: Readonly<Partial<Record<Resource, number>>>): string {
  return Object.entries(cost)
    .filter(([, amount]) => (amount ?? 0) > 0)
    .map(([resource, amount]) => `${resource} ${amount}`)
    .join(' · ');
}

function heading(
  title: string,
  subtitle: string,
  emit: Emit,
  back: 'back' | 'close',
): HTMLElement {
  const bar = element('header', 'factory-heading');
  const text = element('div', 'factory-heading-text');
  text.append(element('h1', '', title));
  if (subtitle) text.append(element('p', 'factory-muted', subtitle));
  const action = button(
    back === 'back' ? 'Back' : 'Close',
    () => emit({ kind: back }),
    'secondary-button factory-back',
  );
  if (back === 'back') bar.append(action, text);
  else bar.append(text, action);
  return bar;
}

interface GraphNode {
  readonly id: string;
  readonly label: string;
  readonly position: MapPosition;
  readonly radius: number;
  readonly image?: string;
  readonly tone: 'own' | 'other' | 'picked' | 'muted';
  readonly onClick?: () => void;
}

interface GraphEdge {
  readonly a: string;
  readonly b: string;
  readonly dashed: boolean;
  readonly faint?: boolean;
}

/** Nodes keep roughly their world positions, scaled into the strip. */
function graph(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
  height: number,
  label: string,
): SVGSVGElement {
  const width = 320;
  const pad = 34;
  const xs = nodes.map((node) => node.position.x);
  const ys = nodes.map((node) => node.position.y);
  const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
  const [minY, maxY] = [Math.min(...ys), Math.max(...ys)];
  // Each axis is stretched on its own: the strip is wide but low, and the
  // graph only needs to keep the planets' rough directions.
  const axis = (value: number, min: number, max: number, size: number) =>
    max === min ? size / 2 : pad + ((value - min) / (max - min)) * (size - pad * 2);
  const at = (point: MapPosition) => ({
    x: axis(point.x, minX, maxX, width),
    y: axis(point.y, minY, maxY, height),
  });
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('class', 'factory-graph');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', label);
  const positions = new Map(nodes.map((node) => [node.id, at(node.position)]));
  for (const edge of edges) {
    const a = positions.get(edge.a);
    const b = positions.get(edge.b);
    if (!a || !b) continue;
    const line = document.createElementNS(SVG, 'line');
    line.setAttribute('x1', String(a.x));
    line.setAttribute('y1', String(a.y));
    line.setAttribute('x2', String(b.x));
    line.setAttribute('y2', String(b.y));
    line.setAttribute(
      'class',
      `factory-edge${edge.dashed ? ' dashed' : ''}${edge.faint ? ' faint' : ''}`,
    );
    svg.append(line);
  }
  for (const node of nodes) {
    const point = positions.get(node.id);
    if (!point) continue;
    const group = document.createElementNS(SVG, 'g');
    group.setAttribute('class', `factory-node ${node.tone}`);
    const ring = document.createElementNS(SVG, 'circle');
    ring.setAttribute('cx', String(point.x));
    ring.setAttribute('cy', String(point.y));
    ring.setAttribute('r', String(node.radius));
    group.append(ring);
    if (node.image) {
      const image = document.createElementNS(SVG, 'image');
      const size = node.radius * 1.7;
      image.setAttribute('href', node.image);
      image.setAttribute('x', String(point.x - size / 2));
      image.setAttribute('y', String(point.y - size / 2));
      image.setAttribute('width', String(size));
      image.setAttribute('height', String(size));
      group.append(image);
    }
    const text = document.createElementNS(SVG, 'text');
    text.setAttribute('x', String(point.x));
    text.setAttribute(
      'y',
      String(
        point.y > height / 2
          ? point.y - node.radius - 5
          : point.y + node.radius + 12,
      ),
    );
    text.setAttribute('text-anchor', 'middle');
    text.textContent = node.label;
    group.append(text);
    if (node.onClick) {
      const click = node.onClick;
      group.setAttribute('role', 'button');
      group.setAttribute('tabindex', '0');
      group.setAttribute('aria-label', node.label);
      group.addEventListener('click', click);
      group.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          click();
        }
      });
    }
    svg.append(group);
  }
  return svg;
}

function siteStatus(site: FactorySiteSnapshot): string {
  const factory = site.factory;
  if (!factory) return '';
  switch (factory.status) {
    case 'working':
      return '';
    case 'idle':
      return 'Idle';
    case 'building':
      return `Building ${factory.roundsDone}/${factory.roundsTotal}`;
    case 'queued':
      return 'Queued';
    case 'producing':
      return `${factory.roundsDone}/${rounds(factory.roundsTotal)}${
        factory.moreOrders > 0 ? ` · ${factory.moreOrders} more` : ''
      }`;
    case 'missing':
      return `No ${list(factory.missing)}`;
  }
}

function siteButton(
  planet: FactoryPlanetSnapshot,
  site: FactorySiteSnapshot,
  emit: Emit,
): HTMLElement {
  const factory = site.factory;
  const tone =
    site.kind === 'empty'
      ? 'empty'
      : site.kind === 'locked'
        ? 'locked'
        : (factory?.status ?? '');
  const node = element('button', `factory-site ${tone}`);
  node.type = 'button';
  if (site.kind === 'empty') {
    node.append(
      element('span', 'factory-site-plus', '+'),
      element('span', '', 'Empty'),
    );
    node.setAttribute('aria-label', `Empty site on ${planet.name}`);
  } else if (site.kind === 'locked') {
    node.append(
      element('span', 'factory-site-plus', '🔒'),
      element('span', '', 'Needs Dome'),
    );
    node.setAttribute('aria-label', `Site on ${planet.name} needs a Dome`);
  } else if (factory) {
    const status = siteStatus(site);
    node.append(
      symbol(BUILDING_SYMBOLS[factory.type]),
      element(
        'span',
        'factory-site-name',
        factory.type.replace(' factory', ''),
      ),
    );
    if (status) node.append(element('span', 'factory-site-status', status));
    node.setAttribute(
      'aria-label',
      `${factory.type} on ${planet.name}${status ? `: ${status}` : ''}`,
    );
  }
  node.addEventListener('click', () =>
    emit({ kind: 'open-site', planet: planet.name, site: site.index }),
  );
  return node;
}

function planetSection(planet: FactoryPlanetSnapshot, emit: Emit): HTMLElement {
  const section = element('section', 'factory-planet');
  const toggle = element('button', 'factory-planet-toggle');
  toggle.type = 'button';
  toggle.setAttribute('aria-expanded', String(!planet.collapsed));
  const portrait = symbol(PLANET_IMAGES[planet.environment]);
  portrait.className = 'factory-planet-image';
  const summary = planet.collapsed
    ? ` · ${planet.usedSites}/${planet.sites.length} sites`
    : '';
  toggle.append(
    portrait,
    element('span', 'factory-planet-name', planet.name),
    element('span', 'factory-muted', `${list(planet.deposits)}${summary}`),
    element('span', 'factory-chevron', planet.collapsed ? '▸' : '▾'),
  );
  toggle.addEventListener('click', () =>
    emit({ kind: 'toggle-planet', planet: planet.name }),
  );
  section.append(toggle);
  if (!planet.collapsed) {
    const sites = element('div', 'factory-sites');
    for (const site of planet.sites)
      sites.append(siteButton(planet, site, emit));
    section.append(sites);
  }
  return section;
}

function groupGraph(group: FactoryGroupSnapshot): SVGSVGElement {
  return graph(
    group.planets.map((planet) => ({
      id: planet.name,
      label: planet.name,
      position: planet.position,
      radius: 9,
      image: PLANET_IMAGES[planet.environment],
      tone: 'own',
    })),
    group.links.map((link) => ({ a: link.a, b: link.b, dashed: link.pending })),
    96,
    `Links between ${list(group.planets.map((planet) => planet.name))}`,
  );
}

function groupSection(group: FactoryGroupSnapshot, emit: Emit): HTMLElement {
  const section = element('section', 'factory-group');
  const header = element('div', 'factory-group-header');
  const toggle = element('button', 'factory-group-toggle');
  toggle.type = 'button';
  toggle.setAttribute('aria-expanded', String(!group.collapsed));
  const activeLinks = group.links.filter((link) => !link.pending).length;
  const meta =
    group.planets.length === 1
      ? group.collapsed
        ? `1 planet · ${group.emptySites} empty sites`
        : '1 planet'
      : `${group.planets.length} planets · ${activeLinks} ${activeLinks === 1 ? 'link' : 'links'}`;
  const text = element('span', 'factory-group-text');
  text.append(
    element('span', 'factory-group-name', group.key),
    element(
      'span',
      'factory-muted',
      group.canConnect ? meta : `${meta} · no transport`,
    ),
  );
  toggle.append(
    element('span', 'factory-chevron', group.collapsed ? '▸' : '▾'),
    text,
  );
  toggle.addEventListener('click', () =>
    emit({ kind: 'toggle-group', group: group.key }),
  );
  header.append(toggle);
  if (group.canConnect)
    header.append(
      button(
        'Connect',
        () => emit({ kind: 'open-connect', group: group.key }),
        'secondary-button factory-connect',
      ),
    );
  section.append(header);
  if (group.collapsed) return section;
  if (group.planets.length > 1) section.append(groupGraph(group));
  const counts = element('div', 'factory-counts');
  for (const count of group.counts) {
    const text = `${count.type.replace(' factory', '')} ${count.built}${
      count.building > 0 ? ` +${count.building}` : ''
    }${count.missing.length > 0 ? ` · no ${list(count.missing)}` : ''}`;
    const chip = tag(text, count.missing.length > 0 ? 'danger' : '');
    chip.prepend(symbol(BUILDING_SYMBOLS[count.type]));
    counts.append(chip);
  }
  section.append(counts);
  for (const planet of group.planets)
    section.append(planetSection(planet, emit));
  return section;
}

function sitesScreen(snapshot: FactoryScreensSnapshot, emit: Emit): Part[] {
  const legend = element('div', 'factory-legend');
  for (const [tone, text] of [
    ['producing', 'In production'],
    ['building', 'Being built'],
    ['queued', 'Queued'],
    ['missing', 'Inputs missing in group'],
    ['empty', 'Empty site'],
  ] as const) {
    const item = element('span', 'factory-legend-item');
    item.append(
      element('span', `factory-swatch ${tone}`),
      element('span', '', text),
    );
    legend.append(item);
  }
  return [
    heading('Build factories', '', emit, 'close'),
    ...snapshot.groups.map((group) => groupSection(group, emit)),
    legend,
  ];
}

const TIER_HINT: Readonly<
  Record<FactoryTier, (build: BuildScreenSnapshot) => string>
> = {
  Resources: (build) =>
    build.deposits.length > 0
      ? `${build.planet} has ${list(build.deposits)}`
      : `${build.planet} has no resources`,
  Parts: () => '',
  Products: (build) => `ships appear at ${build.planet}`,
};

function optionRow(
  build: BuildScreenSnapshot,
  option: BuildOptionSnapshot,
  emit: Emit,
): HTMLElement {
  const row = element(
    'div',
    `factory-option${option.missingDeposit ? ' unavailable' : ''}`,
  );
  const body = element('div', 'factory-option-body');
  const title = element('div', 'factory-option-title');
  title.append(
    symbol(BUILDING_SYMBOLS[option.type]),
    element('span', '', option.type),
  );
  body.append(title);
  if (option.missingDeposit) {
    body.append(
      element(
        'p',
        'factory-muted',
        `No ${option.missingDeposit} on ${build.planet}`,
      ),
    );
    row.append(body);
    return row;
  }
  body.append(element('p', 'factory-muted', costText(option.cost)));
  const tags = element('div', 'factory-tags');
  const count = `${option.inGroup} in group${
    option.buildingInGroup > 0 ? ` + ${option.buildingInGroup} building` : ''
  }${option.here > 0 ? ', here' : ''}`;
  tags.append(tag(count), tag(`Build ${rounds(option.buildRounds)}`, 'time'));
  if (option.tier === 'Parts')
    tags.append(
      option.inputRounds === null
        ? tag(`No ${list(option.missingInputs)} in group`, 'danger')
        : tag(
            option.inputRounds === 0
              ? 'Inputs made here'
              : `Inputs ${rounds(option.inputRounds)} away`,
            'time',
          ),
    );
  if (option.product)
    tags.append(
      option.productRounds === null
        ? tag(`No ${list(option.missingInputs)} in group`, 'danger')
        : tag(`${option.product} ~${rounds(option.productRounds)}`, 'time'),
    );
  if (option.shortage.length > 0)
    tags.append(
      tag(
        `Short: ${option.shortage
          .map(({ resource, amount }) => `${resource} ${amount}`)
          .join(', ')}`,
        'warning',
      ),
    );
  body.append(tags);
  const action = option.shortage.length > 0 ? 'Queue' : 'Build';
  const actionButton = button(
    action,
    () => emit({ kind: 'build', type: option.type }),
    'button factory-action',
  );
  actionButton.setAttribute('aria-label', `${action} ${option.type}`);
  row.append(body, actionButton);
  return row;
}

function buildScreen(build: BuildScreenSnapshot, emit: Emit): Part[] {
  const stock = element('p', 'factory-stock');
  stock.textContent = `${Object.entries(build.stock)
    .map(([resource, amount]) => `${resource} ${amount}`)
    .join(' · ')} · Workers ${build.workers}`;
  const sections = (['Resources', 'Parts', 'Products'] as const).map((tier) => {
    const section = element('section', 'factory-tier');
    const hint = TIER_HINT[tier](build);
    section.append(element('h2', '', hint ? `${tier} · ${hint}` : tier));
    for (const option of build.options.filter((entry) => entry.tier === tier))
      section.append(optionRow(build, option, emit));
    return section;
  });
  return [
    heading(
      `${build.planet} · empty site`,
      `Group ${list(build.group)}`,
      emit,
      'back',
    ),
    stock,
    ...sections,
    element(
      'p',
      'factory-muted',
      '~ is an estimate and changes when links change.',
    ),
  ];
}

function transportPicker(
  transports: readonly TransportOptionSnapshot[],
  emit: Emit,
): HTMLElement {
  const section = element('section', 'factory-transports');
  section.append(element('h2', '', 'Transport'));
  const options = element('div', 'factory-segments');
  for (const option of transports) {
    const label =
      option.choice.kind === 'free'
        ? `Free: ${option.choice.name}`
        : `Build at ${option.choice.planet} ~${rounds(option.buildRounds ?? 0)}`;
    const node = button(
      label,
      () => emit({ kind: 'choose-transport', choice: option.choice }),
      `factory-segment${option.selected ? ' selected' : ''}`,
    );
    node.setAttribute('aria-pressed', String(option.selected));
    options.append(node);
  }
  section.append(options);
  return section;
}

function connectScreen(connect: ConnectScreenSnapshot, emit: Emit): Part[] {
  const nodes: GraphNode[] = connect.nodes.map((node) => {
    const extra = node.planets.length > 1 ? ` +${node.planets.length - 1}` : '';
    return {
      id: node.key,
      label: node.own
        ? node.planets.length > 1
          ? `${node.planets.length} planets`
          : (node.planets[0] ?? '')
        : `${node.planets[0] ?? ''}${extra}`,
      position: node.position,
      radius: node.own ? 22 : node.planets.length > 1 ? 14 : 9,
      tone: node.own ? 'own' : node.connectable ? 'other' : 'muted',
      ...(node.own ? { onClick: () => emit({ kind: 'open-links' }) } : {}),
    };
  });
  const own = connect.nodes.find((node) => node.own);
  const edges: GraphEdge[] = own
    ? connect.nodes
        .filter((node) => !node.own && node.connectable)
        .map((node) => ({ a: own.key, b: node.key, dashed: true }))
    : [];
  const proposals = element('section', 'factory-proposals');
  proposals.append(element('h2', '', 'Connect to'));
  if (connect.proposals.length === 0)
    proposals.append(
      element('p', 'factory-muted', 'No other groups to connect.'),
    );
  for (const proposal of connect.proposals) {
    const row = element('div', 'factory-option');
    const body = element('div', 'factory-option-body');
    const first = proposal.targetGroup[0] ?? '';
    const name = `${first}${proposal.targetGroup.length > 1 ? ` +${proposal.targetGroup.length - 1}` : ''}`;
    body.append(
      element('div', 'factory-option-title', name),
      element('p', 'factory-muted', `${proposal.from}–${proposal.to}`),
    );
    const tags = element('div', 'factory-tags');
    for (const problem of proposal.unblocks)
      tags.append(
        tag(
          `Unblocks ${problem.type.replace(' factory', '')} at ${problem.planet}`,
          'success',
        ),
      );
    for (const material of proposal.adds) tags.append(tag(`Adds ${material}`));
    if (proposal.canBuildTransports)
      tags.append(tag('Builds transports', 'time'));
    body.append(tags);
    const action = button(
      'Connect',
      () => emit({ kind: 'connect', target: first }),
      'button factory-action',
    );
    action.setAttribute('aria-label', `Connect ${name}`);
    row.append(body, action);
    proposals.append(row);
  }
  return [
    heading(`Connect ${list(connect.group)}`, '', emit, 'back'),
    graph(nodes, edges, 190, 'Groups placed by their position on the map'),
    element('p', 'factory-muted', 'Tap your group to see the links inside it.'),
    proposals,
    transportPicker(connect.transports, emit),
  ];
}

function linksScreen(links: LinksScreenSnapshot, emit: Emit): Part[] {
  const svg = graph(
    links.planets.map((planet) => ({
      id: planet.name,
      label: planet.name,
      position: planet.position,
      radius: 12,
      tone: planet.picked ? 'picked' : 'own',
      onClick: () => emit({ kind: 'pick-planet', planet: planet.name }),
    })),
    links.links.map((link) => ({ a: link.a, b: link.b, dashed: link.pending })),
    170,
    `Links inside ${list(links.group)}`,
  );
  const content: Part[] = [
    heading('Links inside', list(links.group), emit, 'back'),
  ];
  const wrapper = element('div', 'factory-graph-wrap');
  wrapper.append(svg);
  content.push(
    wrapper,
    element('p', 'factory-muted', 'Tap two planets for an extra link.'),
  );
  if (links.pick) {
    const row = element('div', 'factory-option');
    const body = element('div', 'factory-option-body');
    body.append(
      element('div', 'factory-option-title', `${links.pick.a}–${links.pick.b}`),
    );
    const tags = element('div', 'factory-tags');
    if (links.pick.alreadyLinked) tags.append(tag('Already linked'));
    else {
      tags.append(tag('Backup route', 'success'));
      if (links.pick.roundsSaved > 0)
        tags.append(tag(`Saves ${rounds(links.pick.roundsSaved)}`, 'time'));
    }
    body.append(tags);
    row.append(body);
    if (!links.pick.alreadyLinked)
      row.append(
        button(
          'Add link',
          () => emit({ kind: 'add-link' }),
          'button factory-action',
        ),
      );
    content.push(row, transportPicker(links.transports, emit));
  }
  if (links.pendingMove) {
    const warning = element('div', 'factory-warning');
    warning.setAttribute('role', 'alert');
    warning.append(
      element(
        'p',
        '',
        `Moving ${links.pendingMove.transport} splits ${list(links.pendingMove.splitOff)} from the group.`,
      ),
      button('Move anyway', () => emit({ kind: 'confirm-move' })),
      button('Cancel', () => emit({ kind: 'cancel-move' }), 'secondary-button'),
    );
    content.push(warning);
  }
  const current = element('section', 'factory-proposals');
  current.append(element('h2', '', 'Current links'));
  for (const link of links.links) {
    const row = element('div', 'factory-option');
    const body = element('div', 'factory-option-body');
    body.append(
      element('div', 'factory-option-title', `${link.a}–${link.b}`),
      element(
        'p',
        'factory-muted',
        link.pending ? `${link.transport} being built` : link.transport,
      ),
    );
    row.append(body);
    if (!link.pending) {
      const move = button(
        'Move',
        () => emit({ kind: 'move-link', link: link.id }),
        'secondary-button factory-action',
      );
      move.setAttribute(
        'aria-label',
        `Move ${link.transport} from ${link.a}–${link.b}`,
      );
      row.append(move);
    }
    current.append(row);
  }
  content.push(current);
  return content;
}

function orderScreen(order: OrderScreenSnapshot, emit: Emit): Part[] {
  const needs = element('section', 'factory-proposals');
  needs.append(element('h2', '', `${order.product} needs`));
  for (const input of order.inputs) {
    const row = element('div', 'factory-option');
    row.append(
      element('div', 'factory-option-title', `${input.material} ×1`),
      input.rounds === null
        ? tag('Not made in group', 'danger')
        : tag(
            input.rounds === 0 ? 'Made here' : `${rounds(input.rounds)} away`,
            'time',
          ),
    );
    needs.append(row);
  }
  const orders = element('section', 'factory-proposals');
  orders.append(element('h2', '', `Orders · ships appear at ${order.planet}`));
  if (order.orders === 0)
    orders.append(
      element('p', 'factory-muted', 'No orders. The factory stands still.'),
    );
  for (let index = 0; index < order.orders; index += 1) {
    const row = element('div', 'factory-option');
    const ship = symbol(SHIP_IMAGES[order.product]);
    const title = element('div', 'factory-option-title');
    title.append(ship, element('span', '', `${order.product} ${index + 1}`));
    const producing = index === 0 && order.roundsTotal > 0;
    row.append(
      title,
      producing
        ? tag(`${order.roundsDone}/${rounds(order.roundsTotal)}`, 'time')
        : tag(
            order.estimate === null
              ? 'Waiting for parts'
              : `~${rounds(order.estimate + index)}`,
            'time',
          ),
    );
    orders.append(row);
  }
  const actions = element('div', 'factory-order-actions');
  actions.append(
    button(`Order ${order.product}`, () => emit({ kind: 'order', change: 1 })),
  );
  const cancellable = order.orders - (order.roundsTotal > 0 ? 1 : 0);
  if (cancellable > 0)
    actions.append(
      button(
        'Cancel last',
        () => emit({ kind: 'order', change: -1 }),
        'secondary-button',
      ),
    );
  return [
    heading(
      `${order.type} · ${order.planet}`,
      `Group ${list(order.group)} · ${order.factoriesInGroup} in group`,
      emit,
      'back',
    ),
    needs,
    orders,
    actions,
    element(
      'p',
      'factory-muted',
      'Stand-in for ordering ships in Production on the map.',
    ),
  ];
}

export class FactoryScreensView {
  readonly #root: HTMLElement;
  readonly #emit: Emit;
  readonly #page = element('main', 'factory-screens');
  #screenKey = '';

  constructor(root: HTMLElement, emit: Emit) {
    this.#root = root;
    this.#emit = emit;
  }

  render(snapshot: FactoryScreensSnapshot, notice: string | null = null): void {
    const key = `${snapshot.screen}:${snapshot.build?.planet ?? ''}:${snapshot.connect?.group.join() ?? ''}`;
    const scroll = key === this.#screenKey ? this.#page.scrollTop : 0;
    this.#screenKey = key;
    this.#root.classList.add('has-factory-screens');
    this.#root.classList.remove('has-game-footer', 'has-local-editor-nav');
    if (this.#page.parentElement !== this.#root)
      this.#root.replaceChildren(this.#page);
    this.#page.replaceChildren(...this.#content(snapshot));
    if (notice) {
      const message = element('p', 'factory-notice', notice);
      message.setAttribute('role', 'status');
      this.#page.prepend(message);
    }
    this.#page.scrollTop = scroll;
  }

  #content(snapshot: FactoryScreensSnapshot): Part[] {
    const emit = this.#emit;
    if (snapshot.screen === 'build' && snapshot.build)
      return buildScreen(snapshot.build, emit);
    if (snapshot.screen === 'connect' && snapshot.connect)
      return connectScreen(snapshot.connect, emit);
    if (snapshot.screen === 'links' && snapshot.links)
      return linksScreen(snapshot.links, emit);
    if (snapshot.screen === 'order' && snapshot.order)
      return orderScreen(snapshot.order, emit);
    return sitesScreen(snapshot, emit);
  }

  dispose(): void {
    this.#root.classList.remove('has-factory-screens');
    this.#page.remove();
  }
}

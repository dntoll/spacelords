import { button, element } from '../../../common/dom.js';
import type { Resource } from '../../models/Economy.js';
import {
  FACTORY_TIERS,
  type BuildOptionSnapshot,
  type FactoryRecommendation,
  type EscortHelp,
  type BuildScreenSnapshot,
  type ConnectScreenSnapshot,
  type FactoriesAction,
  type FactoriesSnapshot,
  type FactoryGroupSnapshot,
  type FactoryPlanetSnapshot,
  type FactorySiteSnapshot,
  type FactoryTier,
  type LinksScreenSnapshot,
  type MapPosition,
  type TransportOptionSnapshot,
} from '../../models/factories/FactoriesSnapshot.js';
import { BUILDING_SYMBOLS } from '../BuildingSymbols.js';
import { PLANET_IMAGES } from '../PlanetImages.js';

// Förenklad produktion: Skärm 1, Skärm 2, Connect-skärmen and the links in a
// group; befintliga-symboler-i-nya-vyer.

type Emit = (action: FactoriesAction) => void;
type Part = HTMLElement | SVGSVGElement;

const SVG = 'http://www.w3.org/2000/svg';

const rounds = (count: number): string =>
  `${count} ${count === 1 ? 'round' : 'rounds'}`;
const list = (items: readonly string[]): string => items.join(', ');
const short = (type: string): string => type.replace(' factory', '');

function tag(text: string, tone = ''): HTMLElement {
  return element('span', `factory-tag ${tone}`.trim(), text);
}

function symbol(source: string): HTMLImageElement {
  const image = element('img', 'factory-symbol');
  image.src = source;
  image.alt = '';
  image.decoding = 'async';
  return image;
}

function costText(cost: Readonly<Record<Resource, number>>): string {
  return (
    Object.entries(cost)
      .filter(([, amount]) => amount > 0)
      .map(([resource, amount]) => `${resource} ${amount}`)
      .join(' · ') || 'Free'
  );
}

function heading(title: string, subtitle: string, emit?: Emit): HTMLElement {
  const bar = element('header', 'factory-heading');
  const text = element('div', 'factory-heading-text');
  text.append(element('h1', '', title));
  if (subtitle) text.append(element('p', 'factory-muted', subtitle));
  if (emit)
    bar.append(
      button(
        'Back',
        () => emit({ kind: 'back' }),
        'secondary-button factory-back',
      ),
    );
  bar.append(text);
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
    max === min
      ? size / 2
      : pad + ((value - min) / (max - min)) * (size - pad * 2);
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
    line.setAttribute('class', `factory-edge${edge.dashed ? ' dashed' : ''}`);
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
  // uppgradera-delfabrik-i-factories
  if (factory.upgrading) return `Upgrading to ${short(factory.upgrading)}`;
  if (factory.upgrade) return `★ Upgrade to ${short(factory.upgrade)}`;
  switch (factory.status) {
    case 'working':
      return '';
    case 'idle':
      return factory.makesShips ? 'No orders' : 'Idle';
    case 'building':
      return `Building ${factory.roundsDone}/${factory.roundsTotal}`;
    case 'queued':
      return 'Queued';
    case 'producing':
      // delfabrik-i-produktion: part factories say how many they still make.
      if (factory.making > 0) return `Making ${factory.making}`;
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
  const tone = factory ? factory.status : site.kind;
  const node = element('button', `factory-site ${tone}`);
  node.type = 'button';
  if (site.kind === 'empty' || site.kind === 'dome') {
    node.append(
      element('span', 'factory-site-plus', '+'),
      element('span', '', site.kind === 'dome' ? 'Needs Dome' : 'Empty'),
    );
    node.setAttribute(
      'aria-label',
      site.kind === 'dome'
        ? `Site ${site.index + 1} on ${planet.name} needs a Dome`
        : `Empty site ${site.index + 1} on ${planet.name}`,
    );
  } else if (site.kind === 'locked') {
    node.append(element('span', '', 'Locked'));
    node.setAttribute('aria-label', `Locked site on ${planet.name}`);
    node.disabled = true;
  } else if (factory) {
    const status = siteStatus(site);
    node.append(
      symbol(BUILDING_SYMBOLS[factory.type]),
      element('span', 'factory-site-name', short(factory.type)),
    );
    if (status) node.append(element('span', 'factory-site-status', status));
    node.setAttribute(
      'aria-label',
      `${factory.type} on ${planet.name}${status ? `: ${status}` : ''}${
        factory.makesShips ? '. Order ships in Production' : ''
      }`,
    );
  }
  node.addEventListener('click', () =>
    emit({ kind: 'open-site', planet: planet.id, site: site.index }),
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
    element(
      'span',
      'factory-muted',
      `${list(planet.deposits) || 'No resources'}${summary}`,
    ),
    element('span', 'factory-chevron', planet.collapsed ? '▸' : '▾'),
  );
  toggle.addEventListener('click', () =>
    emit({ kind: 'toggle-planet', planet: planet.id }),
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
      : `${group.planets.length} planets · ${activeLinks} ${
          activeLinks === 1 ? 'link' : 'links'
        }`;
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
  if (group.canConnect) {
    const connect = button(
      'Connect',
      () => emit({ kind: 'open-connect', group: group.key }),
      'secondary-button factory-connect',
    );
    connect.setAttribute('aria-label', `Connect ${group.key}`);
    header.append(connect);
  }
  section.append(header);
  // rekommendation-i-menyn: one tap leads to a site for the first one.
  const first = group.recommended[0];
  if (first) {
    const recommended = button(
      `Recommended: ${list(group.recommended.map((item) => item.type))}`,
      () => emit({ kind: 'open-site', planet: first.planet, site: first.site }),
      'secondary-button factory-recommended-link',
    );
    section.append(recommended);
  }
  if (group.collapsed) return section;
  if (group.planets.length > 1)
    section.append(
      graph(
        group.planets.map((planet) => ({
          id: planet.id,
          label: planet.name,
          position: planet.position,
          radius: 9,
          image: PLANET_IMAGES[planet.environment],
          tone: 'own',
        })),
        group.links.map((link) => ({
          a: link.a,
          b: link.b,
          dashed: link.pending,
        })),
        96,
        `Links between ${group.key}`,
      ),
    );
  // eskort-pa-routes: the links and their escorts are one tap away.
  if (group.links.some((link) => !link.pending)) {
    const unescorted = group.unescortedLinks;
    const links = button(
      unescorted
        ? `${unescorted} ${unescorted === 1 ? 'link' : 'links'} without escort`
        : 'Links and escorts',
      () => emit({ kind: 'open-links', group: group.key }),
      `secondary-button factory-links${unescorted ? ' warning' : ''}`,
    );
    links.setAttribute('aria-label', `Links and escorts in ${group.key}`);
    section.append(links);
  }
  const counts = element('div', 'factory-counts');
  for (const count of group.counts) {
    const text = `${short(count.type)} ${count.built}${
      count.building > 0 ? ` +${count.building}` : ''
    }${count.missing.length > 0 ? ` · no ${list(count.missing)}` : ''}`;
    const chip = tag(text, count.missing.length > 0 ? 'danger' : '');
    chip.prepend(symbol(BUILDING_SYMBOLS[count.type]));
    counts.append(chip);
  }
  if (group.counts.length) section.append(counts);
  for (const planet of group.planets)
    section.append(planetSection(planet, emit));
  return section;
}

function sitesScreen(snapshot: FactoriesSnapshot, emit: Emit): Part[] {
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
  const receipt = snapshot.receipt;
  const confirmation = receipt
    ? element(
        'p',
        'factory-receipt',
        receipt.transport
          ? `${receipt.transport} now links ${receipt.from}–${receipt.to}.`
          : `Link ${receipt.from}–${receipt.to} is ordered. It opens when the Transport ship from ${receipt.builtAt ?? receipt.from} is ready.`,
      )
    : null;
  confirmation?.setAttribute('role', 'status');
  return [
    heading('Factories', 'Planets joined by transports share their goods.'),
    ...(confirmation ? [confirmation] : []),
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
  Parts: () => 'made when ships need them',
  Products: (build) => `ships appear at ${build.planet}`,
  Other: () => '',
};

function presenceText(option: BuildOptionSnapshot): string {
  if (option.presence === 'absent') return 'Not in group';
  const parts = [
    ...(option.inGroup > 0 ? [`${option.inGroup} in group`] : []),
    ...(option.buildingInGroup > 0
      ? [`${option.buildingInGroup} under construction`]
      : []),
  ];
  return `${parts.join(' + ')}${option.here > 0 ? ', here' : ''}`;
}

/** rekommenderade-fabriker: the sentence for why a factory comes first. */
function recommendationText(reason: FactoryRecommendation): string {
  switch (reason.kind) {
    case 'research':
      return 'Starts research';
    case 'extraction':
      return `No ${reason.resource} extraction in group`;
    case 'transport':
      return 'Links need a transport';
    case 'escort':
      return 'Armed ships to escort links';
    case 'terraforming':
      return 'Terraforms this planet';
    case 'colonization':
      return 'Colony ships for queued planets';
    case 'exploration':
      return 'Exploration ships for queued planets';
    case 'input':
      return `${reason.consumer} needs ${reason.material}`;
  }
}

function optionRow(
  build: BuildScreenSnapshot,
  option: BuildOptionSnapshot,
  locked: boolean,
  emit: Emit,
): HTMLElement {
  // fabriksstatus-i-byggval: the row's colour tells built, building or absent.
  const row = element(
    'div',
    `factory-option presence-${option.presence}${
      option.missingDeposit ? ' unavailable' : ''
    }`,
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
  // ny-fabrik-med-guldstjarna
  if (option.isNew) tags.append(tag('★ New', 'new'));
  for (const reason of option.recommendations)
    tags.append(tag(recommendationText(reason), 'recommended'));
  tags.append(
    tag(presenceText(option), `presence-${option.presence}`),
    tag(`Build ${rounds(option.buildRounds)}`, 'time'),
  );
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
  row.append(body);
  if (!locked) {
    const action = option.shortage.length > 0 ? 'Queue' : 'Build';
    const actionButton = button(
      action,
      () => emit({ kind: 'build', type: option.type }),
      'button factory-action',
    );
    actionButton.setAttribute('aria-label', `${action} ${option.type}`);
    row.append(actionButton);
  }
  return row;
}

function buildScreen(
  build: BuildScreenSnapshot,
  locked: boolean,
  emit: Emit,
): Part[] {
  const stock = element(
    'p',
    'factory-stock',
    `${Object.entries(build.stock)
      .map(([resource, amount]) => `${resource} ${amount}`)
      .join(' · ')} · Workers ${build.workers}`,
  );
  // rekommenderade-fabriker: what the group needs now comes first.
  // terraformering-forst: terraforming leads the recommendations.
  const terraforms = (entry: BuildOptionSnapshot) =>
    entry.recommendations.some((reason) => reason.kind === 'terraforming');
  const recommended = build.options
    .filter((entry) => entry.recommendations.length > 0)
    .sort((a, b) => Number(terraforms(b)) - Number(terraforms(a)));
  const recommendedSection = element(
    'section',
    'factory-tier factory-recommended',
  );
  recommendedSection.append(element('h2', '', 'Recommended'));
  for (const option of recommended)
    recommendedSection.append(optionRow(build, option, locked, emit));
  const tierSections = FACTORY_TIERS.flatMap((tier) => {
    const options = build.options.filter(
      (entry) => entry.tier === tier && !entry.recommendations.length,
    );
    if (!options.length) return [];
    const section = element('section', 'factory-tier');
    const hint = TIER_HINT[tier](build);
    section.append(element('h2', '', hint ? `${tier} · ${hint}` : tier));
    for (const option of options)
      section.append(optionRow(build, option, locked, emit));
    return [section];
  });
  const sections = [
    ...(recommended.length ? [recommendedSection] : []),
    ...tierSections,
  ];
  return [
    heading(
      `${build.planet} · site ${build.siteIndex + 1}`,
      `Group ${list(build.group)}`,
      emit,
    ),
    stock,
    ...(build.project
      ? [
          element('p', 'factory-muted', `${build.project} is queued here.`),
          ...(locked
            ? []
            : [
                button(
                  'Cancel construction',
                  () => emit({ kind: 'cancel-site' }),
                  'secondary-button factory-action',
                ),
              ]),
        ]
      : []),
    ...(build.upgrade ? upgradePart(build.upgrade, locked, emit) : []),
    ...(build.research
      ? [
          element(
            'p',
            'factory-notice',
            `Research ${build.research} to prepare this site.`,
          ),
        ]
      : []),
    ...(sections.length || build.project || build.upgrade
      ? sections
      : [element('p', 'factory-muted', 'Nothing can be built here yet.')]),
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
        : `Build at ${option.choice.planet}`;
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

function connectScreen(
  connect: ConnectScreenSnapshot,
  locked: boolean,
  emit: Emit,
): Part[] {
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
      // lankar-bara-i-grupper: only a group of planets has links inside.
      ...(node.own && node.planets.length > 1
        ? { onClick: () => emit({ kind: 'open-links' }) }
        : {}),
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
  if (connect.needsResearch)
    proposals.append(
      element('p', 'factory-notice', 'Research Trade logistics to connect.'),
    );
  if (connect.proposals.length === 0)
    proposals.append(
      element('p', 'factory-muted', 'No other groups to connect.'),
    );
  for (const proposal of connect.proposals) {
    const row = element('div', 'factory-option');
    const body = element('div', 'factory-option-body');
    const name = `${proposal.target[0] ?? ''}${
      proposal.target.length > 1 ? ` +${proposal.target.length - 1}` : ''
    }`;
    body.append(
      element('div', 'factory-option-title', name),
      element('p', 'factory-muted', `${proposal.from}–${proposal.to}`),
    );
    const tags = element('div', 'factory-tags');
    for (const problem of proposal.unblocks)
      tags.append(
        tag(`Brings ${problem.material} to ${problem.planet}`, 'success'),
      );
    for (const material of proposal.adds) tags.append(tag(`Adds ${material}`));
    if (proposal.canBuildTransports)
      tags.append(tag('Builds transports', 'time'));
    body.append(tags);
    row.append(body);
    if (!locked && !connect.needsResearch && connect.transports.length) {
      const action = button(
        'Connect',
        () => emit({ kind: 'connect', target: proposal.targetKey }),
        'button factory-action',
      );
      action.setAttribute('aria-label', `Connect ${name}`);
      row.append(action);
    }
    proposals.append(row);
  }
  return [
    heading(`Connect ${list(connect.group)}`, '', emit),
    graph(nodes, edges, 190, 'Groups placed by their position on the map'),
    element('p', 'factory-muted', 'Tap your group to see the links inside it.'),
    proposals,
    transportPicker(connect.transports, emit),
  ];
}

/** eskort-pa-routes: free armed fleets, nearest first. */
function escortPicker(
  escort: NonNullable<LinksScreenSnapshot['escort']>,
  title: string,
  locked: boolean,
  emit: Emit,
): HTMLElement {
  const section = element('div', 'factory-escorts');
  section.append(
    element(
      'p',
      'factory-muted',
      'Armed ships join the transports and travel there if needed.',
    ),
  );
  for (const fleet of escort.fleets) {
    const row = element('div', 'factory-option');
    const body = element('div', 'factory-option-body');
    body.append(element('div', 'factory-option-title', fleet.name));
    const tags = element('div', 'factory-tags');
    tags.append(
      tag(`${fleet.armed} armed ${fleet.armed === 1 ? 'ship' : 'ships'}`),
      tag(
        fleet.distance === 0
          ? 'Here'
          : `${fleet.distance} ${fleet.distance === 1 ? 'hex' : 'hexes'} away`,
        'time',
      ),
    );
    body.append(tags);
    row.append(body);
    if (!locked) {
      const assign = button(
        'Assign',
        () => emit({ kind: 'assign-escort', fleet: fleet.fleetId }),
        'button factory-action',
      );
      assign.setAttribute('aria-label', `Assign ${fleet.name} to ${title}`);
      row.append(assign);
    }
    section.append(row);
  }
  return section;
}

function linksScreen(
  links: LinksScreenSnapshot,
  locked: boolean,
  emit: Emit,
): Part[] {
  const wrapper = element('div', 'factory-graph-wrap');
  wrapper.append(
    graph(
      links.planets.map((planet) => ({
        id: planet.id,
        label: planet.name,
        position: planet.position,
        radius: 12,
        tone: planet.picked ? 'picked' : 'own',
        onClick: () => emit({ kind: 'pick-planet', planet: planet.id }),
      })),
      links.links.map((link) => ({
        a: link.a,
        b: link.b,
        dashed: link.transport === null,
      })),
      170,
      `Links inside ${list(links.group)}`,
    ),
  );
  const content: Part[] = [
    heading('Links inside', list(links.group), emit),
    wrapper,
    element('p', 'factory-muted', 'Tap two planets for an extra link.'),
  ];
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
    if (!locked && !links.pick.alreadyLinked && links.transports.length)
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
        `Moving ${links.pendingMove.transport} splits ${list(
          links.pendingMove.splitOff,
        )} from the group.`,
      ),
      button('Move anyway', () => emit({ kind: 'confirm-move' })),
      button('Cancel', () => emit({ kind: 'cancel-move' }), 'secondary-button'),
    );
    content.push(warning);
  }
  const current = element('section', 'factory-proposals');
  current.append(element('h2', '', 'Current links'));
  if (!links.links.length)
    current.append(element('p', 'factory-muted', 'No links yet.'));
  for (const link of links.links) {
    const row = element('div', 'factory-option');
    const body = element('div', 'factory-option-body');
    const title = `${link.aName}–${link.bName}`;
    body.append(
      element('div', 'factory-option-title', title),
      element(
        'p',
        'factory-muted',
        link.transport ?? 'Waiting for a transport',
      ),
    );
    if (link.transport) {
      const tags = element('div', 'factory-tags');
      tags.append(
        link.escorts
          ? tag(
              `Escort: ${link.escorts} armed ${
                link.escorts === 1 ? 'ship' : 'ships'
              }`,
              'success',
            )
          : tag('No escort', 'danger'),
      );
      body.append(tags);
    }
    // vagledning-mot-eskort: say what to do next for an unescorted link.
    if (link.escortHelp)
      body.append(
        element('p', 'factory-notice', escortHelpText(link.escortHelp)),
      );
    row.append(body);
    // bestall-eskort-pa-lanken: order the escort, or go to build its factory.
    const help = link.escortHelp;
    if (!locked && help?.kind === 'build-ship') {
      const order = button(
        `Order ${help.ship}`,
        () =>
          emit({ kind: 'order-escort', link: link.id, planet: help.planetId }),
        'button factory-action',
      );
      order.setAttribute(
        'aria-label',
        `Order a ${help.ship} at ${help.planet} to escort ${title}`,
      );
      row.append(order);
    }
    if (!locked && help?.kind === 'build-factory' && help.site) {
      const site = help.site;
      const build = button(
        'Build factory',
        () =>
          emit({ kind: 'open-site', planet: site.planet, site: site.index }),
        'button factory-action',
      );
      build.setAttribute('aria-label', 'Build a Fighter factory');
      row.append(build);
    }
    if (!locked && link.canEscort) {
      const escort = button(
        'Escort',
        () => emit({ kind: 'escort-link', link: link.id }),
        'secondary-button factory-action',
      );
      escort.setAttribute('aria-label', `Escort ${title}`);
      escort.setAttribute(
        'aria-expanded',
        String(links.escort?.routeId === link.id),
      );
      row.append(escort);
    }
    if (!locked && link.transport) {
      const move = button(
        'Move',
        () => emit({ kind: 'move-link', link: link.id }),
        'secondary-button factory-action',
      );
      move.setAttribute('aria-label', `Move ${link.transport} from ${title}`);
      row.append(move);
    }
    current.append(row);
    if (links.escort?.routeId === link.id)
      current.append(escortPicker(links.escort, title, locked, emit));
  }
  content.push(current);
  return content;
}

export class FactoriesView {
  readonly #host: HTMLElement;
  readonly #emit: Emit;
  readonly #page = element('div', 'factory-screens');
  #screenKey = '';

  constructor(host: HTMLElement, emit: Emit) {
    this.#host = host;
    this.#emit = emit;
  }

  render(snapshot: FactoriesSnapshot, notice: string | null = null): void {
    const key = `${snapshot.screen}:${snapshot.build?.planetId ?? ''}:${
      snapshot.build?.siteIndex ?? ''
    }:${snapshot.connect?.group.join() ?? ''}`;
    const scroll = key === this.#screenKey ? this.#page.scrollTop : 0;
    this.#screenKey = key;
    if (this.#page.parentElement !== this.#host)
      this.#host.replaceChildren(this.#page);
    this.#page.replaceChildren(...this.#content(snapshot));
    if (notice) {
      const message = element('p', 'factory-notice', notice);
      message.setAttribute('role', 'status');
      this.#page.prepend(message);
    }
    this.#page.scrollTop = scroll;
  }

  #content(snapshot: FactoriesSnapshot): Part[] {
    const emit = this.#emit;
    if (snapshot.screen === 'build' && snapshot.build)
      return buildScreen(snapshot.build, snapshot.locked, emit);
    if (snapshot.screen === 'connect' && snapshot.connect)
      return connectScreen(snapshot.connect, snapshot.locked, emit);
    if (snapshot.screen === 'links' && snapshot.links)
      return linksScreen(snapshot.links, snapshot.locked, emit);
    return sitesScreen(snapshot, emit);
  }

  dispose(): void {
    this.#page.remove();
  }
}

/** uppgradera-delfabrik-i-factories: replace a factory with its successor. */
function upgradePart(
  upgrade: NonNullable<BuildScreenSnapshot['upgrade']>,
  locked: boolean,
  emit: Emit,
): Part[] {
  if (upgrade.queued)
    return [
      element(
        'p',
        'factory-muted',
        `${upgrade.from} is being upgraded to ${upgrade.to}.`,
      ),
      ...(locked
        ? []
        : [
            button(
              'Cancel upgrade',
              () => emit({ kind: 'cancel-site' }),
              'secondary-button factory-action',
            ),
          ]),
    ];
  const action = button(
    `Upgrade to ${upgrade.to}`,
    () => emit({ kind: 'upgrade' }),
    'button factory-action',
  );
  action.disabled = locked || upgrade.blockedReason !== null;
  return [
    element(
      'p',
      'factory-muted',
      `${upgrade.to} replaces ${upgrade.from} on this site and makes the better part.`,
    ),
    action,
    ...(upgrade.blockedReason
      ? [element('p', 'factory-notice', upgrade.blockedReason)]
      : []),
  ];
}

/** vagledning-mot-eskort: the sentence for the next step towards an escort. */
function escortHelpText(help: EscortHelp): string {
  switch (help.kind) {
    case 'assign':
      return 'Tap Escort and choose a free armed fleet to guard this link.';
    case 'build-ship':
      return `Order a ${help.ship} at ${help.planet}; it escorts this link when built.`;
    case 'ordered':
      return `A ${help.ship} is ordered at ${help.planet} to escort this link.`;
    case 'build-factory':
      return help.site
        ? 'Build a Fighter factory to make armed ships for an escort.'
        : 'Build a Fighter factory on a free site to make armed ships for an escort.';
    case 'research':
      return `Research ${help.technologies.join(', then ')} to build armed ships for an escort.`;
  }
}

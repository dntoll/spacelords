import type { AppReadModel } from '../models/AppModel.js';
import type { TradeRouteSnapshot } from '../models/Logistics.js';
import {
  TradeGraphLayout,
  tradeAssignmentIssue,
} from '../models/TradeGraph.js';
import type { IntentHandler } from './ViewContracts.js';
import { bindDiagramNavigation } from './DiagramNavigation.js';
import {
  renderTradePlanet,
  renderTradePlanetTitle,
  renderTradePlanetDetails,
} from './TradePlanetView.js';
import {
  renderTradeFleet,
  renderTradeAssignment,
  renderTradeShipLocation,
} from './TradeFleetView.js';
import { TradeGraphPresentation } from '../models/TradeGraphPresentation.js';
import { button, element } from './dom.js';

const svgNamespace = 'http://www.w3.org/2000/svg';
const presentations = new WeakMap<
  HTMLElement,
  {
    zoom: number;
    width: number;
    height: number;
    offset: Readonly<{ x: number; y: number }>;
    layout: TradeGraphPresentation;
  }
>();

export function renderTradeRoutes(
  model: AppReadModel,
  emit: IntentHandler,
): HTMLElement {
  const page = element('section', 'trade-graph-page');
  page.dataset.routeId = model.tradeGraph.routeId ?? '';
  page.dataset.selection =
    model.tradeGraph.fleetId ??
    model.tradeGraph.routeId ??
    model.tradeGraph.planets.at(-1) ??
    '';
  const header = element('div', 'screen-header');
  header.append(
    element('h1', '', 'Trade routes'),
    button('Back to map', () => emit({ type: 'open-map' }), 'back-button'),
  );
  const toolbar = element('div', 'trade-graph-toolbar');
  const chosen = model.tradeGraph.planets
    .map((id) => model.ownedPlanets.find((p) => p.id === id))
    .filter((p) => !!p);
  const unlocked = model.research.completed.includes('Trade logistics');
  const existing =
    chosen.length === 2 &&
    model.tradeRoutes.some(
      (r) =>
        [r.a, r.b].includes(chosen[0]!.id) &&
        [r.a, r.b].includes(chosen[1]!.id),
    );
  const connection = element(
    'p',
    'trade-connection',
    chosen.length
      ? chosen.map((p) => p.name).join(' ↔ ')
      : 'Select two planets to connect',
  );
  const create = button('Create trade route', () =>
    emit({ type: 'create-trade-route', a: chosen[0]!.id, b: chosen[1]!.id }),
  );
  create.textContent = '+ Route';
  create.disabled =
    !unlocked ||
    chosen.length !== 2 ||
    !!existing ||
    model.phase !== 'planning';
  create.title = existing
    ? 'These planets already have a route'
    : 'Connect the two selected planets';
  toolbar.append(connection, create);
  if (!unlocked)
    toolbar.append(
      element(
        'p',
        'muted-note',
        'Research Trade logistics to connect your planets.',
      ),
    );
  const workspace = element('div', 'trade-graph-workspace');
  const area = element('div', 'trade-graph-area');
  const viewport = element('div', 'trade-graph-viewport');
  viewport.tabIndex = 0;
  viewport.setAttribute('role', 'region');
  viewport.setAttribute('aria-label', 'Trade network');
  viewport.setAttribute(
    'aria-description',
    'Drag to pan. Scroll or pinch to zoom. Select two planets to create a route. Select a link to assign fleets. Arrow keys pan; plus and minus zoom; 0 fits the network.',
  );
  const stage = element('div', 'trade-graph-stage');
  const layout = new TradeGraphLayout(
    model.ownedPlanets,
    model.fleets,
    model.tradeRoutes,
  );
  const svg = document.createElementNS(svgNamespace, 'svg');
  svg.classList.add('trade-graph-links');
  svg.style.left = `${layout.bounds.x}px`;
  svg.style.top = `${layout.bounds.y}px`;
  svg.setAttribute('width', String(layout.bounds.width));
  svg.setAttribute('height', String(layout.bounds.height));
  svg.setAttribute(
    'viewBox',
    `${layout.bounds.x} ${layout.bounds.y} ${layout.bounds.width} ${layout.bounds.height}`,
  );
  for (const route of model.tradeRoutes) {
    const start = TradeGraphLayout.point(route.start),
      end = TradeGraphLayout.point(route.end);
    const line = document.createElementNS(svgNamespace, 'line');
    line.setAttribute('x1', String(start.x));
    line.setAttribute('y1', String(start.y));
    line.setAttribute('x2', String(end.x));
    line.setAttribute('y2', String(end.y));
    line.classList.add('trade-route-line');
    line.setAttribute('vector-effect', 'non-scaling-stroke');
    line.classList.toggle(
      'selected-route',
      route.id === model.tradeGraph.routeId,
    );
    line.classList.toggle('closing-route', route.closing);
    line.dataset.routeId = route.id;
    line.setAttribute('role', 'button');
    line.setAttribute('tabindex', '0');
    line.setAttribute(
      'aria-label',
      `Select route ${route.from} to ${route.to}`,
    );
    line.addEventListener('pointerdown', (event) => event.stopPropagation());
    line.addEventListener('click', () =>
      emit({ type: 'trade-select-route', id: route.id }),
    );
    line.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        emit({ type: 'trade-select-route', id: route.id });
      }
    });
    svg.append(line);
  }
  for (const fleet of layout.fleets) {
    if (!fleet.anchor) continue;
    const leader = document.createElementNS(svgNamespace, 'line');
    leader.classList.add('trade-fleet-leader');
    leader.dataset.objectKey = `fleet:${fleet.id}`;
    leader.setAttribute('vector-effect', 'non-scaling-stroke');
    leader.setAttribute('x1', String(fleet.anchor.x));
    leader.setAttribute('y1', String(fleet.anchor.y));
    leader.setAttribute('x2', String(fleet.x));
    leader.setAttribute('y2', String(fleet.y + 45));
    leader.setAttribute('aria-hidden', 'true');
    svg.append(leader);
  }
  for (const route of layout.routes) {
    const leader = document.createElementNS(svgNamespace, 'line');
    leader.classList.add('trade-fleet-leader');
    leader.dataset.objectKey = `route:${route.id}`;
    leader.setAttribute('vector-effect', 'non-scaling-stroke');
    leader.setAttribute('x1', String(route.anchor.x));
    leader.setAttribute('y1', String(route.anchor.y));
    leader.setAttribute('x2', String(route.x + 110));
    leader.setAttribute('y2', String(route.y + 110));
    leader.setAttribute('aria-hidden', 'true');
    svg.append(leader);
  }
  stage.append(svg);
  for (const node of layout.planets) {
    const planet = model.ownedPlanets.find((p) => p.id === node.id)!;
    const card = renderTradePlanet(planet, model, emit);
    card.dataset.objectKey = `planet:${planet.id}`;
    card.style.left = `${node.x - TradeGraphLayout.planetWidth / 2}px`;
    card.style.top = `${node.y - TradeGraphLayout.planetHeight / 2}px`;
    stage.append(card);
    const name = renderTradePlanetTitle(planet, model, emit);
    name.dataset.objectKey = `name:${planet.id}`;
    stage.append(name);
  }
  for (const route of model.tradeRoutes) {
    const placement = layout.routes.find((r) => r.id === route.id)!;
    const dock = renderRouteDock(route, model, emit);
    dock.dataset.objectKey = `route:${route.id}`;
    dock.style.left = `${placement.x}px`;
    dock.style.top = `${placement.y}px`;
    stage.append(dock);
  }
  for (const node of layout.fleets) {
    const fleet = model.fleets.find((f) => f.id === node.id)!;
    const marker = renderTradeFleet(fleet, model, emit, 'marker');
    marker.dataset.objectKey = `fleet:${fleet.id}`;
    marker.classList.add('diagram-card');
    marker.style.left = `${node.x}px`;
    marker.style.top = `${node.y}px`;
    stage.append(marker);
  }
  for (const fleet of model.fleets) {
    if (
      !fleet.position ||
      !Object.values(fleet.ships).some((count) => count > 0)
    )
      continue;
    const ships = renderTradeShipLocation(fleet, model, emit);
    ships.dataset.objectKey = `ships:${fleet.id}`;
    stage.append(ships);
    const leader = document.createElementNS(svgNamespace, 'line');
    leader.classList.add('trade-fleet-leader');
    leader.dataset.objectKey = `ships:${fleet.id}`;
    leader.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.append(leader);
  }
  viewport.append(stage);
  bindDiagramNavigation(
    viewport,
    {
      pan: (delta) => emit({ type: 'trade-pan', delta }),
      zoom: (factor, anchor) => emit({ type: 'trade-zoom', factor, anchor }),
      fit: () => emit({ type: 'trade-fit' }),
      start: (id, point) => emit({ type: 'trade-pointer-start', id, point }),
      move: (id, point) => emit({ type: 'trade-pointer-move', id, point }),
      end: (id, point) => emit({ type: 'trade-pointer-end', id, point }),
      cancel: () => emit({ type: 'trade-pointer-cancel' }),
    },
    '.diagram-card, .trade-route-line',
  );
  const controls = element('div', 'trade-graph-controls');
  const zoom = (factor: number) =>
    emit({
      type: 'trade-zoom',
      factor,
      anchor: { x: viewport.clientWidth / 2, y: viewport.clientHeight / 2 },
    });
  const out = button(
    'Zoom out trade network',
    () => zoom(0.8),
    'button secondary-button graph-icon',
  );
  out.textContent = '−';
  const into = button(
    'Zoom in trade network',
    () => zoom(1.25),
    'button secondary-button graph-icon',
  );
  into.textContent = '+';
  const fit = button(
    'Fit trade network',
    () => emit({ type: 'trade-fit' }),
    'button secondary-button graph-icon',
  );
  fit.textContent = '⤢';
  for (const control of [out, into, fit])
    control.title = control.getAttribute('aria-label')!;
  const output = element('output', 'trade-graph-zoom', '100%');
  output.setAttribute('aria-label', 'Trade network zoom');
  controls.append(
    out,
    output,
    into,
    fit,
    element('span', 'trade-graph-hint', 'Drag · Pinch / scroll'),
  );
  area.append(viewport, controls);
  workspace.append(area, renderSelectionPanel(model, emit));
  page.append(header, toolbar, workspace);
  return page;
}

export function updateTradeCamera(
  root: HTMLElement,
  model: AppReadModel,
): void {
  const camera = model.tradeGraph.camera;
  const stage = root.querySelector<HTMLElement>('.trade-graph-stage');
  if (stage)
    stage.style.transform = `translate(${camera.offset.x}px, ${camera.offset.y}px) scale(${camera.zoom})`;
  if (stage) {
    const viewport = stage.parentElement!;
    let presentation = presentations.get(stage);
    if (
      !presentation ||
      presentation.zoom !== camera.zoom ||
      presentation.width !== viewport.clientWidth ||
      presentation.height !== viewport.clientHeight
    ) {
      presentation = {
        zoom: camera.zoom,
        width: viewport.clientWidth,
        height: viewport.clientHeight,
        offset: camera.offset,
        layout: new TradeGraphPresentation(
          new TradeGraphLayout(
            model.ownedPlanets,
            model.fleets,
            model.tradeRoutes,
          ),
          model.fleets,
          camera,
        ),
      };
      presentations.set(stage, presentation);
    }
    const nodes = new Map(
      Array.from(stage.querySelectorAll<HTMLElement>('.diagram-card')).map(
        (node) => [node.dataset.objectKey, node],
      ),
    );
    const leaders = new Map(
      Array.from(
        stage.querySelectorAll<SVGLineElement>('.trade-fleet-leader'),
      ).map((line) => [line.dataset.objectKey, line]),
    );
    for (const placement of presentation.layout.objects) {
      const object = {
        ...placement,
        x: placement.x + camera.offset.x - presentation.offset.x,
        y: placement.y + camera.offset.y - presentation.offset.y,
      };
      const node = nodes.get(object.key)!;
      node.style.left = `${(object.x - camera.offset.x) / camera.zoom}px`;
      node.style.top = `${(object.y - camera.offset.y) / camera.zoom}px`;
      const planet = object.key.startsWith('planet:');
      node.style.width = `${planet ? TradeGraphPresentation.planetWidth : object.width}px`;
      node.style.height = `${planet ? TradeGraphPresentation.planetHeight : object.height}px`;
      node.style.transform = planet ? '' : `scale(${1 / camera.zoom})`;
      node.style.transformOrigin = '0 0';
      const location = object.anchor;
      const locatedFleet =
        object.key.startsWith('fleet:') || object.key.startsWith('ships:');
      const visible =
        !locatedFleet ||
        !location ||
        (location.x * camera.zoom + camera.offset.x >= 0 &&
          location.x * camera.zoom + camera.offset.x <= viewport.clientWidth &&
          location.y * camera.zoom + camera.offset.y >= 0 &&
          location.y * camera.zoom + camera.offset.y <= viewport.clientHeight);
      node.hidden = !visible;
      const leader = leaders.get(object.key);
      if (leader) leader.style.display = visible ? '' : 'none';
      if (leader && object.anchor) {
        leader.setAttribute('x1', String(object.anchor.x));
        leader.setAttribute('y1', String(object.anchor.y));
        leader.setAttribute(
          'x2',
          String((object.x + object.width / 2 - camera.offset.x) / camera.zoom),
        );
        leader.setAttribute(
          'y2',
          String(
            (object.y + object.height / 2 - camera.offset.y) / camera.zoom,
          ),
        );
      }
    }
  }
  const output = root.querySelector('.trade-graph-zoom');
  if (output) output.textContent = `${Math.round(camera.zoom * 100)}%`;
}

function renderRouteDock(
  route: TradeRouteSnapshot,
  model: AppReadModel,
  emit: IntentHandler,
): HTMLElement {
  const dock = element('article', 'trade-route-dock diagram-card');
  dock.dataset.routeId = route.id;
  dock.setAttribute('aria-label', `${route.from} to ${route.to}`);
  dock.classList.toggle(
    'selected-route',
    route.id === model.tradeGraph.routeId,
  );
  const choose = button(
    `Assign fleets to ${route.from} to ${route.to}`,
    () => emit({ type: 'trade-select-route', id: route.id }),
    'trade-route-name',
  );
  choose.textContent = `${route.from} ↔ ${route.to}`;
  dock.append(
    choose,
    element(
      'p',
      'trade-route-capacity',
      `${route.capacity} cargo capacity · ${route.waiting} waiting`,
    ),
  );
  const fleets = element('div', 'trade-route-fleets');
  for (const id of route.fleetIds) {
    const fleet = model.fleets.find((f) => f.id === id);
    if (fleet) fleets.append(renderTradeFleet(fleet, model, emit, 'dock'));
  }
  if (!route.fleetIds.length)
    fleets.append(element('p', 'muted-note', 'No fleet assigned'));
  const add = button(
    `Select ${route.from} to ${route.to} for assignment`,
    () => emit({ type: 'trade-select-route', id: route.id }),
    'button secondary-button',
  );
  add.textContent = '+ Fleet';
  add.disabled = route.closing || model.phase !== 'planning';
  dock.append(fleets, add);
  dock.addEventListener('dragover', (event) => {
    if (event.dataTransfer?.types.includes('application/x-spacelords-fleet')) {
      event.preventDefault();
      dock.classList.add('fleet-drop-target');
    }
  });
  dock.addEventListener('dragleave', () =>
    dock.classList.remove('fleet-drop-target'),
  );
  dock.addEventListener('drop', (event) => {
    event.preventDefault();
    dock.classList.remove('fleet-drop-target');
    const id = event.dataTransfer?.getData('application/x-spacelords-fleet');
    const fleet = model.fleets.find((f) => f.id === id);
    if (
      fleet &&
      model.phase === 'planning' &&
      !tradeAssignmentIssue(fleet, route)
    )
      emit({
        type: 'assign-trade-fleet',
        routeId: route.id,
        fleetId: fleet.id,
      });
  });
  return dock;
}

function renderSelectionPanel(
  model: AppReadModel,
  emit: IntentHandler,
): HTMLElement {
  const panel = element('aside', 'trade-selection-panel');
  panel.setAttribute('aria-label', 'Selected object');
  const planet = model.ownedPlanets.find(
    (p) => p.id === model.tradeGraph.planets.at(-1),
  );
  const fleet = model.fleets.find((f) => f.id === model.tradeGraph.fleetId);
  const route = model.tradeRoutes.find(
    (r) => r.id === model.tradeGraph.routeId,
  );
  if (planet) panel.append(renderTradePlanetDetails(planet));
  else if (fleet) {
    panel.append(renderTradeFleet(fleet, model, emit, 'details'));
    if (!fleet.routeId) {
      panel.append(element('h3', '', 'Assign to route'));
      for (const candidate of model.tradeRoutes)
        panel.append(
          renderTradeAssignment(
            fleet,
            candidate,
            model,
            emit,
            `${candidate.from} ↔ ${candidate.to}`,
          ),
        );
      if (!model.tradeRoutes.length)
        panel.append(
          element('p', 'muted-note', 'Connect two planets to create a route.'),
        );
    }
  } else if (route) {
    panel.append(
      element('h2', '', `${route.from} ↔ ${route.to}`),
      element(
        'p',
        'trade-route-status',
        `${route.status} · ${route.capacity} cargo capacity · ${route.waiting} units waiting`,
      ),
    );
    const close = button(
      'Close route',
      () => emit({ type: 'close-trade-route', id: route.id }),
      'button secondary-button',
    );
    close.disabled = route.closing || model.phase !== 'planning';
    panel.append(
      close,
      element('h3', '', `Assigned fleets · ${route.fleetIds.length}`),
    );
    const assigned = element('div', 'trade-assigned-fleets');
    for (const id of route.fleetIds) {
      const assignedFleet = model.fleets.find((f) => f.id === id);
      if (assignedFleet)
        assigned.append(
          renderTradeFleet(assignedFleet, model, emit, 'route-details'),
        );
    }
    if (!route.fleetIds.length)
      assigned.append(element('p', 'muted-note', 'No fleet assigned'));
    panel.append(assigned, element('h3', '', 'Assign fleet'));
    for (const candidate of model.fleets.filter((f) => !f.routeId))
      panel.append(
        renderTradeAssignment(candidate, route, model, emit, candidate.name),
      );
    if (!model.fleets.some((f) => !f.routeId))
      panel.append(
        element(
          'p',
          'muted-note',
          'No unassigned fleets. Select a fleet on the route to inspect it.',
        ),
      );
  } else {
    panel.append(
      element('h2', '', 'Selection'),
      element(
        'p',
        'muted-note',
        'Select a planet, fleet or route to inspect it. Select two planets to connect them. Drag a fleet box onto a route or use Assign.',
      ),
    );
  }
  return panel;
}

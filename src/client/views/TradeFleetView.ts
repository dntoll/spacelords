import type { AppReadModel } from '../models/AppModel.js';
import type { FleetSnapshot } from '../models/Game.js';
import type { TradeRouteSnapshot } from '../models/Logistics.js';
import {
  TradeGraphLayout,
  tradeAssignmentIssue,
} from '../models/TradeGraph.js';
import type { IntentHandler } from './ViewContracts.js';
import { SHIP_TYPES, shipImage } from './ShipView.js';
import { fleetAssignmentLabel } from './FleetView.js';
import { button, element } from './dom.js';

export function renderTradeFleet(
  fleet: FleetSnapshot,
  model: AppReadModel,
  emit: IntentHandler,
  mode: 'details' | 'route-details' | 'marker' | 'dock',
  context: 'map' | 'graph' = 'graph',
): HTMLElement {
  const card = element(
    'article',
    `fleet-card trade-fleet-box trade-fleet-${mode}`,
  );
  card.dataset.fleetId = fleet.id;
  card.setAttribute('aria-label', `Trade fleet ${fleet.name} ${mode}`);
  card.classList.toggle(
    'selected-fleet-card',
    (context === 'map' ? model.mapFleetId : model.tradeGraph.fleetId) ===
      fleet.id,
  );
  const name = button(
    `Select trade fleet ${fleet.name}`,
    () =>
      emit({
        type: context === 'map' ? 'map-select-fleet' : 'trade-select-fleet',
        id: fleet.id,
      }),
    'fleet-name-button',
  );
  name.textContent = fleet.name;
  name.setAttribute(
    'aria-pressed',
    String(
      (context === 'map' ? model.mapFleetId : model.tradeGraph.fleetId) ===
        fleet.id,
    ),
  );
  const ships = element('div', 'trade-ship-manifest');
  ships.setAttribute('role', 'group');
  ships.setAttribute('aria-label', `Ships in ${fleet.name}`);
  for (const type of SHIP_TYPES) {
    const count = fleet.ships[type];
    if (!count) continue;
    const token = element('figure', 'ship-portrait trade-ship-token');
    token.dataset.ship = type;
    token.title = `${count} ${type}`;
    token.append(
      shipImage(type),
      element('figcaption', 'trade-ship-count', String(count)),
      element('span', 'ship-token-label', type),
    );
    ships.append(token);
  }
  if (!ships.children.length)
    ships.append(element('p', 'muted-note', 'No ships'));
  const location = fleet.position
    ? model.ownedPlanets.find((p) => p.position.key === fleet.position!.key)
        ?.name
    : null;
  const coordinates = fleet.position
    ? `HEX ${fleet.position.q}, ${fleet.position.r}`
    : 'No position';
  const position = `${location ? `${location} · ` : ''}${coordinates}${fleet.destination ? ` → HEX ${fleet.destination.q}, ${fleet.destination.r}` : ''}`;
  card.append(
    mode === 'details' ? element('h2', '', fleet.name) : name,
    ships,
    element('p', 'trade-fleet-position', position),
  );
  if (mode === 'details' || mode === 'route-details') {
    const assignment = fleetAssignmentLabel(fleet, model);
    if (assignment)
      card.append(element('p', 'trade-fleet-assignment', assignment));
    const cargo = Object.entries(fleet.cargo ?? {})
      .filter(([, amount]) => amount > 0)
      .map(([material, amount]) => `${amount} ${material}`)
      .join(', ');
    card.append(
      element('p', 'trade-cargo', cargo ? `Cargo: ${cargo}` : 'Empty hold'),
    );
    if (fleet.position && context === 'graph') {
      const focus = button(
        `Locate ${fleet.name}`,
        () =>
          emit({
            type: 'trade-focus',
            point: TradeGraphLayout.point(fleet.position!),
          }),
        'button secondary-button',
      );
      focus.textContent = '⌖';
      focus.title = `Locate ${fleet.name} on graph`;
      card.append(focus);
    }
  }
  if (fleet.routeId && mode !== 'marker') {
    const release = button(
      fleet.releaseRequested ? 'Release pending' : `Release ${fleet.name}`,
      () => emit({ type: 'release-trade-fleet', id: fleet.id }),
      'button secondary-button',
    );
    release.textContent = fleet.releaseRequested ? 'Release pending' : '×';
    release.title = 'Leave route after the current trip and unloading';
    release.disabled = !!fleet.releaseRequested || model.phase !== 'planning';
    card.append(release);
  }
  card.draggable =
    !fleet.routeId &&
    !fleet.joinFleetId &&
    !fleet.destination &&
    fleet.ships['Transport ship'] > 0 &&
    model.phase === 'planning';
  card.addEventListener('dragstart', (event) => {
    event.dataTransfer?.setData('application/x-spacelords-fleet', fleet.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  });
  return card;
}

export function renderTradeShipLocation(
  fleet: FleetSnapshot,
  model: AppReadModel,
  emit: IntentHandler,
): HTMLElement {
  const marker = button(
    `Select ships of ${fleet.name}`,
    () => emit({ type: 'trade-select-fleet', id: fleet.id }),
    'trade-ship-location diagram-card',
  );
  marker.dataset.fleetId = fleet.id;
  marker.setAttribute(
    'aria-pressed',
    String(model.tradeGraph.fleetId === fleet.id),
  );
  marker.title = fleet.position
    ? `${fleet.name} · HEX ${fleet.position.q}, ${fleet.position.r}`
    : `${fleet.name} · No position`;
  const ships = element('span', 'trade-position-ships');
  for (const type of SHIP_TYPES) {
    const count = fleet.ships[type];
    if (!count) continue;
    const ship = element('span', 'trade-position-ship');
    ship.dataset.ship = type;
    ship.title = `${count} ${type}`;
    ship.append(
      shipImage(type),
      element('span', 'trade-ship-count', String(count)),
    );
    ships.append(ship);
  }
  marker.replaceChildren(
    ships,
    element('span', 'trade-position-name', fleet.name),
  );
  if (!ships.children.length)
    marker.append(
      element(
        'span',
        'trade-position-name',
        fleet.position ? 'No ships' : 'No position',
      ),
    );
  bindTradeShipDrag(marker, fleet, model, emit);
  return marker;
}

function bindTradeShipDrag(
  marker: HTMLButtonElement,
  fleet: FleetSnapshot,
  model: AppReadModel,
  emit: IntentHandler,
): void {
  if (
    fleet.routeId ||
    fleet.joinFleetId ||
    fleet.destination ||
    !fleet.ships['Transport ship'] ||
    model.phase !== 'planning'
  )
    return;
  let gesture: {
    id: number;
    x: number;
    y: number;
    ghost: HTMLElement | null;
    routeId: string | null;
  } | null = null;
  let suppressClick = false;
  const clear = () => {
    gesture?.ghost?.remove();
    marker
      .closest('.trade-graph-viewport')
      ?.querySelectorAll('.fleet-drop-target')
      .forEach((line) => line.classList.remove('fleet-drop-target'));
    gesture = null;
  };
  marker.addEventListener(
    'click',
    (event) => {
      if (!suppressClick) return;
      suppressClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true,
  );
  marker.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    gesture = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      ghost: null,
      routeId: null,
    };
    marker.setPointerCapture(event.pointerId);
  });
  marker.addEventListener('pointermove', (event) => {
    if (!gesture || gesture.id !== event.pointerId) return;
    if (
      !gesture.ghost &&
      Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) < 8
    )
      return;
    event.preventDefault();
    if (!gesture.ghost) {
      gesture.ghost = marker.cloneNode(true) as HTMLElement;
      gesture.ghost.classList.add('trade-fleet-drag-preview');
      gesture.ghost.setAttribute('aria-hidden', 'true');
      gesture.ghost.style.width = `${marker.getBoundingClientRect().width}px`;
      gesture.ghost.style.height = '78px';
      gesture.ghost.style.transform = 'translate(12px, 12px)';
      marker.closest('.trade-graph-page')!.append(gesture.ghost);
    }
    gesture.ghost.style.left = `${event.clientX}px`;
    gesture.ghost.style.top = `${event.clientY}px`;
    const viewport = marker.closest<HTMLElement>('.trade-graph-viewport')!;
    const frame = viewport.getBoundingClientRect();
    let closest: { id: string; distance: number } | null = null;
    for (const line of viewport.querySelectorAll<SVGLineElement>(
      '.trade-route-line',
    )) {
      line.classList.remove('fleet-drop-target');
      const matrix = line.getScreenCTM();
      if (!matrix) continue;
      const start = new DOMPoint(
        Number(line.getAttribute('x1')),
        Number(line.getAttribute('y1')),
      ).matrixTransform(matrix);
      const end = new DOMPoint(
        Number(line.getAttribute('x2')),
        Number(line.getAttribute('y2')),
      ).matrixTransform(matrix);
      const dx = end.x - start.x,
        dy = end.y - start.y;
      const t = Math.max(
        0,
        Math.min(
          1,
          ((event.clientX - start.x) * dx + (event.clientY - start.y) * dy) /
            (dx * dx + dy * dy || 1),
        ),
      );
      const distance = Math.hypot(
        event.clientX - start.x - t * dx,
        event.clientY - start.y - t * dy,
      );
      const route = model.tradeRoutes.find(
        (r) => r.id === line.dataset.routeId,
      )!;
      if (
        distance <= 20 &&
        !tradeAssignmentIssue(fleet, route) &&
        (!closest || distance < closest.distance)
      )
        closest = { id: route.id, distance };
    }
    gesture.routeId =
      event.clientX >= frame.left &&
      event.clientX <= frame.right &&
      event.clientY >= frame.top &&
      event.clientY <= frame.bottom
        ? (closest?.id ?? null)
        : null;
    if (gesture.routeId)
      viewport
        .querySelector<SVGLineElement>(
          `.trade-route-line[data-route-id="${gesture.routeId}"]`,
        )
        ?.classList.add('fleet-drop-target');
  });
  marker.addEventListener('pointerup', (event) => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const routeId = gesture.routeId;
    suppressClick = !!gesture.ghost;
    clear();
    if (marker.hasPointerCapture(event.pointerId))
      marker.releasePointerCapture(event.pointerId);
    if (routeId)
      emit({ type: 'assign-trade-fleet', routeId, fleetId: fleet.id });
  });
  marker.addEventListener('pointercancel', clear);
  marker.addEventListener('lostpointercapture', clear);
}

export function renderTradeAssignment(
  fleet: FleetSnapshot,
  route: TradeRouteSnapshot,
  model: AppReadModel,
  emit: IntentHandler,
  label: string,
): HTMLElement {
  const row = element('div', 'trade-assignment-option');
  const issue =
    model.phase !== 'planning'
      ? 'Wait until planning to assign a fleet.'
      : tradeAssignmentIssue(fleet, route);
  const assign = button(
    `Assign ${fleet.name} to ${route.from} to ${route.to}`,
    () =>
      emit({
        type: 'assign-trade-fleet',
        routeId: route.id,
        fleetId: fleet.id,
      }),
    'button secondary-button',
  );
  assign.textContent = `Assign · ${label}`;
  assign.disabled = !!issue || model.phase !== 'planning';
  row.append(assign);
  if (issue) row.append(element('p', 'trade-assignment-issue', issue));
  return row;
}

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
  mode: 'bay' | 'marker' | 'dock',
  route?: TradeRouteSnapshot,
): HTMLElement {
  const card = element(
    'article',
    `fleet-card trade-fleet-box trade-fleet-${mode}`,
  );
  card.dataset.fleetId = fleet.id;
  card.setAttribute('aria-label', `Trade fleet ${fleet.name} ${mode}`);
  card.classList.toggle(
    'selected-fleet-card',
    model.tradeGraph.fleetId === fleet.id,
  );
  const name = button(
    `Select trade fleet ${fleet.name}`,
    () => emit({ type: 'trade-select-fleet', id: fleet.id }),
    'fleet-name-button',
  );
  name.textContent = fleet.name;
  name.setAttribute(
    'aria-pressed',
    String(model.tradeGraph.fleetId === fleet.id),
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
  card.append(name, ships, element('p', 'trade-fleet-position', position));
  if (mode === 'bay') {
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
    if (fleet.position) {
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
  } else if (mode === 'bay' && route) {
    const issue = tradeAssignmentIssue(fleet, route);
    const assign = button(
      `Assign ${fleet.name} to ${route.from} to ${route.to}`,
      () =>
        emit({
          type: 'assign-trade-fleet',
          routeId: route.id,
          fleetId: fleet.id,
        }),
    );
    assign.textContent = 'Assign';
    assign.disabled = !!issue || model.phase !== 'planning';
    if (issue) card.append(element('p', 'trade-assignment-issue', issue));
    card.append(assign);
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

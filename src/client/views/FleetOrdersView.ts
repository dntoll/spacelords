import type { AppReadModel } from '../models/AppModel.js';
import type { FleetSnapshot } from '../models/Game.js';
import { tradeAssignmentIssue } from '../models/TradeAssignment.js';
import type { Technology } from '../models/Research.js';
import { Salvage } from '../models/Salvage.js';
import type { IntentHandler } from './ViewContracts.js';
import { button, element } from './dom.js';

import { bindFleetOrderDrag } from './FleetOrderDrag.js';

export function fleetOrderButton(
  label: string,
  symbol: string,
  action: () => void,
  disabled = false,
  active = false,
): HTMLButtonElement {
  const control = button(label, action, 'fleet-order-button');
  const icon = element('span', '', symbol);
  icon.setAttribute('aria-hidden', 'true');
  control.replaceChildren(icon);
  control.title = label;
  control.disabled = disabled;
  control.setAttribute('aria-pressed', String(active));
  return control;
}

/** flottorder-som-symboler: one compact toolbar, with explicit accessible order names. */
export function renderFleetOrders(
  fleet: FleetSnapshot,
  model: AppReadModel,
  emit: IntentHandler,
): HTMLElement {
  const orders = element('div', 'fleet-order-toolbar');
  bindFleetOrderDrag(orders);
  orders.setAttribute('role', 'group');
  orders.setAttribute('aria-label', `Orders for ${fleet.name}`);
  if (fleet.ordersPaused) {
    const resume = button('Resume orders after retreat', () =>
      emit({ type: 'resume-fleet-orders', id: fleet.id }),
    );
    resume.disabled = model.phase !== 'planning';
    orders.append(resume);
    return orders;
  }
  const locked =
    !(fleet.canIssueOrders ?? model.phase === 'planning') || !fleet.position;
  const researchRequired = (
    control: HTMLButtonElement,
    technology: Technology,
  ) => {
    if (!model.research.completed.includes(technology)) {
      control.disabled = true;
      control.title = `Research ${technology} first.`;
    }
    return control;
  };
  if (fleet.civilian?.passengers) {
    orders.append(
      fleetOrderButton(
        fleet.civilian.stopping
          ? 'Stopping after passenger delivery'
          : 'Stop Civilian transport after delivery',
        '■',
        () => emit({ type: 'clear-destination', id: fleet.id }),
        locked || fleet.civilian.stopping,
      ),
    );
    return orders;
  }
  if (!fleet.routeId) {
    if (fleet.towing?.length)
      orders.append(
        fleetOrderButton(
          'Return to shipyard',
          '⚓',
          () => emit({ type: 'return-shipyard', id: fleet.id }),
          locked,
          !!fleet.salvage,
        ),
      );
    orders.append(
      fleetOrderButton(
        `Choose destination for ${fleet.name}`,
        '➜',
        () => emit({ type: 'begin-destination', id: fleet.id }),
        locked,
        !!fleet.destination &&
          !fleet.exploration &&
          !fleet.joinFleetId &&
          !fleet.colonizationTargetId &&
          !fleet.salvage &&
          !fleet.automation &&
          !fleet.patrol,
      ),
      fleetOrderButton(
        fleet.civilian
          ? 'Stop Civilian transport'
          : fleet.automation
            ? 'Cancel automatic order'
            : fleet.salvage
              ? 'Cancel salvage'
              : fleet.colonizationTargetId
                ? 'Cancel colonization'
                : fleet.patrol
                  ? 'Cancel patrol'
                  : fleet.joinFleetId
                    ? 'Cancel reinforcement'
                    : 'Clear destination',
        '■',
        () => emit({ type: 'clear-destination', id: fleet.id }),
        locked,
      ),
    );
    if (fleet.ships['Salvage ship'])
      orders.append(
        fleetOrderButton(
          'Salvage',
          '⚒',
          () => emit({ type: 'begin-salvage', id: fleet.id }),
          locked || Salvage.availableCapacity(fleet, model.wrecks) === 0,
          !!fleet.salvage ||
            (model.destinationFleetId === fleet.id &&
              model.destinationOrder === 'salvage'),
        ),
        researchRequired(
          fleetOrderButton(
            'Auto salvage',
            '⚒↻',
            () => emit({ type: 'auto-salvage', id: fleet.id }),
            locked,
            fleet.automation === 'salvage',
          ),
          'Automated salvage',
        ),
      );
    if (fleet.ships['Civilian shuttle'])
      orders.append(
        researchRequired(
          fleetOrderButton(
            'Civilian transport',
            '♟↻',
            () => emit({ type: 'civilian-transport', id: fleet.id }),
            locked || model.phase !== 'planning' || !!fleet.towing?.length,
            !!fleet.civilian,
          ),
          'Civilian transport',
        ),
      );
    if (fleet.ships['Transport ship'])
      orders.append(
        researchRequired(
          fleetOrderButton(
            'Auto assign route',
            '↔↻',
            () => emit({ type: 'auto-transport', id: fleet.id }),
            locked || model.phase !== 'planning' || !!fleet.towing?.length,
            fleet.automation === 'transport',
          ),
          'Automated transport',
        ),
      );
    if (fleet.ships.Fighter) {
      const patrol = fleetOrderButton(
        'Patrol',
        '⟳',
        () => emit({ type: 'patrol-fleet', id: fleet.id }),
        locked,
        !!fleet.patrol,
      );
      patrol.title = `Patrol around the current hex. Pursue visible pirates within ${fleet.speed} hexes of this fleet, using shared detection.`;
      orders.append(researchRequired(patrol, 'Fleet patrol'));
    }
    if (fleet.ships['Exploration ship'])
      orders.append(
        researchRequired(
          fleetOrderButton(
            'Explore',
            '⌖',
            () =>
              emit({ type: 'explore-fleet', id: fleet.id, order: 'explore' }),
            locked,
            fleet.exploration === 'explore',
          ),
          'Automated exploration',
        ),
        researchRequired(
          fleetOrderButton(
            'Explore stars',
            '✦',
            () =>
              emit({
                type: 'explore-fleet',
                id: fleet.id,
                order: 'explore-stars',
              }),
            locked,
            fleet.exploration === 'explore-stars',
          ),
          'Automated exploration',
        ),
      );
    if (fleet.ships['Colony ship'])
      orders.append(
        fleetOrderButton(
          'Colonize',
          '⚑',
          () => emit({ type: 'begin-colonization', id: fleet.id }),
          locked,
          !!fleet.colonizationTargetId ||
            (model.destinationFleetId === fleet.id &&
              model.destinationOrder === 'colonize'),
        ),
      );
  } else {
    const route = model.tradeRoutes.find((route) => route.id === fleet.routeId);
    if (route)
      orders.append(
        fleetOrderButton(
          `Select route ${route.from} to ${route.to}`,
          '↔',
          () => emit({ type: 'map-select-route', id: route.id }),
          false,
          true,
        ),
      );
    orders.append(
      fleetOrderButton(
        fleet.releaseRequested ? 'Release pending' : 'Release from trade route',
        '×',
        () => emit({ type: 'release-trade-fleet', id: fleet.id }),
        model.phase !== 'planning' || !!fleet.releaseRequested,
      ),
    );
  }
  return orders;
}

export function renderFleetRouteMenu(
  fleet: FleetSnapshot,
  model: AppReadModel,
  emit: IntentHandler,
): HTMLElement | null {
  if (fleet.routeId) return null;
  const menu = element('details', 'fleet-route-menu');
  const summary = element('summary', 'fleet-order-button', '↔');
  summary.setAttribute('aria-label', 'Trade routes');
  summary.title = 'Trade routes';
  menu.append(summary);
  const choices = element('div', 'fleet-route-menu-choices');
  for (const route of model.tradeRoutes) {
    const issue = tradeAssignmentIssue(fleet, route, model.fleets);
    const assign = button(
      `Assign ${fleet.name} to ${route.from} to ${route.to}`,
      () =>
        emit({
          type: 'assign-trade-fleet',
          routeId: route.id,
          fleetId: fleet.id,
        }),
    );
    assign.disabled = model.phase !== 'planning' || !!issue;
    assign.title = issue ?? `${route.from} <> ${route.to}`;
    choices.append(assign);
  }
  if (!model.tradeRoutes.length)
    choices.append(element('p', 'muted-note', 'No trade routes.'));
  menu.append(choices);
  return menu;
}

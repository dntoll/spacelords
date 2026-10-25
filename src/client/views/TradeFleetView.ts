import type { AppReadModel } from '../models/AppModel.js';
import type { FleetSnapshot } from '../models/Game.js';
import type { TradeRouteSnapshot } from '../models/Logistics.js';
import { tradeAssignmentIssue } from '../models/TradeAssignment.js';
import type { IntentHandler } from './ViewContracts.js';
import { renderFleetCard } from './FleetCard.js';
import { button, element } from './dom.js';

export function renderTradeFleet(
  fleet: FleetSnapshot,
  model: AppReadModel,
  emit: IntentHandler,
): HTMLElement {
  const card = renderFleetCard(fleet, model, emit);
  card.classList.add('trade-fleet-box', 'trade-fleet-route-details');
  const cargo = Object.entries(fleet.cargo ?? {})
    .filter(([, amount]) => amount > 0)
    .map(([material, amount]) => `${amount} ${material}`)
    .join(', ');
  card.append(
    element('p', 'trade-cargo', cargo ? `Cargo: ${cargo}` : 'Empty hold'),
  );
  return card;
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
      : tradeAssignmentIssue(fleet, route, model.fleets);
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

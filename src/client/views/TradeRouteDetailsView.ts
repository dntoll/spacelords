import type { AppReadModel } from '../models/AppModel.js';
import type { TradeRouteSnapshot } from '../models/Logistics.js';
import { renderTradeFleet } from './TradeFleetView.js';
import type { IntentHandler } from './ViewContracts.js';
import { button, element } from './dom.js';

export function renderTradeRouteDetails(
  route: TradeRouteSnapshot,
  model: AppReadModel,
  emit: IntentHandler,
): HTMLElement {
  const panel = element('div', 'trade-route-details');
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
    element('h3', '', 'Assigned fleets · ' + route.fleetIds.length),
  );
  const assigned = element('div', 'trade-assigned-fleets');
  for (const id of route.fleetIds) {
    const fleet = model.fleets.find((f) => f.id === id);
    if (fleet) assigned.append(renderTradeFleet(fleet, model, emit));
  }
  if (!route.fleetIds.length)
    assigned.append(element('p', 'muted-note', 'No fleet assigned'));
  panel.append(assigned);
  return panel;
}

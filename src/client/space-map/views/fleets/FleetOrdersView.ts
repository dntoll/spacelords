import type { AppReadModel } from '../../../app/models/AppModel.js';
import type { FleetSnapshot } from '../../models/Game.js';
import type { IntentHandler } from '../../../app/views/ViewContracts.js';
import { button, element } from '../../../common/dom.js';

/** Move and Stop beside the fleet. */
export function renderFleetOrders(
  fleet: FleetSnapshot,
  model: AppReadModel,
  emit: IntentHandler,
): HTMLElement {
  const orders = element('div', 'fleet-order-toolbar fleet-primary-orders');
  orders.setAttribute('role', 'group');
  orders.setAttribute('aria-label', `Orders for ${fleet.name}`);
  const locked =
    !(fleet.canIssueOrders ?? model.phase === 'planning') || !fleet.position;
  const move = button(
    `Choose destination for ${fleet.name}`,
    () => emit({ type: 'begin-destination', id: fleet.id }),
    'fleet-order-button',
  );
  move.textContent = 'Move';
  move.setAttribute('aria-pressed', String(!!fleet.destination));
  move.disabled = locked;
  const stop = button(
    'Clear destination',
    () => emit({ type: 'clear-destination', id: fleet.id }),
    'fleet-order-button',
  );
  stop.textContent = 'Stop';
  stop.disabled = locked;
  orders.append(move, stop);
  return orders;
}

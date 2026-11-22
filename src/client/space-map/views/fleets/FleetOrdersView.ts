import type { AppReadModel } from '../../../app/models/AppModel.js';
import type { FleetSnapshot } from '../../models/Game.js';
import type { IntentHandler } from '../../../app/views/ViewContracts.js';
import { button, element } from '../../../common/dom.js';

/** egen-ordervy: keep the three common actions readable beside the fleet. */
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
  move.setAttribute(
    'aria-pressed',
    String(
      !!fleet.destination &&
        !fleet.patrol &&
        !fleet.exploration &&
        !fleet.explorationTargetId &&
        !fleet.joinFleetId,
    ),
  );
  move.disabled = locked;
  const stop = button(
    fleet.explorationTargetId
      ? 'Cancel planet exploration'
      : fleet.patrol
        ? 'Cancel patrol'
        : fleet.joinFleetId
          ? 'Cancel reinforcement'
          : 'Clear destination',
    () => emit({ type: 'clear-destination', id: fleet.id }),
    'fleet-order-button',
  );
  stop.textContent = 'Stop';
  stop.disabled = locked;
  const open = button(
    'Orders',
    () => emit({ type: 'open-fleet-orders', id: fleet.id }),
    'fleet-order-button',
  );
  open.disabled = locked;
  if (fleet.ordersPaused) {
    const resume = button('Resume orders after retreat', () =>
      emit({ type: 'resume-fleet-orders', id: fleet.id }),
    );
    resume.disabled = model.phase !== 'planning';
    orders.append(resume);
  }
  orders.append(move, stop, open);
  return orders;
}

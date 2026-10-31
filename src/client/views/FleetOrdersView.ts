import type { AppReadModel } from '../models/AppModel.js';
import type { FleetSnapshot } from '../models/Game.js';
import type { IntentHandler } from './ViewContracts.js';
import { button, element } from './dom.js';
import { bindFleetOrderDrag } from './FleetOrderDrag.js';

/** egen-ordervy: keep the three common actions readable beside the fleet. */
export function renderFleetOrders(
  fleet: FleetSnapshot,
  model: AppReadModel,
  emit: IntentHandler,
): HTMLElement {
  const orders = element('div', 'fleet-order-toolbar fleet-primary-orders');
  bindFleetOrderDrag(orders);
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
        !fleet.automation &&
        !fleet.salvage &&
        !fleet.upgrade &&
        !fleet.colonizationTargetId &&
        !fleet.joinFleetId,
    ),
  );
  move.disabled = locked || !!fleet.civilian?.passengers;
  const stop = button(
    fleet.routeId
      ? fleet.releaseRequested
        ? 'Release pending'
        : 'Release from trade route'
      : fleet.upgrade
        ? 'Cancel Upgrade'
        : fleet.civilian?.passengers
          ? 'Stop Civilian transport after delivery'
          : fleet.civilian
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
    () =>
      emit({
        type: fleet.routeId ? 'release-trade-fleet' : 'clear-destination',
        id: fleet.id,
      }),
    'fleet-order-button',
  );
  stop.textContent = 'Stop';
  stop.disabled = fleet.routeId
    ? model.phase !== 'planning' || !!fleet.releaseRequested
    : locked;
  const open = button(
    'Orders',
    () => emit({ type: 'open-fleet-orders', id: fleet.id }),
    'fleet-order-button',
  );
  open.disabled = locked || !!fleet.civilian?.passengers;
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

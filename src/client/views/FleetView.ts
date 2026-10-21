import type { AppReadModel } from '../models/AppModel.js';
import type { IntentHandler } from './ViewContracts.js';
import { button, element } from './dom.js';
import { renderFleetCard } from './FleetCard.js';
export { fleetAssignmentLabel } from './FleetCard.js';
import { bindShipTransfers } from './ShipTransferInput.js';

export function renderFleets(
  model: AppReadModel,
  emit: IntentHandler,
): HTMLElement {
  const page = element('section', 'fleet-page fleet-overview');
  const header = element('div', 'screen-header');
  header.append(
    element('h1', '', 'Fleets'),
    button('Back to map', () => emit({ type: 'open-map' }), 'back-button'),
  );
  const controls = element('div', 'fleet-controls');
  const selected = model.selectedFleet;
  const locked = model.phase !== 'planning';
  const create = button('New fleet', () => emit({ type: 'create-fleet' }));
  create.disabled = locked;
  controls.append(create);
  if (selected) {
    if (Object.values(selected.ships).every((count) => count === 0)) {
      const remove = button(
        'Delete fleet',
        () => emit({ type: 'delete-fleet', id: selected.id }),
        'button destructive-button',
      );
      remove.disabled = locked;
      controls.append(remove);
    }
  }
  const body = element('div', 'fleet-builder');
  const collection = element('section', 'fleet-collection');
  collection.setAttribute('aria-label', 'Fleet builder');
  const help = element(
    'p',
    'muted-note fleet-transfer-help',
    model.shipTransfer
      ? `Choose a fleet box for one ${model.shipTransfer.ship}, or press Escape to cancel.`
      : 'Drag a ship into a fleet box, or choose a ship and then a destination fleet. Ships join immediately on the same hex; otherwise they follow the fleet as reinforcements marked En route.',
  );
  help.setAttribute('role', 'status');
  collection.append(help);
  const grid = element('div', 'fleet-cards');
  for (const fleet of model.fleets)
    grid.append(renderFleetCard(fleet, model, emit));
  collection.append(grid);
  if (selected) {
    const location = element('aside', 'fleet-location-panel');
    location.append(
      element('h2', '', 'Fleet location'),
      element('p', 'fleet-location-name', selected.name),
    );
    const map = element('div', 'fleet-location-map');
    map.setAttribute('role', 'img');
    map.setAttribute('aria-label', `Fleet location: ${selected.name}`);
    map.dataset.fleetLocation = selected.id;
    location.append(
      map,
      element(
        'p',
        'coordinate-label',
        selected.position
          ? `HEX ${selected.position.key}`
          : 'No position. The first ship sets this fleet’s location.',
      ),
    );
    body.append(collection, location);
  } else body.append(collection);
  page.append(header, controls, body);
  page.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') emit({ type: 'cancel-ship-transfer' });
  });
  bindShipTransfers(page, model, emit);
  return page;
}

import type { AppReadModel } from '../models/AppModel.js';
import type { FleetSnapshot } from '../models/Game.js';
import type { IntentHandler } from './ViewContracts.js';
import { button, element } from './dom.js';
import { renderFleetShips } from './ShipView.js';
import { bindShipTransfers } from './ShipTransferInput.js';

export function renderFleets(
  model: AppReadModel,
  emit: IntentHandler,
): HTMLElement {
  const page = element('section', 'fleet-page');
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
    const name = element('input');
    name.value = selected.name;
    name.setAttribute('aria-label', 'Fleet name');
    name.disabled = locked;
    const rename = button('Rename', () =>
      emit({ type: 'rename-fleet', id: selected.id, name: name.value }),
    );
    rename.disabled = locked;
    controls.append(name, rename);
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
      : 'Drag a ship into a fleet box at the same location or into an empty fleet, or choose a ship and then a destination fleet.',
  );
  help.setAttribute('role', 'status');
  collection.append(help);
  const grid = element('div', 'fleet-cards');
  for (const fleet of model.fleets) grid.append(fleetCard(fleet, model, emit));
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

function fleetCard(
  fleet: FleetSnapshot,
  model: AppReadModel,
  emit: IntentHandler,
): HTMLElement {
  const locked = model.phase !== 'planning';
  const card = element('article', 'fleet-card');
  card.dataset.fleetId = fleet.id;
  card.setAttribute('aria-label', `Fleet ${fleet.name}`);
  card.classList.toggle(
    'selected-fleet-card',
    fleet.id === model.selectedFleet?.id,
  );
  const title = button(
    fleet.name,
    () => emit({ type: 'select-fleet', id: fleet.id }),
    'fleet-name-button',
  );
  title.setAttribute(
    'aria-pressed',
    String(fleet.id === model.selectedFleet?.id),
  );
  const hangar = element('div', 'fleet-hangar');
  hangar.dataset.fleetId = fleet.id;
  hangar.setAttribute('role', 'group');
  hangar.setAttribute('aria-label', `Ships in ${fleet.name}`);
  const manifest = renderFleetShips(fleet, (ship) =>
    emit({ type: 'choose-ship-transfer', fleetId: fleet.id, ship }),
  );
  for (const token of manifest.querySelectorAll<HTMLButtonElement>('button')) {
    token.disabled = locked;
    token.draggable = false;
    token.classList.toggle(
      'transfer-source',
      model.shipTransfer?.fleetId === fleet.id &&
        model.shipTransfer.ship === token.dataset.ship,
    );
  }
  hangar.append(manifest);
  if (model.shipTransfer) {
    const source = model.fleets.find(
      (candidate) => candidate.id === model.shipTransfer!.fleetId,
    );
    const available =
      !locked &&
      source?.id !== fleet.id &&
      (!fleet.position || source?.position?.key === fleet.position.key);
    hangar.classList.toggle('transfer-available', available);
    const move = button(`Move ship to ${fleet.name}`, () =>
      emit({ type: 'transfer-chosen-ship', target: fleet.id }),
    );
    move.disabled = !available;
    hangar.append(move);
    if (!available && source?.id !== fleet.id)
      hangar.append(
        element('p', 'muted-note', 'Fleets must share a location.'),
      );
  }
  hangar.addEventListener('click', (event) => {
    if ((event.target as Element).closest('button')) return;
    if (model.shipTransfer) {
      const source = model.fleets.find(
        (candidate) => candidate.id === model.shipTransfer!.fleetId,
      );
      if (
        !locked &&
        source?.id !== fleet.id &&
        (!fleet.position || source?.position?.key === fleet.position.key)
      )
        emit({ type: 'transfer-chosen-ship', target: fleet.id });
    } else emit({ type: 'select-fleet', id: fleet.id });
  });
  card.append(title, hangar);
  return card;
}

import { shipTransferIssue } from '../models/FleetTransfer.js';
import type { AppReadModel } from '../models/AppModel.js';
import type { FleetSnapshot } from '../models/Game.js';
import type { IntentHandler } from './ViewContracts.js';
import { button, element } from './dom.js';
import { renderFleetShips } from './ShipView.js';

export function renderFleetCard(
  fleet: FleetSnapshot,
  model: AppReadModel,
  emit: IntentHandler,
): HTMLElement {
  const locked = model.phase !== 'planning';
  const placeName = fleet.position
    ? model.cells.find((cell) => cell.position.key === fleet.position?.key)
        ?.object?.name
    : null;
  const card = element('article', 'fleet-card');
  card.dataset.fleetId = fleet.id;
  card.setAttribute('aria-label', `Fleet ${fleet.name}`);
  card.classList.toggle('selected-fleet-card', fleet.id === model.mapFleetId);
  const heading = element('h3', 'fleet-card-heading');
  const header = element('div', 'fleet-card-header');
  header.append(heading);
  let selectTimer: ReturnType<typeof setTimeout> | undefined;
  const title = button(
    fleet.name,
    () => {
      clearTimeout(selectTimer);
      selectTimer = setTimeout(() => {
        if (title.isConnected) emit({ type: 'map-select-fleet', id: fleet.id });
      }, 250);
    },
    'fleet-name-button',
  );
  title.setAttribute('aria-pressed', String(fleet.id === model.mapFleetId));
  title.title = 'Double-click or press F2 to rename';
  title.addEventListener('dblclick', () => {
    clearTimeout(selectTimer);
    emit({ type: 'begin-fleet-rename', id: fleet.id });
  });
  title.addEventListener('keydown', (event) => {
    if (event.key !== 'F2') return;
    event.preventDefault();
    emit({ type: 'begin-fleet-rename', id: fleet.id });
  });
  const rename = button(
    `Rename ${fleet.name}`,
    () => emit({ type: 'begin-fleet-rename', id: fleet.id }),
    'fleet-rename-button',
  );
  rename.textContent = '✎';
  rename.title = `Rename ${fleet.name}`;
  rename.disabled = locked;
  if (model.fleetNameEdit?.id === fleet.id) {
    const input = element('input', 'fleet-name-input');
    input.value = model.fleetNameEdit.draft;
    input.setAttribute('aria-label', 'Fleet name');
    input.maxLength = 40;
    input.disabled = locked;
    input.addEventListener('input', () =>
      emit({ type: 'edit-fleet-name', draft: input.value }),
    );
    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      emit({
        type:
          event.key === 'Enter' ? 'submit-fleet-name' : 'cancel-fleet-rename',
      });
    });
    input.addEventListener('blur', () => {
      if (!input.isConnected || input.dataset.rendering) return;
      emit({ type: 'cancel-fleet-rename', reason: 'blur' });
      heading.replaceChildren(title);
      header.append(rename);
    });
    heading.append(input);
  } else {
    heading.append(title);
    header.append(rename);
  }
  const hangar = element('div', 'fleet-hangar');
  hangar.dataset.fleetId = fleet.id;
  hangar.setAttribute('role', 'group');
  hangar.setAttribute('aria-label', `Ships in ${fleet.name}`);
  const manifest = renderFleetShips(
    fleet,
    (ship, shipId) =>
      emit({ type: 'choose-ship-transfer', fleetId: fleet.id, ship, shipId }),
    12,
  );
  for (const token of manifest.querySelectorAll<HTMLButtonElement>('button')) {
    token.disabled = locked || !!shipTransferIssue(fleet);
    token.draggable = false;
    token.classList.toggle(
      'transfer-source',
      model.shipTransfer?.fleetId === fleet.id &&
        model.shipTransfer.ship === token.dataset.ship &&
        (!model.shipTransfer.shipId ||
          model.shipTransfer.shipId === token.dataset.shipId),
    );
  }
  hangar.append(manifest);
  if (model.shipTransfer) {
    const source = model.fleets.find(
      (candidate) => candidate.id === model.shipTransfer!.fleetId,
    );
    const available =
      !locked &&
      !!source &&
      !shipTransferIssue(source) &&
      source.id !== fleet.id;
    hangar.classList.toggle('transfer-available', available);
    const move = button(`Move ship to ${fleet.name}`, () =>
      emit({ type: 'transfer-chosen-ship', target: fleet.id }),
    );
    move.disabled = !available;
    hangar.append(move);
    if (
      available &&
      fleet.position &&
      source.position?.key !== fleet.position.key
    )
      hangar.append(
        element(
          'p',
          'muted-note',
          'Sends reinforcements to follow this fleet until they meet.',
        ),
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
        !!source &&
        !shipTransferIssue(source) &&
        source.id !== fleet.id
      )
        emit({ type: 'transfer-chosen-ship', target: fleet.id });
    } else emit({ type: 'map-select-fleet', id: fleet.id });
  });
  card.append(
    header,
    element(
      'p',
      'fleet-current-position',
      fleet.position
        ? `Current position: ${placeName ? `${placeName} · ` : ''}HEX ${fleet.position.key}`
        : 'No position. The first ship sets this fleet’s location.',
    ),
    hangar,
  );
  const transferIssue = shipTransferIssue(fleet);
  if (transferIssue) card.append(element('p', 'muted-note', transferIssue));
  const assignment = fleetAssignmentLabel(fleet, model);
  if (assignment)
    card.append(element('p', 'muted-note fleet-assignment', assignment));
  card.append(
    element(
      'p',
      'fleet-destination-status',
      model.fleetDragging && model.mapFleetId === fleet.id
        ? model.fleetDestinationPreview
          ? `Destination preview: HEX ${model.fleetDestinationPreview.key}`
          : 'Choose a destination on the map.'
        : fleet.destination
          ? `Destination: HEX ${fleet.destination.key}`
          : 'No destination',
    ),
  );
  if (!fleet.routeId) {
    const orders = element('details', 'fleet-orders');
    orders.append(element('summary', '', 'Orders'));
    const choose = button(`Choose destination for ${fleet.name}`, () =>
      emit({ type: 'begin-destination', id: fleet.id }),
    );
    choose.textContent = 'Choose destination';
    choose.disabled = locked || !fleet.position;
    orders.append(choose);
    card.append(orders);
    if (fleet.destination) {
      const clear = button('Clear destination', () =>
        emit({ type: 'clear-destination', id: fleet.id }),
      );
      clear.disabled = locked;
      card.append(clear);
    }
  }
  if (fleet.joinFleetId) {
    const cancel = button('Cancel reinforcement', () =>
      emit({ type: 'clear-destination', id: fleet.id }),
    );
    cancel.disabled = locked;
    card.append(cancel);
  }
  if (fleet.routeId) {
    if (fleet.releaseRequested)
      card.append(
        element('p', 'muted-note', 'Leaving trade route after arrival'),
      );
    const release = button('Release from trade route', () =>
      emit({ type: 'release-trade-fleet', id: fleet.id }),
    );
    release.disabled = model.phase !== 'planning' || !!fleet.releaseRequested;
    card.append(release);
  }
  return card;
}

export function fleetAssignmentLabel(
  fleet: FleetSnapshot,
  model: AppReadModel,
): string {
  if (fleet.joinFleetId) {
    const target = model.fleets.find(
      (target) => target.id === fleet.joinFleetId,
    );
    return `En route to ${target?.name ?? fleet.joinFleetId}`;
  }
  if (fleet.routeId) {
    const route = model.tradeRoutes.find((route) => route.id === fleet.routeId);
    return `Trade route: ${route ? `${route.from} ↔ ${route.to}` : fleet.routeId}`;
  }
  return '';
}

import { renderFleetOrders, renderFleetRouteMenu } from './FleetOrdersView.js';
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
  const card = element('article', 'fleet-card compact-fleet-card');
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
  title.title = `${fleet.name}. Double-click or press F2 to rename${fleet.routeId ? ' the original fleet name' : ''}`;
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
  const orders = renderFleetOrders(fleet, model, emit);
  header.insertBefore(orders, rename.parentElement === header ? rename : null);
  const routeMenu = renderFleetRouteMenu(fleet, model, emit);
  const footer = element('div', 'fleet-card-footer');
  const speed = element('small', 'fleet-speed', `S: ${fleet.speed} hex`);
  speed.title = `Fleet speed: ${fleet.speed} hexes/year${fleet.remainingMovement === undefined ? '' : ` · ${fleet.remainingMovement} hex remaining this year`}`;
  footer.append(speed);
  if (fleet.detectionRange !== undefined) {
    const detection = element(
      'small',
      'fleet-detection',
      `D: ${fleet.detectionRange} hex`,
    );
    detection.title = `Detection range: ${fleet.detectionRange} hexes`;
    footer.append(detection);
  }
  if (routeMenu) orders.append(routeMenu);
  if (fleet.salvage?.issue)
    footer.append(element('small', 'muted-note', fleet.salvage.issue));
  if (fleet.towing?.length) {
    const towing = element('details', 'towed-wrecks');
    towing.append(
      element('summary', '', `Towing ${fleet.towing.length} wrecks`),
    );
    for (const id of fleet.towing) {
      const wreck = model.wrecks.find((item) => item.id === id);
      const release = button(`Release ${wreck?.ship.type ?? 'wreck'}`, () =>
        emit({ type: 'release-wreck', fleetId: fleet.id, id }),
      );
      release.disabled = !(fleet.canIssueOrders ?? !locked);
      towing.append(release);
    }
    footer.append(towing);
  }
  card.title = [
    fleetAssignmentLabel(fleet, model),
    model.fleetDragging && model.mapFleetId === fleet.id
      ? model.fleetDestinationPreview
        ? `Destination preview: HEX ${model.fleetDestinationPreview.key}`
        : 'Choose a destination on the map.'
      : fleet.destination
        ? `Destination: HEX ${fleet.destination.key}`
        : 'No destination',
    shipTransferIssue(fleet),
  ]
    .filter(Boolean)
    .join('. ');
  card.setAttribute('aria-description', card.title);
  card.append(header, hangar, footer);
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

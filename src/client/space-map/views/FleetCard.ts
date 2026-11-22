import { ShipOrders } from '../models/ShipOrders.js';
import { renderFleetOrders } from './fleets/FleetOrdersView.js';
import { bindFleetOrderDrag } from './fleets/FleetOrderDrag.js';
import { shipTransferIssue } from '../models/fleets/FleetTransfer.js';
import type { AppReadModel } from '../../app/models/AppModel.js';
import type { FleetSnapshot } from '../models/Game.js';
import type { IntentHandler } from '../../app/views/ViewContracts.js';
import { button, element } from '../../common/dom.js';
import { renderFleetShips } from './ShipView.js';
import { fleetCategory } from '../models/fleets/FleetCategory.js';
import { FLEET_CATEGORY_COLORS } from './FleetCategoryColors.js';

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
  // flottkategorier: the card carries the fleet's map colour and category.
  const category = fleetCategory(fleet);
  card.dataset.category = category;
  card.style.setProperty('--fleet-category', FLEET_CATEGORY_COLORS[category]);
  header.append(heading, element('span', 'fleet-category-chip', category));
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
    });
    heading.append(input);
  } else {
    heading.append(title);
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
  const stats = element('div', 'fleet-stats');
  const speed = element('small', 'fleet-speed', `➤ ${fleet.speed}`);
  speed.title = `Fleet speed: ${fleet.speed} hexes/round${fleet.remainingMovement === undefined ? '' : ` · ${fleet.remainingMovement} hex remaining this round`}`;
  speed.setAttribute('aria-label', speed.title);
  stats.append(speed);
  if (fleet.detectionRange !== undefined) {
    const detection = element(
      'small',
      'fleet-detection',
      `◉ ${fleet.detectionRange}`,
    );
    detection.title = `Detection range: ${fleet.detectionRange} hexes`;
    detection.setAttribute('aria-label', detection.title);
    stats.append(detection);
  }
  hangar.append(manifest, stats);
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
  const orderRow = element('div', 'fleet-order-row');
  bindFleetOrderDrag(orderRow);
  const assignment = fleetAssignmentLabel(fleet, model);
  if (assignment) {
    const route =
      assignment.startsWith('Trade route:') && fleet.routeId
        ? model.tradeRoutes.find((item) => item.id === fleet.routeId)
        : undefined;
    const targetFleet =
      assignment.startsWith('En route to ') && fleet.joinFleetId
        ? model.fleets.find((item) => item.id === fleet.joinFleetId)
        : undefined;
    const planetId = /^(Colonize:|Explore planet:|Upgrade:)/.test(assignment)
      ? (fleet.colonizationTargetId ??
        fleet.explorationTargetId ??
        fleet.upgrade?.planetId)
      : undefined;
    const status = route
      ? button(
          `Select route ${route.from} to ${route.to}`,
          () => emit({ type: 'map-select-route', id: route.id }),
          'fleet-order-status',
        )
      : targetFleet
        ? button(
            `Select fleet ${targetFleet.name}`,
            () => emit({ type: 'map-select-fleet', id: targetFleet.id }),
            'fleet-order-status',
          )
        : planetId &&
            model.ownedPlanets.some((planet) => planet.id === planetId)
          ? button(
              `Open order planet`,
              () => emit({ type: 'open-planet', id: planetId }),
              'fleet-order-status',
            )
          : element('span', 'fleet-order-status');
    status.textContent = assignment;
    if (fleet.patrol && assignment.startsWith('Patrol:'))
      status.classList.add('fleet-patrol-status');
    if (fleet.upgrade) status.classList.add('fleet-upgrade-status');
    orderRow.append(status);
  }
  orderRow.append(orders);
  const footer = element('div', 'fleet-card-footer');
  if (
    fleet.navigationIssue &&
    fleet.navigationIssue !==
      'Asteroid passage requires a full round of movement.'
  )
    footer.append(element('small', 'muted-note', fleet.navigationIssue));
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
        ? 'Destination preview on map'
        : 'Choose a destination on the map.'
      : fleet.destination
        ? `Destination: ${model.cells.find((cell) => cell.position.key === fleet.destination?.key)?.object?.name ?? 'selected location on map'}`
        : 'No destination',
    shipTransferIssue(fleet),
  ]
    .filter(Boolean)
    .join('. ');
  card.setAttribute('aria-description', card.title);
  card.append(header, orderRow, hangar, footer);
  return card;
}

export function fleetAssignmentLabel(
  fleet: FleetSnapshot,
  model: AppReadModel,
): string {
  if (fleet.detour?.kind === 'attack-pirate')
    return `Attack Space pirate${fleet.ordersPaused ? ' · paused' : ''}`;
  if (fleet.detour?.kind === 'explore-planet') {
    const target = model.cells.find(
      (cell) => cell.position.key === fleet.destination?.key,
    )?.object?.name;
    return `Explore planet: ${target ?? 'selected planet'}${fleet.ordersPaused ? ' · paused' : ''}`;
  }
  if (fleet.ordersPaused) {
    const active = fleetAssignmentLabel(
      { ...fleet, ordersPaused: false },
      model,
    );
    return active ? `${active} · paused` : 'Orders paused';
  }
  if (fleet.pendingOrder)
    return `Pending: ${ShipOrders.label(fleet.pendingOrder)}`;
  if (fleet.upgrade) {
    const planet =
      model.ownedPlanets.find((planet) => planet.id === fleet.upgrade!.planetId)
        ?.name ?? 'shipyard';
    return `Upgrade: ${fleet.upgrade.issue ?? (fleet.destination ? `travelling to ${planet}` : `awaiting components at ${planet}`)}`;
  }
  if (fleet.automation === 'salvage')
    return `Auto salvage: ${fleet.towing?.length ? 'returning to shipyard' : fleet.salvage?.targets.length ? 'collecting a wreck' : 'waiting for an available wreck'}`;
  if (fleet.colonizationTargetId) {
    const position = fleet.destination ?? fleet.position;
    const target = model.cells.find(
      (cell) => cell.position.key === position?.key,
    )?.object?.name;
    return `Colonize: ${target ?? 'selected planet'}`;
  }
  if (fleet.explorationTargetId) {
    const position = fleet.destination ?? fleet.position;
    const target = model.cells.find(
      (cell) => cell.position.key === position?.key,
    )?.object?.name;
    return `Explore planet: ${target ?? 'selected planet'}`;
  }
  if (fleet.exploration)
    return fleet.exploration === 'explore-stars' ? 'Explore stars' : 'Explore';
  if (fleet.salvage?.targets.length)
    return `Salvage: ${fleet.salvage.targets.length} wreck(s) assigned`;
  if (fleet.patrol) {
    return `Patrol: range ${fleet.patrol.range} hex${fleet.patrol.targetPirateId ? ', pursuing Space pirate' : ''}`;
  }
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
  if (fleet.destination) {
    const target = model.cells.find(
      (cell) => cell.position.key === fleet.destination?.key,
    )?.object?.name;
    return `Move: ${target ?? `hex ${fleet.destination.q}, ${fleet.destination.r}`}`;
  }
  return '';
}

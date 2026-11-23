import { bindFleetOrderDrag } from './fleets/FleetOrderDrag.js';
import type { AppReadModel } from '../../app/models/AppModel.js';
import type { FleetSnapshot } from '../models/Game.js';
import type { IntentHandler } from '../../app/views/ViewContracts.js';
import { button, element } from '../../common/dom.js';
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
  title.title = `${fleet.name}. Double-click or press F2 to rename`;
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
  const manifest = renderFleetShips(fleet, undefined, 12);
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
  hangar.addEventListener('click', (event) => {
    if ((event.target as Element).closest('button')) return;
    emit({ type: 'map-select-fleet', id: fleet.id });
  });
  const orderRow = element('div', 'fleet-order-row');
  bindFleetOrderDrag(orderRow);
  const assignment = fleetAssignmentLabel(fleet, model);
  if (assignment) {
    const status = element('span', 'fleet-order-status', assignment);
    orderRow.append(status);
  }
  const footer = element('div', 'fleet-card-footer');
  if (
    fleet.navigationIssue &&
    fleet.navigationIssue !==
      'Asteroid passage requires a full round of movement.'
  )
    footer.append(element('small', 'muted-note', fleet.navigationIssue));
  card.title = [
    fleetAssignmentLabel(fleet, model),
    model.fleetDragging && model.mapFleetId === fleet.id
      ? model.fleetDestinationPreview
        ? 'Destination preview on map'
        : 'Choose a destination on the map.'
      : fleet.destination
        ? `Destination: ${model.cells.find((cell) => cell.position.key === fleet.destination?.key)?.object?.name ?? 'selected location on map'}`
        : 'No destination',
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
  if (fleet.destination) {
    const target = model.cells.find(
      (cell) => cell.position.key === fleet.destination?.key,
    )?.object?.name;
    // inga-hexkoordinater: an unnamed hex is described, never numbered.
    return `Move: ${target ?? 'selected location'}`;
  }
  return '';
}

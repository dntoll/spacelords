import type { AppReadModel } from '../models/AppModel.js';
import type { ShipType } from '../models/Game.js';
import type { IntentHandler } from './ViewContracts.js';
import { button, element } from './dom.js';

const shipTypes: readonly ShipType[] = [
  'Colony ship',
  'Exploration ship',
  'Fighter',
];

export function renderFleets(
  model: AppReadModel,
  emit: IntentHandler,
): HTMLElement {
  const page = element('section', 'fleet-page');
  page.append(
    element('h1', '', 'Fleets'),
    button('Back to map', () => emit({ type: 'open-map' }), 'back-button'),
  );
  const controls = element('div', 'fleet-controls');
  const selected = model.selectedFleet;
  const newFleet = button(
    'New fleet',
    () => selected && emit({ type: 'create-fleet', id: selected.id }),
    'button',
  );
  newFleet.disabled = !selected || model.phase !== 'planning';
  controls.append(newFleet);
  if (selected) {
    const name = document.createElement('input');
    name.value = selected.name;
    name.setAttribute('aria-label', 'Fleet name');
    controls.append(
      name,
      button(
        'Rename',
        () => emit({ type: 'rename-fleet', id: selected.id, name: name.value }),
        'button',
      ),
    );
    if (shipTypes.every((ship) => selected.ships[ship] === 0))
      controls.append(
        button(
          'Delete fleet',
          () => emit({ type: 'delete-fleet', id: selected.id }),
          'button destructive-button',
        ),
      );
  }
  page.append(controls);
  const grid = element('div', 'fleet-grid');
  grid.setAttribute('role', 'table');
  const header = element('div', 'fleet-grid-row fleet-grid-header');
  for (const heading of ['Fleet', 'Position', ...shipTypes])
    header.append(element('span', '', heading));
  grid.append(header);
  let source: { id: string; ship: ShipType } | null = null;
  const chooseCell = (id: string, ship: ShipType): void => {
    if (!source) {
      source = { id, ship };
      for (const cell of grid.querySelectorAll<HTMLElement>('.ship-cell'))
        cell.classList.toggle(
          'transfer-source',
          cell.dataset.fleetId === id && cell.dataset.ship === ship,
        );
      return;
    }
    if (source.id !== id && source.ship === ship)
      emit({
        type: 'transfer-ships',
        source: source.id,
        target: id,
        ship,
        amount: 1,
      });
    source = null;
    for (const cell of grid.querySelectorAll<HTMLElement>('.ship-cell'))
      cell.classList.remove('transfer-source');
  };
  for (const fleet of model.fleets) {
    const row = element('div', 'fleet-grid-row');
    row.classList.toggle('selected-fleet-row', fleet.id === selected?.id);
    const select = button(
      fleet.name,
      () => emit({ type: 'select-fleet', id: fleet.id }),
      'fleet-name-button',
    );
    select.setAttribute('aria-pressed', String(fleet.id === selected?.id));
    row.append(
      select,
      element('span', 'fleet-position', `HEX ${fleet.position.key}`),
    );
    for (const ship of shipTypes) {
      const cell = button(
        String(fleet.ships[ship]),
        () => chooseCell(fleet.id, ship),
        'ship-cell',
      );
      cell.dataset.fleetId = fleet.id;
      cell.dataset.ship = ship;
      cell.draggable = fleet.ships[ship] > 0;
      cell.setAttribute(
        'aria-label',
        `${fleet.name}, ${ship}: ${fleet.ships[ship]}`,
      );
      cell.addEventListener('dragstart', (event) =>
        event.dataTransfer?.setData('text/plain', `${fleet.id}:${ship}`),
      );
      cell.addEventListener('dragover', (event) => event.preventDefault());
      cell.addEventListener('drop', (event) => {
        event.preventDefault();
        const [sourceId, sourceShip] = (
          event.dataTransfer?.getData('text/plain') ?? ''
        ).split(':');
        if (sourceId && sourceId !== fleet.id && sourceShip === ship)
          emit({
            type: 'transfer-ships',
            source: sourceId,
            target: fleet.id,
            ship,
            amount: 1,
          });
      });
      row.append(cell);
    }
    grid.append(row);
  }
  page.append(grid);
  return page;
}

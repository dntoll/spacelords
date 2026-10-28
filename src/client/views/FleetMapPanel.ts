import { shipImage } from './ShipView.js';
import { shipTransferIssue } from '../models/FleetTransfer.js';
import type { AppReadModel } from '../models/AppModel.js';
import type { HexCoordinate } from '../models/HexCoordinate.js';
import type { IntentHandler } from './ViewContracts.js';
import { renderFleetCard } from './FleetCard.js';
import { bindShipTransfers } from './ShipTransferInput.js';
import { button, element } from './dom.js';
import { mapFleetRouteFeedback } from './StarMapTradeView.js';
import { renderMapLocationHeading } from './MapLocationHeading.js';

export function renderMapFleetPanel(
  model: AppReadModel,
  emit: IntentHandler,
  position: HexCoordinate,
): HTMLElement {
  const panel = element('section', 'map-fleet-management');
  panel.setAttribute('aria-label', 'Fleets at this location');
  const cell = model.cells.find(
    (candidate) => candidate.position.key === position.key,
  );
  const planet = model.ownedPlanets.find(
    (candidate) => candidate.position.key === position.key,
  );
  const place = renderMapLocationHeading(
    cell?.object?.name ?? 'Fleets',
    position,
    planet?.id,
    emit,
  );
  place.classList.add('fleet-place');
  const local = model.fleets.filter(
    (fleet) => fleet.position?.key === position.key,
  );
  const pirates = (model.pirates ?? []).filter(
    (pirate) => pirate.position.key === position.key,
  );
  if (!local.length && !pirates.length) {
    panel.append(element('p', 'muted-note', 'No fleets here.'));
    return panel;
  }
  panel.append(place);
  const cards = element('div', 'map-fleet-cards');
  for (const pirate of pirates) {
    const card = element('article', 'fleet-card pirate-card');
    card.dataset.pirateId = pirate.id;
    card.setAttribute('aria-label', 'Space pirate');
    const image = shipImage('Space pirate');
    const portrait = element('figure', 'ship-portrait');
    portrait.append(image, element('figcaption', '', 'Space pirate'));
    card.append(
      element('h3', '', 'Space pirate'),
      portrait,
      element(
        'p',
        '',
        `Hostile · ${pirate.count} ${pirate.count === 1 ? 'pirate' : 'pirates'} · Speed 1 hex/year`,
      ),
      element(
        'p',
        'muted-note',
        'Patrols this star system. Combat occurs on a shared hex after movement. One Fighter destroys up to two pirates; each pair of pirates destroys one Fighter.',
      ),
    );
    cards.append(card);
  }
  if (!local.length) {
    panel.append(cards);
    return panel;
  }

  for (const fleet of local) {
    const card = renderFleetCard(fleet, model, emit);
    cards.append(card);
  }
  const create = element('div', 'fleet-hangar new-fleet-drop');
  create.dataset.newFleet = 'true';
  create.setAttribute('role', 'group');
  create.setAttribute('aria-label', 'New fleet');
  create.append(
    element('h3', '', 'New fleet'),
    element('p', 'muted-note', 'Drop a ship here to form a fleet.'),
  );
  if (model.shipTransfer) {
    const source = model.fleets.find(
      (fleet) => fleet.id === model.shipTransfer?.fleetId,
    );
    const move = button('Move ship to new fleet', () =>
      emit({ type: 'transfer-chosen-ship', target: null }),
    );
    move.disabled =
      model.phase !== 'planning' || !source || !!shipTransferIssue(source);
    create.append(move);
  }
  cards.append(create);
  panel.append(cards);
  const feedback = mapFleetRouteFeedback(model);
  if (feedback) panel.append(element('p', 'map-route-feedback', feedback));
  if (model.shipTransfer) {
    const transfer = model.shipTransfer;
    const destinations = element('section', 'fleet-remote-targets');
    destinations.append(
      element('h3', '', 'Send ship to another fleet'),
      element(
        'p',
        'muted-note',
        `One ${transfer.ship}. Distant fleets receive physical reinforcements marked En route; an empty fleet receives the ship here.`,
      ),
    );
    const select = element('select');
    select.setAttribute('aria-label', 'Receiving fleet');
    const placeholder = element('option', '', 'Choose receiving fleet');
    placeholder.value = '';
    select.append(placeholder);
    for (const fleet of model.fleets.filter(
      (fleet) => fleet.id !== transfer.fleetId,
    )) {
      const option = element(
        'option',
        '',
        `${fleet.name} · ${fleet.position ? `HEX ${fleet.position.key}${fleet.position.key !== position.key ? ' · En route' : ''}` : 'No position'}`,
      );
      option.value = fleet.id;
      select.append(option);
    }
    select.disabled = model.phase !== 'planning';
    select.addEventListener('change', () => {
      if (select.value)
        emit({ type: 'transfer-chosen-ship', target: select.value });
    });
    destinations.append(
      select,
      button('Cancel ship transfer', () =>
        emit({ type: 'cancel-ship-transfer' }),
      ),
    );
    panel.append(destinations);
  }
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') emit({ type: 'cancel-ship-transfer' });
  });
  bindShipTransfers(panel, model, emit);
  return panel;
}

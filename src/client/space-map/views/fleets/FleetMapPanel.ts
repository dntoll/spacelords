import { shipImage } from '../ShipView.js';
import type { AppReadModel } from '../../../app/models/AppModel.js';
import type { HexCoordinate } from '../../../common/HexCoordinate.js';
import type { IntentHandler } from '../../../app/views/ViewContracts.js';
import { renderFleetCard } from '../FleetCard.js';
import { element } from '../../../common/dom.js';
import { renderMapLocationHeading } from '../MapLocationHeading.js';

export function renderMapFleetPanel(
  model: AppReadModel,
  emit: IntentHandler,
  position: HexCoordinate,
  includeLocation = true,
): HTMLElement {
  const panel = element('section', 'map-fleet-management');
  panel.setAttribute('aria-label', 'Fleets at this location');
  const cell = model.cells.find(
    (candidate) => candidate.position.key === position.key,
  );
  const place = renderMapLocationHeading(
    includeLocation ? (cell?.object?.name ?? 'Fleets') : 'Fleets',
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
        `Hostile · ${pirate.count} ${pirate.count === 1 ? 'raider' : 'raiders'}${pirate.transports ? ` · ${pirate.transports} transport` : ''} · Speed 1 hex/round`,
      ),
      element(
        'p',
        'muted-note',
        pirate.hold && Object.values(pirate.hold).some((amount) => amount > 0)
          ? `Cargo hold aboard the transport. Patrols this star system.`
          : 'Patrols this star system. Combat begins when fleets share a hex after movement.',
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
  panel.append(cards);
  return panel;
}

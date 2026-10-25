import colonyShip from '../assets/ships/colony-ship.webp';
import explorationShip from '../assets/ships/exploration-ship.webp';
import fighter from '../assets/ships/fighter.webp';
import { type FleetSnapshot, type ShipType } from '../models/Game.js';
import { button, element } from './dom.js';

export const SHIP_IMAGES: Readonly<Record<ShipType, string>> = Object.freeze({
  'Colony ship': colonyShip,
  'Exploration ship': explorationShip,
  Fighter: fighter,
  'Transport ship': `${import.meta.env.BASE_URL}transport-ship.svg`,
});
export const SHIP_TYPES: readonly ShipType[] = Object.freeze(
  Object.keys(SHIP_IMAGES) as ShipType[],
);

export function shipImage(type: ShipType): HTMLImageElement {
  const image = element('img', 'ship-image');
  image.src = SHIP_IMAGES[type];
  image.alt = type;
  image.draggable = false;
  image.decoding = 'async';
  return image;
}

// skeppsbilder: bound the preview while keeping exact totals visible for large fleets.
export function renderFleetShips(
  fleet: FleetSnapshot,
  choose?: (ship: ShipType, shipId?: string) => void,
  previewLimit = 12,
): HTMLElement {
  const manifest = element('div', 'ship-manifest');
  for (const type of SHIP_TYPES) {
    const count = fleet.ships[type];
    const units = fleet.shipUnits
      ?.filter((unit) => unit.type === type)
      .toSorted((a, b) => a.id.localeCompare(b.id));
    for (let index = 0; index < Math.min(count, previewLimit); index++) {
      const unit = units?.[index];
      const token = choose
        ? button(
            `${type} ${index + 1} in ${fleet.name}`,
            () => choose(type, unit?.id),
            'ship-token',
          )
        : element('figure', 'ship-portrait');
      if (unit) {
        token.dataset.shipId = unit.id;
        token.title = type;
      }
      token.dataset.ship = type;
      token.dataset.fleetId = fleet.id;
      token.replaceChildren(
        shipImage(type),
        element('span', 'ship-token-label', type),
      );
      manifest.append(token);
    }
    if (count > previewLimit) {
      const more = choose
        ? button(
            `Move another ${type} from ${fleet.name}`,
            () => choose(type),
            'ship-token ship-overflow',
          )
        : element('figure', 'ship-portrait ship-overflow');
      more.dataset.ship = type;
      more.dataset.fleetId = fleet.id;
      more.append(
        shipImage(type),
        element('span', 'ship-token-label', `+${count - previewLimit} ${type}`),
      );
      manifest.append(more);
    }
  }
  if (!manifest.children.length)
    manifest.append(element('p', 'muted-note', 'No ships'));
  return manifest;
}

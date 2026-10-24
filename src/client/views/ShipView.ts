import colonyShip from '../assets/ships/colony-ship.webp';
import explorationShip from '../assets/ships/exploration-ship.webp';
import fighter from '../assets/ships/fighter.webp';
import { SHIPS, type FleetSnapshot, type ShipType } from '../models/Game.js';
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
        const engines = Object.entries(unit.engines)
          .filter(([, count]) => count > 0)
          .map(([name, count]) => `${count} ${name}`)
          .join(', ');
        token.title = `${type} · ${engines} · Speed ${SHIPS[type].speed + (unit.engines['Ion pulse engine'] > 0 ? 1 : 0)} hexes/year`;
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
  if (fleet.shipUnits?.length) {
    const details = element('details', 'ship-engine-details');
    details.append(element('summary', '', 'Engines & speed'));
    const profiles = new Map<string, number>();
    for (const unit of fleet.shipUnits) {
      const engines = Object.entries(unit.engines)
        .filter(([, count]) => count > 0)
        .map(([name, count]) => `${count} ${name}`)
        .join(', ');
      const label = `${unit.type} · ${engines} · Speed ${SHIPS[unit.type].speed + (unit.engines['Ion pulse engine'] > 0 ? 1 : 0)} hexes/year`;
      profiles.set(label, (profiles.get(label) ?? 0) + 1);
    }
    for (const [label, count] of profiles)
      details.append(element('p', 'muted-note', `${count} × ${label}`));
    manifest.append(details);
  }
  if (!manifest.children.length)
    manifest.append(element('p', 'muted-note', 'No ships'));
  return manifest;
}

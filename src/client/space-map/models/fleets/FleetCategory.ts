import type { FleetSnapshot, ShipType } from '../Game.js';

/** flottkategorier: what a fleet is for, shown as its colour. */
export type FleetCategory =
  | 'Transport'
  | 'Exploration'
  | 'Colony'
  | 'Combat'
  | 'Salvage'
  | 'Civilian'
  | 'Mixed';

export const FLEET_CATEGORIES: readonly FleetCategory[] = Object.freeze([
  'Transport',
  'Exploration',
  'Colony',
  'Combat',
  'Salvage',
  'Civilian',
  'Mixed',
]);

const SHIP_CATEGORY: Readonly<Record<ShipType, FleetCategory>> = {
  'Transport ship': 'Transport',
  'Exploration ship': 'Exploration',
  'Colony ship': 'Colony',
  Fighter: 'Combat',
  Raptor: 'Combat',
  'Space pirate': 'Combat',
  'Salvage ship': 'Salvage',
  'Civilian shuttle': 'Civilian',
};

/**
 * flottkategorier: a fleet's order decides its category, so a mixed fleet
 * takes the colour of what it does. Without an order its ships decide, and
 * ships of several kinds make it Mixed.
 */
export function fleetCategory(fleet: FleetSnapshot): FleetCategory {
  if (fleet.routeId || fleet.automation === 'transport') return 'Transport';
  if (fleet.civilian) return 'Civilian';
  if (fleet.colonizationTargetId || fleet.planetQueue === 'colonization')
    return 'Colony';
  if (
    fleet.exploration ||
    fleet.explorationTargetId ||
    fleet.planetQueue === 'exploration'
  )
    return 'Exploration';
  if (fleet.salvage || fleet.automation === 'salvage' || fleet.towing?.length)
    return 'Salvage';
  if (fleet.patrol) return 'Combat';
  const kinds = new Set(
    (Object.keys(fleet.ships) as ShipType[])
      .filter((type) => fleet.ships[type] > 0)
      .map((type) => SHIP_CATEGORY[type]),
  );
  return kinds.size === 1 ? [...kinds][0]! : 'Mixed';
}

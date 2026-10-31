import type { ShipType } from './Game.js';

export function armedShipCount(
  ships: Readonly<Partial<Record<ShipType, number>>>,
): number {
  return (ships.Fighter ?? 0) + (ships['Space pirate'] ?? 0);
}

export function engineCount(type: ShipType): number {
  return type === 'Colony ship'
    ? 3
    : type === 'Exploration ship' || type === 'Salvage ship'
      ? 2
      : 1;
}

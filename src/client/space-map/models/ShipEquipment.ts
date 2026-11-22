import type { ShipType } from './Game.js';

export function engineCount(type: ShipType): number {
  return type === 'Colony ship'
    ? 3
    : type === 'Exploration ship' || type === 'Salvage ship'
      ? 2
      : 1;
}

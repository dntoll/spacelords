// spelkatalog: ship types and their properties, shared by the game model.
import type { TelescopeLevel } from './Detection.js';

export type ShipType =
  | 'Colony ship'
  | 'Exploration ship'
  | 'Fighter'
  | 'Space pirate'
  | 'Transport ship'
  | 'Salvage ship'
  | 'Civilian shuttle'
  | 'Raptor';

export const SHIPS: Readonly<
  Record<ShipType, { readonly crew: number; readonly speed: number }>
> = Object.freeze({
  'Salvage ship': { crew: 100, speed: 5 },
  'Colony ship': { crew: 1000, speed: 2 },
  'Exploration ship': { crew: 200, speed: 4 },
  Fighter: { crew: 50, speed: 3 },
  'Space pirate': { crew: 50, speed: 1 },
  'Transport ship': { crew: 50, speed: 2 },
  'Civilian shuttle': { crew: 50, speed: 2 },
  Raptor: { crew: 50, speed: 2 },
});

export type EngineType = 'Rocket engine' | 'Ion pulse engine';
export interface EngineSlot {
  readonly shipId: string;
  readonly slot: number | 'engine';
}

export interface ShipUnit {
  readonly cargoSlots?: readonly (EngineType | null)[];
  readonly telescope?: TelescopeLevel;
  readonly id: string;
  readonly type: ShipType;
  /** Fighter missile salvos. Absent means the legacy pair of two. */
  readonly missiles?: number;
  readonly armored?: boolean;
  /**
   * permanenta-skador: hull lost in earlier battles. It stays until the ship
   * is repaired; absent means undamaged.
   */
  readonly damage?: number;
  readonly engines: Readonly<{
    'Rocket engine': number;
    'Ion pulse engine': number;
  }>;
}

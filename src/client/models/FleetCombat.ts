import type { ShipType } from './Game.js';
import type { HexCoordinate } from './HexCoordinate.js';

export interface CombatResult {
  readonly fleetId: string;
  readonly pirateId: string;
  readonly position: HexCoordinate;
  readonly losses: Readonly<Record<ShipType, number>>;
  readonly pirateLosses: number;
  readonly survivingPirates: number;
  readonly survivingFighters: number;
}

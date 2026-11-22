// Read-only snapshots the game model hands to controllers and views.
import type { HexCoordinate } from '../../common/HexCoordinate.js';
import type { ShipType, ShipUnit } from './Catalog.js';
import type { Stock } from './Economy.js';
import type { Technology } from './research/Research.js';
import type { EventIllustration, EventLine } from './turn/EventDetails.js';

export interface ResearchSnapshot {
  readonly available: readonly Technology[];
  readonly completed: readonly Technology[];
  readonly selected: Technology | null;
  /** forskningstid: rounds spent per unfinished technology. */
  readonly progress?: Readonly<Partial<Record<Technology, number>>>;
  readonly queue: readonly Technology[];
}

export interface FleetSnapshot {
  readonly navigationIssue?: string | undefined;
  readonly detectionRange?: number;
  readonly remainingMovement?: number | undefined;
  /** ap-pa-starmap: hexes the fleet can still move this round. */
  readonly actionPoints?: number;
  readonly canIssueOrders?: boolean;
  readonly ownName?: string;
  readonly cargo?: Readonly<Stock>;
  readonly id: string;
  readonly name: string;
  readonly position: HexCoordinate | null;
  readonly destination: HexCoordinate | null;
  readonly ships: Readonly<Record<ShipType, number>>;
  readonly shipUnits?: readonly ShipUnit[];
  readonly speed: number;
  readonly crew: number;
}
export interface GameEvent {
  readonly heading?: string;
  readonly illustration?: EventIllustration;
  readonly lines?: readonly EventLine[];
  readonly planetId?: string;
  readonly combatLog?: readonly string[];
  readonly id: string;
  readonly round: number;
  readonly text: string;
  readonly position?: { readonly q: number; readonly r: number };
}

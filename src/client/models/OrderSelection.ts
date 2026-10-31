import type { FleetSnapshot, ShipType } from './Game.js';
import type { HexCoordinate } from './HexCoordinate.js';
import type { OrderOption, RouteOrderChoice } from './ShipOrders.js';
import type { Screen } from './AppModel.js';

export interface OrderSelection {
  readonly fleetId: string | null;
  readonly planetId: string | null;
  readonly projectId: string | null;
  readonly ship: ShipType | null;
  readonly origin: HexCoordinate;
  readonly title: string;
  readonly returnScreen: Screen;
  readonly page:
    'menu' | 'routes' | 'fleets' | 'patrol' | 'salvage' | 'colonize';
  readonly selectedFleetId: string | null;
}
export interface OrderSelectionSnapshot extends OrderSelection {
  readonly options: readonly OrderOption[];
  readonly routes: readonly RouteOrderChoice[];
  readonly fleetTargets: readonly FleetSnapshot[];
}

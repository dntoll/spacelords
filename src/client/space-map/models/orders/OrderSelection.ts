import type { FleetSnapshot } from '../Game.js';
import type { HexCoordinate } from '../../../common/HexCoordinate.js';
import type { OrderOption } from '../ShipOrders.js';
import type { Screen } from '../../../app/models/AppModel.js';

export interface OrderSelection {
  readonly fleetId: string;
  readonly origin: HexCoordinate;
  readonly title: string;
  readonly returnScreen: Screen;
  readonly page: 'menu' | 'fleets' | 'patrol' | 'explore-planet';
  readonly selectedFleetId: string | null;
}
export interface OrderSelectionSnapshot extends OrderSelection {
  readonly options: readonly OrderOption[];
  readonly fleetTargets: readonly FleetSnapshot[];
}

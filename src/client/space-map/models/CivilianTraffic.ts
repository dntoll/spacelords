import type { HexCoordinate } from '../../common/HexCoordinate.js';

export const SHUTTLE_CAPACITY = 500;

export interface CivilianOrder {
  passengers: number;
  reserved: number;
  sourceId?: string | undefined;
  targetId?: string | undefined;
  nextPlanetId?: string;
  legRouteId?: string;
  path: string[];
  stopping: boolean;
  status: string;
}

export interface CivilianFleet {
  ordersPaused?: boolean;
  id: string;
  name: string;
  ships: { readonly 'Civilian shuttle': number };
  position: HexCoordinate | null;
  destination: HexCoordinate | null;
  courseOrigin?: HexCoordinate;
  civilian?: CivilianOrder;
  homeRouteId?: string;
}

export class CivilianTraffic {
  static order(): CivilianOrder {
    return {
      passengers: 0,
      reserved: 0,
      path: [],
      stopping: false,
      status: 'Inactive',
    };
  }

  static validate(
    order: CivilianOrder,
    capacity: number,
    planetExists: (id: string) => boolean,
  ): void {
    if (
      !order ||
      !Number.isSafeInteger(order.passengers) ||
      order.passengers < 0 ||
      order.passengers > capacity ||
      !Number.isSafeInteger(order.reserved) ||
      order.reserved < 0 ||
      order.reserved > capacity ||
      typeof order.stopping !== 'boolean' ||
      typeof order.status !== 'string' ||
      !Array.isArray(order.path) ||
      order.path.some((id) => !planetExists(id)) ||
      [order.sourceId, order.targetId, order.nextPlanetId].some(
        (id) => id !== undefined && !planetExists(id),
      ) ||
      (order.legRouteId !== undefined &&
        typeof order.legRouteId !== 'string') ||
      ((order.passengers > 0 || order.reserved > 0) &&
        (!order.sourceId || !order.targetId))
    )
      throw new Error('Invalid saved civilian transport order.');
  }

  stop(fleet: CivilianFleet): void {
    if (!fleet.civilian) return;
    if (fleet.civilian.passengers) {
      if (!fleet.civilian.stopping)
        fleet.civilian.status = `Stopping after delivery: ${fleet.civilian.status}`;
      fleet.civilian.stopping = true;
    } else {
      delete fleet.civilian;
      fleet.destination = null;
      delete fleet.courseOrigin;
    }
  }
}

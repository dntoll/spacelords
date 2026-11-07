import type { FleetSnapshot } from '../Game.js';
import type { HexCoordinate } from '../HexCoordinate.js';
import type { TradeRouteSnapshot } from '../Logistics.js';
import { armedShipCount } from '../ShipEquipment.js';

export function tradeAssignmentIssue(
  fleet: FleetSnapshot,
  route: TradeRouteSnapshot,
  fleets: readonly FleetSnapshot[] = [],
): string | null {
  if (fleet.upgrade) return 'Cancel Upgrade before assigning a trade route';
  if (fleet.civilian)
    return 'Stop Civilian transport before assigning a trade route';
  if (route.closing) return 'Route is closing';
  if (fleet.towing?.length) return 'Release or deliver towed wrecks first';
  if (fleet.salvage) return 'Salvage order active';
  if (fleet.routeId) return 'Already assigned to a route';
  if (fleet.joinFleetId) return 'Reinforcement order active';
  if (fleet.destination && !fleet.patrol) return 'Fleet is travelling';
  if (!fleet.ships['Transport ship']) {
    if (!armedShipCount(fleet.ships))
      return 'Needs a Transport ship or armed ship';
    if (!routeEscortTargets(route.id, fleets).length)
      return 'Assign a transport fleet to this route before adding escorts';
  }
  if (!fleet.position) return 'Fleet has no position';
  return null;
}

export function routeEscortTargets(
  routeId: string,
  fleets: readonly FleetSnapshot[],
): readonly FleetSnapshot[] {
  return fleets.filter(
    (fleet) =>
      fleet.routeId === routeId &&
      !fleet.releaseRequested &&
      fleet.ships['Transport ship'] > 0 &&
      fleet.position,
  );
}

/** automatisk-farledsbemanning: transports and shuttles, including those still travelling. */
export function routeManning(
  routeId: string,
  fleets: readonly FleetSnapshot[],
): number {
  return fleets
    .filter(
      (fleet) =>
        (fleet.routeId === routeId || fleet.homeRouteId === routeId) &&
        !fleet.releaseRequested,
    )
    .reduce(
      (total, fleet) =>
        total +
        (fleet.ships['Transport ship'] ?? 0) +
        (fleet.ships['Civilian shuttle'] ?? 0),
      0,
    );
}

export function routeEscortCount(
  routeId: string,
  fleets: readonly FleetSnapshot[],
): number {
  const carriers = routeEscortTargets(routeId, fleets);
  const carrierIds = new Set(carriers.map((fleet) => fleet.id));
  return (
    carriers.reduce((total, fleet) => total + armedShipCount(fleet.ships), 0) +
    fleets
      .filter((fleet) => fleet.joinFleetId && carrierIds.has(fleet.joinFleetId))
      .reduce((total, fleet) => total + armedShipCount(fleet.ships), 0)
  );
}

function routeDistance(
  route: TradeRouteSnapshot,
  origin: HexCoordinate,
): number {
  return Math.min(origin.distanceTo(route.start), origin.distanceTo(route.end));
}

export function nearestLeastMannedRoute(
  origin: HexCoordinate,
  routes: readonly TradeRouteSnapshot[],
  fleets: readonly FleetSnapshot[],
): TradeRouteSnapshot | undefined {
  return [...routes]
    .filter((route) => !route.closing)
    .sort(
      (a, b) =>
        routeManning(a.id, fleets) - routeManning(b.id, fleets) ||
        routeDistance(a, origin) - routeDistance(b, origin) ||
        a.id.localeCompare(b.id),
    )[0];
}

/** guard-routes: only routes that already have a Transport ship. */
export function nearestUnguardedRoute(
  origin: HexCoordinate,
  routes: readonly TradeRouteSnapshot[],
  fleets: readonly FleetSnapshot[],
): TradeRouteSnapshot | undefined {
  return [...routes]
    .filter(
      (route) =>
        !route.closing && routeEscortTargets(route.id, fleets).length > 0,
    )
    .sort(
      (a, b) =>
        routeEscortCount(a.id, fleets) - routeEscortCount(b.id, fleets) ||
        routeDistance(a, origin) - routeDistance(b, origin) ||
        a.id.localeCompare(b.id),
    )[0];
}

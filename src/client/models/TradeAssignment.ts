import type { FleetSnapshot } from './Game.js';
import type { TradeRouteSnapshot } from './Logistics.js';

export function tradeAssignmentIssue(
  fleet: FleetSnapshot,
  route: TradeRouteSnapshot,
  fleets: readonly FleetSnapshot[] = [],
): string | null {
  if (route.closing) return 'Route is closing';
  if (fleet.towing?.length) return 'Release or deliver towed wrecks first';
  if (fleet.salvage) return 'Salvage order active';
  if (fleet.routeId) return 'Already assigned to a route';
  if (fleet.joinFleetId) return 'Reinforcement order active';
  if (fleet.destination && !fleet.patrol) return 'Fleet is travelling';
  if (!fleet.ships['Transport ship']) {
    if (!fleet.ships.Fighter) return 'Needs a Transport ship or Fighter';
    if (!routeEscortTargets(route.id, fleets).length)
      return 'Assign a transport fleet to this route before adding Fighters';
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

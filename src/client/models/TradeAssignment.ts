import type { FleetSnapshot } from './Game.js';
import type { TradeRouteSnapshot } from './Logistics.js';

export function tradeAssignmentIssue(
  fleet: FleetSnapshot,
  route: TradeRouteSnapshot,
): string | null {
  if (route.closing) return 'Route is closing';
  if (fleet.routeId) return 'Already assigned to a route';
  if (fleet.joinFleetId) return 'Reinforcement order active';
  if (fleet.destination) return 'Fleet is travelling';
  if (!fleet.ships['Transport ship']) return 'Needs a Transport ship';
  if (!fleet.position) return 'Fleet has no position';
  return null;
}

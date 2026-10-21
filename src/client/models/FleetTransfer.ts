import type { FleetSnapshot } from './Game.js';

// skepp-ur-olastad-ruttflotta: cargo belongs to the entire fleet.
export function shipTransferIssue(
  fleet: Pick<FleetSnapshot, 'routeId' | 'cargo'>,
): string | null {
  return fleet.routeId &&
    Object.values(fleet.cargo ?? {}).some((amount) => amount > 0)
    ? 'Ships cannot be moved out while this fleet carries cargo.'
    : null;
}

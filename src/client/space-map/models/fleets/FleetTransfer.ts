import type { FleetSnapshot } from '../Game.js';

export function shipTransferIssue(
  fleet: Pick<FleetSnapshot, 'upgrade'>,
): string | null {
  return fleet.upgrade ? 'Cancel Upgrade before transferring ships.' : null;
}

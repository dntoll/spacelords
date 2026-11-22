import type { HexCoordinate } from '../../../common/HexCoordinate.js';
import type { Game } from '../Game.js';
import type { FleetSnapshot } from '../GameSnapshots.js';

/** hexval-med-vag: a fleet's previewed route to the selected hex. */
export interface TravelRoute {
  readonly fleetId: string;
  readonly from: HexCoordinate;
  readonly steps: readonly HexCoordinate[];
  /** Hexes the slowest ship lets the fleet move each round. */
  readonly perRound: number;
}

/**
 * enda-spelarflottan: the player's fleet that travels on the map, the
 * selected one when it can move, otherwise the first fleet with ships.
 */
export function travelFleet(
  game: Game,
  preferredId: string | null,
): FleetSnapshot | null {
  const movable = game
    .fleetSnapshots()
    .filter(
      (fleet) =>
        fleet.position && Object.values(fleet.ships).some((count) => count > 0),
    );
  return (
    movable.find((fleet) => fleet.id === preferredId) ?? movable[0] ?? null
  );
}

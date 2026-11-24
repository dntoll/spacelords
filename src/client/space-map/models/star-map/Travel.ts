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
  /** ap-pa-starmap: hexes the fleet can still move this round. */
  readonly available: number;
  /**
   * somlos-forflyttning: rounds only matter while a pirate is in sight, as
   * that is when the enemies act between the player's moves.
   * Without one the journey is shown and played as one seamless move.
   */
  readonly contested: boolean;
}

/** enda-spelarflottan: the player's fleet when it can travel. */
export function travelFleet(game: Game): FleetSnapshot | null {
  const fleet = game.fleetSnapshot();
  return fleet.position && Object.values(fleet.ships).some((count) => count > 0)
    ? fleet
    : null;
}

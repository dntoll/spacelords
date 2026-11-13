/** meterskala-i-bordning: one square cell is one meter on each ground axis. */
export const BOARDING_METERS = Object.freeze({
  tile: 1,
  wall: 2.4,
  thinWall: 1 / 3,
  cutawayWall: 0.4,
  opening: 2.1,
  frame: 2.3,
  person: 1.8,
  crouchedPerson: 1.2,
  incapacitatedPerson: 0.72,
  cover: 1.2,
  reactor: 1.8,
  rifle: 1.3,
  crouchedRifle: 0.8,
});

export const BOARDING_TILE_WIDTH = 64;
/** isometri-3-2-i-bordning: a 3:2 ground diamond, camera elevation asin(2/3) ≈ 41.8°. */
export const BOARDING_TILE_HEIGHT = (BOARDING_TILE_WIDTH * 2) / 3;
/** Screen depth per screen width of a ground footprint. */
export const BOARDING_GROUND_RATIO = BOARDING_TILE_HEIGHT / BOARDING_TILE_WIDTH;

const GROUND_METER = BOARDING_TILE_WIDTH / Math.SQRT2;
export const BOARDING_VERTICAL_METER =
  GROUND_METER * Math.sqrt(1 - BOARDING_GROUND_RATIO ** 2);

// The existing sprites were rendered for the earlier 2:1 (30 degree) camera.
// isometri-3-2-i-bordning: they are compressed vertically, never horizontally.
const SPRITE_VERTICAL_METER = GROUND_METER * Math.cos(Math.PI / 6);
export const BOARDING_SPRITE_SQUASH =
  BOARDING_VERTICAL_METER / SPRITE_VERTICAL_METER;

export function boardingHeight(meters: number): number {
  return meters * BOARDING_VERTICAL_METER;
}

export function boardingWorldPoint(
  q: number,
  r: number,
  height = 0,
): { x: number; y: number } {
  return {
    x: ((q - r) * BOARDING_TILE_WIDTH) / 2,
    y: ((q + r) * BOARDING_TILE_HEIGHT) / 2 - boardingHeight(height),
  };
}

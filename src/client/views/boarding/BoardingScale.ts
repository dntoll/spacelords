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
export const BOARDING_TILE_HEIGHT = 32;

// An orthographic 2:1 ground diamond has a 30 degree camera elevation.
export const BOARDING_VERTICAL_METER = 16 * Math.sqrt(6);

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

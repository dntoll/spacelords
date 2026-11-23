import type { HexCoordinate, Point } from '../../../common/HexCoordinate.js';
import type { MapCell } from '../../models/Galaxy.js';

/** glidande-hexsteg: ease between hex centres so the marker slides instead of popping. */
export function fleetGlideProgress(progress: number): number {
  const t = Math.max(0, Math.min(1, progress));
  return t * t * (3 - 2 * t);
}

export function fleetGlidePoint(
  from: Point,
  to: Point,
  progress: number,
): Point {
  const t = fleetGlideProgress(progress);
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
  };
}

/** langsam-forflyttning-i-asteroidbalte: how much slower a belt step glides. */
export const ASTEROID_GLIDE_FACTOR = 3;

/**
 * langsam-forflyttning-i-asteroidbalte: a step into or out of a sparse
 * asteroid belt costs the whole round, so it also glides more slowly.
 */
export function fleetGlideDuration(
  base: number,
  movements: readonly {
    readonly from: HexCoordinate;
    readonly to: HexCoordinate;
  }[],
  cells: readonly MapCell[],
): number {
  const belt = new Set(
    cells
      .filter((cell) => cell.terrain === 'sparse-asteroids')
      .map((cell) => cell.position.key),
  );
  return movements.some(
    (movement) => belt.has(movement.from.key) || belt.has(movement.to.key),
  )
    ? base * ASTEROID_GLIDE_FACTOR
    : base;
}

import {
  HexGeometry,
  type HexCoordinate,
  type Point,
} from '../../../common/HexCoordinate.js';
import type { MapCell } from '../../models/Galaxy.js';

/** flytande-forflyttning: soften journey endpoints while preserving speed between steps. */
export function fleetGlideProgress(
  progress: number,
  ends: { readonly start: boolean; readonly end: boolean } = {
    start: true,
    end: true,
  },
): number {
  const t = Math.max(0, Math.min(1, progress));
  if (ends.start && ends.end) return t * t * (3 - 2 * t);
  if (ends.start) return 2 * t * t - t * t * t;
  if (ends.end) return t + t * t - t * t * t;
  return t;
}

export function fleetGlidePoint(
  from: Point,
  to: Point,
  progress: number,
): Point {
  const t = Math.max(0, Math.min(1, progress));
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
  };
}

/** sikt-under-forflyttning: detection changes at the shared edge. */
export function fleetGlideCrossed(
  from: HexCoordinate,
  to: HexCoordinate,
  point: Point,
): boolean {
  const a = HexGeometry.toPoint(from),
    b = HexGeometry.toPoint(to);
  return (
    (point.x - (a.x + b.x) / 2) * (b.x - a.x) +
      (point.y - (a.y + b.y) / 2) * (b.y - a.y) >=
    -1e-7
  );
}

/** rak-och-jamn-resa: project a route hex onto the journey line when it touches that hex. */
export function fleetGlideWaypoint(
  start: HexCoordinate,
  target: HexCoordinate,
  hex: HexCoordinate,
): Point {
  const a = HexGeometry.toPoint(start),
    b = HexGeometry.toPoint(target),
    center = HexGeometry.toPoint(hex);
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  if (!length) return center;
  const t = Math.max(
    0,
    Math.min(1, ((center.x - a.x) * dx + (center.y - a.y) * dy) / length),
  );
  const point = { x: a.x + t * dx, y: a.y + t * dy };
  return touchesHex(point, hex) ? point : center;
}

function touchesHex(point: Point, hex: HexCoordinate): boolean {
  const center = HexGeometry.toPoint(hex);
  const x = Math.abs(point.x - center.x),
    y = Math.abs(point.y - center.y);
  const root = Math.sqrt(3),
    epsilon = 1e-6;
  return (
    x <= (root * HexGeometry.size) / 2 + epsilon &&
    x + root * y <= root * HexGeometry.size + epsilon
  );
}

function segmentInterval(
  hex: HexCoordinate,
  a: Point,
  b: Point,
): [number, number] | null {
  const center = HexGeometry.toPoint(hex),
    root = Math.sqrt(3);
  let lower = 0,
    upper = 1;
  const limits = [
    [1, 0, (root * HexGeometry.size) / 2],
    [-1, 0, (root * HexGeometry.size) / 2],
    [1, root, root * HexGeometry.size],
    [-1, root, root * HexGeometry.size],
    [1, -root, root * HexGeometry.size],
    [-1, -root, root * HexGeometry.size],
  ];
  for (const [nx = 0, ny = 0, limit = 0] of limits) {
    const initial = nx * (a.x - center.x) + ny * (a.y - center.y);
    const delta = nx * (b.x - a.x) + ny * (b.y - a.y);
    if (Math.abs(delta) < 1e-9) {
      if (initial > limit + 1e-6) return null;
      continue;
    }
    const crossing = (limit + 1e-6 - initial) / delta;
    if (delta > 0) upper = Math.min(upper, crossing);
    else lower = Math.max(lower, crossing);
    if (lower > upper) return null;
  }
  return [lower, upper];
}

/** Keep each drawn segment inside the two hexes used by the simulation. */
export function fleetGlideSegmentSafe(
  from: HexCoordinate,
  to: HexCoordinate,
  a: Point,
  b: Point,
): boolean {
  const first = segmentInterval(from, a, b),
    second = segmentInterval(to, a, b);
  return (
    !!first &&
    !!second &&
    first[0] <= 0 &&
    second[1] >= 1 &&
    first[1] >= second[0]
  );
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

import type { Point } from '../../../common/HexCoordinate.js';

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

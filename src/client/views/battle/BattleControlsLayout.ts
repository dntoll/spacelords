import { HexGeometry, type Point } from '../../models/HexCoordinate.js';
import type { BattleViewportSnapshot } from './BattleCameraController.js';

export interface ManeuverControlPoints {
  readonly straight: Point;
  readonly left: Point;
  readonly right: Point;
  readonly done: Point;
  readonly faster: Point;
  readonly slower: Point;
  readonly speed: Point;
}

const hexWidth = Math.sqrt(3) * HexGeometry.size;

function shift(
  origin: Point,
  facing: number,
  scale: number,
  fraction: number,
): Point {
  const angle = (((facing % 6) + 6) % 6 * -Math.PI) / 3;
  const distance = hexWidth * scale * fraction;
  return {
    x: origin.x + Math.cos(angle) * distance,
    y: origin.y + Math.sin(angle) * distance,
  };
}

/** styrning-pa-skrovet: headings on the bow edges, speed at the stern, done amidships. */
export function maneuverControlsLayout(
  nose: Point,
  center: Point,
  stern: Point,
  facing: number,
  scale: number,
  singleHex: boolean,
): ManeuverControlPoints {
  const back = (facing + 3) % 6;
  const speed = shift(stern, back, scale, singleHex ? 0.42 : 0.12);
  const flank = (side: number): Point => {
    const angle = (((facing % 6) + 6) % 6 * -Math.PI) / 3 + Math.PI / 2;
    const distance = hexWidth * scale * 0.24 * side;
    return {
      x: speed.x + Math.cos(angle) * distance,
      y: speed.y + Math.sin(angle) * distance,
    };
  };
  return {
    straight: shift(nose, facing, scale, 0.5),
    left: shift(nose, facing + 1, scale, 0.5),
    right: shift(nose, facing - 1, scale, 0.5),
    done: center,
    faster: flank(1),
    slower: flank(-1),
    speed,
  };
}

export function battleControlsLayout(
  view: BattleViewportSnapshot,
  hull: readonly Point[],
  facing: number,
  count: number,
  otherHulls: readonly Point[] = [],
): readonly Point[] {
  if (!hull.length) return [];
  const center = hull[Math.floor(hull.length / 2)]!;
  const low = { x: 30, y: Math.min(115, view.height / 3) };
  const high = { x: view.width - 30, y: view.height - 105 };
  const angle = (-facing * Math.PI) / 3;
  const radius = Math.max(62, 36 * view.scale + 34);
  const length =
    hull.length > 1
      ? Math.hypot(hull[0]!.x - center.x, hull[0]!.y - center.y)
      : 0;
  const chosen: Point[] = [];
  // skeppsnara-stridskontroller: retain directional anchors, then fan inward at edges.
  for (const direction of (count === 2
    ? [-Math.PI / 2, Math.PI / 2]
    : [0, -Math.PI / 2, Math.PI / 2, Math.PI]
  ).slice(0, count)) {
    const candidates: Point[] = [];
    for (const extra of [0, 22, 48, 80, 112])
      for (const shift of [
        0,
        Math.PI / 6,
        -Math.PI / 6,
        Math.PI / 3,
        -Math.PI / 3,
        Math.PI / 2,
        -Math.PI / 2,
        Math.PI,
      ]) {
        const a = angle + direction + shift;
        const r =
          radius + length * Math.abs(Math.cos(direction + shift)) + extra;
        candidates.push({
          x: Math.max(low.x, Math.min(high.x, center.x + Math.cos(a) * r)),
          y: Math.max(low.y, Math.min(high.y, center.y + Math.sin(a) * r)),
        });
      }
    const overlap = (point: Point) =>
      chosen.some(
        (other) => Math.hypot(other.x - point.x, other.y - point.y) < 54,
      );
    const onHull = (point: Point) =>
      hull.some(
        (hex) =>
          Math.hypot(hex.x - point.x, hex.y - point.y) < 29 * view.scale + 30,
      );
    const onOtherShip = (point: Point) =>
      otherHulls.some(
        (hex) =>
          Math.hypot(hex.x - point.x, hex.y - point.y) < 36 * view.scale + 28,
      );
    chosen.push(
      candidates.find(
        (point) => !overlap(point) && !onHull(point) && !onOtherShip(point),
      ) ??
        candidates.find((point) => !overlap(point) && !onHull(point)) ??
        candidates.find((point) => !overlap(point)) ??
        candidates[0]!,
    );
  }
  return chosen;
}

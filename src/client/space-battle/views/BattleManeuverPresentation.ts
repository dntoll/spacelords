import {
  HexCoordinate,
  HexGeometry,
  type Point,
} from '../../common/HexCoordinate.js';
import type { ManeuverStep } from '../models/Maneuver.js';

/** animerad-skeppsforflyttning: interpolate in world coordinates without mutating hexes. */
export function maneuverFrame(
  from: ManeuverStep,
  to: ManeuverStep,
  progress: number,
): { offset: Point; facing: number } {
  const t = Math.max(0, Math.min(1, progress));
  const a = HexGeometry.toPoint(
    new HexCoordinate(from.position.q, from.position.r),
  );
  const b = HexGeometry.toPoint(
    new HexCoordinate(to.position.q, to.position.r),
  );
  const turn = ((to.facing - from.facing + 9) % 6) - 3;
  return {
    offset: { x: (b.x - a.x) * t, y: (b.y - a.y) * t },
    facing: from.facing + turn * t,
  };
}

/** manoverval-vid-hexkant: anchor at the facing edge and fan out only as needed. */
export function maneuverOptionLayout(
  options: readonly { center: Point; facing: number }[],
  scale: number,
  viewport: { width: number; height: number },
): readonly Point[] {
  const chosen: Point[] = [];
  const spacing = maneuverOptionSize(scale) + 2;
  for (const { center, facing } of options) {
    const angle = (-facing * Math.PI) / 3;
    const forward = { x: Math.cos(angle), y: Math.sin(angle) };
    const tangent = { x: -forward.y, y: forward.x };
    const edge = (Math.sqrt(3) * HexGeometry.size * scale) / 2;
    const candidates: Point[] = [];
    for (const away of [0, spacing, 2 * spacing, 3 * spacing, 4 * spacing]) {
      for (const along of [
        0,
        spacing,
        -spacing,
        2 * spacing,
        -2 * spacing,
        3 * spacing,
        -3 * spacing,
      ]) {
        candidates.push({
          x: Math.max(
            20,
            Math.min(
              viewport.width - 20,
              center.x + forward.x * (edge + away) + tangent.x * along,
            ),
          ),
          y: Math.max(
            64,
            Math.min(
              viewport.height - 64,
              center.y + forward.y * (edge + away) + tangent.y * along,
            ),
          ),
        });
      }
    }
    chosen.push(
      candidates.find((point) =>
        chosen.every(
          (other) =>
            Math.abs(point.x - other.x) >= spacing ||
            Math.abs(point.y - other.y) >= spacing,
        ),
      ) ?? candidates[0]!,
    );
  }
  return chosen;
}

export function maneuverOptionSize(scale: number): number {
  return Math.max(
    24,
    Math.min(34, Math.sqrt(3) * HexGeometry.size * scale * 0.65),
  );
}

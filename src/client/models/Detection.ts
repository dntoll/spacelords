import { HexCoordinate, HexGeometry } from './HexCoordinate.js';

export const TELESCOPES = [
  'Telescope I',
  'Telescope II',
  'Telescope III',
] as const;
export type Telescope = (typeof TELESCOPES)[number];
export type TelescopeLevel = 1 | 2 | 3;

export interface DetectionSource {
  readonly position: HexCoordinate;
  readonly range: number;
}

/** aktuell-detektionssikt: observers determine current sight independently of memory. */
export class Detection {
  static planetRange(buildings: readonly { readonly type: string }[]): number {
    return Math.max(
      1,
      ...buildings.map(
        (building) =>
          TELESCOPES.findIndex((type) => `${type} factory` === building.type) +
          1,
      ),
    );
  }
  static coverage(
    sources: readonly DetectionSource[],
    nebula: (point: HexCoordinate) => boolean = () => false,
    surface = false,
  ): ReadonlySet<string> {
    const visible = new Set<string>();
    for (const source of sources) {
      visible.add(source.position.key);
      if (nebula(source.position)) continue;
      for (const offset of HexCoordinate.disk(source.range)) {
        const target = new HexCoordinate(
          source.position.q + offset.q,
          source.position.r + offset.r,
        );
        if (!surface && nebula(target)) continue;
        const distance = source.position.distanceTo(target);
        const start = HexGeometry.toPoint(source.position),
          end = HexGeometry.toPoint(target);
        let blocked = false;
        // Check both sides of an exact edge so sight cannot leak between cloud hexes.
        for (let step = 1; step < distance && !blocked; step++) {
          for (const epsilon of [-1e-6, 1e-6]) {
            const point = HexGeometry.fromPoint({
              x: start.x + ((end.x - start.x) * step) / distance + epsilon,
              y: start.y + ((end.y - start.y) * step) / distance + epsilon,
            });
            if (nebula(point)) blocked = true;
          }
        }
        if (!blocked) visible.add(target.key);
      }
    }
    return visible;
  }
}

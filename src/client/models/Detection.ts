import { HexCoordinate } from './HexCoordinate.js';

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
  static coverage(sources: readonly DetectionSource[]): ReadonlySet<string> {
    const visible = new Set<string>();
    for (const source of sources)
      for (const offset of HexCoordinate.disk(source.range))
        visible.add(
          new HexCoordinate(
            source.position.q + offset.q,
            source.position.r + offset.r,
          ).key,
        );
    return visible;
  }
}

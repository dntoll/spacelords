import type {
  BoardingCell,
  BoardingLight,
  BoardingMap,
} from '../models/BoardingMap.js';
import type { BoardingBattleState } from '../models/BoardingBattle.js';
import { BOARDING_METERS } from './BoardingScale.js';

export const BOARDING_AMBIENT = 0.65;
export type BoardingSurface = 'floor' | 'top' | 'southEast' | 'southWest';
interface WorldPoint {
  readonly q: number;
  readonly r: number;
  readonly z: number;
}
interface LightBlock {
  readonly position: BoardingCell;
  readonly height: number;
}
const EPSILON = 0.0001;

// Inclusive slab intersections also stop light slipping through diagonal wall corners.
function intersects(
  from: WorldPoint,
  to: WorldPoint,
  block: LightBlock,
): boolean {
  let near = EPSILON,
    far = 1 - EPSILON;
  for (const [start, end, min, max] of [
    [from.q, to.q, block.position.q - 0.5, block.position.q + 0.5],
    [from.r, to.r, block.position.r - 0.5, block.position.r + 0.5],
    [from.z, to.z, 0, block.height],
  ] as const) {
    const delta = end - start;
    if (Math.abs(delta) < 1e-9) {
      if (start < min || start > max) return false;
    } else {
      const a = (min - start) / delta,
        b = (max - start) / delta;
      near = Math.max(near, Math.min(a, b));
      far = Math.min(far, Math.max(a, b));
      if (near > far) return false;
    }
  }
  return true;
}

/** ljuskallestyrd-bordningsbelysning: physical light never depends on observers. */
export class BoardingLighting {
  readonly #lights: readonly BoardingLight[];
  readonly #blocks: readonly LightBlock[];
  readonly #tiles = new Map<string, number>();
  readonly #surfaces = new Map<string, readonly number[]>();

  constructor(
    map: BoardingMap,
    state: Pick<BoardingBattleState, 'features' | 'smokeCells'>,
  ) {
    this.#lights = map.lights;
    this.#blocks = [
      ...state.features
        .filter(
          (feature) =>
            !feature.destroyed &&
            (feature.kind === 'wall' ||
              feature.kind === 'hull' ||
              (feature.kind === 'door' && !feature.open)),
        )
        .map((feature) => ({
          position: feature.position,
          height: BOARDING_METERS.wall,
        })),
      ...state.smokeCells.map((position) => ({
        position,
        height: BOARDING_METERS.wall,
      })),
    ];
  }

  static signature(
    state: Pick<BoardingBattleState, 'features' | 'smokeCells'>,
  ): string {
    return JSON.stringify([
      state.features
        .filter(
          (feature) =>
            feature.kind === 'wall' ||
            feature.kind === 'hull' ||
            feature.kind === 'door',
        )
        .map((feature) => [
          feature.position.q,
          feature.position.r,
          feature.destroyed,
          feature.open,
        ]),
      state.smokeCells,
    ]);
  }

  #sample(
    point: WorldPoint,
    normal: WorldPoint,
    ownWall?: BoardingCell,
  ): number {
    let result = BOARDING_AMBIENT;
    for (const light of this.#lights) {
      const source = { ...light.position, z: light.height };
      const dq = source.q - point.q,
        dr = source.r - point.r,
        dz = source.z - point.z;
      const distance = Math.hypot(dq, dr, dz);
      if (distance >= light.radius) continue;
      const incidence = Math.max(
        0,
        (dq * normal.q + dr * normal.r + dz * normal.z) /
          Math.max(EPSILON, distance),
      );
      if (incidence === 0) continue;
      if (
        this.#blocks.some(
          (block) =>
            !(
              ownWall &&
              block.position.q === ownWall.q &&
              block.position.r === ownWall.r
            ) && intersects(source, point, block),
        )
      )
        continue;
      result +=
        light.intensity * (1 - distance / light.radius) ** 2 * incidence;
    }
    return Math.min(1, result);
  }

  /** tileljus-for-sprites: sample the center, not the average of floor corners. */
  tile(position: BoardingCell): number {
    const key = `${position.q},${position.r}`;
    let value = this.#tiles.get(key);
    if (value === undefined) {
      value = this.#sample({ ...position, z: EPSILON }, { q: 0, r: 0, z: 1 });
      this.#tiles.set(key, value);
    }
    return value;
  }

  /** vertexljus-i-bordning: values follow the projection's clockwise quad order. */
  surface(
    position: BoardingCell,
    face: BoardingSurface,
    height = 0,
  ): readonly number[] {
    const key = `${position.q},${position.r},${face},${height}`;
    const cached = this.#surfaces.get(key);
    if (cached) return cached;
    const q = position.q,
      r = position.r;
    const floor = face === 'floor';
    const h = floor ? 0 : height;
    const corners = [
      { q: q - 0.5, r: r - 0.5, z: h },
      { q: q + 0.5, r: r - 0.5, z: h },
      { q: q + 0.5, r: r + 0.5, z: h },
      { q: q - 0.5, r: r + 0.5, z: h },
    ];
    const points =
      face === 'southEast'
        ? [
            corners[1]!,
            corners[2]!,
            { ...corners[2]!, z: 0 },
            { ...corners[1]!, z: 0 },
          ]
        : face === 'southWest'
          ? [
              corners[2]!,
              corners[3]!,
              { ...corners[3]!, z: 0 },
              { ...corners[2]!, z: 0 },
            ]
          : corners;
    const normal =
      face === 'southEast'
        ? { q: 1, r: 0, z: 0 }
        : face === 'southWest'
          ? { q: 0, r: 1, z: 0 }
          : { q: 0, r: 0, z: 1 };
    const values = Object.freeze(
      points.map((point) =>
        this.#sample(
          {
            q: point.q + (floor ? (q - point.q) * EPSILON : normal.q * EPSILON),
            r: point.r + (floor ? (r - point.r) * EPSILON : normal.r * EPSILON),
            z: point.z + normal.z * EPSILON,
          },
          normal,
          floor ? undefined : position,
        ),
      ),
    );
    this.#surfaces.set(key, values);
    return values;
  }
}

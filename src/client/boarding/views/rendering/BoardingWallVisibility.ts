import {
  BOARDING_METERS,
  BOARDING_VERTICAL_METER,
  boardingHeight,
} from './BoardingScale.js';
import type {
  BoardingCell,
  BoardingThinPiece,
} from '../../models/map/BoardingMap.js';
import {
  BOARDING_HALF_TILE_WIDTH,
  BOARDING_HALF_TILE_HEIGHT,
  BOARDING_COVER_HEIGHT,
  BOARDING_WALL_HEIGHT,
  boardingIsoBlockFaces,
  boardingIsoCenter,
  boardingIsoCorners,
  boardingThinWallOutline,
  type BoardingPoint,
} from './BoardingProjection.js';

export interface BoardingWallShape {
  /** sammanfogade-tunna-vaggar: the slabs of a thin wall or a door. */
  readonly pieces?: readonly BoardingThinPiece[];
  readonly low?: boolean;
  /** dorrar-falls-inte: a door keeps its full height. */
  readonly door?: boolean;
}

function silhouette(
  position: BoardingCell,
  height = BOARDING_WALL_HEIGHT,
): readonly BoardingPoint[] {
  const faces = boardingIsoBlockFaces(
    boardingIsoCenter(position),
    BOARDING_HALF_TILE_WIDTH,
    BOARDING_HALF_TILE_HEIGHT,
    height,
  );
  return [
    faces.top[0],
    faces.top[1],
    faces.southEast[3],
    faces.southEast[2],
    faces.southWest[2],
    faces.top[3],
  ];
}

function outlines(
  position: BoardingCell,
  shape: BoardingWallShape,
  height: number,
): readonly (readonly BoardingPoint[])[] {
  return shape.pieces
    ? shape.pieces.map((piece) =>
        boardingThinWallOutline(
          position,
          piece.axis,
          height / BOARDING_VERTICAL_METER,
          piece.span,
        ),
      )
    : [silhouette(position, height)];
}

function overlaps(
  a: readonly BoardingPoint[],
  b: readonly BoardingPoint[],
): boolean {
  for (const polygon of [a, b]) {
    for (let index = 0; index < polygon.length; index++) {
      const start = polygon[index]!,
        end = polygon[(index + 1) % polygon.length]!;
      const nx = -(end.y - start.y),
        ny = end.x - start.x;
      const valuesA = a.map((point) => point.x * nx + point.y * ny);
      const valuesB = b.map((point) => point.x * nx + point.y * ny);
      if (
        Math.max(...valuesA) <= Math.min(...valuesB) + 1e-6 ||
        Math.max(...valuesB) <= Math.min(...valuesA) + 1e-6
      )
        return false;
    }
  }
  return true;
}

function contains(
  polygon: readonly BoardingPoint[],
  point: BoardingPoint,
): boolean {
  let sign = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!,
      b = polygon[(i + 1) % polygon.length]!;
    const cross = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);
    if (Math.abs(cross) < 1e-6) continue;
    if (sign && Math.sign(cross) !== sign) return false;
    sign = Math.sign(cross);
  }
  return true;
}

/** genomskinliga-skymmande-vaggar: only discovered ground can trigger a visual cutaway. */
export class BoardingWallVisibility {
  readonly #floors: readonly {
    center: BoardingPoint;
    corners: readonly BoardingPoint[];
  }[];
  readonly #heights = new Map<string, number>();

  constructor(discoveredFloors: readonly BoardingCell[]) {
    this.#floors = discoveredFloors.map((position) => ({
      center: boardingIsoCenter(position),
      corners: boardingIsoCorners(position),
    }));
  }

  height(position: BoardingCell, shape: BoardingWallShape = {}): number {
    if (shape.door) return BOARDING_WALL_HEIGHT;
    const pieces = shape.pieces
      ?.map((piece) => `${piece.axis}${piece.span.join('/')}`)
      .join(';');
    const key = `${position.q},${position.r}:${shape.low ? 1 : 0}:${pieces ?? ''}`;
    const cached = this.#heights.get(key);
    if (cached !== undefined) return cached;
    if (shape.low) {
      this.#heights.set(key, BOARDING_COVER_HEIGHT);
      return BOARDING_COVER_HEIGHT;
    }
    const center = boardingIsoCenter(position);
    const polygons = outlines(position, shape, BOARDING_WALL_HEIGHT);
    const occludes = this.#floors.some(
      (floor) =>
        floor.center.y < center.y &&
        center.y - floor.center.y < BOARDING_WALL_HEIGHT + 32 &&
        Math.abs(floor.center.x - center.x) < 64 &&
        polygons.some((polygon) => overlaps(polygon, floor.corners)),
    );
    const height = occludes
      ? boardingHeight(BOARDING_METERS.cutawayWall)
      : BOARDING_WALL_HEIGHT;
    this.#heights.set(key, height);
    return height;
  }

  blocks(
    point: BoardingPoint,
    ground: BoardingCell,
    walls: readonly (BoardingCell & BoardingWallShape)[],
  ): boolean {
    const depth = boardingIsoCenter(ground).y;
    return walls.some((wall) => {
      if (boardingIsoCenter(wall).y <= depth) return false;
      return outlines(wall, wall, this.height(wall, wall)).some((polygon) =>
        contains(polygon, point),
      );
    });
  }
}

export function boardingDepthOrder(
  a: { depth: number; order: number },
  b: { depth: number; order: number },
): number {
  return a.depth - b.depth || a.order - b.order;
}

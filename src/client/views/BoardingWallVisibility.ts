import type { BoardingCell } from '../models/BoardingMap.js';
import {
  BOARDING_WALL_HEIGHT,
  boardingIsoBlockFaces,
  boardingIsoCenter,
  boardingIsoCorners,
  type BoardingPoint,
} from './BoardingProjection.js';

function silhouette(position: BoardingCell): readonly BoardingPoint[] {
  const faces = boardingIsoBlockFaces(
    boardingIsoCenter(position),
    32,
    16,
    BOARDING_WALL_HEIGHT,
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

/** genomskinliga-skymmande-vaggar: only discovered ground can trigger transparency. */
export class BoardingWallVisibility {
  readonly #floors: readonly {
    center: BoardingPoint;
    corners: readonly BoardingPoint[];
  }[];
  readonly #opacity = new Map<string, number>();

  constructor(discoveredFloors: readonly BoardingCell[]) {
    this.#floors = discoveredFloors.map((position) => ({
      center: boardingIsoCenter(position),
      corners: boardingIsoCorners(position),
    }));
  }

  opacity(position: BoardingCell): number {
    const key = `${position.q},${position.r}`;
    const cached = this.#opacity.get(key);
    if (cached !== undefined) return cached;
    const center = boardingIsoCenter(position);
    const polygon = silhouette(position);
    const occludes = this.#floors.some(
      (floor) =>
        floor.center.y < center.y &&
        center.y - floor.center.y < BOARDING_WALL_HEIGHT + 32 &&
        Math.abs(floor.center.x - center.x) < 64 &&
        overlaps(polygon, floor.corners),
    );
    const opacity = occludes ? 0.35 : 1;
    this.#opacity.set(key, opacity);
    return opacity;
  }

  blocks(
    point: BoardingPoint,
    ground: BoardingCell,
    walls: readonly BoardingCell[],
  ): boolean {
    const depth = boardingIsoCenter(ground).y;
    return walls.some(
      (wall) =>
        boardingIsoCenter(wall).y > depth &&
        this.opacity(wall) === 1 &&
        contains(silhouette(wall), point),
    );
  }
}

export function boardingDepthOrder(
  a: { depth: number; order: number },
  b: { depth: number; order: number },
): number {
  return a.depth - b.depth || a.order - b.order;
}

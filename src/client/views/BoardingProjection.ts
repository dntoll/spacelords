import type {
  BoardingCell,
  BoardingFeatureKind,
} from '../models/BoardingMap.js';

export const BOARDING_TILE_WIDTH = 64;
export const BOARDING_TILE_HEIGHT = 32;
const TILE_WIDTH = BOARDING_TILE_WIDTH;
const TILE_HEIGHT = BOARDING_TILE_HEIGHT;
const HALF_WIDTH = TILE_WIDTH / 2;
const HALF_HEIGHT = TILE_HEIGHT / 2;
const PADDING = 18;
const HEIGHT_HEADROOM = 24;

export interface BoardingPoint {
  readonly x: number;
  readonly y: number;
}

export interface BoardingMapSize {
  readonly width: number;
  readonly height: number;
}

export function boardingFeatureFootprint(
  kind: BoardingFeatureKind,
): Readonly<{ width: number; depth: number }> {
  if (kind === 'wall' || kind === 'hull')
    return { width: HALF_WIDTH, depth: HALF_HEIGHT };
  if (kind === 'door') return { width: 9, depth: 4 };
  if (kind === 'cover') return { width: 13, depth: 5 };
  return { width: 0, depth: 0 };
}

export function boardingIsoCenter(position: BoardingCell): BoardingPoint {
  return {
    x: (position.q - position.r) * HALF_WIDTH,
    y: (position.q + position.r) * HALF_HEIGHT,
  };
}

export function boardingIsoCorners(
  position: BoardingCell,
): readonly BoardingPoint[] {
  const center = boardingIsoCenter(position);
  return Object.freeze([
    Object.freeze({ x: center.x, y: center.y - HALF_HEIGHT }),
    Object.freeze({ x: center.x + HALF_WIDTH, y: center.y }),
    Object.freeze({ x: center.x, y: center.y + HALF_HEIGHT }),
    Object.freeze({ x: center.x - HALF_WIDTH, y: center.y }),
  ]);
}

export function boardingCellFromIsoPoint(point: BoardingPoint): BoardingCell {
  return {
    q: Math.round((point.x / HALF_WIDTH + point.y / HALF_HEIGHT) / 2),
    r: Math.round((point.y / HALF_HEIGHT - point.x / HALF_WIDTH) / 2),
  };
}

function bounds(map: BoardingMapSize) {
  const points: BoardingPoint[] = [];
  for (let r = 0; r < map.height; r++)
    for (let q = 0; q < map.width; q++)
      points.push(...boardingIsoCorners({ q, r }));
  return {
    minX: Math.min(...points.map((point) => point.x)),
    maxX: Math.max(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)) - HEIGHT_HEADROOM,
    maxY: Math.max(...points.map((point) => point.y)),
  };
}

export function boardingIsoCamera(
  map: BoardingMapSize,
  view: { readonly width: number; readonly height: number },
): { readonly scale: number; readonly offset: BoardingPoint } {
  const area = bounds(map);
  const scale = Math.max(
    0.08,
    Math.min(
      2.4,
      (view.width - PADDING * 2) / Math.max(1, area.maxX - area.minX),
      (view.height - PADDING * 2) / Math.max(1, area.maxY - area.minY),
    ),
  );
  return {
    scale,
    offset: {
      x: view.width / 2 - ((area.minX + area.maxX) / 2) * scale,
      y: view.height / 2 - ((area.minY + area.maxY) / 2) * scale,
    },
  };
}

export function boardingIsoCellPoint(
  map: BoardingMapSize,
  view: { readonly width: number; readonly height: number },
  position: BoardingCell,
): BoardingPoint {
  const camera = boardingIsoCamera(map, view);
  const center = boardingIsoCenter(position);
  return {
    x: camera.offset.x + center.x * camera.scale,
    y: camera.offset.y + center.y * camera.scale,
  };
}

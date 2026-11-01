import {
  HexCoordinate,
  HexGeometry,
  type Point,
} from '../models/HexCoordinate.js';
import type { BoardingHex } from '../models/BoardingMap.js';

const ISO_X = 0.86;
const ISO_Y = 0.42;
const PADDING = 18;
const HEIGHT_HEADROOM = 24;

export interface BoardingMapSize {
  readonly width: number;
  readonly height: number;
}

export function boardingIsoPoint(point: Point): Point {
  return {
    x: (point.x - point.y) * ISO_X,
    y: (point.x + point.y) * ISO_Y,
  };
}

export function boardingWorldPoint(point: Point): Point {
  return {
    x: point.x / (2 * ISO_X) + point.y / (2 * ISO_Y),
    y: point.y / (2 * ISO_Y) - point.x / (2 * ISO_X),
  };
}

export function boardingIsoCenter(position: BoardingHex): Point {
  return boardingIsoPoint(
    HexGeometry.toPoint(new HexCoordinate(position.q, position.r)),
  );
}

export function boardingIsoCorners(position: BoardingHex): readonly Point[] {
  const center = HexGeometry.toPoint(new HexCoordinate(position.q, position.r));
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 180) * (60 * index - 30);
    return boardingIsoPoint({
      x: center.x + HexGeometry.size * Math.cos(angle),
      y: center.y + HexGeometry.size * Math.sin(angle),
    });
  });
}

export function boardingHexFromIsoPoint(point: Point): BoardingHex {
  const world = boardingWorldPoint(point);
  const hex = HexGeometry.fromPoint(world);
  return { q: hex.q, r: hex.r };
}

function bounds(map: BoardingMapSize) {
  const points: Point[] = [];
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
): { readonly scale: number; readonly offset: Point } {
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

export function boardingIsoHexPoint(
  map: BoardingMapSize,
  view: { readonly width: number; readonly height: number },
  position: BoardingHex,
): Point {
  const camera = boardingIsoCamera(map, view);
  const center = boardingIsoCenter(position);
  return {
    x: camera.offset.x + center.x * camera.scale,
    y: camera.offset.y + center.y * camera.scale,
  };
}

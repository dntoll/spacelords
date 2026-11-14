import type {
  BoardingCell,
  BoardingFeatureKind,
  BoardingThinAxis,
} from '../../models/map/BoardingMap.js';

import {
  BOARDING_METERS,
  BOARDING_TILE_WIDTH,
  BOARDING_TILE_HEIGHT,
  BOARDING_GROUND_RATIO,
  boardingHeight,
  boardingWorldPoint,
} from './BoardingScale.js';
export { BOARDING_TILE_WIDTH, BOARDING_TILE_HEIGHT } from './BoardingScale.js';
export const BOARDING_WALL_HEIGHT = boardingHeight(BOARDING_METERS.wall);
export const BOARDING_COVER_HEIGHT = boardingHeight(BOARDING_METERS.cover);
export const BOARDING_DOOR_HEIGHT = boardingHeight(BOARDING_METERS.opening);
export const BOARDING_WALL_SLICES = 8;
const TILE_WIDTH = BOARDING_TILE_WIDTH;
const TILE_HEIGHT = BOARDING_TILE_HEIGHT;
export const BOARDING_HALF_TILE_WIDTH = TILE_WIDTH / 2;
export const BOARDING_HALF_TILE_HEIGHT = TILE_HEIGHT / 2;
const HALF_WIDTH = BOARDING_HALF_TILE_WIDTH;
const HALF_HEIGHT = BOARDING_HALF_TILE_HEIGHT;
const PADDING = 18;
const HEIGHT_HEADROOM = BOARDING_WALL_HEIGHT + 18;

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
  if (kind === 'door') return { width: 18, depth: 18 * BOARDING_GROUND_RATIO };
  if (kind === 'cover' || kind === 'reactor')
    return { width: 24, depth: 24 * BOARDING_GROUND_RATIO };
  return { width: 0, depth: 0 };
}

export function boardingFeatureHeight(kind: BoardingFeatureKind): number {
  if (kind === 'cover') return BOARDING_COVER_HEIGHT;
  if (kind === 'door') return BOARDING_DOOR_HEIGHT;
  if (kind === 'reactor') return boardingHeight(BOARDING_METERS.reactor);
  if (kind === 'wall' || kind === 'hull') return BOARDING_WALL_HEIGHT;
  return 0;
}

export function boardingFeatureGlyph(feature: {
  readonly kind: BoardingFeatureKind;
  readonly destroyed?: boolean;
  readonly open?: boolean;
  readonly locked?: boolean;
  readonly exit?: string | null;
}): string | null {
  if (feature.kind === 'wall' || feature.kind === 'hull') return null;
  if (feature.kind === 'door') {
    if (feature.destroyed) return '×';
    if (feature.open) return '╱';
    if (feature.locked) return '▣';
    return '▮';
  }
  if (feature.kind === 'reactor') return 'R';
  if (feature.kind === 'cover') return '▰';
  if (feature.kind === 'exit') return feature.exit === 'breach' ? 'B' : 'E';
  return null;
}

export function boardingWallKey(position: BoardingCell): string {
  return `${position.q},${position.r}`;
}

export function boardingWallRun(
  walls: ReadonlySet<string>,
  position: BoardingCell,
  axis: 'q' | 'r',
): Readonly<{ index: number; length: number }> {
  const stepQ = axis === 'q' ? 1 : 0;
  const stepR = axis === 'r' ? 1 : 0;
  let startQ = position.q;
  let startR = position.r;
  while (walls.has(boardingWallKey({ q: startQ - stepQ, r: startR - stepR }))) {
    startQ -= stepQ;
    startR -= stepR;
  }
  let length = 0;
  let q = startQ;
  let r = startR;
  while (walls.has(boardingWallKey({ q, r }))) {
    length += 1;
    q += stepQ;
    r += stepR;
  }
  return Object.freeze({
    index: axis === 'q' ? position.q - startQ : position.r - startR,
    length: Math.max(1, length),
  });
}

export function boardingWallSlice(
  textureWidth: number,
  index: number,
): Readonly<{ x: number; width: number }> {
  const width = Math.max(1, Math.floor(textureWidth / BOARDING_WALL_SLICES));
  const count = Math.max(1, Math.floor(textureWidth / width));
  return Object.freeze({
    x: (((index % count) + count) % count) * width,
    width,
  });
}

export function boardingIsoCenter(position: BoardingCell): BoardingPoint {
  return boardingWorldPoint(position.q, position.r);
}

/** isometrisk-skeppsreferens: map top-down cell coordinates onto the ground plane. */
export function boardingSpritePlaneTransform(): readonly [
  number,
  number,
  number,
  number,
  number,
  number,
] {
  return [HALF_WIDTH, HALF_HEIGHT, -HALF_WIDTH, HALF_HEIGHT, 0, -HALF_HEIGHT];
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

export function boardingQuadTextureTransform(
  textureWidth: number,
  textureHeight: number,
  origin: BoardingPoint,
  alongU: BoardingPoint,
  alongV: BoardingPoint,
): readonly [number, number, number, number, number, number] {
  return Object.freeze([
    (alongU.x - origin.x) / textureWidth,
    (alongU.y - origin.y) / textureWidth,
    (alongV.x - origin.x) / textureHeight,
    (alongV.y - origin.y) / textureHeight,
    origin.x,
    origin.y,
  ]);
}

/** Maps a square surface texture onto the cell's exact ground diamond. */
export function boardingIsoTextureTransform(
  textureWidth: number,
  textureHeight: number,
  position: BoardingCell,
): readonly [number, number, number, number, number, number] {
  const corners = boardingIsoCorners(position);
  return boardingQuadTextureTransform(
    textureWidth,
    textureHeight,
    corners[0]!,
    corners[1]!,
    corners[3]!,
  );
}

export function boardingIsoBlockFaces(
  center: BoardingPoint,
  width: number,
  depth: number,
  height: number,
): Readonly<{
  top: readonly [BoardingPoint, BoardingPoint, BoardingPoint, BoardingPoint];
  southEast: readonly [
    BoardingPoint,
    BoardingPoint,
    BoardingPoint,
    BoardingPoint,
  ];
  southWest: readonly [
    BoardingPoint,
    BoardingPoint,
    BoardingPoint,
    BoardingPoint,
  ];
  apex: BoardingPoint;
}> {
  const topNorth = { x: center.x, y: center.y - height - depth };
  const topEast = { x: center.x + width, y: center.y - height };
  const topSouth = { x: center.x, y: center.y - height + depth };
  const topWest = { x: center.x - width, y: center.y - height };
  const baseEast = { x: center.x + width, y: center.y };
  const baseSouth = { x: center.x, y: center.y + depth };
  const baseWest = { x: center.x - width, y: center.y };
  return {
    top: [topNorth, topEast, topSouth, topWest],
    southEast: [topEast, topSouth, baseSouth, baseEast],
    southWest: [topSouth, topWest, baseWest, baseSouth],
    apex: { x: center.x, y: center.y - height },
  };
}

interface CellPoint {
  readonly q: number;
  readonly r: number;
}

/** tunna-innervaggar: three equal bands, with the wall centered on the cell. */
export function boardingThinWallCells(
  position: BoardingCell,
  axis: BoardingThinAxis,
  /** animerade-dorrar: the part of the length to cover, from -0.5 to 0.5. */
  span: readonly [number, number] = [-0.5, 0.5],
  /** tunna-fonster: a pane is far thinner than a wall. */
  thickness: number = BOARDING_METERS.thinWall,
): Readonly<{
  inside: readonly CellPoint[];
  wall: readonly CellPoint[];
  outside: readonly CellPoint[];
}> {
  const half = thickness / 2;
  const band = (start: number, end: number): readonly CellPoint[] => {
    const { q, r } = position;
    const [from, to] = span;
    return axis === 'q'
      ? [
          { q: q + start, r: r + from },
          { q: q + end, r: r + from },
          { q: q + end, r: r + to },
          { q: q + start, r: r + to },
        ]
      : [
          { q: q + from, r: r + start },
          { q: q + to, r: r + start },
          { q: q + to, r: r + end },
          { q: q + from, r: r + end },
        ];
  };
  return Object.freeze({
    inside: Object.freeze(band(-0.5, -half)),
    wall: Object.freeze(band(-half, half)),
    outside: Object.freeze(band(half, 0.5)),
  });
}

export interface BoardingThinFloorBand {
  readonly polygon: readonly BoardingPoint[];
  readonly origin: BoardingPoint;
  readonly alongU: BoardingPoint;
  readonly alongV: BoardingPoint;
  readonly u: number;
  readonly v: number;
  readonly uSpan: number;
  readonly vSpan: number;
}

function projectCell(point: CellPoint, meters = 0): BoardingPoint {
  return boardingWorldPoint(point.q, point.r, meters);
}

function floorBand(
  cells: readonly CellPoint[],
  axis: BoardingThinAxis,
  outside: boolean,
): BoardingThinFloorBand {
  const screen = cells.map((cell) => projectCell(cell));
  const polygon = outside
    ? axis === 'q'
      ? [screen[1]!, screen[0]!, screen[3]!, screen[2]!]
      : [screen[3]!, screen[2]!, screen[1]!, screen[0]!]
    : screen;
  return Object.freeze({
    polygon: Object.freeze(polygon),
    origin: polygon[0]!,
    alongU: polygon[1]!,
    alongV: polygon[3]!,
    u: 0,
    v: 0,
    uSpan: axis === 'q' ? BOARDING_METERS.thinWall : 1,
    vSpan: axis === 'r' ? BOARDING_METERS.thinWall : 1,
  });
}

export function boardingThinFloorBands(
  position: BoardingCell,
  axis: BoardingThinAxis,
): Readonly<{ inside: BoardingThinFloorBand; outside: BoardingThinFloorBand }> {
  const cells = boardingThinWallCells(position, axis);
  return Object.freeze({
    inside: floorBand(cells.inside, axis, false),
    outside: floorBand(cells.outside, axis, true),
  });
}

export interface BoardingThinWallMesh {
  readonly top: readonly BoardingPoint[];
  readonly longFace: readonly BoardingPoint[];
  readonly endFace: readonly BoardingPoint[];
  readonly lengthAxis: 'q' | 'r';
  readonly topOrigin: BoardingPoint;
  readonly topAlongLength: BoardingPoint;
  readonly topAlongThickness: BoardingPoint;
}

/** tunna-innervaggar: camera-facing long side and short end of a centered slab. */
export function boardingThinWallMesh(
  position: BoardingCell,
  axis: BoardingThinAxis,
  meters: number,
  span?: readonly [number, number],
  /** fonster-pa-halvhog-vagg: the slab's lower edge, for glass above a wall. */
  base = 0,
  thickness?: number,
): BoardingThinWallMesh {
  const cells = boardingThinWallCells(position, axis, span, thickness).wall;
  const ground = cells.map((cell) => projectCell(cell, base));
  const top = cells.map((cell) => projectCell(cell, meters));
  const face = (first: number, second: number): readonly BoardingPoint[] =>
    Object.freeze([top[first]!, top[second]!, ground[second]!, ground[first]!]);
  const long = axis === 'q' ? face(1, 2) : face(3, 2);
  const end = axis === 'q' ? face(2, 3) : face(1, 2);
  return Object.freeze({
    top: Object.freeze(top),
    longFace: long,
    endFace: end,
    lengthAxis: axis === 'q' ? 'r' : 'q',
    topOrigin: top[0]!,
    topAlongLength: axis === 'q' ? top[3]! : top[1]!,
    topAlongThickness: axis === 'q' ? top[1]! : top[3]!,
  });
}

function convexHull(
  points: readonly BoardingPoint[],
): readonly BoardingPoint[] {
  const unique: BoardingPoint[] = [];
  for (const point of points)
    if (
      !unique.some(
        (entry) =>
          Math.abs(entry.x - point.x) < 1e-6 &&
          Math.abs(entry.y - point.y) < 1e-6,
      )
    )
      unique.push(point);
  if (unique.length < 3) return Object.freeze(unique);
  const sorted = [...unique].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: BoardingPoint, a: BoardingPoint, b: BoardingPoint) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const build = (source: readonly BoardingPoint[]): BoardingPoint[] => {
    const hull: BoardingPoint[] = [];
    for (const point of source) {
      while (
        hull.length >= 2 &&
        cross(hull[hull.length - 2]!, hull[hull.length - 1]!, point) <= 0
      )
        hull.pop();
      hull.push(point);
    }
    return hull;
  };
  const lower = build(sorted);
  const upper = build([...sorted].reverse());
  lower.pop();
  upper.pop();
  return Object.freeze([...lower, ...upper]);
}

export function boardingThinWallOutline(
  position: BoardingCell,
  axis: BoardingThinAxis,
  meters: number,
  span?: readonly [number, number],
): readonly BoardingPoint[] {
  const cells = boardingThinWallCells(position, axis, span).wall;
  return convexHull(
    cells.flatMap((cell) => [projectCell(cell), projectCell(cell, meters)]),
  );
}

export function boardingCellFromIsoPoint(point: BoardingPoint): BoardingCell {
  return {
    q: Math.round((point.x / HALF_WIDTH + point.y / HALF_HEIGHT) / 2),
    r: Math.round((point.y / HALF_HEIGHT - point.x / HALF_WIDTH) / 2),
  };
}

function bounds(
  map: BoardingMapSize,
  occupied?: (cell: BoardingCell) => boolean,
) {
  const points: BoardingPoint[] = [];
  for (let r = 0; r < map.height; r++)
    for (let q = 0; q < map.width; q++) {
      if (occupied && !occupied({ q, r })) continue;
      points.push(...boardingIsoCorners({ q, r }));
    }
  if (points.length === 0) return bounds(map);
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
  occupied?: (cell: BoardingCell) => boolean,
): { readonly scale: number; readonly offset: BoardingPoint } {
  const area = bounds(map, occupied);
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

export function boardingAnimTick(
  started: number,
  duration: number,
  now: number,
): Readonly<{ progress: number; done: boolean }> {
  const raw = Math.min(1, (now - started) / Math.max(1, duration));
  return Object.freeze({
    progress: raw * raw * (3 - 2 * raw),
    done: raw >= 1,
  });
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

/** kastad-granat-i-bage / synligt-skott-hela-vagen: endpoints remain exact. */
export function boardingProjectilePoint(
  from: BoardingPoint,
  to: BoardingPoint,
  progress: number,
  kind?: 'grenade',
): BoardingPoint {
  const t = Math.max(0, Math.min(1, progress));
  return {
    x: from.x + (to.x - from.x) * t,
    y:
      from.y +
      (to.y - from.y) * t -
      (kind === 'grenade' ? 4 * t * (1 - t) * 60 : 0),
  };
}

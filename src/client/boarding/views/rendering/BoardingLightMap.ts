import {
  boardingStraightThinPieces,
  boardingThinPieceBounds,
  type BoardingCell,
  type BoardingLight,
  type BoardingMap,
} from '../../models/map/BoardingMap.js';
import type { BoardingBattleState } from '../../models/battle/BoardingBattle.js';
import type { BoardingPoint } from './BoardingProjection.js';
import { BOARDING_AMBIENT } from './BoardingLighting.js';
import {
  BOARDING_METERS,
  BOARDING_TILE_HEIGHT,
  BOARDING_TILE_WIDTH,
} from './BoardingScale.js';

/** ljuskarta-i-bordning: texels per cell side in the static light map. */
export const BOARDING_LIGHT_MAP_TEXELS = 16;

/** A point on the deck in cell coordinates; cell centres are whole numbers. */
export interface BoardingLightPoint {
  readonly q: number;
  readonly r: number;
}

/** An axis-aligned footprint that stops light from wall foot to ceiling. */
export interface BoardingLightBlocker {
  readonly minQ: number;
  readonly maxQ: number;
  readonly minR: number;
  readonly maxR: number;
  /** Whole cells merge with their neighbours so shared edges cast no rays. */
  readonly cell: boolean;
}

interface Segment {
  readonly a: BoardingLightPoint;
  readonly b: BoardingLightPoint;
}

const EPSILON = 1e-9;

/** sammanfogade-tunna-vaggar: where the joined shape of each thin wall comes from. */
type ThinShapes = Pick<BoardingMap, 'thinWallPieces'>;

type ThinFeature = BoardingBattleState['features'][number];

/** The ground rectangles of a thin wall, joined when the map is known. */
function thinFootprints(
  feature: ThinFeature,
  shapes: ThinShapes | undefined,
): readonly { minQ: number; maxQ: number; minR: number; maxR: number }[] {
  const pieces =
    shapes?.thinWallPieces(feature.position) ??
    boardingStraightThinPieces(feature.axis ?? 'q');
  return pieces.map((piece) =>
    boardingThinPieceBounds(feature.position, piece),
  );
}
const RAY_SPREAD = 1e-5;

function cellBlocker(position: BoardingCell): BoardingLightBlocker {
  return {
    minQ: position.q - 0.5,
    maxQ: position.q + 0.5,
    minR: position.r - 0.5,
    maxR: position.r + 0.5,
    cell: true,
  };
}

/**
 * ljuskarta-i-bordning: lamps sit below wall height, so every full-height
 * barrier blocks light from floor to lamp and a top-down footprint suffices.
 * Thin walls block only their middle third, unlike the cell-wide sight rules.
 */
export function boardingLightBlockers(
  state: Pick<BoardingBattleState, 'features' | 'smokeCells'>,
  shapes?: ThinShapes,
): readonly BoardingLightBlocker[] {
  const blockers: BoardingLightBlocker[] = [];
  for (const feature of state.features) {
    if (feature.destroyed) continue;
    if (feature.kind === 'thin-wall') {
      if (feature.low) continue;
      for (const footprint of thinFootprints(feature, shapes))
        blockers.push({ ...footprint, cell: false });
    } else if (
      feature.kind === 'wall' ||
      feature.kind === 'hull' ||
      (feature.kind === 'door' && !feature.open)
    )
      blockers.push(cellBlocker(feature.position));
  }
  for (const position of state.smokeCells) blockers.push(cellBlocker(position));
  return blockers;
}

/** A footprint lower than the ceiling whose shadow ends where its top projects. */
export interface BoardingLightOccluder {
  readonly minQ: number;
  readonly maxQ: number;
  readonly minR: number;
  readonly maxR: number;
  /** Meters above the floor. */
  readonly height: number;
}

type OccluderState = Pick<BoardingBattleState, 'features' | 'smokeCells'> &
  Partial<Pick<BoardingBattleState, 'people'>>;

/** Half side of a figure, crate or reactor footprint, in cells. */
const OBJECT_HALF = 0.2;

function square(
  position: BoardingCell,
  half: number,
  height: number,
): BoardingLightOccluder {
  return {
    minQ: position.q - half,
    maxQ: position.q + half,
    minR: position.r - half,
    maxR: position.r + half,
    height,
  };
}

/**
 * skuggor-fran-figurer-och-foremal: figures, crates, the reactor and low
 * thin walls stop light only up to their own height.
 */
export function boardingLightOccluders(
  state: OccluderState,
  shapes?: ThinShapes,
): readonly BoardingLightOccluder[] {
  const occluders: BoardingLightOccluder[] = [];
  for (const feature of state.features) {
    if (feature.destroyed) continue;
    if (feature.kind === 'cover')
      occluders.push(
        square(feature.position, OBJECT_HALF, BOARDING_METERS.cover),
      );
    else if (feature.kind === 'reactor')
      occluders.push(
        square(feature.position, OBJECT_HALF, BOARDING_METERS.reactor),
      );
    else if (feature.kind === 'thin-wall' && feature.low)
      for (const footprint of thinFootprints(feature, shapes))
        occluders.push({ ...footprint, height: BOARDING_METERS.cover });
  }
  for (const person of state.people ?? []) {
    if (person.status === 'dead' || person.status === 'evacuated') continue;
    const height =
      person.status === 'incapacitated'
        ? BOARDING_METERS.incapacitatedPerson
        : person.crouched
          ? BOARDING_METERS.crouchedPerson
          : BOARDING_METERS.person;
    occluders.push(square(person.position, OBJECT_HALF, height));
  }
  return occluders;
}

/** ljuskarta-i-bordning: changes exactly when the painted light map would. */
export function boardingLightMapSignature(
  state: OccluderState,
  shapes?: ThinShapes,
): string {
  return JSON.stringify([
    boardingLightBlockers(state, shapes),
    boardingLightOccluders(state, shapes),
  ]);
}

function hull(points: readonly BoardingLightPoint[]): BoardingLightPoint[] {
  const sorted = [...points].sort((a, b) => a.q - b.q || a.r - b.r);
  const cross = (
    o: BoardingLightPoint,
    a: BoardingLightPoint,
    b: BoardingLightPoint,
  ) => (a.q - o.q) * (b.r - o.r) - (a.r - o.r) * (b.q - o.q);
  const half = (list: BoardingLightPoint[]) => {
    const result: BoardingLightPoint[] = [];
    for (const point of list) {
      while (
        result.length >= 2 &&
        cross(result[result.length - 2]!, result[result.length - 1]!, point) <=
          0
      )
        result.pop();
      result.push(point);
    }
    result.pop();
    return result;
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}

/**
 * skuggor-fran-figurer-och-foremal: the floor a footprint hides from one
 * lamp, from the footprint out to where the lamp projects its top edge.
 */
export function boardingShadowPolygon(
  light: Pick<BoardingLight, 'position' | 'height' | 'radius'>,
  occluder: BoardingLightOccluder,
): readonly BoardingLightPoint[] {
  const source = light.position;
  const corners = [
    { q: occluder.minQ, r: occluder.minR },
    { q: occluder.maxQ, r: occluder.minR },
    { q: occluder.maxQ, r: occluder.maxR },
    { q: occluder.minQ, r: occluder.maxR },
  ];
  const reach = light.radius + 1;
  const projected = corners.map((corner) => {
    const dq = corner.q - source.q,
      dr = corner.r - source.r;
    const distance = Math.hypot(dq, dr);
    const scale =
      occluder.height < light.height
        ? light.height / (light.height - occluder.height)
        : Infinity;
    const stretch = Math.min(scale, distance > EPSILON ? reach / distance : 1);
    return { q: source.q + dq * stretch, r: source.r + dr * stretch };
  });
  return hull([...corners, ...projected]);
}

function edges(blocker: BoardingLightBlocker): readonly Segment[] {
  const { minQ, maxQ, minR, maxR } = blocker;
  return [
    { a: { q: minQ, r: minR }, b: { q: maxQ, r: minR } },
    { a: { q: maxQ, r: minR }, b: { q: maxQ, r: maxR } },
    { a: { q: maxQ, r: maxR }, b: { q: minQ, r: maxR } },
    { a: { q: minQ, r: maxR }, b: { q: minQ, r: minR } },
  ];
}

const edgeKey = (segment: Segment): string => {
  const [first, second] = [segment.a, segment.b].sort(
    (left, right) => left.q - right.q || left.r - right.r,
  );
  return `${first!.q},${first!.r},${second!.q},${second!.r}`;
};

function segmentsAround(
  source: BoardingLightPoint,
  radius: number,
  blockers: readonly BoardingLightBlocker[],
): readonly Segment[] {
  const reach = radius + 1;
  const cellEdges = new Map<string, { segment: Segment; count: number }>();
  const segments: Segment[] = [];
  for (const blocker of blockers) {
    if (
      blocker.maxQ < source.q - reach ||
      blocker.minQ > source.q + reach ||
      blocker.maxR < source.r - reach ||
      blocker.minR > source.r + reach
    )
      continue;
    for (const segment of edges(blocker)) {
      if (!blocker.cell) {
        segments.push(segment);
        continue;
      }
      const id = edgeKey(segment);
      const entry = cellEdges.get(id);
      if (entry) entry.count++;
      else cellEdges.set(id, { segment, count: 1 });
    }
  }
  for (const { segment, count } of cellEdges.values())
    if (count === 1) segments.push(segment);
  const min = { q: source.q - reach, r: source.r - reach };
  const max = { q: source.q + reach, r: source.r + reach };
  segments.push(
    ...edges({
      minQ: min.q,
      maxQ: max.q,
      minR: min.r,
      maxR: max.r,
      cell: false,
    }),
  );
  return segments;
}

function cast(
  source: BoardingLightPoint,
  angle: number,
  segments: readonly Segment[],
): BoardingLightPoint {
  const dq = Math.cos(angle),
    dr = Math.sin(angle);
  let nearest = Infinity;
  for (const { a, b } of segments) {
    const sq = b.q - a.q,
      sr = b.r - a.r;
    const denominator = dq * sr - dr * sq;
    if (Math.abs(denominator) < EPSILON) continue;
    const oq = a.q - source.q,
      or = a.r - source.r;
    const t = (oq * sr - or * sq) / denominator;
    const u = (oq * dr - or * dq) / denominator;
    // Inclusive ends stop rays through the zero-width gap between diagonal walls.
    if (t > EPSILON && u >= -EPSILON && u <= 1 + EPSILON && t < nearest)
      nearest = t;
  }
  return { q: source.q + dq * nearest, r: source.r + dr * nearest };
}

/**
 * ljuskarta-i-bordning: the area a lamp reaches, as a polygon in cell
 * coordinates, by casting rays at every barrier corner and just beside it.
 */
export function boardingLightPolygon(
  source: BoardingLightPoint,
  radius: number,
  blockers: readonly BoardingLightBlocker[],
): readonly BoardingLightPoint[] {
  if (
    blockers.some(
      (blocker) =>
        source.q >= blocker.minQ &&
        source.q <= blocker.maxQ &&
        source.r >= blocker.minR &&
        source.r <= blocker.maxR,
    )
  )
    return [];
  const segments = segmentsAround(source, radius, blockers);
  const angles = new Set<number>();
  for (const { a, b } of segments)
    for (const point of [a, b]) {
      const angle = Math.atan2(point.r - source.r, point.q - source.q);
      angles
        .add(angle - RAY_SPREAD)
        .add(angle)
        .add(angle + RAY_SPREAD);
    }
  return [...angles]
    .sort((left, right) => left - right)
    .map((angle) => cast(source, angle, segments));
}

/** ljuskarta-i-bordning: the same falloff as the vertex and tile light on the floor. */
export function boardingFloorLight(
  light: BoardingLight,
  point: BoardingLightPoint,
): number {
  const distance = Math.hypot(
    light.position.q - point.q,
    light.position.r - point.r,
    light.height,
  );
  if (distance >= light.radius) return 0;
  return (
    light.intensity *
    (1 - distance / light.radius) ** 2 *
    (light.height / distance)
  );
}

/**
 * Texel (x, y) in the light map to screen space. The map has a one-texel
 * border, so cell (q, r) covers x from 1 + q·texels to 1 + (q + 1)·texels.
 */
export function boardingLightMapTransform(
  texels: number,
): readonly [number, number, number, number, number, number] {
  const halfWidth = BOARDING_TILE_WIDTH / 2,
    halfHeight = BOARDING_TILE_HEIGHT / 2;
  return [
    halfWidth / texels,
    halfHeight / texels,
    -halfWidth / texels,
    halfHeight / texels,
    0,
    (-2 / texels - 1) * halfHeight,
  ];
}

/**
 * ljuskarta-i-bordning: `?light-debug` in the address shows the raw light map,
 * with black instead of ambient light and every lamp polygon outlined, so
 * shadow edges can be checked by eye.
 */
export function boardingLightDebug(): boolean {
  try {
    return new URLSearchParams(globalThis.location?.search ?? '').has(
      'light-debug',
    );
  } catch {
    return false;
  }
}

const falloffs = new Map<string, HTMLCanvasElement | null>();

function falloff(
  light: BoardingLight,
  texels: number,
): HTMLCanvasElement | null {
  const id = `${light.radius},${light.height},${light.intensity},${texels}`;
  if (falloffs.has(id)) return falloffs.get(id)!;
  const side = Math.ceil(light.radius * 2 * texels);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = side;
  const context = canvas.getContext('2d');
  if (!context) {
    falloffs.set(id, null);
    return null;
  }
  const pixels = context.createImageData(side, side);
  const center = side / 2;
  for (let y = 0; y < side; y++)
    for (let x = 0; x < side; x++) {
      const value = Math.round(
        255 *
          Math.min(
            1,
            boardingFloorLight(
              { ...light, position: { q: 0, r: 0 } },
              {
                q: (x + 0.5 - center) / texels,
                r: (y + 0.5 - center) / texels,
              },
            ),
          ),
      );
      const index = (y * side + x) * 4;
      pixels.data[index] =
        pixels.data[index + 1] =
        pixels.data[index + 2] =
          value;
      pixels.data[index + 3] = 255;
    }
  context.putImageData(pixels, 0, 0);
  falloffs.set(id, canvas);
  return canvas;
}

/**
 * ljuskarta-i-bordning: floor light painted once per change of lamps or
 * barriers into a top-down map, then multiplied onto each projected floor.
 */
export class BoardingLightMap {
  readonly #canvas: HTMLCanvasElement | null;
  readonly #texels: number;
  readonly #tints = new Map<string, HTMLCanvasElement | null>();

  constructor(
    map: {
      readonly width: number;
      readonly height: number;
      readonly lights: readonly BoardingLight[];
    } & Partial<ThinShapes>,
    state: OccluderState,
    texels = BOARDING_LIGHT_MAP_TEXELS,
    debug = boardingLightDebug(),
  ) {
    this.#texels = texels;
    const canvas = document.createElement('canvas');
    canvas.width = map.width * texels + 2;
    canvas.height = map.height * texels + 2;
    const context = canvas.getContext('2d');
    this.#canvas = context ? canvas : null;
    if (!context) return;
    const ambient = debug ? 0 : Math.round(255 * BOARDING_AMBIENT);
    context.fillStyle = `rgb(${ambient}, ${ambient}, ${ambient})`;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const shapes = map.thinWallPieces ? (map as ThinShapes) : undefined;
    const blockers = boardingLightBlockers(state, shapes);
    const texel = (point: BoardingLightPoint) => ({
      x: 1 + (point.q + 0.5) * texels,
      y: 1 + (point.r + 0.5) * texels,
    });
    const occluders = boardingLightOccluders(state, shapes);
    const outlines: (readonly BoardingLightPoint[])[] = [];
    const scratch = document.createElement('canvas');
    const lamp = scratch.getContext('2d');
    for (const light of map.lights) {
      const shape = boardingLightPolygon(
        light.position,
        light.radius,
        blockers,
      );
      const image = falloff(light, texels);
      if (shape.length < 3 || !image || !lamp) continue;
      outlines.push(shape);
      // Each lamp is lit and shadowed on its own, so one figure's shadow
      // never darkens light from another lamp.
      scratch.width = image.width;
      scratch.height = image.height;
      const local = (point: BoardingLightPoint) => ({
        x: image.width / 2 + (point.q - light.position.q) * texels,
        y: image.height / 2 + (point.r - light.position.r) * texels,
      });
      const trace = (points: readonly BoardingLightPoint[]) => {
        lamp.beginPath();
        points.forEach((point, index) => {
          const { x, y } = local(point);
          if (index === 0) lamp.moveTo(x, y);
          else lamp.lineTo(x, y);
        });
        lamp.closePath();
      };
      lamp.save();
      trace(shape);
      lamp.clip();
      lamp.drawImage(image, 0, 0);
      lamp.restore();
      lamp.save();
      lamp.globalCompositeOperation = 'destination-out';
      lamp.fillStyle = '#000';
      for (const occluder of occluders) {
        if (
          occluder.maxQ < light.position.q - light.radius ||
          occluder.minQ > light.position.q + light.radius ||
          occluder.maxR < light.position.r - light.radius ||
          occluder.minR > light.position.r + light.radius
        )
          continue;
        trace(boardingShadowPolygon(light, occluder));
        lamp.fill();
      }
      lamp.restore();
      context.save();
      context.globalCompositeOperation = 'lighter';
      const center = texel(light.position);
      context.drawImage(
        scratch,
        center.x - image.width / 2,
        center.y - image.height / 2,
      );
      context.restore();
    }
    if (!debug) return;
    context.strokeStyle = '#ff40ff';
    context.lineWidth = 1;
    for (const shape of outlines) {
      context.beginPath();
      shape.forEach((point, index) => {
        const { x, y } = texel(point);
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.closePath();
      context.stroke();
    }
  }

  /**
   * ljuskarta-i-bordning: adds `color`, scaled by the light map, inside
   * `clip`, so an overlay glows brighter where the deck is lit.
   */
  glow(
    context: CanvasRenderingContext2D,
    clip: readonly BoardingPoint[],
    color: readonly [number, number, number],
  ): void {
    if (!this.#canvas || clip.length < 3) return;
    const tinted = this.#tinted(color);
    if (!tinted) return;
    context.save();
    context.beginPath();
    clip.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.closePath();
    context.clip();
    context.globalCompositeOperation = 'lighter';
    context.transform(...boardingLightMapTransform(this.#texels));
    context.drawImage(tinted, 0, 0);
    context.restore();
  }

  #tinted(color: readonly [number, number, number]): HTMLCanvasElement | null {
    const id = color.join(',');
    if (this.#tints.has(id)) return this.#tints.get(id)!;
    const source = this.#canvas!;
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const context = canvas.getContext('2d');
    const result = context ? canvas : null;
    if (context) {
      context.drawImage(source, 0, 0);
      context.globalCompositeOperation = 'multiply';
      context.fillStyle = `rgb(${color.join(', ')})`;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    this.#tints.set(id, result);
    return result;
  }

  /** Multiplies the light under one cell onto the floor area clipped by `clip`. */
  paint(
    context: CanvasRenderingContext2D,
    clip: readonly BoardingPoint[],
    cell: BoardingCell,
  ): void {
    if (!this.#canvas || clip.length < 3) return;
    const texels = this.#texels;
    context.save();
    context.beginPath();
    clip.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.closePath();
    context.clip();
    context.globalCompositeOperation = 'multiply';
    context.transform(...boardingLightMapTransform(texels));
    // One texel beyond the cell on every side keeps filtering seamless at borders.
    const x = cell.q * texels,
      y = cell.r * texels,
      side = texels + 2;
    context.drawImage(this.#canvas, x, y, side, side, x, y, side, side);
    context.restore();
  }
}

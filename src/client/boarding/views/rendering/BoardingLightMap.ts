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
  BoardingLightRefresh,
  boardingLampReach,
  boardingRegionsOverlap,
  type BoardingLampRefresh,
  type BoardingLightRegion,
} from './BoardingLightRefresh.js';
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

/** glas-tintar-ljus: the light colour after it passes through glass. */
export const BOARDING_GLASS_TINT: readonly [number, number, number] = [
  168, 206, 255,
];

/**
 * glas-tintar-ljus: footprints of intact glass, on low thin walls and High
 * window panes. Light passing them is tinted, not stopped.
 */
export function boardingLightGlass(
  state: Pick<BoardingBattleState, 'features'>,
  shapes?: ThinShapes,
): readonly { minQ: number; maxQ: number; minR: number; maxR: number }[] {
  return state.features.flatMap((feature) =>
    !feature.destroyed &&
    (feature.kind === 'window' ||
      (feature.kind === 'thin-wall' && feature.low && !feature.shattered))
      ? thinFootprints(feature, shapes)
      : [],
  );
}

/** A footprint lower than the ceiling whose shadow ends where its top projects. */
export interface BoardingLightOccluder {
  readonly minQ: number;
  readonly maxQ: number;
  readonly minR: number;
  readonly maxR: number;
  /** Meters above the floor. */
  readonly height: number;
  /** A figure's footprint is round; objects fill their box. */
  readonly round: boolean;
}

type OccluderState = Pick<BoardingBattleState, 'features' | 'smokeCells'> &
  Partial<Pick<BoardingBattleState, 'people'>>;

/** Half side of a figure, crate or reactor footprint, in cells. */
const OBJECT_HALF = 0.2;

/**
 * skuggor-fran-figurer-och-foremal: lamps are small discs, not points, so the
 * hard shadow under a figure shrinks to its feet instead of growing past it.
 */
const LAMP_RADIUS = 0.3;
const ROUND_SIDES = 12;

function square(
  position: BoardingCell,
  half: number,
  height: number,
  round = false,
): BoardingLightOccluder {
  return {
    minQ: position.q - half,
    maxQ: position.q + half,
    minR: position.r - half,
    maxR: position.r + half,
    height,
    round,
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
  return [
    ...boardingStaticLightOccluders(state, shapes),
    ...boardingFigureOccluders(state.people ?? []),
  ];
}

/** A figure as light sees it; between tiles while it walks. */
export type BoardingLightFigure = Pick<
  BoardingBattleState['people'][number],
  'position' | 'status' | 'crouched'
>;

/**
 * skuggor-mellan-rutor: figures cast round shadows from wherever they stand,
 * also part way between two tiles.
 */
export function boardingFigureOccluders(
  people: readonly BoardingLightFigure[],
): readonly BoardingLightOccluder[] {
  const occluders: BoardingLightOccluder[] = [];
  for (const person of people) {
    if (person.status === 'dead' || person.status === 'evacuated') continue;
    const height =
      person.status === 'incapacitated'
        ? BOARDING_METERS.incapacitatedPerson
        : person.crouched
          ? BOARDING_METERS.crouchedPerson
          : BOARDING_METERS.person;
    occluders.push(square(person.position, OBJECT_HALF, height, true));
  }
  return occluders;
}

/** jamn-ljuskarta-under-forflyttning: occluders that never walk. */
export function boardingStaticLightOccluders(
  state: Pick<BoardingBattleState, 'features'>,
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
        occluders.push({
          ...footprint,
          height: BOARDING_METERS.cover,
          round: false,
        });
  }
  return occluders;
}

/**
 * jamn-ljuskarta-under-forflyttning: changes exactly when the lamp images
 * under the figures' shadows would, so walking never rebuilds them.
 */
export function boardingStaticLightSignature(
  state: Pick<BoardingBattleState, 'features' | 'smokeCells'>,
  shapes?: ThinShapes,
): string {
  return JSON.stringify([
    boardingLightBlockers(state, shapes),
    boardingStaticLightOccluders(state, shapes),
    boardingLightGlass(state, shapes),
  ]);
}

/** ljuskarta-i-bordning: changes exactly when the painted light map would. */
export function boardingLightMapSignature(
  state: OccluderState,
  shapes?: ThinShapes,
): string {
  return JSON.stringify([
    boardingLightBlockers(state, shapes),
    boardingLightOccluders(state, shapes),
    boardingLightGlass(state, shapes),
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
 * skuggor-fran-figurer-och-foremal: the floor a footprint hides from the
 * whole lamp disc. The footprint's top, seen from the lamp centre, lands
 * H/(H−h) times as far away; the disc's edges narrow that umbra by
 * a·h/(H−h) on every side, down to a point. Shadows end at the lamp's reach.
 */
export function boardingShadowPolygon(
  light: Pick<BoardingLight, 'position' | 'height' | 'radius'>,
  occluder: BoardingLightOccluder,
): readonly BoardingLightPoint[] {
  const source = light.position;
  const center = {
    q: (occluder.minQ + occluder.maxQ) / 2,
    r: (occluder.minR + occluder.maxR) / 2,
  };
  const halfQ = (occluder.maxQ - occluder.minQ) / 2,
    halfR = (occluder.maxR - occluder.minR) / 2;
  const outline = occluder.round
    ? Array.from({ length: ROUND_SIDES }, (_, index) => {
        const angle = (index / ROUND_SIDES) * Math.PI * 2;
        return {
          q: center.q + Math.cos(angle) * halfQ,
          r: center.r + Math.sin(angle) * halfR,
        };
      })
    : [
        { q: occluder.minQ, r: occluder.minR },
        { q: occluder.maxQ, r: occluder.minR },
        { q: occluder.maxQ, r: occluder.maxR },
        { q: occluder.minQ, r: occluder.maxR },
      ];
  const reach = light.radius + 1;
  const dq = center.q - source.q,
    dr = center.r - source.r;
  const distance = Math.hypot(dq, dr);
  const { height } = light;
  if (occluder.height >= height) {
    // Taller than the lamp: the shadow runs on to the edge of the light.
    const stretch = (point: BoardingLightPoint) => {
      const pq = point.q - source.q,
        pr = point.r - source.r;
      const length = Math.hypot(pq, pr);
      const scale = length > EPSILON ? reach / length : 1;
      return { q: source.q + pq * scale, r: source.r + pr * scale };
    };
    return hull([...outline, ...outline.map(stretch)]);
  }
  const drop = height - occluder.height;
  const projection = height / drop;
  const narrow = (half: number) =>
    half > EPSILON
      ? Math.max(0, (half * height - LAMP_RADIUS * occluder.height) / drop) /
        half
      : 0;
  const scaleQ = narrow(halfQ),
    scaleR = narrow(halfR);
  // Stop at the lamp's reach, part way along the cone if it is longer.
  const far = distance * projection;
  const along =
    far > reach && far - distance > EPSILON
      ? Math.max(0, (reach - distance) / (far - distance))
      : 1;
  const tip = {
    q: source.q + dq * projection,
    r: source.r + dr * projection,
  };
  const end = outline.map((point) => {
    const projected = {
      q: tip.q + (point.q - center.q) * scaleQ,
      r: tip.r + (point.r - center.r) * scaleR,
    };
    return {
      q: point.q + (projected.q - point.q) * along,
      r: point.r + (projected.r - point.r) * along,
    };
  });
  return hull([...outline, ...end]);
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

/** One lamp: its fixed light and what was last added to the map. */
interface Lamp {
  readonly light: BoardingLight;
  readonly reach: BoardingLightRegion;
  /** Light inside walls, tinted by glass and shadowed by fixed objects. */
  readonly base: HTMLCanvasElement | null;
  draftBase: HTMLCanvasElement | null;
  /** Reused canvases for figure shadows at full and draft resolution. */
  full: HTMLCanvasElement | null;
  draft: HTMLCanvasElement | null;
  /** The image added to the map, stretched to the size of `base`. */
  shown: HTMLCanvasElement | null;
}

function trace(
  context: CanvasRenderingContext2D,
  points: readonly { readonly x: number; readonly y: number }[],
): void {
  context.beginPath();
  points.forEach(({ x, y }, index) => {
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.closePath();
}

function blank(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * ljuskarta-i-bordning: floor light painted into a top-down map, then
 * multiplied onto the projected floors. jamn-ljuskarta-under-forflyttning:
 * each lamp's light inside walls, glass and fixed objects is painted once;
 * figure shadows are punched into a copy only for lamps that reach a figure
 * that moved, and only that part of the map is put together again.
 */
export class BoardingLightMap {
  readonly #canvas: HTMLCanvasElement | null;
  readonly #context: CanvasRenderingContext2D | null;
  readonly #texels: number;
  readonly #ambient: string;
  readonly #lamps: Lamp[] = [];
  readonly #outlines: (readonly BoardingLightPoint[])[] = [];
  readonly #debug: boolean;
  readonly #refresh: BoardingLightRefresh;
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
    this.#debug = debug;
    this.#refresh = new BoardingLightRefresh(map.lights, texels);
    const canvas = blank(map.width * texels + 2, map.height * texels + 2);
    const context = canvas.getContext('2d');
    this.#canvas = context ? canvas : null;
    this.#context = context;
    const ambient = debug ? 0 : Math.round(255 * BOARDING_AMBIENT);
    this.#ambient = `rgb(${ambient}, ${ambient}, ${ambient})`;
    if (!context) return;
    context.fillStyle = this.#ambient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const shapes = map.thinWallPieces ? (map as ThinShapes) : undefined;
    const blockers = boardingLightBlockers(state, shapes);
    const occluders = boardingStaticLightOccluders(state, shapes);
    const glass = boardingLightGlass(state, shapes);
    for (const light of map.lights) {
      const shape = boardingLightPolygon(
        light.position,
        light.radius,
        blockers,
      );
      const image = falloff(light, texels);
      const base =
        shape.length >= 3 && image
          ? this.#paintLamp(light, image, shape, glass, occluders)
          : null;
      if (base) this.#outlines.push(shape);
      this.#lamps.push({
        light,
        reach: boardingLampReach(light),
        base,
        draftBase: null,
        full: null,
        draft: null,
        shown: null,
      });
    }
    this.update(state.people ?? []);
  }

  /** The top-down map, one texel of border around `texels` per cell. */
  get canvas(): HTMLCanvasElement | null {
    return this.#canvas;
  }

  get texels(): number {
    return this.#texels;
  }

  /**
   * jamn-ljuskarta-under-forflyttning / skuggor-mellan-rutor: moves figure
   * shadows to where the figures stand, coarser while `draft`, and returns
   * the part of the deck whose light changed, or null.
   */
  update(
    figures: readonly BoardingLightFigure[],
    draft = false,
  ): BoardingLightRegion | null {
    if (!this.#context) return null;
    const plan = this.#refresh.plan(boardingFigureOccluders(figures), draft);
    for (const refresh of plan.lamps)
      this.#shade(this.#lamps[refresh.index]!, refresh);
    if (plan.region) this.#compose(plan.region);
    return plan.region;
  }

  #paintLamp(
    light: BoardingLight,
    image: HTMLCanvasElement,
    shape: readonly BoardingLightPoint[],
    glass: ReturnType<typeof boardingLightGlass>,
    occluders: readonly BoardingLightOccluder[],
  ): HTMLCanvasElement | null {
    const canvas = blank(image.width, image.height);
    const lamp = canvas.getContext('2d');
    if (!lamp) return null;
    const texels = this.#texels;
    const local = (points: readonly BoardingLightPoint[]) =>
      points.map((point) => ({
        x: image.width / 2 + (point.q - light.position.q) * texels,
        y: image.height / 2 + (point.r - light.position.r) * texels,
      }));
    const reach = boardingLampReach(light);
    lamp.save();
    trace(lamp, local(shape));
    lamp.clip();
    lamp.drawImage(image, 0, 0);
    // glas-tintar-ljus: what lies beyond a pane, seen from the lamp, gets
    // the glass colour. The lamp image is opaque inside the clip, so
    // multiplying there never adds colour where no light falls.
    lamp.globalCompositeOperation = 'multiply';
    lamp.fillStyle = `rgb(${BOARDING_GLASS_TINT.join(', ')})`;
    for (const pane of glass) {
      if (!boardingRegionsOverlap(reach, pane)) continue;
      trace(
        lamp,
        local(
          boardingShadowPolygon(light, {
            ...pane,
            height: light.height,
            round: false,
          }),
        ),
      );
      lamp.fill();
    }
    lamp.restore();
    // Each lamp is lit and shadowed on its own, so one shadow never darkens
    // light from another lamp.
    lamp.save();
    lamp.globalCompositeOperation = 'destination-out';
    lamp.fillStyle = '#000';
    for (const occluder of occluders) {
      if (!boardingRegionsOverlap(reach, occluder)) continue;
      trace(lamp, local(boardingShadowPolygon(light, occluder)));
      lamp.fill();
    }
    lamp.restore();
    return canvas;
  }

  /** Punches the planned figure shadows into a copy of the lamp's light. */
  #shade(lamp: Lamp, refresh: BoardingLampRefresh): void {
    const { base, light } = lamp;
    if (!base || refresh.occluders.length === 0) {
      lamp.shown = base;
      return;
    }
    const scale = refresh.texels / this.#texels;
    const draft = scale !== 1;
    const width = Math.max(1, Math.ceil(base.width * scale)),
      height = Math.max(1, Math.ceil(base.height * scale));
    let source = base;
    if (draft) {
      if (!lamp.draftBase) {
        lamp.draftBase = blank(width, height);
        lamp.draftBase
          .getContext('2d')
          ?.drawImage(base, 0, 0, base.width, base.height, 0, 0, width, height);
      }
      source = lamp.draftBase;
    }
    const target = draft
      ? (lamp.draft ??= blank(width, height))
      : (lamp.full ??= blank(width, height));
    const context = target.getContext('2d');
    if (!context) {
      lamp.shown = base;
      return;
    }
    context.clearRect(0, 0, width, height);
    context.drawImage(source, 0, 0);
    context.save();
    context.globalCompositeOperation = 'destination-out';
    context.fillStyle = '#000';
    const texels = this.#texels;
    for (const occluder of refresh.occluders) {
      trace(
        context,
        boardingShadowPolygon(light, occluder).map((point) => ({
          x:
            ((base.width / 2 + (point.q - light.position.q) * texels) * width) /
            base.width,
          y:
            ((base.height / 2 + (point.r - light.position.r) * texels) *
              height) /
            base.height,
        })),
      );
      context.fill();
    }
    context.restore();
    lamp.shown = target;
  }

  /** Puts ambient light and every lamp reaching `region` together again. */
  #compose(region: BoardingLightRegion): void {
    const context = this.#context!;
    const canvas = this.#canvas!;
    const texels = this.#texels;
    const margin = 2 / texels;
    const area = {
      minQ: region.minQ - margin,
      maxQ: region.maxQ + margin,
      minR: region.minR - margin,
      maxR: region.maxR + margin,
    };
    const left = Math.max(0, Math.floor(1 + (area.minQ + 0.5) * texels)),
      top = Math.max(0, Math.floor(1 + (area.minR + 0.5) * texels)),
      right = Math.min(canvas.width, Math.ceil(1 + (area.maxQ + 0.5) * texels)),
      bottom = Math.min(
        canvas.height,
        Math.ceil(1 + (area.maxR + 0.5) * texels),
      );
    if (right <= left || bottom <= top) return;
    const rectangle = [
      { x: left, y: top },
      { x: right, y: top },
      { x: right, y: bottom },
      { x: left, y: bottom },
    ];
    context.save();
    trace(context, rectangle);
    context.clip();
    context.globalCompositeOperation = 'source-over';
    context.fillStyle = this.#ambient;
    context.fillRect(left, top, right - left, bottom - top);
    context.globalCompositeOperation = 'lighter';
    for (const lamp of this.#lamps) {
      const { shown, base } = lamp;
      if (!shown || !base || !boardingRegionsOverlap(lamp.reach, area))
        continue;
      const x = 1 + (lamp.light.position.q + 0.5) * texels - base.width / 2,
        y = 1 + (lamp.light.position.r + 0.5) * texels - base.height / 2;
      context.drawImage(shown, x, y, base.width, base.height);
    }
    context.restore();
    if (this.#debug) this.#strokeOutlines();
    for (const [id, tinted] of this.#tints) {
      const tint = tinted?.getContext('2d');
      if (!tint) continue;
      tint.save();
      trace(tint, rectangle);
      tint.clip();
      tint.clearRect(left, top, right - left, bottom - top);
      tint.drawImage(canvas, 0, 0);
      tint.globalCompositeOperation = 'multiply';
      tint.fillStyle = `rgb(${id})`;
      tint.fillRect(left, top, right - left, bottom - top);
      tint.restore();
    }
  }

  /**
   * ljuskarta-i-bordning: `?light-debug` outlines every lamp polygon on the
   * raw map, so shadow edges can be checked by eye.
   */
  #strokeOutlines(): void {
    const context = this.#context!;
    const texels = this.#texels;
    context.save();
    context.strokeStyle = '#ff40ff';
    context.lineWidth = 1;
    for (const shape of this.#outlines) {
      trace(
        context,
        shape.map((point) => ({
          x: 1 + (point.q + 0.5) * texels,
          y: 1 + (point.r + 0.5) * texels,
        })),
      );
      context.stroke();
    }
    context.restore();
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

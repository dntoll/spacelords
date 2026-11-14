import { BOARDING_LAYER_SYMBOLS } from '../../../../shared/boarding/map-format.js';
import type { CombatShipType } from '../../../space-battle/models/index.js';

export type BoardingCell = Readonly<{ q: number; r: number }>;
export type BoardingRoom = 'bridge' | 'engineering' | 'cockpit';
export type BoardingTerrain =
  'floor' | 'wall' | 'hull' | 'thin-wall' | 'low-thin-wall' | 'window';
export type BoardingThinAxis = 'q' | 'r';
export type BoardingFeatureKind =
  | 'door'
  | 'reactor'
  | 'cover'
  | 'exit'
  | 'wall'
  | 'hull'
  | 'thin-wall'
  | 'window';

export interface BoardingFeatureDefinition {
  readonly id: string;
  readonly kind: BoardingFeatureKind;
  readonly position: BoardingCell;
  readonly locked?: boolean;
  readonly exit?: 'breach' | 'escape-pod';
  readonly axis?: BoardingThinAxis;
  readonly low?: boolean;
}

/**
 * tunna-innervaggar: Q, R, q and r are thin walls; lower case is half height.
 * sammanfogade-tunna-vaggar: the shape follows the neighbours, so Q and R mean
 * the same wall. The letter's axis is only kept in saved battle features.
 */
export function boardingThinAxisFromSymbol(
  symbol: string,
): BoardingThinAxis | null {
  if (symbol === 'Q' || symbol === 'q') return 'q';
  if (symbol === 'R' || symbol === 'r') return 'r';
  return null;
}

/**
 * dorrar-som-tunna-vaggar: a door is a thin slab along the wall line it stands
 * in. Walls above and below give a slab thin along q, like `Q`.
 */
export function boardingDoorAxis(
  position: BoardingCell,
  wallAt: (q: number, r: number) => boolean,
): BoardingThinAxis {
  const alongR =
    Number(wallAt(position.q, position.r - 1)) +
    Number(wallAt(position.q, position.r + 1));
  const alongQ =
    Number(wallAt(position.q - 1, position.r)) +
    Number(wallAt(position.q + 1, position.r));
  return alongR > alongQ ? 'q' : 'r';
}

/**
 * sammanfogade-tunna-vaggar: one straight part of a thin wall's footprint. It
 * is thin along `axis`, like a `Q` or `R` slab, and covers `span` of its
 * length, from -0.5 to 0.5 across the cell.
 */
export interface BoardingThinPiece {
  readonly axis: BoardingThinAxis;
  readonly span: readonly [number, number];
}

/** North is toward lower r and west toward lower q, as in the editor grid. */
export type BoardingThinArm = 'north' | 'south' | 'west' | 'east';

const THIN_HALF = 1 / 6;

function thinPiece(
  axis: BoardingThinAxis,
  from: number,
  to: number,
): BoardingThinPiece {
  return Object.freeze({ axis, span: Object.freeze([from, to] as const) });
}

/** A straight slab across the whole cell, as a door stands. */
export function boardingStraightThinPieces(
  axis: BoardingThinAxis,
): readonly BoardingThinPiece[] {
  return Object.freeze([thinPiece(axis, -0.5, 0.5)]);
}

/**
 * sammanfogade-tunna-vaggar: the footprint of a thin wall with arms toward the
 * given neighbours, as slabs that do not overlap, ordered back to front for
 * the isometric camera. A wall without arms is a post as thick as the wall.
 */
export function boardingThinPieces(
  arms: ReadonlySet<BoardingThinArm>,
): readonly BoardingThinPiece[] {
  const north = arms.has('north');
  const south = arms.has('south');
  const west = arms.has('west');
  const east = arms.has('east');
  const pieces: BoardingThinPiece[] = [];
  if (north || south) {
    if (west) pieces.push(thinPiece('r', -0.5, -THIN_HALF));
    pieces.push(
      thinPiece('q', north ? -0.5 : -THIN_HALF, south ? 0.5 : THIN_HALF),
    );
    if (east) pieces.push(thinPiece('r', THIN_HALF, 0.5));
  } else if (west || east)
    pieces.push(
      thinPiece('r', west ? -0.5 : -THIN_HALF, east ? 0.5 : THIN_HALF),
    );
  else pieces.push(thinPiece('q', -THIN_HALF, THIN_HALF));
  return Object.freeze(pieces);
}

/**
 * sammanfogade-tunna-vaggar: a thin wall reaches toward every neighbour that
 * is a wall, hull or thin wall of either height, and toward a door whose slab
 * runs toward it. `doorAxisAt` gives a door's axis, or null where none stands.
 */
export function boardingThinWallArms(
  position: BoardingCell,
  wallAt: (q: number, r: number) => boolean,
  doorAxisAt: (q: number, r: number) => BoardingThinAxis | null,
): ReadonlySet<BoardingThinArm> {
  const sides = [
    ['north', 0, -1, 'q'],
    ['south', 0, 1, 'q'],
    ['west', -1, 0, 'r'],
    ['east', 1, 0, 'r'],
  ] as const;
  const arms = new Set<BoardingThinArm>();
  for (const [arm, dq, dr, doorAxis] of sides) {
    const q = position.q + dq;
    const r = position.r + dr;
    if (wallAt(q, r) || doorAxisAt(q, r) === doorAxis) arms.add(arm);
  }
  return arms;
}

/** The ground rectangle a piece covers, in cell coordinates. */
export function boardingThinPieceBounds(
  position: BoardingCell,
  piece: BoardingThinPiece,
): Readonly<{ minQ: number; maxQ: number; minR: number; maxR: number }> {
  const [from, to] = piece.span;
  return piece.axis === 'q'
    ? {
        minQ: position.q - THIN_HALF,
        maxQ: position.q + THIN_HALF,
        minR: position.r + from,
        maxR: position.r + to,
      }
    : {
        minQ: position.q + from,
        maxQ: position.q + to,
        minR: position.r - THIN_HALF,
        maxR: position.r + THIN_HALF,
      };
}

/** The axis when the pieces are one slab across the whole cell, else null. */
export function boardingThinPiecesStraight(
  pieces: readonly BoardingThinPiece[],
): BoardingThinAxis | null {
  const only = pieces.length === 1 ? pieces[0]! : null;
  return only && only.span[0] === -0.5 && only.span[1] === 0.5
    ? only.axis
    : null;
}

export function boardingThinWallIsLow(symbol: string): boolean {
  return symbol === 'q' || symbol === 'r';
}

/** tunna-innervaggar: only floor and thin walls contribute an outer floor band. */
export function boardingTerrainShowsFloor(
  terrain: BoardingTerrain | null,
): boolean {
  return (
    terrain === 'floor' ||
    terrain === 'thin-wall' ||
    terrain === 'low-thin-wall' ||
    terrain === 'window'
  );
}

export function boardingThinNeighbor(
  position: BoardingCell,
  axis: BoardingThinAxis,
): BoardingCell {
  return Object.freeze(
    axis === 'q'
      ? { q: position.q + 1, r: position.r }
      : { q: position.q, r: position.r + 1 },
  );
}

export function boardingThinOutsideTerrain(
  terrainAt: (cell: BoardingCell) => BoardingTerrain | null,
  position: BoardingCell,
  axis: BoardingThinAxis,
): BoardingTerrain | null {
  const terrain = terrainAt(boardingThinNeighbor(position, axis));
  return boardingTerrainShowsFloor(terrain) ? terrain : null;
}

/**
 * skeppsbild-under-bordning: the ship's picture lies on the deck plane under
 * the cells; x, y and scale are in cells, as aligned in the editor.
 */
export interface BoardingShipPicture {
  readonly ship: CombatShipType;
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  /** Drawn flipped left to right, as for the defender in a joined boarding. */
  readonly mirrored: boolean;
}

export interface BoardingLight {
  readonly position: BoardingCell;
  readonly height: number;
  readonly radius: number;
  readonly intensity: number;
}

export function boardingCeilingLight(position: BoardingCell): BoardingLight {
  return Object.freeze({
    position: Object.freeze({ ...position }),
    height: 2.2,
    radius: 6,
    intensity: 1,
  });
}

export interface BoardingSpawns {
  readonly player: readonly BoardingCell[];
  readonly defender: readonly BoardingCell[];
  readonly civilian: readonly BoardingCell[];
}

interface ParsedLayers {
  readonly lights: readonly string[] | undefined;
  readonly meta: ReadonlyMap<string, string>;
  readonly terrain: readonly string[];
  readonly objects: readonly string[];
  readonly rooms: readonly string[];
  readonly spawns: readonly string[];
}

const key = (position: BoardingCell): string => `${position.q},${position.r}`;
const freezeCell = (q: number, r: number): BoardingCell =>
  Object.freeze({ q, r });

export type BoardingShipZone = 'attacker' | 'defender' | 'bridge';

export class BoardingMap {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly features: readonly BoardingFeatureDefinition[];
  readonly spawns: BoardingSpawns;
  readonly airlocks: readonly BoardingCell[];
  readonly cockpits: readonly BoardingCell[];
  readonly campaign: boolean;
  readonly lights: readonly BoardingLight[];
  readonly pictures: readonly BoardingShipPicture[];
  readonly #terrain: ReadonlyMap<string, BoardingTerrain>;
  readonly #rooms: ReadonlyMap<string, BoardingRoom>;
  readonly #zones: ReadonlyMap<string, BoardingShipZone>;
  readonly #walls: ReadonlySet<string>;
  readonly #thinPieces: ReadonlyMap<string, readonly BoardingThinPiece[]>;

  constructor(
    name: string,
    width: number,
    height: number,
    terrain: ReadonlyMap<string, BoardingTerrain>,
    rooms: ReadonlyMap<string, BoardingRoom>,
    features: readonly BoardingFeatureDefinition[],
    spawns: BoardingSpawns,
    airlocks: readonly BoardingCell[] = [],
    cockpits: readonly BoardingCell[] = [],
    campaign = false,
    zones: ReadonlyMap<string, BoardingShipZone> = new Map(),
    lights: readonly BoardingLight[] = [],
    pictures: readonly BoardingShipPicture[] = [],
  ) {
    this.pictures = Object.freeze(
      pictures.map((picture) => Object.freeze({ ...picture })),
    );
    this.name = name;
    this.width = width;
    this.height = height;
    this.#terrain = terrain;
    this.#rooms = rooms;
    this.#zones = zones;
    this.campaign = campaign;
    this.lights = Object.freeze(
      lights.map((light) =>
        Object.freeze({
          ...light,
          position: freezeCell(light.position.q, light.position.r),
        }),
      ),
    );
    this.features = Object.freeze([...features]);
    this.#walls = new Set([
      ...[...terrain]
        .filter(([, kind]) => kind !== 'floor')
        .map(([cell]) => cell),
      ...features
        .filter(
          (feature) =>
            feature.kind === 'wall' ||
            feature.kind === 'hull' ||
            feature.kind === 'thin-wall',
        )
        .map((feature) => key(feature.position)),
    ]);
    const doors = new Set(
      features
        .filter((feature) => feature.kind === 'door')
        .map((feature) => key(feature.position)),
    );
    const wallAt = (q: number, r: number) => this.#walls.has(`${q},${r}`);
    const doorAxisAt = (q: number, r: number) =>
      doors.has(`${q},${r}`) ? boardingDoorAxis({ q, r }, wallAt) : null;
    this.#thinPieces = new Map(
      features
        .filter(
          (feature) =>
            feature.kind === 'thin-wall' || feature.kind === 'window',
        )
        .map((feature) => [
          key(feature.position),
          boardingThinPieces(
            boardingThinWallArms(feature.position, wallAt, doorAxisAt),
          ),
        ]),
    );
    this.airlocks = Object.freeze([...airlocks]);
    this.cockpits = Object.freeze([...cockpits]);
    this.spawns = Object.freeze({
      player: Object.freeze([...spawns.player]),
      defender: Object.freeze([...spawns.defender]),
      civilian: Object.freeze([...spawns.civilian]),
    });
    Object.freeze(this);
  }

  zoneAt(position: BoardingCell): BoardingShipZone | null {
    return this.#zones.get(key(position)) ?? null;
  }

  terrainAt(position: BoardingCell): BoardingTerrain | null {
    return this.#terrain.get(key(position)) ?? null;
  }

  /** dorrar-som-tunna-vaggar: see boardingDoorAxis. */
  doorAxis(position: BoardingCell): BoardingThinAxis {
    return boardingDoorAxis(position, (q, r) => this.#walls.has(`${q},${r}`));
  }

  /**
   * sammanfogade-tunna-vaggar: the joined shape of the thin wall here.
   * helhogt-fonster: a High window pane joins and is shaped the same way.
   */
  thinWallPieces(position: BoardingCell): readonly BoardingThinPiece[] | null {
    return this.#thinPieces.get(key(position)) ?? null;
  }

  roomAt(position: BoardingCell): BoardingRoom | null {
    return this.#rooms.get(key(position)) ?? null;
  }

  contains(position: BoardingCell): boolean {
    return (
      position.q >= 0 &&
      position.q < this.width &&
      position.r >= 0 &&
      position.r < this.height &&
      this.#terrain.has(key(position))
    );
  }
}

function sections(source: string): ParsedLayers {
  const result = new Map<string, string[]>();
  let current = '';
  for (const raw of source.replaceAll('\r', '').split('\n')) {
    const heading = raw.match(/^\[([a-z]+)]$/i);
    if (heading) {
      current = heading[1]!.toLowerCase();
      result.set(current, []);
    } else if (raw !== '' && current) result.get(current)!.push(raw);
  }
  const meta = new Map<string, string>();
  for (const line of result.get('meta') ?? []) {
    const separator = line.indexOf('=');
    if (separator < 1) throw new Error(`Invalid meta line: ${line}`);
    meta.set(line.slice(0, separator), line.slice(separator + 1));
  }
  const layer = (name: string): readonly string[] => {
    const value = result.get(name);
    if (!value) throw new Error(`Missing [${name}] layer.`);
    return value;
  };
  return {
    meta,
    terrain: layer('terrain'),
    objects: layer('objects'),
    rooms: layer('rooms'),
    spawns: layer('spawns'),
    lights: result.get('lights'),
  };
}

function dimensions(
  layers: ParsedLayers,
): Readonly<{ width: number; height: number }> {
  const width = Number(layers.meta.get('width'));
  const height = Number(layers.meta.get('height'));
  if (!Number.isSafeInteger(width) || width < 1)
    throw new Error('Map width must be a positive integer.');
  if (!Number.isSafeInteger(height) || height < 1)
    throw new Error('Map height must be a positive integer.');
  for (const [name, rows] of [
    ['terrain', layers.terrain],
    ['objects', layers.objects],
    ['rooms', layers.rooms],
    ['spawns', layers.spawns],
    ...(layers.lights ? [['lights', layers.lights] as const] : []),
  ] as const) {
    if (rows.length !== height)
      throw new Error(`${name} has ${rows.length} rows; expected ${height}.`);
    rows.forEach((row, index) => {
      if (row.length !== width)
        throw new Error(
          `${name} row ${index + 1} has width ${row.length}; expected ${width}.`,
        );
    });
  }
  return Object.freeze({ width, height });
}

function symbol(
  layer: string,
  rows: readonly string[],
  allowed: string,
  q: number,
  r: number,
): string {
  const value = rows[r]![q]!;
  if (!allowed.includes(value))
    throw new Error(
      `${layer} has unknown symbol "${value}" at row ${r + 1}, column ${q + 1}.`,
    );
  return value;
}

/** datadriven-bordningskarta: strict parser for a hand-editable layered map. */
export function parseBoardingMap(
  source: string,
  ship?: CombatShipType,
): BoardingMap {
  const layers = sections(source);
  const { width, height } = dimensions(layers);
  const terrain = new Map<string, BoardingTerrain>();
  const rooms = new Map<string, BoardingRoom>();
  const features: BoardingFeatureDefinition[] = [];
  const airlocks: BoardingCell[] = [];
  const lights: BoardingLight[] = [];
  const cockpits: BoardingCell[] = [];
  const campaign = layers.meta.get('rules') === 'campaign';
  const spawns: Record<keyof BoardingSpawns, BoardingCell[]> = {
    player: [],
    defender: [],
    civilian: [],
  };
  for (let r = 0; r < height; r++) {
    for (let q = 0; q < width; q++) {
      const position = freezeCell(q, r);
      const terrainSymbol = symbol(
        'terrain',
        layers.terrain,
        BOARDING_LAYER_SYMBOLS.terrain,
        q,
        r,
      );
      if (terrainSymbol === 'O') continue;
      const axis = boardingThinAxisFromSymbol(terrainSymbol);
      const terrainKind = axis
        ? boardingThinWallIsLow(terrainSymbol)
          ? 'low-thin-wall'
          : 'thin-wall'
        : terrainSymbol === '.'
          ? 'floor'
          : terrainSymbol === '#'
            ? 'wall'
            : terrainSymbol === 'W'
              ? 'window'
              : 'hull';
      terrain.set(key(position), terrainKind);
      if (axis)
        features.push(
          Object.freeze({
            id: `thin-wall-${q}-${r}`,
            kind: 'thin-wall',
            position,
            axis,
            low: terrainKind === 'low-thin-wall',
          }),
        );
      // helhogt-fonster: a full-height pane of glass on the floor.
      else if (terrainKind === 'window')
        features.push(
          Object.freeze({ id: `window-${q}-${r}`, kind: 'window', position }),
        );
      else if (terrainSymbol === '#' || terrainSymbol === 'H') {
        const kind = terrainSymbol === '#' ? 'wall' : 'hull';
        features.push(
          Object.freeze({
            id: `${kind}-${q}-${r}`,
            kind,
            position,
          }),
        );
      }

      if (
        layers.lights &&
        symbol('lights', layers.lights, '-L', q, r) === 'L'
      ) {
        if (terrainKind !== 'floor')
          throw new Error(`A light needs floor at ${q},${r}.`);
        lights.push(boardingCeilingLight(position));
      }

      const room = symbol('rooms', layers.rooms, '-BEK', q, r);
      if (room === 'K') cockpits.push(position);
      if (room !== '-')
        rooms.set(
          key(position),
          room === 'B' ? 'bridge' : room === 'E' ? 'engineering' : 'cockpit',
        );

      const spawn = symbol('spawns', layers.spawns, '-PDC', q, r);
      if (spawn === 'P') spawns.player.push(position);
      else if (spawn === 'D') spawns.defender.push(position);
      else if (spawn === 'C') spawns.civilian.push(position);

      const object = symbol('objects', layers.objects, '-DLRCBXA', q, r);
      if (object === 'A') airlocks.push(position);
      let feature: BoardingFeatureDefinition | null = null;
      if (object === 'D' || object === 'L')
        feature = {
          id: `door-${q}-${r}`,
          kind: 'door',
          position,
          locked: object === 'L',
        };
      else if (object === 'R')
        feature = { id: 'reactor', kind: 'reactor', position };
      else if (object === 'C')
        feature = { id: `cover-${q}-${r}`, kind: 'cover', position };
      else if (object === 'B')
        feature = {
          id: 'breach',
          kind: 'exit',
          position,
          exit: 'breach',
        };
      else if (object === 'X')
        feature = {
          id: `escape-${q}-${r}`,
          kind: 'exit',
          position,
          exit: 'escape-pod',
        };
      if (feature) features.push(Object.freeze(feature));
    }
  }
  if (!campaign && !features.some((feature) => feature.id === 'reactor'))
    throw new Error('The map needs one reactor.');
  if (!campaign && !features.some((feature) => feature.exit === 'breach'))
    throw new Error('The map needs one breach.');
  return new BoardingMap(
    layers.meta.get('name') ?? 'Boarding map',
    width,
    height,
    terrain,
    rooms,
    features,
    spawns,
    airlocks,
    cockpits,
    campaign,
    new Map(),
    lights,
    shipPictures(layers.meta, ship),
  );
}

/** skeppsbild-under-bordning: only a map aligned in the editor shows its ship. */
function shipPictures(
  meta: ReadonlyMap<string, string>,
  ship: CombatShipType | undefined,
): BoardingShipPicture[] {
  const [x, y, scale] = ['spriteX', 'spriteY', 'spriteScale'].map((name) =>
    Number(meta.get(name) ?? NaN),
  );
  if (!ship || ![x, y, scale].every((value) => Number.isFinite(value)))
    return [];
  return [{ ship, x: x!, y: y!, scale: scale!, mirrored: false }];
}

import { BOARDING_LAYER_SYMBOLS } from '../../../../shared/boarding/map-format.js';

export type BoardingCell = Readonly<{ q: number; r: number }>;
export type BoardingRoom = 'bridge' | 'engineering' | 'cockpit';
export type BoardingTerrain =
  'floor' | 'wall' | 'hull' | 'thin-wall' | 'low-thin-wall';
export type BoardingThinAxis = 'q' | 'r';
export type BoardingFeatureKind =
  'door' | 'reactor' | 'cover' | 'exit' | 'wall' | 'hull' | 'thin-wall';

export interface BoardingFeatureDefinition {
  readonly id: string;
  readonly kind: BoardingFeatureKind;
  readonly position: BoardingCell;
  readonly locked?: boolean;
  readonly exit?: 'breach' | 'escape-pod';
  readonly axis?: BoardingThinAxis;
  readonly low?: boolean;
}

/** tunna-innervaggar: Q and q run across q; R and r run across r. */
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
    terrain === 'low-thin-wall'
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
  readonly #terrain: ReadonlyMap<string, BoardingTerrain>;
  readonly #rooms: ReadonlyMap<string, BoardingRoom>;
  readonly #zones: ReadonlyMap<string, BoardingShipZone>;
  readonly #walls: ReadonlySet<string>;

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
  ) {
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
export function parseBoardingMap(source: string): BoardingMap {
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
  );
}

export type BoardingHex = Readonly<{ q: number; r: number }>;
export type BoardingRoom = 'bridge' | 'engineering';
export type BoardingTerrain = 'floor' | 'wall' | 'hull';
export type BoardingFeatureKind =
  'door' | 'reactor' | 'cover' | 'exit' | 'wall' | 'hull';

export interface BoardingFeatureDefinition {
  readonly id: string;
  readonly kind: BoardingFeatureKind;
  readonly position: BoardingHex;
  readonly locked?: boolean;
  readonly exit?: 'breach' | 'escape-pod';
}

export interface BoardingSpawns {
  readonly player: readonly BoardingHex[];
  readonly defender: readonly BoardingHex[];
  readonly civilian: readonly BoardingHex[];
}

interface ParsedLayers {
  readonly meta: ReadonlyMap<string, string>;
  readonly terrain: readonly string[];
  readonly objects: readonly string[];
  readonly rooms: readonly string[];
  readonly spawns: readonly string[];
}

const key = (position: BoardingHex): string => `${position.q},${position.r}`;
const freezeHex = (q: number, r: number): BoardingHex =>
  Object.freeze({ q, r });

export class BoardingMap {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly features: readonly BoardingFeatureDefinition[];
  readonly spawns: BoardingSpawns;
  readonly #terrain: ReadonlyMap<string, BoardingTerrain>;
  readonly #rooms: ReadonlyMap<string, BoardingRoom>;

  constructor(
    name: string,
    width: number,
    height: number,
    terrain: ReadonlyMap<string, BoardingTerrain>,
    rooms: ReadonlyMap<string, BoardingRoom>,
    features: readonly BoardingFeatureDefinition[],
    spawns: BoardingSpawns,
  ) {
    this.name = name;
    this.width = width;
    this.height = height;
    this.#terrain = terrain;
    this.#rooms = rooms;
    this.features = Object.freeze([...features]);
    this.spawns = Object.freeze({
      player: Object.freeze([...spawns.player]),
      defender: Object.freeze([...spawns.defender]),
      civilian: Object.freeze([...spawns.civilian]),
    });
    Object.freeze(this);
  }

  terrainAt(position: BoardingHex): BoardingTerrain | null {
    return this.#terrain.get(key(position)) ?? null;
  }

  roomAt(position: BoardingHex): BoardingRoom | null {
    return this.#rooms.get(key(position)) ?? null;
  }

  contains(position: BoardingHex): boolean {
    return (
      position.q >= 0 &&
      position.q < this.width &&
      position.r >= 0 &&
      position.r < this.height
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
  const spawns: Record<keyof BoardingSpawns, BoardingHex[]> = {
    player: [],
    defender: [],
    civilian: [],
  };
  for (let r = 0; r < height; r++) {
    for (let q = 0; q < width; q++) {
      const position = freezeHex(q, r);
      const terrainSymbol = symbol('terrain', layers.terrain, '.#H', q, r);
      const terrainKind: BoardingTerrain =
        terrainSymbol === '.'
          ? 'floor'
          : terrainSymbol === '#'
            ? 'wall'
            : 'hull';
      terrain.set(key(position), terrainKind);
      if (terrainKind !== 'floor')
        features.push(
          Object.freeze({
            id: `${terrainKind}-${q}-${r}`,
            kind: terrainKind,
            position,
          }),
        );

      const room = symbol('rooms', layers.rooms, '-BE', q, r);
      if (room !== '-')
        rooms.set(key(position), room === 'B' ? 'bridge' : 'engineering');

      const spawn = symbol('spawns', layers.spawns, '-PDC', q, r);
      if (spawn === 'P') spawns.player.push(position);
      else if (spawn === 'D') spawns.defender.push(position);
      else if (spawn === 'C') spawns.civilian.push(position);

      const object = symbol('objects', layers.objects, '-DLRCBX', q, r);
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
  if (!features.some((feature) => feature.id === 'reactor'))
    throw new Error('The map needs one reactor.');
  if (!features.some((feature) => feature.exit === 'breach'))
    throw new Error('The map needs one breach.');
  return new BoardingMap(
    layers.meta.get('name') ?? 'Boarding map',
    width,
    height,
    terrain,
    rooms,
    features,
    spawns,
  );
}

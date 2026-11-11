export const BOARDING_LAYER_SYMBOLS = Object.freeze({
  terrain: '.#HOQRqr',
  objects: '-DLRCBXA',
  rooms: '-BEK',
  spawns: '-PDC',
  lights: '-L',
});

export type BoardingEditorLayer = keyof typeof BOARDING_LAYER_SYMBOLS;

export const BOARDING_MAP_FILES = Object.freeze({
  colony: 'colony-boarding.txt',
  exploration: 'exploration-boarding.txt',
  salvage: 'salvage-boarding.txt',
  shuttle: 'shuttle-boarding.txt',
  pirate: 'pirate-boarding.txt',
  raptor: 'raptor-boarding.txt',
  transport: 'campaign-transport-boarding.txt',
  'test-transport': 'transport-boarding.txt',
});

export type BoardingMapId = keyof typeof BOARDING_MAP_FILES;

export const BOARDING_MAP_IDS = Object.freeze(
  Object.keys(BOARDING_MAP_FILES) as BoardingMapId[],
);

export interface BoardingMapText {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly campaign: boolean;
  readonly spriteX: number | null;
  readonly spriteY: number | null;
  readonly spriteScale: number | null;
  readonly terrain: readonly string[];
  readonly objects: readonly string[];
  readonly rooms: readonly string[];
  readonly spawns: readonly string[];
  readonly lights: readonly string[] | null;
}

interface ParsedSections {
  readonly meta: ReadonlyMap<string, string>;
  readonly terrain: readonly string[];
  readonly objects: readonly string[];
  readonly rooms: readonly string[];
  readonly spawns: readonly string[];
  readonly lights: readonly string[] | null;
}

function sections(source: string): ParsedSections {
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
    lights: result.get('lights') ?? null,
  };
}

function optionalNumber(
  meta: ReadonlyMap<string, string>,
  key: string,
): number | null {
  const raw = meta.get(key);
  if (raw === undefined) return null;
  const value = Number(raw);
  if (!Number.isFinite(value))
    throw new Error(`Map ${key} must be a finite number.`);
  return value;
}

function assertLayer(
  name: BoardingEditorLayer,
  rows: readonly string[],
  width: number,
  height: number,
): void {
  if (rows.length !== height)
    throw new Error(`${name} has ${rows.length} rows; expected ${height}.`);
  const allowed = BOARDING_LAYER_SYMBOLS[name];
  rows.forEach((row, index) => {
    if (row.length !== width)
      throw new Error(
        `${name} row ${index + 1} has width ${row.length}; expected ${width}.`,
      );
    for (let column = 0; column < row.length; column++) {
      const symbol = row[column]!;
      if (!allowed.includes(symbol))
        throw new Error(
          `${name} has unknown symbol "${symbol}" at row ${index + 1}, column ${column + 1}.`,
        );
    }
  });
}

function hasSymbol(rows: readonly string[], symbol: string): boolean {
  return rows.some((row) => row.includes(symbol));
}

function assertLights(
  rows: readonly string[],
  terrain: readonly string[],
  width: number,
  height: number,
): void {
  if (rows.length !== height)
    throw new Error(`lights has ${rows.length} rows; expected ${height}.`);
  rows.forEach((row, index) => {
    if (row.length !== width)
      throw new Error(
        `lights row ${index + 1} has width ${row.length}; expected ${width}.`,
      );
    for (let column = 0; column < row.length; column++) {
      const symbol = row[column]!;
      if (symbol !== '-' && symbol !== 'L')
        throw new Error(
          `lights has unknown symbol "${symbol}" at row ${index + 1}, column ${column + 1}.`,
        );
      if (symbol === 'L' && terrain[index]![column] !== '.')
        throw new Error(`A light needs floor at ${column},${index}.`);
    }
  });
}

/** lokal-bordningskarteditor: layered text plus optional sprite alignment. */
export function parseBoardingMapText(source: string): BoardingMapText {
  const layers = sections(source);
  const width = Number(layers.meta.get('width'));
  const height = Number(layers.meta.get('height'));
  if (!Number.isSafeInteger(width) || width < 1)
    throw new Error('Map width must be a positive integer.');
  if (!Number.isSafeInteger(height) || height < 1)
    throw new Error('Map height must be a positive integer.');
  for (const name of ['terrain', 'objects', 'rooms', 'spawns'] as const)
    assertLayer(name, layers[name], width, height);
  if (layers.lights) assertLights(layers.lights, layers.terrain, width, height);
  for (let r = 0; r < height; r++) {
    for (let q = 0; q < width; q++) {
      if (layers.terrain[r]![q] !== 'O') continue;
      if (
        [layers.objects, layers.rooms, layers.spawns, layers.lights].some(
          (rows) => rows && rows[r]![q] !== '-',
        )
      )
        throw new Error(
          `Outside cannot contain objects, rooms, spawns or lights at ${q},${r}.`,
        );
    }
  }
  const campaign = layers.meta.get('rules') === 'campaign';
  if (!campaign && !hasSymbol(layers.objects, 'R'))
    throw new Error('The map needs one reactor.');
  if (!campaign && !hasSymbol(layers.objects, 'B'))
    throw new Error('The map needs one breach.');
  return Object.freeze({
    name: layers.meta.get('name') ?? 'Boarding map',
    width,
    height,
    campaign,
    spriteX: optionalNumber(layers.meta, 'spriteX'),
    spriteY: optionalNumber(layers.meta, 'spriteY'),
    spriteScale: optionalNumber(layers.meta, 'spriteScale'),
    terrain: Object.freeze([...layers.terrain]),
    objects: Object.freeze([...layers.objects]),
    rooms: Object.freeze([...layers.rooms]),
    spawns: Object.freeze([...layers.spawns]),
    lights: layers.lights ? Object.freeze([...layers.lights]) : null,
  });
}

function metaLine(key: string, value: string): string {
  return `${key}=${value}`;
}

export function formatBoardingMap(map: BoardingMapText): string {
  const meta = [
    metaLine('name', map.name),
    metaLine('width', String(map.width)),
    metaLine('height', String(map.height)),
  ];
  if (map.campaign) meta.push(metaLine('rules', 'campaign'));
  if (map.spriteX !== null) meta.push(metaLine('spriteX', String(map.spriteX)));
  if (map.spriteY !== null) meta.push(metaLine('spriteY', String(map.spriteY)));
  if (map.spriteScale !== null)
    meta.push(metaLine('spriteScale', String(map.spriteScale)));
  const block = (name: string, rows: readonly string[]): string =>
    `[${name}]\n${rows.join('\n')}`;
  return [
    '[meta]',
    ...meta,
    '',
    block('terrain', map.terrain),
    '',
    block('objects', map.objects),
    '',
    block('rooms', map.rooms),
    '',
    block('spawns', map.spawns),
    '',
    ...(map.lights ? [block('lights', map.lights), ''] : []),
  ].join('\n');
}

import {
  parseBoardingMapText,
  type BoardingMapText,
} from '../../shared/boarding-map-format.js';

export {
  BOARDING_LAYER_SYMBOLS,
  BOARDING_MAP_FILES,
  BOARDING_MAP_IDS,
  formatBoardingMap,
  parseBoardingMapText,
} from '../../shared/boarding-map-format.js';
export type {
  BoardingEditorLayer,
  BoardingMapId,
  BoardingMapText,
} from '../../shared/boarding-map-format.js';

export type BoardingCell = Readonly<{ q: number; r: number }>;
export type BoardingRoom = 'bridge' | 'engineering';
export type BoardingTerrain = 'floor' | 'wall' | 'hull';
export type BoardingFeatureKind =
  'door' | 'reactor' | 'cover' | 'exit' | 'wall' | 'hull';

export interface BoardingFeatureDefinition {
  readonly id: string;
  readonly kind: BoardingFeatureKind;
  readonly position: BoardingCell;
  readonly locked?: boolean;
  readonly exit?: 'breach' | 'escape-pod';
}

export interface BoardingSpawns {
  readonly player: readonly BoardingCell[];
  readonly defender: readonly BoardingCell[];
  readonly civilian: readonly BoardingCell[];
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
  readonly #terrain: ReadonlyMap<string, BoardingTerrain>;
  readonly #rooms: ReadonlyMap<string, BoardingRoom>;
  readonly #zones: ReadonlyMap<string, BoardingShipZone>;

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
  ) {
    this.name = name;
    this.width = width;
    this.height = height;
    this.#terrain = terrain;
    this.#rooms = rooms;
    this.#zones = zones;
    this.campaign = campaign;
    this.features = Object.freeze([...features]);
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

  roomAt(position: BoardingCell): BoardingRoom | null {
    return this.#rooms.get(key(position)) ?? null;
  }

  contains(position: BoardingCell): boolean {
    return (
      position.q >= 0 &&
      position.q < this.width &&
      position.r >= 0 &&
      position.r < this.height
    );
  }
}

function cell(rows: readonly string[], q: number, r: number): string {
  return rows[r]![q]!;
}

export function boardingMapFromText(layers: BoardingMapText): BoardingMap {
  const terrain = new Map<string, BoardingTerrain>();
  const rooms = new Map<string, BoardingRoom>();
  const features: BoardingFeatureDefinition[] = [];
  const airlocks: BoardingCell[] = [];
  const cockpits: BoardingCell[] = [];
  const spawns: Record<keyof BoardingSpawns, BoardingCell[]> = {
    player: [],
    defender: [],
    civilian: [],
  };
  for (let r = 0; r < layers.height; r++) {
    for (let q = 0; q < layers.width; q++) {
      const position = freezeCell(q, r);
      const terrainSymbol = cell(layers.terrain, q, r);
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

      const room = cell(layers.rooms, q, r);
      if (room === 'K') cockpits.push(position);
      else if (room !== '-')
        rooms.set(key(position), room === 'B' ? 'bridge' : 'engineering');

      const spawn = cell(layers.spawns, q, r);
      if (spawn === 'P') spawns.player.push(position);
      else if (spawn === 'D') spawns.defender.push(position);
      else if (spawn === 'C') spawns.civilian.push(position);

      const object = cell(layers.objects, q, r);
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
  return new BoardingMap(
    layers.name,
    layers.width,
    layers.height,
    terrain,
    rooms,
    features,
    spawns,
    airlocks,
    cockpits,
    layers.campaign,
  );
}

/** datadriven-bordningskarta: strict parser for a hand-editable layered map. */
export function parseBoardingMap(source: string): BoardingMap {
  return boardingMapFromText(parseBoardingMapText(source));
}

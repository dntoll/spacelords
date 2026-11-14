import {
  BoardingMap,
  boardingCeilingLight,
  type BoardingLight,
  parseBoardingMap,
  type BoardingCell,
  type BoardingShipZone,
  type BoardingSpawns,
  type BoardingRoom,
  type BoardingTerrain,
} from './BoardingMap.js';
import type { CombatShipType } from '../../../space-battle/models/index.js';
import colonyMap from '../../maps/colony-boarding.txt?raw';
import explorationMap from '../../maps/exploration-boarding.txt?raw';
import salvageMap from '../../maps/salvage-boarding.txt?raw';
import shuttleMap from '../../maps/shuttle-boarding.txt?raw';
import pirateMap from '../../maps/pirate-boarding.txt?raw';
import raptorMap from '../../maps/raptor-boarding.txt?raw';
import transportMap from '../../maps/campaign-transport-boarding.txt?raw';

const INTERIORS: Partial<Record<CombatShipType, string>> = {
  'Transport ship': transportMap,
  'Colony ship': colonyMap,
  'Exploration ship': explorationMap,
  'Salvage ship': salvageMap,
  'Civilian shuttle': shuttleMap,
  'Space pirate': pirateMap,
  Raptor: raptorMap,
};

const key = (cell: BoardingCell): string => `${cell.q},${cell.r}`;
const freezeCell = (q: number, r: number): BoardingCell =>
  Object.freeze({ q, r });

export function boardingInterior(type: CombatShipType): BoardingMap {
  const source = INTERIORS[type];
  return source
    ? parseBoardingMap(source, type)
    : parseBoardingMap(pirateMap, 'Space pirate');
}

function transform(
  map: BoardingMap,
  move: (cell: BoardingCell) => BoardingCell,
  zone: BoardingShipZone,
): {
  lights: BoardingLight[];
  terrain: Map<string, BoardingTerrain>;
  rooms: Map<string, BoardingRoom>;
  features: BoardingMap['features'][number][];
  spawns: BoardingSpawns;
  airlocks: BoardingCell[];
  cockpits: BoardingCell[];
  zones: Map<string, BoardingShipZone>;
} {
  const terrain = new Map<string, BoardingTerrain>();
  const rooms = new Map<string, BoardingRoom>();
  const zones = new Map<string, BoardingShipZone>();
  for (let r = 0; r < map.height; r++) {
    for (let q = 0; q < map.width; q++) {
      const from = freezeCell(q, r);
      const to = move(from);
      const kind = map.terrainAt(from);
      if (!kind) continue;
      terrain.set(key(to), kind);
      zones.set(key(to), zone);
      const room = map.roomAt(from);
      if (room) rooms.set(key(to), room);
    }
  }
  const features = map.features.map((feature) =>
    Object.freeze({
      ...feature,
      id: `${zone}-${feature.id}`,
      position: move(feature.position),
    }),
  );
  const relocate = (cells: readonly BoardingCell[]) =>
    cells.map((cell) => move(cell));
  return {
    lights: map.lights.map((light) => ({
      ...light,
      position: move(light.position),
    })),
    terrain,
    rooms,
    features,
    spawns: {
      player: relocate(map.spawns.player),
      defender: relocate(map.spawns.defender),
      civilian: relocate(map.spawns.civilian),
    },
    airlocks: relocate(map.airlocks),
    cockpits: relocate(map.cockpits),
    zones,
  };
}

export interface ComposedBoarding {
  readonly map: BoardingMap;
  readonly attackerAirlock: readonly BoardingCell[];
  readonly defenderAirlock: readonly BoardingCell[];
  readonly attackerCockpit: readonly BoardingCell[];
  readonly defenderCockpit: readonly BoardingCell[];
  readonly defenderSpawns: readonly BoardingCell[];
  readonly defenderCivilians: readonly BoardingCell[];
}

const CARDINALS: readonly BoardingCell[] = [
  freezeCell(1, 0),
  freezeCell(-1, 0),
  freezeCell(0, 1),
  freezeCell(0, -1),
];

const blockedSpawn = (map: BoardingMap, cell: BoardingCell): boolean => {
  if (map.terrainAt(cell) !== 'floor') return true;
  return map.features.some(
    (feature) =>
      feature.position.q === cell.q &&
      feature.position.r === cell.r &&
      (feature.kind === 'wall' ||
        feature.kind === 'hull' ||
        feature.kind === 'thin-wall' ||
        feature.kind === 'window' ||
        feature.kind === 'reactor' ||
        feature.kind === 'cover' ||
        feature.kind === 'door'),
  );
};

/** unika-startpositioner-vid-bordning: one person per floor tile, expanding from the seeds. */
export function spreadBoardingSpawns(
  map: BoardingMap,
  seeds: readonly BoardingCell[],
  count: number,
  taken: Set<string>,
): BoardingCell[] {
  if (count < 1 || seeds.length === 0) return [];
  const home = map.zoneAt(seeds[0]!);
  const placed: BoardingCell[] = [];
  const queue: BoardingCell[] = [...seeds];
  const seen = new Set(seeds.map(key));
  while (placed.length < count && queue.length > 0) {
    const cell = queue.shift()!;
    const cellKey = key(cell);
    if (
      !taken.has(cellKey) &&
      (home === null || map.zoneAt(cell) === home) &&
      !blockedSpawn(map, cell)
    ) {
      placed.push(cell);
      taken.add(cellKey);
    }
    for (const step of CARDINALS) {
      const next = freezeCell(cell.q + step.q, cell.r + step.r);
      const nextKey = key(next);
      if (seen.has(nextKey) || map.terrainAt(next) === null) continue;
      seen.add(nextKey);
      queue.push(next);
    }
  }
  while (placed.length < count)
    placed.push(seeds[placed.length % seeds.length]!);
  return placed;
}

/** tva-skepp-pa-bordningskartan: attacker on the left, defender on the right, bridge between. */
export function composeBoardingMaps(
  attackerType: CombatShipType,
  defenderType: CombatShipType,
): ComposedBoarding {
  const attacker = boardingInterior(attackerType);
  const defender = boardingInterior(defenderType);
  const gap = 3;
  const attackerAir =
    attacker.airlocks[0] ??
    freezeCell(attacker.width - 2, Math.floor(attacker.height / 2));
  const defenderAir =
    defender.airlocks[0] ??
    freezeCell(defender.width - 2, Math.floor(defender.height / 2));
  const attackerOffsetR = Math.max(0, defenderAir.r - attackerAir.r);
  const defenderOffsetR = Math.max(0, attackerAir.r - defenderAir.r);
  const width = attacker.width + gap + defender.width;
  const height = Math.max(
    attackerOffsetR + attacker.height,
    defenderOffsetR + defender.height,
  );
  const offsetAttacker = (cell: BoardingCell): BoardingCell =>
    freezeCell(cell.q, cell.r + attackerOffsetR);
  const offsetDefender = (cell: BoardingCell): BoardingCell =>
    freezeCell(
      attacker.width + gap + (defender.width - 1 - cell.q),
      cell.r + defenderOffsetR,
    );
  const left = transform(attacker, offsetAttacker, 'attacker');
  const right = transform(defender, offsetDefender, 'defender');
  const terrain = new Map([...left.terrain, ...right.terrain]);
  const rooms = new Map([...left.rooms, ...right.rooms]);
  const zones = new Map([...left.zones, ...right.zones]);
  const airLeft =
    left.airlocks[0] ??
    freezeCell(attacker.width - 2, attackerOffsetR + attackerAir.r);
  const airRight =
    right.airlocks[0] ??
    freezeCell(attacker.width + gap + 1, defenderOffsetR + defenderAir.r);
  const bridgeR = airLeft.r;
  const lo = Math.min(airLeft.q, airRight.q);
  const hi = Math.max(airLeft.q, airRight.q);
  for (let q = lo + 1; q < hi; q++) {
    const cell = freezeCell(q, bridgeR);
    terrain.set(key(cell), 'floor');
    zones.set(key(cell), 'bridge');
    if (q === lo + 1 || q === hi - 1) continue;
    for (const side of [-1, 1]) {
      const hull = freezeCell(q, bridgeR + side);
      if (!terrain.has(key(hull))) {
        terrain.set(key(hull), 'hull');
        zones.set(key(hull), 'bridge');
      }
    }
  }
  const features = [...left.features, ...right.features].filter((feature) => {
    if (
      feature.kind !== 'hull' &&
      feature.kind !== 'wall' &&
      feature.kind !== 'thin-wall' &&
      feature.kind !== 'window'
    )
      return true;
    return terrain.get(key(feature.position)) !== 'floor';
  });
  for (const [cellKey, kind] of terrain) {
    if (kind !== 'hull') continue;
    if (
      features.some(
        (feature) =>
          key(feature.position) === cellKey &&
          (feature.kind === 'hull' || feature.kind === 'wall'),
      )
    )
      continue;
    const [q, r] = cellKey.split(',').map(Number);
    features.push(
      Object.freeze({
        id: `bridge-hull-${q}-${r}`,
        kind: 'hull' as const,
        position: freezeCell(q!, r!),
      }),
    );
  }
  const map = new BoardingMap(
    `${attacker.name} / ${defender.name}`,
    width,
    height,
    terrain,
    rooms,
    features,
    {
      player: [],
      defender: right.spawns.defender,
      civilian: right.spawns.civilian,
    },
    [...left.airlocks, ...right.airlocks],
    [...left.cockpits, ...right.cockpits],
    true,
    zones,
    [
      ...left.lights,
      ...right.lights,
      boardingCeilingLight(freezeCell(Math.round((lo + hi) / 2), bridgeR)),
    ],
    // skeppsbild-under-bordning: each picture follows its ship's cells.
    [
      ...attacker.pictures.map((picture) => ({
        ...picture,
        y: picture.y + attackerOffsetR,
      })),
      ...defender.pictures.map((picture) => ({
        ...picture,
        x: width - picture.x - picture.scale,
        y: picture.y + defenderOffsetR,
        mirrored: !picture.mirrored,
      })),
    ],
  );
  return {
    map,
    attackerAirlock: left.airlocks,
    defenderAirlock: right.airlocks,
    attackerCockpit: left.cockpits,
    defenderCockpit: right.cockpits,
    defenderSpawns: right.spawns.defender,
    defenderCivilians: right.spawns.civilian,
  };
}

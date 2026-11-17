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

/** valbart-skepp-i-testbordning: every ship type with its own interior. */
export const BOARDING_INTERIOR_TYPES: readonly CombatShipType[] = Object.freeze(
  Object.keys(INTERIORS) as CombatShipType[],
);

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
  readonly gangwayLength: number;
  readonly gangway: readonly BoardingCell[];
  /** bordare-vid-malskeppets-ande: both lanes, nearest the boarded airlock first. */
  readonly boardingFront: readonly BoardingCell[];
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

/** fast-airlock-i-bordningskarta: the first airlock with open space straight outside. */
function dockingAirlock(map: BoardingMap): {
  readonly cell: BoardingCell;
  readonly side: 'top' | 'bottom';
} {
  const open = (q: number, from: number, to: number) => {
    for (let r = from; r < to; r++)
      if (map.terrainAt(freezeCell(q, r)) !== null) return false;
    return true;
  };
  for (const cell of map.airlocks) {
    if (open(cell.q, 0, cell.r)) return { cell, side: 'top' };
    if (open(cell.q, cell.r + 1, map.height)) return { cell, side: 'bottom' };
  }
  // An unedited map without a valid airlock docks at the middle of its bottom.
  return {
    cell: freezeCell(Math.floor(map.width / 2), map.height - 1),
    side: 'bottom',
  };
}

/** The rows a ship uses in each column, for keeping two ships apart. */
function columnExtent(
  map: BoardingMap,
  move: (cell: BoardingCell) => BoardingCell,
): Map<number, { top: number; bottom: number }> {
  const extent = new Map<number, { top: number; bottom: number }>();
  for (let r = 0; r < map.height; r++)
    for (let q = 0; q < map.width; q++) {
      const from = freezeCell(q, r);
      if (map.terrainAt(from) === null) continue;
      const to = move(from);
      const seen = extent.get(to.q);
      extent.set(to.q, {
        top: Math.min(seen?.top ?? Infinity, to.r),
        bottom: Math.max(seen?.bottom ?? -Infinity, to.r),
      });
    }
  return extent;
}

/** dockning-sida-vid-sida: long enough to fight over the crossing. */
export const GANGWAY_LENGTH = 10;

/**
 * dockning-sida-vid-sida: the attacker lies above with its airlock facing
 * down, the defender below with its airlock facing up, and a straight
 * gangway joins the two airlocks. A ship whose airlock faces the other way is
 * flipped top to bottom, which swaps port and starboard.
 */
export function composeBoardingInteriors(
  attacker: BoardingMap,
  defender: BoardingMap,
  gangwayLength = GANGWAY_LENGTH,
): ComposedBoarding {
  const attackerDock = dockingAirlock(attacker);
  const defenderDock = dockingAirlock(defender);
  const flipAttacker = attackerDock.side === 'top';
  const flipDefender = defenderDock.side === 'bottom';
  const attackerQ = Math.max(0, defenderDock.cell.q - attackerDock.cell.q);
  const defenderQ = Math.max(0, attackerDock.cell.q - defenderDock.cell.q);
  const placeAttacker = (cell: BoardingCell): BoardingCell =>
    freezeCell(
      cell.q + attackerQ,
      flipAttacker ? attacker.height - 1 - cell.r : cell.r,
    );
  const defenderLocal = (cell: BoardingCell): BoardingCell =>
    freezeCell(
      cell.q + defenderQ,
      flipDefender ? defender.height - 1 - cell.r : cell.r,
    );
  const attackerAir = placeAttacker(attackerDock.cell);
  const defenderAirLocal = defenderLocal(defenderDock.cell);
  const above = columnExtent(attacker, placeAttacker);
  const below = columnExtent(defender, defenderLocal);
  let defenderR = attackerAir.r + 1 + gangwayLength - defenderAirLocal.r;
  for (const [q, extent] of above) {
    const lower = below.get(q);
    if (lower) defenderR = Math.max(defenderR, extent.bottom - lower.top + 1);
  }
  defenderR = Math.max(0, defenderR);
  const placeDefender = (cell: BoardingCell): BoardingCell => {
    const local = defenderLocal(cell);
    return freezeCell(local.q, local.r + defenderR);
  };
  const defenderAir = placeDefender(defenderDock.cell);
  let width = Math.max(attackerQ + attacker.width, defenderQ + defender.width);
  const height = Math.max(attacker.height, defenderR + defender.height);
  const top = transform(attacker, placeAttacker, 'attacker');
  const bottom = transform(defender, placeDefender, 'defender');
  const terrain = new Map([...top.terrain, ...bottom.terrain]);
  const rooms = new Map([...top.rooms, ...bottom.rooms]);
  const zones = new Map([...top.zones, ...bottom.zones]);
  // dockning-sida-vid-sida: the gangway is two tiles wide, beside the
  // airlock column on whichever side is free all the way across.
  const gangwayQ = attackerAir.q;
  const firstRow = attackerAir.r + 1;
  const lastRow = defenderAir.r - 1;
  const freeColumn = (q: number) => {
    for (let r = firstRow; r <= lastRow; r++)
      if (terrain.has(key(freezeCell(q, r)))) return false;
    return true;
  };
  const besideQ = freeColumn(gangwayQ + 1)
    ? gangwayQ + 1
    : freeColumn(gangwayQ - 1)
      ? gangwayQ - 1
      : null;
  const lanes = besideQ === null ? [gangwayQ] : [gangwayQ, besideQ];
  const leftQ = Math.min(...lanes) - 1;
  const rightQ = Math.max(...lanes) + 1;
  const gangway: BoardingCell[] = [];
  const gangwayWalls: BoardingCell[] = [];
  for (let r = firstRow; r <= lastRow; r++) {
    for (const q of lanes) {
      const cell = freezeCell(q, r);
      if (q === gangwayQ) gangway.push(cell);
      terrain.set(key(cell), 'floor');
      zones.set(key(cell), 'bridge');
    }
    for (const q of [leftQ, rightQ]) {
      const wall = freezeCell(q, r);
      if (q < 0 || terrain.has(key(wall))) continue;
      width = Math.max(width, q + 1);
      terrain.set(key(wall), 'thin-wall');
      zones.set(key(wall), 'bridge');
      gangwayWalls.push(wall);
    }
  }
  // The airlocks themselves are open floor between ship and gangway.
  for (const cell of [attackerAir, defenderAir])
    terrain.set(key(cell), 'floor');
  const features = [...top.features, ...bottom.features].filter((feature) => {
    if (
      feature.kind !== 'hull' &&
      feature.kind !== 'wall' &&
      feature.kind !== 'thin-wall' &&
      feature.kind !== 'window'
    )
      return true;
    return terrain.get(key(feature.position)) !== 'floor';
  });
  // dockning-sida-vid-sida: thin walls along the gangway's sides.
  for (const wall of gangwayWalls)
    features.push(
      Object.freeze({
        id: `gangway-wall-${wall.q}-${wall.r}`,
        kind: 'thin-wall' as const,
        position: wall,
        axis: 'q' as const,
        low: false,
      }),
    );
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
  const boardingFront: BoardingCell[] = [];
  for (let r = lastRow; r >= firstRow; r--)
    for (const q of lanes) boardingFront.push(freezeCell(q, r));
  const middle = gangway[Math.floor(gangway.length / 2)];
  const map = new BoardingMap(
    `${attacker.name} / ${defender.name}`,
    width,
    height,
    terrain,
    rooms,
    features,
    {
      player: [],
      defender: bottom.spawns.defender,
      civilian: bottom.spawns.civilian,
    },
    [attackerAir, defenderAir],
    [...top.cockpits, ...bottom.cockpits],
    true,
    zones,
    [
      ...top.lights,
      ...bottom.lights,
      ...(middle ? [boardingCeilingLight(middle)] : []),
    ],
    // skeppsbild-under-bordning: each picture follows its ship's cells.
    [
      ...attacker.pictures.map((picture) => ({
        ...picture,
        x: picture.x + attackerQ,
        flipAboutY: flipAttacker ? attacker.height / 2 : null,
      })),
      ...defender.pictures.map((picture) => ({
        ...picture,
        x: picture.x + defenderQ,
        y: picture.y + defenderR,
        flipAboutY: flipDefender ? defenderR + defender.height / 2 : null,
      })),
    ],
  );
  return {
    map,
    gangwayLength,
    gangway,
    boardingFront,
    attackerAirlock: [attackerAir],
    defenderAirlock: [defenderAir],
    attackerCockpit: top.cockpits,
    defenderCockpit: bottom.cockpits,
    defenderSpawns: bottom.spawns.defender,
    defenderCivilians: bottom.spawns.civilian,
  };
}

/** tva-skepp-pa-bordningskartan: two ship types joined for a campaign boarding. */
export function composeBoardingMaps(
  attackerType: CombatShipType,
  defenderType: CombatShipType,
  gangwayLength = GANGWAY_LENGTH,
): ComposedBoarding {
  return composeBoardingInteriors(
    boardingInterior(attackerType),
    boardingInterior(defenderType),
    gangwayLength,
  );
}

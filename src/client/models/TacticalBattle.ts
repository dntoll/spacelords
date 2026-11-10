import type { ShipType } from './Game.js';
import { dockIssue as dockingIssue } from './Docking.js';
import { HexCoordinate, HexGeometry } from './HexCoordinate.js';
import {
  hullLossOutcome,
  maneuverPath,
  maneuverPoints,
  type ManeuverStep,
} from './battle/Maneuver.js';
import { ShipFootprint } from './battle/ShipFootprint.js';

export type BattleSide = 'player' | 'enemy';
export type CombatShipType = ShipType | 'Space pirate';
export type WeaponName =
  'Cannon' | 'Missiles' | 'Raider cannon' | 'Light cannon';
export interface BattleHex {
  readonly q: number;
  readonly r: number;
}
export interface ShipProfile {
  readonly size: number;
  readonly hull: number;
  readonly movement: number;
}

export const SHIP_PROFILES: Readonly<Record<CombatShipType, ShipProfile>> =
  Object.freeze({
    Fighter: { size: 1, hull: 3, movement: 4 },
    'Space pirate': { size: 1, hull: 2, movement: 4 },
    'Civilian shuttle': { size: 1, hull: 3, movement: 3 },
    'Exploration ship': { size: 2, hull: 4, movement: 3 },
    'Salvage ship': { size: 2, hull: 5, movement: 3 },
    'Transport ship': { size: 3, hull: 6, movement: 2 },
    'Colony ship': { size: 3, hull: 8, movement: 2 },
    Raptor: { size: 1, hull: 3, movement: 3 },
  });
export const WEAPONS = Object.freeze({
  Cannon: { min: 1, max: 3, arc: 120, dice: 2, threshold: 4, area: 0 },
  Missiles: { min: 2, max: 6, arc: 60, dice: 3, threshold: 4, area: 1 },
  'Raider cannon': { min: 1, max: 3, arc: 120, dice: 2, threshold: 5, area: 0 },
  'Light cannon': { min: 1, max: 3, arc: 120, dice: 1, threshold: 4, area: 0 },
});

export interface BattleFleet {
  readonly id: string;
  readonly side: BattleSide;
  readonly retreat: BattleHex | null;
  readonly ships: readonly {
    readonly id: string;
    readonly type: CombatShipType;
    readonly ion: boolean;
    readonly towing?: boolean;
    readonly missiles?: number;
    readonly armored?: boolean;
  }[];
}
export interface BattlePiece {
  readonly id: string;
  readonly fleetId: string;
  readonly side: BattleSide;
  readonly type: CombatShipType;
  readonly movement: number;
  readonly hull: number;
  readonly missiles: number;
  readonly hasMissiles?: boolean;
  readonly armored?: boolean;
  readonly position: BattleHex | null;
  readonly facing: number;
  readonly speed?: number;
  readonly activated: boolean;
  readonly overwatch?: WeaponName;
  readonly firedRound?: number;
  readonly status: 'active' | 'destroyed' | 'escaped' | 'wreck';
  readonly dockedWith?: string;
  readonly escapeEdge?: 'top' | 'bottom';
}
export function combatDesignName(
  piece: Pick<BattlePiece, 'type' | 'armored'>,
): string {
  if (piece.armored && piece.type === 'Fighter') return 'Armored Fighter';
  if (piece.armored && piece.type === 'Transport ship')
    return 'Armored Transport';
  return piece.type;
}
export function maxHull(piece: Pick<BattlePiece, 'type' | 'armored'>): number {
  const base = SHIP_PROFILES[piece.type].hull;
  if (!piece.armored) return base;
  if (piece.type === 'Fighter') return base + 2;
  if (piece.type === 'Transport ship') return base + 3;
  return base;
}
export function missileArea(at: BattleHex): BattleHex[] {
  return [
    { q: at.q, r: at.r },
    ...new HexCoordinate(at.q, at.r)
      .neighbors()
      .map((point) => ({ q: point.q, r: point.r })),
  ];
}
export function battleCamera(
  map: { readonly width: number; readonly height: number },
  view: { readonly width: number; readonly height: number },
): { readonly scale: number; readonly offset: { x: number; y: number } } {
  const width = (map.width + 0.5) * Math.sqrt(3) * HexGeometry.size;
  const height =
    (map.height - 1) * 1.5 * HexGeometry.size + HexGeometry.size * 2;
  const scale = Math.min(
    (view.width - 24) / width,
    (view.height - 24) / height,
  );
  return {
    scale,
    offset: {
      x:
        (view.width -
          (map.width - 0.5) * Math.sqrt(3) * HexGeometry.size * scale) /
        2,
      y: (view.height - (map.height - 1) * 1.5 * HexGeometry.size * scale) / 2,
    },
  };
}
export function battleHexPoint(
  map: { readonly width: number; readonly height: number },
  view: { readonly width: number; readonly height: number },
  at: BattleHex,
): { x: number; y: number } {
  const camera = battleCamera(map, view);
  const center = HexGeometry.toPoint(new HexCoordinate(at.q, at.r));
  return {
    x: camera.offset.x + center.x * camera.scale,
    y: camera.offset.y + center.y * camera.scale,
  };
}
export function battlePieceLabel(
  piece: BattlePiece,
  pieces: readonly BattlePiece[],
): string {
  const name = combatDesignName(piece);
  const index = pieces
    .filter((p) => p.side === piece.side && combatDesignName(p) === name)
    .findIndex((p) => p.id === piece.id);
  return `${name} ${index + 1}`;
}
export interface BattleActivation {
  readonly id: string;
  readonly remaining: number;
  readonly moved: boolean;
  readonly fired: boolean;
  readonly movementClosed: boolean;
}
export interface BattleState {
  readonly largeShipFootprints?: boolean;
  readonly escapeZones?: boolean;
  /** manoverpoang-och-hastighet: absent on battles saved before maneuver points. */
  readonly maneuverSystem?: boolean;
  readonly lastShot?: BattleShot;
  readonly lastManeuver?: BattleManeuver;
  readonly id: string;
  readonly position: BattleHex;
  readonly width: number;
  readonly height: number;
  readonly deploymentDepth: number;
  readonly asteroids: readonly BattleHex[];
  readonly fleets: readonly {
    readonly id: string;
    readonly side: BattleSide;
    readonly retreat: BattleHex | null;
  }[];
  readonly pieces: readonly BattlePiece[];
  readonly phase: 'deployment' | 'fighting' | 'complete';
  readonly round: number;
  readonly turn: BattleSide;
  readonly activation: BattleActivation | null;
  readonly random: number;
  readonly log: readonly string[];
  readonly pendingBoarding?: {
    readonly attackerId: string;
    readonly defenderId: string;
  };
  readonly boardingReady?: boolean;
  readonly shift?: {
    readonly kind: 'boarding' | 'space';
    readonly remaining: number;
  };
}
/** manoverpoang-och-hastighet: one plotted maneuver, animated hex by hex. */
export interface BattleManeuver {
  readonly id: string;
  readonly shipId: string;
  readonly from: ManeuverStep;
  readonly steps: readonly ManeuverStep[];
  readonly reactions?: readonly {
    readonly step: number;
    readonly shot: BattleShot;
  }[];
}
export interface ManeuverPreview {
  readonly speed: number;
  readonly facing: number;
  readonly position: BattleHex | null;
  readonly steps: readonly ManeuverStep[];
  readonly traveled: readonly ManeuverStep[];
  readonly issue: string | null;
  readonly escaped: boolean;
  readonly collisions: readonly (
    | { readonly kind: 'ship'; readonly id: string; readonly at: BattleHex }
    | { readonly kind: 'asteroid'; readonly at: BattleHex }
  )[];
}
export interface ManeuverOption {
  readonly speed: -1 | 0 | 1;
  readonly direction: -1 | 0 | 1;
  readonly preview: ManeuverPreview;
}
/** animerade-stridsskott / skadepartiklar-i-strid: facts, independent of rendering and particles. */
export interface BattleShot {
  readonly id: string;
  readonly weapon: WeaponName;
  readonly from: BattleHex;
  readonly at: BattleHex;
  readonly impacts: readonly {
    readonly id: string;
    readonly position: BattleHex;
    readonly damage: number;
    readonly previousHull: number;
    readonly destroyed: boolean;
  }[];
}
export type BattleCommand =
  | { readonly type: 'auto-deploy' | 'start' | 'forward' | 'end-activation' }
  | { readonly type: 'dock'; readonly targetId: string }
  | {
      readonly type: 'place';
      readonly id: string;
      readonly position: BattleHex;
      readonly facing: number;
    }
  | { readonly type: 'activate'; readonly id: string }
  | { readonly type: 'turn'; readonly direction: -1 | 1 }
  | { readonly type: 'overwatch'; readonly weapon: WeaponName }
  | {
      readonly type: 'maneuver';
      readonly speed: -1 | 0 | 1;
      readonly direction: -1 | 0 | 1;
    }
  | {
      readonly type: 'fire';
      readonly at: BattleHex;
      readonly weapon: WeaponName;
    };
export interface ShotPreview {
  readonly reason: string | null;
  readonly dice: number;
  readonly threshold: number;
  readonly rear: boolean;
}
export interface ImpactHit {
  readonly id: string;
  readonly dice: number;
  readonly threshold: number;
  readonly rear: boolean;
  readonly wreck?: boolean;
}
export interface ImpactPreview {
  readonly reason: string | null;
  readonly hits: readonly ImpactHit[];
  readonly asteroids?: readonly BattleHex[];
}
type Mutable<T> = { -readonly [K in keyof T]: T[K] };
type Piece = Mutable<BattlePiece>;
type Activation = Mutable<BattleActivation>;

const hex = (p: BattleHex) => new HexCoordinate(p.q, p.r);
const same = (a: BattleHex | null, b: BattleHex) =>
  !!a && a.q === b.q && a.r === b.r;
const column = (p: BattleHex) => p.q + Math.floor(p.r / 2);
export const battleHex = (col: number, row: number): BattleHex => ({
  q: col - Math.floor(row / 2),
  r: row,
});
export function battleEscapeHexes(
  map: Pick<BattleState, 'width' | 'height' | 'escapeZones'>,
): readonly BattleHex[] {
  if (map.escapeZones !== true) return Object.freeze([]);
  const center = Math.floor(map.width / 2);
  return Object.freeze(
    [0, map.height - 1].flatMap((row) =>
      [center - 1, center, center + 1].map((col) => battleHex(col, row)),
    ),
  );
}
export const battleWeapons = (
  type: CombatShipType,
  hasMissiles = type === 'Fighter',
): readonly WeaponName[] =>
  type === 'Fighter'
    ? hasMissiles
      ? ['Cannon', 'Missiles']
      : ['Cannon']
    : type === 'Space pirate'
      ? ['Raider cannon']
      : type === 'Raptor'
        ? ['Light cannon']
        : [];
const opposite = (side: BattleSide): BattleSide =>
  side === 'player' ? 'enemy' : 'player';

function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

/** Direction is measured in screen space, independently of the rendering library. */
function inArc(
  origin: BattleHex,
  target: BattleHex,
  facing: number,
  degrees: number,
): boolean {
  const a = HexGeometry.toPoint(hex(origin));
  const b = HexGeometry.toPoint(hex(target));
  const neighbor = HexGeometry.toPoint(hex(origin).neighbors()[facing]!);
  const x = b.x - a.x,
    y = b.y - a.y;
  const dx = neighbor.x - a.x,
    dy = neighbor.y - a.y;
  return (
    (x * dx + y * dy) / (Math.hypot(x, y) * Math.hypot(dx, dy)) >=
    Math.cos((degrees * Math.PI) / 360) - 1e-9
  );
}

/** skyddande-stridshinder: intersect the closed polygon, including exact edge touches. */
function crossesHex(
  from: BattleHex,
  to: BattleHex,
  obstacle: BattleHex,
): boolean {
  const a = HexGeometry.toPoint(hex(from));
  const b = HexGeometry.toPoint(hex(to));
  const c = HexGeometry.toPoint(hex(obstacle));
  let enter = 0,
    leave = 1;
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const nx = Math.cos(angle),
      ny = Math.sin(angle);
    const limit = (Math.sqrt(3) * HexGeometry.size) / 2;
    const offset = (a.x - c.x) * nx + (a.y - c.y) * ny;
    const delta = (b.x - a.x) * nx + (b.y - a.y) * ny;
    if (Math.abs(delta) < 1e-9) {
      if (offset > limit + 1e-9) return false;
    } else if (delta > 0) leave = Math.min(leave, (limit - offset) / delta);
    else enter = Math.max(enter, (limit - offset) / delta);
    if (enter > leave + 1e-9) return false;
  }
  return leave >= 0 && enter <= 1;
}

export class TacticalBattle {
  readonly #base: Pick<
    BattleState,
    | 'id'
    | 'position'
    | 'width'
    | 'height'
    | 'deploymentDepth'
    | 'fleets'
    | 'largeShipFootprints'
    | 'escapeZones'
    | 'maneuverSystem'
  >;
  readonly #asteroids: BattleHex[];
  readonly #pieces: Piece[];
  readonly #log: string[];
  #phase: BattleState['phase'];
  #round: number;
  #turn: BattleSide;
  #activation: Activation | null;
  #random: number;
  #lastShot: BattleShot | undefined;
  #lastManeuver: BattleManeuver | undefined;
  #forceWreckTargets = false;
  #pendingBoarding: BattleState['pendingBoarding'];
  #boardingReady = false;
  #shift: BattleState['shift'];

  private constructor(state: BattleState) {
    const copy = structuredClone(state);
    this.#base = {
      id: copy.id,
      position: copy.position,
      width: copy.width,
      height: copy.height,
      deploymentDepth: copy.deploymentDepth,
      fleets: copy.fleets,
      ...(copy.largeShipFootprints !== undefined
        ? { largeShipFootprints: copy.largeShipFootprints }
        : {}),
      ...(copy.escapeZones !== undefined
        ? { escapeZones: copy.escapeZones }
        : {}),
      ...(copy.maneuverSystem !== undefined
        ? { maneuverSystem: copy.maneuverSystem }
        : {}),
    };
    this.#asteroids = [...copy.asteroids];
    this.#pieces = copy.pieces.map((p) => ({ ...p }));
    this.#log = [...copy.log];
    this.#phase = copy.phase;
    this.#round = copy.round;
    this.#turn = copy.turn;
    this.#activation = copy.activation ? { ...copy.activation } : null;
    this.#random = copy.random;
    this.#lastShot = copy.lastShot;
    this.#lastManeuver = copy.lastManeuver;
    this.#pendingBoarding = copy.pendingBoarding;
    this.#boardingReady = copy.boardingReady === true;
    this.#shift = copy.shift;
  }

  static create(
    id: string,
    position: BattleHex,
    fleets: readonly BattleFleet[],
    seed: number,
  ): TacticalBattle {
    const largest = Math.max(
      ...(['player', 'enemy'] as const).map((side) =>
        fleets
          .filter((f) => f.side === side)
          .reduce((n, f) => n + f.ships.length, 0),
      ),
    );
    const height = Math.max(9, Math.ceil(Math.sqrt(largest * 2)));
    const berthWidth = Math.max(
      1,
      ...fleets.flatMap((fleet) =>
        fleet.ships.map((ship) => ShipFootprint.length(ship.type, true)),
      ),
    );
    const deploymentDepth = Math.max(
      2,
      berthWidth * Math.ceil(largest / height),
    );
    const width = Math.max(13, deploymentDepth * 2 + 9);
    const result = new TacticalBattle({
      id,
      position,
      width,
      height,
      deploymentDepth,
      largeShipFootprints: true,
      escapeZones: true,
      maneuverSystem: true,
      fleets: fleets.map(({ id, side, retreat }) => ({ id, side, retreat })),
      pieces: fleets.flatMap((f) =>
        f.ships.map((ship) => {
          const armored =
            ship.armored === true &&
            (ship.type === 'Fighter' || ship.type === 'Transport ship');
          const missiles = ship.type === 'Fighter' ? (ship.missiles ?? 2) : 0;
          return {
            id: ship.id,
            fleetId: f.id,
            side: f.side,
            type: ship.type,
            movement:
              (ship.towing ? 1 : SHIP_PROFILES[ship.type].movement) +
              Number(ship.ion),
            hull: maxHull({ type: ship.type, armored }),
            missiles,
            hasMissiles: missiles > 0,
            armored,
            position: null,
            facing: f.side === 'player' ? 0 : 3,
            speed: 0,
            activated: false,
            status: 'active' as const,
          };
        }),
      ),
      asteroids: [],
      phase: 'deployment',
      round: 0,
      turn: 'player',
      activation: null,
      random: seed >>> 0 || 1,
      log: [
        'Deploy your fleet. Transport ships and Colony ships occupy three hexes.',
      ],
    });
    const candidates = result
      .cells()
      .filter(
        (p) =>
          column(p) >= deploymentDepth && column(p) < width - deploymentDepth,
      )
      .filter(
        (p) => !battleEscapeHexes(result.#base).some((zone) => same(zone, p)),
      );
    const count = Math.floor(candidates.length * 0.12);
    for (
      let attempts = 0;
      result.#asteroids.length < count && attempts < candidates.length * 4;
      attempts++
    ) {
      const center =
        candidates[Math.floor(result.#next() * candidates.length)]!;
      for (const point of [center, ...hex(center).neighbors().slice(0, 2)]) {
        if (
          result.#asteroids.length >= count ||
          !result.contains(point) ||
          battleEscapeHexes(result.#base).some((zone) => same(zone, point)) ||
          column(point) < deploymentDepth ||
          column(point) >= width - deploymentDepth ||
          result.#asteroids.some((p) => same(p, point))
        )
          continue;
        result.#asteroids.push(point);
        if (!result.#connected()) result.#asteroids.pop();
      }
    }
    result.#deploy('enemy');
    return result;
  }

  static restore(state: BattleState): TacticalBattle {
    if (
      !state ||
      !state.id ||
      (state.largeShipFootprints !== undefined &&
        typeof state.largeShipFootprints !== 'boolean') ||
      (state.escapeZones !== undefined &&
        typeof state.escapeZones !== 'boolean') ||
      (state.maneuverSystem !== undefined &&
        typeof state.maneuverSystem !== 'boolean') ||
      !Number.isSafeInteger(state.width) ||
      state.width < 13 ||
      !Number.isSafeInteger(state.height) ||
      state.height < 9 ||
      !Number.isSafeInteger(state.deploymentDepth) ||
      state.deploymentDepth < 2 ||
      state.deploymentDepth * 2 >= state.width ||
      !Array.isArray(state.pieces) ||
      !Array.isArray(state.fleets) ||
      !Array.isArray(state.asteroids) ||
      !Array.isArray(state.log) ||
      state.log.some((line) => typeof line !== 'string') ||
      !['deployment', 'fighting', 'complete'].includes(state.phase) ||
      !['player', 'enemy'].includes(state.turn) ||
      !Number.isSafeInteger(state.round) ||
      state.round < 0 ||
      !Number.isSafeInteger(state.random) ||
      state.random < 1 ||
      state.random > 0xffffffff
    )
      throw new Error('Invalid saved tactical battle.');
    const result = new TacticalBattle(state);
    const ids = new Set<string>(),
      occupied = new Set<string>();
    for (const p of result.#asteroids) {
      if (
        !Number.isSafeInteger(p.q) ||
        !Number.isSafeInteger(p.r) ||
        !result.contains(p) ||
        occupied.has(hex(p).key)
      )
        throw new Error('Invalid saved asteroid.');
      occupied.add(hex(p).key);
    }
    for (const p of result.#pieces) {
      const profile = SHIP_PROFILES[p.type];
      const armored =
        p.armored === true &&
        (p.type === 'Fighter' || p.type === 'Transport ship');
      const launchers = p.hasMissiles ?? p.type === 'Fighter';
      if (
        !p.id ||
        ids.has(p.id) ||
        !profile ||
        !state.fleets.some(
          (f: BattleState['fleets'][number]) =>
            f.id === p.fleetId && f.side === p.side,
        ) ||
        !['active', 'destroyed', 'escaped', 'wreck'].includes(p.status) ||
        (result.#base.maneuverSystem !== true && p.status === 'wreck') ||
        (p.overwatch !== undefined &&
          (!battleWeapons(p.type, p.hasMissiles).includes(p.overwatch) ||
            (p.overwatch === 'Missiles' && p.missiles < 1))) ||
        (p.firedRound !== undefined &&
          (!Number.isSafeInteger(p.firedRound) ||
            p.firedRound < 1 ||
            p.firedRound > state.round)) ||
        (p.armored !== undefined && typeof p.armored !== 'boolean') ||
        (p.armored === true && !armored) ||
        (p.hasMissiles !== undefined && typeof p.hasMissiles !== 'boolean') ||
        (p.escapeEdge !== undefined &&
          !['top', 'bottom'].includes(p.escapeEdge)) ||
        (launchers && p.type !== 'Fighter') ||
        !Number.isSafeInteger(p.hull) ||
        p.hull < 0 ||
        p.hull > maxHull({ type: p.type, armored }) ||
        (result.#base.maneuverSystem === true
          ? p.speed === undefined ||
            !Number.isSafeInteger(p.speed) ||
            p.speed < 0 ||
            p.speed > p.movement ||
            ((p.status === 'active' || p.status === 'escaped') &&
              p.hull <= 0) ||
            (p.status === 'destroyed' && p.hull !== 0)
          : (p.status === 'destroyed') !== (p.hull === 0)) ||
        !Number.isSafeInteger(p.movement) ||
        p.movement < 1 ||
        p.movement > profile.movement + 1 ||
        !Number.isSafeInteger(p.facing) ||
        p.facing < 0 ||
        p.facing > 5 ||
        !Number.isSafeInteger(p.missiles) ||
        p.missiles < 0 ||
        p.missiles > (launchers ? 2 : 0) ||
        typeof p.activated !== 'boolean'
      )
        throw new Error('Invalid saved combat ship.');
      p.armored = armored;
      p.hasMissiles = launchers;
      ids.add(p.id);
      if (p.position) {
        if (
          !Number.isSafeInteger(p.position.q) ||
          !Number.isSafeInteger(p.position.r)
        )
          throw new Error('Invalid saved combat position.');
        if (p.status !== 'active' && !result.contains(p.position))
          throw new Error('Invalid saved combat position.');
        if (p.status === 'active') {
          const cells = result.occupiedHexes(p.id);
          const inside = cells.filter((cell) => result.contains(cell));
          const zones = battleEscapeHexes(result.#base);
          const retreating =
            !!p.escapeEdge &&
            result.#base.escapeZones === true &&
            state.phase === 'fighting' &&
            state.round >= 2 &&
            inside.length > 0 &&
            inside.length < cells.length &&
            cells
              .filter((cell) => !result.contains(cell))
              .every((cell) =>
                p.escapeEdge === 'top'
                  ? cell.r < 0
                  : cell.r >= result.#base.height,
              ) &&
            cells.some((cell) => zones.some((zone) => same(zone, cell))) &&
            (p.escapeEdge === 'top'
              ? p.facing === 1 || p.facing === 2
              : p.facing === 4 || p.facing === 5);
          if (
            (!retreating &&
              (!result.contains(p.position) ||
                inside.length !== cells.length)) ||
            (p.escapeEdge && !retreating)
          )
            throw new Error('Invalid saved combat position.');
          for (const cell of inside) {
            if (occupied.has(hex(cell).key))
              throw new Error(
                'Overlapping or out-of-bounds saved combat ships.',
              );
            occupied.add(hex(cell).key);
          }
        } else if (p.status === 'wreck') {
          const cells = result.occupiedHexes(p.id);
          if (!cells.length || cells.some((cell) => !result.contains(cell)))
            throw new Error('Invalid saved combat position.');
          for (const cell of cells) {
            if (occupied.has(hex(cell).key))
              throw new Error(
                'Overlapping or out-of-bounds saved combat ships.',
              );
            occupied.add(hex(cell).key);
          }
        }
      } else if (
        (p.status === 'active' || p.status === 'wreck') &&
        state.phase !== 'deployment'
      )
        throw new Error('Missing combat position.');
      if (p.escapeEdge && (p.status !== 'active' || !p.position))
        throw new Error('Invalid saved combat retreat.');
    }
    const a = state.activation;
    if (
      a &&
      (state.phase !== 'fighting' ||
        !result.#pieces.some(
          (p) =>
            p.id === a.id &&
            p.side === state.turn &&
            p.status === 'active' &&
            !p.activated &&
            a.remaining <=
              (result.#base.maneuverSystem === true
                ? Math.max(p.movement, maneuverPoints(p.type))
                : p.movement),
        ) ||
        !Number.isSafeInteger(a.remaining) ||
        a.remaining < 0 ||
        [a.moved, a.fired, a.movementClosed].some(
          (value) => typeof value !== 'boolean',
        ) ||
        (a.movementClosed && !a.fired))
    )
      throw new Error('Invalid saved activation.');
    return result;
  }

  get snapshot(): BattleState {
    return freeze(
      structuredClone({
        ...this.#base,
        asteroids: this.#asteroids,
        pieces: this.#pieces,
        phase: this.#phase,
        round: this.#round,
        turn: this.#turn,
        activation: this.#activation,
        random: this.#random,
        log: this.#log,
        ...(this.#lastShot ? { lastShot: this.#lastShot } : {}),
        ...(this.#lastManeuver ? { lastManeuver: this.#lastManeuver } : {}),
        ...(this.#pendingBoarding
          ? { pendingBoarding: this.#pendingBoarding }
          : {}),
        ...(this.#boardingReady ? { boardingReady: true } : {}),
        ...(this.#shift ? { shift: this.#shift } : {}),
      }),
    );
  }
  get visibleSnapshot(): BattleState {
    const state = this.snapshot;
    return this.#phase === 'deployment'
      ? freeze({
          ...state,
          pieces: state.pieces.filter((p) => p.side === 'player'),
        })
      : state;
  }
  cells(): BattleHex[] {
    return Array.from({ length: this.#base.height }, (_, r) =>
      Array.from({ length: this.#base.width }, (_, c) => battleHex(c, r)),
    ).flat();
  }
  contains(p: BattleHex): boolean {
    return (
      p.r >= 0 &&
      p.r < this.#base.height &&
      column(p) >= 0 &&
      column(p) < this.#base.width
    );
  }
  isDeployment(p: BattleHex, side: BattleSide): boolean {
    return (
      this.contains(p) &&
      (side === 'player'
        ? column(p) < this.#base.deploymentDepth
        : column(p) >= this.#base.width - this.#base.deploymentDepth)
    );
  }
  #connected(): boolean {
    const blocked = new Set(this.#asteroids.map((p) => hex(p).key));
    const start = battleHex(0, 0),
      queue = [start],
      seen = new Set([hex(start).key]);
    for (let index = 0; index < queue.length; index++)
      for (const next of hex(queue[index]!).neighbors()) {
        if (
          this.contains(next) &&
          !blocked.has(next.key) &&
          !seen.has(next.key)
        ) {
          seen.add(next.key);
          queue.push(next);
        }
      }
    return seen.size === this.#base.width * this.#base.height - blocked.size;
  }
  #next(): number {
    let value = this.#random;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.#random = value >>> 0;
    return this.#random / 0x100000000;
  }
  #die(): number {
    return Math.floor(this.#next() * 6) + 1;
  }
  #piece(id: string): Piece {
    const piece = this.#pieces.find((p) => p.id === id);
    if (!piece) throw new Error('Choose a combat ship.');
    return piece;
  }
  #occupied(p: BattleHex, ignoreId?: string): boolean {
    return (
      this.#asteroids.some((a) => same(a, p)) ||
      this.#pieces.some(
        (a) =>
          a.id !== ignoreId &&
          (a.status === 'active' || a.status === 'wreck') &&
          ShipFootprint.contains(a, this.#base.largeShipFootprints === true, p),
      )
    );
  }
  occupiedHexes(
    id: string,
    position?: BattleHex,
    facing?: number,
  ): readonly BattleHex[] {
    const piece = this.#piece(id);
    return ShipFootprint.cells(
      piece,
      this.#base.largeShipFootprints === true,
      position ?? piece.position,
      facing ?? piece.facing,
    );
  }
  placementIssue(
    id: string,
    position: BattleHex,
    facing: number,
    deployment = false,
  ): string | null {
    const piece = this.#piece(id);
    const cells = this.occupiedHexes(id, position, facing);
    if (
      cells.some(
        (cell) =>
          !this.contains(cell) ||
          (deployment && !this.isDeployment(cell, piece.side)),
      )
    )
      return deployment
        ? 'The whole ship must fit inside its deployment zone.'
        : 'The whole ship must stay on the battle map.';
    return cells.some((cell) => this.#occupied(cell, id))
      ? 'The ship footprint is occupied.'
      : null;
  }
  turnIssue(
    id: string,
    direction: -1 | 1,
    position?: BattleHex,
    facing?: number,
  ): string | null {
    const piece = this.#piece(id);
    const origin = position ?? piece.position;
    if (!origin) return 'Deploy the ship first.';
    if (piece.escapeEdge && !position)
      return 'This ship is committed to its escape.';
    if (piece.dockedWith && !position)
      return 'This ship is locked in a boarding.';
    return this.placementIssue(
      id,
      origin,
      ((facing ?? piece.facing) + direction + 6) % 6,
    );
  }
  #deploy(side: BattleSide): void {
    const cells = this.cells()
      .filter((p) => this.isDeployment(p, side))
      .sort(
        (a, b) =>
          (side === 'player' ? column(b) - column(a) : column(a) - column(b)) ||
          Math.abs(a.r - this.#base.height / 2) -
            Math.abs(b.r - this.#base.height / 2) ||
          a.r - b.r,
      );
    const ships = this.#pieces
      .filter((piece) => piece.side === side)
      .sort(
        (a, b) =>
          ShipFootprint.length(
            b.type,
            this.#base.largeShipFootprints === true,
          ) -
          ShipFootprint.length(a.type, this.#base.largeShipFootprints === true),
      );
    for (const piece of ships) piece.position = null;
    for (const piece of ships) {
      piece.facing = side === 'player' ? 0 : 3;
      const position = cells.find(
        (cell) => !this.placementIssue(piece.id, cell, piece.facing, true),
      );
      if (!position)
        throw new Error('The deployment zone cannot fit every ship.');
      piece.position = { ...position };
    }
  }
  dockIssue(sourceId: string, targetId: string): string | null {
    const source = this.#piece(sourceId);
    const target = this.#piece(targetId);
    if (source.escapeEdge || target.escapeEdge)
      return 'A retreating ship is committed to its escape.';
    return dockingIssue(
      source,
      target,
      this.occupiedHexes(source.id),
      source.facing,
      this.occupiedHexes(target.id),
      target.facing,
      !!this.#pendingBoarding || this.#pieces.some((piece) => piece.dockedWith),
    );
  }

  dockTargets(sourceId: string): readonly string[] {
    return Object.freeze(
      this.#pieces
        .filter((piece) => this.dockIssue(sourceId, piece.id) === null)
        .map((piece) => piece.id),
    );
  }

  get pendingBoarding(): BattleState['pendingBoarding'] {
    return this.#pendingBoarding;
  }

  get boardingReady(): boolean {
    return this.#boardingReady;
  }

  consumeBoardingReady(): BattleState['pendingBoarding'] {
    if (!this.#boardingReady) return undefined;
    this.#boardingReady = false;
    return this.#pendingBoarding;
  }

  setShift(kind: 'boarding' | 'space', remaining: number): void {
    this.#shift = { kind, remaining };
  }

  clearShift(): void {
    this.#shift = undefined;
  }

  get shift(): BattleState['shift'] {
    return this.#shift;
  }

  tickShiftRound(): 'boarding' | 'space' | null {
    if (!this.#shift) return null;
    this.#shift = {
      kind: this.#shift.kind,
      remaining: this.#shift.remaining - 1,
    };
    if (this.#shift.remaining > 0) return this.#shift.kind;
    const next = this.#shift.kind === 'boarding' ? 'space' : 'boarding';
    this.#shift = { kind: next, remaining: 2 };
    return next;
  }

  unlockDock(pieceId: string): void {
    const piece = this.#pieces.find((entry) => entry.id === pieceId);
    const partnerId = piece?.dockedWith;
    if (piece) delete piece.dockedWith;
    if (partnerId) {
      const partner = this.#pieces.find((entry) => entry.id === partnerId);
      if (partner) delete partner.dockedWith;
    }
    if (
      this.#pendingBoarding?.attackerId === pieceId ||
      this.#pendingBoarding?.defenderId === pieceId
    ) {
      this.#pendingBoarding = undefined;
      this.#boardingReady = false;
      this.#shift = undefined;
    }
  }

  transferPiece(pieceId: string, fleetId: string, side: BattleSide): void {
    const piece = this.#piece(pieceId);
    this.unlockDock(pieceId);
    piece.fleetId = fleetId;
    piece.side = side;
    piece.activated = true;
  }

  #beginRound(): void {
    this.#round++;
    if (this.#pendingBoarding) this.#boardingReady = true;
    for (const p of this.#pieces) p.activated = false;
    let player: number, enemy: number;
    do {
      player = this.#die();
      enemy = this.#die();
      this.#log.push(
        `Initiative, round ${this.#round}: player D6 [${player}], enemy D6 [${enemy}]${player === enemy ? ' — reroll.' : '.'}`,
      );
    } while (player === enemy);
    this.#turn = player > enemy ? 'player' : 'enemy';
  }

  shot(
    sourceId: string,
    targetId: string,
    weapon: WeaponName,
    from?: BattleHex,
    facing?: number,
  ): ShotPreview {
    const target = this.#piece(targetId);
    const at =
      this.aimAt(sourceId, targetId, weapon, from, facing) ?? target.position;
    return this.#shotAt(sourceId, targetId, weapon, at, from, facing);
  }

  /** autoaim-med-manuellt-mal: queries never spend ammunition, movement or randomness. */
  aimAt(
    sourceId: string,
    targetId: string,
    weapon: WeaponName,
    from?: BattleHex,
    facing?: number,
  ): BattleHex | null {
    const source = this.#piece(sourceId);
    const target = this.#piece(targetId);
    const origin = from ?? source.position;
    if (!origin || source.side === target.side || target.status !== 'active')
      return null;
    const cells = [...this.occupiedHexes(targetId)].sort(
      (a, b) =>
        hex(origin).distanceTo(hex(a)) - hex(origin).distanceTo(hex(b)) ||
        this.#aimAngle(origin, a, facing ?? source.facing) -
          this.#aimAngle(origin, b, facing ?? source.facing),
    );
    return (
      cells.find(
        (at) =>
          !this.#shotAt(sourceId, targetId, weapon, at, from, facing).reason,
      ) ?? null
    );
  }

  autoTarget(
    sourceId: string,
    weapon: WeaponName,
    preferredId?: string,
  ): { readonly id: string; readonly at: BattleHex } | null {
    const source = this.#piece(sourceId);
    if (!source.position || source.status !== 'active') return null;
    const targets = this.#pieces
      .filter(
        (piece) => piece.side !== source.side && piece.status === 'active',
      )
      .flatMap((piece) => {
        const at = this.aimAt(sourceId, piece.id, weapon);
        return at ? [{ id: piece.id, at }] : [];
      });
    const preferred = targets.find((target) => target.id === preferredId);
    if (preferred) return freeze(preferred);
    targets.sort(
      (a, b) =>
        hex(source.position!).distanceTo(hex(a.at)) -
          hex(source.position!).distanceTo(hex(b.at)) ||
        this.#aimAngle(source.position!, a.at, source.facing) -
          this.#aimAngle(source.position!, b.at, source.facing) ||
        a.id.localeCompare(b.id),
    );
    return targets[0] ? freeze(targets[0]) : null;
  }

  #aimAngle(origin: BattleHex, at: BattleHex, facing: number): number {
    const a = HexGeometry.toPoint(hex(origin));
    const b = HexGeometry.toPoint(hex(at));
    const forward = HexGeometry.toPoint(hex(origin).neighbors()[facing]!);
    return (
      -((b.x - a.x) * (forward.x - a.x) + (b.y - a.y) * (forward.y - a.y)) /
      Math.hypot(b.x - a.x, b.y - a.y)
    );
  }

  #shotAt(
    sourceId: string,
    targetId: string,
    weapon: WeaponName,
    at: BattleHex | null,
    from?: BattleHex,
    facing?: number,
  ): ShotPreview {
    const source = this.#piece(sourceId),
      target = this.#piece(targetId),
      profile = WEAPONS[weapon];
    const origin = from ?? source.position;
    let reason: string | null = null;
    const rear =
      !!origin &&
      !!target.position &&
      inArc(target.position, origin, (target.facing + 3) % 6, 120);
    if (
      !profile ||
      !battleWeapons(source.type, source.hasMissiles).includes(weapon)
    )
      reason = 'This ship has no such weapon.';
    else if (
      source.status !== 'active' ||
      target.status !== 'active' ||
      source.side === target.side ||
      !origin ||
      !target.position ||
      !at
    )
      reason = 'Choose an active enemy ship.';
    else if (weapon === 'Missiles' && source.missiles === 0)
      reason = 'No missile salvos remain.';
    else {
      const distance = hex(origin).distanceTo(hex(at));
      if (distance < profile.min || distance > profile.max)
        reason = 'Target is outside weapon range.';
      else if (!inArc(origin, at, facing ?? source.facing, profile.arc))
        reason = 'Target is outside the firing arc.';
      else {
        const size = Math.min(
          SHIP_PROFILES[source.type].size,
          SHIP_PROFILES[target.type].size,
        );
        const obstacles = [
          ...this.#asteroids,
          ...this.#pieces
            .filter(
              (p) =>
                p.id !== source.id &&
                p.id !== target.id &&
                p.status === 'active' &&
                p.position &&
                SHIP_PROFILES[p.type].size > size,
            )
            .flatMap((p) => this.occupiedHexes(p.id)),
        ];
        if (obstacles.some((p) => crossesHex(origin, at, p)))
          reason = 'Line of fire is blocked.';
      }
    }
    return Object.freeze({
      reason,
      dice: profile?.dice ?? 0,
      threshold: (profile?.threshold ?? 4) - Number(rear),
      rear,
    });
  }

  /** missilernas-omradeseffekt / traffhex-istallet-for-mallista: aim at a hex. */
  impact(
    sourceId: string,
    at: BattleHex,
    weapon: WeaponName,
    from?: BattleHex,
    facing?: number,
  ): ImpactPreview {
    const source = this.#piece(sourceId);
    const profile = WEAPONS[weapon];
    const origin = from ?? source.position;
    const armed = battleWeapons(source.type, source.hasMissiles).includes(
      weapon,
    );
    let reason: string | null = null;
    if (!profile || !armed) reason = 'This ship has no such weapon.';
    else if (source.status !== 'active' || !origin)
      reason = 'Choose an active enemy ship.';
    else if (weapon === 'Missiles' && source.missiles === 0)
      reason = 'No missile salvos remain.';
    else if (
      !Number.isSafeInteger(at?.q) ||
      !Number.isSafeInteger(at?.r) ||
      !this.contains(at)
    )
      reason = 'Choose a hex on the battle map.';
    else if (profile.area > 0) {
      const distance = hex(origin).distanceTo(hex(at));
      if (distance < profile.min || distance > profile.max)
        reason = 'Impact hex is outside weapon range.';
      else if (!inArc(origin, at, facing ?? source.facing, profile.arc))
        reason = 'Impact hex is outside the firing arc.';
      else if (this.#blocked(origin, at, source, 1, at))
        reason = 'Line of fire is blocked.';
    }
    if (reason || !profile || profile.area === 0) {
      if (reason) return Object.freeze({ reason, hits: Object.freeze([]) });
      const allowWrecks = this.#mayTargetWrecks(source.id);
      const target = this.#pieces.find(
        (piece) =>
          piece.id !== source.id &&
          piece.position &&
          (piece.status === 'active' ||
            (allowWrecks && piece.status === 'wreck')) &&
          ShipFootprint.contains(
            piece,
            this.#base.largeShipFootprints === true,
            at,
          ),
      );
      const asteroid = this.#asteroids.find((rock) => same(rock, at));
      if (!target && asteroid && origin && profile) {
        const distance = hex(origin).distanceTo(hex(at));
        if (distance < profile.min || distance > profile.max)
          return Object.freeze({
            reason: 'Target is outside weapon range.',
            hits: Object.freeze([]),
          });
        if (!inArc(origin, at, facing ?? source.facing, profile.arc))
          return Object.freeze({
            reason: 'Target is outside the firing arc.',
            hits: Object.freeze([]),
          });
        if (this.#blocked(origin, at, source, 1, at))
          return Object.freeze({
            reason: 'Line of fire is blocked.',
            hits: Object.freeze([]),
          });
        return Object.freeze({
          reason: null,
          hits: Object.freeze([]),
          asteroids: Object.freeze([{ ...asteroid }]),
        });
      }
      if (
        !target ||
        (target.status === 'active' && target.side === source.side)
      )
        return Object.freeze({
          reason: 'Choose a hex with an enemy ship.',
          hits: Object.freeze([]),
        });
      if (target.status === 'wreck')
        return Object.freeze({
          reason: null,
          hits: Object.freeze([
            {
              id: target.id,
              dice: 0,
              threshold: 0,
              rear: false,
              wreck: true,
            },
          ]),
        });
      const preview = this.#shotAt(
        sourceId,
        target.id,
        weapon,
        at,
        from,
        facing,
      );
      return Object.freeze({
        reason: preview.reason,
        hits: Object.freeze(
          preview.reason
            ? []
            : [
                {
                  id: target.id,
                  dice: preview.dice,
                  threshold: preview.threshold,
                  rear: preview.rear,
                },
              ],
        ),
      });
    }
    const allowWrecks = this.#mayTargetWrecks(source.id);
    const hits = this.#pieces
      .filter(
        (piece) =>
          piece.id !== source.id &&
          piece.position &&
          (piece.status === 'active' ||
            (allowWrecks && piece.status === 'wreck')) &&
          this.occupiedHexes(piece.id).some(
            (cell) => hex(cell).distanceTo(hex(at)) <= profile.area,
          ),
      )
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((piece) => {
        const rear = inArc(
          piece.position!,
          origin!,
          (piece.facing + 3) % 6,
          120,
        );
        return {
          id: piece.id,
          dice: piece.status === 'wreck' ? 0 : profile.dice,
          threshold: profile.threshold - Number(rear),
          rear,
          ...(piece.status === 'wreck' ? { wreck: true } : {}),
        };
      });
    const rocks = this.#asteroids.filter(
      (asteroid) => hex(asteroid).distanceTo(hex(at)) <= profile.area,
    );
    return Object.freeze({
      reason: null,
      hits: Object.freeze(hits),
      ...(rocks.length
        ? {
            asteroids: Object.freeze(
              rocks.map((asteroid) => ({ ...asteroid })),
            ),
          }
        : {}),
    });
  }

  #blocked(
    origin: BattleHex,
    at: BattleHex,
    source: Piece,
    targetSize: number,
    ignore?: BattleHex,
  ): boolean {
    const size = Math.min(SHIP_PROFILES[source.type].size, targetSize);
    const obstacles = [
      ...this.#asteroids.filter(
        (asteroid) => !ignore || !same(asteroid, ignore),
      ),
      ...this.#pieces
        .filter(
          (piece) =>
            piece.id !== source.id &&
            piece.status === 'active' &&
            piece.position &&
            !ShipFootprint.contains(
              piece,
              this.#base.largeShipFootprints === true,
              at,
            ) &&
            SHIP_PROFILES[piece.type].size > size,
        )
        .flatMap((piece) => this.occupiedHexes(piece.id)),
    ];
    return obstacles.some((obstacle) => crossesHex(origin, at, obstacle));
  }

  get #usesManeuver(): boolean {
    return this.#base.maneuverSystem === true;
  }

  /** Stable side roll so weapon dice keep their existing sequence. */
  #fate(label: string): number {
    let seed = this.#random ^ 0x9e3779b9;
    for (let index = 0; index < label.length; index++)
      seed = Math.imul(seed ^ label.charCodeAt(index), 0x85ebca6b);
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 0x100000000;
  }

  #applyHullDamage(
    target: Piece,
    damage: number,
    dice: readonly number[] = [],
  ): 'active' | 'wreck' | 'exploded' {
    if (target.status === 'wreck') {
      target.status = 'destroyed';
      target.hull = 0;
      this.unlockDock(target.id);
      return 'exploded';
    }
    if (target.status !== 'active' || damage <= 0) return 'active';
    const stamp = `${target.id}:${this.#log.length}:${target.hull}`;
    const enginesKnockedOut = damage >= 2 && dice.some((die) => die === 6);
    target.hull = Math.max(0, target.hull - damage);
    const outcome = hullLossOutcome(
      enginesKnockedOut,
      target.hull,
      this.#fate(`${stamp}:hull`),
    );
    if (outcome === 'exploded') {
      target.status = 'destroyed';
      target.hull = 0;
      this.unlockDock(target.id);
    } else if (outcome === 'wreck') {
      target.status = 'wreck';
      target.speed = 0;
      delete target.escapeEdge;
      this.unlockDock(target.id);
    }
    return outcome;
  }

  #exitIssue(
    piece: Piece,
    origin: BattleHex,
    facing: number,
    committed: 'top' | 'bottom' | undefined = piece.escapeEdge,
  ): string | null {
    const next = hex(origin).neighbors()[facing]!;
    const cells = this.occupiedHexes(piece.id, next, facing);
    if (cells.every((cell) => this.contains(cell))) return null;
    if (this.#base.escapeZones === true) {
      const edge = committed ?? this.#escapeDeparture(piece, origin, facing);
      if (!edge) return 'Escape through one of the green Escape hexes.';
      const crossesAnotherEdge = cells.some((cell) => {
        if (this.contains(cell)) return false;
        return edge === 'top' ? cell.r >= 0 : cell.r < this.#base.height;
      });
      if (
        (edge === 'top' && facing !== 1 && facing !== 2) ||
        (edge === 'bottom' && facing !== 4 && facing !== 5) ||
        crossesAnotherEdge
      )
        return 'Continue straight through the selected Escape edge.';
      if (this.#round < 2) return 'Retreat is available from round two.';
      return this.#base.fleets.find((f) => f.id === piece.fleetId)?.retreat
        ? null
        : 'No safe retreat hex is available.';
    }
    const outside = cells.filter((cell) => !this.contains(cell));
    const ownEdge = outside.every((cell) =>
      piece.side === 'player'
        ? column(cell) < 0
        : column(cell) >= this.#base.width,
    );
    if (
      !ownEdge ||
      outside.some((cell) => cell.r < 0 || cell.r >= this.#base.height)
    )
      return 'Ships can only exit their own short edge.';
    if (this.#round < 2) return 'Retreat is available from round two.';
    return this.#base.fleets.find((f) => f.id === piece.fleetId)?.retreat
      ? null
      : 'No safe retreat hex is available.';
  }

  /** hexmal-for-manover: preserve distinct commands even when their endpoints coincide. */
  maneuverOptions(id: string): readonly ManeuverOption[] {
    const activation = this.#activation;
    if (
      !this.#usesManeuver ||
      !activation ||
      activation.id !== id ||
      activation.remaining < 1 ||
      activation.movementClosed
    )
      return [];
    const options: ManeuverOption[] = [];
    for (const speed of [-1, 0, 1] as const) {
      for (const direction of [-1, 0, 1] as const) {
        const preview = this.previewManeuver(id, speed, direction);
        if (!preview.issue) options.push({ speed, direction, preview });
      }
    }
    return options;
  }

  previewManeuver(
    id: string,
    delta: -1 | 0 | 1,
    direction: -1 | 0 | 1,
    pose?: {
      readonly position: BattleHex;
      readonly facing: number;
      readonly speed: number;
    },
  ): ManeuverPreview {
    const piece = this.#piece(id);
    const origin = pose?.position ?? piece.position;
    const facing = pose?.facing ?? piece.facing;
    const speed = pose?.speed ?? piece.speed ?? 0;
    const empty = (issue: string, nextSpeed = speed): ManeuverPreview => ({
      speed: nextSpeed,
      facing,
      position: origin ? { ...origin } : null,
      steps: [],
      traveled: [],
      issue,
      escaped: false,
      collisions: [],
    });
    if (!this.#usesManeuver)
      return empty('This battle uses the earlier movement rules.');
    if (delta !== -1 && delta !== 0 && delta !== 1)
      return empty('Change speed by one, or hold it.');
    if (direction !== -1 && direction !== 0 && direction !== 1)
      return empty('Choose left, straight, or right.');
    if (!origin) return empty('Deploy the ship first.');
    if (!pose && piece.dockedWith)
      return empty('This ship is locked in a boarding.');
    if (!pose && piece.escapeEdge && direction !== 0)
      return empty('This ship is committed to its escape.');
    const nextSpeed = Math.min(piece.movement, Math.max(0, speed + delta));
    if (nextSpeed !== speed + delta)
      return empty(
        nextSpeed === piece.movement
          ? 'The ship is already at maximum speed.'
          : 'The ship is already stopped.',
        nextSpeed,
      );
    const steps = maneuverPath(origin, facing, nextSpeed, direction);
    if (
      direction !== 0 &&
      nextSpeed === 0 &&
      this.placementIssue(id, origin, (facing + direction + 6) % 6)
    )
      return {
        ...empty('The ship footprint is occupied.', nextSpeed),
        facing: (facing + direction + 6) % 6,
        steps,
      };
    const gone = new Set<string>();
    const traveled: ManeuverStep[] = [];
    const collisions: ManeuverPreview['collisions'][number][] = [];
    let cursor = origin;
    let cursorFacing = facing;
    let committed = piece.escapeEdge;
    let escaped = false;
    const blocked = (issue: string): ManeuverPreview => ({
      speed: nextSpeed,
      facing: cursorFacing,
      position: { ...cursor },
      steps,
      traveled,
      issue,
      escaped: false,
      collisions,
    });
    for (const step of steps) {
      if (step.position.q === cursor.q && step.position.r === cursor.r) {
        traveled.push(step);
        cursorFacing = step.facing;
        continue;
      }
      const approachFacing = this.#stepFacing(
        cursor,
        step.position,
        cursorFacing,
      );
      const cells = this.occupiedHexes(id, step.position, step.facing);
      if (cells.some((cell) => !this.contains(cell))) {
        const leaving = this.#exitIssue(
          piece,
          cursor,
          approachFacing,
          committed,
        );
        if (leaving) return blocked(leaving);
      }
      const overlaps = (other: Piece) =>
        !!other.position &&
        cells.some((cell) =>
          ShipFootprint.contains(
            other,
            this.#base.largeShipFootprints === true,
            cell,
          ),
        );
      if (
        this.#pieces.some(
          (other) =>
            other.id !== id && other.status === 'wreck' && overlaps(other),
        )
      )
        return blocked('A wreck blocks the way.');
      const ships = this.#pieces.filter(
        (other) =>
          other.id !== id && other.status === 'active' && overlaps(other),
      );
      if (ships.length) {
        for (const other of ships)
          collisions.push({
            kind: 'ship',
            id: other.id,
            at: { ...step.position },
          });
        break;
      }
      for (const cell of cells) {
        if (
          this.#asteroids.some((asteroid) => same(asteroid, cell)) &&
          !gone.has(hex(cell).key)
        ) {
          gone.add(hex(cell).key);
          collisions.push({ kind: 'asteroid', at: { ...cell } });
        }
      }
      const departed = cursor;
      traveled.push(step);
      cursor = step.position;
      cursorFacing = step.facing;
      if (cells.some((cell) => !this.contains(cell)))
        committed =
          committed ??
          this.#escapeDeparture(piece, departed, approachFacing) ??
          undefined;
      if (cells.every((cell) => !this.contains(cell))) {
        escaped = true;
        break;
      }
    }
    const final = traveled.at(-1);
    return {
      speed: nextSpeed,
      facing:
        final?.facing ??
        (direction !== 0 && nextSpeed === 0
          ? (facing + direction + 6) % 6
          : cursorFacing),
      position: escaped ? null : { ...(final?.position ?? cursor) },
      steps,
      traveled,
      issue: null,
      escaped,
      collisions,
    };
  }

  #stepFacing(from: BattleHex, to: BattleHex, fallback: number): number {
    const index = hex(from)
      .neighbors()
      .findIndex((point) => point.q === to.q && point.r === to.r);
    return index < 0 ? fallback : index;
  }

  forwardIssue(
    id: string,
    position?: BattleHex,
    facing?: number,
  ): string | null {
    const p = this.#piece(id),
      origin = position ?? p.position;
    if (!origin) return 'Deploy the ship first.';
    if (p.dockedWith) return 'This ship is locked in a boarding.';
    const next = hex(origin).neighbors()[facing ?? p.facing]!;
    const cells = this.occupiedHexes(id, next, facing);
    if (cells.some((cell) => this.#occupied(cell, id)))
      return 'The next hex is occupied.';
    if (cells.every((cell) => this.contains(cell))) return null;
    if (this.#base.escapeZones === true) {
      const direction = facing ?? p.facing;
      const edge = p.escapeEdge ?? this.#escapeDeparture(p, origin, direction);
      if (!edge) return 'Escape through one of the green Escape hexes.';
      const crossesAnotherEdge = cells.some((cell) => {
        if (this.contains(cell)) return false;
        return edge === 'top' ? cell.r >= 0 : cell.r < this.#base.height;
      });
      if (
        (edge === 'top' && direction !== 1 && direction !== 2) ||
        (edge === 'bottom' && direction !== 4 && direction !== 5) ||
        crossesAnotherEdge
      )
        return 'Continue straight through the selected Escape edge.';
      if (this.#round < 2) return 'Retreat is available from round two.';
      return this.#base.fleets.find((f) => f.id === p.fleetId)?.retreat
        ? null
        : 'No safe retreat hex is available.';
    }
    const outside = cells.filter((cell) => !this.contains(cell));
    const ownEdge = outside.every((cell) =>
      p.side === 'player' ? column(cell) < 0 : column(cell) >= this.#base.width,
    );
    if (
      !ownEdge ||
      outside.some((cell) => cell.r < 0 || cell.r >= this.#base.height)
    )
      return 'Ships can only exit their own short edge.';
    if (this.#round < 2) return 'Retreat is available from round two.';
    return this.#base.fleets.find((f) => f.id === p.fleetId)?.retreat
      ? null
      : 'No safe retreat hex is available.';
  }

  #escapeDeparture(
    piece: Piece,
    position: BattleHex,
    facing: number,
  ): 'top' | 'bottom' | null {
    const cells = this.occupiedHexes(piece.id, position, facing);
    const front = cells.at(-1);
    if (!front) return null;
    const zones = battleEscapeHexes(this.#base);
    if (!zones.some((zone) => same(zone, front))) return null;
    const next = hex(position).neighbors()[facing]!;
    const nextCells = this.occupiedHexes(piece.id, next, facing);
    if (front.r === 0 && nextCells.some((cell) => cell.r < 0)) return 'top';
    if (
      front.r === this.#base.height - 1 &&
      nextCells.some((cell) => cell.r >= this.#base.height)
    )
      return 'bottom';
    return null;
  }

  command(command: BattleCommand, side: BattleSide = 'player'): void {
    if (this.#phase === 'complete') throw new Error('This battle is complete.');
    if (this.#phase === 'deployment') {
      if (side !== 'player') throw new Error('Wait for deployment.');
      if (command.type === 'auto-deploy') {
        this.#deploy('player');
        return;
      }
      if (command.type === 'place') {
        const p = this.#piece(command.id);
        if (
          p.side !== side ||
          !Number.isInteger(command.facing) ||
          command.facing < 0 ||
          command.facing > 5 ||
          this.placementIssue(p.id, command.position, command.facing, true)
        )
          throw new Error(
            'Choose a free hex in your deployment zone and a facing.',
          );
        p.position = { ...command.position };
        p.facing = command.facing;
        return;
      }
      if (command.type !== 'start' || this.#pieces.some((p) => !p.position))
        throw new Error('Deploy every ship before starting combat.');
      this.#phase = 'fighting';
      this.#beginRound();
      return;
    }
    if (side !== this.#turn) throw new Error('Wait for your side to activate.');
    if (command.type === 'activate') {
      const p = this.#piece(command.id);
      if (
        this.#activation ||
        p.side !== side ||
        p.status !== 'active' ||
        p.activated
      )
        throw new Error('Choose an unactivated ship on your side.');
      delete p.overwatch;
      this.#activation = {
        id: p.id,
        remaining: this.#usesManeuver ? maneuverPoints(p.type) : p.movement,
        moved: false,
        fired: p.firedRound === this.#round,
        movementClosed: false,
      };
      this.#advanceIfSpent();
      return;
    }
    const activation = this.#activation;
    if (!activation) throw new Error('Activate a ship first.');
    const p = this.#piece(activation.id);
    if (command.type === 'end-activation') {
      const blocked = this.endIssue(p.id);
      if (blocked) throw new Error(blocked);
      this.#finishActivation();
      return;
    }
    if (command.type === 'maneuver') {
      if (!this.#usesManeuver)
        throw new Error('This battle uses the earlier movement rules.');
      if (activation.remaining < 1 || activation.movementClosed)
        throw new Error('No movement remains in this activation.');
      if (command.speed !== -1 && command.speed !== 0 && command.speed !== 1)
        throw new Error('Change speed by one, or hold it.');
      if (
        command.direction !== -1 &&
        command.direction !== 0 &&
        command.direction !== 1
      )
        throw new Error('Choose left, straight, or right.');
      const preview = this.previewManeuver(
        p.id,
        command.speed,
        command.direction,
      );
      if (preview.issue) throw new Error(preview.issue);
      this.#commitManeuver(p, activation, command, preview);
      return;
    }
    if (
      this.#usesManeuver &&
      (command.type === 'forward' || command.type === 'turn')
    )
      throw new Error('Choose a speed and a heading.');
    if (command.type === 'forward' || command.type === 'turn') {
      if (activation.remaining < 1 || activation.movementClosed)
        throw new Error('No movement remains in this activation.');
      if (command.type === 'forward') {
        const issue = this.forwardIssue(p.id);
        if (issue) throw new Error(issue);
        const escapeEdge =
          this.#base.escapeZones === true
            ? (p.escapeEdge ?? this.#escapeDeparture(p, p.position!, p.facing))
            : null;
        const next = hex(p.position!).neighbors()[p.facing]!;
        p.position = next;
        if (escapeEdge) p.escapeEdge = escapeEdge;
        const footprint = this.occupiedHexes(p.id, next);
        const escaped =
          this.#base.escapeZones === true
            ? footprint.every((cell) => !this.contains(cell))
            : footprint.some((cell) => !this.contains(cell));
        if (!escaped) this.#triggerOverwatch(p);
        if (escaped && p.status === 'active') {
          p.position = null;
          p.status = 'escaped';
          delete p.escapeEdge;
          this.#log.push(`${battlePieceLabel(p, this.#pieces)} escaped.`);
        }
      } else if (command.type === 'turn') {
        if (command.direction !== 1 && command.direction !== -1)
          throw new Error('Choose a 60 degree turn.');
        const issue = this.turnIssue(p.id, command.direction);
        if (issue) throw new Error(issue);
        p.facing = (p.facing + command.direction + 6) % 6;
      }
      activation.remaining--;
      activation.moved = true;
      if (p.status !== 'active') {
        if (!this.#checkComplete() && this.#activation)
          this.#finishActivation();
      }
      return;
    }
    if (command.type === 'overwatch') {
      if (activation.fired || p.escapeEdge || p.dockedWith)
        throw new Error('This ship cannot reserve a shot.');
      if (
        !battleWeapons(p.type, p.hasMissiles).includes(command.weapon) ||
        (command.weapon === 'Missiles' && p.missiles < 1)
      )
        throw new Error('Choose an available weapon.');
      p.overwatch = command.weapon;
      activation.fired = true;
      this.#log.push(`${battlePieceLabel(p, this.#pieces)} enters Overwatch.`);
      this.#advanceIfSpent();
      return;
    }
    if (command.type === 'dock') {
      if (activation.fired)
        throw new Error('This ship already acted this activation.');
      if (p.dockedWith) throw new Error('This ship is locked in a boarding.');
      const issue = this.dockIssue(p.id, command.targetId);
      if (issue) throw new Error(issue);
      const target = this.#piece(command.targetId);
      p.dockedWith = target.id;
      target.dockedWith = p.id;
      activation.fired = true;
      activation.movementClosed = true;
      this.#pendingBoarding = { attackerId: p.id, defenderId: target.id };
      this.#log.push(
        `${battlePieceLabel(p, this.#pieces)} docks with ${battlePieceLabel(target, this.#pieces)}.`,
      );
      this.#advanceIfSpent();
      return;
    }
    if (command.type !== 'fire') throw new Error('Choose a combat action.');
    if (p.escapeEdge) throw new Error('This ship is committed to its escape.');
    if (activation.fired)
      throw new Error('This ship already fired this activation.');
    if (p.dockedWith) throw new Error('This ship is locked in a boarding.');
    this.#fireShot(p, command);
    activation.fired = true;
    if (!this.#usesManeuver) activation.movementClosed = activation.moved;
    this.#checkComplete();
    this.#advanceIfSpent();
  }

  #fireShot(
    p: Piece,
    command: { readonly at: BattleHex; readonly weapon: WeaponName },
  ): void {
    const preview = this.impact(p.id, command.at, command.weapon);
    if (preview.reason) throw new Error(preview.reason);
    if (command.weapon === 'Missiles') p.missiles--;
    const notes: string[] = [];
    const impacts: BattleShot['impacts'][number][] = [];
    let total = 0;
    for (const hit of preview.hits) {
      const target = this.#piece(hit.id);
      const previousHull = target.hull;
      const dice = hit.wreck
        ? []
        : Array.from({ length: hit.dice }, () => this.#die());
      const damage = hit.wreck
        ? 0
        : dice.filter((die) => die >= hit.threshold).length;
      total += damage;
      const loss = hit.wreck
        ? this.#applyHullDamage(target, 1)
        : this.#applyHullDamage(target, damage, dice);
      const phrase =
        loss === 'exploded'
          ? hit.wreck
            ? ', wreck explodes'
            : ', destroyed'
          : loss === 'wreck'
            ? ', wreck'
            : `, ${target.hull} hull remaining`;
      impacts.push({
        id: target.id,
        position: {
          ...[...this.occupiedHexes(target.id)].sort(
            (a, b) =>
              hex(a).distanceTo(hex(command.at)) -
              hex(b).distanceTo(hex(command.at)),
          )[0]!,
        },
        damage,
        previousHull,
        destroyed: loss === 'exploded',
      });
      const outcome = hit.wreck
        ? '0 damage, wreck explodes'
        : `${hit.dice}D6 [${dice.join(', ')}], hit ${hit.threshold}+${hit.rear ? ' (rear)' : ''}: ${damage} damage${phrase}`;
      notes.push(
        command.weapon === 'Missiles'
          ? `${battlePieceLabel(target, this.#pieces)} ${hit.wreck ? 'wreck explodes' : `${hit.dice}D6 [${dice.join(', ')}], hit ${hit.threshold}+${hit.rear ? ' (rear)' : ''}, ${damage} hits${phrase}`}`
          : outcome,
      );
    }
    for (const asteroid of preview.asteroids ?? []) {
      const index = this.#asteroids.findIndex((rock) => same(rock, asteroid));
      if (index >= 0) this.#asteroids.splice(index, 1);
      notes.push(`Asteroid at ${asteroid.q},${asteroid.r} breaks.`);
    }
    this.#lastShot = {
      id: `${this.#base.id}:shot:${this.#log.length}`,
      weapon: command.weapon,
      from: { ...p.position! },
      at: { ...command.at },
      impacts,
    };
    const shipNote = preview.hits[0]
      ? battlePieceLabel(this.#piece(preview.hits[0].id), this.#pieces)
      : '';
    this.#log.push(
      command.weapon === 'Missiles'
        ? `${battlePieceLabel(p, this.#pieces)}: Missiles → ${command.at.q},${command.at.r}. ${notes.join(' ') || 'No ships in the area.'} Area: ${total} damage.`
        : `${battlePieceLabel(p, this.#pieces)}: ${command.weapon} → ${command.at.q},${command.at.r}${shipNote ? ` ${shipNote}` : ''}. ${notes.join(' ')}`,
    );
    p.firedRound = this.#round;
  }

  #triggerOverwatch(mover: Piece): BattleShot[] {
    const shots: BattleShot[] = [];
    for (const watcher of this.#pieces) {
      if (mover.status !== 'active') break;
      if (
        watcher.side === mover.side ||
        watcher.status !== 'active' ||
        !watcher.overwatch ||
        watcher.dockedWith
      )
        continue;
      const at = this.aimAt(watcher.id, mover.id, watcher.overwatch);
      if (!at) continue;
      const weapon = watcher.overwatch;
      delete watcher.overwatch;
      this.#fireShot(watcher, { at, weapon });
      shots.push(this.#lastShot!);
    }
    return shots;
  }

  #commitManeuver(
    piece: Piece,
    activation: Activation,
    command: { readonly speed: -1 | 0 | 1; readonly direction: -1 | 0 | 1 },
    preview: ManeuverPreview,
  ): void {
    const from = {
      position: { ...piece.position! },
      facing: piece.facing,
    };
    piece.speed = preview.speed;
    let stopped = false;
    const traveled: ManeuverStep[] = [];
    const reactions: { step: number; shot: BattleShot }[] = [];
    for (const step of preview.traveled) {
      const cells = this.occupiedHexes(piece.id, step.position, step.facing);
      for (const collision of preview.collisions) {
        if (collision.kind !== 'asteroid') continue;
        if (!cells.some((cell) => same(cell, collision.at))) continue;
        const index = this.#asteroids.findIndex((asteroid) =>
          same(asteroid, collision.at),
        );
        if (index < 0) continue;
        this.#asteroids.splice(index, 1);
        this.#applyHullDamage(piece, Math.max(1, preview.speed));
        if (piece.status !== 'active') {
          piece.position = { ...step.position };
          piece.facing = step.facing;
          traveled.push(step);
          stopped = true;
          break;
        }
      }
      if (stopped) break;
      const moved = !same(piece.position, step.position);
      piece.position = { ...step.position };
      piece.facing = step.facing;
      traveled.push(step);
      if (moved)
        for (const shot of this.#triggerOverwatch(piece))
          reactions.push({ step: traveled.length, shot });
      if (piece.status !== 'active') {
        stopped = true;
        break;
      }
      if (preview.escaped && step === preview.traveled.at(-1)) {
        piece.position = null;
        piece.status = 'escaped';
        delete piece.escapeEdge;
      }
    }
    if (
      piece.status === 'active' &&
      !preview.traveled.length &&
      command.direction !== 0
    )
      piece.facing = preview.facing;
    if (piece.status === 'active' && !preview.escaped) {
      for (const collision of preview.collisions) {
        if (collision.kind !== 'ship' || stopped) continue;
        const other = this.#piece(collision.id);
        if (other.status !== 'active') continue;
        const amount = Math.max(1, preview.speed);
        this.#applyHullDamage(other, amount);
        if (piece.status === 'active') this.#applyHullDamage(piece, amount);
        if (piece.status !== 'active') stopped = true;
      }
      if (piece.status === 'active') {
        const outside = this.occupiedHexes(piece.id).some(
          (cell) => !this.contains(cell),
        );
        if (outside && !piece.escapeEdge) {
          let previous = from;
          for (const step of preview.traveled) {
            const cells = this.occupiedHexes(
              piece.id,
              step.position,
              step.facing,
            );
            if (cells.some((cell) => !this.contains(cell))) {
              piece.escapeEdge =
                this.#escapeDeparture(
                  piece,
                  previous.position,
                  this.#stepFacing(
                    previous.position,
                    step.position,
                    previous.facing,
                  ),
                ) ?? (step.position.r <= 0 ? 'top' : 'bottom');
              break;
            }
            previous = step;
          }
        }
      }
    }
    this.#lastManeuver = {
      id: `${this.#base.id}:move:${this.#log.length}:${piece.id}`,
      shipId: piece.id,
      from,
      steps: traveled,
      ...(reactions.length ? { reactions } : {}),
    };
    const heading =
      command.direction === 0
        ? 'straight'
        : command.direction === 1
          ? 'left'
          : 'right';
    const pace =
      command.speed > 0
        ? 'accelerates'
        : command.speed < 0
          ? 'brakes'
          : 'holds speed';
    const collisionNote = preview.collisions.length
      ? ` ${preview.collisions
          .map((collision) =>
            collision.kind === 'asteroid'
              ? 'An asteroid breaks.'
              : `Collides with ${battlePieceLabel(this.#piece(collision.id), this.#pieces)}.`,
          )
          .join(' ')}`
      : '';
    this.#log.push(
      `${battlePieceLabel(piece, this.#pieces)} ${pace} to speed ${preview.speed} and goes ${heading}.${collisionNote}${piece.status === 'escaped' ? ' Escaped.' : piece.status === 'wreck' ? ' Wreck.' : piece.status === 'destroyed' ? ' Destroyed.' : ''}`,
    );
    activation.remaining--;
    activation.moved = true;
    if (piece.status !== 'active' || this.#checkComplete()) {
      if (this.#activation) this.#finishActivation();
      return;
    }
    this.#advanceIfSpent();
  }

  #hasActiveEnemyShot(piece: Piece): boolean {
    return battleWeapons(piece.type, piece.hasMissiles).some(
      (weapon) => this.autoTarget(piece.id, weapon) !== null,
    );
  }

  #hasLegalManeuver(piece: Piece): boolean {
    const activation = this.#activation;
    if (
      activation?.id === piece.id &&
      (activation.movementClosed || activation.remaining < 1)
    )
      return false;
    for (const speed of [-1, 0, 1] as const)
      for (const direction of [-1, 0, 1] as const)
        if (!this.previewManeuver(piece.id, speed, direction).issue)
          return true;
    return false;
  }

  /** vrak-beskjutning-sista-utvag: wrecks are targets only with no move and no other shot. */
  #mayTargetWrecks(id: string): boolean {
    if (!this.#usesManeuver) return false;
    const piece = this.#piece(id);
    if (piece.status !== 'active' || piece.escapeEdge) return false;
    if (this.#forceWreckTargets) return true;
    const activation = this.#activation;
    if (
      !activation ||
      activation.id !== id ||
      activation.fired ||
      piece.escapeEdge ||
      piece.status !== 'active'
    )
      return false;
    if (this.#hasLegalManeuver(piece) || this.#hasActiveEnemyShot(piece))
      return false;
    return true;
  }

  #hasCombatAction(piece: Piece): boolean {
    const activation = this.#activation;
    if (!activation || activation.id !== piece.id || piece.status !== 'active')
      return false;
    if (
      !activation.fired &&
      !piece.escapeEdge &&
      !piece.dockedWith &&
      battleWeapons(piece.type, piece.hasMissiles).some(
        (weapon) => weapon !== 'Missiles' || piece.missiles > 0,
      )
    )
      return true;
    if (!activation.fired && this.dockTargets(piece.id).length > 0) return true;
    if (!activation.fired && this.#hasActiveEnemyShot(piece)) return true;
    if (this.#mayTargetWrecks(piece.id)) {
      const wreck = this.#pieces.some(
        (other) => other.status === 'wreck' && other.position,
      );
      if (wreck && this.#hasWreckShot(piece)) return true;
    }
    if (!activation.fired && this.#hasAsteroidShot(piece)) return true;
    return (
      !activation.movementClosed &&
      activation.remaining > 0 &&
      this.#hasLegalManeuver(piece)
    );
  }

  #hasAsteroidShot(piece: Piece): boolean {
    return battleWeapons(piece.type, piece.hasMissiles).some((weapon) =>
      this.#asteroids.some(
        (asteroid) => !this.impact(piece.id, asteroid, weapon).reason,
      ),
    );
  }

  #hasWreckShot(piece: Piece): boolean {
    return battleWeapons(piece.type, piece.hasMissiles).some((weapon) =>
      this.#pieces.some(
        (other) =>
          other.status === 'wreck' &&
          other.position &&
          this.occupiedHexes(other.id).some(
            (cell) => !this.impact(piece.id, cell, weapon).reason,
          ),
      ),
    );
  }

  /** nasta-skepp-vid-slut-pa-handlingar */
  #advanceIfSpent(): void {
    if (!this.#usesManeuver || !this.#activation || this.#phase !== 'fighting')
      return;
    const piece = this.#pieces.find(
      (candidate) => candidate.id === this.#activation!.id,
    );
    if (!piece || piece.status !== 'active' || !this.#hasCombatAction(piece))
      this.#finishActivation();
  }

  #checkComplete(): boolean {
    if (
      (['player', 'enemy'] as const).some(
        (side) =>
          !this.#pieces.some((p) => p.side === side && p.status === 'active'),
      )
    ) {
      this.#phase = 'complete';
      this.#activation = null;
      this.#log.push('Battle complete. Surviving ships regroup.');
      return true;
    }
    return false;
  }
  #finishActivation(): void {
    this.#piece(this.#activation!.id).activated = true;
    this.#activation = null;
    if (this.#checkComplete()) return;
    const available = (side: BattleSide) =>
      this.#pieces.some(
        (p) => p.side === side && p.status === 'active' && !p.activated,
      );
    if (available(opposite(this.#turn))) this.#turn = opposite(this.#turn);
    else if (!available(this.#turn)) this.#beginRound();
  }

  /** pirater-skyddar-bordade-skepp: automatic allies protect their boarders. */
  #protectedByFriendlyBoarders(target: Piece, firingSide: BattleSide): boolean {
    if (!target.dockedWith || target.side === firingSide) return false;
    const boarder = this.#pieces.find(
      (piece) => piece.id === target.dockedWith,
    );
    return boarder?.side === firingSide && boarder.status === 'active';
  }

  /** Same public commands drive AI and tests; no hidden positions or privileged attacks. */
  actAutomatically(
    singleStep = false,
    options?: { readonly allowDock?: boolean },
  ): void {
    if (this.#phase === 'deployment') {
      this.command({ type: 'auto-deploy' });
      this.command({ type: 'start' });
      return;
    }
    if (this.#phase !== 'fighting') return;
    const side = this.#turn;
    const candidates = this.#activation
      ? [this.#piece(this.#activation.id)]
      : this.#pieces.filter(
          (p) => p.side === side && p.status === 'active' && !p.activated,
        );
    const enemies = this.#pieces.filter(
      (p) => p.side !== side && p.status === 'active',
    );
    const distance = (piece: Piece) =>
      Math.min(
        ...enemies.map((enemy) =>
          hex(piece.position!).distanceTo(hex(enemy.position!)),
        ),
      );
    candidates.sort(
      (a, b) => distance(a) - distance(b) || a.id.localeCompare(b.id),
    );
    const plan = candidates[0]
      ? this.#plan(candidates[0], options?.allowDock !== false)
      : null;
    if (!plan) throw new Error('No ship can activate.');
    if (!this.#activation) {
      this.command({ type: 'activate', id: plan.id }, side);
      if (singleStep) return;
    }
    for (const action of plan.actions) {
      if (this.#phase !== 'fighting' || !this.#activation) return;
      this.command(action, side);
      if (singleStep) return;
    }
    while (this.#activation && this.endIssue(this.#activation.id)) {
      const extra = this.#fallbackManeuver(this.#piece(this.#activation.id));
      if (!extra) break;
      this.command(extra, side);
      if (singleStep) return;
    }
    if (this.#activation && !this.endIssue(this.#activation.id))
      this.command({ type: 'end-activation' }, side);
  }

  /** ingen-avslut-med-fart-och-manoverpoang */
  endIssue(id: string): string | null {
    if (!this.#usesManeuver) return null;
    const piece = this.#piece(id);
    const activation = this.#activation;
    if (
      !activation ||
      activation.id !== id ||
      activation.movementClosed ||
      activation.remaining < 1 ||
      !this.#hasLegalManeuver(piece)
    )
      return null;
    if (activation.fired && activation.moved)
      return 'Use the remaining maneuver point after firing.';
    if ((piece.speed ?? 0) < 1) return null;
    return 'Use the remaining maneuver points while the ship has speed.';
  }

  #fallbackManeuver(
    piece: Piece,
  ): { type: 'maneuver'; speed: -1 | 0 | 1; direction: -1 | 0 | 1 } | null {
    const options: Array<{ speed: -1 | 0 | 1; direction: -1 | 0 | 1 }> = [
      { speed: 0, direction: 0 },
      { speed: -1, direction: 0 },
      { speed: 0, direction: 1 },
      { speed: 0, direction: -1 },
      { speed: 1, direction: 0 },
      { speed: -1, direction: 1 },
      { speed: -1, direction: -1 },
      { speed: 1, direction: 1 },
      { speed: 1, direction: -1 },
    ];
    const choice = options.find(
      (option) =>
        !this.previewManeuver(piece.id, option.speed, option.direction).issue,
    );
    return choice ? { type: 'maneuver', ...choice } : null;
  }

  #plan(
    p: Piece,
    allowDock = true,
  ): { id: string; score: number; actions: BattleCommand[] } {
    if (this.#usesManeuver) return this.#planManeuver(p, allowDock);
    const enemies = this.#pieces.filter(
      (e) => e.side !== p.side && e.status === 'active',
    );
    const fireTargets = enemies.filter(
      (enemy) => !this.#protectedByFriendlyBoarders(enemy, p.side),
    );
    const activation = this.#activation?.id === p.id ? this.#activation : null;
    if (p.dockedWith) return { id: p.id, score: 0, actions: [] };
    if (p.escapeEdge) {
      const moves = activation?.movementClosed
        ? 0
        : (activation?.remaining ?? p.movement);
      const steps = Math.min(
        moves,
        this.occupiedHexes(p.id).filter((cell) => this.contains(cell)).length,
      );
      return {
        id: p.id,
        score: 100,
        actions: Array.from({ length: steps }, () => ({
          type: 'forward' as const,
        })),
      };
    }
    if (allowDock && !activation?.fired) {
      const target = enemies.find(
        (enemy) => this.dockIssue(p.id, enemy.id) === null,
      );
      if (target)
        return {
          id: p.id,
          score: 1000,
          actions: [{ type: 'dock', targetId: target.id }],
        };
    }
    const moves = activation?.movementClosed
      ? 0
      : (activation?.remaining ?? p.movement);
    const armed = battleWeapons(p.type, p.hasMissiles).length > 0;
    type Node = {
      position: BattleHex;
      facing: number;
      actions: BattleCommand[];
    };
    const queue: Node[] = [
      { position: p.position!, facing: p.facing, actions: [] },
    ];
    const seen = new Set<string>();
    let best = { id: p.id, score: -Infinity, actions: [] as BattleCommand[] };
    const shotAt = (position: BattleHex, facing: number) => {
      let bestShot: { score: number; action: BattleCommand } | null = null;
      if (activation?.fired) return bestShot;
      for (const weapon of battleWeapons(p.type, p.hasMissiles)) {
        if (weapon === 'Missiles') {
          const hexes = new Map<string, BattleHex>();
          for (const enemy of fireTargets) {
            if (!enemy.position) continue;
            for (const point of this.occupiedHexes(enemy.id).flatMap(
              missileArea,
            ))
              hexes.set(`${point.q},${point.r}`, point);
          }
          for (const at of hexes.values()) {
            const preview = this.impact(p.id, at, weapon, position, facing);
            if (preview.reason) continue;
            if (
              preview.hits.some((hit) =>
                this.#protectedByFriendlyBoarders(this.#piece(hit.id), p.side),
              )
            )
              continue;
            let score = -1;
            for (const hit of preview.hits) {
              const ship = this.#piece(hit.id);
              const expected = (hit.dice * (7 - hit.threshold)) / 6;
              const kill = Math.max(0, hit.dice - ship.hull + 1) * 12;
              const value = expected * 10 + kill;
              score += ship.side === p.side ? -value : value;
            }
            if (score <= 0) continue;
            if (!bestShot || score > bestShot.score)
              bestShot = { score, action: { type: 'fire', at, weapon } };
          }
          continue;
        }
        for (const enemy of fireTargets) {
          if (!enemy.position) continue;
          const at = this.aimAt(p.id, enemy.id, weapon, position, facing);
          if (!at) continue;
          const preview = this.shot(p.id, enemy.id, weapon, position, facing);
          if (preview.reason) continue;
          const expected = (preview.dice * (7 - preview.threshold)) / 6;
          const kill = Math.max(0, preview.dice - enemy.hull + 1) * 12;
          const score = expected * 10 + kill;
          if (!bestShot || score > bestShot.score)
            bestShot = {
              score,
              action: { type: 'fire', at, weapon },
            };
        }
      }
      return bestShot;
    };
    const before = !activation?.moved ? shotAt(p.position!, p.facing) : null;
    for (let index = 0; index < queue.length; index++) {
      const node = queue[index]!;
      const key = `${node.position.q},${node.position.r},${node.facing}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const after = shotAt(node.position, node.facing);
      const shot =
        before && (!after || before.score >= after.score) ? before : after;
      const nearest = Math.min(
        ...enemies.map((e) => hex(node.position).distanceTo(hex(e.position!))),
      );
      const route = this.#fleeScore(p, node.position, node.facing);
      let risk = 0;
      for (const enemy of enemies)
        for (const weapon of battleWeapons(enemy.type, enemy.hasMissiles)) {
          // Score incoming fire against the proposed position and facing.
          const old = p.position,
            oldFacing = p.facing;
          p.position = node.position;
          p.facing = node.facing;
          const preview = this.shot(enemy.id, p.id, weapon);
          p.position = old;
          p.facing = oldFacing;
          if (!preview.reason)
            risk += (preview.dice * (7 - preview.threshold)) / 6;
        }
      const score =
        (shot?.score ?? 0) -
        (armed ? nearest * 0.8 : route.distance * 3 - route.aligned) -
        risk * 2 -
        node.actions.length * 0.02;
      const actions =
        shot === before && before
          ? [before.action, ...node.actions]
          : [...node.actions, ...(after ? [after.action] : [])];
      if (score > best.score) best = { id: p.id, score, actions };
      if (node.actions.length >= moves) continue;
      if (!this.turnIssue(p.id, -1, node.position, node.facing))
        queue.push({
          ...node,
          facing: (node.facing + 5) % 6,
          actions: [...node.actions, { type: 'turn', direction: -1 }],
        });
      if (!this.turnIssue(p.id, 1, node.position, node.facing))
        queue.push({
          ...node,
          facing: (node.facing + 1) % 6,
          actions: [...node.actions, { type: 'turn', direction: 1 }],
        });
      if (this.forwardIssue(p.id, node.position, node.facing) === null) {
        const next = hex(node.position).neighbors()[node.facing]!;
        const nextCells = this.occupiedHexes(p.id, next, node.facing);
        if (nextCells.every((cell) => this.contains(cell)))
          queue.push({
            position: next,
            facing: node.facing,
            actions: [...node.actions, { type: 'forward' }],
          });
        else if (!armed) {
          const remaining = moves - node.actions.length;
          const steps = Math.min(
            remaining,
            this.occupiedHexes(p.id, node.position, node.facing).filter(
              (cell) => this.contains(cell),
            ).length,
          );
          return {
            id: p.id,
            score: 100,
            actions: [
              ...node.actions,
              ...Array.from({ length: steps }, () => ({
                type: 'forward' as const,
              })),
            ],
          };
        }
      }
    }
    if (
      armed &&
      !activation?.fired &&
      !best.actions.some((a) => a.type === 'fire') &&
      moves > 0
    ) {
      const route = this.#approach(p);
      if (route)
        best = {
          id: p.id,
          score: -route.length,
          actions: route.slice(0, moves),
        };
    }
    return best;
  }

  /** flykt-mot-escape-zon: unarmed ships head for a green edge, not their old rear. */
  #fleeScore(
    piece: Piece,
    position: BattleHex,
    facing: number,
  ): { readonly distance: number; readonly aligned: number } {
    if (this.#base.escapeZones === true) {
      let distance = Infinity;
      let edge: 'top' | 'bottom' = 'top';
      for (const zone of battleEscapeHexes(this.#base)) {
        const next = hex(position).distanceTo(hex(zone));
        if (next < distance) {
          distance = next;
          edge = zone.r === 0 ? 'top' : 'bottom';
        }
      }
      const outward = edge === 'top' ? [1, 2] : [4, 5];
      return {
        distance,
        aligned: Math.max(
          ...outward.map((direction) =>
            Math.cos(((facing - direction) * Math.PI) / 3),
          ),
        ),
      };
    }
    return {
      distance:
        piece.side === 'player'
          ? column(position)
          : this.#base.width - 1 - column(position),
      aligned: Math.cos(
        ((facing - (piece.side === 'player' ? 3 : 0)) * Math.PI) / 3,
      ),
    };
  }

  #planManeuver(
    p: Piece,
    allowDock: boolean,
  ): { id: string; score: number; actions: BattleCommand[] } {
    const enemies = this.#pieces.filter(
      (enemy) => enemy.side !== p.side && enemy.status === 'active',
    );
    const activation = this.#activation?.id === p.id ? this.#activation : null;
    if (p.dockedWith) return { id: p.id, score: 0, actions: [] };
    if (allowDock && !activation?.fired) {
      const target = enemies.find(
        (enemy) => this.dockIssue(p.id, enemy.id) === null,
      );
      if (target)
        return {
          id: p.id,
          score: 1000,
          actions: [{ type: 'dock', targetId: target.id }],
        };
    }
    const moves = activation?.movementClosed
      ? 0
      : (activation?.remaining ?? maneuverPoints(p.type));
    if (p.escapeEdge) {
      const actions: BattleCommand[] = [];
      let pose = {
        position: p.position!,
        facing: p.facing,
        speed: p.speed ?? 0,
      };
      for (let index = 0; index < moves; index++) {
        const delta = (pose.speed < 1 ? 1 : 0) as -1 | 0 | 1;
        const preview = this.previewManeuver(p.id, delta, 0, pose);
        if (preview.issue) break;
        actions.push({ type: 'maneuver', speed: delta, direction: 0 });
        if (preview.escaped || !preview.position) break;
        pose = {
          position: preview.position,
          facing: preview.facing,
          speed: preview.speed,
        };
      }
      return { id: p.id, score: 100, actions };
    }
    const armed = battleWeapons(p.type, p.hasMissiles).length > 0;
    const escorted = this.#pieces.some(
      (other) =>
        other.id !== p.id &&
        other.side === p.side &&
        other.status === 'active' &&
        battleWeapons(other.type, other.hasMissiles).length > 0,
    );
    const fleeing = !armed && !escorted;
    type Node = {
      position: BattleHex;
      facing: number;
      speed: number;
      actions: BattleCommand[];
      penalty: number;
    };
    const queue: Node[] = [
      {
        position: p.position!,
        facing: p.facing,
        speed: p.speed ?? 0,
        actions: [],
        penalty: 0,
      },
    ];
    const seen = new Set<string>();
    let best = { id: p.id, score: -Infinity, actions: [] as BattleCommand[] };
    const saved = {
      position: p.position,
      facing: p.facing,
      speed: p.speed,
    };
    const scoreShot = () => {
      let bestShot: { score: number; action: BattleCommand } | null = null;
      if (activation?.fired) return bestShot;
      for (const weapon of battleWeapons(p.type, p.hasMissiles)) {
        for (const enemy of enemies) {
          if (
            !enemy.position ||
            this.#protectedByFriendlyBoarders(enemy, p.side)
          )
            continue;
          if (weapon === 'Missiles') {
            for (const at of this.occupiedHexes(enemy.id).flatMap(
              missileArea,
            )) {
              const preview = this.impact(p.id, at, weapon);
              if (preview.reason || !preview.hits.length) continue;
              let score = -1;
              for (const hit of preview.hits) {
                const ship = this.#piece(hit.id);
                const expected = (hit.dice * (7 - hit.threshold)) / 6;
                const value =
                  expected * 10 + Math.max(0, hit.dice - ship.hull + 1) * 12;
                score += ship.side === p.side ? -value : value;
              }
              if (score <= 0) continue;
              if (!bestShot || score > bestShot.score)
                bestShot = { score, action: { type: 'fire', at, weapon } };
            }
            continue;
          }
          const at = this.aimAt(p.id, enemy.id, weapon);
          if (!at) continue;
          const preview = this.shot(p.id, enemy.id, weapon);
          if (preview.reason) continue;
          const expected = (preview.dice * (7 - preview.threshold)) / 6;
          const score =
            expected * 10 + Math.max(0, preview.dice - enemy.hull + 1) * 12;
          if (!bestShot || score > bestShot.score)
            bestShot = { score, action: { type: 'fire', at, weapon } };
        }
      }
      return bestShot;
    };
    try {
      for (let index = 0; index < queue.length; index++) {
        const node = queue[index]!;
        const key = `${node.position.q},${node.position.r},${node.facing},${node.speed}`;
        if (seen.has(key)) continue;
        seen.add(key);
        p.position = node.position;
        p.facing = node.facing;
        p.speed = node.speed;
        const shot = scoreShot();
        const route = this.#fleeScore(p, node.position, node.facing);
        const nearest = enemies.length
          ? Math.min(
              ...enemies.map((enemy) =>
                hex(node.position).distanceTo(hex(enemy.position!)),
              ),
            )
          : 0;
        let risk = 0;
        for (const enemy of enemies)
          for (const weapon of battleWeapons(enemy.type, enemy.hasMissiles)) {
            const preview = this.shot(enemy.id, p.id, weapon);
            if (!preview.reason)
              risk += (preview.dice * (7 - preview.threshold)) / 6;
          }
        let wreckAction: BattleCommand | null = null;
        if (!shot && node.actions.length >= moves) {
          this.#forceWreckTargets = true;
          for (const weapon of battleWeapons(p.type, p.hasMissiles))
            for (const wreck of this.#pieces)
              if (wreck.status === 'wreck' && wreck.position)
                for (const at of this.occupiedHexes(wreck.id)) {
                  const preview = this.impact(p.id, at, weapon);
                  if (!preview.reason && preview.hits.some((hit) => hit.wreck))
                    wreckAction = { type: 'fire', at, weapon };
                }
          this.#forceWreckTargets = false;
        }
        const score =
          (shot?.score ?? (wreckAction ? 2 : 0)) -
          (armed
            ? nearest * 0.8
            : fleeing
              ? route.distance * 3 - route.aligned * 4
              : -nearest * 0.4) -
          risk * 2 -
          node.penalty -
          node.actions.length * 0.02;
        const actions = [
          ...node.actions,
          ...(shot ? [shot.action] : wreckAction ? [wreckAction] : []),
        ];
        const remaining = moves - node.actions.length;
        let mustContinue = node.speed > 0 && remaining > 0;
        if (mustContinue) {
          mustContinue = ([-1, 0, 1] as const).some((speed) =>
            ([-1, 0, 1] as const).some(
              (direction) =>
                !this.previewManeuver(p.id, speed, direction, node).issue,
            ),
          );
        }
        if (!mustContinue && score > best.score)
          best = { id: p.id, score, actions };
        if (node.actions.length >= moves) continue;
        for (const speed of [-1, 0, 1] as const)
          for (const direction of [-1, 0, 1] as const) {
            const preview = this.previewManeuver(p.id, speed, direction, node);
            if (preview.issue) continue;
            const penalty =
              node.penalty +
              preview.collisions.filter(
                (collision) => collision.kind === 'ship',
              ).length *
                6 +
              preview.collisions.filter(
                (collision) => collision.kind === 'asteroid',
              ).length *
                Math.max(1, preview.speed) *
                8;
            if (preview.escaped) {
              if (fleeing) {
                const escapeScore = 120 - penalty;
                if (escapeScore > best.score)
                  best = {
                    id: p.id,
                    score: escapeScore,
                    actions: [
                      ...node.actions,
                      { type: 'maneuver', speed, direction },
                    ],
                  };
              }
              continue;
            }
            if (!preview.position) continue;
            queue.push({
              position: preview.position,
              facing: preview.facing,
              speed: preview.speed,
              penalty,
              actions: [
                ...node.actions,
                { type: 'maneuver', speed, direction },
              ],
            });
          }
      }
    } finally {
      this.#forceWreckTargets = false;
      p.position = saved.position;
      p.facing = saved.facing;
      p.speed = saved.speed ?? 0;
    }
    return best.score === -Infinity
      ? { id: p.id, score: 0, actions: [] }
      : best;
  }

  /** Search beyond this activation so an asteroid cannot trap a locally greedy pilot. */
  #approach(p: Piece): BattleCommand[] | null {
    const enemies = this.#pieces.filter(
      (e) =>
        e.side !== p.side &&
        e.status === 'active' &&
        !this.#protectedByFriendlyBoarders(e, p.side),
    );
    if (!enemies.length) return null;
    const queue = [
      { position: p.position!, facing: p.facing, path: [] as BattleCommand[] },
    ];
    const visited = new Set([`${hex(p.position!).key}:${p.facing}`]);
    for (let index = 0; index < queue.length; index++) {
      const node = queue[index]!;
      if (
        enemies.some((enemy) =>
          battleWeapons(p.type, p.hasMissiles).some(
            (weapon) =>
              !this.shot(p.id, enemy.id, weapon, node.position, node.facing)
                .reason,
          ),
        )
      )
        return node.path;
      const add = (
        position: BattleHex,
        facing: number,
        command: BattleCommand,
      ) => {
        const key = `${hex(position).key}:${facing}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({ position, facing, path: [...node.path, command] });
        }
      };
      if (this.forwardIssue(p.id, node.position, node.facing) === null) {
        const next = hex(node.position).neighbors()[node.facing]!;
        if (
          this.occupiedHexes(p.id, next, node.facing).every((cell) =>
            this.contains(cell),
          )
        )
          add(next, node.facing, { type: 'forward' });
      }
      if (!this.turnIssue(p.id, -1, node.position, node.facing))
        add(node.position, (node.facing + 5) % 6, {
          type: 'turn',
          direction: -1,
        });
      if (!this.turnIssue(p.id, 1, node.position, node.facing))
        add(node.position, (node.facing + 1) % 6, {
          type: 'turn',
          direction: 1,
        });
    }
    return null;
  }
}

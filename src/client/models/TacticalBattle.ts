import type { ShipType } from './Game.js';
import { dockIssue as dockingIssue } from './Docking.js';
import { HexCoordinate, HexGeometry } from './HexCoordinate.js';
import { ShipFootprint } from './ShipFootprint.js';

export type BattleSide = 'player' | 'enemy';
export type CombatShipType = ShipType | 'Space pirate';
export type WeaponName = 'Cannon' | 'Missiles' | 'Raider cannon' | 'Light cannon';
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
  readonly activated: boolean;
  readonly status: 'active' | 'destroyed' | 'escaped';
  readonly dockedWith?: string;
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
  readonly lastShot?: BattleShot;
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
  readonly shift?: { readonly kind: 'boarding' | 'space'; readonly remaining: number };
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
}
export interface ImpactPreview {
  readonly reason: string | null;
  readonly hits: readonly ImpactHit[];
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
        !['active', 'destroyed', 'escaped'].includes(p.status) ||
        (p.armored !== undefined && typeof p.armored !== 'boolean') ||
        (p.armored === true && !armored) ||
        (p.hasMissiles !== undefined && typeof p.hasMissiles !== 'boolean') ||
        (launchers && p.type !== 'Fighter') ||
        !Number.isSafeInteger(p.hull) ||
        p.hull < 0 ||
        p.hull > maxHull({ type: p.type, armored }) ||
        (p.status === 'destroyed') !== (p.hull === 0) ||
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
          !Number.isSafeInteger(p.position.r) ||
          !result.contains(p.position)
        )
          throw new Error('Invalid saved combat position.');
        if (p.status === 'active') {
          for (const cell of result.occupiedHexes(p.id)) {
            if (!result.contains(cell) || occupied.has(hex(cell).key))
              throw new Error(
                'Overlapping or out-of-bounds saved combat ships.',
              );
            occupied.add(hex(cell).key);
          }
        }
      } else if (p.status === 'active' && state.phase !== 'deployment')
        throw new Error('Missing combat position.');
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
            a.remaining <= p.movement,
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
          a.status === 'active' &&
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
    if (piece.dockedWith && !position) return 'This ship is locked in a boarding.';
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
      cells.find((at) => {
        const preview = this.impact(sourceId, at, weapon, from, facing);
        return (
          !preview.reason && preview.hits.some((hit) => hit.id === targetId)
        );
      }) ?? null
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
      else if (this.#blocked(origin, at, source, 1))
        reason = 'Line of fire is blocked.';
    }
    if (reason || !profile || profile.area === 0) {
      if (reason) return Object.freeze({ reason, hits: Object.freeze([]) });
      const target = this.#pieces.find(
        (piece) =>
          piece.id !== source.id &&
          piece.status === 'active' &&
          piece.position &&
          ShipFootprint.contains(
            piece,
            this.#base.largeShipFootprints === true,
            at,
          ),
      );
      if (!target || target.side === source.side)
        return Object.freeze({
          reason: 'Choose a hex with an enemy ship.',
          hits: Object.freeze([]),
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
    const hits = this.#pieces
      .filter(
        (piece) =>
          piece.id !== source.id &&
          piece.status === 'active' &&
          piece.position &&
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
          dice: profile.dice,
          threshold: profile.threshold - Number(rear),
          rear,
        };
      });
    return Object.freeze({ reason: null, hits: Object.freeze(hits) });
  }

  #blocked(
    origin: BattleHex,
    at: BattleHex,
    source: Piece,
    targetSize: number,
  ): boolean {
    const size = Math.min(SHIP_PROFILES[source.type].size, targetSize);
    const obstacles = [
      ...this.#asteroids,
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
      this.#activation = {
        id: p.id,
        remaining: p.movement,
        moved: false,
        fired: false,
        movementClosed: false,
      };
      return;
    }
    const activation = this.#activation;
    if (!activation) throw new Error('Activate a ship first.');
    const p = this.#piece(activation.id);
    if (command.type === 'end-activation') {
      this.#finishActivation();
      return;
    }
    if (command.type === 'forward' || command.type === 'turn') {
      if (activation.remaining < 1 || activation.movementClosed)
        throw new Error('No movement remains in this activation.');
      if (command.type === 'forward') {
        const issue = this.forwardIssue(p.id);
        if (issue) throw new Error(issue);
        const next = hex(p.position!).neighbors()[p.facing]!;
        p.position = next;
        if (
          this.occupiedHexes(p.id, next).some((cell) => !this.contains(cell))
        ) {
          p.position = null;
          p.status = 'escaped';
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
      if (p.status === 'escaped') this.#finishActivation();
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
      return;
    }
    if (command.type !== 'fire') throw new Error('Choose a combat action.');
    if (activation.fired)
      throw new Error('This ship already fired this activation.');
    if (p.dockedWith) throw new Error('This ship is locked in a boarding.');
    const preview = this.impact(p.id, command.at, command.weapon);
    if (preview.reason) throw new Error(preview.reason);
    if (command.weapon === 'Missiles') p.missiles--;
    const notes: string[] = [];
    const impacts: BattleShot['impacts'][number][] = [];
    let total = 0;
    for (const hit of preview.hits) {
      const dice = Array.from({ length: hit.dice }, () => this.#die());
      const damage = dice.filter((die) => die >= hit.threshold).length;
      total += damage;
      const target = this.#piece(hit.id);
      const previousHull = target.hull;
      target.hull = Math.max(0, target.hull - damage);
      if (target.hull === 0) {
        target.status = 'destroyed';
        this.unlockDock(target.id);
      }
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
        destroyed: target.hull === 0,
      });
      const outcome = `${hit.dice}D6 [${dice.join(', ')}], hit ${hit.threshold}+${hit.rear ? ' (rear)' : ''}: ${damage} damage${target.hull === 0 ? ', destroyed' : `, ${target.hull} hull remaining`}`;
      notes.push(
        command.weapon === 'Missiles'
          ? `${battlePieceLabel(target, this.#pieces)} ${hit.dice}D6 [${dice.join(', ')}], hit ${hit.threshold}+${hit.rear ? ' (rear)' : ''}, ${damage} hits${target.hull === 0 ? ', destroyed' : `, ${target.hull} hull remaining`}`
          : outcome,
      );
    }
    activation.fired = true;
    this.#lastShot = {
      id: `${this.#base.id}:shot:${this.#log.length}`,
      weapon: command.weapon,
      from: { ...p.position! },
      at: { ...command.at },
      impacts,
    };
    activation.movementClosed = activation.moved;
    this.#log.push(
      command.weapon === 'Missiles'
        ? `${battlePieceLabel(p, this.#pieces)}: Missiles → ${command.at.q},${command.at.r}. ${notes.join(' ') || 'No ships in the area.'} Area: ${total} damage.`
        : `${battlePieceLabel(p, this.#pieces)}: ${command.weapon} → ${command.at.q},${command.at.r} ${battlePieceLabel(this.#piece(preview.hits[0]!.id), this.#pieces)}. ${notes[0]}`,
    );
    this.#checkComplete();
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
    if (this.#activation) this.command({ type: 'end-activation' }, side);
  }

  #plan(
    p: Piece,
    allowDock = true,
  ): { id: string; score: number; actions: BattleCommand[] } {
    const enemies = this.#pieces.filter(
      (e) => e.side !== p.side && e.status === 'active',
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
          for (const enemy of enemies) {
            if (!enemy.position) continue;
            for (const point of this.occupiedHexes(enemy.id).flatMap(
              missileArea,
            ))
              hexes.set(`${point.q},${point.r}`, point);
          }
          for (const at of hexes.values()) {
            const preview = this.impact(p.id, at, weapon, position, facing);
            if (preview.reason) continue;
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
        for (const enemy of enemies) {
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
      const exitDistance =
        p.side === 'player'
          ? column(node.position)
          : this.#base.width - 1 - column(node.position);
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
      const aligned = Math.cos(
        ((node.facing - (p.side === 'player' ? 3 : 0)) * Math.PI) / 3,
      );
      const score =
        (shot?.score ?? 0) -
        (armed ? nearest * 0.8 : exitDistance * 3 - aligned) -
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
        if (this.contains(next))
          queue.push({
            position: next,
            facing: node.facing,
            actions: [...node.actions, { type: 'forward' }],
          });
        else if (!armed)
          return {
            id: p.id,
            score: 100,
            actions: [...node.actions, { type: 'forward' }],
          };
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

  /** Search beyond this activation so an asteroid cannot trap a locally greedy pilot. */
  #approach(p: Piece): BattleCommand[] | null {
    const enemies = this.#pieces.filter(
      (e) => e.side !== p.side && e.status === 'active',
    );
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
        if (this.contains(next)) add(next, node.facing, { type: 'forward' });
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

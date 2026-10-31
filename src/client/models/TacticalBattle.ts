import type { ShipType } from './Game.js';
import { HexCoordinate, HexGeometry } from './HexCoordinate.js';

export type BattleSide = 'player' | 'enemy';
export type CombatShipType = ShipType | 'Space pirate';
export type WeaponName = 'Cannon' | 'Missiles' | 'Raider cannon';
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
  });
export const WEAPONS = Object.freeze({
  Cannon: { min: 1, max: 3, arc: 120, dice: 2, threshold: 4 },
  Missiles: { min: 2, max: 6, arc: 60, dice: 3, threshold: 4 },
  'Raider cannon': { min: 1, max: 3, arc: 120, dice: 2, threshold: 5 },
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
  readonly position: BattleHex | null;
  readonly facing: number;
  readonly activated: boolean;
  readonly status: 'active' | 'destroyed' | 'escaped';
}
export function battlePieceLabel(
  piece: BattlePiece,
  pieces: readonly BattlePiece[],
): string {
  const index = pieces
    .filter((p) => p.side === piece.side && p.type === piece.type)
    .findIndex((p) => p.id === piece.id);
  return `${piece.type} ${index + 1}`;
}
export interface BattleActivation {
  readonly id: string;
  readonly remaining: number;
  readonly moved: boolean;
  readonly fired: boolean;
  readonly movementClosed: boolean;
}
export interface BattleState {
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
}
export type BattleCommand =
  | { readonly type: 'auto-deploy' | 'start' | 'forward' | 'end-activation' }
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
      readonly targetId: string;
      readonly weapon: WeaponName;
    };
export interface ShotPreview {
  readonly reason: string | null;
  readonly dice: number;
  readonly threshold: number;
  readonly rear: boolean;
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
export const battleWeapons = (type: CombatShipType): readonly WeaponName[] =>
  type === 'Fighter'
    ? ['Cannon', 'Missiles']
    : type === 'Space pirate'
      ? ['Raider cannon']
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
    'id' | 'position' | 'width' | 'height' | 'deploymentDepth' | 'fleets'
  >;
  readonly #asteroids: BattleHex[];
  readonly #pieces: Piece[];
  readonly #log: string[];
  #phase: BattleState['phase'];
  #round: number;
  #turn: BattleSide;
  #activation: Activation | null;
  #random: number;

  private constructor(state: BattleState) {
    const copy = structuredClone(state);
    this.#base = {
      id: copy.id,
      position: copy.position,
      width: copy.width,
      height: copy.height,
      deploymentDepth: copy.deploymentDepth,
      fleets: copy.fleets,
    };
    this.#asteroids = [...copy.asteroids];
    this.#pieces = copy.pieces.map((p) => ({ ...p }));
    this.#log = [...copy.log];
    this.#phase = copy.phase;
    this.#round = copy.round;
    this.#turn = copy.turn;
    this.#activation = copy.activation ? { ...copy.activation } : null;
    this.#random = copy.random;
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
    const deploymentDepth = Math.max(2, Math.ceil(largest / height));
    const width = Math.max(13, deploymentDepth * 2 + 9);
    const result = new TacticalBattle({
      id,
      position,
      width,
      height,
      deploymentDepth,
      fleets: fleets.map(({ id, side, retreat }) => ({ id, side, retreat })),
      pieces: fleets.flatMap((f) =>
        f.ships.map((ship) => ({
          id: ship.id,
          fleetId: f.id,
          side: f.side,
          type: ship.type,
          movement:
            (ship.towing ? 1 : SHIP_PROFILES[ship.type].movement) +
            Number(ship.ion),
          hull: SHIP_PROFILES[ship.type].hull,
          missiles: ship.type === 'Fighter' ? 2 : 0,
          position: null,
          facing: f.side === 'player' ? 0 : 3,
          activated: false,
          status: 'active' as const,
        })),
      ),
      asteroids: [],
      phase: 'deployment',
      round: 0,
      turn: 'player',
      activation: null,
      random: seed >>> 0 || 1,
      log: ['Deploy your fleet. Each ship occupies one hex.'],
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
      if (
        !p.id ||
        ids.has(p.id) ||
        !profile ||
        !state.fleets.some(
          (f: BattleState['fleets'][number]) =>
            f.id === p.fleetId && f.side === p.side,
        ) ||
        !['active', 'destroyed', 'escaped'].includes(p.status) ||
        !Number.isSafeInteger(p.hull) ||
        p.hull < 0 ||
        p.hull > profile.hull ||
        (p.status === 'destroyed') !== (p.hull === 0) ||
        !Number.isSafeInteger(p.movement) ||
        p.movement < 1 ||
        p.movement > profile.movement + 1 ||
        !Number.isSafeInteger(p.facing) ||
        p.facing < 0 ||
        p.facing > 5 ||
        !Number.isSafeInteger(p.missiles) ||
        p.missiles < 0 ||
        p.missiles > (p.type === 'Fighter' ? 2 : 0) ||
        typeof p.activated !== 'boolean'
      )
        throw new Error('Invalid saved combat ship.');
      ids.add(p.id);
      if (p.position) {
        if (
          !Number.isSafeInteger(p.position.q) ||
          !Number.isSafeInteger(p.position.r) ||
          !result.contains(p.position)
        )
          throw new Error('Invalid saved combat position.');
        if (p.status === 'active') {
          if (occupied.has(hex(p.position).key))
            throw new Error('Overlapping saved combat ships.');
          occupied.add(hex(p.position).key);
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
          a.id !== ignoreId && a.status === 'active' && same(a.position, p),
      )
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
    this.#pieces
      .filter((p) => p.side === side)
      .forEach((p, index) => {
        p.position = cells[index]!;
        p.facing = side === 'player' ? 0 : 3;
      });
  }
  #beginRound(): void {
    this.#round++;
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
    const source = this.#piece(sourceId),
      target = this.#piece(targetId),
      profile = WEAPONS[weapon];
    const origin = from ?? source.position;
    let reason: string | null = null;
    const rear =
      !!origin &&
      !!target.position &&
      inArc(target.position, origin, (target.facing + 3) % 6, 120);
    if (!profile || !battleWeapons(source.type).includes(weapon))
      reason = 'This ship has no such weapon.';
    else if (
      source.status !== 'active' ||
      target.status !== 'active' ||
      source.side === target.side ||
      !origin ||
      !target.position
    )
      reason = 'Choose an active enemy ship.';
    else if (weapon === 'Missiles' && source.missiles === 0)
      reason = 'No missile salvos remain.';
    else {
      const distance = hex(origin).distanceTo(hex(target.position));
      if (distance < profile.min || distance > profile.max)
        reason = 'Target is outside weapon range.';
      else if (
        !inArc(origin, target.position, facing ?? source.facing, profile.arc)
      )
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
            .map((p) => p.position!),
        ];
        if (obstacles.some((p) => crossesHex(origin, target.position!, p)))
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

  forwardIssue(
    id: string,
    position?: BattleHex,
    facing?: number,
  ): string | null {
    const p = this.#piece(id),
      origin = position ?? p.position;
    if (!origin) return 'Deploy the ship first.';
    const next = hex(origin).neighbors()[facing ?? p.facing]!;
    if (this.contains(next))
      return this.#occupied(next, id) ? 'The next hex is occupied.' : null;
    const ownEdge =
      p.side === 'player' ? column(next) < 0 : column(next) >= this.#base.width;
    if (!ownEdge || next.r < 0 || next.r >= this.#base.height)
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
          !this.isDeployment(command.position, side) ||
          this.#occupied(command.position, p.id) ||
          !Number.isInteger(command.facing) ||
          command.facing < 0 ||
          command.facing > 5
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
        if (!this.contains(next)) {
          p.position = null;
          p.status = 'escaped';
          this.#log.push(`${battlePieceLabel(p, this.#pieces)} escaped.`);
        }
      } else if (command.type === 'turn') {
        if (command.direction !== 1 && command.direction !== -1)
          throw new Error('Choose a 60 degree turn.');
        p.facing = (p.facing + command.direction + 6) % 6;
      }
      activation.remaining--;
      activation.moved = true;
      if (p.status === 'escaped') this.#finishActivation();
      return;
    }
    if (command.type !== 'fire') throw new Error('Choose a combat action.');
    if (activation.fired)
      throw new Error('This ship already fired this activation.');
    const preview = this.shot(p.id, command.targetId, command.weapon);
    if (preview.reason) throw new Error(preview.reason);
    const target = this.#piece(command.targetId);
    const dice = Array.from({ length: preview.dice }, () => this.#die());
    const damage = dice.filter((die) => die >= preview.threshold).length;
    target.hull = Math.max(0, target.hull - damage);
    if (target.hull === 0) target.status = 'destroyed';
    if (command.weapon === 'Missiles') p.missiles--;
    activation.fired = true;
    activation.movementClosed = activation.moved;
    this.#log.push(
      `${battlePieceLabel(p, this.#pieces)}: ${command.weapon} → ${battlePieceLabel(target, this.#pieces)}. ${preview.dice}D6 [${dice.join(', ')}], hit ${preview.threshold}+${preview.rear ? ' (rear)' : ''}: ${damage} damage${target.hull === 0 ? ', destroyed' : `, ${target.hull} hull remaining`}.`,
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
  actAutomatically(): void {
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
    const plan = candidates[0] ? this.#plan(candidates[0]) : null;
    if (!plan) throw new Error('No ship can activate.');
    if (!this.#activation)
      this.command({ type: 'activate', id: plan.id }, side);
    for (const action of plan.actions) {
      if (this.#phase !== 'fighting' || !this.#activation) return;
      this.command(action, side);
    }
    if (this.#activation) this.command({ type: 'end-activation' }, side);
  }

  #plan(p: Piece): { id: string; score: number; actions: BattleCommand[] } {
    const enemies = this.#pieces.filter(
      (e) => e.side !== p.side && e.status === 'active',
    );
    const activation = this.#activation?.id === p.id ? this.#activation : null;
    const moves = activation?.movementClosed
      ? 0
      : (activation?.remaining ?? p.movement);
    const armed = battleWeapons(p.type).length > 0;
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
      for (const enemy of enemies)
        for (const weapon of battleWeapons(p.type)) {
          const preview = this.shot(p.id, enemy.id, weapon, position, facing);
          if (preview.reason) continue;
          const expected = (preview.dice * (7 - preview.threshold)) / 6;
          const kill = Math.max(0, preview.dice - enemy.hull + 1) * 12;
          const score = expected * 10 + kill - (weapon === 'Missiles' ? 1 : 0);
          if (!bestShot || score > bestShot.score)
            bestShot = {
              score,
              action: { type: 'fire', targetId: enemy.id, weapon },
            };
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
        for (const weapon of battleWeapons(enemy.type)) {
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
      queue.push(
        {
          ...node,
          facing: (node.facing + 5) % 6,
          actions: [...node.actions, { type: 'turn', direction: -1 }],
        },
        {
          ...node,
          facing: (node.facing + 1) % 6,
          actions: [...node.actions, { type: 'turn', direction: 1 }],
        },
      );
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
          battleWeapons(p.type).some(
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
      add(node.position, (node.facing + 5) % 6, {
        type: 'turn',
        direction: -1,
      });
      add(node.position, (node.facing + 1) % 6, { type: 'turn', direction: 1 });
    }
    return null;
  }
}
